import React, { useState, useEffect } from 'react';
import { Save, ChevronRight, ChevronLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Sidebar from '../components/SidebarProf';

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

const ProfBulletinPage = () => {
  const [step, setStep] = useState('config');
  const [config, setConfig] = useState({
    niveau: '',
    matiere: '',
    nombreControles: 2,
    semestre: 'Premier semestre',
    anneeScolaire: '2025/2026'
  });

  const [etudiants, setEtudiants] = useState([]);
  const [bulletins, setBulletins] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [niveaux, setNiveaux] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');

      const profRes = await fetch('/api/professeur/ma-matiere', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profData = await profRes.json();
      setConfig(prev => ({ ...prev, matiere: profData.matiere }));

      const niveauxRes = await fetch('/api/etudiants/niveaux-uniques', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const niveauxData = await niveauxRes.json();
      setNiveaux(Array.isArray(niveauxData) ? niveauxData.sort() : []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  useEffect(() => {
    if (config.niveau) {
      fetchEtudiants();
    }
  }, [config.niveau]);

  const fetchEtudiants = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/etudiants/niveau-structure/${encodeURIComponent(config.niveau)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await res.json();
      setEtudiants(data);

      const bulletinsInit = {};
      data.forEach(et => {
        bulletinsInit[et._id] = {
          etudiantId: et._id,
          nomComplet: et.nomComplet,
          codeMassar: et.codeMassar || 'N/A',
          dateNaissance: et.dateNaissance ? et.dateNaissance.split('T')[0] : 'N/A',
          controles: Array(config.nombreControles).fill(0),
          activitesIntegrees: 0,
          observations: ''
        };
      });
      setBulletins(bulletinsInit);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field, value) => {
    if (field === 'nombreControles') {
      const nombre = parseInt(value);
      setConfig(prev => ({ ...prev, [field]: nombre }));

      setBulletins(prev => {
        const updated = {};
        Object.keys(prev).forEach(key => {
          updated[key] = {
            ...prev[key],
            controles: Array(nombre).fill(0)
          };
        });
        return updated;
      });
    } else {
      setConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleNoteChange = (etudiantId, controleIndex, value) => {
    const note = parseFloat(value) || 0;
    setBulletins(prev => ({
      ...prev,
      [etudiantId]: {
        ...prev[etudiantId],
        controles: prev[etudiantId].controles.map((n, idx) =>
          idx === controleIndex ? (note < 0 ? 0 : note > 20 ? 20 : note) : n
        )
      }
    }));
  };

  const handleActivitesChange = (etudiantId, value) => {
    const note = parseFloat(value) || 0;
    setBulletins(prev => ({
      ...prev,
      [etudiantId]: {
        ...prev[etudiantId],
        activitesIntegrees: note < 0 ? 0 : note > 20 ? 20 : note
      }
    }));
  };

  const handleObservationsChange = (etudiantId, value) => {
    setBulletins(prev => ({
      ...prev,
      [etudiantId]: {
        ...prev[etudiantId],
        observations: value
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!config.niveau || !config.matiere) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      for (const [etudiantId, bulletin] of Object.entries(bulletins)) {
        const controles = bulletin.controles.map((note, idx) => ({
          numero: idx + 1,
          note: parseFloat(note) || 0
        }));

        const payload = {
          etudiantId,
          cours: config.matiere,
          matiere: config.matiere,
          niveau: config.niveau,
          semestre: config.semestre,
          anneeScolaire: config.anneeScolaire,
          nombreControles: config.nombreControles
        };

        const createRes = await fetch('/api/bulletin/creer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!createRes.ok) continue;

        const { bulletin: createdBulletin } = await createRes.json();

        for (let i = 0; i < controles.length; i++) {
          await fetch(`/api/bulletin/${createdBulletin._id}/controle/${controles[i].numero}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ note: controles[i].note })
          });
        }

        await fetch(`/api/bulletin/${createdBulletin._id}/activites`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ activitesIntegrees: bulletin.activitesIntegrees })
        });

        await fetch(`/api/bulletin/${createdBulletin._id}/infos`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            observations: bulletin.observations
          })
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setStep('config');
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const filteredEtudiants = etudiants.filter(et =>
    et.nomComplet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // CONFIG STEP
  if (step === 'config') {
    return (
      <div style={styles.pageContainer}>
        <Sidebar onLogout={handleLogout} />
        <div style={styles.mainContent}>
          <div style={styles.configCard}>
            <div style={styles.configHeader}>
              <h1 style={styles.configTitle}>⚙️ Configuration des bulletins</h1>
              <p style={styles.configSubtitle}>Définissez les paramètres de base pour commencer</p>
            </div>

            <div style={styles.formContainer}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Matière</label>
                  <input
                    type="text"
                    value={config.matiere}
                    disabled
                    style={styles.inputDisabled}
                  />
                  <p style={styles.helperText}>Matière assignée à votre profil</p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Niveau *</label>
                  <select
                    value={config.niveau}
                    onChange={(e) => handleConfigChange('niveau', e.target.value)}
                    style={styles.select}
                  >
                    <option value="">-- Sélectionner une classe --</option>
                    {niveaux.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <p style={styles.helperText}>Sélectionnez la classe des étudiants</p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre de Contrôles</label>
                  <select
                    value={config.nombreControles}
                    onChange={(e) => handleConfigChange('nombreControles', e.target.value)}
                    style={styles.select}
                  >
                    <option value="2">2 contrôles</option>
                    <option value="3">3 contrôles</option>
                    <option value="4">4 contrôles</option>
                    <option value="5">5 contrôles</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Semestre</label>
                  <select
                    value={config.semestre}
                    onChange={(e) => handleConfigChange('semestre', e.target.value)}
                    style={styles.select}
                  >
                    <option value="Premier semestre">Premier semestre</option>
                    <option value="Deuxième semestre">Deuxième semestre</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Année Scolaire</label>
                  <input
                    type="text"
                    value={config.anneeScolaire}
                    onChange={(e) => handleConfigChange('anneeScolaire', e.target.value)}
                    style={styles.select}
                  />
                </div>
              </div>

              <div style={styles.infoBox}>
                <AlertCircle size={20} style={{ color: '#3b82f6' }} />
                <p style={styles.infoText}>Vous pouvez modifier ces paramètres à tout moment. Les notes seront sauvegardées avec ces paramètres.</p>
              </div>

              <button
                onClick={() => setStep('saisie')}
                disabled={!config.niveau}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  ...(config.niveau ? {} : styles.buttonDisabled)
                }}
              >
                Continuer vers la saisie
                <ChevronRight size={20} style={{ marginLeft: '8px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SAISIE STEP
  return (
    <div style={styles.pageContainer}>
      <Sidebar onLogout={handleLogout} />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <button
            onClick={() => setStep('config')}
            style={styles.backButton}
          >
            <ChevronLeft size={20} />
            Retour à la configuration
          </button>
          <div style={styles.headerInfo}>
            <h1 style={styles.pageTitle}>📝 Saisie des notes</h1>
            <p style={styles.pageSubtitle}>
              {config.matiere} • {config.niveau} • {config.semestre}
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div style={styles.successBanner}>
            <CheckCircle size={20} style={{ color: '#10b981' }} />
            <span>✅ Bulletins sauvegardés avec succès !</span>
          </div>
        )}

        {loading ? (
          <div style={styles.loadingContainer}>
            <Loader size={40} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Chargement des étudiants...</p>
          </div>
        ) : etudiants.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertCircle size={40} />
            <p>Aucun étudiant trouvé pour cette classe</p>
          </div>
        ) : (
          <div style={styles.contentContainer}>
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="🔍 Rechercher un étudiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <p style={styles.resultCount}>
                {filteredEtudiants.length} étudiant{filteredEtudiants.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div style={styles.tableContainer}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.headerRow}>
                      <th style={{ ...styles.th, minWidth: '180px' }}>Étudiant</th>
                      <th style={{ ...styles.th, minWidth: '120px' }}>Code Massar</th>
                      <th style={{ ...styles.th, minWidth: '120px' }}>Naissance</th>
                      {Array(config.nombreControles).fill().map((_, i) => (
                        <th key={i} style={{ ...styles.th, minWidth: '70px', textAlign: 'center' }}>C{i + 1}</th>
                      ))}
                      <th style={{ ...styles.th, minWidth: '80px', textAlign: 'center' }}>Activités</th>
                      <th style={{ ...styles.th, minWidth: '150px' }}>Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEtudiants.map((et, idx) => (
                      <tr key={et._id} style={{ ...styles.row, backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                        <td style={styles.td}>
                          <strong style={styles.studentName}>{et.nomComplet}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.codeMassar}>{et.codeMassar || 'N/A'}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.dateText}>{bulletins[et._id]?.dateNaissance || 'N/A'}</span>
                        </td>
                        {bulletins[et._id]?.controles.map((note, idx) => (
                          <td key={idx} style={{ ...styles.td, textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={note}
                              onChange={(e) => handleNoteChange(et._id, idx, e.target.value)}
                              style={styles.numberInput}
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={bulletins[et._id]?.activitesIntegrees || ''}
                            onChange={(e) => handleActivitesChange(et._id, e.target.value)}
                            style={styles.numberInput}
                            placeholder="0"
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="text"
                            value={bulletins[et._id]?.observations || ''}
                            onChange={(e) => handleObservationsChange(et._id, e.target.value)}
                            style={styles.textInput}
                            placeholder="Ajouter une note..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.actionBar}>
              <div style={styles.stats}>
                <span style={styles.statItem}>Total: <strong>{etudiants.length}</strong></span>
              </div>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  ...(saving ? styles.buttonDisabled : {})
                }}
              >
                {saving ? (
                  <>
                    <Loader size={18} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                    Sauvegarde en cours...
                  </>
                ) : (
                  <>
                    <Save size={18} style={{ marginRight: '8px' }} />
                    Enregistrer tous les bulletins
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  pageContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  mainContent: {
    flex: 1,
    overflow: 'auto'
  },
  // CONFIG STYLES
  configCard: {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  },
  configHeader: {
    marginBottom: '32px'
  },
  configTitle: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#1e293b'
  },
  configSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  formContainer: {
    marginTop: '32px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '28px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
    display: 'block'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    ':focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  inputDisabled: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    cursor: 'not-allowed'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },
  helperText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '6px'
  },
  infoBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    marginBottom: '28px',
    border: '1px solid #bfdbfe'
  },
  infoText: {
    fontSize: '14px',
    color: '#1e40af',
    margin: 0,
    lineHeight: '1.5'
  },
  // BUTTON STYLES
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    width: '100%'
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    marginTop: '8px'
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    color: '#94a3b8',
    cursor: 'not-allowed'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    marginBottom: '24px'
  },
  // SAISIE STYLES
  header: {
    padding: '20px 32px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0'
  },
  headerInfo: {
    marginTop: '16px'
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    color: '#1e293b'
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 32px 0',
    padding: '12px 16px',
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
    borderRadius: '8px',
    color: '#065f46',
    fontSize: '14px',
    fontWeight: '500'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 32px',
    color: '#64748b'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 32px',
    color: '#94a3b8'
  },
  contentContainer: {
    padding: '32px'
  },
  searchContainer: {
    marginBottom: '24px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'all 0.2s'
  },
  resultCount: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px'
  },
  tableContainer: {
    marginBottom: '32px',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  headerRow: {
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #e2e8f0'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#475569',
    verticalAlign: 'middle'
  },
  row: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.1s'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    verticalAlign: 'middle'
  },
  studentName: {
    color: '#1e293b'
  },
  codeMassar: {
    fontSize: '12px',
    color: '#64748b',
    fontFamily: 'monospace'
  },
  dateText: {
    fontSize: '13px',
    color: '#64748b'
  },
  numberInput: {
    width: '100%',
    padding: '8px 6px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    textAlign: 'center',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  textInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    backgroundColor: 'white',
    borderTop: '1px solid #e2e8f0',
    borderRadius: '0 0 12px 12px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  stats: {
    display: 'flex',
    gap: '24px',
    fontSize: '14px',
    color: '#64748b'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

export default ProfBulletinPage;