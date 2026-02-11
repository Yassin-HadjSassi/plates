import React, { useState } from 'react';

function PlateUpload() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError(null);
            uploadImage(file);
        }
    };

    const uploadImage = async (file) => {
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8001/predict', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Prediction failed');
            const data = await response.json();
            if (data.error) {
                setError(data.error);
                return;
            }
            setResult(data);
        } catch (err) {
            setError('Could not connect to detection service.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>Manual Plate Check</h2>
            <div style={{ border: '2px dashed #ccc', padding: '2rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', marginBottom: '1rem' }}>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="upload-input" />
                <label htmlFor="upload-input" style={{ cursor: 'pointer' }}>
                    {preview ? (
                        <div style={{ maxWidth: '100%', maxHeight: '300px', overflow: 'hidden' }}>
                            <img src={result?.crop_image || preview} alt="Preview" style={{ maxWidth: '100%' }} />
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: '2rem' }}>📂</div>
                            <p>Click to upload image</p>
                        </div>
                    )}
                </label>
            </div>

            {loading && <p>Analyzing...</p>}
            {error && <p className="text-danger">{error}</p>}

            {result && (
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                        {result.synthetic_plate && (
                            <img src={result.synthetic_plate} alt="Synthetic" style={{ height: '60px', border: '1px solid #333' }} />
                        )}
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {result.plate_text}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlateUpload;
