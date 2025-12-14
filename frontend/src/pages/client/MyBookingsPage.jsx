import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Home, Calendar, CreditCard, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const MyBookingsPage = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const base = RAW_BASE.replace(/\/+$/, '');
    const apiBase = base.endsWith('/api') ? base : `${base}/api`;
    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }), [token]);
    const [loading, setLoading] = useState(true);
    const [rentBookings, setRentBookings] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [busy, setBusy] = useState(null);
    const loadBookings = async () => {
        try {
            setLoading(true);
            if (!token) {
                console.log('No token available for bookings');
                return;
            }
            const res = await fetch(`${apiBase}/bookings/my`, { headers });
            if (!res.ok) {
                if (res.status === 401) {
                    console.log('Authentication required for bookings');
                    return;
                }
                if (res.status === 403) {
                    console.log('Not authorized to view bookings');
                    return;
                }
                throw new Error(`Failed to load bookings (${res.status})`);
            }
            const data = await res.json();
            setRentBookings(data.rentBookings || data || []);
        }
        catch (e) {
            console.error('Failed to load bookings:', e);
        }
        finally {
            setLoading(false);
        }
    };
    const loadPendingPayments = async () => {
        try {
            if (!token)
                return;
            const res = await fetch(`${apiBase}/bookings/payments/my`, { headers });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    console.log('Not authorized to view payments');
                    return;
                }
                throw new Error(`Failed to load payments (${res.status})`);
            }
            setPendingPayments(await res.json());
        }
        catch (e) {
            console.error('Failed to load payments:', e);
        }
    };
    const payRent = async (paymentId) => {
        try {
            setBusy(`pay-${paymentId}`);
            const res = await fetch(`${apiBase}/bookings/payments/${paymentId}/pay`, {
                method: 'POST',
                headers
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Payment failed');
            }
            await loadPendingPayments();
            alert('Payment successful!');
        }
        catch (e) {
            alert(e.message || 'Payment failed');
        }
        finally {
            setBusy(null);
        }
    };
    useEffect(() => {
        if (token) {
            loadBookings();
            loadPendingPayments();
        }
        /* eslint-disable-next-line */
    }, [token]);
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Home className="w-7 h-7 mr-2 text-primary-600"/> My Bookings
          </h1>
          <p className="text-gray-600 mt-1">Manage your rent bookings, security deposits, and pay monthly rent on time.</p>
        </div>

        {loading ? (<div className="py-20 text-center text-gray-500">
            <Loader2 className="w-5 h-5 inline animate-spin mr-2"/>Loading...
          </div>) : (<>
            {/* Pending Payments */}
            <div className="bg-white border border-yellow-200 rounded-xl p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2"/> Monthly Rent Payments
                  </h2>
                  <p className="text-sm text-yellow-700 mt-1">
                    Keep your wallet funded so we can auto-confirm rent payments before the due date.
                  </p>
                </div>
                <button onClick={() => navigate('/wallet')} className="inline-flex items-center px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100">
                  <Wallet className="w-4 h-4 mr-2"/> Go to Wallet
                </button>
              </div>
              {pendingPayments.length === 0 ? (<div className="text-center text-gray-500 py-8">
                  You're all caught up! We’ll remind you here when the next rent is due.
                </div>) : (<div className="space-y-3">
                  {pendingPayments.map(payment => (<div key={payment.id} className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.rentBooking?.property?.title || 'Rental'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Due: {new Date(payment.dueDate).toLocaleDateString()} • ₹{payment.amount.toLocaleString()}
                        </div>
                      </div>
                      <button onClick={() => payRent(payment.id)} disabled={busy === `pay-${payment.id}`} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                        {busy === `pay-${payment.id}` ? 'Paying...' : 'Pay Now'}
                      </button>
                    </div>))}
                </div>)}
            </div>

            {/* Rent Bookings */}
            <div className="bg-white rounded-xl shadow-card p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="w-5 h-5 mr-2 text-blue-600"/> Rent Bookings
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Security deposits are collected upfront via your wallet and refunded automatically if the owner cancels the booking.
              </p>
              {rentBookings.length === 0 ? (<div className="text-center text-gray-500 py-8">No rent bookings yet.</div>) : (<div className="space-y-3">
                  {rentBookings.map(booking => (<div key={booking.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{booking.property.title}</div>
                          <div className="text-sm text-gray-600">
                            <Calendar className="w-4 h-4 inline mr-1"/>
                            {new Date(booking.startDate).toLocaleDateString()} - 
                            {booking.endDate ? new Date(booking.endDate).toLocaleDateString() : 'Ongoing'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Monthly Rent: ₹{booking.monthlyRent.toLocaleString()}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        booking.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'}`}>
                          {booking.status}
                        </div>
                      </div>
                      
                    </div>))}
                </div>)}
            </div>

          </>)}
      </div>
    </div>);
};
export default MyBookingsPage;
