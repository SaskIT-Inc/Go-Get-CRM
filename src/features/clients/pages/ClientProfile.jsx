import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  User, Building2, Mail, Phone, MapPin, FileText, DollarSign,
  Calendar, Edit, Save, X, Search, MessageSquare,
  AlertTriangle, Activity, Globe, Lock, Plus, Trash2, RefreshCw, KeyRound, CheckCircle2, Loader2, Send, Repeat,
  ListChecks, Clock, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrentUser, INVITABLE } from '@/lib/permissions';
import useLiveChat from '@/hooks/useLiveChat';
import AddServiceModal from '@/features/clients/components/detail/AddServiceModal';
import LogCommunicationModal from '@/features/clients/components/detail/LogCommunicationModal';
import RecurringFollowUpModal from '@/features/clients/components/board/RecurringFollowUpModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InvoiceGenerator from '@/features/invoices/components/InvoiceGenerator';
import TaskFormModal from '@/features/tasks/components/TaskFormModal';
import DocumentUploader from '@/features/documents/components/DocumentUploader';
import DocumentCard from '@/features/documents/components/DocumentCard';

// Small icon/color mapping for Activity.activity_type — the model has
// carried this field since it was introduced, but the Activity tab never
// rendered it (or `details`); every value that's actually produced today
// (see backend/app/notify.py callers) is covered, with a neutral fallback
// for anything else.
const ACTIVITY_TYPE_STYLES = {
  task_created: { label: 'Task', color: 'bg-blue-100 text-blue-700' },
  task_completed: { label: 'Task Completed', color: 'bg-green-100 text-green-700' },
  task_rescheduled: { label: 'Task Rescheduled', color: 'bg-amber-100 text-amber-700' },
  filing_created: { label: 'Filing', color: 'bg-purple-100 text-purple-700' },
  filing_status_changed: { label: 'Filing Status', color: 'bg-indigo-100 text-indigo-700' },
  invoice_generated: { label: 'Invoice', color: 'bg-emerald-100 text-emerald-700' },
  document_uploaded: { label: 'Document', color: 'bg-yellow-100 text-yellow-700' },
  signature_completed: { label: 'Signature', color: 'bg-teal-100 text-teal-700' },
  client_updated: { label: 'Profile', color: 'bg-slate-100 text-slate-700' },
};

const GOGET_INDUSTRIES = [
  'Indigenous Business',
  'Automotive (Repair Shop / Dealership / Parts)',
  'Construction & Real Estate',
  'Independent Contractor (Plumber / Electrician / HVAC / Painter / Roofer)',
  'Child Care', 'Senior Care', 'Medical & Dental Clinic', 'Gym, Fitness & Beauty',
  'Restaurant & Café', 'Retail Store', 'E-Commerce', 'Gas Station & Convenience Store',
  'Women-Led Business', 'Bookkeeping / Accounting', 'Consulting & Professional Services',
  'Transportation & Logistics', 'Agriculture', 'Non-Profit', 'Real Estate Investor',
  'Technology / IT', 'Other'
];

function FieldRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-navy">{value || <span className="text-muted-foreground italic text-sm">N/A</span>}</p>
    </div>
  );
}

// Reusable section edit toolbar
function SectionActions({ isEditing, onEdit, onSave, onCancel, isPending }) {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} className="gap-1"><X className="w-3.5 h-3.5" />Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={isPending} className="gap-1"><Save className="w-3.5 h-3.5" />Save</Button>
      </div>
    );
  }
  return (
    <Button size="sm" variant="ghost" onClick={onEdit} className="gap-1 text-muted-foreground hover:text-navy">
      <Edit className="w-3.5 h-3.5" />Edit
    </Button>
  );
}

