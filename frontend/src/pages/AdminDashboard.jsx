import { useState, useEffect } from 'react';
import api from '../api';
import CameraFeed from '../components/CameraFeed';
import PlateUpload from '../components/PlateUpload';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users');
    const [data, setData] = useState([]);
    const [users, setUsers] = useState([]);
    const [cars, setCars] = useState([]);
    const [config, setConfig] = useState(null);
    const [logs, setLogs] = useState([]);
    const [carStatus, setCarStatus] = useState([]);

    // Editing State
    const [isIdModalOpen, setIsIdModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchData();
        // Background Dictionary Data
        fetchUsers();
        fetchCars();
        if (activeTab === 'config' || activeTab === 'live') fetchConfig();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'car-status') fetchCarStatus();
    }, [activeTab]);

    const fetchData = async () => {
        if (['config', 'logs', 'car-status', 'live'].includes(activeTab)) return;
        try {
            const response = await api.get(`/admin/${activeTab}`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const fetchUsers = async () => { try { const res = await api.get('/admin/users'); setUsers(res.data); } catch (e) { } };
    const fetchCars = async () => { try { const res = await api.get('/admin/cars'); setCars(res.data); } catch (e) { } };
    const fetchConfig = async () => { try { const res = await api.get('/admin/config'); setConfig(res.data); } catch (e) { } };
    const fetchLogs = async () => { try { const res = await api.get('/admin/logs'); setLogs(res.data); } catch (e) { } };
    const fetchCarStatus = async () => { try { const res = await api.get('/admin/car-status'); setCarStatus(res.data); } catch (e) { } };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await api.delete(`/admin/${activeTab}/${id}`);
            fetchData();
        } catch (error) { console.error('Delete failed:', error); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'config') {
                await api.post('/admin/config', formData);
                fetchConfig();
                alert('Config saved');
                return;
            }

            const payload = { ...formData };
            if (activeTab === 'users' && payload.selectedCars) {
                payload.cars = payload.selectedCars.map(plate => ({ plateNumber: plate }));
                delete payload.selectedCars;
            }

            await api.post(`/admin/${activeTab}`, payload);
            fetchData();
            closeModal();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Save failed');
        }
    };

    const openModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            if (activeTab === 'users') {
                setFormData({ ...item, selectedCars: item.cars ? item.cars.map(c => c.plateNumber) : [] });
            } else {
                setFormData({ ...item });
            }
        } else {
            setFormData(activeTab === 'users' ? { role: 'EMPLOYEE', selectedCars: [] } : { plateType: 'COMPANY' });
        }
        setIsIdModalOpen(true);
    };

    const closeModal = () => {
        setIsIdModalOpen(false);
        setEditingItem(null);
        setFormData({});
    };

    const handleCheck = (listName, val) => {
        const current = formData[listName] || [];
        if (current.includes(val)) {
            setFormData({ ...formData, [listName]: current.filter(x => x !== val) });
        } else {
            setFormData({ ...formData, [listName]: [...current, val] });
        }
    };

    return (
        <div>
            <h1>Admin Dashboard</h1>

            {/* Tabs */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('users')}>Users</button>
                <button className={`btn ${activeTab === 'cars' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('cars')}>Cars</button>
                <button className={`btn ${activeTab === 'live' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('live')}>Live & AI</button>
                <button className={`btn ${activeTab === 'car-status' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('car-status')}>Company Cars Status</button>
                <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('logs')}>Tracking Activity</button>
                <button className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('config')}>System Config</button>
            </div>

            {/* Content Logic */}
            {activeTab === 'live' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="card">
                        <h3>Live Cameras</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <CameraFeed url={config?.enterCameraUrl} label="Entrance Camera" direction="ENTER" />
                            <CameraFeed url={config?.exitCameraUrl} label="Exit Camera" direction="EXIT" />
                        </div>
                    </div>
                    <div>
                        <PlateUpload />
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="card" style={{ maxWidth: '400px' }}>
                    <h2>System Configuration</h2>
                    {config && (
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>QR Wait Timeout (seconds)</label>
                                <input type="number" value={formData.qrTimeoutSeconds ?? config.qrTimeoutSeconds} onChange={e => setFormData({ ...formData, qrTimeoutSeconds: e.target.value })} style={{ width: '100%', padding: '0.5rem' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Auto Close Delay (seconds)</label>
                                <input type="number" value={formData.autoCloseDelaySeconds ?? config.autoCloseDelaySeconds} onChange={e => setFormData({ ...formData, autoCloseDelaySeconds: e.target.value })} style={{ width: '100%', padding: '0.5rem' }} />
                            </div>

                            <h4>Camera Settings</h4>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Enter Camera URL (e.g. 0 or rtsp://...)</label>
                                <input type="text" value={formData.enterCameraUrl ?? config.enterCameraUrl ?? ""} onChange={e => setFormData({ ...formData, enterCameraUrl: e.target.value })} style={{ width: '100%', padding: '0.5rem' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Exit Camera URL</label>
                                <input type="text" value={formData.exitCameraUrl ?? config.exitCameraUrl ?? ""} onChange={e => setFormData({ ...formData, exitCameraUrl: e.target.value })} style={{ width: '100%', padding: '0.5rem' }} />
                            </div>

                            <button type="submit" className="btn btn-success">Save Config</button>
                        </form>
                    )}
                </div>
            )}

            {activeTab === 'logs' && (
                <div>
                    <h2>Tracking Activity</h2>
                    <table className="table">
                        <thead><tr><th>Time</th><th>Action</th><th>Car</th><th>User</th></tr></thead>
                        <tbody>
                            {logs.slice().reverse().map(log => (
                                <tr key={log.id}>
                                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                                    <td><span className={`status-badge`}>{log.action}</span></td>
                                    <td>{log.car?.plateNumber || '-'}</td>
                                    <td>{log.user?.name || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'car-status' && (
                <div>
                    <h2>Company Cars Status</h2>
                    <table className="table">
                        <thead><tr><th>Plate Number</th><th>Model</th><th>Status</th></tr></thead>
                        <tbody>
                            {carStatus.map(item => (
                                <tr key={item.car.plateNumber}>
                                    <td><strong>{item.car.plateNumber}</strong></td>
                                    <td>{item.car.model}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold',
                                            backgroundColor: item.status === 'INSIDE' ? '#d4edda' : '#f8d7da',
                                            color: item.status === 'INSIDE' ? '#155724' : '#721c24'
                                        }}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(activeTab === 'users' || activeTab === 'cars') && (
                <div>
                    <button className="btn btn-success" onClick={() => openModal()} style={{ marginBottom: '1rem' }}>+ Add New</button>
                    <table className="table">
                        <thead>
                            <tr>
                                {activeTab === 'users' ? (<><th>ID</th><th>Name</th><th>Role</th><th>Cars</th></>) : (<><th>Plate</th><th>Type</th><th>Model</th><th>Color</th></>)}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(item => (
                                <tr key={item.id || item.plateNumber}>
                                    {activeTab === 'users' ? (
                                        <><td>{item.id}</td><td>{item.name}</td><td>{item.role}</td><td>{item.cars?.map(c => c.plateNumber).join(', ')}</td></>
                                    ) : (
                                        <><td>{item.plateNumber}</td><td>{item.plateType}</td><td>{item.model}</td><td>{item.color}</td></>
                                    )}
                                    <td>
                                        <button className="btn btn-warning" style={{ marginRight: '0.5rem' }} onClick={() => openModal(item)}>Edit</button>
                                        <button className="btn btn-danger" onClick={() => handleDelete(item.id || item.plateNumber)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isIdModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2>{editingItem ? 'Edit' : 'Create'} {activeTab === 'users' ? 'User' : 'Car'}</h2>
                        <form onSubmit={handleSave}>
                            {activeTab === 'users' ? (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Name</label>
                                        <input type="text" style={{ width: '100%', padding: '0.5rem' }} value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Role</label>
                                        <input type="text" list="roles" style={{ width: '100%', padding: '0.5rem' }} value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })} required />
                                        <datalist id="roles">
                                            <option value="DIRECTOR" /><option value="EMPLOYEE" /><option value="MECHANIC" /><option value="GUEST" />
                                        </datalist>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Assign Cars</label>
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '0.5rem' }}>
                                            {cars.map(c => (
                                                <div key={c.plateNumber}>
                                                    <label><input type="checkbox" checked={(formData.selectedCars || []).includes(c.plateNumber)} onChange={() => handleCheck('selectedCars', c.plateNumber)} /> {c.plateNumber} ({c.model})</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Plate Number</label>
                                        <input type="text" style={{ width: '100%', padding: '0.5rem' }} value={formData.plateNumber || ''} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} disabled={!!editingItem} required />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Type</label>
                                        <select style={{ width: '100%', padding: '0.5rem' }} value={formData.plateType || ''} onChange={e => setFormData({ ...formData, plateType: e.target.value })} required>
                                            <option value="COMPANY">Company</option><option value="EMPLOYEE">Employee</option><option value="GUEST">Guest</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Model</label>
                                        <input type="text" style={{ width: '100%', padding: '0.5rem' }} value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} required />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Color</label>
                                        <input type="text" style={{ width: '100%', padding: '0.5rem' }} value={formData.color || ''} onChange={e => setFormData({ ...formData, color: e.target.value })} required />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Year</label>
                                        <input type="number" style={{ width: '100%', padding: '0.5rem' }} value={formData.creationYear || ''} onChange={e => setFormData({ ...formData, creationYear: e.target.value })} required />
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Save</button>
                                <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
