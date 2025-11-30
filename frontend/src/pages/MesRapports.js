// ============================================
// PAGE PROFESSEUR - MesRapports.jsx (Version Simple & Responsive)
// ============================================
import React, { useEffect, useState } from 'react';
import { 
  FileText,
  Calendar,
  User,
  BookOpen,
  AlertTriangle,
  Shield,
  Clock,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/SidebarProf';

const MesRapports = () => {
  const [rapports, setRapports] = useState([]);
  const [rapportsFiltres, setRapportsFiltres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchRapports();
  }, []);

  useEffect(() => {
    applySearch();
  }, [searchTerm, rapports]);

  const fetchRapports = async () => {
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (!token || role !== 'prof') {
        navigate('/');
        return;
      }

      const res = await axios.get('/api/rapports/professeur/mes-rapports', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });

      setRapports(res.data);
      setRapportsFiltres(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement rapports:', error);
      setMessage('error');
      setIsLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchTerm.trim()) {
      setRapportsFiltres(rapports);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = rapports.filter(r => 
      r.etudiant?.nomComplet?.toLowerCase().includes(searchLower) ||
      r.cours?.toLowerCase().includes(searchLower) ||
      r.niveau?.toLowerCase().includes(searchLower) ||
      r.descriptionIncident?.toLowerCase().includes(searchLower)
    );

    setRapportsFiltres(filtered);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const openModal = (rapport) => {
    setSelectedRapport(rapport);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRapport(null);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatutBadge = (statut) => {
    const config = {
      'en_attente': { bg: '#fef3c7', color: '#92400e', text: 'En attente' },
      'traite': { bg: '#dcfce7', color: '#166534', text: 'Traité' },
      'archive': { bg: '#f3f4f6', color: '#6b7280', text: 'Archivé' }
    };
    
    const conf = config[statut] || config['en_attente'];
    
    return (
      <span style={{
        ...s.badge,
        backgroundColor: conf.bg,
        color: conf.color
      }}>
        {conf.text}
      </span>
    );
  };

  const downloadPDF = async (rapportId) => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.get(
        `/api/rapports/professeur/rapports/${rapportId}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${rapportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('download_success');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      setMessage('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <div style={s.container}>
        <Sidebar onLogout={handleLogout} />
        <div style={s.mainContent}>
          <div style={s.loadingContainer}>
            <div style={s.spinner} />
            <p style={s.loadingText}>Chargement de vos rapports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <Sidebar onLogout={handleLogout} />

      <div style={s.mainContent}>
        {/* En-tête */}
        <div style={s.header}>
          <h1 style={s.title}>Mes Rapports</h1>
          <div style={s.statsRow}>
            <div style={s.statBadge}>
              <span style={s.statValue}>{rapports.length}</span>
              <span style={s.statLabel}>Total</span>
            </div>
            <div style={s.statBadge}>
              <span style={s.statValue}>
                {rapports.filter(r => r.statut === 'en_attente').length}
              </span>
              <span style={s.statLabel}>En attente</span>
            </div>
            <div style={s.statBadge}>
              <span style={s.statValue}>
                {rapports.filter(r => r.visaDirection).length}
              </span>
              <span style={s.statLabel}>Visés</span>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div style={s.searchContainer}>
          <Search style={s.searchIcon} />
          <input
            type="text"
            style={s.searchInput}
            placeholder="Rechercher un étudiant, cours, niveau..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Liste des rapports */}
        {rapportsFiltres.length === 0 ? (
          <div style={s.emptyState}>
            <FileText style={s.emptyIcon} />
            <p style={s.emptyText}>
              {rapports.length === 0 
                ? "Aucun rapport disponible"
                : "Aucun rapport ne correspond à votre recherche"}
            </p>
          </div>
        ) : (
          <div style={s.rapportsList}>
            {rapportsFiltres.map(rapport => (
              <div key={rapport._id} style={s.rapportCard}>
                {/* En-tête de la carte */}
                <div style={s.cardHeader}>
                  <div style={s.cardHeaderLeft}>
                    <Calendar style={s.cardIcon} />
                    <span style={s.cardDate}>{formatDate(rapport.date)}</span>
                  </div>
                  <div style={s.cardHeaderRight}>
                    {getStatutBadge(rapport.statut)}
                  </div>
                </div>

                {/* Corps de la carte */}
                <div style={s.cardBody}>
                  <div style={s.infoRow}>
                    <User style={s.infoIcon} />
                    <div style={s.infoContent}>
                      <span style={s.infoLabel}>Étudiant</span>
                      <span style={s.infoValue}>{rapport.etudiant?.nomComplet}</span>
                    </div>
                  </div>

                  <div style={s.infoRow}>
                    <BookOpen style={s.infoIcon} />
                    <div style={s.infoContent}>
                      <span style={s.infoLabel}>Cours - Niveau</span>
                      <span style={s.infoValue}>{rapport.cours} • {rapport.niveau}</span>
                    </div>
                  </div>

                  <div style={s.infoRow}>
                    <AlertTriangle style={s.infoIcon} />
                    <div style={s.infoContent}>
                      <span style={s.infoLabel}>Problème</span>
                      <div style={s.tags}>
                        {rapport.natureProbleme.slice(0, 2).map((nature, i) => (
                          <span key={i} style={s.tag}>{nature}</span>
                        ))}
                        {rapport.natureProbleme.length > 2 && (
                          <span style={s.tag}>+{rapport.natureProbleme.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {rapport.visaDirection && (
                    <div style={s.visaBadge}>
                      <Shield style={s.visaIcon} />
                      <span>Visa Direction</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={s.cardActions}>
                  <button
                    style={s.actionBtn}
                    onClick={() => openModal(rapport)}
                  >
                    <Eye style={s.actionIcon} />
                    <span>Détails</span>
                  </button>
                  <button
                    style={{...s.actionBtn, ...s.downloadBtn}}
                    onClick={() => downloadPDF(rapport._id)}
                  >
                    <Download style={s.actionIcon} />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message de notification */}
        {message && (
          <div style={{
            ...s.notification,
            backgroundColor: message.includes('success') ? '#dcfce7' : '#fee2e2',
            borderColor: message.includes('success') ? '#16a34a' : '#dc2626',
            color: message.includes('success') ? '#166534' : '#991b1b'
          }}>
            {message === 'download_success' ? (
              <>
                <CheckCircle style={s.notifIcon} />
                <span>PDF téléchargé avec succès</span>
              </>
            ) : (
              <>
                <XCircle style={s.notifIcon} />
                <span>Une erreur est survenue</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {showModal && selectedRapport && (
        <div style={s.modalOverlay} onClick={closeModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Détails du Rapport</h2>
              <button style={s.modalClose} onClick={closeModal}>×</button>
            </div>

            <div style={s.modalBody}>
              {/* Informations générales */}
              <div style={s.modalSection}>
                <h3 style={s.modalSectionTitle}>Informations générales</h3>
                <div style={s.modalGrid}>
                  <div style={s.modalField}>
                    <span style={s.fieldLabel}>Date</span>
                    <span style={s.fieldValue}>{formatDate(selectedRapport.date)}</span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.fieldLabel}>Statut</span>
                    {getStatutBadge(selectedRapport.statut)}
                  </div>
                  <div style={s.modalField}>
                    <span style={s.fieldLabel}>Étudiant</span>
                    <span style={s.fieldValue}>{selectedRapport.etudiant?.nomComplet}</span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.fieldLabel}>Niveau</span>
                    <span style={s.fieldValue}>{selectedRapport.niveau}</span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.fieldLabel}>Cours</span>
                    <span style={s.fieldValue}>{selectedRapport.cours}</span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.fieldLabel}>Année</span>
                    <span style={s.fieldValue}>{selectedRapport.anneeScolaire}</span>
                  </div>
                </div>
              </div>

              {/* Nature du problème */}
              <div style={s.modalSection}>
                <h3 style={s.modalSectionTitle}>Nature du problème</h3>
                <div style={s.tags}>
                  {selectedRapport.natureProbleme.map((nature, i) => (
                    <span key={i} style={s.tag}>{nature}</span>
                  ))}
                </div>
                {selectedRapport.autreProbleme && (
                  <p style={s.modalText}>
                    <strong>Autre :</strong> {selectedRapport.autreProbleme}
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={s.modalSection}>
                <h3 style={s.modalSectionTitle}>Description de l'incident</h3>
                <p style={s.modalText}>{selectedRapport.descriptionIncident}</p>
              </div>

              {/* Mesures prises */}
              <div style={s.modalSection}>
                <h3 style={s.modalSectionTitle}>Mesures prises</h3>
                <div style={s.tags}>
                  {selectedRapport.mesurePrise.map((mesure, i) => (
                    <span key={i} style={{...s.tag, backgroundColor: '#dbeafe', color: '#1e40af'}}>
                      {mesure}
                    </span>
                  ))}
                </div>
                {selectedRapport.autreMesure && (
                  <p style={s.modalText}>
                    <strong>Autre :</strong> {selectedRapport.autreMesure}
                  </p>
                )}
              </div>

              {/* Observations */}
              {selectedRapport.observationProfesseur && (
                <div style={s.modalSection}>
                  <h3 style={s.modalSectionTitle}>Observations</h3>
                  <p style={s.modalText}>{selectedRapport.observationProfesseur}</p>
                </div>
              )}

              {/* Visa */}
              <div style={s.modalSection}>
                <h3 style={s.modalSectionTitle}>Visa de la direction</h3>
                {selectedRapport.visaDirection ? (
                  <div style={s.visaBadge}>
                    <CheckCircle style={s.visaIcon} />
                    <span>Visa apposé le {formatDate(selectedRapport.dateVisa)}</span>
                  </div>
                ) : (
                  <div style={{...s.visaBadge, backgroundColor: '#fef3c7', color: '#92400e'}}>
                    <Clock style={s.visaIcon} />
                    <span>En attente du visa</span>
                  </div>
                )}
              </div>

              {/* Bouton téléchargement */}
              <button
                style={s.modalDownloadBtn}
                onClick={() => downloadPDF(selectedRapport._id)}
              >
                <Download style={s.actionIcon} />
                Télécharger en PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  mainContent: {
    flex: 1,
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#dc2626',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '24px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '20px',
    height: '20px',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: '14px 14px 14px 48px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.9)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(220, 38, 38, 0.3)',
    borderTop: '4px solid #dc2626',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '16px',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 16px',
    color: '#d1d5db',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  rapportsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  rapportCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid rgba(229, 231, 235, 0.5)',
  },
  cardHeader: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardIcon: {
    width: '16px',
    height: '16px',
    color: '#6b7280',
  },
  cardDate: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  cardHeaderRight: {
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  cardBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: '18px',
    height: '18px',
    color: '#9ca3af',
    marginTop: '2px',
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tag: {
    padding: '4px 10px',
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '500',
  },
  visaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
  },
  visaIcon: {
    width: '16px',
    height: '16px',
  },
  cardActions: {
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '10px',
  },
  actionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  downloadBtn: {
    background: '#dbeafe',
    color: '#1e40af',
  },
  actionIcon: {
    width: '18px',
    height: '18px',
  },
  notification: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid',
    fontSize: '15px',
    fontWeight: '500',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
  },
  notifIcon: {
    width: '20px',
    height: '20px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  modalClose: {
    width: '32px',
    height: '32px',
    border: 'none',
    background: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  modalSection: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #f3f4f6',
  },
  modalSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
  },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  fieldValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
  },
  modalText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    margin: '8px 0',
  },
  modalDownloadBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '16px',
  },
  // Media queries (à ajouter via styled-components ou CSS module)
  '@media (max-width: 768px)': {
    rapportsList: {
      gridTemplateColumns: '1fr',
    },
    mainContent: {
      padding: '16px',
    },
  }
};

// Animation du spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default MesRapports;