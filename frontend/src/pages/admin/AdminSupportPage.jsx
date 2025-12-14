import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, MessageSquare, Mail, Calendar, User, AlertCircle, CheckCircle, XCircle, Clock, Filter, Search, Eye } from 'lucide-react';

const AdminSupportPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = RAW_BASE.replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    loadMessages();
    loadStats();
  }, [token]);

  useEffect(() => {
    applyFilters();
  }, [messages, statusFilter, searchQuery]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBase}/support/messages`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load support messages');
      }
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err.message || 'Failed to load support messages');
      console.error('Error loading support messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${apiBase}/support/stats`, { headers });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...messages];

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(msg => msg.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.name.toLowerCase().includes(query) ||
        msg.email.toLowerCase().includes(query) ||
        msg.subject.toLowerCase().includes(query) ||
        msg.message.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
  };

  const updateStatus = async (messageId, newStatus) => {
    try {
      setUpdating(true);
      const response = await fetch(`${apiBase}/support/messages/${messageId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await loadMessages();
      await loadStats();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, status: newStatus });
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const updateNotes = async (messageId) => {
    try {
      setUpdating(true);
      const response = await fetch(`${apiBase}/support/messages/${messageId}/notes`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notes: adminNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      await loadMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, adminNotes });
      }
      setAdminNotes('');
      alert('Notes updated successfully');
    } catch (err) {
      alert('Failed to update notes: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <AlertCircle className="w-4 h-4" />;
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CLOSED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600 flex-shrink-0" />
            <span className="truncate">Support Messages</span>
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Manage and respond to customer support inquiries
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">In Progress</div>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Resolved</div>
              <div className="text-2xl font-bold text-green-600">{stats.resolved || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 mb-1">Closed</div>
              <div className="text-2xl font-bold text-gray-600">{stats.closed || 0}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center text-gray-500">
            <Loader2 className="w-8 h-8 inline animate-spin mr-2" />
            Loading support messages...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Messages List */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Messages List */}
            <div className="lg:col-span-2 space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No support messages found</p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`bg-white rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
                      selectedMessage?.id === message.id ? 'ring-2 ring-primary-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedMessage(message);
                      setAdminNotes(message.adminNotes || '');
                    }}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                            {message.subject}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                            <User className="w-4 h-4" />
                            <span className="truncate">{message.name}</span>
                            <Mail className="w-4 h-4 ml-2" />
                            <span className="truncate">{message.email}</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(message.status)}`}>
                          {getStatusIcon(message.status)}
                          <span className="ml-1">{message.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{message.message}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Detail Panel */}
            {selectedMessage && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Message Details</h2>
                    <button
                      onClick={() => {
                        setSelectedMessage(null);
                        setAdminNotes('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Subject</label>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{selectedMessage.subject}</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">From</label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-900 flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {selectedMessage.name}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          <a href={`mailto:${selectedMessage.email}`} className="hover:underline">
                            {selectedMessage.email}
                          </a>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Message</label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(selectedMessage.id, status)}
                            disabled={updating || selectedMessage.status === status}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              selectedMessage.status === status
                                ? getStatusColor(status) + ' cursor-default'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } disabled:opacity-50`}
                          >
                            {status.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Admin Notes</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this support request..."
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => updateNotes(selectedMessage.id)}
                        disabled={updating}
                        className="mt-2 w-full px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {updating ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>

                    <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
                      <p>Created: {formatDate(selectedMessage.createdAt)}</p>
                      {selectedMessage.updatedAt && (
                        <p>Updated: {formatDate(selectedMessage.updatedAt)}</p>
                      )}
                      {selectedMessage.resolvedAt && (
                        <p>Resolved: {formatDate(selectedMessage.resolvedAt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportPage;

