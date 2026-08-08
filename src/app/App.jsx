import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from '@/app/pages.config'
import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/app/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Login from '@/features/auth/pages/Login';
import MarketingHome from '@/features/marketing/pages/Home';
import About from '@/features/marketing/pages/About';
import Contact from '@/features/marketing/pages/Contact';
import Privacy from '@/features/marketing/pages/Privacy';
import Terms from '@/features/marketing/pages/Terms';
import UserManagement from '@/features/settings/pages/UserManagement';
import ClientOnboarding from '@/features/clients/pages/ClientOnboarding';
import ManagerDashboard from '@/features/dashboard/pages/ManagerDashboard';
import CalendarSync from '@/features/calendar/pages/CalendarSync';
import Reports from '@/features/reports/pages/Reports';
import EmailSettings from '@/features/email/pages/EmailSettings';
import TaskKanban from '@/features/tasks/pages/TaskKanban';
import EmailDrafts from '@/features/email/pages/EmailDrafts';
import ClientBilling from '@/features/clients/pages/ClientBilling';
import ComplianceAlerts from '@/features/compliance/pages/ComplianceAlerts';
import Analytics from '@/features/reports/pages/Analytics';
import OneDriveSync from '@/features/settings/pages/OneDriveSync';
import ServiceCatalog from '@/features/services/pages/ServiceCatalog';
import SignatureWorkflow from '@/features/signatures/pages/SignatureWorkflow';
import ComplianceTracking from '@/features/compliance/pages/ComplianceTracking';
import RetainerManagement from '@/features/invoices/pages/RetainerManagement';
import ExecutiveAnalytics from '@/features/reports/pages/ExecutiveAnalytics';
import EmailTemplates from '@/features/email/pages/EmailTemplates';
import CentralCalendar from '@/features/calendar/pages/CentralCalendar';
import EmailCommunications from '@/features/email/pages/EmailCommunications';
import Email from '@/features/email/pages/Email';
import Tasks from '@/features/tasks/pages/Tasks';
import MonthlyTaskReports from '@/features/reports/pages/MonthlyTaskReports';
import CommercialHub from '@/features/marketing/pages/CommercialHub';
import TeamTaskDashboard from '@/features/tasks/pages/TeamTaskDashboard';
import SalesAnalytics from '@/features/leads/pages/SalesAnalytics';
import VerifyEmail from '@/features/auth/pages/VerifyEmail';
import AcceptInvite from '@/features/auth/pages/AcceptInvite';
import WhatsNew from '@/features/marketing/pages/WhatsNew';
import Conversations from '@/features/email/pages/Conversations';
import ExploreAI from '@/features/ai/pages/ExploreAI';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const ClientPortalPage = Pages['ClientPortal'];

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, authChecked, checkUserAuth, user } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  // Show loading spinner while checking auth
  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<MarketingHome />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Clients get their own fixed landing page — the staff mainPage ("Clients",
  // a CRM management page) is never appropriate for a client login.
  const isClient = user?.role === 'client';
  const HomePage = isClient ? ClientPortalPage : MainPage;
  const homePageKey = isClient ? 'ClientPortal' : mainPageKey;

  // A client's entire surface is the one ClientPortal page (see Layout.jsx's
  // CLIENT_NAVIGATION — there's nothing else in their nav to link to). The
  // backend already 403s a client on every staff-only entity/module, but
  // without this guard a client who types or bookmarks a staff URL (e.g.
  // /Clients, /Settings) would still get a rendered — just broken and
  // data-less — staff page instead of being sent back to their own portal.
  if (isClient) {
    return (
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName="ClientPortal">
            <ClientPortalPage />
          </LayoutWrapper>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={homePageKey}>
          <HomePage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/UserManagement" element={
        <LayoutWrapper currentPageName="UserManagement">
          <UserManagement />
        </LayoutWrapper>
      } />
      <Route path="/ClientOnboarding" element={
        <LayoutWrapper currentPageName="ClientOnboarding">
          <ClientOnboarding />
        </LayoutWrapper>
      } />
      <Route path="/ManagerDashboard" element={
        <LayoutWrapper currentPageName="ManagerDashboard">
          <ManagerDashboard />
        </LayoutWrapper>
      } />
      <Route path="/CalendarSync" element={
        <LayoutWrapper currentPageName="CalendarSync">
          <CalendarSync />
        </LayoutWrapper>
      } />
      <Route path="/Reports" element={
        <LayoutWrapper currentPageName="Reports">
          <Reports />
        </LayoutWrapper>
      } />
      <Route path="/EmailSettings" element={
        <LayoutWrapper currentPageName="EmailSettings">
          <EmailSettings />
        </LayoutWrapper>
      } />
      <Route path="/TaskKanban" element={
        <LayoutWrapper currentPageName="TaskKanban">
          <TaskKanban />
        </LayoutWrapper>
      } />
      <Route path="/EmailDrafts" element={
        <LayoutWrapper currentPageName="EmailDrafts">
          <EmailDrafts />
        </LayoutWrapper>
      } />
      <Route path="/ClientBilling" element={
        <LayoutWrapper currentPageName="ClientBilling">
          <ClientBilling />
        </LayoutWrapper>
      } />
      <Route path="/ComplianceAlerts" element={
        <LayoutWrapper currentPageName="ComplianceAlerts">
          <ComplianceAlerts />
        </LayoutWrapper>
      } />
      <Route path="/Analytics" element={
        <LayoutWrapper currentPageName="Analytics">
          <Analytics />
        </LayoutWrapper>
      } />
      <Route path="/OneDriveSync" element={
        <LayoutWrapper currentPageName="OneDriveSync">
          <OneDriveSync />
        </LayoutWrapper>
      } />
      <Route path="/ServiceCatalog" element={
        <LayoutWrapper currentPageName="ServiceCatalog">
          <ServiceCatalog />
        </LayoutWrapper>
      } />
      <Route path="/SignatureWorkflow" element={
        <LayoutWrapper currentPageName="SignatureWorkflow">
          <SignatureWorkflow />
        </LayoutWrapper>
      } />
      <Route path="/ComplianceTracking" element={
        <LayoutWrapper currentPageName="ComplianceTracking">
          <ComplianceTracking />
        </LayoutWrapper>
      } />
      <Route path="/RetainerManagement" element={
        <LayoutWrapper currentPageName="RetainerManagement">
          <RetainerManagement />
        </LayoutWrapper>
      } />
      <Route path="/ExecutiveAnalytics" element={
        <LayoutWrapper currentPageName="ExecutiveAnalytics">
          <ExecutiveAnalytics />
        </LayoutWrapper>
      } />
      <Route path="/EmailTemplates" element={
        <LayoutWrapper currentPageName="EmailTemplates">
          <EmailTemplates />
        </LayoutWrapper>
      } />
      <Route path="/CentralCalendar" element={
        <LayoutWrapper currentPageName="CentralCalendar">
          <CentralCalendar />
        </LayoutWrapper>
      } />
      <Route path="/EmailCommunications" element={
        <LayoutWrapper currentPageName="EmailCommunications">
          <EmailCommunications />
        </LayoutWrapper>
      } />
      <Route path="/Email" element={
        <LayoutWrapper currentPageName="Email">
          <Email />
        </LayoutWrapper>
      } />
      <Route path="/Tasks" element={
        <LayoutWrapper currentPageName="Tasks">
          <Tasks />
        </LayoutWrapper>
      } />
      <Route path="/MonthlyTaskReports" element={
        <LayoutWrapper currentPageName="MonthlyTaskReports">
          <MonthlyTaskReports />
        </LayoutWrapper>
      } />
      <Route path="/CommercialHub" element={
        <LayoutWrapper currentPageName="CommercialHub">
          <CommercialHub />
        </LayoutWrapper>
      } />
      <Route path="/TeamTaskDashboard" element={
        <LayoutWrapper currentPageName="TeamTaskDashboard">
          <TeamTaskDashboard />
        </LayoutWrapper>
      } />
      <Route path="/SalesAnalytics" element={
        <LayoutWrapper currentPageName="SalesAnalytics">
          <SalesAnalytics />
        </LayoutWrapper>
      } />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/WhatsNew" element={
        <LayoutWrapper currentPageName="WhatsNew">
          <WhatsNew />
        </LayoutWrapper>
      } />
      <Route path="/Conversations" element={
        <LayoutWrapper currentPageName="Conversations">
          <Conversations />
        </LayoutWrapper>
      } />
      <Route path="/ExploreAI" element={
        <LayoutWrapper currentPageName="ExploreAI">
          <ExploreAI />
        </LayoutWrapper>
      } />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App