import React, { useState, useEffect } from 'react';
import { QrCode, Users, Clock, Trash2, CheckCircle, AlertTriangle, Download, Plus, BarChart3, Eye, LogOut as LogOutIcon } from 'lucide-react';
import Sidebar from '../components/Sidebar'; // ✅ استيراد صحيح

const AdminQRPage = () => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pointages, setPointages] = useState(null);
  const [qrCodesActifs, setQrCodesActifs] = useState([]);

  useEffect(() => {
    fetchPointages();
    fetchQRCodesActifs();
    
    const interval = setInterval(() => {
      fetchPointages();
      fetchQRCodesActifs();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPointages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/pointages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPointages(data);
      }
    } catch (error) {
      console.error('Erreur pointages:', error);
    }
  };

  const fetchQRCodesActifs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/qr-codes-actifs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrCodesActifs(data.qrCodesActifs);
      }
    } catch (error) {
      console.error('Erreur QR codes:', error);
    }
  };

  const genererQR = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          description: description || `Pointage du ${new Date().toLocaleDateString('fr-FR')}`
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setQrCode(data.qrCode);
        setMessage({ type: 'success', text: data.message || 'QR Code généré avec succès!' });
        fetchQRCodesActifs();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setLoading(false);
    }
  };

  const supprimerQR = async (qrId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/qr-code/${qrId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'QR Code supprimé' });
        fetchQRCodesActifs();
        if (qrCode && qrCode.id === qrId) {
          setQrCode(null);
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur suppression' });
    }
  };

  const telechargerQR = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.download = `qr-pointage-${new Date().toISOString().split('T')[0]}.png`;
    link.href = qrCode.dataURL;
    link.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease'
  };

  const buttonPrimaryStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const inputStyle = {
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(5px)',
    transition: 'all 0.3s ease',
    outline: 'none'
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #a6dbff 25%, #f3e8ff 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}><Sidebar onLogout={handleLogout} />
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Bouton Déconnexion */}
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
          >
            <LogOutIcon size={18} />
            Déconnexion
          </button>
        </div>

        {/* Header */}
        <div style={{ 
          ...cardStyle,
          padding: '40px',
          marginBottom: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            marginBottom: '20px'
          }}>
            <QrCode size={40} style={{ color: 'white' }} />
          </div>
          <h1 style={{ 
            margin: '0 0 10px 0', 
            color: '#1a202c',
            fontSize: '32px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Générateur QR Code
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#64748b', 
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Système de pointage - UN QR par jour (20 heures)
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
          
          {/* Génération QR */}
          <div style={{ ...cardStyle, padding: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <Plus size={24} style={{ color: '#667eea', marginRight: '12px' }} />
              <h2 style={{ margin: 0, color: '#1a202c', fontSize: '24px', fontWeight: '700' }}>
                QR Code du Jour
              </h2>
            </div>

            {message.text && (
              <div style={{
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '24px',
                backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: message.type === 'success' ? '#15803d' : '#dc2626',
                border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {message.type === 'success' ? 
                  <CheckCircle size={20} /> :
                  <AlertTriangle size={20} />
                }
                <span style={{ fontWeight: '500' }}>{message.text}</span>
              </div>
            )}

            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                Description (Optionnel)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ex: Pointage matinée"
                style={{
                  ...inputStyle,
                  width: '100%'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', fontStyle: 'italic' }}>
                ⚠️ Un seul QR code par jour, valable 20 heures
              </p>
            </div>

            <button
              onClick={genererQR}
              disabled={loading}
              style={{
                ...buttonPrimaryStyle,
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Génération...
                </>
              ) : (
                <>
                  <QrCode size={20} />
                  Générer/Récupérer QR du Jour
                </>
              )}
            </button>

            {/* QR Code généré */}
            {qrCode && (
              <div style={{ 
                marginTop: '32px',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '16px',
                border: '2px dashed rgba(102, 126, 234, 0.3)'
              }}>
                <img
                  src={qrCode.dataURL}
                  alt="QR Code"
                  style={{ 
                    width: '200px', 
                    height: '200px', 
                    borderRadius: '12px',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                  }}
                />
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0', fontWeight: '500' }}>
                    <strong>Description:</strong> {qrCode.description}
                  </p>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0', fontWeight: '500' }}>
                    <strong>Expire le:</strong> {new Date(qrCode.expiresAt).toLocaleString('fr-FR')}
                  </p>
                  <button
                    onClick={telechargerQR}
                    style={{
                      ...buttonPrimaryStyle,
                      padding: '12px 20px',
                      fontSize: '14px',
                      marginTop: '16px'
                    }}
                  >
                    <Download size={16} />
                    Télécharger
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Statistiques et QR actifs */}
          <div>
            
            {/* Statistiques */}
            {pointages && (
              <div style={{ ...cardStyle, padding: '32px', marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <BarChart3 size={24} style={{ color: '#667eea', marginRight: '12px' }} />
                  <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a202c' }}>
                    Statistiques du Jour
                  </h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                      {pointages.stats.presents}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', opacity: 0.9 }}>Présents</div>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                      {pointages.stats.absents}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', opacity: 0.9 }}>Absents</div>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                      {pointages.stats.sansSortie || 0}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', opacity: 0.9 }}>Sans Sortie</div>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                      {pointages.stats.tauxPresence}%
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', opacity: 0.9 }}>Taux Présence</div>
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: '14px', 
                  color: '#64748b', 
                  textAlign: 'center', 
                  marginTop: '16px',
                  fontWeight: '500'
                }}>
                  Total: {pointages.stats.totalProfesseurs} professeurs
                </div>
              </div>
            )}

            {/* QR Codes Actifs */}
            <div style={{ ...cardStyle, padding: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <Clock size={24} style={{ color: '#667eea', marginRight: '12px' }} />
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a202c' }}>
                  QR Code Actif
                </h3>
                <span style={{
                  marginLeft: '12px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {qrCodesActifs.length}
                </span>
              </div>

              {qrCodesActifs.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#64748b', 
                  padding: '40px 20px',
                  backgroundColor: 'rgba(248, 250, 252, 0.8)',
                  borderRadius: '16px'
                }}>
                  <QrCode size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Aucun QR code actif</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
                    Générez le QR code du jour
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {qrCodesActifs.map((qr) => (
                    <div
                      key={qr.id}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderLeft: `4px solid #10b981`,
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '16px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1a202c'
                          }}>
                            {qr.description}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                            <span style={{ 
                              fontSize: '13px', 
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Clock size={14} />
                              {qr.tempsRestant} min restantes
                            </span>
                            <span style={{ 
                              fontSize: '13px', 
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Eye size={14} />
                              {qr.scansCount} scans
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => supprimerQR(qr.id)}
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                      
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'rgba(226, 232, 240, 0.8)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.max(0, Math.min(100, (qr.tempsRestant / 1200) * 100))}%`,
                          height: '100%',
                          background: qr.tempsRestant < 120 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 
                                     qr.tempsRestant < 300 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 
                                     'linear-gradient(90deg, #10b981, #059669)',
                          transition: 'all 0.3s ease'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Liste des pointages récents */}
        {pointages && pointages.pointages.length > 0 && (
          <div style={{ ...cardStyle, padding: '32px', marginTop: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <Users size={24} style={{ color: '#667eea', marginRight: '12px' }} />
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a202c' }}>
                Pointages Récents
              </h3>
            </div>
            
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {pointages.pointages.slice(0, 10).map((pointage, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    backgroundColor: index % 2 === 0 ? 'rgba(248, 250, 252, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '16px' }}>
                      {pointage.nomProfesseur}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                      {pointage.emailProfesseur}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Entrée</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                        {pointage.heureEntree}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Sortie</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: pointage.heureSortie ? '#ef4444' : '#9ca3af' }}>
                        {pointage.heureSortie || '--:--'}
                      </div>
                    </div>
                    {pointage.tempsPresence > 0 && (
                      <div style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontWeight: '600',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#2563eb'
                      }}>
                        {Math.floor(pointage.tempsPresence / 60)}h {pointage.tempsPresence % 60}min
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AdminQRPage;