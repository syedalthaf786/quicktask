import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, Sparkles } from 'lucide-react';
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Clear error for this field
        if (errors[e.target.name]) {
            setErrors({
                ...errors,
                [e.target.name]: null
            });
        }
    };

    const validate = () => {
        const newErrors = {};

        if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsLoading(true);

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password
        });

        if (result.success) {
            navigate('/dashboard');
        }

        setIsLoading(false);
    };

    const getPasswordStrength = () => {
        const password = formData.password;
        if (password.length === 0) return null;
        if (password.length < 6) return 'weak';
        if (password.length < 10) return 'medium';
        return 'strong';
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="auth-gradient-1"></div>
                <div className="auth-gradient-2"></div>
                <div className="auth-gradient-3"></div>
            </div>

            <motion.div
                className="auth-card glass"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="auth-header">
                    <div className="auth-icon">
                        <Sparkles size={32} />
                    </div>
                    <h1>Create Account</h1>
                    <p>Join QuickTask and boost your productivity</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label className="input-label">
                            <User size={16} />
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`input ${errors.name ? 'input-error' : ''}`}
                            placeholder="Enter your full name"
                            required
                            autoComplete="name"
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="input-group">
                        <label className="input-label">
                            <Mail size={16} />
                            Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={`input ${errors.email ? 'input-error' : ''}`}
                            placeholder="Enter your email"
                            required
                            autoComplete="email"
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    <div className="input-group">
                        <label className="input-label">
                            <Lock size={16} />
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`input ${errors.password ? 'input-error' : ''}`}
                            placeholder="Create a password"
                            required
                            autoComplete="new-password"
                        />
                        {passwordStrength && (
                            <div className="password-strength">
                                <div className={`strength-bar strength-${passwordStrength}`}>
                                    <div className="strength-fill"></div>
                                </div>
                                <span className={`strength-text strength-${passwordStrength}`}>
                                    {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                                </span>
                            </div>
                        )}
                        {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>

                    <div className="input-group">
                        <label className="input-label">
                            <Lock size={16} />
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                            placeholder="Confirm your password"
                            required
                            autoComplete="new-password"
                        />
                        {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-auth"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                Creating Account...
                            </>
                        ) : (
                            <>
                                <UserPlus size={20} />
                                Create Account
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have an account?{' '}
                        <Link to="/login" className="auth-link">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
