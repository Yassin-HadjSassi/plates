import React from 'react';

function DataView({ activeTab, onTabChange, data, loading, readOnly, onDelete, onEdit }) {
    return (
        <div className="card">
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                <button
                    className={`btn ${activeTab === 'inside' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ marginRight: '0.5rem' }}
                    onClick={() => onTabChange('inside')}
                >
                    Vehicles Inside
                </button>
                <button
                    className={`btn ${activeTab === 'tracking' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ marginRight: '0.5rem' }}
                    onClick={() => onTabChange('tracking')}
                >
                    Tracking History
                </button>
                <button
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ marginRight: '0.5rem' }}
                    onClick={() => onTabChange('users')}
                >
                    Users
                </button>
                <button
                    className={`btn ${activeTab === 'plates' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => onTabChange('plates')}
                >
                    Plates
                </button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            {(activeTab === 'tracking' || activeTab === 'inside') && (
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Plate</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                </tr>
                            )}
                            {activeTab === 'users' && (
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Plates</th>
                                    {!readOnly && <th>Actions</th>}
                                </tr>
                            )}
                            {activeTab === 'plates' && (
                                <tr>
                                    <th>Plate Number</th>
                                    <th>Vehicle</th>
                                    <th>Registered</th>
                                    <th>Assigned Users</th>
                                    {!readOnly && <th>Actions</th>}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr><td colSpan="5">No data found.</td></tr>
                            ) : data.map((item, index) => (
                                <tr key={index}>
                                    {(activeTab === 'tracking' || activeTab === 'inside') && (
                                        <>
                                            <td>{new Date(item.timestamp).toLocaleString()}</td>
                                            <td>{item.user ? item.user.name : 'Unknown/Guest'}</td>
                                            <td>{item.plate ? item.plate.plateNumber : 'N/A'}</td>
                                            <td><span className="status-badge" style={{ backgroundColor: '#6c757d', color: 'white' }}>{item.action}</span></td>
                                            <td>Inside/Processed</td>
                                        </>
                                    )}
                                    {activeTab === 'users' && (
                                        <>
                                            <td>{item.id}</td>
                                            <td>{item.name}</td>
                                            <td>{item.type}</td>
                                            <td>{item.plates && item.plates.map(p => p.plateNumber).join(', ')}</td>
                                            {!readOnly && (
                                                <td>
                                                    <button className="btn btn-primary" style={{ marginRight: '0.5rem' }} onClick={() => onEdit(item)}>Edit</button>
                                                    <button className="btn btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
                                                </td>
                                            )}
                                        </>
                                    )}
                                    {activeTab === 'plates' && (
                                        <>
                                            <td>{item.plateNumber}</td>
                                            <td>{item.vehicleInfo}</td>
                                            <td>{item.registered ? 'Yes' : 'No'}</td>
                                            <td>{item.users && item.users.map(u => u.name).join(', ')}</td>
                                            {!readOnly && (
                                                <td>
                                                    <button className="btn btn-primary" style={{ marginRight: '0.5rem' }} onClick={() => onEdit(item)}>Edit</button>
                                                    <button className="btn btn-danger" onClick={() => onDelete(item.plateNumber)}>Delete</button>
                                                </td>
                                            )}
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default DataView;
