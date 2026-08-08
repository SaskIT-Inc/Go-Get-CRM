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
import MultiEmailInput from '@/features/email/components/MultiEmailInput';
import { COLD_STAGES, HOT_STAGES } from '@/lib/leadStages';

// "Other team member" doesn't have a TeamMemberBookingProfile — selecting it
// switches to a free-text multi-email input instead of a checkbox from the
// roster, since more than one extra person can be looped in.
const OTHER_TEAM_MEMBER = '__other__';

// cem@go-get.ca / shorif@go-get.ca are two of the checkable "Assigned Team
// Member(s)" options — the confirmation email only cc's whichever of these
// two are actually checked, not both automatically.
const APPOINTMENT_CC_CANDIDATE_EMAILS = ['cem@go-get.ca', 'shorif@go-get.ca'];

// Booking slots: Monday–Friday, 10:00 AM – 5:30 PM, 30 minutes each.
const BOOKABLE_WEEKDAYS = [1, 2, 3, 4, 5]; // Date#getDay(): 0=Sun ... 6=Sat
const SLOT_START_MINUTES = 10 * 60;
const SLOT_END_MINUTES = 17 * 60 + 30;
const SLOT_DURATION_MINUTES = 30;

const TIME_SLOTS = [];
for (let m = SLOT_START_MINUTES; m < SLOT_END_MINUTES; m += SLOT_DURATION_MINUTES) {
  TIME_SLOTS.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}

