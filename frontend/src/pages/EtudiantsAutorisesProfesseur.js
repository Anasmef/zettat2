import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, User, BookOpen, GraduationCap, AlertCircle, Filter } from 'lucide-react';
import SidebarProf from '../components/SidebarProf';

   const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };
const EtudiantsAutorisesProfesseur = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('tous'); // 'tous', 'autorises', 'non-autorises'
  const [searchTerm, setSearchTerm] = useState(''); // Nouveau state pour la recherche
  const [selectedCours, setSelectedCours] = useState(''); // Nouveau state pour le filtre par cours

  useEffect(() => {
    fetchEtudiants();
  }, []);

  const fetchEtudiants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/professeur/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Erreur lors du chargement des étudiants');
      }

      const data = await res.json();
      setEtudiants(data);
    } catch (err) {
      setError('Impossible de charger les étudiants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEtudiants = () => {
    let filtered = etudiants;

    // Filtre par statut d'autorisation
    switch (filter) {
      case 'autorises':
        filtered = filtered.filter(etudiant => etudiant.autorise === true);
        break;
      case 'non-autorises':
        filtered = filtered.filter(etudiant => etudiant.autorise === false);
        break;
      default:
        break;
    }

    // Filtre par recherche (nom ou code massar)
    if (searchTerm.trim()) {
      filtered = filtered.filter(etudiant =>
        etudiant.nomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (etudiant.codeMassar && etudiant.codeMassar.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par cours
    if (selectedCours) {
      filtered = filtered.filter(etudiant =>
        etudiant.cours && etudiant.cours.some(cours =>
          cours.toLowerCase().includes(selectedCours.toLowerCase())
        )
      );
    }

    return filtered;
  };

  // Calcul des stats en fonction du cours sélectionné
  const etudiantsCours = selectedCours
    ? etudiants.filter(e => e.cours && e.cours.some(cours => cours.toLowerCase() === selectedCours.toLowerCase()))
    : [];
  const stats = {
    total: etudiantsCours.length,
    autorises: etudiantsCours.filter(e => e.autorise === true).length,
    nonAutorises: etudiantsCours.filter(e => e.autorise === false).length,
  };

  const filteredEtudiants = getFilteredEtudiants();

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Chargement des étudiants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <p style={styles.errorText}>{error}</p>
          <button 
            onClick={fetchEtudiants}
            style={styles.retryButton}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}<SidebarProf onLogout={handleLogout}/>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleContainer}>
            <h1 style={styles.title}>
              <GraduationCap size={32} color="#4f46e5" />
              Mes Étudiants - Autorisations
            </h1>
          </div>
          
      
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <div style={styles.filtersContent}>
          {/* Recherche et filtre par cours */}
          <div style={styles.searchFiltersRow}>
            <div style={styles.searchGroup}>
              <input
                type="text"
                placeholder="Rechercher par nom ou code Massar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            
            <div style={styles.coursFilterGroup}>
              <select
                value={selectedCours}
                onChange={(e) => setSelectedCours(e.target.value)}
                style={styles.coursSelect}
              >
                <option value="">Tous les cours</option>
                {/* Obtenir la liste unique des cours */}
                {[...new Set(etudiants.flatMap(e => e.cours || []))].map(cours => (
                  <option key={cours} value={cours}>{cours}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Filtres par statut */}
          <div style={styles.filterGroup}>
            <Filter size={20} color="#64748b" />
            <span style={styles.filterLabel}>Filtrer par statut:</span>
            <div style={styles.filterButtons}>
              <button
                onClick={() => setFilter('tous')}
                style={{
                  ...styles.filterButton,
                  ...(filter === 'tous' ? styles.filterButtonActive : {})
                }}
              >
                Tous ({stats.total})
              </button>
              <button
                onClick={() => setFilter('autorises')}
                style={{
                  ...styles.filterButton,
                  ...(filter === 'autorises' ? styles.filterButtonActive : {})
                }}
              >
                Autorisés ({stats.autorises})
              </button>
              <button
                onClick={() => setFilter('non-autorises')}
                style={{
                  ...styles.filterButton,
                  ...(filter === 'non-autorises' ? styles.filterButtonActive : {})
                }}
              >
                Non autorisés ({stats.nonAutorises})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {selectedCours === '' ? (
          <div style={styles.emptyState}>
            <User size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>Veuillez sélectionner un cours</h3>
            <p style={styles.emptyText}>Choisissez un cours pour afficher les étudiants correspondants.</p>
          </div>
        ) : filteredEtudiants.length === 0 ? (
          <div style={styles.emptyState}>
            <User size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>
              {filter === 'tous' 
                ? 'Aucun étudiant trouvé' 
                : filter === 'autorises'
                ? 'Aucun étudiant autorisé'
                : 'Aucun étudiant non autorisé'
              }
            </h3>
            <p style={styles.emptyText}>
              {filter === 'tous' 
                ? 'Il n\'y a pas d\'étudiants dans ce cours pour le moment.'
                : 'Changez le filtre pour voir d\'autres étudiants.'
              }
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredEtudiants.map((etudiant) => (
              <div key={etudiant._id} style={styles.card}>
                {/* Student Info */}
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
                    
                    {/* Status indicator on avatar */}
                    <div style={{
                      ...styles.statusIndicator,
                      backgroundColor: etudiant.autorise ? '#22c55e' : '#ef4444'
                    }}>
                      {etudiant.autorise ? (
                        <CheckCircle size={14} color="#ffffff" />
                      ) : (
                        <XCircle size={14} color="#ffffff" />
                      )}
                    </div>
                  </div>
                  
                  <div style={styles.studentDetails}>
                    <h3 style={styles.studentName}>{etudiant.nomComplet}</h3>
                    
                    <div style={styles.infoRow}>
                      <GraduationCap size={16} color="#6b7280" />
                      <span style={styles.infoText}>Niveau: {etudiant.niveau}</span>
                    </div>
                    
                    {etudiant.cours && etudiant.cours.length > 0 && (
                      <div style={styles.infoRow}>
                        <BookOpen size={16} color="#6b7280" />
                        <span style={styles.infoText}>
                          Cours: {etudiant.cours.slice(0, 2).join(', ')}
                          {etudiant.cours.length > 2 && ` +${etudiant.cours.length - 2}`}
                        </span>
                      </div>
                    )}

                    {/* Code Massar */}
                    {etudiant.codeMassar && (
                      <div style={styles.infoRow}>
                        <User size={16} color="#6b7280" />
                        <span style={styles.infoText}>Code: {etudiant.codeMassar}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Authorization Status */}
                <div style={styles.statusContainer}>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: etudiant.autorise ? '#dcfce7' : '#fef2f2',
                    color: etudiant.autorise ? '#166534' : '#991b1b',
                    border: `1px solid ${etudiant.autorise ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    {etudiant.autorise ? (
                      <>
                        <CheckCircle size={16} />
                        Autorisé à sortir
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        Non autorisé
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '20px 0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },

  titleContainer: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginBottom: '20px',
  },

  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 20px 0',
  },

  statsContainer: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    minWidth: '80px',
  },

  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },

  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  filtersContainer: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 0',
  },

  filtersContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
  },

  searchFiltersRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  searchGroup: {
    minWidth: '300px',
    flex: '1',
    maxWidth: '400px',
  },

  searchInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    transition: 'border-color 0.2s ease',
  },

  coursFilterGroup: {
    minWidth: '200px',
    flex: '0 0 auto',
  },

  coursSelect: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    cursor: 'pointer',
  },

  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },

  filterLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },

  filterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  filterButton: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  filterButtonActive: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    borderColor: '#4f46e5',
  },

  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px',
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
    position: 'relative',
  },

  studentInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },

  avatarContainer: {
    position: 'relative',
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

  statusIndicator: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffffff',
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
  },

  infoText: {
    fontSize: '14px',
    color: '#64748b',
  },

  statusContainer: {
    display: 'flex',
    justifyContent: 'center',
  },

  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '16px',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },

  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '16px',
  },

  errorText: {
    fontSize: '16px',
    color: '#ef4444',
    margin: 0,
    textAlign: 'center',
  },

  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
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
  
  .filterButton:hover {
    background-color: #f8fafc;
    border-color: #cbd5e1;
  }
  
  .filterButtonActive:hover {
    background-color: #4338ca !important;
    border-color: #4338ca !important;
  }
  
  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }
    
    .card {
      margin: 0 8px;
    }
    
    .mainContent {
      padding: 16px 8px;
    }
    
    .headerContent {
      padding: 0 16px;
    }
    
    .filtersContent {
      padding: 0 16px;
    }
    
    .title {
      font-size: 24px;
    }
    
    .statsContainer {
      gap: 12px;
    }
    
    .statCard {
      padding: 8px 12px;
      min-width: 60px;
    }
    
    .statNumber {
      fontSize: '20px',
    }
    
    .filterGroup {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    
    .filterButtons {
      width: 100%;
      justify-content: flex-start;
    }
  }
  
  @media (max-width: 480px) {
    .title {
      font-size: 20px;
    }
    
    .studentName {
      font-size: 16px;
    }
    
    .card {
      padding: 16px;
    }
    
    .statsContainer {
      flex-direction: row;
      justify-content: space-around;
    }
    
    .filterButtons {
      flex-direction: column;
      width: 100%;
    }
    
    .filterButton {
      width: 100%;
      text-align: center;
    }
  }
`;
document.head.appendChild(styleSheet);

export default EtudiantsAutorisesProfesseur;