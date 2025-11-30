import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle, 
  User, 
  BookOpen,
  Calendar,
  MessageSquare,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';

const AdminReclamations = () => {
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({});
  
  // Filtres
  const [filtres, setFiltres] = useState({
    recherche: '',
    statut: '',
    priorite: '',
    cours: '',
    professeur: '',
    etudiant: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchReclamations();
    fetchStats();
  }, [filtres, pagination.current]);

  const fetchReclamations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 20,
        ...Object.fromEntries(Object.entries(filtres).filter(([_, v]) => v))
      });

      const res = await fetch(`/api/admin/reclamations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur lors du chargement');

      const data = await res.json();
      setReclamations(data.reclamations);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err) {
      setError('Erreur lors du chargement des réclamations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/reclamations/stats/detailed', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const statsData = await res.json();
        setStats(prev => ({ ...prev, ...statsData }));
      }
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  const traiterReclamation = async (id, statut, commentaire = '') => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/reclamations/${id}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ statut, commentaireAdmin: commentaire })
      });

      if (!res.ok) throw new Error('Erreur lors du traitement');

      const data = await res.json();
      setReclamations(prev => prev.map(r => r._id === id ? data.reclamation : r));
      setSelectedReclamation(data.reclamation);
      fetchStats();
    } catch (err) {
      setError('Erreur lors du traitement de la réclamation');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const validerReclamation = async (id) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/reclamations/${id}/valider`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Erreur lors de la validation');
      const data = await res.json();
      setReclamations(prev => prev.map(r => r._id === id ? data.reclamation : r));
      setSelectedReclamation(data.reclamation);
      alert('Réclamation validée avec succès ! Message WhatsApp envoyé.');
      fetchStats();
    } catch (err) {
      setError('Erreur lors de la validation de la réclamation');
      console.error(err);
      alert('Erreur lors de l\'envoi du message WhatsApp');
    } finally {
      setUpdating(false);
    }
  };

  const exportExcel = () => {
    const data = reclamations.map(r => ({
      'Date création': new Date(r.createdAt).toLocaleDateString('fr-FR'),
      'Professeur': r.professeur?.nomComplet || 'N/A',
      'Étudiant': r.etudiant?.nomComplet || 'N/A',
      'Cours': r.cours,
      'Type': r.typeReclamation,
      'Priorité': r.priorite,
      'Statut': r.statut,
      'Date incident': new Date(r.dateIncident).toLocaleDateString('fr-FR'),
      'Description': r.description || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Réclamations');
    XLSX.writeFile(wb, `reclamations_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getPrioriteColor = (priorite) => {
    const colors = {
      'Faible': '#10b981',
      'Moyenne': '#f59e0b',
      'Élevée': '#f97316',
      'Urgente': '#ef4444'
    };
    return colors[priorite] || '#6b7280';
  };

  const getStatutColor = (statut) => {
    const colors = {
      'En attente': '#6b7280',
      'En cours de traitement': '#f59e0b',
      'Résolue': '#10b981',
      'Fermée': '#374151'
    };
    return colors[statut] || '#6b7280';
  };

  const resetFiltres = () => {
    setFiltres({
      recherche: '',
      statut: '',
      priorite: '',
      cours: '',
      professeur: '',
      etudiant: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  if (loading && reclamations.length === 0) {
    return (
      <div style={styles.container}>
        <Sidebar onLogout={handleLogout} />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement des réclamations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar onLogout={handleLogout} />
      
      {/* Header avec statistiques */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>
              <AlertTriangle size={32} color="#ef4444" />
              Gestion des Réclamations
            </h1>
            <p style={styles.subtitle}>
              {pagination.total} réclamation{pagination.total > 1 ? 's' : ''} au total
            </p>
          </div>
          
          {/* Statistiques rapides */}
          <div style={styles.statsRow}>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #6b7280' }}>
              <div style={styles.statNumber}>{stats.enAttente || 0}</div>
              <div style={styles.statLabel}>En attente</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
              <div style={styles.statNumber}>{stats.enCours || 0}</div>
              <div style={styles.statLabel}>En cours</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
              <div style={styles.statNumber}>{stats.resolues || 0}</div>
              <div style={styles.statLabel}>Résolues</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #ef4444' }}>
              <div style={styles.statNumber}>{stats.urgentes || 0}</div>
              <div style={styles.statLabel}>Urgentes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={styles.filtersSection}>
        <div style={styles.filtersContainer}>
          <div style={styles.filtersGrid}>
            <div style={styles.searchContainer}>
              <Search size={20} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={filtres.recherche}
                onChange={(e) => setFiltres(prev => ({ ...prev, recherche: e.target.value }))}
                style={styles.searchInput}
              />
            </div>
            
            <select
              value={filtres.statut}
              onChange={(e) => setFiltres(prev => ({ ...prev, statut: e.target.value }))}
              style={styles.select}
            >
              <option value="">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="En cours de traitement">En cours</option>
              <option value="Résolue">Résolue</option>
              <option value="Fermée">Fermée</option>
            </select>

            <select
              value={filtres.priorite}
              onChange={(e) => setFiltres(prev => ({ ...prev, priorite: e.target.value }))}
              style={styles.select}
            >
              <option value="">Toutes priorités</option>
              <option value="Faible">Faible</option>
              <option value="Moyenne">Moyenne</option>
              <option value="Élevée">Élevée</option>
              <option value="Urgente">Urgente</option>
            </select>

            <input
              type="text"
              placeholder="Cours..."
              value={filtres.cours}
              onChange={(e) => setFiltres(prev => ({ ...prev, cours: e.target.value }))}
              style={styles.input}
            />

            <input
              type="text"
              placeholder="Professeur..."
              value={filtres.professeur}
              onChange={(e) => setFiltres(prev => ({ ...prev, professeur: e.target.value }))}
              style={styles.input}
            />

            <div style={styles.actionButtons}>
              <button onClick={resetFiltres} style={styles.resetButton}>
                <Filter size={16} />
                Réinitialiser
              </button>
              <button onClick={exportExcel} style={styles.exportButton}>
                <Download size={16} />
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div style={styles.errorMessage}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Liste des réclamations */}
      <div style={styles.mainContent}>
        {reclamations.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={64} color="#d1d5db" />
            <h3>Aucune réclamation trouvée</h3>
            <p>Il n'y a pas de réclamations correspondant aux critères sélectionnés.</p>
          </div>
        ) : (
          <div style={styles.reclamationsGrid}>
            {reclamations.map((reclamation) => (
              <div key={reclamation._id} style={styles.reclamationCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderLeft}>
                    <span style={{
                      ...styles.prioriteBadge,
                      backgroundColor: `${getPrioriteColor(reclamation.priorite)}20`,
                      color: getPrioriteColor(reclamation.priorite),
                      border: `1px solid ${getPrioriteColor(reclamation.priorite)}40`
                    }}>
                      {reclamation.priorite}
                    </span>
                    <span style={{
                      ...styles.statutBadge,
                      backgroundColor: `${getStatutColor(reclamation.statut)}20`,
                      color: getStatutColor(reclamation.statut),
                      border: `1px solid ${getStatutColor(reclamation.statut)}40`
                    }}>
                      {reclamation.statut}
                    </span>
                  </div>
                  <div style={styles.cardDate}>
                    {new Date(reclamation.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                <div style={styles.cardContent}>
                  <h3 style={styles.reclamationType}>{reclamation.typeReclamation}</h3>
                  
                  <div style={styles.cardInfo}>
                    <div style={styles.infoRow}>
                      <User size={16} color="#6b7280" />
                      <span>Prof: {reclamation.professeur?.nomComplet || 'N/A'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <User size={16} color="#6b7280" />
                      <span>Étudiant: {reclamation.etudiant?.nomComplet || 'N/A'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <BookOpen size={16} color="#6b7280" />
                      <span>Cours: {reclamation.cours}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <Calendar size={16} color="#6b7280" />
                      <span>Incident: {new Date(reclamation.dateIncident).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  {reclamation.description && (
                    <div style={styles.description}>
                      <MessageSquare size={16} color="#6b7280" />
                      <span>{reclamation.description}</span>
                    </div>
                  )}
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => {
                      setSelectedReclamation(reclamation);
                      setShowModal(true);
                    }}
                    style={styles.viewButton}
                  >
                    <Eye size={16} />
                    Détails
                  </button>
                  
                  {reclamation.statut === 'En attente' && (
                    <>
                      <button
                        onClick={() => traiterReclamation(reclamation._id, 'En cours de traitement')}
                        disabled={updating}
                        style={styles.processButton}
                      >
                        <Clock size={16} />
                        Traiter
                      </button>
                      <button
                        onClick={() => validerReclamation(reclamation._id)}
                        disabled={updating}
                        style={styles.validateButton}
                      >
                        <CheckCircle size={16} />
                        Valider
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={styles.pagination}>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setPagination(prev => ({ ...prev, current: page }))}
                style={{
                  ...styles.pageButton,
                  ...(page === pagination.current ? styles.pageButtonActive : {})
                }}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {showModal && selectedReclamation && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Détails de la réclamation</h2>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <XCircle size={24} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                <div>
                  <strong>Type:</strong>
                  <p>{selectedReclamation.typeReclamation}</p>
                </div>
                <div>
                  <strong>Priorité:</strong>
                  <span style={{
                    ...styles.prioriteBadge,
                    backgroundColor: `${getPrioriteColor(selectedReclamation.priorite)}20`,
                    color: getPrioriteColor(selectedReclamation.priorite),
                    border: `1px solid ${getPrioriteColor(selectedReclamation.priorite)}40`
                  }}>
                    {selectedReclamation.priorite}
                  </span>
                </div>
                <div>
                  <strong>Statut:</strong>
                  <span style={{
                    ...styles.statutBadge,
                    backgroundColor: `${getStatutColor(selectedReclamation.statut)}20`,
                    color: getStatutColor(selectedReclamation.statut),
                    border: `1px solid ${getStatutColor(selectedReclamation.statut)}40`
                  }}>
                    {selectedReclamation.statut}
                  </span>
                </div>
                <div>
                  <strong>Professeur:</strong>
                  <p>{selectedReclamation.professeur?.nomComplet}</p>
                  <small>{selectedReclamation.professeur?.email}</small>
                </div>
                <div>
                  <strong>Étudiant:</strong>
                  <p>{selectedReclamation.etudiant?.nomComplet}</p>
                  <small>{selectedReclamation.etudiant?.email} - {selectedReclamation.etudiant?.niveau}</small>
                </div>
                <div>
                  <strong>Cours:</strong>
                  <p>{selectedReclamation.cours}</p>
                </div>
                <div>
                  <strong>Date incident:</strong>
                  <p>{new Date(selectedReclamation.dateIncident).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <strong>Date création:</strong>
                  <p>{new Date(selectedReclamation.createdAt).toLocaleDateString('fr-FR')} à {new Date(selectedReclamation.createdAt).toLocaleTimeString('fr-FR')}</p>
                </div>
              </div>

              {selectedReclamation.description && (
                <div style={styles.fullDescription}>
                  <strong>Description:</strong>
                  <p>{selectedReclamation.description}</p>
                </div>
              )}

              {selectedReclamation.commentaireAdmin && (
                <div style={styles.adminComment}>
                  <strong>Commentaire admin:</strong>
                  <p>{selectedReclamation.commentaireAdmin}</p>
                  {selectedReclamation.dateTraitement && (
                    <small>Traité le {new Date(selectedReclamation.dateTraitement).toLocaleDateString('fr-FR')}</small>
                  )}
                </div>
              )}
            </div>

            {selectedReclamation.statut !== 'Fermée' && (
              <div style={styles.modalActions}>
                <div style={styles.commentaireSection}>
                  <textarea
                    placeholder="Commentaire (optionnel)..."
                    style={styles.commentaireTextarea}
                    id="commentaire"
                  />
                </div>
                
                <div style={styles.actionButtonsRow}>
                  {selectedReclamation.statut === 'En attente' && (
                    <>
                      <button
                        onClick={() => {
                          const commentaire = document.getElementById('commentaire').value;
                          traiterReclamation(selectedReclamation._id, 'En cours de traitement', commentaire);
                        }}
                        disabled={updating}
                        style={styles.processModalButton}
                      >
                        <Clock size={16} />
                        Prendre en charge
                      </button>
                      <button
                        onClick={() => validerReclamation(selectedReclamation._id)}
                        disabled={updating}
                        style={styles.validateModalButton}
                      >
                        <CheckCircle size={16} />
                        Valider & Notifier
                      </button>
                    </>
                  )}
                  {(selectedReclamation.statut === 'En attente' || selectedReclamation.statut === 'En cours de traitement') && (
                    <button
                      onClick={() => {
                        const commentaire = document.getElementById('commentaire').value;
                        traiterReclamation(selectedReclamation._id, 'Résolue', commentaire);
                      }}
                      disabled={updating}
                      style={styles.resolveButton}
                    >
                      <CheckCircle size={16} />
                      Résoudre
                    </button>
                  )}
                  {selectedReclamation.statut === 'Résolue' && (
                    <button
                      onClick={() => {
                        const commentaire = document.getElementById('commentaire').value;
                        traiterReclamation(selectedReclamation._id, 'Fermée', commentaire);
                      }}
                      disabled={updating}
                      style={styles.closeModalButton}
                    >
                      <XCircle size={16} />
                      Fermer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #ef4444',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '24px 0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
  },

  titleSection: {
    marginBottom: '24px',
  },

  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },

  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },

  statCard: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },

  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },

  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },

  filtersSection: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 0',
  },

  filtersContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    alignItems: 'center',
  },

  searchContainer: {
    position: 'relative',
    gridColumn: 'span 2',
  },

  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6b7280',
  },

  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  actionButtons: {
    display: 'flex',
    gap: '8px',
    gridColumn: 'span 2',
  },

  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  exportButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '16px auto',
    maxWidth: '1200px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: '8px',
  },

  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },

  reclamationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  },

  reclamationCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardHeaderLeft: {
    display: 'flex',
    gap: '8px',
  },

  prioriteBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },

  statutBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },

  cardDate: {
    fontSize: '12px',
    color: '#6b7280',
  },

  cardContent: {
    flex: 1,
  },

  reclamationType: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },

  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
  },

  description: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
  },

  cardActions: {
    display: 'flex',
    gap: '8px',
  },

  viewButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  processButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '32px',
  },

  pageButton: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },

  pageButtonActive: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderColor: '#ef4444',
  },

  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e2e8f0',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
  },

  modalBody: {
    padding: '24px',
  },

  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },

  fullDescription: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },

  adminComment: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bae6fd',
  },

  modalActions: {
    padding: '24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },

  commentaireSection: {
    marginBottom: '16px',
  },

  commentaireTextarea: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
  },

  actionButtonsRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },

  processModalButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  validateButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  validateModalButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  resolveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  closeModalButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}; export default AdminReclamations;