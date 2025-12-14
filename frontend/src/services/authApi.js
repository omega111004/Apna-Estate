import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api';
const authApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Add token to requests if available
authApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration - clear auth on 401 (except for login/register endpoints)
authApi.interceptors.response.use(
    (response) => response,
    (error) => {
        // Don't clear auth for login/register endpoints (they may return 401 for invalid credentials)
        const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                               error.config?.url?.includes('/auth/register') ||
                               error.config?.url?.includes('/auth/otp') ||
                               error.config?.url?.includes('/auth/login-otp');
        
        if (error.response?.status === 401 && !isAuthEndpoint) {
            // Token is invalid or expired, clear auth state
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Dispatch custom event to notify AuthContext
            window.dispatchEvent(new Event('auth-cleared'));
        }
        return Promise.reject(error);
    }
);
export const authService = {
    // Login user
    login: async (credentials) => {
        const response = await authApi.post('/auth/login', credentials);
        return response.data;
    },
    // Register user
    register: async (userData) => {
        const response = await authApi.post('/auth/register', userData);
        return response.data;
    },
    // Send OTP to email
    sendOtp: async (email) => {
        const response = await authApi.post('/auth/otp/send', { email });
        return response.data;
    },
    // Login with OTP
    loginWithOtp: async (email, otpCode) => {
        const response = await authApi.post('/auth/login-otp', { email, otpCode });
        return response.data;
    },
    // Get current user
    getCurrentUser: async () => {
        const response = await authApi.get('/users/profile');
        return response.data;
    },
    // Update user profile
    updateProfile: async (userData) => {
        const response = await authApi.put('/users/profile', userData);
        return response.data;
    },
    // Get user favorites
    getFavorites: async () => {
        const response = await authApi.get('/users/favorites');
        return response.data;
    },
    // Add property to favorites
    addToFavorites: async (propertyId) => {
        await authApi.post(`/users/favorites/${propertyId}`);
    },
    // Remove property from favorites
    removeFromFavorites: async (propertyId) => {
        await authApi.delete(`/users/favorites/${propertyId}`);
    },
    // Check if property is favorited
    isFavorited: async (propertyId) => {
        const response = await authApi.get(`/users/favorites/${propertyId}/check`);
        return response.data.isFavorite;
    },
    // Logout (client-side only)
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
};
export default authApi;
