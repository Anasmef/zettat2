import React, { useState, useEffect } from 'react';
import { User, Printer, X, CheckSquare, Square, Image as ImageIcon, Settings } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

// Composant Configuration du Logo
const ConfigLogo = ({ logoUrl, setLogoUrl, showConfig, setShowConfig }) => {
  const [tempUrl, setTempUrl] = useState(logoUrl);

  const handleSave = () => {
    setLogoUrl(tempUrl);
    localStorage.setItem('schoolLogo', tempUrl);
    setShowConfig(false);
  };

  if (!showConfig) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3 style={modalStyles.title}>⚙️ Configuration du Logo</h3>
        <div style={modalStyles.content}>
          <label style={modalStyles.label}>URL du logo de l'école:</label>
          <input
            type="text"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            placeholder="https://votre-ecole.com/logo.png"
            style={modalStyles.input}
          />
          {tempUrl && (
            <div style={modalStyles.preview}>
              <p style={modalStyles.previewLabel}>Aperçu:</p>
              <img src={tempUrl} alt="Logo" style={modalStyles.previewImg} />
            </div>
          )}
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

// Composant Carte ID - Taille standard (85.6mm x 54mm)
const CarteID = ({ etudiant, isSelected, onSelect, logoUrl }) => {
  return (
    <div style={cardStyles.wrapper}>
      {/* Checkbox de sélection */}
      <div 
        style={cardStyles.checkbox} 
        onClick={(e) => {
          e.stopPropagation();
          onSelect(etudiant._id);
        }}
        className="no-print"
      >
        {isSelected ? (
          <CheckSquare size={24} color="#6366f1" />
        ) : (
          <Square size={24} color="#9ca3af" />
        )}
      </div>

      {/* Carte ID - Dimensions: 85.6mm x 54mm (323px x 204px à 96 DPI) */}
      <div style={{
        ...cardStyles.container,
        border: isSelected ? '3px solid #6366f1' : '1px solid #e5e7eb'
      }}>
        {/* RECTO */}
        <div style={cardStyles.card} className="print-card">
          {/* En-tête avec dégradé */}
          <div style={cardStyles.header} className="print-header">
            {/* Logo */}
            <div style={cardStyles.logoContainer}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={cardStyles.logo} />
              ) : (
                <div style={cardStyles.logoPlaceholder}>
                  <ImageIcon size={44} color="#ffffff" />
                </div>
              )}
            </div>

            {/* Titre */}
            <div style={cardStyles.headerText}>
              <p style={cardStyles.cardType}>AUTORISATION DE SORTIE</p>
              <p style={cardStyles.cardSubType}>PENDANT LE DÉJEUNER</p>
            </div>

            {/* Photo */}
            <div style={cardStyles.photoContainer} className="print-photo">
              {etudiant.image ? (
                <img 
                  src={etudiant.image} 
                  alt={etudiant.nomComplet}
                  style={cardStyles.photo}
                />
              ) : (
                <div style={cardStyles.photoPlaceholder}>
                  <User size={34} color="#ffffff" strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>

          {/* Corps de la carte */}
          <div style={cardStyles.body}>
            {/* Informations étudiant */}
            <div style={cardStyles.infoSection}>
              <div style={cardStyles.infoRow}>
                <span style={cardStyles.label}>NOM COMPLET:</span>
                <span style={cardStyles.value}>{etudiant.nomComplet}</span>
              </div>
              
              <div style={cardStyles.infoRow}>
                <span style={cardStyles.label}>NIVEAU:</span>
                <span style={cardStyles.valueHighlight} className="print-gradient">
                  {etudiant.niveau || 'N/A'}
                </span>
              </div>
            </div>

            {/* Année scolaire */}
            <div style={cardStyles.footer}>
              <div style={cardStyles.yearBadge} className="print-badge">2025/2026</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles pour la carte ID
const cardStyles = {
  wrapper: {
    position: 'relative',
    marginBottom: '20px',
  },

  checkbox: {
    position: 'absolute',
    top: '-12px',
    right: '-12px',
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '4px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },

  container: {
    width: '450px',  // Beaucoup plus grande
    height: '280px', // Ratio carte ID standard
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },

  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    height: '115px',
    background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)',
    padding: '18px 22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },

  logoContainer: {
    width: '85px',
    height: '85px',
    borderRadius: '14px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  logo: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    borderRadius: '12px',
  },

  logoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    color: '#ffffff',
    textAlign: 'center',
  },

  cardType: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 3px 0',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
  },

  cardSubType: {
    fontSize: '12px',
    fontWeight: '600',
    margin: 0,
    letterSpacing: '0.8px',
    opacity: 0.95,
  },

  photoContainer: {
    width: '70px',
    height: '70px',
    borderRadius: '14px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },

  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    padding: '22px 24px 16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },

  infoRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
  },

  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    minWidth: '100px',
  },

  value: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#000000',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  valueHighlight: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#000000',
    flex: 1,
  },

  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: '6px',
  },

  yearBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: '#ede9fe',
    padding: '6px 14px',
    borderRadius: '14px',
    letterSpacing: '0.8px',
  },
};

// Styles pour le modal de configuration
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
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },

  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 20px 0',
  },

  content: {
    marginBottom: '24px',
  },

  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    display: 'block',
    marginBottom: '8px',
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },

  preview: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    textAlign: 'center',
  },

  previewLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
  },

  previewImg: {
    maxWidth: '120px',
    maxHeight: '120px',
    objectFit: 'contain',
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
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
  },
};

