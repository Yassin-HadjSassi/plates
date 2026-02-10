import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = (role) => {
        login(role);
        if (role === 'ADMIN') {
            navigate('/admin');
        } else {
            navigate('/guard');
        }
    };

    return (
        <div className="login-page">
            <div className="card login-card">
                <h1>Welcome</h1>
                <p>Select your role to continue</p>

                <div className="role-select">
                    <button
                        onClick={() => handleLogin('GUARD')}
                        className="btn btn-primary"
                    >
                        Guard Login
                    </button>

                    <button
                        onClick={() => handleLogin('ADMIN')}
                        className="btn btn-secondary"
                    >
                        Admin Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;
