import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User, Building2, Save, Trash2, UserCheck, X, Activity, Mail, CalendarClock
} from 'lucide-react';
import { toast } from 'sonner';
import LeadActivityFeed from './LeadActivityFeed';
import EmailLeadModal from './EmailLeadModal';
import { COLD_STAGES, HOT_STAGES } from '@/lib/leadStages';

// "Other team member" doesn't have a TeamMemberBookingProfile — selecting it
// switches to free-text name/contact and a manually-typed meeting link, and
// routes the confirmation to the office coordinator inbox below instead of a
// per-person notify_email/cc_emails pair.
const OTHER_TEAM_MEMBER = '__other__';
const OTHER_TEAM_MEMBER_NOTIFY_EMAIL = 'cem@go-get.ca';

export default function LeadDetailsModal({ lead, open, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editedLead, setEditedLead] = useState(lead || {});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [meetingType, setMeetingType] = useState('Online');
  const [officeId, setOfficeId] = useState('');
  const [assignedTeamMemberEmails, setAssignedTeamMemberEmails] = useState([]);
  const [otherTeamMemberContact, setOtherTeamMemberContact] = useState('');
  const [otherMeetingLink, setOtherMeetingLink] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  useEffect(() => {
    if (lead) setEditedLead(lead);
  }, [lead]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const isAppointmentSet = editedLead.stage === 'Appointment Set';

  const { data: offices = [] } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.entities.Office.list(),
    enabled: isAppointmentSet,
  });
  const activeOffices = offices.filter((o) => o.is_active !== false);

  const { data: bookingProfiles = [] } = useQuery({
    queryKey: ['bookingProfiles'],
    queryFn: () => api.entities.TeamMemberBookingProfile.list(),
    enabled: isAppointmentSet,
  });
  const activeBookingProfiles = bookingProfiles.filter((p) => p.is_active !== false);

  const { data: staffUsers = [] } = useQuery({
    queryKey: ['staffUsers'],
    queryFn: () => api.entities.User.list(),
    enabled: isAppointmentSet,
  });

  const { data: existingAppointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list(),
    enabled: isAppointmentSet,
  });

  const assignedOffice = activeOffices.find((o) => o.id === officeId);

  const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const includesOther = assignedTeamMemberEmails.includes(OTHER_TEAM_MEMBER);
  // The real (non-"Other") booking profiles among however many are checked —
  // a meeting can have several people assigned to it at once.
  const assignedProfiles = activeBookingProfiles.filter((p) => assignedTeamMemberEmails.includes(p.user_email));

  const toggleAssignedMember = (email) => {
    setAssignedTeamMemberEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  // Every assigned person's own inbox gets the confirmation, plus whoever
  // they'd normally cc (e.g. Shorif's profile cc's cem@go-get.ca) — deduped,
  // since two assigned members can share a cc target. First recipient becomes
  // the email's "to", the rest become "cc" (SendEmail only takes one "to").
  const computeRecipients = () => {
    const recipients = [];
    const seen = new Set();
    const add = (email) => {
      if (email && !seen.has(email)) {
        seen.add(email);
        recipients.push(email);
      }
    };
    assignedProfiles.forEach((p) => {
      add(p.notify_email);
      (p.cc_emails || []).forEach(add);
    });
    if (includesOther) add(OTHER_TEAM_MEMBER_NOTIFY_EMAIL);
    return recipients;
  };

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (assignedTeamMemberEmails.length === 0 || !appointmentDate || !appointmentTime) {
        throw new Error('Pick at least one assigned team member, a date, and a time first');
      }
      if (includesOther && !otherTeamMemberContact.trim()) {
        throw new Error("Enter the other team member's name or email first");
      }

      const dayAbbr = DAY_ABBR[new Date(`${appointmentDate}T00:00:00`).getDay()];
      for (const profile of assignedProfiles) {
        const staffMember = staffUsers.find((u) => u.email === profile.user_email);
        const label = staffMember?.full_name || profile.user_email;
        const daysAvailable = profile.days_available;
        if (daysAvailable?.length && !daysAvailable.includes(dayAbbr)) {
          throw new Error(`${label} isn't available on ${dayAbbr}s. Available days: ${daysAvailable.join(', ')}`);
        }
        const startBound = profile.working_hours_start;
        const endBound = profile.working_hours_end;
        if (startBound && endBound && (appointmentTime < startBound || appointmentTime >= endBound)) {
          throw new Error(`${label}'s working hours are ${startBound}–${endBound}. Pick a time in that range.`);
        }
      }

      const startDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const slotMinutes = Math.max(...assignedProfiles.map((p) => p.slot_duration_minutes || 30), 30);
      const endDateTime = new Date(startDateTime.getTime() + slotMinutes * 60000);

      const hasConflict = assignedProfiles.some((profile) =>
        existingAppointments.some((apt) => {
          if (apt.status === 'Cancelled') return false;
          if (!(apt.assigned_to || []).includes(profile.user_email)) return false;
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return startDateTime < aptEnd && endDateTime > aptStart;
        })
      );
      if (hasConflict) {
        throw new Error('One of the assigned team members already has an appointment during that time. Pick another slot.');
      }

      const assignedLabels = [
        ...assignedProfiles.map((p) => p.user_email),
        ...(includesOther && otherTeamMemberContact.trim() ? [otherTeamMemberContact.trim()] : []),
      ];
      const onlineMeetingLink = otherMeetingLink.trim() || assignedProfiles.find((p) => p.zoom_link)?.zoom_link || '';

      const appointment = await api.entities.Appointment.create({
        title: `Meeting with ${lead.contact_name}`,
        appointment_type: meetingType,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        assigned_to: assignedLabels,
        location: meetingType === 'In-Person' ? (assignedOffice?.name || '') : '',
        meeting_link: meetingType === 'Online' ? onlineMeetingLink : '',
        lead_id: lead.id,
        status: 'Scheduled',
      });

      await api.entities.Lead.update(lead.id, { stage: 'Appointment Set', meeting_type: meetingType });

      const assignedDisplayNames = [
        ...assignedProfiles.map((p) => staffUsers.find((u) => u.email === p.user_email)?.full_name || p.user_email),
        ...(includesOther && otherTeamMemberContact.trim() ? [otherTeamMemberContact.trim()] : []),
      ];
      const assignedDisplayName = assignedDisplayNames.join(', ');
      const recipients = computeRecipients();
      const notifyEmail = recipients[0] || OTHER_TEAM_MEMBER_NOTIFY_EMAIL;
      const ccEmails = recipients.slice(1);
      const whenText = startDateTime.toLocaleString('en-CA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const whereText = meetingType === 'In-Person'
        ? (assignedOffice?.name || 'In-person')
        : (onlineMeetingLink || 'Online meeting');

      await api.integrations.Core.SendEmail({
        to: notifyEmail,
        cc: ccEmails,
        subject: `New appointment: ${lead.contact_name}`,
        body: `Hi,\n\nA new appointment has been booked with ${assignedDisplayName}.\n\nLead: ${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}\nWhen: ${whenText}\nType: ${meetingType}\nWhere: ${whereText}\n\nThis was booked from the Lead Pipeline.`,
      });

      await api.entities.Activity.create({
        lead_id: lead.id,
        activity_type: 'appointment',
        title: `Appointment booked (${meetingType}) with ${assignedDisplayName}`,
        details: `${whenText} — ${whereText}`,
        performed_by: user?.email || '',
        activity_date: new Date().toISOString(),
      });

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked and confirmation sent');
    },
    onError: (error) => toast.error(error.message || 'Failed to book appointment'),
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated successfully');
      onClose();
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => api.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted');
      onClose();
    }
  });

  const convertToClientMutation = useMutation({
    mutationFn: async (leadData) => {
      const clientData = {
        client_type: leadData.lead_type,
        legal_name: leadData.company_name || leadData.contact_name,
        primary_contact_name: leadData.contact_name,
        primary_email: leadData.email,
        primary_phone: leadData.phone,
        services_needed: leadData.services_interested || [],
        lead_source: leadData.lead_source,
        referral_source: leadData.referral_source,
        urgency_level: leadData.urgency,
        status: 'Active',
        notes: leadData.notes
      };
      const newClient = await api.entities.Client.create(clientData);
      await api.entities.Lead.update(leadData.id, {
        stage: 'Closed Leads',
        converted_to_client_id: newClient.id
      });
      // Log activity
      await api.entities.Activity.create({
        lead_id: leadData.id,
        activity_type: 'stage_change',
        title: 'Lead converted to client',
        from_stage: leadData.stage,
        to_stage: 'Closed Leads',
        performed_by: user?.email || '',
        activity_date: new Date().toISOString()
      });
      return newClient;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Lead converted to client!');
      onClose();
      navigate(createPageUrl('ClientDirectory'));
    }
  });

  const logEmailFollowUpMutation = useMutation({
    mutationFn: async ({ subject, services }) => {
      const today = new Date().toISOString().split('T')[0];
      await api.entities.Lead.update(lead.id, { last_contact_date: today });
      const details = services?.length
        ? `${subject}\n\nServices referenced: ${services.join(', ')}`
        : subject;
      await api.entities.Activity.create({
        lead_id: lead.id,
        activity_type: 'email',
        title: 'Email sent',
        details,
        performed_by: user?.email || '',
        activity_date: new Date().toISOString()
      });
      return today;
    },
    onSuccess: (today) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities', lead.id] });
      setEditedLead((prev) => ({ ...prev, last_contact_date: today }));
    }
  });

  const handleSave = () => {
    updateLeadMutation.mutate({ id: lead.id, data: editedLead });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate(lead.id);
    }
  };

  const handleConvert = () => {
    if (confirm('Convert this lead to a client?')) {
      convertToClientMutation.mutate(lead);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {lead.lead_type === 'Individual' ? (
              <User className="w-6 h-6 text-navy" />
            ) : (
              <Building2 className="w-6 h-6 text-navy" />
            )}
            {lead.contact_name}
          </DialogTitle>
          <DialogDescription>Lead Details & Activity History</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activities" className="gap-1.5">
              <Activity className="w-4 h-4" />
              Activities
            </TabsTrigger>
          </TabsList>

          {/* ── Details Tab ── */}
          <TabsContent value="details" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={editedLead.contact_name} onChange={(e) => setEditedLead({ ...editedLead, contact_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={editedLead.company_name || ''} onChange={(e) => setEditedLead({ ...editedLead, company_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editedLead.email} onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editedLead.phone || ''} onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <select
                  value={editedLead.stage || 'New Lead'}
                  onChange={(e) => setEditedLead({ ...editedLead, stage: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  {(editedLead.pipeline_type === 'Cold Lead' ? COLD_STAGES : HOT_STAGES).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <select
                  value={editedLead.lead_source}
                  onChange={(e) => setEditedLead({ ...editedLead, lead_source: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Google">Google</option>
                  <option value="Event">Event</option>
                  <option value="Existing Client">Existing Client</option>
                  <option value="CSV Import">CSV Import</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <select
                  value={editedLead.urgency}
                  onChange={(e) => setEditedLead({ ...editedLead, urgency: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Future Planning">Future Planning</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Estimated Value ($)</Label>
                <Input type="number" value={editedLead.estimated_value || ''} onChange={(e) => setEditedLead({ ...editedLead, estimated_value: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Win Probability (%)</Label>
                <Input type="number" min="0" max="100" value={editedLead.probability || ''} onChange={(e) => setEditedLead({ ...editedLead, probability: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last Contact Date</Label>
                <Input type="date" value={editedLead.last_contact_date || ''} onChange={(e) => setEditedLead({ ...editedLead, last_contact_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Next Follow-up Date</Label>
                <Input type="date" value={editedLead.next_follow_up || ''} onChange={(e) => setEditedLead({ ...editedLead, next_follow_up: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-muted-foreground">
                No response yet? Send a quick follow-up email — it'll log here and update the last contact date.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 flex-shrink-0"
                disabled={!editedLead.email}
                onClick={() => setShowEmailModal(true)}
              >
                <Mail className="w-4 h-4" />
                Email Lead
              </Button>
            </div>

            {isAppointmentSet && (
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50 space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-purple-700" />
                  <h4 className="font-semibold text-sm text-purple-900">Appointment Booking Option</h4>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Meeting Type</Label>
                  <div className="flex gap-2">
                    {['In-Person', 'Online'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMeetingType(type)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          meetingType === type
                            ? 'bg-navy text-white border-navy'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Assigned Team Member(s)</Label>
                  <div className="border rounded-lg bg-white divide-y max-h-40 overflow-y-auto">
                    {activeBookingProfiles.map((profile) => {
                      const staffMember = staffUsers.find((u) => u.email === profile.user_email);
                      return (
                        <label
                          key={profile.id}
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                        >
                          <Checkbox
                            checked={assignedTeamMemberEmails.includes(profile.user_email)}
                            onCheckedChange={() => toggleAssignedMember(profile.user_email)}
                          />
                          {staffMember?.full_name || profile.user_email}
                        </label>
                      );
                    })}
                    <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <Checkbox
                        checked={includesOther}
                        onCheckedChange={() => toggleAssignedMember(OTHER_TEAM_MEMBER)}
                      />
                      Other team member
                    </label>
                  </div>
                  {activeBookingProfiles.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No team members configured yet — add them under Settings &gt; Team Members (Booking).
                    </p>
                  )}
                </div>

                {includesOther && (
                  <div className="space-y-2">
                    <Label className="text-xs">Other Team Member Name / Email</Label>
                    <Input
                      value={otherTeamMemberContact}
                      onChange={(e) => setOtherTeamMemberContact(e.target.value)}
                      placeholder="e.g. Jane Doe or jane@go-get.ca"
                      className="bg-white"
                    />
                  </div>
                )}

                {assignedTeamMemberEmails.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Confirmation will be sent to: {computeRecipients().join(', ') || OTHER_TEAM_MEMBER_NOTIFY_EMAIL}.
                  </p>
                )}

                {meetingType === 'In-Person' ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Location</Label>
                    <Select value={officeId || undefined} onValueChange={setOfficeId}>
                      <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select office..." /></SelectTrigger>
                      <SelectContent>
                        {activeOffices.map((office) => (
                          <SelectItem key={office.id} value={office.id}>
                            {office.name}{office.city ? ` — ${office.city}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">Meeting Link</Label>
                    {includesOther ? (
                      <Input
                        value={otherMeetingLink}
                        onChange={(e) => setOtherMeetingLink(e.target.value)}
                        placeholder="Paste the meeting link"
                        className="bg-white"
                      />
                    ) : (
                      <Input
                        value={assignedProfiles.find((p) => p.zoom_link)?.zoom_link || ''}
                        disabled
                        placeholder="Auto-filled from the assigned team member"
                        className="bg-white"
                      />
                    )}
                    {assignedProfiles.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Multiple team members assigned — using the first one's meeting link.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="bg-white" />
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full gap-2 bg-purple-700 hover:bg-purple-800 text-white"
                  onClick={() => bookAppointmentMutation.mutate()}
                  disabled={
                    bookAppointmentMutation.isPending ||
                    assignedTeamMemberEmails.length === 0 ||
                    !appointmentDate ||
                    !appointmentTime ||
                    (includesOther && !otherTeamMemberContact.trim())
                  }
                >
                  <CalendarClock className="w-4 h-4" />
                  {bookAppointmentMutation.isPending ? 'Booking...' : 'Book Appointment'}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editedLead.notes || ''} onChange={(e) => setEditedLead({ ...editedLead, notes: e.target.value })} rows={4} />
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={updateLeadMutation.isPending} className="bg-yellow text-navy hover:bg-yellow-dark gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button onClick={handleConvert} disabled={convertToClientMutation.isPending} className="bg-green-600 text-white hover:bg-green-700 gap-2">
                <UserCheck className="w-4 h-4" />
                Convert to Client
              </Button>
              <Button onClick={handleDelete} disabled={deleteLeadMutation.isPending} variant="outline" className="text-red border-red hover:bg-red hover:text-white gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <Button onClick={onClose} variant="outline" className="ml-auto gap-2">
                <X className="w-4 h-4" />
                Close
              </Button>
            </div>
          </TabsContent>

          {/* ── Activities Tab ── */}
          <TabsContent value="activities" className="pt-4">
            <LeadActivityFeed leadId={lead.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <EmailLeadModal
        lead={lead}
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSent={(payload) => logEmailFollowUpMutation.mutate(payload)}
      />
    </Dialog>
  );
}