import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import { useAuth } from './contexts/AuthContext';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
// Client Pages
import HomePage from './pages/client/HomePage';
import PropertiesPage from './pages/client/PropertiesPage';
import PropertyDetailPage from './pages/client/PropertyDetailPage';
import LoginPage from './pages/client/LoginPage';
import RegisterPage from './pages/client/RegisterPage';
import ProfilePage from './pages/client/ProfilePage';
import FavoritesPage from './pages/client/FavoritesPage';
import ClientDashboard from './pages/client/ClientDashboard';
import MyInquiriesPage from './pages/client/MyInquiriesPage';
import InquiryDetailPage from './pages/client/InquiryDetailPage';
import WalletPage from './pages/client/WalletPage';
import MyBookingsPage from './pages/client/MyBookingsPage';
import HelpPage from './pages/client/HelpPage';
import ContactSupportPage from './pages/client/ContactSupportPage';
import PrivacyPolicyPage from './pages/client/PrivacyPolicyPage';
import TermsOfServicePage from './pages/client/TermsOfServicePage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminLocationsPage from './pages/admin/AdminLocationsPage';
import AdminPropertiesApprovalPage from './pages/admin/AdminPropertiesApprovalPage';
import AdminInquiriesPage from './pages/admin/AdminInquiriesPage';
import AdminSupportPage from './pages/admin/AdminSupportPage';

// Agent Pages
import AgentDashboard from './pages/agent/AgentDashboard';
import AddPropertyPage from './pages/agent/AddPropertyPage';
import EditPropertyPage from './pages/agent/EditPropertyPage';
import MyListingsPage from './pages/agent/MyListingsPage';
import ManagePgPage from './pages/agent/ManagePgPage';
import OwnerInquiriesPage from './pages/agent/OwnerInquiriesPage';
import BookingApprovalsPage from './pages/agent/BookingApprovalsPage';

import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    
    return (
      <div className="min-h-screen bg-gray-50">
        <ScrollToTop />
        <Navbar />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="pt-16"
          >
            <Routes location={location}>
            <Route path="/" element={<HomePage />}/>
            <Route path="/properties" element={<PropertiesPage />}/>
            <Route path="/properties/:id" element={<PropertyDetailPage />}/>
            <Route path="/login" element={<LoginPage />}/>
            <Route path="/register" element={<RegisterPage />}/>

            {/* Protected Routes - Require Authentication */}
            <Route path="/add-property" element={<ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <AddPropertyPage />
              </ProtectedRoute>}/>
            <Route path="/edit-property/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <EditPropertyPage />
              </ProtectedRoute>}/>
            <Route path="/my-listings" element={<ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <MyListingsPage />
              </ProtectedRoute>}/>
            <Route path="/properties/:id/manage-pg" element={<ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <ManagePgPage />
              </ProtectedRoute>}/>
            <Route path="/profile" element={<ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>}/>
            <Route path="/favorites" element={<ProtectedRoute allowedRoles={['USER']}>
                <FavoritesPage />
              </ProtectedRoute>}/>

            {/* Property Inquiries */}
            <Route path="/inquiries" element={<ProtectedRoute>
                <MyInquiriesPage />
              </ProtectedRoute>}/>
            <Route path="/inquiries/owner" element={<ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <OwnerInquiriesPage />
              </ProtectedRoute>}/>
            <Route path="/inquiries/:id" element={<ProtectedRoute>
                <InquiryDetailPage />
              </ProtectedRoute>}/>
            <Route path="/admin/inquiries" element={<ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminInquiriesPage />
              </ProtectedRoute>}/>

            {/* Wallet and Bookings */}
            <Route path="/wallet" element={<ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>}/>
            <Route path="/bookings" element={<ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>}/>
            <Route path="/booking-approvals" element={<ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <BookingApprovalsPage />
              </ProtectedRoute>}/>

            {/* Role-Specific Dashboards */}
            <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>}/>
            <Route path="/dashboard/agent" element={<ProtectedRoute allowedRoles={['AGENT']}>
                <AgentDashboard />
              </ProtectedRoute>}/>
            <Route path="/dashboard/client" element={<ProtectedRoute allowedRoles={['USER']}>
                <ClientDashboard />
              </ProtectedRoute>}/>

            {/* Admin-Only Routes */}
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>}/>
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminAnalyticsPage />
              </ProtectedRoute>}/>
            <Route path="/admin/locations" element={<ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLocationsPage />
              </ProtectedRoute>}/>
            <Route path="/admin/properties" element={<ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPropertiesApprovalPage />
              </ProtectedRoute>}/>
            <Route path="/admin/support" element={<ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminSupportPage />
              </ProtectedRoute>}/>
            <Route path="/help" element={<HelpPage />}/>
            <Route path="/contact" element={<ContactSupportPage />}/>
            <Route path="/privacy" element={<PrivacyPolicyPage />}/>
            <Route path="/terms" element={<TermsOfServicePage />}/>
            </Routes>
          </motion.main>
        </AnimatePresence>
        <Footer />
      </div>
    );
}

function App() {
    return (
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    );
}

export default App;
