import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    CheckSquare,
    BarChart3,
    Moon,
    Sun,
    LogOut,
    User,
    Sparkles,
    Users
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    const navLinks = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/tasks', label: 'Tasks', icon: CheckSquare },
        { path: '/teams', label: 'Teams', icon: Users },
        { path: '/analytics', label: 'Analytics', icon: BarChart3 }
    ];

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/dashboard" className="navbar-brand">
                    <div className="brand-icon">
                        <Sparkles size={24} />
                    </div>
                    <span className="brand-text">QuickTask</span>
                </Link>

                <div className="navbar-menu">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path;

                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={20} />
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="navbar-actions">
                    <button
                        className="nav-action-btn"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div className="navbar-user">
                        <div className="user-avatar">
                            <User size={18} />
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user?.name}</span>
                            <span className="user-email">{user?.email}</span>
                        </div>
                    </div>

                    <button
                        className="nav-action-btn logout-btn"
                        onClick={logout}
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
