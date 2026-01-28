import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const data = await authService.login(credentials);
            setUser(data.user);
            toast.success('Login successful! Welcome back.');
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed. Please try again.';
            toast.error(message);
            return { success: false, error: message };
        }
    };

    const register = async (userData) => {
        try {
            const data = await authService.register(userData);
            setUser(data.user);
            toast.success('Registration successful! Welcome to QuickTask.');
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed. Please try again.';
            toast.error(message);
            return { success: false, error: message };
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        toast.info('You have been logged out.');
    };

    const value = {
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
