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
import Analytics from './pages/Analytics';
import CRAForms from './pages/CRAForms';
import ClientBilling from './pages/ClientBilling';
import ClientCompliance from './pages/ClientCompliance';
import ClientDirectory from './pages/ClientDirectory';
import ClientDocuments from './pages/ClientDocuments';
import ClientOnboarding from './pages/ClientOnboarding';
import ClientPortal from './pages/ClientPortal';
import ClientProfile from './pages/ClientProfile';
import ClientReports from './pages/ClientReports';
import ClientServices from './pages/ClientServices';
import Clients from './pages/Clients';
import Commercial from './pages/Commercial';
import CommunicationHistory from './pages/CommunicationHistory';
import ConversionTracking from './pages/ConversionTracking';
import DailyAccountability from './pages/DailyAccountability';
import Database from './pages/Database';
import DatabaseServices from './pages/DatabaseServices';
import DocumentReports from './pages/DocumentReports';
import DocumentTypes from './pages/DocumentTypes';
import Documents from './pages/Documents';
import EstimateBuilder from './pages/EstimateBuilder';
import Estimates from './pages/Estimates';
import FinancialReports from './pages/FinancialReports';
import Invoices from './pages/Invoices';
import LeadCapture from './pages/LeadCapture';
import LeadDirectory from './pages/LeadDirectory';
import LeadManagement from './pages/LeadManagement';
import LeadPipeline from './pages/LeadPipeline';
import LeadReports from './pages/LeadReports';
import NeedsAssessment from './pages/NeedsAssessment';
import Processes from './pages/Processes';
import Reports from './pages/Reports';
import Retainers from './pages/Retainers';
import RevenueIntelligence from './pages/RevenueIntelligence';
import ServiceCatalog from './pages/ServiceCatalog';
import ServiceReports from './pages/ServiceReports';
import Settings from './pages/Settings';
import TaskTimeline from './pages/TaskTimeline';
import TeamReports from './pages/TeamReports';
import Vendors from './pages/Vendors';
import WorkflowTemplates from './pages/WorkflowTemplates';
import FilingPipeline from './pages/FilingPipeline';
import CalendarSync from './pages/CalendarSync';
import ManagerDashboard from './pages/ManagerDashboard';
import __Layout from './Layout.jsx';


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