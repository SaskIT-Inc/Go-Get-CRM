/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from '@/features/reports/pages/Analytics';
import CRAForms from '@/features/settings/pages/CRAForms';
import ClientBilling from '@/features/clients/pages/ClientBilling';
import ClientCompliance from '@/features/clients/pages/ClientCompliance';
import ClientDirectory from '@/features/clients/pages/ClientDirectory';
import ClientDocuments from '@/features/clients/pages/ClientDocuments';
import ClientOnboarding from '@/features/clients/pages/ClientOnboarding';
import ClientPortal from '@/features/clients/pages/ClientPortal';
import ClientProfile from '@/features/clients/pages/ClientProfile';
import ClientReports from '@/features/clients/pages/ClientReports';
import ClientServices from '@/features/clients/pages/ClientServices';
import Clients from '@/features/clients/pages/Clients';
import Commercial from '@/features/marketing/pages/Commercial';
import CommunicationHistory from '@/features/email/pages/CommunicationHistory';
import ConversionTracking from '@/features/leads/pages/ConversionTracking';
import DailyAccountability from '@/features/tasks/pages/DailyAccountability';
import Database from '@/features/settings/pages/Database';
import DatabaseServices from '@/features/settings/pages/DatabaseServices';
import DocumentReports from '@/features/documents/pages/DocumentReports';
import DocumentTypes from '@/features/documents/pages/DocumentTypes';
import Documents from '@/features/documents/pages/Documents';
import EstimateBuilder from '@/features/invoices/pages/EstimateBuilder';
import Estimates from '@/features/invoices/pages/Estimates';
import FinancialReports from '@/features/reports/pages/FinancialReports';
import Invoices from '@/features/invoices/pages/Invoices';
import LeadCapture from '@/features/leads/pages/LeadCapture';
import LeadDirectory from '@/features/leads/pages/LeadDirectory';
import LeadManagement from '@/features/leads/pages/LeadManagement';
import LeadPipeline from '@/features/leads/pages/LeadPipeline';
import LeadReports from '@/features/leads/pages/LeadReports';
import NeedsAssessment from '@/features/leads/pages/NeedsAssessment';
import Processes from '@/features/processes/pages/Processes';
import Reports from '@/features/reports/pages/Reports';
import Retainers from '@/features/invoices/pages/Retainers';
import RevenueIntelligence from '@/features/reports/pages/RevenueIntelligence';
import ServiceCatalog from '@/features/services/pages/ServiceCatalog';
import ServiceReports from '@/features/services/pages/ServiceReports';
import Settings from '@/features/settings/pages/Settings';
import TaskTimeline from '@/features/tasks/pages/TaskTimeline';
import TeamReports from '@/features/reports/pages/TeamReports';
import Vendors from '@/features/settings/pages/Vendors';
import WorkflowTemplates from '@/features/processes/pages/WorkflowTemplates';
import FilingPipeline from '@/features/compliance/pages/FilingPipeline';
import CalendarSync from '@/features/calendar/pages/CalendarSync';
import ManagerDashboard from '@/features/dashboard/pages/ManagerDashboard';
import __Layout from '@/app/Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "CRAForms": CRAForms,
    "ClientBilling": ClientBilling,
    "ClientCompliance": ClientCompliance,
    "ClientDirectory": ClientDirectory,
    "ClientDocuments": ClientDocuments,
    "ClientOnboarding": ClientOnboarding,
    "ClientPortal": ClientPortal,
    "ClientProfile": ClientProfile,
    "ClientReports": ClientReports,
    "ClientServices": ClientServices,
    "Clients": Clients,
    "Commercial": Commercial,
    "CommunicationHistory": CommunicationHistory,
    "ConversionTracking": ConversionTracking,
    "DailyAccountability": DailyAccountability,
    "Database": Database,
    "DatabaseServices": DatabaseServices,
    "DocumentReports": DocumentReports,
    "DocumentTypes": DocumentTypes,
    "Documents": Documents,
    "EstimateBuilder": EstimateBuilder,
    "Estimates": Estimates,
    "FinancialReports": FinancialReports,
    "Invoices": Invoices,
    "LeadCapture": LeadCapture,
    "LeadDirectory": LeadDirectory,
    "LeadManagement": LeadManagement,
    "LeadPipeline": LeadPipeline,
    "LeadReports": LeadReports,
    "NeedsAssessment": NeedsAssessment,
    "Processes": Processes,
    "Reports": Reports,
    "Retainers": Retainers,
    "RevenueIntelligence": RevenueIntelligence,
    "ServiceCatalog": ServiceCatalog,
    "ServiceReports": ServiceReports,
    "Settings": Settings,
    "TaskTimeline": TaskTimeline,
    "TeamReports": TeamReports,
    "Vendors": Vendors,
    "WorkflowTemplates": WorkflowTemplates,
    "FilingPipeline": FilingPipeline,
    "CalendarSync": CalendarSync,
    "ManagerDashboard": ManagerDashboard,
}

export const pagesConfig = {
    mainPage: "Clients",
    Pages: PAGES,
    Layout: __Layout,
};