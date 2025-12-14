import React from 'react';

const clauses = [
  {
    title: 'Account Responsibilities',
    details:
      'You agree to provide accurate information when creating an account, safeguard your login credentials, and refrain from misrepresenting property ownership or tenancy status.',
  },
  {
    title: 'Listing & Booking Rules',
    details:
      'Agents must only list properties they are authorized to manage. Tenants must complete payments (including security deposits) within the specified windows to confirm a booking.',
  },
  {
    title: 'Payments & Refunds',
    details:
      'All payments use Razorpay. Refunds for cancelled or rejected bookings are processed back to your original payment method or wallet within 7–10 business days.',
  },
  {
    title: 'Content Guidelines',
    details:
      'Uploaded property descriptions and images must be accurate, lawful, and free from offensive or discriminatory language. ApnaEstate reserves the right to remove violating content.',
  },
  {
    title: 'Limitation of Liability',
    details:
      'ApnaEstate provides a marketplace platform. We are not parties to rental or sale agreements and are not liable for disputes between buyers, tenants, and property owners.',
  },
];

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px  -4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-gray-600">
            Please read these terms carefully before using ApnaEstate’s services.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow divide-y divide-gray-100">
          {clauses.map((clause) => (
            <div key={clause.title} className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{clause.title}</h2>
              <p className="text-gray-600 leading-relaxed">{clause.details}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-gray-500">
          By continuing to use ApnaEstate, you acknowledge that you have read and agree to these terms. For questions,
          contact <span className="text-primary-600 font-medium">legal@apnaestate.com</span>.
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;


