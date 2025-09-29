import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, QrCode, CheckCircle, AlertTriangle, User, Clock, RefreshCw, LogOut, Scan, Smartphone } from 'lucide-react';
import jsQR from 'jsqr';
import Sidebar from '../components/SidebarProf'; // Composant sidebar pour professeur




  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };
const ProfesseurScanner = () => {
  const [qrId, setQrId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', details: null });
  const [professeur, setProfesseur] = useState(null);
  const [pointageReussi, setPointageReussi] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    // Récupérer QR ID depuis URL
    const urlPath = window.location.pathname;
    const qrIdFromUrl = urlPath.split('/scan-qr/')[1];
    
    if (qrIdFromUrl) {
      setQrId(qrIdFromUrl);
    }

    // Récupérer infos professeur
    fetchProfesseurInfo();

    return () => {
      stopCamera();
    };
  }, []);

  const fetchProfesseurInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', text: 'Veuillez vous connecter' });
      return;
    }

    try {
      console.log('🔄 Récupération du profil professeur...');
      console.log('🔑 Token:', token.substring(0, 50) + '...');
      
      // ✅ ESSAYER D'ABORD LA ROUTE PROFILE SIMPLE
      let res = await fetch('/api/professeur/profile', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Réponse profile professeur:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Données professeur reçues (profile):', data);
        
        // ✅ ADAPTER SELON LA STRUCTURE DE RÉPONSE DE VOTRE BACKEND
        let professeurData = null;
        
        if (data.professeur) {
          // Structure: { professeur: {...} }
          professeurData = data.professeur;
        } else if (data.nom && data.email) {
          // Structure: { nom, email, matiere, ... } - données directement
          professeurData = data;
        } else {
          console.warn('⚠️ Structure de réponse inattendue:', data);
          // Essayer de prendre data tel quel
          professeurData = data;
        }
        
        console.log('📝 Professeur final à sauvegarder:', professeurData);
        setProfesseur(professeurData);
        
        // ✅ VÉRIFIER LE POINTAGE DU JOUR SÉPARÉMENT SI NÉCESSAIRE
        checkPointageAujourdhui(token);
        
      } else if (res.status === 404) {
        // ✅ SI PROFILE N'EXISTE PAS, ESSAYER STATUT-AUJOURD-HUI
        console.log('⚠️ Route profile non trouvée, essai statut-aujourd-hui...');
        
        res = await fetch('/api/professeur/statut-aujourd-hui', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Données professeur reçues (statut):', data);
          
          setProfesseur(data.professeur);
          
          if (data.aPointe) {
            setMessage({
              type: 'error',
              text: 'Vous avez déjà pointé aujourd\'hui',
              details: data.pointageAujourdhui
            });
          }
        } else {
          const errorText = await res.text();
          console.error('❌ Erreur statut professeur:', res.status, errorText);
          setMessage({ 
            type: 'error', 
            text: `Erreur ${res.status}: ${errorText}`
          });
        }
      } else {
        const errorText = await res.text();
        console.error('❌ Erreur récupération professeur:', res.status, errorText);
        setMessage({ 
          type: 'error', 
          text: `Erreur ${res.status}: Vérifiez votre connexion`
        });
      }
    } catch (error) {
      console.error('❌ Erreur fetch professeur complète:', error);
      setMessage({ type: 'error', text: `Erreur réseau: ${error.message}` });
    }
  };

  // ✅ FONCTION POUR VÉRIFIER LE POINTAGE SÉPARÉMENT
  const checkPointageAujourdhui = async (token) => {
    try {
      const res = await fetch('/api/professeur/statut-aujourd-hui', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.aPointe) {
          setMessage({
            type: 'error',
            text: 'Vous avez déjà pointé aujourd\'hui',
            details: data.pointageAujourdhui
          });
        }
      }
    } catch (error) {
      console.log('ℹ️ Impossible de vérifier le pointage du jour:', error.message);
    }
  };

  const scannerQRCode = async (qrIdToScan) => {
    const currentQrId = qrIdToScan || qrId;
    
    console.log('=== DEBUT SCAN QR ===');
    console.log('QR ID à scanner:', currentQrId);
    console.log('Professeur actuel:', professeur);
    
    if (!currentQrId) {
      setMessage({ type: 'error', text: 'QR Code invalide' });
      return;
    }

    if (!professeur) {
      console.warn('⚠️ Pas de données professeur, tentative de récupération...');
      await fetchProfesseurInfo();
      
      // Attendre un peu que les données se chargent
      setTimeout(() => {
        if (professeur) {
          scannerQRCode(currentQrId);
        } else {
          setMessage({ type: 'error', text: 'Impossible de récupérer vos informations. Reconnectez-vous.' });
        }
      }, 1000);
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: 'Pointage en cours...' });

    const token = localStorage.getItem('token');
    console.log('🔑 Token présent:', !!token);
    
    if (!token) {
      setMessage({ type: 'error', text: 'Token manquant. Reconnectez-vous.' });
      setLoading(false);
      return;
    }
    
    try {
      const url = `/api/scan-qr/${currentQrId}`;
      console.log('📞 URL appelée:', url);
      console.log('👨‍🏫 Professeur envoyé:', professeur.nom);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Statut réponse:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Erreur serveur complète:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Données reçues:', data);

      if (data.success) {
        setPointageReussi(true);
        setQrId(currentQrId);
        stopCamera();
        setMessage({ 
          type: 'success', 
          text: data.message,
          details: data.pointage
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: data.message,
          details: data.pointageExistant || null
        });
      }
    } catch (error) {
      console.error('❌ ERREUR SCAN COMPLÈTE:', error);
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
    
    try {
      console.log('📷 Démarrage caméra...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setShowCamera(true);
        
        console.log('✅ Caméra démarrée, début du scan...');
        
        // ✅ Utiliser requestAnimationFrame au lieu de setInterval
        scanningRef.current = true;
        scanQRFromCamera();
      }
    } catch (error) {
      console.error('❌ Erreur caméra:', error);
      
      let errorMessage = 'Erreur d\'accès à la caméra';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission caméra refusée. Veuillez autoriser l\'accès.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée sur cet appareil.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Caméra non supportée sur ce navigateur.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const stopCamera = () => {
    console.log('🛑 Arrêt de la caméra...');
    
    scanningRef.current = false;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setShowCamera(false);
  };

  // ✅ Upload image avec jsQR importé
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner une image valide' });
      return;
    }

    console.log('📷 Upload d\'image:', file.name, file.size);

    setLoading(true);
    setMessage({ type: '', text: 'Analyse de l\'image en cours...' });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            console.log('🖼️ Image chargée:', img.width, 'x', img.height);
            
            // Créer canvas pour traiter l'image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Obtenir les données de l'image
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            console.log('🔍 Analyse des données image...');
            
            // ✅ Utiliser jsQR importé directement
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });
            
            if (code && code.data) {
              console.log('✅ QR détecté depuis image:', code.data);
              
              let detectedQrId = code.data;
              
              // Extraire l'ID si c'est une URL complète
              if (detectedQrId.includes('/scan-qr/')) {
                detectedQrId = detectedQrId.split('/scan-qr/')[1];
              }
              
              if (detectedQrId.includes('?')) {
                detectedQrId = detectedQrId.split('?')[0];
              }
              
              console.log('🎯 QR ID extrait:', detectedQrId);
              setQrId(detectedQrId);
              await scannerQRCode(detectedQrId);
            } else {
              console.log('❌ Aucun QR code détecté');
              setMessage({ 
                type: 'error', 
                text: 'Aucun QR code détecté. Vérifiez que l\'image contient un QR code visible et net.' 
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
          console.error('❌ Erreur chargement image');
          setMessage({ type: 'error', text: 'Erreur lors du chargement de l\'image' });
          setLoading(false);
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        console.error('❌ Erreur lecture fichier');
        setMessage({ type: 'error', text: 'Erreur lors de la lecture du fichier' });
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('❌ Erreur upload générale:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'upload' });
      setLoading(false);
    }
  };

  // ✅ Scan caméra avec requestAnimationFrame
  const scanQRFromCamera = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current || !showCamera) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // Réessayer dans la prochaine frame
      requestAnimationFrame(scanQRFromCamera);
      return;
    }
    
    try {
      const context = canvas.getContext('2d');
      if (!context) {
        requestAnimationFrame(scanQRFromCamera);
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // ✅ Utiliser jsQR importé directement
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });
      
      if (code && code.data) {
        console.log('✅ QR code détecté depuis caméra:', code.data);
        
        let detectedQrId = code.data;
        
        // Extraire l'ID du QR code de l'URL
        if (detectedQrId.includes('/scan-qr/')) {
          detectedQrId = detectedQrId.split('/scan-qr/')[1];
        }
        
        if (detectedQrId.includes('?')) {
          detectedQrId = detectedQrId.split('?')[0];
        }
        
        if (detectedQrId && detectedQrId !== qrId) {
          console.log('🎯 Nouveau QR détecté, arrêt du scan');
          
          // ✅ Arrêter la boucle de scan immédiatement
          scanningRef.current = false;
          
          setQrId(detectedQrId);
          stopCamera();
          scannerQRCode(detectedQrId);
          return; // ✅ Sortir de la boucle
        }
      }
      
      // ✅ Continuer le scan seulement si pas de QR détecté
      if (scanningRef.current) {
        requestAnimationFrame(scanQRFromCamera);
      }
      
    } catch (error) {
      console.warn('⚠️ Erreur scan caméra:', error.message);
      
      // Continuer le scan même en cas d'erreur mineure
      if (scanningRef.current) {
        requestAnimationFrame(scanQRFromCamera);
      }
    }
  };

  // Auto scan si QR ID dans URL
  useEffect(() => {
    if (qrId && professeur && !message.text && !pointageReussi && !showCamera) {
      console.log('🚀 Auto-scan du QR depuis URL');
      const timer = setTimeout(() => {
        scannerQRCode();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [qrId, professeur, showCamera]);

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const datetime = getCurrentDateTime();

  // Styles professionnels
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
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  };

  const buttonSecondaryStyle = {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #a6dbff 25%, #f3e8ff 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
                      <Sidebar onLogout={handleLogout} />
        
      <div style={{ 
        maxWidth: '480px', 
        margin: '0 auto',
        ...cardStyle,
        padding: '32px'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: pointageReussi ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            marginBottom: '20px',
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)'
          }}>
            {pointageReussi ? (
              <CheckCircle size={40} style={{ color: 'white' }} />
            ) : (
              <QrCode size={40} style={{ color: 'white' }} />
            )}
          </div>
          
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1a202c',
            marginBottom: '8px',
            background: pointageReussi ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {pointageReussi ? 'Pointage Réussi!' : 'Scanner QR Code'}
          </h1>
          
          <p style={{ 
            color: '#64748b', 
            fontSize: '16px',
            margin: 0,
            fontWeight: '500'
          }}>
            {pointageReussi ? 'Votre présence a été enregistrée' : 'Système de pointage professeurs'}
          </p>
        </div>

        {/* Canvas caché */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Caméra */}
        {showCamera && (
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{
              position: 'relative',
              display: 'inline-block',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)'
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
              
              {/* Overlay de scan */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px',
                height: '200px',
                border: '3px solid rgba(102, 126, 234, 0.8)',
                borderRadius: '16px',
                boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.2)',
                animation: 'pulse 2s infinite'
              }} />
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={stopCamera}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
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
            
            <div style={{ fontSize: '14px', color: '#64748b', space: '8px' }}>
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
              <Clock size={20} style={{ color: '#667eea', marginRight: '8px' }} />
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#374151' }}>
                {datetime.date}
              </span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
              {datetime.time}
            </div>
          </div>
        )}

        {/* Messages */}
        {message.text && (
          <div style={{
            backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            borderRadius: '16px',
            padding: '24px',
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
                flexShrink: 0,
                marginTop: '2px'
              }}>
                {message.type === 'success' ? (
                  <CheckCircle size={14} style={{ color: 'white' }} />
                ) : (
                  <AlertTriangle size={14} style={{ color: 'white' }} />
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontWeight: '600', 
                  marginBottom: '12px', 
                  color: message.type === 'success' ? '#15803d' : '#dc2626',
                  fontSize: '16px'
                }}>
                  {message.text}
                </p>
                
                {message.details && message.type === 'success' && (
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '14px',
                    color: '#374151'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <p style={{ margin: 0 }}>
                        <strong>Professeur:</strong><br/>
                        {message.details.professeur}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Heure:</strong><br/>
                        {message.details.heure}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Date:</strong><br/>
                        {message.details.date}
                      </p>
                      <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                        <strong>Statut:</strong>
                        <span style={{
                          marginLeft: '8px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: message.details.statut === 'présent' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: message.details.statut === 'présent' ? '#15803d' : '#d97706'
                        }}>
                          {message.details.statut.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '16px',
            marginBottom: '32px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
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
              {message.text || 'Pointage en cours...'}
            </p>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!pointageReussi && !loading && !qrId && !showCamera && (
            <>
              <button
                onClick={startCamera}
                style={{
                  ...buttonPrimaryStyle,
                  padding: '18px 24px',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Camera size={24} />
                Scanner avec Caméra
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
                style={{
                  ...buttonSecondaryStyle,
                  padding: '16px 24px',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Upload size={20} />
                Upload Image QR
              </button>
            </>
          )}

          {!pointageReussi && !loading && message.type === 'error' && (
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
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(6, 182, 212, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
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
            0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
            100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
          }
        `}
      </style>
    </div>
  );
};

export default ProfesseurScanner;