import React, { useState, useEffect } from 'react';
import { User, Download, X, CheckSquare, Square, Settings } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import StudentBadge from './StudentBadgeModern';
import './BadgeGeneratorModern.css';
import html2canvas from 'html2canvas';

const BadgeGeneratorModern = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsFiltres, setEtudiantsFiltres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [exportFormat, setExportFormat] = useState(() => {
    return localStorage.getItem('exportFormat') || 'png';
  });

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
    if (e.key === 'Enter') handlePasswordSubmit();
  };

  useEffect(() => { fetchEtudiants(); }, []);
  useEffect(() => { filtrerEtudiants(); }, [etudiants, recherche, filtreNiveau]);

  const fetchEtudiants = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Vous devez être connecté');

      const response = await fetch('/api/etudiants', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) throw new Error('Session expirée. Veuillez vous reconnecter.');
      if (!response.ok) throw new Error('Erreur lors du chargement des étudiants');

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
    if (filtreNiveau) resultats = resultats.filter(e => e.niveau === filtreNiveau);
    setEtudiantsFiltres(resultats);
  };

  const niveauxUniques = [...new Set(etudiants.map(e => e.niveau).filter(Boolean))].sort();

  const handleDownloadImage = async (etudiant) => {
    try {
      setDownloadingId(etudiant._id);
      await new Promise(resolve => setTimeout(resolve, 300));
      const cardElement = document.querySelector(`[data-student-id="${etudiant._id}"] .card-container-pvc`);
      if (!cardElement) { alert('❌ Impossible de trouver la carte'); return; }

      const canvas = await html2canvas(cardElement, {
        scale: 3,
        backgroundColor: exportFormat === 'png' ? null : '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        removeContainer: false,
        imageTimeout: 0,
        width: 324,
        height: 204
      });

      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = exportFormat === 'jpeg' ? 0.95 : 1.0;
      const imgData = canvas.toDataURL(mimeType, quality);
      const link = document.createElement('a');
      const extension = exportFormat === 'png' ? 'png' : 'jpg';
      link.href = imgData;
      link.download = `Carte_${etudiant.nomComplet?.replace(/\s+/g, '_') || etudiant._id}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erreur export:', err);
      alert('❌ Erreur lors de la génération de l\'image');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.length === 0) { alert('Veuillez sélectionner au moins une carte'); return; }
    for (const id of selectedIds) {
      const etudiant = etudiants.find(e => e._id === id);
      if (etudiant) {
        await handleDownloadImage(etudiant);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    alert(`✅ ${selectedIds.length} carte(s) téléchargée(s) en ${exportFormat.toUpperCase()}`);
  };

  const handleSelectAll = () => setSelectedIds(etudiantsFiltres.map(e => e._id));
  const handleDeselectAll = () => setSelectedIds([]);
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const handleLogout = () => { localStorage.removeItem('token'); window.location.href = '/login'; };
  const countNonAutorisations = etudiants.filter(e => e.autorise === false).length;

  if (!isAuthenticated) {
    return (
      <div className="badge-container">
        <Sidebar />
        <div className="badge-main-content">
          <div className="password-container">
            <div className="password-box">
              <div className="lock-icon">🔒</div>
              <h2 className="password-title">Accès Protégé</h2>
              <p className="password-subtitle">Veuillez entrer le mot de passe pour accéder aux cartes étudiants</p>
              <div className="password-form">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  onKeyPress={handlePasswordKeyPress}
                  placeholder="Mot de passe"
                  className="password-input"
                  autoFocus
                />
                {passwordError && <p className="password-error-text">{passwordError}</p>}
                <button onClick={handlePasswordSubmit} className="password-button">Accéder</button>
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
              <button onClick={handleLogout} className="btn-retry">Se reconnecter</button>
            ) : (
              <button onClick={fetchEtudiants} className="btn-retry">Réessayer</button>
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
            <h1 className="badge-title">🎓 Cartes Étudiants PVC</h1>
            <p className="badge-subtitle">
              {selectedIds.length} carte(s) sélectionnée(s) sur {etudiantsFiltres.length}
              {countNonAutorisations > 0 && ` • ${countNonAutorisations} NON autorisé(s) de sortie`}
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
                <select value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)} className="select-filtre">
                  <option value="">Tous les niveaux</option>
                  {niveauxUniques.map(niveau => <option key={niveau} value={niveau}>{niveau}</option>)}
                </select>
              </div>
              <div className="filtre-groupe">
                <select value={exportFormat} onChange={(e) => { setExportFormat(e.target.value); localStorage.setItem('exportFormat', e.target.value); }} className="select-filtre">
                  <option value="png">PNG (transparence)</option>
                  <option value="jpeg">JPEG (plus léger)</option>
                </select>
              </div>
            </div>
            <div className="actions">
              <button onClick={() => setShowConfig(true)} className="btn-config">
                <Settings size={18} />
                Configuration
              </button>
              <button onClick={handleSelectAll} className="btn-select" disabled={etudiantsFiltres.length === 0}>
                Tout sélectionner
              </button>
              {selectedIds.length > 0 && (
                <>
                  <button onClick={handleDeselectAll} className="btn-deselect">
                    <X size={18} />
                    Désélectionner ({selectedIds.length})
                  </button>
                  <button onClick={handleDownloadSelected} className="btn-print" disabled={downloadingId !== null}>
                    <Download size={18} />
                    {downloadingId ? 'Téléchargement...' : `Télécharger ${exportFormat.toUpperCase()} (${selectedIds.length})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="content-area">
          <div className="screen-grid no-print">
            {etudiantsFiltres.map(etudiant => (
              <div key={etudiant._id} className="card-wrapper" data-student-id={etudiant._id}>
                <div className="checkbox-container">
                  <button
                    className="btn-download-single"
                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(etudiant); }}
                    disabled={downloadingId === etudiant._id}
                    title={`Télécharger cette carte en ${exportFormat.toUpperCase()}`}
                  >
                    {downloadingId === etudiant._id ? <div className="mini-spinner"></div> : <Download size={20} />}
                  </button>
                  <div className="checkbox" onClick={(e) => { e.stopPropagation(); handleToggleSelect(etudiant._id); }}>
                    {selectedIds.includes(etudiant._id) ? <CheckSquare size={24} color="#6366f1" /> : <Square size={24} color="#9ca3af" />}
                  </div>
                </div>
                <StudentBadge
                  etudiant={etudiant}
                  logoUrl={logoUrl}
                  anneeScolaire={anneeScolaire}
                  showAutorisation={etudiant.autorise === false}
                  isAutorised={etudiant.autorise !== false}
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

// ============================================================
// CONFIG MODAL — السر هو تحديد النص الأبيض بين الكلمتين
// ============================================================
const ConfigModal = ({ logoUrl, setLogoUrl, anneeScolaire, setAnneeScolaire, showConfig, setShowConfig }) => {
  const [tempUrl, setTempUrl] = useState(logoUrl);
  const [tempAnnee, setTempAnnee] = useState(anneeScolaire);
  const [anneeUnlocked, setAnneeUnlocked] = useState(false);

  // 🔒 كنراقب إذا المستخدم حدد النص السري الأبيض
  const handleSecretSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().includes('UNLOCK_2024')) {
      setAnneeUnlocked(true);
    }
  };

  const handleSave = () => {
    setLogoUrl(tempUrl);
    localStorage.setItem('schoolLogo', tempUrl);

    // 🔒 إلا ما كانش مفتوح → يرجع دايماً 2024-2025
    const finalAnnee = anneeUnlocked ? tempAnnee : '2024-2025';
    setAnneeScolaire(finalAnnee);
    localStorage.setItem('anneeScolaire', finalAnnee);

    setShowConfig(false);
    setAnneeUnlocked(false); // reset بعد الحفظ
  };

  if (!showConfig) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" onMouseUp={handleSecretSelect}>
        <h3 className="modal-title">⚙️ Configuration des Cartes</h3>
        <div className="modal-content">

          {/* Logo */}
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
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
                <p className="preview-label error-preview" style={{ display: 'none' }}>❌ Logo introuvable</p>
              </div>
            )}
          </div>

          {/* Année scolaire */}
          <div className="modal-section">

            {/*
              🔒 النص السري مخفي هنا بين "Année" و "scolaire:"
              أبيض على أبيض — ما يبانش
              نتا غير تعمل select (تحديد) على هاد المنطقة → يتفتح الوصول
            */}
            <label className="modal-label">
              Année{' '}
              <span
                style={{
                  color: 'white',
                  backgroundColor: 'white',
                  userSelect: 'text',          /* مهم — يخلي التحديد يخدم */
                  WebkitUserSelect: 'text',
                  fontSize: 'inherit',
                }}
              >
                UNLOCK_2024
              </span>
              {' '}scolaire:
            </label>

            <input
              type="text"
              value={tempAnnee}
              onChange={(e) => setTempAnnee(e.target.value)}
              placeholder="2024-2025"
              className="modal-input"
            />
            <p className="modal-hint">
              Format recommandé: 2024-2025
              {anneeUnlocked && (
                <span style={{ color: '#6366f1', marginLeft: '8px', fontSize: '11px' }}>
                  ✓ modifiable
                </span>
              )}
            </p>
          </div>

        </div>
        <div className="modal-actions">
          <button onClick={() => { setShowConfig(false); setAnneeUnlocked(false); }} className="btn-cancel">
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