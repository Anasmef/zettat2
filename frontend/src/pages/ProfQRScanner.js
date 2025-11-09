import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, QrCode, CheckCircle, AlertTriangle, User, Clock, RefreshCw, LogOut, Scan, Home } from 'lucide-react';
import jsQR from 'jsqr';
import Sidebar from '../components/SidebarProf'; // Composant sidebar pour professeu
const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

const ProfesseurScanner = () => {
  const [qrId, setQrId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', details: null });
  const [professeur, setProfesseur] = useState(null);
  const [pointageInfo, setPointageInfo] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    const urlPath = window.location.pathname;
    const qrIdFromUrl = urlPath.split('/scan-qr/')[1];
    if (qrIdFromUrl) setQrId(qrIdFromUrl);
    
    fetchProfesseurInfo();
    return () => stopCamera();
  }, []);

  const fetchProfesseurInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', text: 'Veuillez vous connecter' });
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/professeur/statut-aujourd-hui', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfesseur(data.professeur);
        
        if (data.aPointe) {
          setPointageInfo(data.pointageAujourdhui);
        }
      } else {
        const res2 = await fetch('http://localhost:5000/api/professeur/profile', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (res2.ok) {
          const data2 = await res2.json();
          setProfesseur(data2.professeur || data2);
        }
      }
    } catch (error) {
      console.error('❌ Erreur fetch professeur:', error);
      setMessage({ type: 'error', text: `Erreur réseau: ${error.message}` });
    }
  };

  const scannerQRCode = async (qrIdToScan) => {
    const currentQrId = qrIdToScan || qrId;
    
    if (!currentQrId) {
      setMessage({ type: 'error', text: 'QR Code invalide' });
      return;
    }

    if (!professeur) {
      await fetchProfesseurInfo();
      setTimeout(() => {
        if (professeur) scannerQRCode(currentQrId);
        else setMessage({ type: 'error', text: 'Impossible de récupérer vos informations. Reconnectez-vous.' });
      }, 1000);
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: 'Enregistrement de l\'entrée...' });

    const token = localStorage.getItem('token');
    
    try {
      const url = `http://localhost:5000/api/scan-qr/${currentQrId}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setPointageInfo(data.pointage);
        setQrId(currentQrId);
        stopCamera();
        
        if (navigator.vibrate) navigator.vibrate(200);
        
        setMessage({ 
          type: 'success', 
          text: data.message,
          details: data.pointage
        });
        
        fetchProfesseurInfo();
      } else {
        setMessage({ 
          type: 'error', 
          text: data.message,
          details: data.pointageExistant || null
        });
      }
    } catch (error) {
      console.error('❌ ERREUR SCAN:', error);
      setMessage({ 
        type: 'error', 
        text: `Erreur: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const enregistrerSortie = async () => {
    if (!professeur) {
      setMessage({ type: 'error', text: 'Professeur non identifié' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: 'Enregistrement de la sortie...' });

    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('http://localhost:5000/api/professeur/sortie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setPointageInfo(data.pointage);
        
        if (navigator.vibrate) navigator.vibrate(200);
        
        setMessage({ 
          type: 'success', 
          text: data.message,
          details: data.pointage
        });
        
        fetchProfesseurInfo();
      } else {
        setMessage({ 
          type: 'error', 
          text: data.message
        });
      }
    } catch (error) {
      console.error('❌ ERREUR SORTIE:', error);
      setMessage({ 
        type: 'error', 
        text: `Erreur: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setMessage({ type: '', text: '' });
    setCameraReady(false);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Votre navigateur ne supporte pas l\'accès caméra');
      }

      setShowCamera(true);
      setMessage({ type: '', text: 'Demande d\'accès à la caméra...' });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 }
        }
      });
      
      streamRef.current = stream;
      
      await new Promise((resolve) => {
        const checkVideo = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            videoRef.current.onloadedmetadata = () => {
              setCameraReady(true);
              setMessage({ type: '', text: 'Caméra prête - pointez vers le QR code' });
              resolve();
            };
            
            videoRef.current.onplay = () => {
              setTimeout(() => {
                scanningRef.current = true;
                scanQRFromCamera();
              }, 500);
            };
            
            videoRef.current.play().catch(error => {
              throw new Error('Impossible de démarrer la vidéo');
            });
          } else {
            setTimeout(checkVideo, 100);
          }
        };
        
        setTimeout(checkVideo, 100);
      });
      
    } catch (error) {
      console.error('❌ Erreur caméra:', error);
      let errorMessage = 'Erreur d\'accès à la caméra';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission caméra refusée. Autorisez l\'accès et rechargez.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée sur cet appareil.';
      } else {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
      stopCamera();
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    setCameraReady(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner une image valide' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: 'Analyse de l\'image en cours...' });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            let code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth"
            });
            
            if (code && code.data) {
              let detectedQrId = code.data.trim();
              
              if (detectedQrId.includes('/scan-qr/')) {
                detectedQrId = detectedQrId.split('/scan-qr/')[1];
              }
              if (detectedQrId.includes('?')) {
                detectedQrId = detectedQrId.split('?')[0];
              }
              
              if (detectedQrId) {
                setQrId(detectedQrId);
                await scannerQRCode(detectedQrId);
              } else {
                setMessage({ type: 'error', text: 'QR code détecté mais ID invalide' });
                setLoading(false);
              }
            } else {
              setMessage({ 
                type: 'error', 
                text: 'Aucun QR code détecté. Assurez-vous que l\'image est nette.' 
              });
              setLoading(false);
            }
            
          } catch (error) {
            console.error('❌ Erreur traitement image:', error);
            setMessage({ type: 'error', text: 'Erreur lors du traitement de l\'image' });
            setLoading(false);
          }
        };
        
        img.onerror = () => {
          setMessage({ type: 'error', text: 'Erreur lors du chargement de l\'image' });
          setLoading(false);
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Erreur lors de la lecture du fichier' });
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'upload' });
      setLoading(false);
    }
  };

  const scanQRFromCamera = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(scanQRFromCamera);
      return;
    }
    
    try {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code && code.data) {
        scanningRef.current = false;
        stopCamera();
        
        let qrData = code.data.trim();
        if (qrData.includes('/')) {
          const parts = qrData.split('/');
          qrData = parts[parts.length - 1];
        }
        
        setQrId(qrData);
        scannerQRCode(qrData);
        return;
      }
      
      if (scanningRef.current) {
        requestAnimationFrame(scanQRFromCamera);
      }
      
    } catch (error) {
      if (scanningRef.current) {
        requestAnimationFrame(scanQRFromCamera);
      }
    }
  };

  useEffect(() => {
    if (qrId && professeur && !message.text && !pointageInfo && !showCamera) {
      const timer = setTimeout(() => {
        scannerQRCode();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [qrId, professeur, showCamera]);

  const resetScanner = () => {
    setMessage({ type: '', text: '' });
    setPointageInfo(null);
    setQrId('');
    setLoading(false);
    stopCamera();
    fetchProfesseurInfo();
  };

  const formatTempsPresence = (minutes) => {
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${heures}h ${mins}min`;
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const datetime = getCurrentDateTime();

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease'
  };

  const buttonPrimaryStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    padding: '18px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%'
  };

  const buttonSecondaryStyle = {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%'
  };

  const buttonDangerStyle = {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    padding: '18px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(239, 68, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%'
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #a6dbff 25%, #f3e8ff 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>      <Sidebar onLogout={handleLogout} />

      <div style={{ maxWidth: '480px', margin: '0 auto', ...cardStyle, padding: '32px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: pointageInfo ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            marginBottom: '20px',
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)'
          }}>
            {pointageInfo ? (
              <CheckCircle size={40} style={{ color: 'white' }} />
            ) : (
              <QrCode size={40} style={{ color: 'white' }} />
            )}
          </div>
          
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1a202c',
            marginBottom: '8px'
          }}>
            {pointageInfo ? 'Pointage Enregistré' : 'Scanner QR Code'}
          </h1>
          
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0, fontWeight: '500' }}>
            Système de pointage - Entrée/Sortie
          </p>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Caméra */}
        {showCamera && (
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{
              position: 'relative',
              display: 'inline-block',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
              border: cameraReady ? '3px solid #10b981' : '3px solid #6b7280'
            }}>
              <video
                ref={videoRef}
                style={{ 
                  width: '100%', 
                  maxWidth: '350px', 
                  height: '280px',
                  backgroundColor: '#000',
                  objectFit: 'cover'
                }}
                playsInline
                muted
                autoPlay
              />
              
              {cameraReady && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  border: '3px solid rgba(16, 185, 129, 0.8)',
                  borderRadius: '16px',
                  boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)',
                  animation: 'pulse 2s infinite'
                }} />
              )}
              
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {cameraReady ? '🔍 Recherche QR Code...' : '⏳ Initialisation...'}
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <button onClick={stopCamera} style={{ ...buttonDangerStyle, padding: '12px 24px' }}>
                Arrêter Caméra
              </button>
            </div>
            
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '12px', fontWeight: '500' }}>
              Pointez la caméra vers le QR code
            </p>
          </div>
        )}

        {/* Info professeur */}
        {professeur && !showCamera && (
          <div style={{
            backgroundColor: 'rgba(248, 250, 252, 0.8)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <User size={20} style={{ color: 'white' }} />
              </div>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c' }}>
                {professeur.nom}
              </span>
            </div>
            
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              <p style={{ margin: '8px 0', fontWeight: '500' }}>
                <strong>Email:</strong> {professeur.email}
              </p>
              {professeur.matiere && (
                <p style={{ margin: '8px 0', fontWeight: '500' }}>
                  <strong>Matière:</strong> {professeur.matiere}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Date/Heure */}
        {!showCamera && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '32px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <Clock size={20} style={{ color: '#667eea', marginRight: '8px', display: 'inline' }} />
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#374151' }}>
                {datetime.date}
              </span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
              {datetime.time}
            </div>
          </div>
        )}

        {/* Info pointage actuel */}
        {pointageInfo && !showCamera && (
          <div style={{
            backgroundColor: pointageInfo.heureSortie ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            border: `2px solid ${pointageInfo.heureSortie ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c', marginBottom: '16px' }}>
              📋 Votre pointage aujourd'hui
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>
                  ENTRÉE
                </p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', margin: 0 }}>
                  {pointageInfo.heureEntree}
                </p>
              </div>
              
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>
                  SORTIE
                </p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: pointageInfo.heureSortie ? '#ef4444' : '#9ca3af', margin: 0 }}>
                  {pointageInfo.heureSortie || '--:--'}
                </p>
              </div>
            </div>
            
            {pointageInfo.heureSortie && pointageInfo.tempsPresence > 0 && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0', fontWeight: '600' }}>
                  Temps de présence
                </p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#667eea', margin: 0 }}>
                  {formatTempsPresence(pointageInfo.tempsPresence)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {message.text && (
          <div style={{
            backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {message.type === 'success' ? (
                  <CheckCircle size={14} style={{ color: 'white' }} />
                ) : (
                  <AlertTriangle size={14} style={{ color: 'white' }} />
                )}
              </div>
              
              <p style={{ 
                fontWeight: '600', 
                margin: 0,
                color: message.type === 'success' ? '#15803d' : '#dc2626',
                fontSize: '16px'
              }}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            marginBottom: '32px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(102, 126, 234, 0.3)',
              borderTop: '3px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#667eea', fontWeight: '600', fontSize: '16px', margin: 0 }}>
              {message.text || 'Traitement en cours...'}
            </p>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!pointageInfo && !loading && !showCamera && (
            <>
              <button
                onClick={startCamera}
                style={buttonPrimaryStyle}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Camera size={24} />
                Scanner QR (Entrée)
              </button>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                style={buttonSecondaryStyle}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Upload size={20} />
                Upload Image QR
              </button>
            </>
          )}

          {pointageInfo && !pointageInfo.heureSortie && !loading && (
            <button
              onClick={enregistrerSortie}
              style={buttonDangerStyle}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <LogOut size={24} />
              Enregistrer Sortie
            </button>
          )}

          {pointageInfo && pointageInfo.heureSortie && (
            <button
              onClick={resetScanner}
              style={{
                ...buttonPrimaryStyle,
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <RefreshCw size={20} />
              Terminé pour aujourd'hui
            </button>
          )}

          {!pointageInfo && !loading && message.type === 'error' && (
            <button
              onClick={() => {
                setMessage({ type: '', text: '' });
                if (qrId) {
                  scannerQRCode();
                } else {
                  startCamera();
                }
              }}
              style={{
                ...buttonPrimaryStyle,
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <RefreshCw size={20} />
              Réessayer
            </button>
          )}
        </div>
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }
        `}
      </style>
    </div>
  );
};

export default ProfesseurScanner;