import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../services/api';
import PropertyCard from '../../components/PropertyCard';
const FavoritesPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (isAuthenticated) {
            fetchFavorites();
        }
        else {
            setLoading(false);
        }
    }, [isAuthenticated]);
    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const data = await userApi.getFavorites();
            setFavorites(data);
        }
        catch (error) {
            console.error('Error fetching favorites:', error);
            setFavorites([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePropertyClick = (propertyId) => {
        navigate(`/properties/${propertyId}`);
    };
    const handleFavoriteChange = (propertyId, isFavorite) => {
        if (!isFavorite) {
            setFavorites(prev => prev.filter(property => property.id !== propertyId));
        }
    };
    if (!isAuthenticated) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view your favorites</h2>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Go to Login
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Heart className="w-8 h-8 text-red-500"/>
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            </div>
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${favorites.length} saved ${favorites.length === 1 ? 'property' : 'properties'}`}
            </p>
          </div>

          {/* Loading State */}
          {loading && (<div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>)}

          {/* Empty State */}
          {!loading && favorites.length === 0 && (<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center py-16">
              <div className="bg-white rounded-xl shadow-card p-12">
                <Heart className="w-20 h-20 text-gray-300 mx-auto mb-6"/>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No favorites yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Start exploring properties and save your favorites by clicking the heart icon on any property card.
                </p>
                <button onClick={() => navigate('/properties')} className="btn-primary">
                  Browse Properties
                </button>
              </div>
            </motion.div>)}

          {/* Favorites Grid */}
          {!loading && favorites.length > 0 && (<motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {favorites.map((property) => (<motion.div key={property.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} className="relative group">
                    {/* Property Card */}
                    <PropertyCard property={property} onClick={() => property.id && handlePropertyClick(property.id)} onFavoriteChange={(propertyId, favorite) => propertyId && handleFavoriteChange(propertyId, favorite)}/>
                  </motion.div>))}
              </AnimatePresence>
            </motion.div>)}
        </motion.div>
      </div>
    </div>);
};
export default FavoritesPage;
