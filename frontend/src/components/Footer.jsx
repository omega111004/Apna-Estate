import React from 'react';
import { Link } from 'react-router-dom';
import { Building, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const navigation = [
    { label: 'Home', path: '/' },
    { label: 'Properties', path: '/properties' },
    { label: 'Add Property', path: '/add-property' },
    { label: 'Agent Dashboard', path: '/dashboard/agent' },
    { label: 'Admin Dashboard', path: '/dashboard/admin' },
  ];

  const supportLinks = [
    { label: 'FAQs', path: '/help' },
    { label: 'Contact Support', path: '/contact' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ApnaEstate</span>
            </div>
            <p className="text-sm text-gray-400 leading-6">
              Discover, negotiate, and secure your dream property with a modern,
              AI-assisted real-estate platform built for buyers, tenants, and agents.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Explore</h4>
            <ul className="space-y-3 text-sm">
              {navigation.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className="hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-3 text-sm">
              {supportLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className="hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-primary-400 mt-0.5" />
                <span>ApnaEstate HQ, Mumbai, India</span>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-primary-400 mt-0.5" />
                <span>+91 82082 57079</span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="w-4 h-4 text-primary-400 mt-0.5" />
                <span>support@apnaestate.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-center">
          <p className="text-center">© {new Date().getFullYear()} ApnaEstate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


