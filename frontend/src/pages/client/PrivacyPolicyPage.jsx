import React from 'react';

const sections = [
  {
    title: 'Information We Collect',
    content:
      'We collect account details (name, email, phone), property preferences, booking history, messages exchanged through the inquiry chat, and payment metadata required by Razorpay. Location permissions are used only when you enable map-based features.',
  },
  {
    title: 'How We Use Your Data',
    content:
      'Data is used to verify users, match buyers and agents, process payments, issue notifications, and maintain booking records. We never sell your personal information to third parties.',
  },
  {
    title: 'Payment & Wallet Security',
    content:
      'All payments are processed through Razorpay with PCI-compliant encryption. ApnaEstate does not store full card numbers or CVV details. Wallet transactions are ledgered for audit purposes.',
  },
  {
    title: 'Data Retention',
    content:
      'Property listings, bookings, and chat logs are retained for legal and support reasons. You may request deletion of your account, after which we anonymize personal identifiers except where retention is required by law.',
  },
  {
    title: 'Your Rights',
    content:
      'You may update profile information, download your data, or request account deletion by contacting support@apnaestate.com. Privacy-related requests are processed within 15 business days.',
  },
];

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow divide-y divide-gray-100">
          {sections.map((section) => (
            <div key={section.title} className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
              <p className="text-gray-600 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-gray-500">
          If you have questions about this policy or how we handle your data, email{' '}
          <span className="text-primary-600 font-medium">privacy@apnaestate.com</span>.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;


