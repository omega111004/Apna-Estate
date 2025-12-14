import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, IndianRupee, Home } from 'lucide-react';
import PropertyCard from '../../components/PropertyCard';
import { propertyApi } from '../../services/api';
import { PropertyStatus } from '../../types/Property';
import { useAuth } from '../../contexts/AuthContext';
import heroImage from '../../assets/ApnaEstate.jpg';
const HomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalProperties: 0,
        citiesCovered: 0,
        customerSatisfaction: 98
    });
    useEffect(() => {
        fetchProperties();
        fetchStats();
    }, []);
    const fetchProperties = async () => {
        try {
            setLoading(true);
            const data = await propertyApi.getAllProperties();
            setProperties(data);
        }
        catch (error) {
            console.error('Error fetching properties:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const fetchStats = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${API_BASE_URL}/analytics/public/homepage-stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        }
        catch (error) {
            console.error('Error fetching stats:', error);
        }
    };
    const featuredProperties = properties.slice(0, 6);
    const formatStatValue = (value) => {
        const formatted = value.toLocaleString();
        return value >= 50 ? `${formatted}+` : formatted;
    };
    return (<div className="min-h-screen bg-gray-50">
      {/* Hero Section (without search bar) */}
      <div className="relative text-white py-20 bg-center bg-cover" style={{
            backgroundImage: `url(${heroImage})`,
        }}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl md:text-6xl font-bold mb-6">
            Find Your Dream Home
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
            Discover the perfect property that matches your lifestyle and budget
          </motion.p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="text-primary-600 w-8 h-8"/>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatStatValue(stats.totalProperties)}</h3>
              <p className="text-gray-600">Properties Listed</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-primary-600 w-8 h-8"/>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatStatValue(stats.citiesCovered)}</h3>
              <p className="text-gray-600">Cities Covered</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IndianRupee className="text-primary-600 w-8 h-8"/>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">{stats.customerSatisfaction}%</h3>
              <p className="text-gray-600">Customer Satisfaction</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Featured Properties */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-3xl font-bold text-gray-900 mb-4">
              Featured Properties
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our handpicked selection of premium properties
            </motion.p>
          </div>

          {loading ? (<div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>) : (<motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (<PropertyCard key={property.id} property={property} onClick={() => navigate(`/properties/${property.id}`)}/>))}
            </motion.div>)}

          <div className="text-center mt-12">
            <button onClick={() => navigate('/properties')} className="btn-primary inline-flex items-center">
              View All Properties
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>);
};
export default HomePage;
