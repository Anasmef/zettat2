import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  User, 
  BookOpen, 
  FileText,
  Eye,
  ChevronRight,
  Clock,
  ChevronLeft
} from 'lucide-react';

const RapportNotificationModal = ({ onClose, show }) => {
  const [rapportsAujourdhui, setRapportsAujourdhui] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRapport, setSelectedRapport] = useState(null);

  useEffect(() => {
    if (show) {
      fetchRapportsAujourdhui();
    }
  }, [show]);

  const fetchRapportsAujourdhui = async () => {
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      
      let endpoint = '';
      if (role === 'admin') {
        endpoint = '/api/rapports/admin/rapports';
      } else if (role === 'prof') {
        endpoint = '/api/rapports/professeur/mes-rapports';
      } else {
        return;
      }

      const res = await fetch(endpoint, { headers });
      const data = await res.json();
      
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      
      const rapportsDuJour = data.filter(r => {
        const dateRapport = new Date(r.date);
        dateRapport.setHours(0, 0, 0, 0);
        return dateRapport.getTime() === aujourdhui.getTime();
      });

      setRapportsAujourdhui(rapportsDuJour);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement rapports:', error);
      setIsLoading(false);
    }
  };

  const formatHeure = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProblemeColor = (nature) => {
    if (nature.includes('Violence')) return '#dc2626';
    if (nature.includes('Indiscipline')) return '#ea580c';
    if (nature.includes('Devoirs')) return '#f59e0b';
    if (nature.includes('Retard')) return '#3b82f6';
    return '#6b7280';
  };

  const handleClose = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    console.log('🔴 Bouton fermer cliqué');
    if (typeof onClose === 'function') {
      console.log('✅ Fonction onClose appelée');
      onClose();
    } else {
      console.log('❌ onClose n\'est pas une fonction');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      console.log('🔴 Overlay cliqué');
      handleClose(e);
    }
  };

  if (!show) {
    return null;
  }

  if (isLoading) {
    return (
      <div style={s.overlay} onClick={handleOverlayClick}>
        <div style={s.modalLoading}>
          <div style={s.spinner} />
          <p style={s.loadingText}>Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  if (rapportsAujourdhui.length === 0) {
    console.log('⚠️ Aucun rapport trouvé, modal ne s\'affiche pas');
    return null;
  }

  console.log('📊 Affichage du modal avec', rapportsAujourdhui.length, 'rapports');
  console.log('🔧 onClose type:', typeof onClose);

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {!selectedRapport ? (
          <>
            <div style={s.header}>
              <div style={s.headerLeft}>
                <div style={s.alertIcon}>
                  <AlertTriangle style={{ width: '24px', height: '24px', color: '#fff' }} />
                </div>
                <div>
                  <h2 style={s.title}>Nouveaux Rapports</h2>
                  <p style={s.subtitle}>
                    {rapportsAujourdhui.length} rapport{rapportsAujourdhui.length > 1 ? 's' : ''} aujourd'hui
                  </p>
                </div>
              </div>
              <button style={s.closeButton} onClick={handleClose}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={s.body}>
              {rapportsAujourdhui.map((rapport, index) => (
                <div 
                  key={rapport._id} 
                  style={s.rapportCard}
                  onClick={() => setSelectedRapport(rapport)}
                >
                  <div style={s.rapportHeader}>
                    <span style={s.rapportNumber}>#{index + 1}</span>
                    <div style={s.rapportTime}>
                      <Clock style={{ width: '14px', height: '14px' }} />
                      <span>{formatHeure(rapport.date)}</span>
                    </div>
                  </div>

                  <div style={s.rapportRow}>
                    <User style={s.icon} />
                    <div style={s.rapportInfo}>
                      <span style={s.label}>Étudiant</span>
                      <span style={s.value}>{rapport.etudiant?.nomComplet || 'N/A'}</span>
                    </div>
                  </div>

                  <div style={s.rapportRow}>
                    <BookOpen style={s.icon} />
                    <div style={s.rapportInfo}>
                      <span style={s.label}>Cours</span>
                      <span style={s.value}>{rapport.cours}</span>
                    </div>
                  </div>

                  <div style={s.rapportRow}>
                    <AlertTriangle style={s.icon} />
                    <div style={s.rapportInfo}>
                      <span style={s.label}>Problème</span>
                      <div style={s.problemeTags}>
                        {rapport.natureProbleme.slice(0, 2).map((nature, i) => (
                          <span 
                            key={i} 
                            style={{
                              ...s.problemeTag,
                              backgroundColor: `${getProblemeColor(nature)}30`,
                              color: getProblemeColor(nature),
                            }}
                          >
                            {nature}
                          </span>
                        ))}
                        {rapport.natureProbleme.length > 2 && (
                          <span style={s.moreTag}>+{rapport.natureProbleme.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button style={s.viewButton}>
                    <Eye style={{ width: '16px', height: '16px' }} />
                    <span>Voir détails</span>
                    <ChevronRight style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              ))}
            </div>

            <div style={s.footer}>
              <button style={s.footerButton} onClick={handleClose}>
                Fermer
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={s.header}>
              <button 
                style={s.backButton}
                onClick={() => setSelectedRapport(null)}
              >
                <ChevronLeft style={{ width: '18px', height: '18px' }} />
                <span>Retour</span>
              </button>
              <button style={s.closeButton} onClick={handleClose}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={s.detailsBody}>
              <div style={s.section}>
                <h3 style={s.sectionTitle}>
                  <User style={{ width: '18px', height: '18px' }} />
                  Informations Générales
                </h3>
                <div style={s.detailGrid}>
                  <div style={s.detailItem}>
                    <span style={s.label}>Étudiant</span>
                    <span style={s.value}>{selectedRapport.etudiant?.nomComplet || 'N/A'}</span>
                  </div>
                  <div style={s.detailItem}>
                    <span style={s.label}>Niveau</span>
                    <span style={s.value}>{selectedRapport.niveau}</span>
                  </div>
                  <div style={s.detailItem}>
                    <span style={s.label}>Cours</span>
                    <span style={s.value}>{selectedRapport.cours}</span>
                  </div>
                  <div style={s.detailItem}>
                    <span style={s.label}>Date</span>
                    <span style={s.value}>
                      {new Date(selectedRapport.date).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  {selectedRapport.professeur && (
                    <div style={s.detailItem}>
                      <span style={s.label}>Professeur</span>
                      <span style={s.value}>
                        {selectedRapport.professeur.nom} {selectedRapport.professeur.prenom}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ Nouvelle section pour les contacts */}
              {(selectedRapport.etudiant?.telephonePere || selectedRapport.etudiant?.telephoneMere) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <User style={{ width: '18px', height: '18px' }} />
                    Contacts Parents
                  </h3>
                  <div style={s.detailGrid}>
                    {selectedRapport.etudiant?.telephonePere && (
                      <div style={s.detailItem}>
                        <span style={s.label}>Téléphone Père</span>
                        <a 
                          href={`tel:${selectedRapport.etudiant.telephonePere}`}
                          style={s.phoneLink}
                        >
                          {selectedRapport.etudiant.telephonePere}
                        </a>
                      </div>
                    )}
                    {selectedRapport.etudiant?.telephoneMere && (
                      <div style={s.detailItem}>
                        <span style={s.label}>Téléphone Mère</span>
                        <a 
                          href={`tel:${selectedRapport.etudiant.telephoneMere}`}
                          style={s.phoneLink}
                        >
                          {selectedRapport.etudiant.telephoneMere}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={s.section}>
                <h3 style={s.sectionTitle}>
                  <AlertTriangle style={{ width: '18px', height: '18px' }} />
                  Nature du Problème
                </h3>
                <div style={s.problemeTags}>
                  {selectedRapport.natureProbleme.map((nature, i) => (
                    <span 
                      key={i} 
                      style={{
                        ...s.problemeTag,
                        backgroundColor: `${getProblemeColor(nature)}30`,
                        color: getProblemeColor(nature),
                      }}
                    >
                      {nature}
                    </span>
                  ))}
                </div>
                {selectedRapport.autreProbleme && (
                  <p style={s.detailText}>
                    <strong>Autre :</strong> {selectedRapport.autreProbleme}
                  </p>
                )}
              </div>

              <div style={s.section}>
                <h3 style={s.sectionTitle}>
                  <FileText style={{ width: '18px', height: '18px' }} />
                  Description
                </h3>
                <p style={s.detailText}>{selectedRapport.descriptionIncident}</p>
              </div>

              <div style={s.section}>
                <h3 style={s.sectionTitle}>
                  <BookOpen style={{ width: '18px', height: '18px' }} />
                  Mesures Prises
                </h3>
                <div style={s.mesureTags}>
                  {selectedRapport.mesurePrise.map((mesure, i) => (
                    <span key={i} style={s.mesureTag}>{mesure}</span>
                  ))}
                </div>
                {selectedRapport.autreMesure && (
                  <p style={s.detailText}>
                    <strong>Autre :</strong> {selectedRapport.autreMesure}
                  </p>
                )}
              </div>

              {selectedRapport.observationProfesseur && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <FileText style={{ width: '18px', height: '18px' }} />
                    Observations
                  </h3>
                  <p style={s.detailText}>{selectedRapport.observationProfesseur}</p>
                </div>
              )}
            </div>

            <div style={s.footer}>
              <button 
                style={s.footerButtonSecondary}
                onClick={() => setSelectedRapport(null)}
              >
                Retour
              </button>
              <button style={s.footerButton} onClick={handleClose}>
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const s = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '16px',
    animation: 'fadeIn 0.2s ease-out'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    animation: 'slideUp 0.3s ease-out'
  },
  modalLoading: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #ef4444',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  header: {
    padding: '20px',
    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
    borderRadius: '12px 12px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  headerLeft: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flex: 1,
    minWidth: 0
  },
  alertIcon: {
    width: '40px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(254, 202, 202, 1)',
    margin: '4px 0 0 0'
  },
  closeButton: {
    width: '36px',
    height: '36px',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  backButton: {
    padding: '8px 14px',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  detailsBody: {
    flex: 1,
    overflow: 'auto',
    padding: '16px'
  },
  rapportCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  rapportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid #e5e7eb'
  },
  rapportNumber: {
    padding: '6px 12px',
    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600'
  },
  rapportTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  rapportRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  icon: {
    width: '16px',
    height: '16px',
    color: '#ef4444',
    marginTop: '2px',
    flexShrink: 0
  },
  rapportInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0
  },
  label: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  value: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
    wordBreak: 'break-word'
  },
  problemeTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  problemeTag: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600'
  },
  moreTag: {
    padding: '4px 10px',
    background: '#e5e7eb',
    color: '#6b7280',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600'
  },
  viewButton: {
    width: '100%',
    padding: '10px',
    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    marginTop: '12px'
  },
  section: {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    margin: '8px 0',
    wordBreak: 'break-word'
  },
  mesureTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  mesureTag: {
    padding: '6px 12px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid #93c5fd'
  },
  footer: {
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '0 0 12px 12px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    borderTop: '1px solid #e5e7eb',
    flexWrap: 'wrap'
  },
  footerButton: {
    padding: '10px 20px',
    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  footerButtonSecondary: {
    padding: '10px 20px',
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

// Animations CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .modal {
      margin: 0 !important;
      max-width: 100% !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
    }
  }
`;
document.head.appendChild(style);

export default RapportNotificationModal;