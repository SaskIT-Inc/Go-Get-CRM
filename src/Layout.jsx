import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronLeft,
  Menu,
  LogOut,
  User,
  TrendingUp,
  Target,
  Plus,
  AlertCircle,
  MessagesSquare,
  Sparkles,
  Building2,
  UserPlus
} from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';
import NotificationBell from '@/components/NotificationBell';
import Logo from '@/components/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { can } from '@/lib/permissions';

// `module` on each child gates visibility via can(user, module, 'view')
// (see src/lib/permissions.js, mirrors backend/app/modules.py). A parent
// section shows if at least one child is visible.
const navigation = [
  {
    name: 'MySpace',
    icon: LayoutDashboard,
    children: [
      { name: 'My Tasks', page: 'Tasks', module: 'tasks' },
      // Managerial-only: for an individual contributor this would just
      // duplicate their own "My Tasks" view now that the backend scopes
      // Task reads to assigned_to for non-managerial roles.
      { name: 'Team Dashboard', page: 'TeamTaskDashboard', module: 'tasks', roles: ['director', 'admin', 'manager'] },
      { name: 'Calendar', page: 'CentralCalendar', module: 'calendar' },
      { name: 'Documents', page: 'Documents', module: 'documents' },
      { name: 'Email', page: 'Email', module: 'email' },
      { name: 'Services', page: 'DatabaseServices', module: 'services' }
    ]
  },
  {
    name: 'Clients',
    icon: Users,
    children: [
      { name: 'Directory', page: 'ClientDirectory', module: 'clients' },
      { name: 'Profile', page: 'ClientProfile', module: 'clients' },
      { name: 'Onboarding', page: 'ClientOnboarding', module: 'clients' }
    ]
  },
  {
    name: 'Leads',
    icon: Target,
    children: [
      { name: 'Pipeline', page: 'LeadPipeline', module: 'leads' },
      { name: 'Directory', page: 'LeadDirectory', module: 'leads' },
      { name: 'Capture New Lead', page: 'LeadCapture', module: 'leads' },
      { name: 'Needs Assessment', page: 'NeedsAssessment', module: 'leads' },
      { name: 'Analytics', page: 'ConversionTracking', module: 'leads' },
      { name: 'Sales Analytics', page: 'SalesAnalytics', module: 'leads' }
    ]
  },
  {
    name: 'Analytics',
    icon: TrendingUp,
    children: [
      { name: 'Reports', page: 'Reports', module: 'analytics' },
      { name: 'Analytics', page: 'Analytics', module: 'analytics' },
      { name: 'Executive Analytics', page: 'ExecutiveAnalytics', module: 'analytics' },
      { name: 'Monthly Task Reports', page: 'MonthlyTaskReports', module: 'analytics' }
    ]
  },
  {
    name: 'Social',
    icon: MessagesSquare,
    children: [
      { name: "What's New", page: 'WhatsNew', module: 'announcements' },
      { name: 'Conversations', page: 'Conversations', module: 'conversations' }
    ]
  },
  {
    name: 'Explore AI',
    icon: Sparkles,
    page: 'ExploreAI',
    alwaysVisible: true,
    staffOnly: true
  }
];

// The client role never grants on any module (see can() in permissions.js),
// so it gets its own tiny fixed nav instead of falling out of `navigation`
// above — a client's whole surface is the one ClientPortal page.
const CLIENT_NAVIGATION = [
  { name: 'My Portal', icon: LayoutDashboard, page: 'ClientPortal', alwaysVisible: true }
];

