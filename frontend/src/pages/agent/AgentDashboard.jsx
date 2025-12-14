import React from 'react';
import { Briefcase, PlusCircle, ListChecks, CheckSquare } from 'lucide-react';
const AgentDashboard = () => {
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Briefcase className="w-7 h-7 mr-2 text-primary-600"/> Agent Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage your listings and track activity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <PlusCircle className="w-8 h-8 text-primary-600 mb-3"/>
            <h3 className="text-lg font-semibold mb-1">Create Listing</h3>
            <p className="text-gray-600 mb-3">Add a new property with map-based location selection.</p>
            <a href="/add-property" className="btn-primary inline-flex items-center">Add Property</a>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <ListChecks className="w-8 h-8 text-primary-600 mb-3"/>
            <h3 className="text-lg font-semibold mb-1">My Listings</h3>
            <p className="text-gray-600 mb-3">View, manage, or remove your published listings.</p>
            <a href="/my-listings" className="btn-primary">Open My Listings</a>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <CheckSquare className="w-8 h-8 text-primary-600 mb-3"/>
            <h3 className="text-lg font-semibold mb-1">Booking Approvals</h3>
            <p className="text-gray-600 mb-3">Review pending client bookings and approve them after verifying deposits.</p>
            <a href="/booking-approvals" className="btn-primary">Review Bookings</a>
          </div>
        </div>
      </div>
    </div>);
};
export default AgentDashboard;
