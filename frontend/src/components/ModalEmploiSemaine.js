import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Book, Eye, EyeOff } from 'lucide-react';

const ModalEmploiSemaine = () => {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Déterminer le type d'utilisateur basé sur le rôle stocké
  const getUserTypeFromRole = () => {
    const role = localStorage.getItem('role');
    return role === 'prof' ? 'professeur' : 'etudiant';
  };

  const actualUserType = getUserTypeFromRole();

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const creneaux = [
    { debut: '08:45', fin: '10:45', label: '8h45 - 10h45' },
    { debut: '11:00', fin: '13:00', label: '11h00 - 13h00' },
    { debut: '14:00', fin: '16:00', label: '14h00 - 16h00' }
  ];

  // Obtenir les dates de la semaine courante
  const getWeekDates = () => {
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      weekDates.push(currentDate);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  // Charger les séances et afficher le modal automatiquement
  useEffect(() => {
    const showModalAutomatically = () => {
      setShowModal(true);
      fetchSeances();
    };

    // Affichage immédiat du modal (délai court pour le chargement du dashboard)
    const timer = setTimeout(showModalAutomatically, 1000);
    return () => clearTimeout(timer);
  }, []);

  const fetchSeances = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role'); // Récupérer le rôle stocké
      let url = '';
      
      // Utiliser le rôle stocké au lieu du userType prop
      if (role === 'prof') {
        url = '/api/seances/professeur';
      } else if (role === 'etudiant') {
        url = '/api/seances/etudiant';
      } else {
        setError('Rôle utilisateur non reconnu');
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSeances(data);
      } else {
        setError('Erreur lors du chargement de votre emploi du temps');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Organiser les séances par jour et créneau
  const organiserSeances = () => {
    const emploi = {};
    seances.forEach(seance => {
      const key = `${seance.jour}-${seance.heureDebut}-${seance.heureFin}`;
      emploi[key] = seance;
    });
    return emploi;
  };

  const emploiOrganise = organiserSeances();

  // Fermer le modal
  const handleClose = () => {
    setShowModal(false);
  };

  // Bouton pour réouvrir le modal
  const BoutonVoirEmploi = () => (
    <button
      onClick={() => {
        setShowModal(true);
        if (seances.length === 0) {
          fetchSeances();
        }
      }}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: actualUserType === 'professeur' ? '#059669' : '#3b82f6',
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        zIndex: 999
      }}
      onMouseOver={(e) => {
        e.target.style.transform = 'scale(1.1)';
        e.target.style.backgroundColor = actualUserType === 'professeur' ? '#047857' : '#2563eb';
      }}
      onMouseOut={(e) => {
        e.target.style.transform = 'scale(1)';
        e.target.style.backgroundColor = actualUserType === 'professeur' ? '#059669' : '#3b82f6';
      }}
      title="Voir mon emploi du temps de la semaine"
    >
      <Calendar size={24} />
    </button>
  );

  // Calculer les statistiques
  const getStats = () => {
    const coursUniques = [...new Set(seances.map(s => s.cours).filter(Boolean))];
    const matieresUniques = [...new Set(seances.map(s => s.matiere).filter(Boolean))];
    const sallesUniques = [...new Set(seances.map(s => s.salle).filter(Boolean))];
    
    return {
      totalSeances: seances.length,
      totalCours: coursUniques.length,
      totalMatieres: matieresUniques.length,
      totalSalles: sallesUniques.length,
      totalHeures: seances.length * 2
    };
  };

  const stats = getStats();

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    },
    modal: {
      backgroundColor: '#fff',
      borderRadius: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      maxWidth: '95vw',
      maxHeight: '95vh',
      width: '1000px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp 0.4s ease-out'
    },
    header: {
      padding: '24px',
      background: actualUserType === 'professeur' 
        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      margin: 0,
      fontSize: '1.5rem',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    subtitle: {
      fontSize: '14px',
      opacity: 0.9,
      marginTop: '8px'
    },
    closeButton: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '8px',
      color: 'white',
      transition: 'all 0.2s'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '24px'
    },
    welcomeMessage: {
      textAlign: 'center',
      marginBottom: '24px',
      padding: '20px',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    },
    welcomeTitle: {
      fontSize: '1.2rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '8px'
    },
    welcomeText: {
      color: '#6b7280',
      fontSize: '14px'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px',
      marginBottom: '24px'
    },
    statCard: {
      backgroundColor: '#f8fafc',
      padding: '16px',
      borderRadius: '8px',
      textAlign: 'center',
      border: '1px solid #e5e7eb'
    },
    statNumber: {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      color: actualUserType === 'professeur' ? '#059669' : '#3b82f6'
    },
    statLabel: {
      fontSize: '0.8rem',
      color: '#6b7280',
      marginTop: '4px'
    },
    tableContainer: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    },
    tableTitle: {
      backgroundColor: '#f8fafc',
      padding: '16px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151',
      borderBottom: '1px solid #e5e7eb'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '12px'
    },
    headerCell: {
      backgroundColor: actualUserType === 'professeur' ? '#059669' : '#3b82f6',
      color: 'white',
      padding: '12px 8px',
      textAlign: 'center',
      fontWeight: '600',
      border: '1px solid ' + (actualUserType === 'professeur' ? '#047857' : '#2563eb')
    },
    timeCell: {
      backgroundColor: '#f8fafc',
      padding: '12px 8px',
      textAlign: 'center',
      fontWeight: '600',
      color: '#374151',
      border: '1px solid #e5e7eb',
      minWidth: '100px'
    },
    cell: {
      border: '1px solid #e5e7eb',
      padding: '6px',
      verticalAlign: 'top',
      height: '80px',
      width: 'calc(100% / 7)',
      position: 'relative'
    },
    seanceCard: {
      backgroundColor: actualUserType === 'professeur' ? '#d1fae5' : '#dbeafe',
      borderRadius: '6px',
      padding: '6px',
      fontSize: '10px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      border: '1px solid ' + (actualUserType === 'professeur' ? '#10b981' : '#3b82f6')
    },
    coursName: {
      fontWeight: '600',
      color: actualUserType === 'professeur' ? '#065f46' : '#1e40af',
      marginBottom: '2px',
      fontSize: '11px'
    },
    matiereName: {
      fontWeight: '500',
      color: '#7c3aed',
      marginBottom: '2px',
      fontSize: '9px'
    },
    salleName: {
      fontWeight: '500',
      color: '#dc2626',
      marginBottom: '2px',
      fontSize: '9px'
    },
    profName: {
      color: '#374151',
      fontSize: '9px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: '#6b7280'
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      fontSize: '16px',
      color: '#6b7280'
    }
  };

  return (
    <>
      {/* Bouton flottant pour réouvrir le modal */}
      <BoutonVoirEmploi />

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={handleClose}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={styles.header}>
              <div>
                <h2 style={styles.title}>
                  <Calendar size={28} />
                  Mon Emploi du Temps
                </h2>
                <div style={styles.subtitle}>
                  Semaine du {formatDate(weekDates[0])} au {formatDate(weekDates[5])}
                </div>
              </div>
              <button 
                style={styles.closeButton}
                onClick={handleClose}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenu */}
            <div style={styles.content}>
              {/* Message de bienvenue */}
              <div style={styles.welcomeMessage}>
                <h3 style={styles.welcomeTitle}>
                  Voici votre planning de la semaine
                </h3>
                <p style={styles.welcomeText}>
                  Consultez vos {actualUserType === 'professeur' ? 'cours à enseigner' : 'cours à suivre'} pour cette semaine
                </p>
              </div>

              {loading ? (
                <div style={styles.loadingContainer}>
                  <div>Chargement de votre emploi du temps...</div>
                </div>
              ) : error ? (
                <div style={styles.emptyState}>
                  <h3>Erreur</h3>
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  {/* Statistiques */}
                  <div style={styles.statsContainer}>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{stats.totalSeances}</div>
                      <div style={styles.statLabel}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Séances
                      </div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{stats.totalCours}</div>
                      <div style={styles.statLabel}>
                        <Book size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        {actualUserType === 'professeur' ? 'Classes' : 'Cours'}
                      </div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{stats.totalMatieres}</div>
                      <div style={styles.statLabel}>
                        <Book size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Matières
                      </div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{stats.totalSalles}</div>
                      <div style={styles.statLabel}>
                        <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Salles
                      </div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{stats.totalHeures}h</div>
                      <div style={styles.statLabel}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Total
                      </div>
                    </div>
                  </div>

                  {/* Tableau emploi du temps */}
                  {seances.length > 0 ? (
                    <div style={styles.tableContainer}>
                      <div style={styles.tableTitle}>
                        <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        Planning de la Semaine
                        {window.innerWidth <= 768 && (
                          <div style={{ 
                            fontSize: '10px', 
                            marginTop: '4px', 
                            fontWeight: 'normal', 
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>Glissez pour voir tous les jours</span>
                            <span style={{ fontSize: '12px' }}>→</span>
                          </div>
                        )}
                      </div>
                      <div 
                        style={{
                          ...styles.tableWrapper,
                          position: 'relative'
                        }}
                      >
                        {/* Indicateur de scroll à droite pour mobile */}
                        {window.innerWidth <= 768 && (
                          <div style={{
                            position: 'absolute',
                            right: '0',
                            top: '0',
                            bottom: '0',
                            width: '30px',
                            background: 'linear-gradient(to left, rgba(255,255,255,0.9), transparent)',
                            pointerEvents: 'none',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>→</span>
                          </div>
                        )}
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.headerCell}>
                                {window.innerWidth <= 480 ? 'H.' : 'Horaires'}
                              </th>
                              {jours.map((jour, index) => (
                                <th key={jour} style={styles.headerCell}>
                                  {window.innerWidth <= 480 ? jour.substring(0, 3) : jour}<br />
                                  <small style={{ fontWeight: 'normal', fontSize: window.innerWidth <= 480 ? '6px' : '10px' }}>
                                    {formatDate(weekDates[index])}
                                  </small>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {creneaux.map(creneau => (
                              <tr key={`${creneau.debut}-${creneau.fin}`}>
                                <td style={styles.timeCell}>
                                  {window.innerWidth <= 480 
                                    ? creneau.debut.substring(0, 2) + 'h' 
                                    : creneau.label
                                  }
                                </td>
                                {jours.map(jour => {
                                  const key = `${jour}-${creneau.debut}-${creneau.fin}`;
                                  const seance = emploiOrganise[key];
                                  
                                  return (
                                    <td key={jour} style={styles.cell}>
                                      {seance ? (
                                        <div style={styles.seanceCard}>
                                          <div>
                                            <div style={styles.coursName}>
                                              {window.innerWidth <= 480 
                                                ? (seance.cours || 'Cours').substring(0, 8) + (seance.cours && seance.cours.length > 8 ? '...' : '')
                                                : seance.cours || 'Cours'
                                              }
                                            </div>
                                            {seance.matiere && (
                                              <div style={styles.matiereName}>
                                                {window.innerWidth <= 480 
                                                  ? seance.matiere.substring(0, 6) + (seance.matiere.length > 6 ? '...' : '')
                                                  : seance.matiere
                                                }
                                              </div>
                                            )}
                                            {seance.salle && (
                                              <div style={styles.salleName}>
                                                {window.innerWidth <= 480 
                                                  ? seance.salle.substring(0, 4)
                                                  : `Salle: ${seance.salle}`
                                                }
                                              </div>
                                            )}
                                          </div>
                                          {actualUserType === 'etudiant' && seance.professeur && window.innerWidth > 480 && (
                                            <div style={styles.profName}>
                                              Prof: {seance.professeur.nom || 'Professeur'}
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.emptyState}>
                      <Calendar size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                      <h3 style={{ margin: '0 0 8px 0' }}>Aucune séance programmée</h3>
                      <p style={{ margin: 0 }}>
                        {actualUserType === 'professeur' 
                          ? 'Vous n\'avez aucune séance programmée cette semaine.'
                          : 'Vous n\'avez aucune séance programmée cette semaine.'
                        }
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(50px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default ModalEmploiSemaine;