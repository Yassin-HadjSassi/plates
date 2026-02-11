import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [viewMode, setViewMode] = useState('upload'); // 'upload' or 'camera'
  const [cameraUrl, setCameraUrl] = useState('0'); // Default to webcam
  const [isStreaming, setIsStreaming] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [error, setError] = useState(null);

  const imgRef = useRef(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });

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
        setResult(null);
        return;
      }
      setResult(data);
      if (data.crop_image) setPreview(data.crop_image);
      setTimeout(updateScale, 100);
    } catch (err) {
      setError('Could not connect to backend. Make sure it is running on port 8001.');
    } finally {
      setLoading(false);
    }
  };

  // Poll for latest results when in camera mode
  useEffect(() => {
    let interval;
    if (viewMode === 'camera' && isStreaming) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:8001/latest_result');
          const data = await res.json();
          if (data.timestamp > 0) {
            setResult(data);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewMode, isStreaming]);

  const updateScale = () => {
    if (imgRef.current) {
      const { clientWidth, clientHeight, naturalWidth, naturalHeight } = imgRef.current;
      setScale({
        x: clientWidth / naturalWidth,
        y: clientHeight / naturalHeight
      });
    }
  };

  useEffect(() => {
    if (result && preview) {
      const timer = setTimeout(updateScale, 200);
      return () => clearTimeout(timer);
    }
  }, [result, preview]);

  useEffect(() => {
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="app-container">
      <header>
        <h1>ALPR Tunisia</h1>
        <p className="subtitle">High-precision License Plate Recognition System</p>

        <div className="mode-toggle">
          <button
            className={`mode-btn ${viewMode === 'upload' ? 'active' : ''}`}
            onClick={() => { setViewMode('upload'); setIsStreaming(false); setResult(null); }}
          >
            Upload Image
          </button>
          <button
            className={`mode-btn ${viewMode === 'camera' ? 'active' : ''}`}
            onClick={() => setViewMode('camera')}
          >
            Live Camera
          </button>
        </div>
      </header>

      {viewMode === 'upload' ? (
        <div className="glass-card">
          <label className="upload-section">
            <div className="upload-icon">󰄈</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.25rem' }}>
                {image ? image.name : 'Choose an image to analyze'}
              </p>
              <p className="text-muted">Drag and drop or click to upload</p>
            </div>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>
      ) : (
        <div className="glass-card camera-setup">
          <div className="camera-input-group">
            <input
              type="text"
              placeholder="IP Camera URL (e.g. rtsp://... or 0 for webcam)"
              value={cameraUrl}
              onChange={(e) => setCameraUrl(e.target.value)}
              className="camera-input"
            />
            <button
              className={`btn ${isStreaming ? 'btn-danger' : 'btn-success'}`}
              onClick={() => setIsStreaming(!isStreaming)}
            >
              {isStreaming ? 'Stop Stream' : 'Start Stream'}
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Note: "0" usually refers to your default computer webcam.
          </p>
        </div>
      )}

      {(preview || loading || (viewMode === 'camera' && isStreaming)) && (
        <div className="main-content">
          <div className="viewer-pane glass-card">
            {loading && <div className="loader"></div>}

            {viewMode === 'upload' && preview && !loading && (
              <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <img
                  ref={imgRef}
                  src={result?.crop_image || preview}
                  alt="License Plate View"
                  className="main-image"
                  onLoad={updateScale}
                />

                {result && showBoxes && (
                  <div className="overlay-container">
                    {(result.crop_image ? result.crop_boxes : result.orig_boxes || []).map((box, i) => (
                      <div
                        key={i}
                        className="bounding-box"
                        style={{
                          left: `${box.bbox[0] * scale.x}px`,
                          top: `${box.bbox[1] * scale.y}px`,
                          width: `${(box.bbox[2] - box.bbox[0]) * scale.x}px`,
                          height: `${(box.bbox[3] - box.bbox[1]) * scale.y}px`,
                        }}
                      >
                        {showLabels && (
                          <span
                            className="bbox-label"
                            style={{
                              top: i % 2 === 0 ? '-22px' : 'calc(100% + 2px)',
                              left: '0',
                              fontSize: '10px'
                            }}
                          >
                            {box.label} <span style={{ opacity: 0.8, fontSize: '9px' }}>{Math.round(box.confidence * 100)}%</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'camera' && isStreaming && (
              <div className="live-stream-container">
                <img
                  src={`http://localhost:8001/video_feed?url=${encodeURIComponent(cameraUrl)}`}
                  alt="Live Stream"
                  className="main-image"
                  style={{ borderRadius: '0.5rem' }}
                />
                <div className="live-badge">LIVE</div>
              </div>
            )}

            {!preview && !loading && !isStreaming && (
              <div className="empty-state">
                <div style={{ fontSize: '4rem' }}>󰄈</div>
                <p>{viewMode === 'upload' ? 'Upload an image' : 'Start the camera stream'} to see detection results</p>
              </div>
            )}
          </div>

          <div className="results-pane">
            {result?.synthetic_plate && (
              <div className="glass-card" style={{ padding: '0.5rem', overflow: 'hidden' }}>
                <h3 style={{ margin: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Latest Recognition
                </h3>
                <div style={{ background: '#000', borderRadius: '0.3rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img
                    src={result.synthetic_plate}
                    alt="Synthetic Plate"
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              </div>
            )}

            <div className="glass-card">
              <h3 style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Recognition Result
              </h3>
              {result ? (
                <div className="plate-result-container">
                  {result.plate_parts ? (
                    <>
                      <div className="plate-part">{result.plate_parts.left}</div>
                      <div className="plate-part plate-logo">تونس</div>
                      <div className="plate-part">{result.plate_parts.right}</div>
                    </>
                  ) : (
                    <div className="plate-part">{result.plate_text}</div>
                  )}
                </div>
              ) : (
                <div className="plate-result" style={{ opacity: 0.3, fontStyle: 'italic', fontSize: '1.5rem' }}>
                  Awaiting detection...
                </div>
              )}
            </div>

            {viewMode === 'upload' && (
              <div className="glass-card controls">
                <h3 style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Visualization
                </h3>
                <div className="toggle-group">
                  <span>Show Bounding Boxes</span>
                  <label className="switch">
                    <input type="checkbox" checked={showBoxes} onChange={e => setShowBoxes(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-group">
                  <span>Show Labels</span>
                  <label className="switch">
                    <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="glass-card" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