// Profile/Company Settings/Compliance/Invite User now live in the header
// avatar dropdown instead of sidebar sections — see AvatarMenu below.
// Sub-pages that used to hang off the old Settings/Compliance sidebar
// sections (Email Settings, Database, CRA Forms, Vendors, Document Types,
// Workflow Templates, Filing Compliance) stay reachable via quick-link
// buttons on the Settings and ComplianceAlerts pages themselves. Services
// (and Packages, folded into the same page) moved into the MySpace group
// above instead of staying a Settings quick-link.

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  // On mobile, sidebar is closed by default; on desktop it is open
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  // Close sidebar on mobile when route changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: companyProfile } = useQuery({
    queryKey: ['companyProfile'],
    queryFn: () => api.company.get(),
    staleTime: 5 * 60 * 1000
  });

  // Each nav section is visible if at least one of its children's modules is
  // viewable by this user (see src/lib/permissions.js). A child can also
  // carry an explicit `roles` allowlist for admin-only actions (like firm
  // billing) that don't map to the module/permission system at all.
  const visibleChildren = (item) =>
    (item.children || []).filter(
      (child) => can(user, child.module) && (!child.roles || child.roles.includes(user?.role))
    );
  // Single-link items (no `children`) opt in via `alwaysVisible` since they
  // have no module to gate on; `staffOnly` hides them from the client role.
  const sectionVisible = (item) => {
    if (item.staffOnly && user?.role === 'client') return false;
    if (item.children) return visibleChildren(item).length > 0;
    return !!item.alwaysVisible;
  };

  const userInitials = (() => {
    if (!user) return '';
    if (user.full_name) {
      return user.full_name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || '';
  })();
  const isFirmAdmin = user?.role === 'director' || user?.role === 'admin';
  const isClient = user?.role === 'client';
  const navItems = isClient ? CLIENT_NAVIGATION : navigation;

  const quickCreateOptions = [
    { name: 'New Lead', page: 'LeadCapture', icon: Target },
    { name: 'New Client', page: 'ClientOnboarding', icon: Users },
    { name: 'New Estimate', page: 'EstimateBuilder', icon: DollarSign },
    { name: 'New Retainer', page: 'Retainers', icon: FileText },
    { name: 'Log Communication', page: 'CommunicationHistory', icon: MessagesSquare }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleSubmenu = (name) => {
    setOpenSubmenu(openSubmenu === name ? null : name);
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out',
          'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white border-r border-slate-700 shadow-2xl',
          'w-[280px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 bg-slate-900/50">
            <Link
              to="/"
              onClick={closeSidebarOnMobile}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Logo className="w-12 h-12" logoUrl={companyProfile?.logo_url} />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">GOGET</h1>
                <p className="text-[10px] text-slate-400">CRM System</p>
              </div>
            </Link>
            {/* Close button visible on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white flex-shrink-0"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-600">
            {navItems.filter(sectionVisible).map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl',
                        'text-sm font-semibold transition-all group',
                        'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-700/50 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-500 transition-all">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 transition-transform',
                          openSubmenu === item.name && 'rotate-180'
                        )}
                      />
                    </button>
                    {openSubmenu === item.name && (
                      <div className="ml-6 mt-1 space-y-0.5 pl-3 border-l-2 border-slate-700">
                        {visibleChildren(item).map((child) => (
                          <Link
                            key={child.page}
                            to={createPageUrl(child.page)}
                            onClick={closeSidebarOnMobile}
                            className={cn(
                              'block px-4 py-2.5 rounded-lg text-sm',
                              'text-slate-400 hover:text-white hover:bg-slate-700/50',
                              'transition-all',
                              currentPageName === child.page &&
                                'bg-gradient-to-r from-primary to-purple-600 text-white font-semibold shadow-lg'
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={createPageUrl(item.page)}
                    onClick={closeSidebarOnMobile}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl',
                      'text-sm font-semibold transition-all group',
                      currentPageName === item.page
                        ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    )}
                  >
                    <div className={cn(
                      'p-1.5 rounded-lg transition-all',
                      currentPageName === item.page
                        ? 'bg-white/20'
                        : 'bg-slate-700/50 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-purple-500'
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span>{item.name}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

        </div>
      </aside>

      {/* Main Content — shifts right only on desktop when sidebar is open */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-w-0',
          sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-0'
        )}
      >
        {/* Top Header */}
        <header className="h-[60px] md:h-[70px] bg-gradient-to-r from-primary to-purple-600 border-b border-primary flex items-center justify-between px-4 md:px-6 shadow-lg flex-shrink-0 z-20">

          {/* Hamburger / toggle — always visible, always on the left, never overlapped */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all flex-shrink-0 z-10"
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-6 h-6 text-white hidden lg:block" />
            ) : null}
            <Menu className={cn('w-6 h-6 text-white', sidebarOpen && 'lg:hidden')} />
          </button>

          {/* Centre logo — only shown on mobile since sidebar logo is hidden */}
          <div className="flex lg:hidden items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Logo className="w-10 h-10" logoUrl={companyProfile?.logo_url} />
            <span className="text-white font-bold text-base">GOGET</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {!isClient && <GlobalSearch />}
            {user && !isClient && <NotificationBell />}
            {!isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-3 md:px-6 py-2 md:py-2.5 bg-white text-primary font-bold rounded-xl hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5 md:gap-2 text-sm">
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">New</span>
                    <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  {quickCreateOptions.map((option) => (
                    <DropdownMenuItem key={option.page} asChild>
                      <Link
                        to={createPageUrl(option.page)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
                      >
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-purple-600">
                          <option.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-slate-700">{option.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-white/40 hover:ring-white transition-all flex-shrink-0" aria-label="Account menu">
                    <Avatar className="h-9 w-9 md:h-10 md:w-10">
                      <AvatarFallback className="bg-white/20 text-white font-heading font-semibold">
                        {userInitials || <User className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel className="px-2 py-2">
                    <p className="font-heading font-semibold text-slate-800 truncate">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.role?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isFirmAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Settings')} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span>Company Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {can(user, 'compliance') && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('ComplianceAlerts')} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer">
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                        <span>Compliance</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {can(user, 'team') && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('UserManagement')} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer">
                        <UserPlus className="w-4 h-4 text-slate-500" />
                        <span>Invite User</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
          {children}
        </main>
      </div>
    </div>
  );
}