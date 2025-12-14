import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authApi';
const AuthContext = createContext(undefined);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            
            if (storedToken && storedUser) {
                setToken(storedToken);
                try {
                    // Verify token is still valid by fetching current user from backend
                    const currentUser = await authService.getCurrentUser();
                    // If successful, update user state with fresh data from backend
                    const userData = {
                        id: currentUser.id,
                        email: currentUser.email,
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName,
                        role: currentUser.role,
                        createdAt: currentUser.createdAt,
                        updatedAt: currentUser.updatedAt,
                    };
                    setUser(userData);
                    // Update localStorage with fresh user data
                    localStorage.setItem('user', JSON.stringify(userData));
                }
                catch (error) {
                    // Token is invalid or expired, clear auth state
                    console.error('Token validation failed:', error);
                    setUser(null);
                    setToken(null);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };
        initializeAuth();
        
        // Listen for storage changes (e.g., when interceptors clear localStorage)
        const handleStorageChange = (e) => {
            if (e.key === 'token' || e.key === 'user') {
                const newToken = localStorage.getItem('token');
                const newUser = localStorage.getItem('user');
                
                if (!newToken || !newUser) {
                    // Auth was cleared, sync state
                    setUser(null);
                    setToken(null);
                } else if (e.key === 'user' && newUser) {
                    // User data was updated, sync state
                    try {
                        const userData = JSON.parse(newUser);
                        setUser(userData);
                    } catch (error) {
                        console.error('Error parsing updated user data:', error);
                    }
                }
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        // Also listen for custom event for same-tab localStorage changes
        window.addEventListener('auth-cleared', () => {
            setUser(null);
            setToken(null);
        });
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-cleared', () => {});
        };
    }, []);
    // Send OTP to email
    const otpSend = async (email) => {
        try {
            const res = await authService.sendOtp(email);
            return res;
        }
        catch (error) {
            console.error('Send OTP error:', error);
            const status = error.response?.status;
            const data = error.response?.data;
            const serverMessage = typeof data === 'string'
                ? data
                : data?.message || data?.error || null;
            if (status === 400 || status === 404) {
                throw new Error(serverMessage || 'Invalid email or OTP request');
            }
            throw new Error(serverMessage || 'Failed to send OTP. Please try again.');
        }
    };
    // Login with OTP
    const otpLogin = async (email, otpCode) => {
        try {
            const response = await authService.loginWithOtp(email, otpCode);
            setToken(response.token);
            const userData = {
                id: response.id,
                email: response.email,
                firstName: response.firstName,
                lastName: response.lastName,
                role: response.role,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setUser(userData);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(userData));
        }
        catch (error) {
            console.error('OTP login error:', error);
            throw error;
        }
    };
    const login = async (email, password) => {
        try {
            const response = await authService.login({ email, password });
            setToken(response.token);
            const userData = {
                id: response.id,
                email: response.email,
                firstName: response.firstName,
                lastName: response.lastName,
                role: response.role,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setUser(userData);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(userData));
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };
    const register = async (data) => {
        try {
            const response = await authService.register(data);
            setToken(response.token);
            const userData = {
                id: response.id,
                email: response.email,
                firstName: response.firstName,
                lastName: response.lastName,
                role: response.role,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setUser(userData);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(userData));
        }
        catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };
    const logout = () => {
        console.log('Logging out and clearing all auth data');
        setUser(null);
        setToken(null);
        authService.logout();
    };
    // Debug function to check token validity
    const debugToken = () => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        console.log('Current auth state:', {
            hasToken: !!token,
            hasStoredToken: !!storedToken,
            hasUser: !!user,
            hasStoredUser: !!storedUser,
            tokenLength: storedToken?.length,
            isAuthenticated: !!user
        });
        if (storedToken) {
            try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                const now = Date.now() / 1000;
                console.log('Token payload:', {
                    exp: payload.exp,
                    iat: payload.iat,
                    sub: payload.sub,
                    isExpired: payload.exp < now,
                    expiresIn: Math.round(payload.exp - now) + 's'
                });
            }
            catch (e) {
                console.log('Token decode error:', e);
            }
        }
    };
    const value = {
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading,
        otpSend,
        otpLogin,
    };
    return (<AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>);
};
