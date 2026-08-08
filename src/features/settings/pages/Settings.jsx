import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  Bell,
  Shield,
  Database,
  Globe,
  Save,
  CheckCircle,
  Copy,
  Trash2,
  Pencil,
  Link as LinkIcon,
  CalendarClock,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CANADIAN_PROVINCES_AND_TERRITORIES, CANADIAN_TIME_ZONES } from '@/lib/canada';

const EMPTY_COMPANY_PROFILE = {
  name: '', legal_name: '', business_number: '', gst_number: '', email: '',
  phone: '', address: '', city: '', province: '', postal_code: '', website: '',
  logo_url: '',
};

const EMPTY_OFFICE = { name: '', address: '', city: '', province: '', phone: '', email: '', is_primary: false };

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_TEAM_MEMBER_PROFILE = {
  user_email: '',
  notify_email: '',
  cc_emails: '',
  zoom_link: '',
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  slot_duration_minutes: '30',
  days_available: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  email_notifications: true,
  new_lead_alerts: true,
  client_document_upload: true,
  filing_deadline_reminder: true,
  invoice_payment_received: true,
  team_task_assignment: true,
  days_before_deadline: 7,
};

// Mirrors backend/app/modules.py's role hierarchy (director > admin > manager
// > bookkeeper > client) — keep in sync if that file's role model changes.
const ROLE_PERMISSIONS = [
  {
    name: 'Director',
    description: "The firm's owner account — created at signup, never invited. Always has full access to every module, including billing, team management, and firm settings, and can invite any other role.",
  },
  {
    name: 'Admin',
    description: 'Full operational access based on the module permissions granted at invite time (typically broad). Can invite Managers, Bookkeepers, and Clients.',
  },
  {
    name: 'Manager',
    description: 'Access to specific modules (e.g. Clients, Tasks, Filings) as granted in their permission matrix at invite time. Cannot invite other users.',
  },
  {
    name: 'Bookkeeper',
    description: 'Access to specific modules as granted in their permission matrix at invite time — typically filings, documents, and billing-related work. Cannot invite other users.',
  },
  {
    name: 'Accountant',
    description: 'Access to specific modules as granted in their permission matrix at invite time — typically billing, filings, and compliance work. Cannot invite other users.',
  },
  {
    name: 'Business Consultant',
    description: 'Access to specific modules as granted in their permission matrix at invite time — typically clients, leads, and calendar. Cannot invite other users.',
  },
  {
    name: 'CPA',
    description: 'Access to specific modules as granted in their permission matrix at invite time — typically filings, compliance, and billing work. Cannot invite other users.',
  },
  {
    name: 'Intern',
    description: 'View-only access to specific modules as granted in their permission matrix at invite time — typically tasks, calendar, and documents. Cannot invite other users.',
  },
  {
    name: 'Other',
    description: "A custom role with a firm-chosen title, for anything the standard roles don't fit. Access is fully hand-configured in their permission matrix at invite time. Cannot invite other users.",
  },
  {
    name: 'Client',
    description: "Read-only client portal access to their own filings, tasks, and documents. Can upload documents and comment, but can't see other clients' data or firm settings.",
  },
];

