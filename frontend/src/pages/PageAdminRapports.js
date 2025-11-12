// ============================================
// PAGE ADMIN - GestionRapports.jsx (COMPLET AVEC PDF)
// ============================================
import React, { useEffect, useState } from 'react';
import { 
  FileText,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Calendar,
  User,
  BookOpen,
  AlertTriangle,
  Shield,
  Clock,
  Search,
  Download,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SidebarAdmin from '../components/Sidebar';

const GestionRapports = () => {
  const [rapports, setRapports] = useState([]);
  const [rapportsFiltres, setRapportsFiltres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Filtres
  const [filters, setFilters] = useState({
    statut: '',
    cours: '',
    dateDebut: '',
    dateFin: '',
    search: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchRapports();
    fetchStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, rapports]);

  const fetchRapports = async () => {
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (!token || role !== 'admin') {
        navigate('/');
        return;
      }

      const res = await axios.get('/api/rapports/admin/rapports', {
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

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.get('/api/rapports/admin/rapports/stats/general', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(res.data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...rapports];

    if (filters.statut) {
      filtered = filtered.filter(r => r.statut === filters.statut);
    }

    if (filters.cours) {
      filtered = filtered.filter(r => 
        r.cours.toLowerCase().includes(filters.cours.toLowerCase())
      );
    }

    if (filters.dateDebut) {
      filtered = filtered.filter(r => 
        new Date(r.date) >= new Date(filters.dateDebut)
      );
    }
    if (filters.dateFin) {
      filtered = filtered.filter(r => 
        new Date(r.date) <= new Date(filters.dateFin)
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.etudiant?.nomComplet?.toLowerCase().includes(searchLower) ||
        r.professeur?.nom?.toLowerCase().includes(searchLower) ||
        r.professeur?.prenom?.toLowerCase().includes(searchLower) ||
        r.descriptionIncident?.toLowerCase().includes(searchLower)
      );
    }

    setRapportsFiltres(filtered);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const handleVisa = async (rapportId, visa) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `/api/rapports/admin/rapports/${rapportId}/visa`,
        { visaDirection: visa },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('visa_success');
      fetchRapports();
      fetchStats();
      setShowModal(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur visa:', error);
      setMessage('error');
    }
  };

  const handleChangeStatut = async (rapportId, newStatut) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `/api/rapports/admin/rapports/${rapportId}/statut`,
        { statut: newStatut },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('statut_success');
      fetchRapports();
      fetchStats();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur statut:', error);
      setMessage('error');
    }
  };

  const handleDelete = async (rapportId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `/api/rapports/admin/rapports/${rapportId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('delete_success');
      fetchRapports();
      fetchStats();
      setShowModal(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur suppression:', error);
      setMessage('error');
    }
  };

  const downloadPDF = async (rapport) => {
    setIsDownloading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Appel API pour générer le PDF
      const res = await axios.post(
        `/api/rapports/admin/rapports/${rapport._id}/generate-pdf`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Nom du fichier avec date et étudiant
      const date = new Date(rapport.date).toLocaleDateString('fr-FR').replace(/\//g, '-');
      const filename = `Rapport_${rapport.etudiant?.nomComplet || 'Etudiant'}_${date}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('download_success');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      setMessage('error_download');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAllPDFs = async () => {
    if (rapportsFiltres.length === 0) {
      alert('Aucun rapport à télécharger');
      return;
    }

    if (!window.confirm(`Télécharger ${rapportsFiltres.length} rapport(s) en PDF ?`)) {
      return;
    }

    setIsDownloading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Créer un tableau avec les IDs des rapports filtrés
      const rapportIds = rapportsFiltres.map(r => r._id);
      
      const res = await axios.post(
        '/api/rapports/admin/rapports/download-multiple',
        { rapportIds },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Télécharger le ZIP
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      link.setAttribute('download', `Rapports_${date}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('download_all_success');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur téléchargement multiple:', error);
      setMessage('error_download');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsDownloading(false);
    }
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatutBadge = (statut) => {
    const config = {
      'en_attente': { bg: '#fef3c7', color: '#92400e', text: 'En attente', icon: Clock },
      'traite': { bg: '#dcfce7', color: '#166534', text: 'Traité', icon: CheckCircle },
      'archive': { bg: '#f3f4f6', color: '#6b7280', text: 'Archivé', icon: FileText }
    };
    
    const conf = config[statut] || config['en_attente'];
    const Icon = conf.icon;
    
    return (
      <div style={{
        ...s.badge,
        backgroundColor: conf.bg,
        color: conf.color,
        border: `1px solid ${conf.color}30`
      }}>
        <Icon style={s.badgeIcon} />
        {conf.text}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={s.container}>
        <SidebarAdmin onLogout={handleLogout} />
        <div style={s.loadingContainer}>
          <div style={s.spinner} />
          <p style={s.loadingText}>Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <SidebarAdmin onLogout={handleLogout} />

      <div style={s.header}>
        <div style={s.headerContent}>
          <h1 style={s.title}>Gestion des Rapports Disciplinaires</h1>
          <div style={s.headerActions}>
            <button 
              style={s.refreshButton}
              onClick={() => {
                fetchRapports();
                fetchStats();
              }}
              title="Actualiser"
            >
              <RefreshCw style={s.refreshIcon} />
            </button>
            <button
              style={{
                ...s.downloadAllButton,
                opacity: isDownloading ? 0.6 : 1,
                cursor: isDownloading ? 'not-allowed' : 'pointer'
              }}
              onClick={downloadAllPDFs}
              disabled={isDownloading || rapportsFiltres.length === 0}
            >
              {isDownloading ? (
                <>
                  <div style={s.smallSpinner} />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Download style={s.downloadAllIcon} />
                  Télécharger Tous ({rapportsFiltres.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div style={s.mainContent}>
        {/* Statistiques */}
        {stats && (
          <div style={s.statsContainer}>
            <div style={s.statCard}>
              <div style={{...s.statIcon, backgroundColor: '#dbeafe'}}>
                <FileText style={{width: '24px', height: '24px', color: '#1e40af'}} />
              </div>
              <div>
                <div style={s.statValue}>{stats.total}</div>
                <div style={s.statLabel}>Total Rapports</div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={{...s.statIcon, backgroundColor: '#fef3c7'}}>
                <Clock style={{width: '24px', height: '24px', color: '#92400e'}} />
              </div>
              <div>
                <div style={s.statValue}>{stats.parStatut.enAttente}</div>
                <div style={s.statLabel}>En Attente</div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={{...s.statIcon, backgroundColor: '#dcfce7'}}>
                <CheckCircle style={{width: '24px', height: '24px', color: '#166534'}} />
              </div>
              <div>
                <div style={s.statValue}>{stats.parStatut.traites}</div>
                <div style={s.statLabel}>Traités</div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={{...s.statIcon, backgroundColor: '#f3f4f6'}}>
                <BarChart3 style={{width: '24px', height: '24px', color: '#6b7280'}} />
              </div>
              <div>
                <div style={s.statValue}>{stats.parStatut.archives}</div>
                <div style={s.statLabel}>Archivés</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div style={s.filtersCard}>
          <div style={s.filtersHeader}>
            <Filter style={s.filterIcon} />
            <h3 style={s.filtersTitle}>Filtres de Recherche</h3>
          </div>

          <div style={s.filtersGrid}>
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>
                <Search style={s.filterLabelIcon} />
                Recherche
              </label>
              <input
                type="text"
                style={s.filterInput}
                placeholder="Étudiant, professeur, description..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>
                <Shield style={s.filterLabelIcon} />
                Statut
              </label>
              <select
                style={s.filterSelect}
                value={filters.statut}
                onChange={(e) => setFilters({...filters, statut: e.target.value})}
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="traite">Traité</option>
                <option value="archive">Archivé</option>
              </select>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>
                <BookOpen style={s.filterLabelIcon} />
                Cours
              </label>
              <input
                type="text"
                style={s.filterInput}
                placeholder="Nom du cours..."
                value={filters.cours}
                onChange={(e) => setFilters({...filters, cours: e.target.value})}
              />
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>
                <Calendar style={s.filterLabelIcon} />
                Date début
              </label>
              <input
                type="date"
                style={s.filterInput}
                value={filters.dateDebut}
                onChange={(e) => setFilters({...filters, dateDebut: e.target.value})}
              />
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>
                <Calendar style={s.filterLabelIcon} />
                Date fin
              </label>
              <input
                type="date"
                style={s.filterInput}
                value={filters.dateFin}
                onChange={(e) => setFilters({...filters, dateFin: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Liste des rapports */}
        <div style={s.rapportsCard}>
          <div style={s.rapportsHeader}>
            <h3 style={s.rapportsTitle}>
              <FileText style={s.rapportsIcon} />
              Rapports ({rapportsFiltres.length})
            </h3>
          </div>

          {rapportsFiltres.length === 0 ? (
            <div style={s.emptyState}>
              <FileText style={s.emptyIcon} />
              <p style={s.emptyText}>Aucun rapport trouvé</p>
            </div>
          ) : (
            <div style={s.rapportsList}>
              {rapportsFiltres.map(rapport => (
                <div key={rapport._id} style={s.rapportCard}>
                  <div style={s.rapportHeader}>
                    <div style={s.rapportInfo}>
                      <div style={s.rapportDate}>
                        <Calendar style={s.rapportDateIcon} />
                        {formatDate(rapport.date)}
                      </div>
                      {getStatutBadge(rapport.statut)}
                    </div>
                    <div style={s.rapportActions}>
                      <button
                        style={s.actionButton}
                        onClick={() => openModal(rapport)}
                        title="Voir détails"
                      >
                        <Eye style={s.actionIcon} />
                      </button>
                      <button
                        style={{...s.actionButton, backgroundColor: '#dbeafe'}}
                        onClick={() => downloadPDF(rapport)}
                        disabled={isDownloading}
                        title="Télécharger PDF"
                      >
                        <Download style={s.actionIcon} />
                      </button>
                      <button
                        style={{...s.actionButton, backgroundColor: '#fee2e2'}}
                        onClick={() => handleDelete(rapport._id)}
                        title="Supprimer"
                      >
                        <Trash2 style={s.actionIcon} />
                      </button>
                    </div>
                  </div>

                  <div style={s.rapportContent}>
                    <div style={s.rapportRow}>
                      <User style={s.rapportIcon} />
                      <div>
                        <div style={s.rapportLabel}>Étudiant</div>
                        <div style={s.rapportValue}>
                          {rapport.etudiant?.nomComplet} - {rapport.niveau}
                        </div>
                      </div>
                    </div>

                    <div style={s.rapportRow}>
                      <User style={s.rapportIcon} />
                      <div>
                        <div style={s.rapportLabel}>Professeur</div>
                        <div style={s.rapportValue}>
                          {rapport.professeur?.nom} {rapport.professeur?.prenom}
                        </div>
                      </div>
                    </div>

                    <div style={s.rapportRow}>
                      <BookOpen style={s.rapportIcon} />
                      <div>
                        <div style={s.rapportLabel}>Cours</div>
                        <div style={s.rapportValue}>{rapport.cours}</div>
                      </div>
                    </div>

                    <div style={s.rapportRow}>
                      <AlertTriangle style={s.rapportIcon} />
                      <div>
                        <div style={s.rapportLabel}>Nature du problème</div>
                        <div style={s.natureTags}>
                          {rapport.natureProbleme.map((nature, i) => (
                            <span key={i} style={s.natureTag}>{nature}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={s.rapportFooter}>
                    <select
                      style={s.statutSelect}
                      value={rapport.statut}
                      onChange={(e) => handleChangeStatut(rapport._id, e.target.value)}
                    >
                      <option value="en_attente">En attente</option>
                      <option value="traite">Traité</option>
                      <option value="archive">Archivé</option>
                    </select>

                    {!rapport.visaDirection ? (
                      <button
                        style={s.visaButton}
                        onClick={() => handleVisa(rapport._id, true)}
                      >
                        <Shield style={s.visaIcon} />
                        Apposer le Visa
                      </button>
                    ) : (
                      <div style={s.visaBadge}>
                        <CheckCircle style={s.visaBadgeIcon} />
                        Visa apposé le {new Date(rapport.dateVisa).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        {message && (
          <div style={{
            ...s.messageContainer,
            backgroundColor: 
              message.includes('success') ? '#dcfce7' : '#fee2e2',
            borderColor: 
              message.includes('success') ? '#16a34a' : '#dc2626',
            color: 
              message.includes('success') ? '#166534' : '#991b1b'
          }}>
            {message.includes('success') ? (
              <>
                <CheckCircle style={s.messageIcon} />
                {message === 'visa_success' && 'Visa apposé avec succès'}
                {message === 'statut_success' && 'Statut mis à jour'}
                {message === 'delete_success' && 'Rapport supprimé'}
                {message === 'download_success' && 'PDF téléchargé avec succès'}
                {message === 'download_all_success' && 'Tous les PDF téléchargés'}
              </>
            ) : (
              <>
                <XCircle style={s.messageIcon} />
                {message === 'error_download' ? 'Erreur lors du téléchargement' : 'Une erreur est survenue'}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {showModal && selectedRapport && (
        <div style={s.modalOverlay} onClick={closeModal}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Détails du Rapport</h2>
              <button style={s.modalClose} onClick={closeModal}>×</button>
            </div>

            <div style={s.modalBody}>
              <div style={s.modalSection}>
                <h4 style={s.modalSectionTitle}>Informations générales</h4>
                <div style={s.modalGrid}>
                  <div style={s.modalField}>
                    <span style={s.modalFieldLabel}>Date :</span>
                    <span style={s.modalFieldValue}>{formatDate(selectedRapport.date)}</span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.modalFieldLabel}>Statut :</span>
                    {getStatutBadge(selectedRapport.statut)}
                  </div>
                  <div style={s.modalField}>
                    <span style={s.modalFieldLabel}>Étudiant :</span>
                    <span style={s.modalFieldValue}>
                      {selectedRapport.etudiant?.nomComplet}
                    </span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.modalFieldLabel}>Niveau :</span>
                    <span style={s.modalFieldValue}>{selectedRapport.niveau}</span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.modalFieldLabel}>Professeur :</span>
                    <span style={s.modalFieldValue}>
                      {selectedRapport.professeur?.nom} {selectedRapport.professeur?.prenom}
                    </span>
                  </div>
                  <div style={s.modalField}>
                    <span style={s.modalFieldLabel}>Cours :</span>
                    <span style={s.modalFieldValue}>{selectedRapport.cours}</span>
                  </div>
                </div>
              </div>

              <div style={s.modalSection}>
                <h4 style={s.modalSectionTitle}>Nature du problème</h4>
                <div style={s.natureTags}>
                  {selectedRapport.natureProbleme.map((nature, i) => (
                    <span key={i} style={s.natureTag}>{nature}</span>
                  ))}
                </div>
                {selectedRapport.autreProbleme && (
                  <p style={s.modalText}><strong>Autre :</strong> {selectedRapport.autreProbleme}</p>
                )}
              </div>

              <div style={s.modalSection}>
                <h4 style={s.modalSectionTitle}>Description de l'incident</h4>
                <p style={s.modalText}>{selectedRapport.descriptionIncident}</p>
              </div>

              <div style={s.modalSection}>
                <h4 style={s.modalSectionTitle}>Mesures prises</h4>
                <div style={s.natureTags}>
                  {selectedRapport.mesurePrise.map((mesure, i) => (
                    <span key={i} style={{...s.natureTag, backgroundColor: '#dbeafe', color: '#1e40af'}}>
                      {mesure}
                    </span>
                  ))}
                </div>
                {selectedRapport.autreMesure && (
                  <p style={s.modalText}><strong>Autre :</strong> {selectedRapport.autreMesure}</p>
                )}
              </div>

              {selectedRapport.observationProfesseur && (
                <div style={s.modalSection}>
                  <h4 style={s.modalSectionTitle}>Observations du professeur</h4>
                  <p style={s.modalText}>{selectedRapport.observationProfesseur}</p>
                </div>
              )}

              <div style={s.modalSection}>
                <h4 style={s.modalSectionTitle}>Visa de la direction</h4>
                {selectedRapport.visaDirection ? (
                  <div style={s.visaBadge}>
                    <CheckCircle style={s.visaBadgeIcon} />
                    Visa apposé le {new Date(selectedRapport.dateVisa).toLocaleDateString('fr-FR')}
                  </div>
                ) : (
                  <button
                    style={s.visaButton}
                    onClick={() => handleVisa(selectedRapport._id, true)}
                  >
                    <Shield style={s.visaIcon} />
                    Apposer le Visa
                  </button>
                )}
              </div>

              <div style={s.modalActions}>
                <button
                  style={s.downloadButton}
                  onClick={() => downloadPDF(selectedRapport)}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <div style={s.smallSpinner} />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Download style={s.downloadButtonIcon} />
                      Télécharger PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(229, 231, 235, 0.6)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    padding: '10px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  refreshIcon: {
    width: '20px',
    height: '20px',
    color: '#374151'
  },
  downloadAllButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    transition: 'transform 0.2s'
  },
  downloadAllIcon: {
    width: '18px',
    height: '18px'
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(59, 130, 246, 0.3)',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(229, 231, 235, 0.5)'
  },
  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px'
  },
  filtersCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(229, 231, 235, 0.5)'
  },
  filtersHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  filterIcon: {
    width: '20px',
    height: '20px',
    color: '#3b82f6'
  },
  filtersTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151'
  },
  filterLabelIcon: {
    width: '14px',
    height: '14px',
    color: '#3b82f6'
  },
  filterInput: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  filterSelect: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  rapportsCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(229, 231, 235, 0.5)'
  },
  rapportsHeader: {
    marginBottom: '20px'
  },
  rapportsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  rapportsIcon: {
    width: '24px',
    height: '24px',
    color: '#dc2626'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#9ca3af'
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 16px',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '16px',
    margin: 0
  },
  rapportsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  rapportCard: {
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.2s'
  },
  rapportHeader: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rapportInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  rapportDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  rapportDateIcon: {
    width: '16px',
    height: '16px'
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid'
  },
  badgeIcon: {
    width: '14px',
    height: '14px'
  },
  rapportActions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    padding: '8px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionIcon: {
    width: '18px',
    height: '18px',
    color: '#374151'
  },
  rapportContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  rapportRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  rapportIcon: {
    width: '20px',
    height: '20px',
    color: '#9ca3af',
    marginTop: '2px',
    flexShrink: 0
  },
  rapportLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  rapportValue: {
    fontSize: '15px',
    color: '#1f2937',
    fontWeight: '500'
  },
  natureTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  natureTag: {
    padding: '4px 12px',
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid #fde68a'
  },
  rapportFooter: {
    padding: '16px 20px',
    background: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  statutSelect: {
    padding: '8px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  visaButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #059669, #047857)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
    transition: 'transform 0.2s'
  },
  visaIcon: {
    width: '16px',
    height: '16px'
  },
  visaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid #bbf7d0'
  },
  visaBadgeIcon: {
    width: '16px',
    height: '16px'
  },
  messageContainer: {
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
    zIndex: 1000
  },
  messageIcon: {
    width: '20px',
    height: '20px',
    flexShrink: 0
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
    padding: '20px'
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: '16px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  modalHeader: {
    padding: '24px 32px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  modalClose: {
    width: '36px',
    height: '36px',
    border: 'none',
    background: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  modalBody: {
    padding: '32px',
    overflowY: 'auto',
    flex: 1
  },
  modalSection: {
    marginBottom: '28px',
    paddingBottom: '28px',
    borderBottom: '1px solid #f3f4f6'
  },
  modalSectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px'
  },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  modalFieldLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  modalFieldValue: {
    fontSize: '15px',
    color: '#1f2937',
    fontWeight: '500'
  },
  modalText: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
    margin: '8px 0'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    paddingTop: '20px'
  },
  downloadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    transition: 'transform 0.2s'
  },
  downloadButtonIcon: {
    width: '20px',
    height: '20px'
  }
};

export default GestionRapports;