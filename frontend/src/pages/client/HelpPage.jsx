import React from 'react';
import { HelpCircle, MessageCircle, Phone, Mail } from 'lucide-react';

const faqs = [
  {
    question: 'How do I schedule a property visit?',
    answer:
      'Open the property detail page and click the "Schedule Visit" button. Select a preferred date/time and the agent will confirm your appointment.',
  },
  {
    question: 'Can I negotiate the property price through the platform?',
    answer:
      'Yes. Use the built-in chat on the inquiry detail page to submit offers or counteroffers. Once both parties agree, you can proceed with payments.',
  },
  {
    question: 'How do rental security deposits work?',
    answer:
      'Security deposits are collected through your ApnaEstate wallet before the booking is approved. If the booking is cancelled or rejected, the deposit is automatically refunded.',
  },
  {
    question: 'Why is my payment not going through?',
    answer:
      'Verify that your payment amount is within your gateway limit (₹1,00,000 for test mode) and that you are using the latest Razorpay keys. If issues persist, reach out to support.',
  },
  {
    question: 'How can I track my booking status?',
    answer:
      'Go to the Booking Approvals or My Bookings page to see the status of each rental. Status badges show whether a booking is pending, approved, rejected, or active.',
  },
];

const HelpPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb  -12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <p className="mt-2 text-gray-600">
            Answers to the most common questions about buying, renting, and managing properties on ApnaEstate.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg divide-y divide-gray-100">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center space-x-3">
              <MessageCircle className="text-blue-600 w-6 h-6" />
              <h3 class    Name="text-lg font-semibold">Live Chat</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Chat with our support AI or request a callback from a human agent directly within the app.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center space-x-3">
              <Phone className="text-green-600 w-6 h-6" />
              <h3 className="text-lg font-semibold">Phone Support</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">Call us at <strong>+91 82082 57079</strong> (Mon–Sat, 9AM–8PM).</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center space-x-3">
              <Mail className="text-purple-600 w-6 h-6" />
              <h3 className="text-lg font-semibold">Email Us</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Send a detailed query to <strong>support@apnaestate.com</strong> and receive a response within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;


