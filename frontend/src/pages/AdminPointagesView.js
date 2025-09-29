import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, UserCheck, UserX, AlertTriangle, Eye, ChevronLeft, ChevronRight, RefreshCw, BarChart3, TrendingUp } from 'lucide-react';
import Sidebar from '../components/Sidebar'; // ✅ استيراد صحيح
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

const AdminPointagesView = () => {
  const [dateSelectionnee, setDateSelectionnee] = useState(new Date().toISOString().split('T')[0]);
  const [pointagesData, setPointagesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPointages();
  }, [dateSelectionnee]);

  const fetchPointages = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      setMessage({ type: 'error', text: 'Token manquant. Veuillez vous reconnecter.' });
      setLoading(false);
      return;
    }
    
    try {
      console.log('Récupération pointages pour date:', dateSelectionnee);
      
      // ✅ Utiliser la route avec query parameter
      const res = await fetch(`/api/admin/pointages?date=${dateSelectionnee}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Statut réponse:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('Données reçues:', data);
        
        if (data.success) {
          setPointagesData(data);
        } else {
          setMessage({ type: 'error', text: data.message || 'Erreur dans les données' });
        }
      } else {
        const errorText = await res.text();
        console.error('Erreur serveur:', errorText);
        setMessage({ type: 'error', text: `Erreur ${res.status}: ${errorText}` });
      }
    } catch (err) {
      console.error('Erreur fetch:', err);
      setMessage({ type: 'error', text: `Erreur de connexion: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const changerDate = (direction) => {
    const date = new Date(dateSelectionnee);
    date.setDate(date.getDate() + direction);
    setDateSelectionnee(date.toISOString().split('T')[0]);
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'présent': return '#10b981';
      case 'retard': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const formatHeure = (heure) => {
    // Si heure est déjà au format HH:MM, la retourner telle quelle
    if (typeof heure === 'string' && heure.includes(':')) {
      return heure;
    }
    // Sinon, essayer de la formater depuis une date
    try {
      return new Date(heure).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return heure;
    }
  };

  // Styles professionnels
  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease'
  };

  const buttonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(226, 232, 240, 0.5)',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  };

  const primaryButtonStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #a6dbff 25%, #f3e8ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          ...cardStyle,
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(102, 126, 234, 0.3)',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ 
            color: '#667eea', 
            fontSize: '18px', 
            fontWeight: '600',
            margin: 0
          }}>
            Chargement des pointages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #a6dbff 25%, #f3e8ff 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <Sidebar onLogout={handleLogout} />
        
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
            <BarChart3 size={40} style={{ color: 'white' }} />
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Pointages des Professeurs
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '16px',
            margin: 0,
            fontWeight: '500'
          }}>
            Consultez les pointages par jour et gérez les présences
          </p>
        </div>

        {/* Sélecteur de date */}
        <div style={{
          ...cardStyle,
          padding: '32px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => changerDate(-1)}
              style={{
                ...buttonStyle,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <ChevronLeft size={20} style={{ color: '#64748b' }} />
            </button>
            
            <input
              type="date"
              value={dateSelectionnee}
              onChange={(e) => setDateSelectionnee(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid rgba(102, 126, 234, 0.2)',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#374151',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)'}
            />
            
            <button
              onClick={() => changerDate(1)}
              style={{
                ...buttonStyle,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <ChevronRight size={20} style={{ color: '#64748b' }} />
            </button>
            
            <button
              onClick={fetchPointages}
              style={{
                ...primaryButtonStyle,
                padding: '12px 20px',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <RefreshCw size={18} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Messages d'erreur */}
        {message.text && (
          <div style={{
            backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `2px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={14} style={{ color: 'white' }} />
            </div>
            <span style={{
              fontWeight: '600',
              color: message.type === 'success' ? '#15803d' : '#dc2626'
            }}>
              {message.text}
            </span>
          </div>
        )}

        {pointagesData && (
          <>
            {/* Statistiques */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              <div style={{
                ...cardStyle,
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
                }}>
                  <Users size={24} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>
                  {pointagesData.stats.totalProfesseurs}
                </h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                  Total Professeurs
                </p>
              </div>

              <div style={{
                ...cardStyle,
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
                }}>
                  <UserCheck size={24} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>
                  {pointagesData.stats.presents}
                </h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                  Présents
                </p>
              </div>

              <div style={{
                ...cardStyle,
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)'
                }}>
                  <Clock size={24} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>
                  {pointagesData.stats.retards}
                </h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                  Retards
                </p>
              </div>

              <div style={{
                ...cardStyle,
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 25px rgba(239, 68, 68, 0.3)'
                }}>
                  <UserX size={24} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>
                  {pointagesData.stats.absents}
                </h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                  Absents
                </p>
              </div>

              <div style={{
                ...cardStyle,
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 25px rgba(139, 92, 246, 0.3)'
                }}>
                  <TrendingUp size={24} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>
                  {pointagesData.stats.tauxPresence}%
                </h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                  Taux de Présence
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
              '@media (max-width: 768px)': {
                gridTemplateColumns: '1fr'
              }
            }}>
              
              {/* Liste des pointages */}
              <div style={{ ...cardStyle, padding: '32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserCheck size={20} style={{ color: 'white' }} />
                  </div>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1a202c',
                    margin: 0
                  }}>
                    Professeurs Pointés ({pointagesData.pointages.length})
                  </h2>
                </div>

                {pointagesData.pointages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#64748b',
                    backgroundColor: 'rgba(248, 250, 252, 0.8)',
                    borderRadius: '16px'
                  }}>
                    <UserCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                      Aucun pointage pour cette date
                    </p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pointagesData.pointages.map((pointage) => (
                        <div
                          key={pointage._id}
                          style={{
                            backgroundColor: 'rgba(248, 250, 252, 0.8)',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            borderLeft: `4px solid ${getStatutColor(pointage.statut)}`,
                            borderRadius: '12px',
                            padding: '20px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(248, 250, 252, 0.8)'}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                          }}>
                            <h4 style={{
                              fontWeight: '600',
                              color: '#1a202c',
                              margin: 0,
                              fontSize: '16px'
                            }}>
                              {pointage.nomProfesseur}
                            </h4>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: getStatutColor(pointage.statut)
                            }}>
                              {pointage.statut.toUpperCase()}
                            </span>
                          </div>
                          
                          <div style={{
                            fontSize: '14px',
                            color: '#64748b',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <p style={{ margin: 0, fontWeight: '500' }}>
                              <strong>Email:</strong><br/>
                              {pointage.emailProfesseur}
                            </p>
                            <p style={{ margin: 0, fontWeight: '500' }}>
                              <strong>Heure:</strong><br/>
                              {formatHeure(pointage.heure)}
                            </p>
                            {pointage.professeur?.matiere && (
                              <p style={{ margin: 0, fontWeight: '500' }}>
                                <strong>Matière:</strong><br/>
                                {pointage.professeur.matiere}
                              </p>
                            )}
                            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
                              <strong>QR ID:</strong><br/>
                              {pointage.codeQRId}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Liste des absents */}
              <div style={{ ...cardStyle, padding: '32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserX size={20} style={{ color: 'white' }} />
                  </div>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1a202c',
                    margin: 0
                  }}>
                    Professeurs Absents ({pointagesData.professeursAbsents.length})
                  </h2>
                </div>

                {pointagesData.professeursAbsents.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#059669',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '16px',
                    border: '2px dashed rgba(34, 197, 94, 0.3)'
                  }}>
                    <UserCheck size={48} style={{ margin: '0 auto 16px', color: '#10b981' }} />
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                      Tous les professeurs ont pointé !
                    </p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pointagesData.professeursAbsents.map((professeur) => (
                        <div
                          key={professeur._id}
                          style={{
                            backgroundColor: 'rgba(254, 242, 242, 0.8)',
                            border: '1px solid rgba(254, 226, 226, 0.8)',
                            borderLeft: '4px solid #ef4444',
                            borderRadius: '12px',
                            padding: '20px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 235, 235, 0.9)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(254, 242, 242, 0.8)'}
                        >
                          <h4 style={{
                            fontWeight: '600',
                            color: '#1a202c',
                            margin: '0 0 12px 0',
                            fontSize: '16px'
                          }}>
                            {professeur.nom}
                          </h4>
                          
                          <div style={{
                            fontSize: '14px',
                            color: '#64748b',
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <p style={{ margin: 0, fontWeight: '500' }}>
                              <strong>Email:</strong> {professeur.email}
                            </p>
                            <p style={{ margin: 0, fontWeight: '500' }}>
                              <strong>Matière:</strong> {professeur.matiere}
                            </p>
                          </div>
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#dc2626',
                            fontWeight: '600',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: '8px 12px',
                            borderRadius: '8px'
                          }}>
                            <AlertTriangle size={14} />
                            Absence non justifiée
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Debug info */}
        <div style={{
          marginTop: '32px',
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          color: 'white',
          borderRadius: '16px',
          padding: '20px',
          fontSize: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '700' }}>Debug Info:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            <p style={{ margin: 0 }}>Date sélectionnée: {dateSelectionnee}</p>
            <p style={{ margin: 0 }}>Token présent: {localStorage.getItem('token') ? 'Oui' : 'Non'}</p>
            <p style={{ margin: 0 }}>Données chargées: {pointagesData ? 'Oui' : 'Non'}</p>
            {pointagesData && (
              <p style={{ margin: 0 }}>
                Pointages: {pointagesData.pointages.length} / Absents: {pointagesData.professeursAbsents.length}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 768px) {
            .grid-responsive {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default AdminPointagesView;