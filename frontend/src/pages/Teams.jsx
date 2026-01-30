import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teamService } from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import {
    Plus,
    Users,
    Settings,
    Trash2,
    Search,
    X,
    Crown,
    UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Teams.css';

const Teams = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [inviteData, setInviteData] = useState({
        email: '',
        role: 'MEMBER'
    });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const data = await teamService.getMyTeams();
            setTeams(data.teams);
        } catch (error) {
            toast.error('Failed to fetch teams');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await teamService.createTeam(formData);
            toast.success('Team created successfully');
            closeModal();
            fetchTeams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create team');
        }
    };

    const handleDeleteTeam = async (teamId) => {
        if (!window.confirm('Are you sure you want to delete this team? All tasks will be deleted.')) return;

        try {
            await teamService.deleteTeam(teamId);
            toast.success('Team deleted successfully');
            fetchTeams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete team');
        }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault();

        try {
            await teamService.addMember(selectedTeam.id, inviteData.email, inviteData.role);
            toast.success('Member added successfully');
            setShowInviteModal(false);
            setInviteData({ email: '', role: 'MEMBER' });
            fetchTeams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    };

    const openModal = () => {
        setFormData({ name: '', description: '' });
        setShowModal(true);
    };

    const openInviteModal = (team) => {
        setSelectedTeam(team);
        setInviteData({ email: '', role: 'MEMBER' });
        setShowInviteModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData({ name: '', description: '' });
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'OWNER':
                return <span className="role-badge owner"><Crown size={12} /> Owner</span>;
            case 'ADMIN':
                return <span className="role-badge admin">Admin</span>;
            default:
                return <span className="role-badge member">Member</span>;
        }
    };

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container">
            <Navbar />
            <div className="page-content">
                <div className="teams-header">
                    <div>
                        <h1 className="page-title">My Teams</h1>
                        <p className="page-subtitle">Manage your teams and collaborate with others</p>
                    </div>
                    <button className="btn btn-primary" onClick={openModal}>
                        <Plus size={20} />
                        Create Team
                    </button>
                </div>

                <div className="teams-search">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Loading teams...</p>
                    </div>
                ) : filteredTeams.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <h3>No teams found</h3>
                        <p>Create your first team to start collaborating!</p>
                        <button className="btn btn-primary" onClick={openModal}>
                            <Plus size={20} />
                            Create Team
                        </button>
                    </div>
                ) : (
                    <div className="teams-grid">
                        {filteredTeams.map((team) => {
                            const userMembership = team.members.find(m => m.userId === user?.id);
                            const userRole = userMembership?.role || 'MEMBER';
                            const isOwner = team.ownerId === user?.id;

                            return (
                                <motion.div
                                    key={team.id}
                                    className="team-card card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className="team-card-header">
                                        <div className="team-info">
                                            <h3 className="team-name">{team.name}</h3>
                                            {team.description && (
                                                <p className="team-description">{team.description}</p>
                                            )}
                                        </div>
                                        <div className="team-actions">
                                            {isOwner && (
                                                <button
                                                    className="team-action-btn"
                                                    onClick={() => handleDeleteTeam(team.id)}
                                                    title="Delete Team"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="team-stats">
                                        <div className="team-stat">
                                            <Users size={16} />
                                            <span>{team._count?.members || team.members?.length || 0} members</span>
                                        </div>
                                        <div className="team-stat">
                                            <span className="stat-count">{team._count?.tasks || 0}</span>
                                            <span>tasks</span>
                                        </div>
                                    </div>

                                    <div className="team-members-preview">
                                        <div className="members-avatars">
                                            {team.members?.slice(0, 5).map((member, index) => (
                                                <div
                                                    key={member.id}
                                                    className="member-avatar"
                                                    style={{ zIndex: 5 - index }}
                                                    title={member.user.name}
                                                >
                                                    {member.user.name.charAt(0).toUpperCase()}
                                                </div>
                                            ))}
                                            {team.members?.length > 5 && (
                                                <div className="member-avatar more">
                                                    +{team.members.length - 5}
                                                </div>
                                            )}
                                        </div>
                                        <div className="your-role">
                                            {getRoleBadge(userRole)}
                                        </div>
                                    </div>

                                    <div className="team-card-actions">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => openInviteModal(team)}
                                        >
                                            <UserPlus size={16} />
                                            Invite
                                        </button>
                                        <Link to={`/teams/${team.id}`} className="btn btn-primary">
                                            <Users size={16} />
                                            View Team
                                        </Link>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Create Team Modal */}
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                        >
                            <motion.div
                                className="modal"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <h2>Create New Team</h2>
                                    <button className="modal-close" onClick={closeModal}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="modal-form">
                                    <div className="input-group">
                                        <label className="input-label">Team Name *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="Enter team name"
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Description</label>
                                        <textarea
                                            className="input"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Add team description (optional)"
                                            rows="3"
                                        />
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-outline" onClick={closeModal}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Create Team
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Invite Member Modal */}
                <AnimatePresence>
                    {showInviteModal && selectedTeam && (
                        <motion.div
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowInviteModal(false)}
                        >
                            <motion.div
                                className="modal"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <h2>Invite Team Member</h2>
                                    <button className="modal-close" onClick={() => setShowInviteModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleInviteMember} className="modal-form">
                                    <p className="modal-subtitle">
                                        Inviting to: <strong>{selectedTeam.name}</strong>
                                    </p>

                                    <div className="input-group">
                                        <label className="input-label">Email Address *</label>
                                        <input
                                            type="email"
                                            className="input"
                                            value={inviteData.email}
                                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                            required
                                            placeholder="colleague@example.com"
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Role</label>
                                        <select
                                            className="input select"
                                            value={inviteData.role}
                                            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                                        >
                                            <option value="MEMBER">Member</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-outline" onClick={() => setShowInviteModal(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Send Invite
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Teams;
