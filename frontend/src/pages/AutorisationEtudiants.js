import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, User, BookOpen, GraduationCap, AlertCircle, Search, Filter } from 'lucide-react';
import Sidebar from '../components/Sidebar'; // ✅ استيراد صحيح


  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };
const AutorisationEtudiants = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsFiltres, setEtudiantsFiltres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [error, setError] = useState('');
  
  // États pour les filtres
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [filtreCours, setFiltreCours] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');

  useEffect(() => {
    fetchEtudiants();
  }, []);

  // Appliquer les filtres quand les données ou filtres changent
  useEffect(() => {
    filtrerEtudiants();
  }, [etudiants, recherche, filtreNiveau, filtreCours, filtreStatut]);

  const fetchEtudiants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/etudiants', {
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

  // Fonction de filtrage des étudiants
  const filtrerEtudiants = () => {
    let resultats = etudiants;

    // Filtre par recherche (nom, email, code massar)
    if (recherche) {
      resultats = resultats.filter(e =>
        (e.nomComplet && e.nomComplet.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.email && e.email.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.codeMassar && e.codeMassar.toLowerCase().includes(recherche.toLowerCase()))
      );
    }

    // Filtre par niveau
    if (filtreNiveau) {
      resultats = resultats.filter(e => e.niveau === filtreNiveau);
    }

    // Filtre par cours
    if (filtreCours) {
      resultats = resultats.filter(e => 
        e.cours && e.cours.some(cours => cours.toLowerCase().includes(filtreCours.toLowerCase()))
      );
    }

    // Filtre par statut d'autorisation
    if (filtreStatut !== '') {
      resultats = resultats.filter(e => {
        if (filtreStatut === 'autorise') return e.autorise === true;
        if (filtreStatut === 'non-autorise') return e.autorise !== true;
        return true;
      });
    }

    setEtudiantsFiltres(resultats);
  };

  // Obtenir tous les niveaux et cours uniques pour les filtres
  const niveauxUniques = [...new Set(etudiants.map(e => e.niveau).filter(Boolean))];
  const coursUniques = [...new Set(etudiants.flatMap(e => e.cours || []))];

  const viderFiltres = () => {
    setRecherche('');
    setFiltreNiveau('');
    setFiltreCours('');
    setFiltreStatut('');
  };

  const updateAutorisation = async (etudiantId, autorise) => {
    setUpdating(prev => ({ ...prev, [etudiantId]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/etudiants/${etudiantId}/autorisation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ autorise })
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      // Mettre à jour l'état local
      setEtudiants(prev => prev.map(etudiant => 
        etudiant._id === etudiantId 
          ? { ...etudiant, autorise }
          : etudiant
      ));

    } catch (err) {
      setError('Erreur lors de la mise à jour de l\'autorisation');
      console.error(err);
    } finally {
      setUpdating(prev => ({ ...prev, [etudiantId]: false }));
    }
  };

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
      {/* Header */}      <Sidebar onLogout={handleLogout} />
      
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>
            <GraduationCap size={32} color="#4f46e5" />
            Autorisation des Étudiants
          </h1>
          <p style={styles.subtitle}>
            {etudiantsFiltres.length} étudiant{etudiantsFiltres.length > 1 ? 's' : ''} trouvé{etudiantsFiltres.length > 1 ? 's' : ''} 
            {etudiants.length !== etudiantsFiltres.length && ` sur ${etudiants.length}`}
          </p>
        </div>
      </div>

      {/* Section des filtres */}
      <div style={styles.filtresSection}>
        <div style={styles.filtresContainer}>
          <div style={styles.filtresRow}>
            {/* Recherche */}
            <div style={styles.filtreGroupe}>
              <div style={styles.inputWithIcon}>
                <Search size={20} color="#6b7280" style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Rechercher (nom, email, code massar)..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  style={styles.inputRecherche}
                />
              </div>
            </div>

            {/* Filtre Niveau */}
            <div style={styles.filtreGroupe}>
              <label style={styles.filtreLabel}>Niveau:</label>
              <select
                value={filtreNiveau}
                onChange={(e) => setFiltreNiveau(e.target.value)}
                style={styles.selectFiltre}
              >
                <option value="">Tous les niveaux</option>
                {niveauxUniques.map(niveau => (
                  <option key={niveau} value={niveau}>{niveau}</option>
                ))}
              </select>
            </div>

            {/* Filtre Cours */}
            <div style={styles.filtreGroupe}>
              <label style={styles.filtreLabel}>Classe:</label>
              <select
                value={filtreCours}
                onChange={(e) => setFiltreCours(e.target.value)}
                style={styles.selectFiltre}
              >
                <option value="">Toutes les classes</option>
                {coursUniques.map(cours => (
                  <option key={cours} value={cours}>{cours}</option>
                ))}
              </select>
            </div>

            {/* Filtre Statut */}
            <div style={styles.filtreGroupe}>
              <label style={styles.filtreLabel}>Statut:</label>
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                style={styles.selectFiltre}
              >
                <option value="">Tous</option>
                <option value="autorise">Autorisés</option>
                <option value="non-autorise">Non autorisés</option>
              </select>
            </div>

            {/* Bouton vider filtres */}
            <button onClick={viderFiltres} style={styles.btnViderFiltres}>
              <Filter size={16} />
              Vider
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {etudiants.length === 0 ? (
          <div style={styles.emptyState}>
            <User size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>Aucun étudiant trouvé</h3>
            <p style={styles.emptyText}>Il n'y a pas d'étudiants à autoriser pour le moment.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {etudiantsFiltres.map((etudiant) => (
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
                  </div>
                </div>

                {/* Current Status */}
                <div style={styles.statusContainer}>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: etudiant.autorise ? '#dcfce7' : '#fef2f2',
                    color: etudiant.autorise ? '#166534' : '#991b1b',
                    border: `1px solid ${etudiant.autorise ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    {etudiant.autorise ? (
                      <>
                        <CheckCircle size={14} />
                        Autorisé
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        Non autorisé
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => updateAutorisation(etudiant._id, true)}
                    disabled={updating[etudiant._id] || etudiant.autorise}
                    style={{
                      ...styles.button,
                      ...styles.validateButton,
                      opacity: etudiant.autorise ? 0.5 : 1,
                      cursor: etudiant.autorise || updating[etudiant._id] ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {updating[etudiant._id] ? (
                      <div style={styles.miniSpinner}></div>
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Valider
                  </button>

                  <button
                    onClick={() => updateAutorisation(etudiant._id, false)}
                    disabled={updating[etudiant._id] || !etudiant.autorise}
                    style={{
                      ...styles.button,
                      ...styles.rejectButton,
                      opacity: !etudiant.autorise ? 0.5 : 1,
                      cursor: !etudiant.autorise || updating[etudiant._id] ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {updating[etudiant._id] ? (
                      <div style={styles.miniSpinner}></div>
                    ) : (
                      <XCircle size={16} />
                    )}
                    Refuser
                  </button>
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
    backgroundColor: '#f8fafc',
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
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },

  actionButtons: {
    display: 'flex',
    gap: '8px',
  },

  button: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  validateButton: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
  },

  rejectButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },

  miniSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
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

  // Styles pour la section des filtres
  filtresSection: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 0',
  },

  filtresContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
  },

  filtresRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'end',
    flexWrap: 'wrap',
  },

  filtreGroupe: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '150px',
  },

  filtreLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },

  inputWithIcon: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  searchIcon: {
    position: 'absolute',
    left: '12px',
    zIndex: 1,
  },

  inputRecherche: {
    width: '280px',
    padding: '10px 12px 10px 40px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },

  selectFiltre: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },

  btnViderFiltres: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
    
    .title {
      font-size: 24px;
    }
    
    .actionButtons {
      flex-direction: column;
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
  }
`;
document.head.appendChild(styleSheet);

export default AutorisationEtudiants;