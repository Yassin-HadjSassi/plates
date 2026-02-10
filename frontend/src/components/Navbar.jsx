import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">Access Control System</div>
            <div className="navbar-menu">
                <span className="user-info">Logged in as: <strong>{user.role}</strong></span>
                <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
            </div>
        </nav>
    );
}

export default Navbar;
