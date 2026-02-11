import { useState, useEffect } from 'react';
import api from '../api';
import CameraFeed from '../components/CameraFeed';

function GuardDashboard() {
    const [pendingPlates, setPendingPlates] = useState({});
    const [barrierStatus, setBarrierStatus] = useState(false);
    const [logs, setLogs] = useState([]);
    const [carStatus, setCarStatus] = useState([]);
    const [config, setConfig] = useState(null);

    const fetchPending = async () => { try { const res = await api.get('/guard/pending'); setPendingPlates(res.data); } catch (e) { } };
    const fetchBarrier = async () => { try { const res = await api.get('/guard/barrier'); setBarrierStatus(res.data); } catch (e) { } };
    const fetchLogs = async () => { try { const res = await api.get('/guard/logs'); setLogs(res.data); } catch (e) { } };
    const fetchCarStatus = async () => { try { const res = await api.get('/guard/car-status'); setCarStatus(res.data); } catch (e) { } };
    const fetchConfig = async () => { try { const res = await api.get('/admin/config'); setConfig(res.data); } catch (e) { } };

    useEffect(() => {
        const interval = setInterval(() => {
            fetchPending();
            fetchBarrier();
            fetchLogs();
            fetchCarStatus();
        }, 1000);
        fetchConfig();
        return () => clearInterval(interval);
    }, []);

    const handleOpen = async (plate) => { await api.post(`/guard/open${plate ? `?plate=${plate}` : ''}`); };
    const handleClose = async () => { await api.post('/guard/close'); };
    const handleReject = async (plate) => { await api.post(`/guard/reject?plate=${plate}`); };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <h1 style={{ margin: 0 }}>Guard Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ fontSize: '1.2rem' }}>
                        Barrier: <strong style={{ color: barrierStatus ? 'green' : 'red' }}>{barrierStatus ? 'OPEN' : 'CLOSED'}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-success" onClick={() => handleOpen()}>Force Open</button>
                        <button className="btn btn-danger" onClick={handleClose}>Force Close</button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <CameraFeed url={config?.enterCameraUrl} label="Entrance" direction="ENTER" onDetection={(plate, dir) => console.log("Guard View Detected:", plate, dir)} />
                    <CameraFeed url={config?.exitCameraUrl} label="Exit" direction="EXIT" />
                </div>

                <div>
                    <h2>Pending Detection</h2>
                    {Object.keys(pendingPlates).length === 0 ? <p>No plates detected.</p> : (
                        <div style={{ display: 'grid', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {Object.entries(pendingPlates).map(([plate, details]) => (
                                <div key={plate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: '0' }}>{plate}</h3>
                                        <span className="badge bg-primary">{details.direction || "ENTER"}</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>
                                        Detected: {new Date(details.timestamp).toLocaleTimeString()}
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleOpen(plate)}>Open</button>
                                        <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleReject(plate)}>Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                    <h2>Company Cars Status</h2>
                    <table className="table">
                        <thead><tr><th>Plate</th><th>Status</th></tr></thead>
                        <tbody>
                            {carStatus.map(item => (
                                <tr key={item.car.plateNumber}>
                                    <td><strong>{item.car.plateNumber}</strong></td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.9em', fontWeight: 'bold',
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

                <div>
                    <h2>Recent History</h2>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
                        <table className="table">
                            <thead><tr><th>Time</th><th>Action</th><th>Plate</th></tr></thead>
                            <tbody>
                                {logs.slice().reverse().slice(0, 20).map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                                        <td>{log.action}</td>
                                        <td>{log.car?.plateNumber || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuardDashboard;
