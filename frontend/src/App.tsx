import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/public/HomePage';
import EventsPage from './pages/public/EventsPage';
import EventDetailPage from './pages/public/EventDetailPage';
import RegistrationPage from './pages/public/RegistrationPage';
import RegistrationConfirmationPage from './pages/public/RegistrationConfirmationPage';
import CheckoutPage from './pages/public/CheckoutPage';
import PaymentResultPage from './pages/public/PaymentResultPage';
import TicketPage from './pages/public/TicketPage';
import LoginPage from './pages/auth/LoginPage';
import PasswordResetPage from './pages/auth/PasswordResetPage';
import DashboardPage from './pages/admin/DashboardPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import CompanyOperationsPage from './pages/admin/CompanyOperationsPage';
import EventsAdminPage from './pages/admin/EventsAdminPage';
import ConferenceProgramPage from './pages/admin/ConferenceProgramPage';
import ConferenceOperationsPage from './pages/admin/ConferenceOperationsPage';
import RegistrationsPage from './pages/admin/RegistrationsPage';
import RegistrationDetailPage from './pages/admin/RegistrationDetailPage';
import TicketDeliveryPage from './pages/admin/TicketDeliveryPage';
import AttendeesPage from './pages/admin/AttendeesPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import OfflineCollectionsPage from './pages/admin/OfflineCollectionsPage';
import PaymentReviewsPage from './pages/admin/PaymentReviewsPage';
import RefundsPage from './pages/admin/RefundsPage';
import SettlementsPage from './pages/admin/SettlementsPage';
import ReportsPage from './pages/admin/ReportsPage';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SettingsPage from './pages/admin/SettingsPage';
import SystemReadinessPage from './pages/admin/SystemReadinessPage';
import WalkInRegistrationPage from './pages/staff/WalkInRegistrationPage';
import CheckInPage from './pages/staff/CheckInPage';
import CheckInLogPage from './pages/admin/CheckInLogPage';
import RequireStaff from './components/auth/RequireStaff';
export default function App() { return <Routes>
<Route element={<RequireStaff><ConferenceOperationsPage/></RequireStaff>} path="/admin/events/:conferenceSlug/operations"/><Route element={<RequireStaff><CompanyOperationsPage/></RequireStaff>} path="/admin/companies/:companyId/operations"/>
<Route element={<RequireStaff><ConferenceProgramPage/></RequireStaff>} path="/admin/program"/>
<Route element={<RequireStaff><RegistrationDetailPage/></RequireStaff>} path="/admin/registrations/:registrationCode"/>
<Route element={<RequireStaff><TicketDeliveryPage/></RequireStaff>} path="/admin/ticket-delivery"/>
<Route element={<RequireStaff><CheckInLogPage/></RequireStaff>} path="/admin/check-in-log"/>
<Route element={<RequireStaff><SystemReadinessPage/></RequireStaff>} path="/admin/system-readiness"/>
<Route element={<RequireStaff><OfflineCollectionsPage/></RequireStaff>} path="/admin/offline-collections"/>
<Route path="/" element={<HomePage/>}/><Route path="/events" element={<EventsPage/>}/><Route path="/events/:eventId" element={<EventDetailPage/>}/><Route path="/events/:eventId/register" element={<RegistrationPage/>}/><Route path="/registrations/:registrationCode" element={<RegistrationConfirmationPage/>}/><Route path="/checkout/:registrationCode" element={<CheckoutPage/>}/><Route path="/payment/result" element={<PaymentResultPage/>}/><Route path="/tickets/:registrationCode" element={<TicketPage/>}/>
<Route path="/login" element={<LoginPage/>}/><Route path="/password-reset" element={<PasswordResetPage/>}/>
<Route element={<RequireStaff><DashboardPage/></RequireStaff>} path="/admin"/><Route element={<RequireStaff><CompaniesPage/></RequireStaff>} path="/admin/companies"/><Route element={<RequireStaff><EventsAdminPage/></RequireStaff>} path="/admin/events"/><Route element={<RequireStaff><RegistrationsPage/></RequireStaff>} path="/admin/registrations"/><Route element={<RequireStaff><AttendeesPage/></RequireStaff>} path="/admin/attendees"/><Route element={<RequireStaff><PaymentsPage/></RequireStaff>} path="/admin/payments"/><Route element={<RequireStaff><PaymentReviewsPage/></RequireStaff>} path="/admin/payment-reviews"/><Route element={<RequireStaff><RefundsPage/></RequireStaff>} path="/admin/refunds"/><Route element={<RequireStaff><SettlementsPage/></RequireStaff>} path="/admin/settlements"/><Route element={<RequireStaff><ReportsPage/></RequireStaff>} path="/admin/reports"/><Route element={<RequireStaff><UsersPage/></RequireStaff>} path="/admin/users"/><Route element={<RequireStaff><RolesPage/></RequireStaff>} path="/admin/roles"/><Route element={<RequireStaff><AuditLogPage/></RequireStaff>} path="/admin/audit"/><Route element={<RequireStaff><SettingsPage/></RequireStaff>} path="/admin/settings"/>
<Route element={<RequireStaff><WalkInRegistrationPage/></RequireStaff>} path="/staff/walk-in"/><Route element={<RequireStaff><CheckInPage/></RequireStaff>} path="/staff/check-in"/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>; }
