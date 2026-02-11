import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const STABILITY_THRESHOLD = 5; // Require 5 consecutive frames
const DETECTION_INTERVAL = 1000; // 1 second

function CameraFeed({ url, label, direction, onDetection }) {
    const [lastResult, setLastResult] = useState(null);
    const [stablePlate, setStablePlate] = useState(null);
    const [error, setError] = useState(null);
    const stabilityCounter = useRef({ plate: null, count: 0 });

    useEffect(() => {
        if (!url || url === "") return;

        const interval = setInterval(async () => {
            try {
                // Poll for latest result from the sidecar service
                const response = await fetch(`http://localhost:8001/latest_result?url=${encodeURIComponent(url)}`);
                const data = await response.json();

                if (data && data.timestamp > 0) {
                    processDetection(data.plate_text);
                    setLastResult(data);
                }
            } catch (err) {
                // Silent error or set error state if critical
                // console.error("Detection poll error", err);
            }
        }, DETECTION_INTERVAL);

        return () => clearInterval(interval);
    }, [url]);

    const processDetection = async (plateText) => {
        if (!plateText) {
            stabilityCounter.current = { plate: null, count: 0 };
            return;
        }

        if (plateText === stabilityCounter.current.plate) {
            stabilityCounter.current.count += 1;
        } else {
            stabilityCounter.current = { plate: plateText, count: 1 };
        }

        if (stabilityCounter.current.count >= STABILITY_THRESHOLD) {
            // Stable detection!
            if (stablePlate !== plateText) {
                setStablePlate(plateText);
                console.log(`Stable plate detected: ${plateText} for ${direction}`);

                // Notify Parent
                if (onDetection) onDetection(plateText, direction);

                // Send to Backend
                try {
                    await api.post('/input/camera', {
                        plateNumber: plateText,
                        direction: direction
                    });
                } catch (e) {
                    console.error("Failed to send camera input to backend", e);
                }
            }
        }
    };

    return (
        <div className="card" style={{ padding: '0.5rem', background: '#000', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{label} ({direction})</strong>
                {stablePlate && <span className="badge bg-success">{stablePlate}</span>}
            </div>

            <div style={{ position: 'relative', minHeight: '200px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                {url ? (
                    <img
                        src={`http://localhost:8001/video_feed?url=${encodeURIComponent(url)}`}
                        alt={label}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                        onError={() => setError("Stream offline")}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#666' }}>
                        No Signal
                    </div>
                )}

                {/* Overlay latest result if available */}
                {lastResult && lastResult.plate_text && (
                    <div style={{
                        position: 'absolute', bottom: 10, left: 10,
                        background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px',
                        fontSize: '0.9em'
                    }}>
                        Last: {lastResult.plate_text}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CameraFeed;
