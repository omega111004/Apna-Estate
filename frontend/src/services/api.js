import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api';
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Attach JWT token if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration - clear auth on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token is invalid or expired, clear auth state
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Dispatch custom event to notify AuthContext
            window.dispatchEvent(new Event('auth-cleared'));
        }
        return Promise.reject(error);
    }
);
export const propertyApi = {
    // Get all APPROVED properties (for public listings)
    getAllProperties: async () => {
        // Use the backend endpoint that only returns APPROVED properties so that
        // newly created (PENDING) listings are hidden until an admin approves them.
        const response = await api.get('/properties/approved');
        return response.data;
    },
    // Get property by ID
    getPropertyById: async (id) => {
        const response = await api.get(`/properties/${id}`);
        return response.data;
    },
    // Create new property
    createProperty: async (property) => {
        const response = await api.post('/properties', property);
        return response.data;
    },
    // Update property
    updateProperty: async (id, property) => {
        const response = await api.put(`/properties/${id}`, property);
        return response.data;
    },
    // Delete property
    deleteProperty: async (id) => {
        await api.delete(`/properties/${id}`);
    },
    // Advanced search properties with multiple filters
    searchProperties: async (filters) => {
        const params = new URLSearchParams();
        const keyword = filters.keyword?.trim();
        if (keyword)
            params.append('keyword', keyword);
        if (filters.city)
            params.append('city', filters.city);
        if (filters.state)
            params.append('state', filters.state);
        if (filters.minPrice)
            params.append('minPrice', filters.minPrice.toString());
        if (filters.maxPrice)
            params.append('maxPrice', filters.maxPrice.toString());
        if (filters.minBedrooms)
            params.append('bedrooms', filters.minBedrooms.toString());
        if (filters.minBathrooms)
            params.append('bathrooms', filters.minBathrooms.toString());
        if (filters.propertyType)
            params.append('type', filters.propertyType);
        if (filters.status)
            params.append('status', filters.status);
        const response = await api.get(`/properties/search?${params.toString()}`);
        return response.data;
    },
    // Claim ownership of a property (ADMIN/AGENT only)
    claimOwnership: async (id) => {
        const response = await api.patch(`/properties/${id}/assign-owner`);
        return response.data;
    },
    // Counts
    getTotalCount: async () => {
        const response = await api.get('/properties/count');
        return response.data.total;
    },
    getApprovedCount: async () => {
        const response = await api.get('/properties/approved/count');
        return response.data.approved;
    },
    // Get filter metadata
    getCities: async () => {
        const response = await api.get('/properties/cities');
        return response.data;
    },
    getStates: async () => {
        const response = await api.get('/properties/states');
        return response.data;
    },
    getPriceRange: async () => {
        const response = await api.get('/properties/price-range');
        return response.data;
    },
};
export const userApi = {
    getFavorites: async () => {
        const response = await api.get('/users/favorites');
        return response.data;
    },
    addToFavorites: async (propertyId) => {
        await api.post(`/users/favorites/${propertyId}`);
    },
    removeFromFavorites: async (propertyId) => {
        await api.delete(`/users/favorites/${propertyId}`);
    },
    checkIfFavorite: async (propertyId) => {
        const response = await api.get(`/users/favorites/${propertyId}/check`);
        return response.data.isFavorite;
    },
    getUserStats: async () => {
        const response = await api.get('/users/stats');
        return response.data;
    }
};
export default api;