const DEFAULT_SYSTEM_PREFERENCES = {
  default_currency: 'CAD',
  date_format: 'MM/DD/YYYY',
  time_zone: 'America/Toronto',
  fiscal_year_end: '12-31',
  default_tax_rate: 5,
  invoice_terms: 'Net 30',
  auto_invoice_generation: true,
  require_document_approval: false,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const isAdmin = ['admin', 'director'].includes(user?.role);

  // Company Settings State — seeded from this firm's own tenant record
  // (routers/company.py) once it loads, then edited locally until saved.
  const { data: companyProfile } = useQuery({
    queryKey: ['companyProfile'],
    queryFn: () => api.company.get(),
    enabled: isAdmin,
  });
  const [companySettings, setCompanySettings] = useState(EMPTY_COMPANY_PROFILE);
  useEffect(() => {
    if (companyProfile) setCompanySettings({ ...EMPTY_COMPANY_PROFILE, ...companyProfile });
  }, [companyProfile]);

  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB.');
      return;
    }
    setLogoUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      const updated = await saveCompanyProfileMutation.mutateAsync({ logo_url: file_url });
      setCompanySettings((prev) => ({ ...prev, logo_url: updated.logo_url }));
    } catch (error) {
      toast.error('Failed to upload logo: ' + error.message);
    }
    setLogoUploading(false);
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    try {
      const updated = await saveCompanyProfileMutation.mutateAsync({ logo_url: null });
      setCompanySettings((prev) => ({ ...prev, logo_url: updated.logo_url }));
    } catch (error) {
      toast.error('Failed to remove logo: ' + error.message);
    }
    setLogoUploading(false);
  };

  const saveCompanyProfileMutation = useMutation({
    mutationFn: (data) => api.company.update(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['companyProfile'], data);
      toast.success('Company settings saved successfully');
    },
    onError: (error) => toast.error('Failed to save: ' + error.message),
  });

  // Website Integration — this firm's own webhook key + real connection
  // status (whether a lead has ever actually come in through it), not a
  // hardcoded "Active" claim.
  const { data: websiteIntegration } = useQuery({
    queryKey: ['websiteIntegration'],
    queryFn: () => api.company.getWebsiteIntegration(),
    enabled: isAdmin,
  });
  const webhookEndpointUrl = websiteIntegration?.webhook_key
    ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8070'}/api/public/website-lead-capture/${websiteIntegration.webhook_key}`
    : '';

  // Office Locations — this firm's own Office rows (empty until you add one).
  const { data: officeLocations = [] } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.entities.Office.list(),
    enabled: isAdmin,
  });
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOffice, setNewOffice] = useState(EMPTY_OFFICE);
  const [editingOfficeId, setEditingOfficeId] = useState(null);

  const createOfficeMutation = useMutation({
    mutationFn: (data) => api.entities.Office.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      toast.success('Office added');
      setShowAddOffice(false);
      setNewOffice(EMPTY_OFFICE);
    },
    onError: (error) => toast.error('Failed to add office: ' + error.message),
  });

  const updateOfficeMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Office.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      toast.success('Office updated');
      setShowAddOffice(false);
      setEditingOfficeId(null);
      setNewOffice(EMPTY_OFFICE);
    },
    onError: (error) => toast.error('Failed to update office: ' + error.message),
  });

  const deleteOfficeMutation = useMutation({
    mutationFn: (id) => api.entities.Office.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      toast.success('Office removed');
    },
    onError: (error) => toast.error('Failed to remove office: ' + error.message),
  });

  const openEditOffice = (office) => {
    setEditingOfficeId(office.id);
    setNewOffice({
      name: office.name || '',
      address: office.address || '',
      city: office.city || '',
      province: office.province || '',
      phone: office.phone || '',
      email: office.email || '',
      is_primary: !!office.is_primary,
    });
    setShowAddOffice(true);
  };

  const closeOfficeDialog = () => {
    setShowAddOffice(false);
    setEditingOfficeId(null);
    setNewOffice(EMPTY_OFFICE);
  };

  // Industries — this firm's own client-industry taxonomy, seeded with a
  // broad NAICS-inspired default set but fully editable (replaces the old
  // hardcoded GOGET_INDUSTRIES list in Client Onboarding's Business step).
  const { data: industries = [] } = useQuery({
    queryKey: ['industryTypes'],
    queryFn: () => api.entities.IndustryType.list(),
    enabled: isAdmin,
  });
  const [showAddIndustry, setShowAddIndustry] = useState(false);
  const [newIndustryName, setNewIndustryName] = useState('');

  const createIndustryMutation = useMutation({
    mutationFn: (name) => api.entities.IndustryType.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industryTypes'] });
      toast.success('Industry added');
      setShowAddIndustry(false);
      setNewIndustryName('');
    },
    onError: (error) => toast.error('Failed to add industry: ' + error.message),
  });

  const deleteIndustryMutation = useMutation({
    mutationFn: (id) => api.entities.IndustryType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industryTypes'] });
      toast.success('Industry removed');
    },
    onError: (error) => toast.error('Failed to remove industry: ' + error.message),
  });

  // Team Members (booking) — which of this firm's own staff can be assigned
  // appointments, and their own Zoom link / working hours / CC list. Not
  // seeded — a firm opts staff into booking by adding them here.
  const { data: staffUsers = [] } = useQuery({
    queryKey: ['staffUsers'],
    queryFn: () => api.entities.User.list(),
    enabled: isAdmin,
  });
  const { data: bookingProfiles = [] } = useQuery({
    queryKey: ['bookingProfiles'],
    queryFn: () => api.entities.TeamMemberBookingProfile.list(),
    enabled: isAdmin,
  });
  const [showAddBookingProfile, setShowAddBookingProfile] = useState(false);
  const [newBookingProfile, setNewBookingProfile] = useState(EMPTY_TEAM_MEMBER_PROFILE);
  const [editingBookingProfileId, setEditingBookingProfileId] = useState(null);

  const createBookingProfileMutation = useMutation({
    mutationFn: (data) =>
      api.entities.TeamMemberBookingProfile.create({
        ...data,
        cc_emails: data.cc_emails ? data.cc_emails.split(',').map((s) => s.trim()).filter(Boolean) : [],
        slot_duration_minutes: parseInt(data.slot_duration_minutes) || 30,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingProfiles'] });
      toast.success('Team member added to booking');
      closeBookingProfileDialog();
    },
    onError: (error) => toast.error('Failed to add team member: ' + error.message),
  });

  const updateBookingProfileMutation = useMutation({
    mutationFn: ({ id, data }) =>
      api.entities.TeamMemberBookingProfile.update(id, {
        ...data,
        cc_emails: data.cc_emails ? data.cc_emails.split(',').map((s) => s.trim()).filter(Boolean) : [],
        slot_duration_minutes: parseInt(data.slot_duration_minutes) || 30,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingProfiles'] });
      toast.success('Team member booking profile updated');
      closeBookingProfileDialog();
    },
    onError: (error) => toast.error('Failed to update team member: ' + error.message),
  });

  const deleteBookingProfileMutation = useMutation({
    mutationFn: (id) => api.entities.TeamMemberBookingProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingProfiles'] });
      toast.success('Team member removed from booking');
    },
    onError: (error) => toast.error('Failed to remove team member: ' + error.message),
  });

  const openEditBookingProfile = (profile) => {
    setEditingBookingProfileId(profile.id);
    setNewBookingProfile({
      user_email: profile.user_email || '',
      notify_email: profile.notify_email || '',
      cc_emails: (profile.cc_emails || []).join(', '),
      zoom_link: profile.zoom_link || '',
      working_hours_start: profile.working_hours_start || '09:00',
      working_hours_end: profile.working_hours_end || '17:00',
      slot_duration_minutes: String(profile.slot_duration_minutes || 30),
      days_available: profile.days_available || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    });
    setShowAddBookingProfile(true);
  };

  const closeBookingProfileDialog = () => {
    setShowAddBookingProfile(false);
    setEditingBookingProfileId(null);
    setNewBookingProfile(EMPTY_TEAM_MEMBER_PROFILE);
  };

  const toggleBookingDay = (day) => {
    setNewBookingProfile((prev) => ({
      ...prev,
      days_available: prev.days_available.includes(day)
        ? prev.days_available.filter((d) => d !== day)
        : [...prev.days_available, day],
    }));
  };

  // Notification Settings — seeded from this firm's tenant record.
  const { data: notificationProfile } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => api.company.getNotificationSettings(),
    enabled: isAdmin,
  });
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  useEffect(() => {
    if (notificationProfile) setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...notificationProfile });
  }, [notificationProfile]);

  const saveNotificationSettingsMutation = useMutation({
    mutationFn: (data) => api.company.updateNotificationSettings(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['notificationSettings'], data);
      toast.success('Notification preferences saved');
    },
    onError: (error) => toast.error('Failed to save: ' + error.message),
  });

  // System Preferences — seeded from this firm's tenant record.
  const { data: systemPreferencesProfile } = useQuery({
    queryKey: ['systemPreferences'],
    queryFn: () => api.company.getSystemPreferences(),
    enabled: isAdmin,
  });
  const [systemPreferences, setSystemPreferences] = useState(DEFAULT_SYSTEM_PREFERENCES);
  useEffect(() => {
    if (systemPreferencesProfile) setSystemPreferences({ ...DEFAULT_SYSTEM_PREFERENCES, ...systemPreferencesProfile });
  }, [systemPreferencesProfile]);

  const saveSystemPreferencesMutation = useMutation({
    mutationFn: (data) => api.company.updateSystemPreferences(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['systemPreferences'], data);
      toast.success('System preferences saved');
    },
    onError: (error) => toast.error('Failed to save: ' + error.message),
  });

  const handleSaveCompanySettings = async () => {
    setSaving(true);
    await saveCompanyProfileMutation.mutateAsync(companySettings).catch(() => {});
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    await saveNotificationSettingsMutation.mutateAsync(notificationSettings).catch(() => {});
    setSaving(false);
  };

  const handleSaveSystemPreferences = async () => {
    setSaving(true);
    await saveSystemPreferencesMutation.mutateAsync(systemPreferences).catch(() => {});
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6 text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-navy mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access system settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Settings</h1>
          <p className="text-muted-foreground">Company, users, and system configuration</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-w-md">
          <Link to={createPageUrl('UserManagement')}>
            <Button variant="outline" size="sm">User Management</Button>
          </Link>
          <Link to={createPageUrl('EmailSettings')}>
            <Button variant="outline" size="sm">Email Settings</Button>
          </Link>
          <Link to={createPageUrl('Database')}>
            <Button variant="outline" size="sm">Database</Button>
          </Link>
          <Link to={createPageUrl('CRAForms')}>
            <Button variant="outline" size="sm">CRA Forms</Button>
          </Link>
          <Link to={createPageUrl('Vendors')}>
            <Button variant="outline" size="sm">Vendors</Button>
          </Link>
          <Link to={createPageUrl('DocumentTypes')}>
            <Button variant="outline" size="sm">Document Types</Button>
          </Link>
          <Link to={createPageUrl('WorkflowTemplates')}>
            <Button variant="outline" size="sm">Workflow Templates</Button>
          </Link>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 h-auto">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="w-4 h-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="offices" className="gap-2">
            <Building2 className="w-4 h-4" />
            Offices
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <CalendarClock className="w-4 h-4" />
            Team Members (Booking)
          </TabsTrigger>
          <TabsTrigger value="industries" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Industries
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="integration" className="gap-2">
            <Globe className="w-4 h-4" />
            Website Integration
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 pb-2">
                <div className="w-16 h-16 rounded-xl bg-muted border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {companySettings.logo_url ? (
                    <img src={companySettings.logo_url} alt="Company logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label className="block mb-2">Company Logo</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={logoUploading} asChild>
                      <label className="cursor-pointer">
                        {logoUploading ? 'Uploading...' : 'Upload Logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                      </label>
                    </Button>
                    {companySettings.logo_url && (
                      <Button type="button" variant="ghost" size="sm" disabled={logoUploading} onClick={handleLogoRemove}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name</Label>
                  <Input
                    id="legal_name"
                    value={companySettings.legal_name}
                    onChange={(e) => setCompanySettings({ ...companySettings, legal_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_number">Business Number (BN)</Label>
                  <Input
                    id="business_number"
                    value={companySettings.business_number}
                    onChange={(e) => setCompanySettings({ ...companySettings, business_number: e.target.value })}
                    placeholder="123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_number">GST/HST Number</Label>
                  <Input
                    id="gst_number"
                    value={companySettings.gst_number}
                    onChange={(e) => setCompanySettings({ ...companySettings, gst_number: e.target.value })}
                    placeholder="123456789RT0001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companySettings.website}
                    onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-navy mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={companySettings.address}
                      onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={companySettings.city}
                      onChange={(e) => setCompanySettings({ ...companySettings, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      value={companySettings.province}
                      onChange={(e) => setCompanySettings({ ...companySettings, province: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={companySettings.postal_code}
                      onChange={(e) => setCompanySettings({ ...companySettings, postal_code: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveCompanySettings} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Office Locations */}
        <TabsContent value="offices">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Office Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {officeLocations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No office locations yet. Add your first one below.
                </p>
              )}
              {officeLocations.map((office) => (
                <Card key={office.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-navy text-lg">{office.name}</h3>
                        {office.is_primary && (
                          <span className="text-xs bg-yellow/10 text-yellow-dark px-2 py-1 rounded mt-1 inline-block">
                            Primary Office
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditOffice(office)}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteOfficeMutation.mutate(office.id)}
                          disabled={deleteOfficeMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Address</p>
                        <p className="font-medium">{office.address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">City / Province</p>
                        <p className="font-medium">
                          {[office.city, office.province].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Phone</p>
                        <p className="font-medium">{office.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Email</p>
                        <p className="font-medium">{office.email || '—'}</p>
                      </div>
                    </div>
                    {office.is_active === false && (
                      <span className="text-xs bg-gray-500/10 text-gray-600 px-2 py-1 rounded mt-3 inline-block">
                        Inactive
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full" onClick={() => setShowAddOffice(true)}>
                + Add New Office
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={showAddOffice} onOpenChange={(open) => (open ? setShowAddOffice(true) : closeOfficeDialog())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOfficeId ? 'Edit Office Location' : 'Add Office Location'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="office_name">Office Name</Label>
                <Input
                  id="office_name"
                  value={newOffice.name}
                  onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })}
                  placeholder="Downtown Office"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office_address">Address</Label>
                <Input
                  id="office_address"
                  value={newOffice.address}
                  onChange={(e) => setNewOffice({ ...newOffice, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="office_city">City</Label>
                  <Input
                    id="office_city"
                    value={newOffice.city}
                    onChange={(e) => setNewOffice({ ...newOffice, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office_province">Province</Label>
                  <Select value={newOffice.province || undefined} onValueChange={(v) => setNewOffice({ ...newOffice, province: v })}>
                    <SelectTrigger id="office_province"><SelectValue placeholder="Select province..." /></SelectTrigger>
                    <SelectContent>
                      {CANADIAN_PROVINCES_AND_TERRITORIES.map((province) => (
                        <SelectItem key={province} value={province}>{province}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="office_phone">Phone</Label>
                  <Input
                    id="office_phone"
                    value={newOffice.phone}
                    onChange={(e) => setNewOffice({ ...newOffice, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office_email">Email</Label>
                  <Input
                    id="office_email"
                    type="email"
                    value={newOffice.email}
                    onChange={(e) => setNewOffice({ ...newOffice, email: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newOffice.is_primary}
                  onChange={(e) => setNewOffice({ ...newOffice, is_primary: e.target.checked })}
                />
                Primary office
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeOfficeDialog}>Cancel</Button>
              <Button
                onClick={() =>
                  editingOfficeId
                    ? updateOfficeMutation.mutate({ id: editingOfficeId, data: newOffice })
                    : createOfficeMutation.mutate(newOffice)
                }
                disabled={!newOffice.name || createOfficeMutation.isPending || updateOfficeMutation.isPending}
              >
                {editingOfficeId
                  ? (updateOfficeMutation.isPending ? 'Saving…' : 'Save Changes')
                  : (createOfficeMutation.isPending ? 'Adding…' : 'Add Office')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Industries */}
        <TabsContent value="industries">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Client Industries
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                The industry list shown when onboarding a new client. Seeded with a broad starter set — add, remove, or rename to match your own client mix.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {industries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No industries yet. Add your first one below.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <span
                    key={industry.id}
                    className="inline-flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {industry.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5"
                      onClick={() => deleteIndustryMutation.mutate(industry.id)}
                      disabled={deleteIndustryMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </span>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setShowAddIndustry(true)}>
                + Add Industry
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={showAddIndustry} onOpenChange={setShowAddIndustry}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Industry</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="industry_name">Industry Name</Label>
              <Input
                id="industry_name"
                value={newIndustryName}
                onChange={(e) => setNewIndustryName(e.target.value)}
                placeholder="e.g. Landscaping"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddIndustry(false)}>Cancel</Button>
              <Button
                onClick={() => createIndustryMutation.mutate(newIndustryName.trim())}
                disabled={!newIndustryName.trim() || createIndustryMutation.isPending}
              >
                {createIndustryMutation.isPending ? 'Adding…' : 'Add Industry'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Members (Booking) */}
        <TabsContent value="booking">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5" />
                Team Members — Booking Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Opt staff into appointment booking: their own Zoom link, working hours, slot length, and who gets CC'd on confirmations. Only staff added here appear in the Lead Pipeline's "Assigned Team Member" picker.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {bookingProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No team members configured for booking yet. Add one below.
                </p>
              )}
              {bookingProfiles.map((profile) => {
                const staffUser = staffUsers.find((u) => u.email === profile.user_email);
                return (
                  <Card key={profile.id} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-navy text-lg">
                            {staffUser?.full_name || profile.user_email}
                          </h3>
                          <p className="text-xs text-muted-foreground">{profile.user_email}</p>
                          {!profile.is_active && (
                            <span className="text-xs bg-gray-500/10 text-gray-600 px-2 py-1 rounded mt-1 inline-block">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditBookingProfile(profile)}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteBookingProfileMutation.mutate(profile.id)}
                            disabled={deleteBookingProfileMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Working Hours</p>
                          <p className="font-medium">{profile.working_hours_start}–{profile.working_hours_end}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Slot Length</p>
                          <p className="font-medium">{profile.slot_duration_minutes} min</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Days Available</p>
                          <p className="font-medium">{(profile.days_available || []).join(', ') || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">CC on Confirmation</p>
                          <p className="font-medium">{(profile.cc_emails || []).join(', ') || '—'}</p>
                        </div>
                        {profile.zoom_link && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground mb-1">Meeting Link</p>
                            <p className="font-medium truncate">{profile.zoom_link}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <Button variant="outline" className="w-full" onClick={() => setShowAddBookingProfile(true)}>
                + Add Team Member to Booking
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={showAddBookingProfile} onOpenChange={(open) => (open ? setShowAddBookingProfile(true) : closeBookingProfileDialog())}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBookingProfileId ? 'Edit Team Member Booking' : 'Add Team Member to Booking'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="booking_user">Staff Member</Label>
                <Select
                  value={newBookingProfile.user_email || undefined}
                  onValueChange={(v) => {
                    setNewBookingProfile({
                      ...newBookingProfile,
                      user_email: v,
                      notify_email: newBookingProfile.notify_email || v,
                    });
                  }}
                >
                  <SelectTrigger id="booking_user"><SelectValue placeholder="Select staff member..." /></SelectTrigger>
                  <SelectContent>
                    {staffUsers.filter((u) => u.is_active !== false).map((u) => (
                      <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
                    ))}
                    {newBookingProfile.user_email && !staffUsers.some((u) => u.email === newBookingProfile.user_email) && (
                      <SelectItem value={newBookingProfile.user_email}>{newBookingProfile.user_email} (not in staff list)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  value={newBookingProfile.user_email}
                  onChange={(e) => setNewBookingProfile({ ...newBookingProfile, user_email: e.target.value })}
                  placeholder="Or type any email directly, e.g. cem@go-get.ca"
                  className="mt-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking_notify">Notify Email</Label>
                <Input
                  id="booking_notify"
                  type="email"
                  value={newBookingProfile.notify_email}
                  onChange={(e) => setNewBookingProfile({ ...newBookingProfile, notify_email: e.target.value })}
                  placeholder="Defaults to the staff member's own email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking_cc">CC Email(s) — optional, comma-separated</Label>
                <Input
                  id="booking_cc"
                  value={newBookingProfile.cc_emails}
                  onChange={(e) => setNewBookingProfile({ ...newBookingProfile, cc_emails: e.target.value })}
                  placeholder="manager@yourfirm.ca"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking_zoom">Meeting Link (Zoom, Google Meet, etc.)</Label>
                <Input
                  id="booking_zoom"
                  value={newBookingProfile.zoom_link}
                  onChange={(e) => setNewBookingProfile({ ...newBookingProfile, zoom_link: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="booking_start">Working Hours Start</Label>
                  <Input
                    id="booking_start"
                    type="time"
                    value={newBookingProfile.working_hours_start}
                    onChange={(e) => setNewBookingProfile({ ...newBookingProfile, working_hours_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking_end">Working Hours End</Label>
                  <Input
                    id="booking_end"
                    type="time"
                    value={newBookingProfile.working_hours_end}
                    onChange={(e) => setNewBookingProfile({ ...newBookingProfile, working_hours_end: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking_slot">Slot (min)</Label>
                  <Input
                    id="booking_slot"
                    type="number"
                    min="5"
                    step="5"
                    value={newBookingProfile.slot_duration_minutes}
                    onChange={(e) => setNewBookingProfile({ ...newBookingProfile, slot_duration_minutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Days Available</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleBookingDay(day)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        newBookingProfile.days_available.includes(day)
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeBookingProfileDialog}>Cancel</Button>
              <Button
                onClick={() =>
                  editingBookingProfileId
                    ? updateBookingProfileMutation.mutate({ id: editingBookingProfileId, data: newBookingProfile })
                    : createBookingProfileMutation.mutate(newBookingProfile)
                }
                disabled={!newBookingProfile.user_email || createBookingProfileMutation.isPending || updateBookingProfileMutation.isPending}
              >
                {editingBookingProfileId
                  ? (updateBookingProfileMutation.isPending ? 'Saving…' : 'Save Changes')
                  : (createBookingProfileMutation.isPending ? 'Adding…' : 'Add Team Member')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Management */}
        <TabsContent value="users">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-semibold text-navy">Invite New User</p>
                    <p className="text-sm text-muted-foreground">Add team members to the system</p>
                  </div>
                  <Link to={createPageUrl('UserManagement')}>
                    <Button>Invite User</Button>
                  </Link>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-navy mb-4">Role Permissions</h3>
                  <div className="space-y-3">
                    {ROLE_PERMISSIONS.map((role) => (
                      <Card key={role.name} className="border">
                        <CardContent className="pt-6">
                          <h4 className="font-bold text-navy mb-2">{role.name}</h4>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_notifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, email_notifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">New Lead Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when new leads are captured</p>
                  </div>
                  <Switch
                    checked={notificationSettings.new_lead_alerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, new_lead_alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">Client Document Uploads</p>
                    <p className="text-sm text-muted-foreground">Alert when clients upload documents</p>
                  </div>
                  <Switch
                    checked={notificationSettings.client_document_upload}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, client_document_upload: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">Filing Deadline Reminders</p>
                    <p className="text-sm text-muted-foreground">Receive deadline alerts</p>
                  </div>
                  <Switch
                    checked={notificationSettings.filing_deadline_reminder}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, filing_deadline_reminder: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">Invoice Payments</p>
                    <p className="text-sm text-muted-foreground">Alert when payments are received</p>
                  </div>
                  <Switch
                    checked={notificationSettings.invoice_payment_received}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, invoice_payment_received: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">Task Assignments</p>
                    <p className="text-sm text-muted-foreground">Get notified when tasks are assigned to you</p>
                  </div>
                  <Switch
                    checked={notificationSettings.team_task_assignment}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, team_task_assignment: checked })
                    }
                  />
                </div>

                <div className="p-4 border rounded-lg">
                  <Label htmlFor="deadline_days" className="font-semibold text-navy">
                    Deadline Reminder (Days in Advance)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    How many days before a deadline should you be notified?
                  </p>
                  <Input
                    id="deadline_days"
                    type="number"
                    min="1"
                    max="30"
                    value={notificationSettings.days_before_deadline}
                    onChange={(e) =>
                      setNotificationSettings({ ...notificationSettings, days_before_deadline: parseInt(e.target.value) })
                    }
                    className="max-w-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotifications} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Preferences */}
        <TabsContent value="system">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                System Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="default_currency">Default Currency</Label>
                  <Input
                    id="default_currency"
                    value={systemPreferences.default_currency}
                    onChange={(e) => setSystemPreferences({ ...systemPreferences, default_currency: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_format">Date Format</Label>
                  <Input
                    id="date_format"
                    value={systemPreferences.date_format}
                    onChange={(e) => setSystemPreferences({ ...systemPreferences, date_format: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_zone">Time Zone</Label>
                  <Select
                    value={systemPreferences.time_zone || undefined}
                    onValueChange={(v) => setSystemPreferences({ ...systemPreferences, time_zone: v })}
                  >
                    <SelectTrigger id="time_zone"><SelectValue placeholder="Select time zone..." /></SelectTrigger>
                    <SelectContent>
                      {CANADIAN_TIME_ZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiscal_year_end">Fiscal Year End (MM-DD)</Label>
                  <Input
                    id="fiscal_year_end"
                    value={systemPreferences.fiscal_year_end}
                    onChange={(e) => setSystemPreferences({ ...systemPreferences, fiscal_year_end: e.target.value })}
                    placeholder="12-31"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
                  <Input
                    id="default_tax_rate"
                    type="number"
                    step="0.01"
                    value={systemPreferences.default_tax_rate}
                    onChange={(e) =>
                      setSystemPreferences({ ...systemPreferences, default_tax_rate: parseFloat(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_terms">Default Invoice Terms</Label>
                  <Input
                    id="invoice_terms"
                    value={systemPreferences.invoice_terms}
                    onChange={(e) => setSystemPreferences({ ...systemPreferences, invoice_terms: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="font-semibold text-navy mb-4">Automation Settings</h3>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">Auto-Generate Invoices</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create invoices when service filings are completed
                    </p>
                  </div>
                  <Switch
                    checked={systemPreferences.auto_invoice_generation}
                    onCheckedChange={(checked) =>
                      setSystemPreferences({ ...systemPreferences, auto_invoice_generation: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-navy">Require Document Approval</p>
                    <p className="text-sm text-muted-foreground">
                      Documents must be reviewed before being marked as processed
                    </p>
                  </div>
                  <Switch
                    checked={systemPreferences.require_document_approval}
                    onCheckedChange={(checked) =>
                      setSystemPreferences({ ...systemPreferences, require_document_approval: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSystemPreferences} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Website Integration Tab */}
        <TabsContent value="integration">
          <div className="space-y-6">
            {/* Status Banner — reflects this firm's own connection, not a fixed claim */}
            {websiteIntegration?.connected ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-900">Website Lead Capture — Active</p>
                  <p className="text-sm text-green-700">
                    Last lead received {new Date(websiteIntegration.last_lead_received_at).toLocaleString()}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-amber-900">Not connected yet</p>
                  <p className="text-sm text-amber-700">
                    No leads have come through your webhook yet. Add the endpoint below to your website's forms to start receiving leads directly into this CRM.
                  </p>
                </div>
              </div>
            )}

            {/* Webhook Endpoint */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Your Webhook Endpoint URL
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  This URL is unique to your firm. Add it to your own website's contact, booking, or lead-intake forms so submissions flow straight into this CRM as new leads.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Endpoint</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-slate-900 text-green-400 rounded-lg text-sm font-mono overflow-x-auto">
                      {webhookEndpointUrl || 'Loading…'}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!webhookEndpointUrl}
                      onClick={() => {
                        navigator.clipboard.writeText(webhookEndpointUrl);
                        toast.success('Copied to clipboard!');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <strong>Method:</strong> POST &nbsp;|&nbsp; <strong>Content-Type:</strong> application/json &nbsp;|&nbsp; <strong>CORS:</strong> Enabled for all origins
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  Keep this URL private — anyone who has it can submit leads into your CRM. If it's ever exposed publicly, contact support to have it rotated.
                </div>
              </CardContent>
            </Card>

            {/* Payload Reference */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Payload Reference — What to Send</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Include these fields in your POST request body from your own website's forms.
                </p>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-slate-900 text-green-300 rounded-lg text-xs overflow-x-auto">
{`// Required fields
{
  "contact_name": "Full Name",        // or "full_name"
  "email": "client@example.com",

  // Optional but recommended
  "phone": "555-123-4567",
  "company_name": "Business Name",    // or "business_name"
  "lead_type": "Business",            // "Individual" or "Business"
  "services_interested": ["Bookkeeping", "Corporate Tax"],
  "how_can_we_help": "Message from contact form",
  "form_source": "contact_form",      // your own label for which form this came from

  // Consultation booking
  "meeting_type": "Online",           // or "In-Person"

  "urgency": "This Month"             // "Immediate", "This Week", "This Month", "Future Planning"
}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}