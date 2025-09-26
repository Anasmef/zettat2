import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  AlertTriangle, 
  User, 
  BookOpen,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  GraduationCap
} from 'lucide-react';
import SidebarProf from '../components/SidebarProf';
import * as XLSX from 'xlsx';

const ProfesseurReclamations = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la sélection de cours et filtres
  const [selectedCours, setSelectedCours] = useState('');
  const [filtres, setFiltres] = useState({
    recherche: '',
    statut: '',
    priorite: ''
  });
  
  // Formulaire de nouvelle réclamation
  const [formData, setFormData] = useState({
    typeReclamation: '',
    dateIncident: '',
    priorite: 'Moyenne',
    description: ''
  });

  // Fonction pour obtenir la date d'aujourd'hui au format YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialiser la date à aujourd'hui quand on ouvre le formulaire
  useEffect(() => {
    if (showForm && !formData.dateIncident) {
      setFormData(prev => ({ ...prev, dateIncident: getTodayDate() }));
    }
  }, [showForm]);

  const typesReclamation = [
    'Étudiant absent',
    'Mauvais comportement', 
    'Étudiant qui dort',
    'Retards répétés',
    'Non respect des règles',
    'Problème de discipline',
    'Travail non rendu',
    'Utilisation de téléphone',
    'Perturbation du cours',
    'Manque de respect',
    'Autre'
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  useEffect(() => {
    fetchEtudiants();
    if (selectedCours) {
      fetchReclamations();
    }
  }, [selectedCours]);

  const fetchEtudiants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/professeur/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur lors du chargement');

      const data = await res.json();
      setEtudiants(data.filter(e => e.autorise)); // Seulement les étudiants autorisés
    } catch (err) {
      setError('Erreur lors du chargement des étudiants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReclamations = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        cours: selectedCours,
        ...Object.fromEntries(Object.entries(filtres).filter(([_, v]) => v))
      });

      const res = await fetch(`/api/professeur/reclamations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setReclamations(data.reclamations || []);
      }
    } catch (err) {
      console.error('Erreur chargement réclamations:', err);
    }
  };

  const handleSubmitReclamation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const reclamationData = {
        etudiantId: selectedEtudiant._id,
        cours: selectedCours,
        ...formData
      };

      const res = await fetch('/api/professeur/reclamations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reclamationData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erreur lors de la création');
      }

      setShowForm(false);
      resetForm();
      fetchReclamations(); // Recharger les réclamations
      setError('Réclamation créée avec succès !');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      typeReclamation: '',
      dateIncident: getTodayDate(), // Réinitialiser à aujourd'hui
      priorite: 'Moyenne',
      description: ''
    });
    setSelectedEtudiant(null);
  };

  const exportExcel = () => {
    if (!selectedCours) return;
    
    const etudiantsCours = etudiants.filter(e => 
      e.cours && e.cours.includes(selectedCours)
    );
    
    const data = etudiantsCours.map(e => ({
      'Nom': e.nomComplet,
      'Niveau': e.niveau,
      'Code Massar': e.codeMassar || 'N/A',
      'Email': e.email || 'N/A',
      'Autorisé': e.autorise ? 'Oui' : 'Non',
      'Nombre de réclamations': reclamations.filter(r => r.etudiant?._id === e._id).length
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Étudiants ${selectedCours}`);
    XLSX.writeFile(wb, `etudiants_${selectedCours.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      priorite: ''
    });
  };

  // Obtenir les cours uniques du professeur
  const coursUniques = [...new Set(etudiants.flatMap(e => e.cours || []))].sort();

  // Filtrer les étudiants du cours sélectionné
  const etudiantsCours = selectedCours 
    ? etudiants.filter(e => e.cours && e.cours.includes(selectedCours))
    : [];

  // Appliquer les filtres de recherche
  const etudiantsFiltres = etudiantsCours.filter(e => {
    if (filtres.recherche) {
      return e.nomComplet.toLowerCase().includes(filtres.recherche.toLowerCase()) ||
             (e.codeMassar && e.codeMassar.toLowerCase().includes(filtres.recherche.toLowerCase()));
    }
    return true;
  });

  // Statistiques pour le cours sélectionné
  const stats = {
    totalEtudiants: etudiantsCours.length,
    reclamationsEnAttente: reclamations.filter(r => r.statut === 'En attente').length,
    reclamationsResolues: reclamations.filter(r => r.statut === 'Résolue').length,
    totalReclamations: reclamations.length
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <SidebarProf onLogout={handleLogout} />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <SidebarProf onLogout={handleLogout} />
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerTop}>
            <div>
              <h1 style={styles.title}>
                <AlertTriangle size={32} color="#f59e0b" />
                Gestion des Réclamations
              </h1>
              <p style={styles.subtitle}>
                Sélectionnez un cours pour voir vos étudiants et gérer les réclamations
              </p>
            </div>
            
            {/* Sélection de cours */}
            <div style={styles.coursSelection}>
              <label style={styles.coursLabel}>Cours:</label>
              <select
                value={selectedCours}
                onChange={(e) => setSelectedCours(e.target.value)}
                style={styles.coursSelect}
              >
                <option value="">Sélectionner un cours</option>
                {coursUniques.map(cours => (
                  <option key={cours} value={cours}>{cours}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Statistiques pour le cours sélectionné */}
          {selectedCours && (
            <div style={styles.statsRow}>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #3b82f6' }}>
                <div style={styles.statNumber}>{stats.totalEtudiants}</div>
                <div style={styles.statLabel}>Étudiants</div>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
                <div style={styles.statNumber}>{stats.totalReclamations}</div>
                <div style={styles.statLabel}>Réclamations</div>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #6b7280' }}>
                <div style={styles.statNumber}>{stats.reclamationsEnAttente}</div>
                <div style={styles.statLabel}>En attente</div>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
                <div style={styles.statNumber}>{stats.reclamationsResolues}</div>
                <div style={styles.statLabel}>Résolues</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section des filtres (visible seulement si un cours est sélectionné) */}
      {selectedCours && (
        <div style={styles.filtersSection}>
          <div style={styles.filtersContainer}>
            <div style={styles.filtersRow}>
              <div style={styles.searchContainer}>
                <Search size={20} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Rechercher un étudiant (nom, code massar)..."
                  value={filtres.recherche}
                  onChange={(e) => setFiltres(prev => ({ ...prev, recherche: e.target.value }))}
                  style={styles.searchInput}
                />
              </div>

              <div style={styles.actionButtons}>
                <button onClick={resetFiltres} style={styles.resetButton}>
                  <Filter size={16} />
                  Vider les filtres
                </button>
                <button onClick={exportExcel} style={styles.exportButton}>
                  <Download size={16} />
                  Exporter Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div style={{
          ...styles.errorMessage,
          backgroundColor: error.includes('succès') ? '#dcfce7' : '#fef2f2',
          color: error.includes('succès') ? '#166534' : '#991b1b',
          border: `1px solid ${error.includes('succès') ? '#bbf7d0' : '#fecaca'}`
        }}>
          {error.includes('succès') ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {error}
        </div>
      )}

      {/* Contenu principal */}
      <div style={styles.mainContent}>
        {!selectedCours ? (
          <div style={styles.emptyState}>
            <BookOpen size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>Sélectionnez un cours</h3>
            <p style={styles.emptyText}>
              Choisissez un cours dans la liste déroulante ci-dessus pour voir vos étudiants et gérer les réclamations.
            </p>
          </div>
        ) : etudiantsFiltres.length === 0 ? (
          <div style={styles.emptyState}>
            <User size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>Aucun étudiant trouvé</h3>
            <p style={styles.emptyText}>
              Il n'y a pas d'étudiants autorisés dans ce cours ou correspondant à votre recherche.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {etudiantsFiltres.map((etudiant) => {
              const reclamationsEtudiant = reclamations.filter(r => r.etudiant?._id === etudiant._id);
              const dernireReclamation = reclamationsEtudiant[0]; // La plus récente
              
              return (
                <div key={etudiant._id} style={styles.card}>
                  {/* Info étudiant */}
                  <div style={styles.studentInfo}>
                    <div style={styles.avatarContainer}>
                      {etudiant.image ? (
                        <img 
                          src={etudiant.image} 
                          alt={etudiant.nomComplet}
                          style={styles.avatar}
                        />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          <User size={24} color="#6b7280" />
                        </div>
                      )}
                    </div>
                    
                    <div style={styles.studentDetails}>
                      <h3 style={styles.studentName}>{etudiant.nomComplet}</h3>
                      
                      <div style={styles.infoRow}>
                        <GraduationCap size={16} color="#6b7280" />
                        <span style={styles.infoText}>Niveau: {etudiant.niveau}</span>
                      </div>
                      
                      {etudiant.codeMassar && (
                        <div style={styles.infoRow}>
                          <User size={16} color="#6b7280" />
                          <span style={styles.infoText}>Code: {etudiant.codeMassar}</span>
                        </div>
                      )}

                      <div style={styles.infoRow}>
                        <AlertTriangle size={16} color="#6b7280" />
                        <span style={styles.infoText}>
                          {reclamationsEtudiant.length} réclamation{reclamationsEtudiant.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dernière réclamation */}
                  {dernireReclamation && (
                    <div style={styles.lastReclamation}>
                      <div style={styles.reclamationHeader}>
                        <span style={{
                          ...styles.statutBadge,
                          backgroundColor: `${getStatutColor(dernireReclamation.statut)}20`,
                          color: getStatutColor(dernireReclamation.statut),
                          border: `1px solid ${getStatutColor(dernireReclamation.statut)}40`
                        }}>
                          {dernireReclamation.statut}
                        </span>
                        <span style={styles.reclamationDate}>
                          {new Date(dernireReclamation.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p style={styles.reclamationType}>
                        Dernière: {dernireReclamation.typeReclamation}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={styles.cardActions}>
                    <button
                      onClick={() => {
                        setSelectedEtudiant(etudiant);
                        setShowForm(true);
                      }}
                      style={styles.newReclamationButton}
                    >
                      <Plus size={16} />
                      Nouvelle réclamation
                    </button>
                    
                    {reclamationsEtudiant.length > 0 && (
                      <button
                        onClick={() => {
                          // Ici vous pourriez ouvrir une modal avec l'historique des réclamations
                          setSelectedEtudiant(etudiant);
                          setShowModal(true);
                        }}
                        style={styles.historyButton}
                      >
                        <Eye size={16} />
                        Historique ({reclamationsEtudiant.length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Formulaire nouvelle réclamation */}
      {showForm && selectedEtudiant && (
        <div style={styles.modal} onClick={() => setShowForm(false)}>
          <div style={styles.formModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Nouvelle réclamation - {selectedEtudiant.nomComplet}</h2>
              <button onClick={() => setShowForm(false)} style={styles.closeButton}>
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitReclamation} style={styles.form}>
              <div style={styles.studentInfoModal}>
                <p><strong>Cours:</strong> {selectedCours}</p>
                <p><strong>Étudiant:</strong> {selectedEtudiant.nomComplet} ({selectedEtudiant.niveau})</p>
                {selectedEtudiant.codeMassar && <p><strong>Code Massar:</strong> {selectedEtudiant.codeMassar}</p>}
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Type de réclamation *</label>
                  <select
                    value={formData.typeReclamation}
                    onChange={(e) => setFormData(prev => ({ ...prev, typeReclamation: e.target.value }))}
                    required
                    style={styles.select}
                  >
                    <option value="">Sélectionner un type</option>
                    {typesReclamation.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Date de l'incident *</label>
                  <input
                    type="date"
                    value={formData.dateIncident}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateIncident: e.target.value }))}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Priorité</label>
                  <select
                    value={formData.priorite}
                    onChange={(e) => setFormData(prev => ({ ...prev, priorite: e.target.value }))}
                    style={styles.select}
                  >
                    <option value="Faible">Faible</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Élevée">Élevée</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description (optionnelle)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez l'incident en détail..."
                  style={styles.textarea}
                  rows="4"
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelButton}>
                  Annuler
                </button>
                <button type="submit" disabled={submitting} style={styles.submitButton}>
                  {submitting ? (
                    <>
                      <div style={styles.miniSpinner}></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Créer la réclamation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal historique des réclamations */}
      {showModal && selectedEtudiant && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Historique - {selectedEtudiant.nomComplet}</h2>
              <button onClick={() => setShowModal(false)} style={styles.closeButton}>
                <XCircle size={24} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.reclamationsList}>
                {reclamations.filter(r => r.etudiant?._id === selectedEtudiant._id).map(reclamation => (
                  <div key={reclamation._id} style={styles.reclamationItem}>
                    <div style={styles.reclamationItemHeader}>
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
                      <span style={styles.reclamationDate}>
                        {new Date(reclamation.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <h4 style={styles.reclamationTitle}>{reclamation.typeReclamation}</h4>
                    <p style={styles.reclamationIncidentDate}>
                      Incident du {new Date(reclamation.dateIncident).toLocaleDateString('fr-FR')}
                    </p>
                    {reclamation.description && (
                      <p style={styles.reclamationDescription}>{reclamation.description}</p>
                    )}
                    {reclamation.commentaireAdmin && (
                      <div style={styles.adminComment}>
                        <strong>Commentaire admin:</strong> {reclamation.commentaireAdmin}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
    borderTop: '4px solid #f59e0b',
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

  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    gap: '24px',
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

  coursSelection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  coursLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },

  coursSelect: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '200px',
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

  filtersRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },

  searchContainer: {
    position: 'relative',
    flex: 1,
    maxWidth: '400px',
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

  actionButtons: {
    display: 'flex',
    gap: '8px',
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

  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '16px 0 8px 0',
  },

  emptyText: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  studentInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },

  avatarContainer: {
    flexShrink: 0,
  },

  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e2e8f0',
  },

  avatarPlaceholder: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: '2px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  studentDetails: {
    flex: 1,
    minWidth: 0,
  },

  studentName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
    wordWrap: 'break-word',
  },

  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
    fontSize: '14px',
    color: '#64748b',
  },

  infoText: {
    fontSize: '14px',
    color: '#64748b',
  },

  lastReclamation: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },

  reclamationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },

  reclamationType: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
  },

  reclamationDate: {
    fontSize: '12px',
    color: '#6b7280',
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

  cardActions: {
    display: 'flex',
    gap: '8px',
  },

  newReclamationButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1,
  },

  historyButton: {
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
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
  },

  formModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '600px',
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

  reclamationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  reclamationItem: {
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
  },

  reclamationItemHeader: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '8px',
  },

  reclamationTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },

  reclamationIncidentDate: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 8px 0',
  },

  reclamationDescription: {
    fontSize: '14px',
    color: '#374151',
    margin: '8px 0',
    padding: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
  },

  adminComment: {
    padding: '8px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#0c4a6e',
    marginTop: '8px',
  },

  form: {
    padding: '24px',
  },

  studentInfoModal: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '20px',
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
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

  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },

  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },

  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  submitButton: {
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

  miniSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  @media (max-width: 768px) {
    .headerTop {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }
    
    .statsRow {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .filtersRow {
      flex-direction: column;
      align-items: stretch;
    }
    
    .searchContainer {
      max-width: none;
    }
    
    .grid {
      grid-template-columns: 1fr;
    }
    
    .cardActions {
      flex-direction: column;
    }
    
    .formGrid {
      grid-template-columns: 1fr;
    }
  }
  
  @media (max-width: 480px) {
    .title {
      font-size: 24px;
    }
    
    .statsRow {
      grid-template-columns: 1fr;
    }
    
    .card {
      padding: 16px;
    }
    
    .studentName {
      font-size: 16px;
    }
  }
`;
document.head.appendChild(styleSheet);

export default ProfesseurReclamations;