function formatSlotLabel(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function isWeekendDate(dateStr) {
  if (!dateStr) return false;
  return !BOOKABLE_WEEKDAYS.includes(new Date(`${dateStr}T00:00:00`).getDay());
}

export default function LeadDetailsModal({ lead, open, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editedLead, setEditedLead] = useState(lead || {});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [meetingType, setMeetingType] = useState('Online');
  const [officeId, setOfficeId] = useState('');
  const [assignedTeamMemberEmails, setAssignedTeamMemberEmails] = useState([]);
  const [otherTeamMemberEmails, setOtherTeamMemberEmails] = useState([]);
  const [onlineMeetingDetails, setOnlineMeetingDetails] = useState('');
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

  // Booking an appointment is how a lead GETS TO "Appointment Set" — so the
  // form has to be available from New Lead (and any other non-terminal
  // stage), not gated behind already being there. Data-fetching stays gated
  // on the broader "not a closed/lost/false end-state" condition since both
  // modes need it.
  const canBookAppointment = !['Closed Leads', 'Lost Leads', 'False Leads'].includes(editedLead.stage);

  const { data: offices = [] } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.entities.Office.list(),
    enabled: canBookAppointment,
  });
  const activeOffices = offices.filter((o) => o.is_active !== false);

  const { data: bookingProfiles = [] } = useQuery({
    queryKey: ['bookingProfiles'],
    queryFn: () => api.entities.TeamMemberBookingProfile.list(),
    enabled: canBookAppointment,
  });
  const activeBookingProfiles = bookingProfiles.filter((p) => p.is_active !== false);

  const { data: staffUsers = [] } = useQuery({
    queryKey: ['staffUsers'],
    queryFn: () => api.entities.User.list(),
    enabled: canBookAppointment,
  });

  const { data: existingAppointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list(),
    enabled: canBookAppointment,
  });

  // Most recent appointment on record for this lead — shown read-only
  // instead of the booking form as soon as one actually exists, regardless
  // of which non-terminal stage the lead has since moved to (e.g. Estimate
  // Sent). Keying this off the stage name ("Appointment Set" only) was the
  // bug: a lead that progresses past that stage would see the booking form
  // again instead of its already-booked details.
  const leadAppointment = [...existingAppointments]
    .filter((a) => a.lead_id === lead?.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const isAppointmentBooked = !!leadAppointment;
  const showBookingForm = canBookAppointment && !isAppointmentBooked;

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

  // Is this slot already taken by any currently-assigned team member? Used
  // both to grey out slot buttons and (via the same check at submit time) to
  // block a genuine double-booking.
  const isSlotTaken = (timeStr) => {
    if (!appointmentDate || !timeStr || assignedProfiles.length === 0) return false;
    const slotStart = new Date(`${appointmentDate}T${timeStr}`);
    const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);
    return assignedProfiles.some((profile) =>
      existingAppointments.some((apt) => {
        if (apt.status === 'Cancelled') return false;
        if (!(apt.assigned_to || []).includes(profile.user_email)) return false;
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart < aptEnd && slotEnd > aptStart;
      })
    );
  };

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (assignedTeamMemberEmails.length === 0 || !appointmentDate || !appointmentTime) {
        throw new Error('Pick at least one assigned team member, a date, and a time first');
      }
      if (includesOther && otherTeamMemberEmails.length === 0) {
        throw new Error("Enter at least one other team member's email first");
      }
      if (meetingType === 'Online' && !onlineMeetingDetails.trim()) {
        throw new Error('Enter the meeting link, ID, and passcode first');
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

      if (isSlotTaken(appointmentTime)) {
        throw new Error('One of the assigned team members already has an appointment during that time. Pick another slot.');
      }

      const startDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const endDateTime = new Date(startDateTime.getTime() + SLOT_DURATION_MINUTES * 60000);

      const assignedLabels = [
        ...assignedProfiles.map((p) => p.user_email),
        ...(includesOther ? otherTeamMemberEmails : []),
      ];
      const onlineMeetingLink = meetingType === 'Online' ? onlineMeetingDetails.trim() : '';

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
        ...(includesOther ? otherTeamMemberEmails : []),
      ];
      const assignedDisplayName = assignedDisplayNames.join(', ') || 'our team';
      const whenText = startDateTime.toLocaleString('en-CA', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
      const whereText = meetingType === 'In-Person'
        ? (assignedOffice?.name || 'In-person')
        : (onlineMeetingLink || 'Will be shared before the meeting');

      if (lead.email) {
        // Only cc whichever of cem/shorif are actually checked in "Assigned
        // Team Member(s)" — previously both were cc'd unconditionally.
        const ccList = APPOINTMENT_CC_CANDIDATE_EMAILS.filter(
          (e) => assignedTeamMemberEmails.includes(e) && e.toLowerCase() !== lead.email.toLowerCase()
        );
        const escapeHtml = (str) =>
          String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const meetingRow = meetingType === 'Online'
          ? `<tr><td style="padding:6px 12px 6px 0; color:#64748b; white-space:nowrap; vertical-align:top;">Meeting Details</td><td style="padding:6px 0; font-weight:600; white-space:pre-wrap;">${
              onlineMeetingLink ? escapeHtml(onlineMeetingLink) : 'Will be shared before the meeting'
            }</td></tr>`
          : `<tr><td style="padding:6px 12px 6px 0; color:#64748b; white-space:nowrap;">Location</td><td style="padding:6px 0; font-weight:600;">${whereText}</td></tr>`;

        const emailBody = `
<div style="font-family:Arial,Helvetica,sans-serif; color:#1e293b; max-width:560px; margin:0 auto;">
  <p style="margin:0 0 16px;">Hi ${lead.contact_name || 'there'},</p>
  <p style="margin:0 0 16px;">Your appointment with Go-Get has been confirmed. Here are the details:</p>
  <table style="width:100%; border-collapse:collapse; margin:0 0 16px;">
    <tr><td style="padding:6px 12px 6px 0; color:#64748b; white-space:nowrap;">Date &amp; Time</td><td style="padding:6px 0; font-weight:600;">${whenText}</td></tr>
    <tr><td style="padding:6px 12px 6px 0; color:#64748b; white-space:nowrap;">Meeting Type</td><td style="padding:6px 0; font-weight:600;">${meetingType}</td></tr>
    ${meetingRow}
    <tr><td style="padding:6px 12px 6px 0; color:#64748b; white-space:nowrap;">Meeting With</td><td style="padding:6px 0; font-weight:600;">${assignedDisplayName}</td></tr>
  </table>
  <p style="margin:0 0 16px;">If you need to reschedule or have any questions, just reply to this email.</p>
  <p style="margin:0 0 4px;">Best regards,</p>
  <p style="margin:0 0 2px; font-weight:700; color:#0f172a;">The Go-Get Team</p>
  <p style="margin:0 0 2px; font-size:13px; color:#64748b;">Go-Get CRM &amp; Accounting Services</p>
  <p style="margin:0; font-size:13px; color:#64748b;">
    <a href="mailto:info@go-get.ca" style="color:#1d4ed8;">info@go-get.ca</a> &middot; <a href="https://go-get.ca" style="color:#1d4ed8;">go-get.ca</a>
  </p>
</div>`.trim();

        await api.integrations.Core.SendEmail({
          to: lead.email,
          cc: ccList,
          subject: 'Your appointment with Go-Get is confirmed',
          body: emailBody,
          html: true,
        });
      }

      await api.entities.Activity.create({
        lead_id: lead.id,
        activity_type: 'appointment',
        title: `Appointment booked (${meetingType}) with ${assignedDisplayName}`,
        details: `${whenText} — ${whereText}`,
        performed_by: user?.email || '',
        activity_date: new Date().toISOString(),
      });

      return { appointment, emailSent: !!lead.email };
    },
    onSuccess: ({ emailSent }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(
        emailSent
          ? 'Appointment booked and confirmation emailed to the client'
          : 'Appointment booked — no email on file for this lead, so no confirmation was sent'
      );
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

            {showBookingForm && (
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
                    <Label className="text-xs">Other Team Member Email(s)</Label>
                    <MultiEmailInput
                      value={otherTeamMemberEmails}
                      onChange={setOtherTeamMemberEmails}
                      placeholder="e.g. jane@go-get.ca"
                    />
                  </div>
                )}

                {assignedTeamMemberEmails.length > 0 && (() => {
                  const ccPreview = APPOINTMENT_CC_CANDIDATE_EMAILS.filter((e) => assignedTeamMemberEmails.includes(e));
                  return (
                    <p className="text-xs text-muted-foreground">
                      Confirmation will be emailed to {lead.email || 'the client (no email on file)'}
                      {ccPreview.length > 0 ? `, cc: ${ccPreview.join(', ')}` : ' (no cc — cem/shorif not checked above)'}.
                    </p>
                  );
                })()}

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
                    <Label className="text-xs">Meeting Link, ID &amp; Passcode</Label>
                    <Textarea
                      value={onlineMeetingDetails}
                      onChange={(e) => setOnlineMeetingDetails(e.target.value)}
                      placeholder={'Paste the meeting link, ID, and passcode, e.g.\nhttps://zoom.us/j/...\nMeeting ID: 123 456 7890\nPasscode: abc123'}
                      rows={3}
                      className="bg-white"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => { setAppointmentDate(e.target.value); setAppointmentTime(''); }}
                    className="bg-white"
                  />
                  {isWeekendDate(appointmentDate) && (
                    <p className="text-xs text-amber-700">Weekends aren't available — please pick a Monday–Friday date.</p>
                  )}
                </div>

                {appointmentDate && !isWeekendDate(appointmentDate) && (
                  <div className="space-y-2">
                    <Label className="text-xs">Time Slot (Mon–Fri, 10:00 AM–5:30 PM, 30 min each)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-white rounded-lg border">
                      {TIME_SLOTS.map((slot) => {
                        const taken = isSlotTaken(slot);
                        const selected = appointmentTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={taken}
                            onClick={() => setAppointmentTime(slot)}
                            className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-all ${
                              selected
                                ? 'bg-navy text-white border-navy'
                                : taken
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-navy'
                            }`}
                          >
                            {formatSlotLabel(slot)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full gap-2 bg-purple-700 hover:bg-purple-800 text-white"
                  onClick={() => bookAppointmentMutation.mutate()}
                  disabled={
                    bookAppointmentMutation.isPending ||
                    assignedTeamMemberEmails.length === 0 ||
                    !appointmentDate ||
                    !appointmentTime ||
                    isWeekendDate(appointmentDate) ||
                    (includesOther && otherTeamMemberEmails.length === 0) ||
                    (meetingType === 'Online' && !onlineMeetingDetails.trim())
                  }
                >
                  <CalendarClock className="w-4 h-4" />
                  {bookAppointmentMutation.isPending ? 'Booking...' : 'Book Appointment'}
                </Button>
              </div>
            )}

            {isAppointmentBooked && (
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-purple-700" />
                  <h4 className="font-semibold text-sm text-purple-900">Appointment Booked</h4>
                </div>
                {leadAppointment ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-white rounded-lg border p-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date &amp; Time</p>
                      <p className="font-medium">
                        {new Date(leadAppointment.start_time).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Meeting Type</p>
                      <p className="font-medium">{leadAppointment.appointment_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                      <p className="font-medium">
                        {(leadAppointment.assigned_to || [])
                          .map((email) => staffUsers.find((u) => u.email === email)?.full_name || email)
                          .join(', ') || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {leadAppointment.appointment_type === 'In-Person' ? 'Location' : 'Meeting Link'}
                      </p>
                      <p className="font-medium">
                        {leadAppointment.appointment_type === 'In-Person' ? (
                          leadAppointment.location || '—'
                        ) : leadAppointment.meeting_link ? (
                          <a href={leadAppointment.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
                            {leadAppointment.meeting_link}
                          </a>
                        ) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-medium">{leadAppointment.status}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No appointment details found for this lead.</p>
                )}
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