// Composant Principal
const CartesEtudiants = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [recherche, setRecherche] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchEtudiants();
    const savedLogo = localStorage.getItem('schoolLogo');
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  const fetchEtudiants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur lors du chargement');
      const data = await res.json();
      setEtudiants(data);
      setLoading(false);
    } catch (err) {
      setError('Impossible de charger les étudiants');
      console.error(err);
      setLoading(false);
    }
  };

  const etudiantsFiltres = etudiants.filter(e => {
    const matchRecherche = !recherche || 
      e.nomComplet?.toLowerCase().includes(recherche.toLowerCase()) ||
      e.codeMassar?.toLowerCase().includes(recherche.toLowerCase());
    const matchNiveau = !filtreNiveau || e.niveau === filtreNiveau;
    return matchRecherche && matchNiveau;
  });

  const niveauxUniques = [...new Set(etudiants.map(e => e.niveau).filter(Boolean))];

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(etudiantsFiltres.map(e => e._id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const imprimerSelection = () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une carte');
      return;
    }
    window.print();
  };

  const etudiantsAImprimer = etudiantsFiltres.filter(e => selectedIds.includes(e._id));

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar onLogout={handleLogout} />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar onLogout={handleLogout} />
      <ConfigLogo 
        logoUrl={logoUrl} 
        setLogoUrl={setLogoUrl}
        showConfig={showConfig}
        setShowConfig={setShowConfig}
      />
      
      <div style={styles.mainContent}>
        {/* En-tête caché */}

        {/* Barre d'outils */}
        <div style={styles.toolbar} className="no-print">
          <div style={styles.toolbarContent}>
            {/* Filtres */}
            <div style={styles.filtresRow}>
              <div style={styles.filtreGroupe}>
                <input
                  type="text"
                  placeholder="🔍 Rechercher..."
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
                  <option value="">📚 Tous les niveaux</option>
                  {niveauxUniques.map(niveau => (
                    <option key={niveau} value={niveau}>{niveau}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button onClick={() => setShowConfig(true)} style={styles.btnConfig}>
                <Settings size={18} />
                Logo
              </button>

              <button onClick={selectAll} style={styles.btnSelect}>
                Tout sélectionner
              </button>

              {selectedIds.length > 0 && (
                <button onClick={deselectAll} style={styles.btnDeselect}>
                  <X size={16} />
                  Désélectionner
                </button>
              )}

              <button 
                onClick={imprimerSelection} 
                style={styles.btnPrint}
                disabled={selectedIds.length === 0}
              >
                <Printer size={18} />
                Imprimer ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>

        {/* Grille de cartes */}
        <div style={styles.contentArea}>
          <div style={styles.grid} className="screen-grid">
            {etudiantsFiltres.map((etudiant) => (
              <CarteID 
                key={etudiant._id} 
                etudiant={etudiant}
                isSelected={selectedIds.includes(etudiant._id)}
                onSelect={toggleSelection}
                logoUrl={logoUrl}
              />
            ))}
          </div>

          {/* Grille d'impression - 3 cartes par page */}
          <div className="print-grid" style={{ display: 'none' }}>
            {etudiantsAImprimer.map((etudiant) => (
              <CarteID 
                key={etudiant._id} 
                etudiant={etudiant}
                isSelected={false}
                onSelect={() => {}}
                logoUrl={logoUrl}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Styles pour l'impression */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* IMPORTANT: Force l'impression des couleurs */
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

        /* Responsive pour écrans plus petits */
        @media screen and (max-width: 1500px) {
          .screen-grid {
            grid-template-columns: repeat(2, 450px) !important;
          }
        }

        @media screen and (max-width: 1000px) {
          .screen-grid {
            grid-template-columns: repeat(1, 450px) !important;
          }
        }

        @media print {
          /* Force l'impression des couleurs et backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

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
            justify-content: flex-start;
            gap: 0;
            padding: 0;
            margin: 0;
          }

          /* Chaque carte prend exactement 1/3 de la page */
          .print-grid > div {
            margin-bottom: 20mm;
            page-break-inside: avoid;
          }

          /* Force un saut de page toutes les 3 cartes */
          .print-grid > div:nth-child(3n) {
            margin-bottom: 0;
            page-break-after: always;
          }

          .print-grid > div:nth-child(3n):last-child {
            page-break-after: auto;
          }

          /* Première carte de chaque page */
          .print-grid > div:nth-child(3n+1) {
            margin-top: 18mm;
          }

          /* Force les couleurs du gradient */
          .print-header {
            background: linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-photo {
            background-color: rgba(255, 255, 255, 0.25) !important;
            border: 2px solid rgba(255, 255, 255, 0.5) !important;
            -webkit-print-color-adjust: exact !important;
          }

          .print-badge {
            color: #6366f1 !important;
            background-color: #ede9fe !important;
            -webkit-print-color-adjust: exact !important;
          }

          .print-gradient {
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
          }

          .print-card {
            border: 1px solid #e5e7eb !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          }

          /* Format A4: 210mm x 297mm */
          @page {
            size: A4 portrait;
            margin: 15mm 20mm;
          }
        }
      `}</style>
    </div>
  );
};

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
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
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
    gridTemplateColumns: 'repeat(3, 450px)',
    gap: '32px',
    justifyContent: 'center',
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
};

export default CartesEtudiants;