// ClientProfile v2 - Services tab rebuilt
export default function ClientProfile() {
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Per-section edit states
  const [editingSection, setEditingSection] = useState(null); // 'businessContact' | 'contactPerson' | 'businessDetails' | 'taxNumbers' | 'package' | 'safe'
  const [sectionData, setSectionData] = useState({});
  const [customIndustry, setCustomIndustry] = useState('');

  // Service filings
  const [showAddFiling, setShowAddFiling] = useState(false);
  const [editingFiling, setEditingFiling] = useState(null);
  const [showLogCommunication, setShowLogCommunication] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [messageText, setMessageText] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('client');
    if (clientId) setSelectedClientId(clientId);
  }, []);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => api.entities.Client.list() });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => api.entities.Service.list() });
  const { data: serviceFilings = [] } = useQuery({ queryKey: ['serviceFilings', selectedClientId], queryFn: () => api.entities.ServiceFiling.filter({ client_id: selectedClientId }), enabled: !!selectedClientId });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices', selectedClientId], queryFn: () => api.entities.Invoice.filter({ client_id: selectedClientId }), enabled: !!selectedClientId });
  const { data: documents = [] } = useQuery({ queryKey: ['documents', selectedClientId], queryFn: () => api.entities.Document.filter({ client_id: selectedClientId }), enabled: !!selectedClientId });
  const [showUploadDocument, setShowUploadDocument] = useState(false);
  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => api.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', selectedClientId] });
      toast.success('Document deleted');
    },
  });
  const handleDeleteDocument = (doc) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocumentMutation.mutate(doc.id);
    }
  };
  const { data: checklists = [] } = useQuery({ queryKey: ['checklists', selectedClientId], queryFn: () => api.entities.DocumentChecklist.filter({ client_id: selectedClientId }), enabled: !!selectedClientId });
  const { data: complianceAlerts = [] } = useQuery({ queryKey: ['complianceAlerts', selectedClientId], queryFn: () => api.entities.ComplianceAlert.filter({ client_id: selectedClientId }), enabled: !!selectedClientId });
  const { data: activities = [] } = useQuery({ queryKey: ['activities', selectedClientId], queryFn: () => api.entities.Activity.filter({ client_id: selectedClientId }, '-activity_date'), enabled: !!selectedClientId });
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const { data: clientTasks = [] } = useQuery({ queryKey: ['clientTasks', selectedClientId], queryFn: () => api.entities.Task.filter({ client_id: selectedClientId }), enabled: !!selectedClientId });
  const [editingClientTask, setEditingClientTask] = useState(null);
  useLiveChat();
  const { data: communications = [] } = useQuery({ queryKey: ['communications', selectedClientId], queryFn: () => api.entities.Communication.filter({ client_id: selectedClientId }, '-communication_date'), enabled: !!selectedClientId, refetchInterval: 5000 });
  const { data: recurringSequences = [] } = useQuery({ queryKey: ['recurringEmailSequences', selectedClientId], queryFn: () => api.entities.RecurringEmailSequence.filter({ client_id: selectedClientId }), enabled: !!selectedClientId, retry: false });
  const [showRecurringEmail, setShowRecurringEmail] = useState(false);
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: () => api.entities.Package.list(), retry: false });
  const activePackages = packages.filter((p) => p.is_active !== false);
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.entities.User.list() });
  const { data: actor } = useCurrentUser();

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingSection(null);
      setSectionData({});
      toast.success('Saved successfully');
    },
    onError: (error) => toast.error('Failed to save: ' + error.message)
  });

  const createFilingMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceFiling.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceFilings', selectedClientId] });
      // The backend auto-creates a linked Task + Activity row alongside the
      // filing — ['tasks'] keeps My Tasks/Calendar/Team Dashboard fresh if
      // open elsewhere, but this page's own Tasks/Activity tabs read from
      // their own differently-keyed queries and need invalidating too, or
      // they'd keep showing stale data until a manual page refresh.
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['clientTasks', selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ['activities', selectedClientId] });
      setShowAddFiling(false);
      toast.success('Service added');
    },
    onError: (error) => toast.error('Failed to add service: ' + error.message)
  });

  const updateFilingMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.ServiceFiling.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceFilings', selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['clientTasks', selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ['activities', selectedClientId] });
      setEditingFiling(null);
      toast.success('Service updated');
    },
    onError: (error) => toast.error('Failed to update service: ' + error.message)
  });

  const deleteFilingMutation = useMutation({
    mutationFn: (id) => api.entities.ServiceFiling.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceFilings', selectedClientId] }); toast.success('Filing removed'); },
    onError: (error) => toast.error('Failed to remove filing: ' + error.message)
  });

  const inviteToPortalMutation = useMutation({
    mutationFn: (data) => api.users.inviteUser(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Portal invitation sent to ${data.email}`);
      if (data.accept_url) {
        toast.info(`No email set up yet — share this invite link manually: ${data.accept_url}`);
      }
    },
    onError: (error) => toast.error(`Failed to invite: ${error.message}`)
  });

  const sendMessageMutation = useMutation({
    mutationFn: (text) => api.entities.Communication.create({
      client_id: selectedClientId,
      communication_type: 'Portal Message',
      notes: text,
      communication_date: new Date().toISOString(),
    }),
    onMutate: async (text) => {
      const key = ['communications', selectedClientId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old = []) => [
        { id: `optimistic-${Date.now()}`, client_id: selectedClientId, communication_type: 'Portal Message', notes: text, sender_type: 'staff', author_email: actor?.email, communication_date: new Date().toISOString() },
        ...old,
      ]);
      setMessageText('');
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', selectedClientId] });
    },
    onError: (error, _text, context) => {
      if (context?.previous) queryClient.setQueryData(['communications', selectedClientId], context.previous);
      toast.error(`Failed to send: ${error.message}`);
    }
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const currentRecurringSequence = recurringSequences.find((s) => s.status === 'active')
    || [...recurringSequences].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    || null;
  // A client's portal login is just a User row whose email matches their
  // Client record (see backend/app/routers/generic.py's _authorize_client) —
  // there's no separate "linked" flag, so this is the same lookup the
  // backend itself uses to decide portal access.
  const portalUser = selectedClient?.primary_email
    ? users.find(
        (u) => u.role === 'client' && u.email?.toLowerCase() === selectedClient.primary_email.toLowerCase()
      )
    : null;
  const canInviteToPortal = INVITABLE[actor?.role]?.includes('client');
  // Mirrors backend/app/routers/generic.py's _communication_scope_filter:
  // only the client's assigned team member, or admin/director, can chat with
  // them — everyone else's Communication query silently comes back empty
  // rather than 403ing, so this is purely to explain that empty state.
  const assignedStaffName = selectedClient?.assigned_to
    ? users.find((u) => u.email?.toLowerCase() === selectedClient.assigned_to.toLowerCase())?.full_name || selectedClient.assigned_to
    : null;
  const canChatWithClient =
    actor?.role === 'director' ||
    actor?.role === 'admin' ||
    (!!selectedClient?.assigned_to && selectedClient.assigned_to.toLowerCase() === actor?.email?.toLowerCase());

  const startEdit = (section) => {
    const data = { ...selectedClient };
    if (section === 'businessDetails' && data.industry && !GOGET_INDUSTRIES.includes(data.industry) && data.industry !== 'Other') {
      setCustomIndustry(data.industry);
      data.industry = 'Other';
    } else {
      setCustomIndustry('');
    }
    if (section === 'package' && !data.active_package && data.monthly_package) {
      // Pre-fill from what the client picked at intake (Step 4: Services) —
      // staff just confirms it into the official Active Package fields
      // instead of re-selecting the same tier from scratch.
      const suggested = activePackages.find((p) => p.name === data.monthly_package);
      if (suggested) {
        data.active_package = suggested.name;
        data.package_price = suggested.price || '';
        data.package_billing = suggested.billing_frequency || '';
      }
    }
    setSectionData(data);
    setEditingSection(section);
  };

  const cancelEdit = () => { setEditingSection(null); setSectionData({}); };

  const saveSection = (extraData = {}) => {
    let saveData = { ...sectionData, ...extraData };
    if (editingSection === 'businessDetails' && saveData.industry === 'Other' && customIndustry.trim()) {
      saveData.industry = customIndustry.trim();
    }
    updateClientMutation.mutate({ id: selectedClientId, data: saveData });
  };

  const sd = (field) => (e) => setSectionData(prev => ({ ...prev, [field]: e.target.value }));
  const ss = (field) => (val) => setSectionData(prev => ({ ...prev, [field]: val }));

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const outstandingBalance = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  const filteredActivities = useMemo(() => {
    if (activityTypeFilter === 'all') return activities;
    return activities.filter((a) => a.activity_type === activityTypeFilter);
  }, [activities, activityTypeFilter]);

  const filteredClients = useMemo(() => {
    if (!searchInput) return clients;
    const term = searchInput.toLowerCase();
    return clients.filter(c => c.legal_name?.toLowerCase().includes(term) || c.primary_email?.toLowerCase().includes(term) || c.primary_contact_name?.toLowerCase().includes(term));
  }, [clients, searchInput]);

  const statusColors = {
    'Active': 'bg-green-500/10 text-green-700 border-green-500/20',
    'Onboarding': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    'Pending': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    'Inactive': 'bg-gray-500/10 text-gray-700 border-gray-500/20',
    'Archived': 'bg-slate-500/10 text-slate-700 border-slate-500/20'
  };

  if (!selectedClientId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-navy">Client Profile</h1>
          <Link to={createPageUrl('ClientDirectory')}><Button variant="outline">View All Clients</Button></Link>
        </div>
        <Card className="border-none shadow-md">
          <CardHeader><CardTitle>Search & Select a Client</CardTitle></CardHeader>
          <CardContent>
            <div className="relative max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input placeholder="Search by name, email, or contact..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="pl-10 py-2.5" />
              </div>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No clients found</div>
                  ) : filteredClients.map(client => (
                    <div key={client.id} onClick={() => { setSelectedClientId(client.id); setSearchInput(''); setShowDropdown(false); }} className="p-4 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                          {client.client_type === 'Business' ? <Building2 className="w-5 h-5 text-navy" /> : <User className="w-5 h-5 text-navy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-navy truncate">{client.legal_name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{client.primary_email}</p>
                          <div className="mt-1 flex gap-2">
                            <Badge variant="secondary" className="text-xs">{client.client_type}</Badge>
                            <Badge variant="secondary" className={cn('text-xs', statusColors[client.status])}>{client.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('ClientDirectory')}><Button variant="outline">← Directory</Button></Link>
        <div>
          <h1 className="text-4xl font-bold text-navy">{selectedClient?.legal_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={statusColors[selectedClient?.status]}>{selectedClient?.status}</Badge>
            {selectedClient?.client_type && <Badge variant="outline">{selectedClient.client_type}</Badge>}
            {selectedClient?.industry && <Badge variant="outline">{selectedClient.industry}</Badge>}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-none shadow-sm"><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-blue-600" /><div><p className="text-sm text-muted-foreground">Service Filings</p><p className="text-2xl font-bold text-navy">{serviceFilings.length}</p></div></div></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-green-600" /><div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-navy">${totalRevenue.toFixed(2)}</p></div></div></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-red-600" /><div><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-red-600">${outstandingBalance.toFixed(2)}</p></div></div></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-purple-600" /><div><p className="text-sm text-muted-foreground">Documents</p><p className="text-2xl font-bold text-navy">{documents.length}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="flex flex-wrap w-full h-auto gap-1">
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="business">Business Details</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({clientTasks.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payment-history">Payments</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="communications">Comms</TabsTrigger>
          <TabsTrigger value="safe">🔒 SAFE</TabsTrigger>
        </TabsList>

        {/* ── CONTACT INFO TAB ── */}
        <TabsContent value="contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Business Contact */}
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Business Contact</CardTitle>
                <SectionActions
                  isEditing={editingSection === 'businessContact'}
                  onEdit={() => startEdit('businessContact')}
                  onSave={() => saveSection()}
                  onCancel={cancelEdit}
                  isPending={updateClientMutation.isPending}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {editingSection === 'businessContact' ? (
                  <div className="space-y-3">
                    <div className="space-y-1"><Label>Legal / Business Name</Label><Input value={sectionData.legal_name || ''} onChange={sd('legal_name')} /></div>
                    <div className="space-y-1"><Label>Operating / Trade Name</Label><Input value={sectionData.operating_name || ''} onChange={sd('operating_name')} /></div>
                    <div className="space-y-1"><Label>Business Email</Label><Input type="email" value={sectionData.primary_email || ''} onChange={sd('primary_email')} /></div>
                    <div className="space-y-1"><Label>Business Phone</Label><Input value={sectionData.primary_phone || ''} onChange={sd('primary_phone')} /></div>
                    <div className="space-y-1"><Label>Website</Label><Input value={sectionData.website || ''} onChange={sd('website')} placeholder="https://..." /></div>
                    <div className="space-y-1"><Label>Street Address</Label><Input value={sectionData.address || ''} onChange={sd('address')} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label>City</Label><Input value={sectionData.city || ''} onChange={sd('city')} /></div>
                      <div className="space-y-1"><Label>Province</Label><Input value={sectionData.province || ''} onChange={sd('province')} /></div>
                    </div>
                    <div className="space-y-1"><Label>Postal Code</Label><Input value={sectionData.postal_code || ''} onChange={sd('postal_code')} /></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FieldRow label="Legal / Business Name" value={selectedClient?.legal_name} />
                    <FieldRow label="Operating / Trade Name" value={selectedClient?.operating_name} />
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Business Email</p><p className="font-medium">{selectedClient?.primary_email || 'N/A'}</p></div></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Business Phone</p><p className="font-medium">{selectedClient?.primary_phone || 'N/A'}</p></div></div>
                    <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Website</p><p className="font-medium">{selectedClient?.website || 'N/A'}</p></div></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{[selectedClient?.address, selectedClient?.city, selectedClient?.province, selectedClient?.postal_code].filter(Boolean).join(', ') || 'N/A'}</p></div></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Person */}
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Contact Person</CardTitle>
                <SectionActions
                  isEditing={editingSection === 'contactPerson'}
                  onEdit={() => startEdit('contactPerson')}
                  onSave={() => saveSection()}
                  onCancel={cancelEdit}
                  isPending={updateClientMutation.isPending}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {editingSection === 'contactPerson' ? (
                  <div className="space-y-3">
                    <div className="space-y-1"><Label>Full Name</Label><Input value={sectionData.primary_contact_name || ''} onChange={sd('primary_contact_name')} placeholder="Contact person's full name" /></div>
                    <div className="space-y-1"><Label>Position / Title</Label><Input value={sectionData.contact_person_position || ''} onChange={sd('contact_person_position')} placeholder="e.g. Owner, CFO, Manager" /></div>
                    <div className="space-y-1"><Label>Direct Email</Label><Input type="email" value={sectionData.contact_person_email || ''} onChange={sd('contact_person_email')} /></div>
                    <div className="space-y-1"><Label>Direct Phone</Label><Input value={sectionData.contact_person_phone || ''} onChange={sd('contact_person_phone')} /></div>
                    <div className="space-y-1"><Label>Mailing Address (if different)</Label><Input value={sectionData.contact_person_address || ''} onChange={sd('contact_person_address')} /></div>
                    <div className="space-y-1"><Label>Preferred Contact Method</Label>
                      <Select value={sectionData.preferred_contact_method || ''} onValueChange={ss('preferred_contact_method')}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {['Email', 'Phone', 'WhatsApp', 'In Person', 'Online Meeting'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Notes</Label><Textarea value={sectionData.notes || ''} onChange={sd('notes')} rows={2} /></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FieldRow label="Full Name" value={selectedClient?.primary_contact_name} />
                    <FieldRow label="Position / Title" value={selectedClient?.contact_person_position} />
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Direct Email</p><p className="font-medium">{selectedClient?.contact_person_email || selectedClient?.primary_email || 'N/A'}</p></div></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Direct Phone</p><p className="font-medium">{selectedClient?.contact_person_phone || selectedClient?.primary_phone || 'N/A'}</p></div></div>
                    <FieldRow label="Mailing Address" value={selectedClient?.contact_person_address} />
                    <FieldRow label="Preferred Contact" value={selectedClient?.preferred_contact_method} />
                    {selectedClient?.notes && <div><p className="text-xs text-muted-foreground mb-0.5">Notes</p><p className="text-sm text-slate-700">{selectedClient.notes}</p></div>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Portal Access */}
            <Card className="border-none shadow-md md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />Client Portal Access</CardTitle>
              </CardHeader>
              <CardContent>
                {portalUser ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Portal access active — logs in as <span className="font-medium">{portalUser.email}</span>
                    {portalUser.is_active === false && (
                      <Badge variant="outline" className="ml-1 border-red-300 text-red-600">Deactivated</Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      This client has no portal login yet — they can't sign in to upload documents or view their filings.
                    </p>
                    <Button
                      size="sm"
                      className="gap-2 flex-shrink-0"
                      disabled={!canInviteToPortal || !selectedClient?.primary_email || inviteToPortalMutation.isPending}
                      onClick={() => inviteToPortalMutation.mutate({
                        email: selectedClient.primary_email,
                        full_name: selectedClient.primary_contact_name || selectedClient.legal_name,
                        role: 'client',
                      })}
                    >
                      {inviteToPortalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      Invite to Client Portal
                    </Button>
                  </div>
                )}
                {!portalUser && !selectedClient?.primary_email && (
                  <p className="text-xs text-amber-600 mt-2">Add a Business Email above first — the invite is sent to it.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── BUSINESS DETAILS TAB ── */}
        <TabsContent value="business">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Business Details */}
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Business Details</CardTitle>
                <SectionActions
                  isEditing={editingSection === 'businessDetails'}
                  onEdit={() => startEdit('businessDetails')}
                  onSave={() => saveSection()}
                  onCancel={cancelEdit}
                  isPending={updateClientMutation.isPending}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {editingSection === 'businessDetails' ? (
                  <div className="space-y-3">
                    <div className="space-y-1"><Label>Client Status</Label>
                      <Select value={sectionData.status || ''} onValueChange={ss('status')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{['Active','Inactive','Onboarding','Pending','Archived'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Client Type</Label>
                      <Select value={sectionData.client_type || ''} onValueChange={ss('client_type')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Individual">Individual</SelectItem><SelectItem value="Business">Business</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Business Type</Label>
                      <Select value={sectionData.business_type || ''} onValueChange={ss('business_type')}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {['Corporation','Sole Proprietorship','Partnership','Non-Profit','Professional Corporation','Holding Company','Other'].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Industry</Label>
                      <Select value={sectionData.industry || ''} onValueChange={ss('industry')}>
                        <SelectTrigger><SelectValue placeholder="Select your industry..." /></SelectTrigger>
                        <SelectContent className="max-h-64 overflow-y-auto">
                          {GOGET_INDUSTRIES.map(i=><SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {sectionData.industry === 'Other' && (
                        <Input className="mt-2" placeholder="Specify your industry..." value={customIndustry} onChange={e=>setCustomIndustry(e.target.value)} />
                      )}
                    </div>
                    <div className="space-y-1"><Label>Number of Employees</Label><Input type="number" value={sectionData.number_of_employees || ''} onChange={(e) => setSectionData(prev => ({ ...prev, number_of_employees: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label>Incorporation Date</Label><Input type="date" value={sectionData.incorporation_date || ''} onChange={sd('incorporation_date')} /></div>
                    <div className="space-y-1"><Label>Fiscal Year End (MM-DD)</Label><Input value={sectionData.fiscal_year_end || ''} onChange={sd('fiscal_year_end')} placeholder="e.g. 12-31" /></div>
                    <div className="space-y-1"><Label>Annual Revenue Range</Label>
                      <Select value={sectionData.annual_revenue || ''} onValueChange={ss('annual_revenue')}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{['Under $50K','$50K-$100K','$100K-$250K','$250K-$500K','$500K-$1M','Over $1M'].map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Last Year's Revenue</Label><Input value={sectionData.last_year_revenue || ''} onChange={sd('last_year_revenue')} placeholder="e.g. $250,000" /></div>
                    <div className="space-y-1"><Label>Current Accounting Software</Label><Input value={sectionData.current_accounting_software || ''} onChange={sd('current_accounting_software')} /></div>
                    <div className="space-y-1"><Label>Previous Accountant</Label><Input value={sectionData.previous_accountant || ''} onChange={sd('previous_accountant')} /></div>
                    <div className="space-y-1"><Label>Lead Source</Label>
                      <Select value={sectionData.lead_source || ''} onValueChange={ss('lead_source')}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{['Website','Referral','Social Media','Google','Event','Existing Client','Other'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Referral Source</Label><Input value={sectionData.referral_source || ''} onChange={sd('referral_source')} /></div>
                    <div className="space-y-1"><Label>Outstanding Issues</Label><Textarea value={sectionData.outstanding_issues || ''} onChange={sd('outstanding_issues')} rows={2} /></div>
                    <div className="space-y-1"><Label>Special Requirements</Label><Textarea value={sectionData.special_requirements || ''} onChange={sd('special_requirements')} rows={2} /></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FieldRow label="Client Status" value={selectedClient?.status} />
                    <FieldRow label="Client Type" value={selectedClient?.client_type} />
                    <FieldRow label="Business Type" value={selectedClient?.business_type} />
                    <FieldRow label="Industry" value={selectedClient?.industry} />
                    <FieldRow label="Number of Employees" value={selectedClient?.number_of_employees} />
                    <FieldRow label="Incorporation Date" value={selectedClient?.incorporation_date} />
                    <FieldRow label="Fiscal Year End" value={selectedClient?.fiscal_year_end} />
                    <FieldRow label="Annual Revenue Range" value={selectedClient?.annual_revenue} />
                    <FieldRow label="Last Year's Revenue" value={selectedClient?.last_year_revenue} />
                    <FieldRow label="Accounting Software" value={selectedClient?.current_accounting_software} />
                    <FieldRow label="Previous Accountant" value={selectedClient?.previous_accountant} />
                    <FieldRow label="Lead Source" value={selectedClient?.lead_source} />
                    <FieldRow label="Referral Source" value={selectedClient?.referral_source} />
                    {selectedClient?.outstanding_issues && <FieldRow label="Outstanding Issues" value={selectedClient.outstanding_issues} />}
                    {selectedClient?.special_requirements && <FieldRow label="Special Requirements" value={selectedClient.special_requirements} />}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tax & Registration Numbers */}
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Tax & Registration Numbers</CardTitle>
                <SectionActions
                  isEditing={editingSection === 'taxNumbers'}
                  onEdit={() => startEdit('taxNumbers')}
                  onSave={() => saveSection()}
                  onCancel={cancelEdit}
                  isPending={updateClientMutation.isPending}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {editingSection === 'taxNumbers' ? (
                  <div className="space-y-3">
                    <div className="space-y-1"><Label>Business Industry Type</Label>
                      <Select value={sectionData.industry || ''} onValueChange={ss('industry')}>
                        <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
                        <SelectContent className="max-h-64 overflow-y-auto">
                          {GOGET_INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {sectionData.industry === 'Other' && (
                        <Input className="mt-2" placeholder="Specify your industry..." value={customIndustry} onChange={e => setCustomIndustry(e.target.value)} />
                      )}
                    </div>
                    {[
                      ['CRA Business Number (BN)', 'business_number'],
                      ['GST/HST Number', 'gst_hst_number'],
                      ['PST Number', 'pst_number'],
                      ['Payroll Number', 'payroll_number'],
                      ['Corp Number — Federal', 'corp_number_federal'],
                      ['Corp Number — Provincial (SK)', 'corp_number_provincial'],
                      ['Number of Shareholders', 'number_of_shareholders'],
                    ].map(([label, field]) => (
                      <div key={field} className="space-y-1"><Label>{label}</Label><Input value={sectionData[field] || ''} onChange={sd(field)} /></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FieldRow label="Business Industry Type" value={selectedClient?.industry} />
                    <FieldRow label="CRA Business Number (BN)" value={selectedClient?.business_number} />
                    <FieldRow label="GST/HST Number" value={selectedClient?.gst_hst_number} />
                    <FieldRow label="PST Number" value={selectedClient?.pst_number} />
                    <FieldRow label="Payroll Number" value={selectedClient?.payroll_number} />
                    <FieldRow label="Corp Number — Federal" value={selectedClient?.corp_number_federal} />
                    <FieldRow label="Corp Number — Provincial (SK)" value={selectedClient?.corp_number_provincial} />
                    <FieldRow label="Number of Shareholders" value={selectedClient?.number_of_shareholders} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SERVICES TAB ── */}
        <TabsContent value="services">
          <div className="space-y-6">

            {/* ── SECTION 1: Active Package / Plan ── */}
            <Card className="border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-navy" />
                  <h3 className="text-base font-semibold text-navy">Active Package / Plan</h3>
                </div>
                <SectionActions
                  isEditing={editingSection === 'package'}
                  onEdit={() => startEdit('package')}
                  onSave={() => saveSection()}
                  onCancel={cancelEdit}
                  isPending={updateClientMutation.isPending}
                />
              </div>
              <CardContent className="px-6 py-5">
                {editingSection === 'package' ? (
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Package</Label>
                      <Select value={sectionData.active_package || ''} onValueChange={(val) => {
                        const pkg = activePackages.find(p => p.name === val);
                        setSectionData(prev => ({
                          ...prev,
                          active_package: val,
                          package_price: pkg?.price || '',
                          package_billing: pkg?.billing_frequency || ''
                        }));
                      }}>
                        <SelectTrigger className="h-10 border-slate-200">
                          <SelectValue placeholder="Select a package..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activePackages.map(p => (
                            <SelectItem key={p.id} value={p.name}>
                              {p.name}{p.price ? ` — ${p.price}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activePackages.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No packages configured yet — add your firm's pricing tiers under Settings &gt; Packages.
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Price</Label>
                        <Input value={sectionData.package_price || ''} onChange={sd('package_price')} placeholder="e.g. $299" className="h-10 border-slate-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Billing Frequency</Label>
                        <Input value={sectionData.package_billing || ''} onChange={sd('package_billing')} placeholder="e.g. Monthly" className="h-10 border-slate-200" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {selectedClient?.active_package ? (
                      <div className="space-y-4">
                        {/* Package name badge */}
                        <div className="inline-block px-4 py-2 bg-navy/5 border border-navy/20 rounded-lg">
                          <p className="text-sm font-bold text-navy">{selectedClient.active_package}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Monthly Price</p>
                            <p className="text-lg font-bold text-navy">{selectedClient.package_price || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Billing Frequency</p>
                            <p className="text-lg font-bold text-navy">{selectedClient.package_billing || '—'}</p>
                          </div>
                        </div>
                      </div>
                    ) : selectedClient?.monthly_package ? (
                      <div className="space-y-2">
                        <p className="text-sm">
                          Selected <span className="font-semibold text-navy">{selectedClient.monthly_package}</span> at intake — not yet confirmed.
                        </p>
                        <p className="text-xs text-muted-foreground">Click Edit to confirm it as this client's Active Package.</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">No package selected — click Edit to assign one.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── SECTION 2: Service Filings ── */}
            <Card className="border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-navy">Service Filings</h3>
                <Button
                  size="sm"
                  onClick={() => setShowAddFiling(true)}
                  className="gap-1.5 bg-navy text-white hover:bg-navy/90 shadow-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />Add Service
                </Button>
              </div>

              <CardContent className="px-6 py-4">
                {serviceFilings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">No service filings yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "+ Add Service" to assign a service to this client</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {serviceFilings.map(filing => {
                      const statusBadgeStyle =
                        filing.status === 'Completed' || filing.status === 'Filed'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : filing.status === 'In Progress'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : filing.status === 'Review'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : filing.status === 'Documents Pending'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200';

                      return (
                        <div
                          key={filing.id}
                          className="group border border-slate-200 rounded-xl bg-white hover:border-navy/20 hover:shadow-sm transition-all px-5 py-4 flex items-center justify-between gap-4"
                        >
                          {/* Left: name + meta */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-navy text-sm">{filing.service_name}</span>
                              {filing.filing_frequency && filing.filing_frequency !== 'One-time' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-xs font-medium">
                                  <RefreshCw className="w-2.5 h-2.5" />{filing.filing_frequency}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                              <span>Year: {filing.filing_year || new Date().getFullYear()}</span>
                              {filing.schedule_day && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Day {filing.schedule_day} each month
                                </span>
                              )}
                              {filing.assigned_to && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {filing.assigned_to}
                                </span>
                              )}
                              {filing.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due: {new Date(filing.due_date).toLocaleDateString()}
                                </span>
                              )}
                              {filing.compliance_due_date && (
                                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                  <Calendar className="w-3 h-3" />
                                  Compliance Due: {new Date(filing.compliance_due_date).toLocaleDateString()}
                                </span>
                              )}
                              {filing.fee > 0 && (
                                <span className="text-green-700 font-semibold">${Number(filing.fee).toFixed(2)}</span>
                              )}
                            </div>
                          </div>

                          {/* Right: status badge + edit button */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={cn('text-xs font-medium border px-2.5 py-1 rounded-md', statusBadgeStyle)}>
                              {filing.status || 'Not Started'}
                            </span>
                            <button
                              onClick={() => setEditingFiling(filing)}
                              className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteFilingMutation.mutate(filing.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Service Modal */}
          <AddServiceModal
            open={showAddFiling}
            onClose={() => setShowAddFiling(false)}
            onSave={(data) => createFilingMutation.mutate({ ...data, client_id: selectedClientId })}
            services={services}
            isSaving={createFilingMutation.isPending}
          />

          {/* Edit Service Modal */}
          {editingFiling && (
            <AddServiceModal
              open={!!editingFiling}
              onClose={() => setEditingFiling(null)}
              onSave={(data) => updateFilingMutation.mutate({ id: editingFiling.id, data })}
              services={services}
              isSaving={updateFilingMutation.isPending}
              initialData={editingFiling}
            />
          )}
        </TabsContent>

        {/* ── TASKS TAB ── */}
        <TabsContent value="tasks">
          <Card className="border-none shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5" />Client Tasks</CardTitle></CardHeader>
            <CardContent>
              {clientTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tasks allocated for this client yet</p>
              ) : (
                <div className="space-y-3">
                  {clientTasks.map((task) => {
                    const assignee = users.find((u) => u.email === task.assigned_to);
                    const statusColor = task.status === 'Complete'
                      ? 'bg-green-100 text-green-800'
                      : task.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : task.status === 'Blocked'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800';
                    return (
                      <div
                        key={task.id}
                        onClick={() => setEditingClientTask(task)}
                        className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold text-navy">{task.title}</h4>
                          <Badge className={statusColor} variant="outline">{task.status}</Badge>
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{assignee?.full_name || task.assigned_to || 'Unassigned'}</span>
                          {task.due_date && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due: {new Date(task.due_date).toLocaleDateString()}</span>
                          )}
                          {task.extra?.client_emailed && (
                            <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                              <Mail className="w-3 h-3" />Emailed
                            </span>
                          )}
                          {task.extra?.overdue_reschedule_history?.length > 0 && (
                            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              <RotateCcw className="w-3 h-3" />Auto-Rescheduled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          {editingClientTask && (
            <TaskFormModal
              task={editingClientTask}
              currentUser={actor}
              onClose={() => setEditingClientTask(null)}
            />
          )}
        </TabsContent>

        {/* ── DOCUMENTS TAB ── */}
        <TabsContent value="documents">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm" onClick={() => setShowUploadDocument(true)} className="gap-2">
                <Plus className="w-4 h-4" />Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No documents yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} onDelete={handleDeleteDocument} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Dialog open={showUploadDocument} onOpenChange={setShowUploadDocument}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <DocumentUploader
                clientId={selectedClientId}
                onSuccess={() => setShowUploadDocument(false)}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── COMPLIANCE TAB ── */}
        <TabsContent value="compliance">
          <Card className="border-none shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Compliance Alerts</CardTitle></CardHeader>
            <CardContent>
              {complianceAlerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No compliance alerts</p>
              ) : complianceAlerts.map(alert => {
                const sc = { low: 'bg-blue-50 border-blue-200', medium: 'bg-yellow-50 border-yellow-200', high: 'bg-orange-50 border-orange-200', critical: 'bg-red-50 border-red-200' };
                const linkedFiling = alert.extra?.service_filing_id
                  ? serviceFilings.find((f) => f.id === alert.extra.service_filing_id)
                  : null;
                return (
                  <div
                    key={alert.id}
                    onClick={linkedFiling ? () => setEditingFiling(linkedFiling) : undefined}
                    className={cn(
                      'p-4 border rounded-lg mb-3',
                      sc[alert.severity],
                      linkedFiling && 'cursor-pointer hover:brightness-95 transition-all'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div><h4 className="font-semibold text-navy">{alert.title}</h4><p className="text-sm text-slate-600 mt-1">{alert.description}</p></div>
                      <Badge>{alert.severity}</Badge>
                    </div>
                    {alert.due_date && <p className="text-xs text-muted-foreground mt-2">Due: {new Date(alert.due_date).toLocaleDateString()}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACTIVITY TAB ── */}
        <TabsContent value="activity">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Activity Timeline</CardTitle>
              <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  {Object.entries(ACTIVITY_TYPE_STYLES).map(([type, meta]) => (
                    <SelectItem key={type} value={type}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity recorded</p>
              ) : filteredActivities.map((item, idx) => {
                const typeMeta = ACTIVITY_TYPE_STYLES[item.activity_type] || { label: item.activity_type || 'Activity', color: 'bg-slate-100 text-slate-700' };
                const linkedTask = item.extra?.task_id
                  ? clientTasks.find((t) => t.id === item.extra.task_id)
                  : null;
                const assignee = item.extra?.assigned_to && users.find((u) => u.email === item.extra.assigned_to);
                return (
                  <div
                    key={item.id}
                    onClick={linkedTask ? () => setEditingClientTask(linkedTask) : undefined}
                    className={cn('relative flex gap-4 pb-4', linkedTask && 'cursor-pointer hover:bg-slate-50 rounded-lg -mx-2 px-2')}
                  >
                    {idx !== filteredActivities.length - 1 && <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-slate-200" />}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-navy text-white text-xs font-semibold flex items-center justify-center">→</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-navy">{item.title}</h4>
                            <Badge variant="outline" className={cn('text-[10px]', typeMeta.color)}>{typeMeta.label}</Badge>
                          </div>
                          {item.from_stage && item.to_stage && (
                            <p className="text-sm text-muted-foreground">{item.from_stage} → {item.to_stage}</p>
                          )}
                          {item.details && (
                            <p className="text-sm text-slate-600 mt-1">{item.details}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {item.performed_by && <span>By: {item.performed_by.split('@')[0]}</span>}
                        {item.activity_date && <span>{new Date(item.activity_date).toLocaleString()}</span>}
                        {(assignee || item.extra?.assigned_to) && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {assignee?.full_name || item.extra.assigned_to}
                          </span>
                        )}
                        {item.extra?.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />Due: {new Date(item.extra.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {item.extra?.client_emailed === true && (
                          <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            <Mail className="w-3 h-3" />Emailed{item.extra.client_emailed_note ? `: ${item.extra.client_emailed_note}` : ''}
                          </span>
                        )}
                        {item.extra?.client_emailed === false && (
                          <span className="flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                            <Mail className="w-3 h-3" />Not emailed
                          </span>
                        )}
                        {item.extra?.task_title && (
                          <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                            <ListChecks className="w-3 h-3" />Task: {item.extra.task_title} — {item.extra.task_status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMMUNICATIONS TAB ── */}
        <TabsContent value="communications">
          <Card className="border-none shadow-md mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2"><Repeat className="w-5 h-5" />Recurring Follow-up</CardTitle>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowRecurringEmail(true)}>
                {currentRecurringSequence?.status === 'active' ? 'Manage' : 'Start Recurring Follow-up'}
              </Button>
            </CardHeader>
            <CardContent>
              {currentRecurringSequence?.status === 'active' ? (
                <p className="text-sm text-muted-foreground">
                  "{currentRecurringSequence.subject}" — every {currentRecurringSequence.interval_days} day
                  {Number(currentRecurringSequence.interval_days) === 1 ? '' : 's'}, next send{' '}
                  {currentRecurringSequence.next_send_date}. Sent {currentRecurringSequence.send_count || 0} time
                  {Number(currentRecurringSequence.send_count) === 1 ? '' : 's'} so far.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recurring follow-up running for this client.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Client Communication Thread</CardTitle>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowLogCommunication(true)}>
                <Plus className="w-4 h-4" />Log Past Communication
              </Button>
            </CardHeader>
            <CardContent>
              {!canChatWithClient ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                  {assignedStaffName
                    ? `Only ${assignedStaffName} or an admin/director can message this client.`
                    : 'This client has no assigned team member yet — only an admin/director can message them.'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mb-4">
                  Visible to both your team and {selectedClient?.legal_name || 'the client'} in their portal — replies show up on both sides immediately.
                </p>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 mb-4">
                {communications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {canChatWithClient ? 'No messages yet' : 'No messages to show'}
                  </p>
                ) : [...communications].reverse().map(comm => {
                  const fromClient = comm.sender_type === 'client';
                  return (
                    <div key={comm.id} className={cn('flex', fromClient ? 'justify-start' : 'justify-end')}>
                      <div className={cn(
                        'max-w-[75%] rounded-lg px-4 py-2.5',
                        fromClient ? 'bg-slate-100 text-slate-800' : 'bg-navy text-white'
                      )}>
                        {comm.communication_type && comm.communication_type !== 'Portal Message' && (
                          <p className={cn('text-xs font-semibold mb-1', fromClient ? 'text-slate-500' : 'text-white/70')}>
                            {comm.subject || comm.communication_type}
                          </p>
                        )}
                        {comm.notes && <p className="text-sm whitespace-pre-wrap">{comm.notes}</p>}
                        <p className={cn('text-[10px] mt-1', fromClient ? 'text-slate-400' : 'text-white/60')}>
                          {fromClient ? (selectedClient?.legal_name || 'Client') : (comm.author_email || comm.created_by || 'Staff')}
                          {' · '}
                          {new Date(comm.communication_date).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canChatWithClient && (
                <div className="flex gap-2 pt-3 border-t">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Send a message to this client..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    className="self-end gap-2"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    onClick={() => sendMessageMutation.mutate(messageText.trim())}
                  >
                    {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <LogCommunicationModal
            open={showLogCommunication}
            onClose={() => setShowLogCommunication(false)}
            clientId={selectedClientId}
          />

          <RecurringFollowUpModal
            open={showRecurringEmail}
            onClose={() => setShowRecurringEmail(false)}
            client={selectedClient}
            sequence={currentRecurringSequence}
          />
        </TabsContent>

        {/* ── PAYMENT HISTORY TAB ── */}
        <TabsContent value="payment-history">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100"><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-2">Total Billed</p><p className="text-3xl font-bold text-navy">${totalRevenue.toFixed(2)}</p></CardContent></Card>
              <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100"><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-2">Paid</p><p className="text-3xl font-bold text-navy">${(totalRevenue - outstandingBalance).toFixed(2)}</p></CardContent></Card>
              <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100"><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-2">Outstanding</p><p className="text-3xl font-bold text-red-600">${outstandingBalance.toFixed(2)}</p></CardContent></Card>
            </div>
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Invoices</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowAddInvoice(true)}>
                  <Plus className="w-4 h-4" />Add Invoice
                </Button>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? <p className="text-center text-muted-foreground py-8">No invoices</p> : invoices.map(inv => (
                  <div key={inv.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors mb-2 flex items-center justify-between">
                    <div><h4 className="font-semibold text-navy">{inv.invoice_number}</h4><p className="text-sm text-muted-foreground">{new Date(inv.invoice_date).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="font-bold text-navy">${inv.total_amount?.toFixed(2)}</p><Badge className={inv.payment_status === 'Paid' ? 'bg-green-500/10 text-green-700' : inv.payment_status === 'Partial' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-red-500/10 text-red-700'}>{inv.payment_status}</Badge></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Dialog open={showAddInvoice} onOpenChange={setShowAddInvoice}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Invoice</DialogTitle></DialogHeader>
              <InvoiceGenerator clientId={selectedClientId} onSuccess={() => setShowAddInvoice(false)} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── SAFE TAB ── */}
        <TabsContent value="safe">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-red-600" />SAFE — Secure Credentials</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Confidential login credentials. Only authorised staff should access this section.</p>
              </div>
              <SectionActions
                isEditing={editingSection === 'safe'}
                onEdit={() => startEdit('safe')}
                onSave={() => saveSection()}
                onCancel={cancelEdit}
                isPending={updateClientMutation.isPending}
              />
            </CardHeader>
            <CardContent>
              {editingSection === 'safe' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: 'ISC', fields: [['User ID', 'safe_isc_user_id'], ['Password', 'safe_isc_password'], ['Web Code', 'safe_isc_web_code']] },
                    { title: 'Incorporation Canada', fields: [['User ID', 'safe_inc_canada_user_id'], ['Password', 'safe_inc_canada_password'], ['Web Code', 'safe_inc_canada_web_code']] },
                    { title: 'PST Account', fields: [['ID', 'safe_pst_id'], ['Password', 'safe_pst_password']] },
                    { title: 'CRA Account', fields: [['ID', 'safe_cra_id'], ['Password', 'safe_cra_password']] },
                  ].map(section => (
                    <div key={section.title} className="space-y-3 p-4 border rounded-lg bg-slate-50">
                      <h4 className="font-bold text-navy">{section.title}</h4>
                      {section.fields.map(([label, field]) => (
                        <div key={field} className="space-y-1"><Label>{label}</Label><Input value={sectionData[field] || ''} onChange={sd(field)} /></div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: 'ISC', fields: [['User ID', 'safe_isc_user_id'], ['Password', 'safe_isc_password'], ['Web Code', 'safe_isc_web_code']] },
                    { title: 'Incorporation Canada', fields: [['User ID', 'safe_inc_canada_user_id'], ['Password', 'safe_inc_canada_password'], ['Web Code', 'safe_inc_canada_web_code']] },
                    { title: 'PST Account', fields: [['ID', 'safe_pst_id'], ['Password', 'safe_pst_password']] },
                    { title: 'CRA Account', fields: [['ID', 'safe_cra_id'], ['Password', 'safe_cra_password']] },
                  ].map(section => (
                    <div key={section.title} className="space-y-3 p-4 border rounded-lg bg-slate-50">
                      <h4 className="font-bold text-navy">{section.title}</h4>
                      {section.fields.map(([label, field]) => (
                        <div key={field}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-mono font-medium text-navy">{selectedClient?.[field] || <span className="text-muted-foreground italic font-sans text-sm">Not set</span>}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}