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
  
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('badgeAccess') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [logoUrl, setLogoUrl] = useState(() => {
    return localStorage.getItem('schoolLogo') || '/images/logo-ecole.jpg';
  });
  
  const [anneeScolaire, setAnneeScolaire] = useState(() => {
    return localStorage.getItem('anneeScolaire') || '2024-2025';
  });
  
  const [showConfig, setShowConfig] = useState(false);

  const handlePasswordSubmit = () => {
    const correctPassword = 'abdoraki2002';
    
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('badgeAccess', 'true');
      setPasswordError('');
    } else {
      setPasswordError('❌ Mot de passe incorrect');
      setPasswordInput('');
    }
  };

  const handlePasswordKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
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

  const handlePrint = async () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une carte à imprimer');
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(script);
    
    await new Promise(resolve => {
      script.onload = resolve;
    });
    
    const printGrid = document.querySelector('.print-grid');
    printGrid.style.display = 'block';
    printGrid.style.position = 'fixed';
    printGrid.style.left = '-9999px';
    printGrid.style.top = '0';
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const cards = printGrid.querySelectorAll('.print-card-wrapper');
    
    for (let i = 0; i < cards.length; i++) {
      const cardWrapper = cards[i];
      
      cardWrapper.style.width = '856px';
      cardWrapper.style.height = '540px';
      cardWrapper.style.overflow = 'hidden';
      cardWrapper.style.border = 'none';
      cardWrapper.style.borderRadius = '0';
      cardWrapper.style.margin = '0';
      cardWrapper.style.padding = '0';
      
      const cardContent = cardWrapper.firstChild;
      if (cardContent) {
        cardContent.style.width = '856px';
        cardContent.style.height = '540px';
        cardContent.style.border = 'none';
        cardContent.style.borderRadius = '0';
        cardContent.style.margin = '0';
        cardContent.style.padding = '0';
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const canvas = await window.html2canvas(cardWrapper, {
          scale: 4,
          backgroundColor: null,
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: 856,
          height: 540,
          windowWidth: 856,
          windowHeight: 540,
          x: 0,
          y: 0,
        });
        
        const link = document.createElement('a');
        const etudiantNom = etudiantsAfficher[i]?.nomComplet || `carte-${i+1}`;
        link.download = `carte-${etudiantNom.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error('Erreur génération PNG:', err);
      }
    }
    
    printGrid.style.display = 'none';
    printGrid.style.position = '';
    printGrid.style.left = '';
    
    alert(`✅ ${cards.length} carte(s) téléchargée(s) en PNG haute qualité`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const etudiantsAfficher = etudiantsFiltres.filter(e => selectedIds.includes(e._id));
  const countAutorisations = etudiants.filter(e => e.autorise).length;

  if (!isAuthenticated) {
    return (
      <div className="badge-container">
        <Sidebar />
        <div className="badge-main-content">
          <div className="password-container">
            <div className="password-box">
              <div className="lock-icon">🔒</div>
              <h2 className="password-title">Accès Protégé</h2>
              <p className="password-subtitle">
                Veuillez entrer le mot de passe pour accéder aux cartes étudiants
              </p>
              
              <div className="password-form">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyPress={handlePasswordKeyPress}
                  placeholder="Mot de passe"
                  className="password-input"
                  autoFocus
                />
                
                {passwordError && (
                  <p className="password-error-text">{passwordError}</p>
                )}
                
                <button onClick={handlePasswordSubmit} className="password-button">
                  Accéder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="badge-container">
        <Sidebar />
        <div className="badge-main-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Chargement des étudiants...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="badge-container">
        <Sidebar />
        <div className="badge-main-content">
          <div className="loading-container">
            <p className="error-text">❌ {error}</p>
            {error.includes('connecté') || error.includes('Session') ? (
              <button onClick={handleLogout} className="btn-retry">
                Se reconnecter
              </button>
            ) : (
              <button onClick={fetchEtudiants} className="btn-retry">
                Réessayer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="badge-container">
      <Sidebar />
      
      <div className="badge-main-content">
        <div className="badge-header no-print">
          <div className="header-content">
            <h1 className="badge-title">🎓 Cartes Étudiants</h1>
            <p className="badge-subtitle">
              {selectedIds.length} carte(s) sélectionnée(s) sur {etudiantsFiltres.length}
              {countAutorisations > 0 && ` • ${countAutorisations} avec autorisation de sortie`}
            </p>
          </div>
        </div>

        <div className="badge-toolbar no-print">
          <div className="toolbar-content">
            <div className="filtres-row">
              <div className="filtre-groupe">
                <input
                  type="text"
                  placeholder="🔍 Rechercher par nom ou code Massar..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="input-recherche"
                />
              </div>

              <div className="filtre-groupe">
                <select
                  value={filtreNiveau}
                  onChange={(e) => setFiltreNiveau(e.target.value)}
                  className="select-filtre"
                >
                  <option value="">Tous les niveaux</option>
                  {niveauxUniques.map(niveau => (
                    <option key={niveau} value={niveau}>{niveau}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="actions">
              <button 
                onClick={() => setShowConfig(true)}
                className="btn-config"
              >
                <Settings size={18} />
                Configuration
              </button>

              <button 
                onClick={handleSelectAll}
                className="btn-select"
                disabled={etudiantsFiltres.length === 0}
              >
                Tout sélectionner
              </button>

              {selectedIds.length > 0 && (
                <button 
                  onClick={handleDeselectAll}
                  className="btn-deselect"
                >
                  <X size={18} />
                  Désélectionner ({selectedIds.length})
                </button>
              )}

              <button 
                onClick={handlePrint}
                className="btn-print"
                disabled={selectedIds.length === 0}
              >
                <Printer size={18} />
                Télécharger PNG ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>

        <div className="content-area">
          <div className="screen-grid no-print">
            {etudiantsFiltres.map(etudiant => (
              <div key={etudiant._id} className="card-wrapper">
                <div className="checkbox-container">
                  <div 
                    className="checkbox"
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
                </div>
                
                <StudentBadge 
                  etudiant={etudiant} 
                  logoUrl={logoUrl} 
                  anneeScolaire={anneeScolaire}
                  showAutorisation={etudiant.autorise}
                />
              </div>
            ))}
          </div>

          <div className="print-grid" style={{ display: 'none' }}>
            {etudiantsAfficher.map(etudiant => (
              <div key={etudiant._id} className="print-card-wrapper" data-student-id={etudiant._id}>
                <StudentBadge 
                  etudiant={etudiant} 
                  logoUrl={logoUrl}
                  anneeScolaire={anneeScolaire}
                  showAutorisation={etudiant.autorise}
                />
              </div>
            ))}
          </div>

          {etudiantsFiltres.length === 0 && (
            <div className="empty-state">
              <User size={64} color="#cbd5e1" />
              <p className="empty-text">Aucun étudiant trouvé</p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};

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
    <div className="modal-overlay">
      <div className="modal">
        <h3 className="modal-title">⚙️ Configuration des Cartes</h3>
        <div className="modal-content">
          <div className="modal-section">
            <label className="modal-label">URL du logo de l'école:</label>
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="/images/logo-ecole.jpg"
              className="modal-input"
            />
            {tempUrl && (
              <div className="preview">
                <p className="preview-label">Aperçu:</p>
                <img 
                  src={tempUrl} 
                  alt="Logo" 
                  className="preview-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <p className="preview-label error-preview" style={{display: 'none'}}>
                  ❌ Logo introuvable
                </p>
              </div>
            )}
          </div>

          <div className="modal-section">
            <label className="modal-label">Année scolaire:</label>
            <input
              type="text"
              value={tempAnnee}
              onChange={(e) => setTempAnnee(e.target.value)}
              placeholder="2024-2025"
              className="modal-input"
            />
            <p className="modal-hint">Format recommandé: 2024-2025</p>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={() => setShowConfig(false)} className="btn-cancel">
            Annuler
          </button>
          <button onClick={handleSave} className="btn-save">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeGeneratorModern;