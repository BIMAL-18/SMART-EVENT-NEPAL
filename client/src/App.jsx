import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import EventsList from './pages/EventsList.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import About from './pages/About.jsx';

import AttendeeDashboard from './pages/attendee/AttendeeDashboard.jsx';
import Profile from './pages/attendee/Profile.jsx';
import Recommendations from './pages/attendee/Recommendations.jsx';
import MyRegistrations from './pages/attendee/MyRegistrations.jsx';
import MyTickets from './pages/attendee/MyTickets.jsx';
import TicketDetail from './pages/attendee/TicketDetail.jsx';
import Notifications from './pages/attendee/Notifications.jsx';
import Certificates from './pages/attendee/Certificates.jsx';
import Favorites from './pages/attendee/Favorites.jsx';
import Checkout from './pages/attendee/Checkout.jsx';

import OrganizerDashboard from './pages/organizer/OrganizerDashboard.jsx';
import OrganizerEvents from './pages/organizer/OrganizerEvents.jsx';
import CreateEditEvent from './pages/organizer/CreateEditEvent.jsx';
import EventRegistrationsPage from './pages/organizer/EventRegistrations.jsx';
import EventAttendancePage from './pages/organizer/EventAttendance.jsx';
import EventAnalyticsPage from './pages/organizer/EventAnalytics.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminEvents from './pages/admin/AdminEvents.jsx';
import AdminPayments from './pages/admin/AdminPayments.jsx';
import AdminAuditLogs from './pages/admin/AdminAuditLogs.jsx';

import CertificateVerify from './pages/CertificateVerify.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/search" element={<EventsList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/certificates/verify/:code" element={<CertificateVerify />} />

          <Route path="/dashboard" element={<ProtectedRoute roles={['attendee']}><AttendeeDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
          <Route path="/my-registrations" element={<ProtectedRoute><MyRegistrations /></ProtectedRoute>} />
          <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
          <Route path="/my-tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/checkout/:registrationId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />

          <Route path="/organizer/dashboard" element={<ProtectedRoute roles={['organizer', 'admin']}><OrganizerDashboard /></ProtectedRoute>} />
          <Route path="/organizer/events" element={<ProtectedRoute roles={['organizer', 'admin']}><OrganizerEvents /></ProtectedRoute>} />
          <Route path="/organizer/events/create" element={<ProtectedRoute roles={['organizer', 'admin']}><CreateEditEvent /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/edit" element={<ProtectedRoute roles={['organizer', 'admin']}><CreateEditEvent /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/registrations" element={<ProtectedRoute roles={['organizer', 'admin']}><EventRegistrationsPage /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/attendance" element={<ProtectedRoute roles={['organizer', 'admin']}><EventAttendancePage /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/analytics" element={<ProtectedRoute roles={['organizer', 'admin']}><EventAnalyticsPage /></ProtectedRoute>} />
          <Route path="/organizer/profile" element={<ProtectedRoute roles={['organizer', 'admin']}><Profile /></ProtectedRoute>} />

          <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/organizers" element={<ProtectedRoute roles={['admin']}><AdminUsers roleFilter="organizer" /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute roles={['admin']}><AdminEvents /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminEvents /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute roles={['admin']}><AdminPayments /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        SmartEvent Nepal &middot; Academic demo project &middot; Not affiliated with eSewa or Khalti
      </footer>
    </div>
  );
}
