import React, { useState, useEffect } from 'react';
import { User, Printer, X, CheckSquare, Square, Settings } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import StudentBadge from './StudentBadgeModern';
import './BadgeGeneratorModern.css';

const BadgeGeneratorModern = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsFiltres, setEtudiantsFiltres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États pour les filtres
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  
  // État pour la sélection
  const [selectedIds, setSelectedIds] = useState([]);
  
  // État pour gérer les étudiants avec autorisation de sortie
  const [autorisationIds, setAutorisationIds] = useState([]);
  
  // 🔐 État pour la protection par mot de passe
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('badgeAccess') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Configuration du logo et année scolaire
  const [logoUrl, setLogoUrl] = useState(() => {
    const logoParDefaut = '/images/logo-ecole.jpg';
    return localStorage.getItem('schoolLogo') || logoParDefaut;
  });
  
  const [anneeScolaire, setAnneeScolaire] = useState(() => {
    return localStorage.getItem('anneeScolaire') || '2024-2025';
  });
  
  const [showConfig, setShowConfig] = useState(false);

  // 🔐 Vérification du mot de passe
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const correctPassword = 'abdoraki2001';
    
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('badgeAccess', 'true');
      setPasswordError('');
    } else {
      setPasswordError('❌ Mot de passe incorrect');
      setPasswordInput('');
    }
  };

  useEffect(() => {
    fetchEtudiants();
  }, []);

  useEffect(() => {
    filtrerEtudiants();
  }, [etudiants, recherche, filtreNiveau]);

  const fetchEtudiants = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Vous devez être connecté');
      }

      const response = await fetch('/api/etudiants', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des étudiants');
      }

      const data = await response.json();
      setEtudiants(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtrerEtudiants = () => {
    let resultats = etudiants;

    if (recherche) {
      resultats = resultats.filter(e =>
        (e.nomComplet && e.nomComplet.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.codeMassar && e.codeMassar.toLowerCase().includes(recherche.toLowerCase()))
      );
    }

    if (filtreNiveau) {
      resultats = resultats.filter(e => e.niveau === filtreNiveau);
    }

    setEtudiantsFiltres(resultats);
  };

  const niveauxUniques = [...new Set(etudiants.map(e => e.niveau).filter(Boolean))].sort();

  const handleSelectAll = () => {
    setSelectedIds(etudiantsFiltres.map(e => e._id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleToggleAutorisation = (id) => {
    setAutorisationIds(prev => 
      prev.includes(id) 
        ? prev.filter(autoId => autoId !== id)
        : [...prev, id]
    );
  };

  const handlePrint = () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une carte à imprimer');
      return;
    }
    window.print();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const etudiantsAfficher = etudiantsFiltres.filter(e => selectedIds.includes(e._id));

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.passwordContainer}>
            <div style={styles.passwordBox}>
              <div style={styles.lockIcon}>🔒</div>
              <h2 style={styles.passwordTitle}>Accès Protégé</h2>
              <p style={styles.passwordSubtitle}>
                Veuillez entrer le mot de passe pour accéder aux cartes étudiants
              </p>
              
              <form onSubmit={handlePasswordSubmit} style={styles.passwordForm}>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Mot de passe"
                  style={styles.passwordInput}
                  autoFocus
                />
                
                {passwordError && (
                  <p style={styles.passwordErrorText}>{passwordError}</p>
                )}
                
                <button type="submit" style={styles.passwordButton}>
                  Accéder
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Chargement des étudiants...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <p style={{ color: '#ef4444', fontSize: '18px', fontWeight: '600' }}>
              ❌ {error}
            </p>
            {error.includes('connecté') || error.includes('Session') ? (
              <button onClick={handleLogout} style={styles.btnRetry}>
                Se reconnecter
              </button>
            ) : (
              <button onClick={fetchEtudiants} style={styles.btnRetry}>
                Réessayer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />
      
      <div style={styles.mainContent}>
        {/* En-tête */}
        <div style={styles.header} className="no-print">
          <div style={styles.headerContent}>
            <h1 style={styles.title}>🎓 Cartes Étudiants</h1>
            <p style={styles.subtitle}>
              {selectedIds.length} carte(s) sélectionnée(s) sur {etudiantsFiltres.length}
              {autorisationIds.length > 0 && ` • ${autorisationIds.length} avec autorisation de sortie`}
            </p>
          </div>
        </div>

        {/* Barre d'outils */}
        <div style={styles.toolbar} className="no-print">
          <div style={styles.toolbarContent}>
            {/* Filtres */}
            <div style={styles.filtresRow}>
              <div style={styles.filtreGroupe}>
                <input
                  type="text"
                  placeholder="🔍 Rechercher par nom ou code Massar..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  style={styles.inputRecherche}
                />
              </div>

              <div style={styles.filtreGroupe}>
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
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button 
                onClick={() => setShowConfig(true)}
                style={styles.btnConfig}
              >
                <Settings size={18} />
                Configuration
              </button>

              <button 
                onClick={handleSelectAll}
                style={styles.btnSelect}
                disabled={etudiantsFiltres.length === 0}
              >
                Tout sélectionner
              </button>

              {selectedIds.length > 0 && (
                <button 
                  onClick={handleDeselectAll}
                  style={styles.btnDeselect}
                >
                  <X size={18} />
                  Désélectionner ({selectedIds.length})
                </button>
              )}

              <button 
                onClick={handlePrint}
                style={styles.btnPrint}
                disabled={selectedIds.length === 0}
              >
                <Printer size={18} />
                Imprimer ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>

        {/* Zone de contenu */}
        <div style={styles.contentArea}>
          {/* Grille écran */}
          <div className="screen-grid no-print" style={styles.grid}>
            {etudiantsFiltres.map(etudiant => (
              <div key={etudiant._id} style={styles.cardWrapper}>
                <div style={styles.checkboxContainer}>
                  <div 
                    style={styles.checkbox}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(etudiant._id);
                    }}
                    title="Sélectionner pour impression"
                  >
                    {selectedIds.includes(etudiant._id) ? (
                      <CheckSquare size={24} color="#6366f1" />
                    ) : (
                      <Square size={24} color="#9ca3af" />
                    )}
                  </div>
                  
                  <button
                    style={{
                      ...styles.btnAutorisation,
                      ...(autorisationIds.includes(etudiant._id) ? styles.btnAutorisationActive : {})
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAutorisation(etudiant._id);
                    }}
                    title="Activer l'autorisation de sortie"
                  >
                    {autorisationIds.includes(etudiant._id) ? '🔴 Sortie' : '⚪ Sortie'}
                  </button>
                </div>
                
                <StudentBadge 
                  etudiant={etudiant} 
                  logoUrl={logoUrl} 
                  anneeScolaire={anneeScolaire}
                  showAutorisation={autorisationIds.includes(etudiant._id)}
                />
              </div>
            ))}
          </div>

          {/* Grille impression */}
          <div className="print-grid" style={{ display: 'none' }}>
            {etudiantsAfficher.map(etudiant => (
              <div key={etudiant._id}>
                <StudentBadge 
                  etudiant={etudiant} 
                  logoUrl={logoUrl}
                  anneeScolaire={anneeScolaire}
                  showAutorisation={autorisationIds.includes(etudiant._id)}
                />
              </div>
            ))}
          </div>

          {etudiantsFiltres.length === 0 && (
            <div style={styles.emptyState}>
              <User size={64} color="#cbd5e1" />
              <p style={styles.emptyText}>Aucun étudiant trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Configuration */}
      {showConfig && (
        <ConfigModal 
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          anneeScolaire={anneeScolaire}
          setAnneeScolaire={setAnneeScolaire}
          showConfig={showConfig}
          setShowConfig={setShowConfig}
        />
      )}

      {/* Styles CSS pour l'impression */}
      <style>{`
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media screen {
          .print-grid {
            display: none !important;
          }
        }

        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .screen-grid {
            display: none !important;
          }

          .print-grid {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            gap: 20mm;
            padding: 15mm;
          }

          .print-grid > div {
            page-break-inside: avoid;
          }

          .print-grid > div:nth-child(3n) {
            page-break-after: always;
          }

          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Composant Configuration (Logo + Année Scolaire)
const ConfigModal = ({ logoUrl, setLogoUrl, anneeScolaire, setAnneeScolaire, showConfig, setShowConfig }) => {
  const [tempUrl, setTempUrl] = useState(logoUrl);
  const [tempAnnee, setTempAnnee] = useState(anneeScolaire);

  const handleSave = () => {
    setLogoUrl(tempUrl);
    setAnneeScolaire(tempAnnee);
    localStorage.setItem('schoolLogo', tempUrl);
    localStorage.setItem('anneeScolaire', tempAnnee);
    setShowConfig(false);
  };

  if (!showConfig) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3 style={modalStyles.title}>⚙️ Configuration des Cartes</h3>
        <div style={modalStyles.content}>
          {/* Logo */}
          <div style={modalStyles.section}>
            <label style={modalStyles.label}>URL du logo de l'école:</label>
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="/images/logo-ecole.jpg"
              style={modalStyles.input}
            />
            {tempUrl && (
              <div style={modalStyles.preview}>
                <p style={modalStyles.previewLabel}>Aperçu:</p>
                <img 
                  src={tempUrl} 
                  alt="Logo" 
                  style={modalStyles.previewImg}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <p style={{...modalStyles.previewLabel, display: 'none', color: '#dc2626'}}>
                  ❌ Logo introuvable
                </p>
              </div>
            )}
          </div>

          {/* Année Scolaire */}
          <div style={modalStyles.section}>
            <label style={modalStyles.label}>Année scolaire:</label>
            <input
              type="text"
              value={tempAnnee}
              onChange={(e) => setTempAnnee(e.target.value)}
              placeholder="2024-2025"
              style={modalStyles.input}
            />
            <p style={modalStyles.hint}>Format recommandé: 2024-2025</p>
          </div>
        </div>
        <div style={modalStyles.actions}>
          <button onClick={() => setShowConfig(false)} style={modalStyles.btnCancel}>
            Annuler
          </button>
          <button onClick={handleSave} style={modalStyles.btnSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },

  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)',
    padding: '24px 0',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },

  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
  },

  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },

  subtitle: {
    fontSize: '16px',
    color: '#ffffff',
    opacity: 0.9,
    margin: 0,
  },

  toolbar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 0',
  },

  toolbarContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
  },

  filtresRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },

  filtreGroupe: {
    flex: '1',
    minWidth: '200px',
  },

  inputRecherche: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },

  selectFiltre: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },

  btnConfig: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  btnSelect: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  btnDeselect: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  btnPrint: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },

  contentArea: {
    flex: 1,
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px',
    width: '100%',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
    gap: '32px',
    justifyContent: 'center',
  },

  cardWrapper: {
    position: 'relative',
  },

  checkboxContainer: {
    position: 'absolute',
    top: '-12px',
    right: '-12px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-end',
  },

  checkbox: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '4px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },

  btnAutorisation: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
  },

  btnAutorisationActive: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderColor: '#dc2626',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
  },

  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '500',
    margin: 0,
  },

  btnRetry: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },

  emptyText: {
    fontSize: '18px',
    color: '#64748b',
    fontWeight: '500',
  },

  // 🔐 Styles pour la protection par mot de passe
  passwordContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },

  passwordBox: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '90%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
  },

  lockIcon: {
    fontSize: '64px',
    marginBottom: '24px',
  },

  passwordTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },

  passwordSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },

  passwordForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  passwordInput: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },

  passwordButton: {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },

  passwordErrorText: {
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0',
  },
};

const modalStyles = {
  overlay: {
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
  },

  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
  },

  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 20px 0',
  },

  content: {
    marginBottom: '24px',
  },

  section: {
    marginBottom: '24px',
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },

  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },

  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    fontStyle: 'italic',
  },

  preview: {
    marginTop: '16px',
    textAlign: 'center',
  },

  previewLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
  },

  previewImg: {
    width: '100px',
    height: '100px',
    objectFit: 'contain',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px',
  },

  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },

  btnCancel: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  btnSave: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default BadgeGeneratorModern;