import React, { useState, useEffect } from 'react';
import { Save, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Récupérer matière du prof
      const profRes = await fetch('/api/professeur/ma-matiere', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profData = await profRes.json();
      setConfig(prev => ({ ...prev, matiere: profData.matiere }));

      // Récupérer les niveaux depuis la BD
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

      alert('✅ Bulletins sauvegardés!');
      setStep('config');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'config') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>⚙️ Configuration</h1>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Matière</label>
            <input type="text" value={config.matiere} disabled style={styles.inputDisabled} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Niveau *</label>
            <select value={config.niveau} onChange={(e) => handleConfigChange('niveau', e.target.value)} style={styles.select}>
              <option value="">-- Sélectionner --</option>
              {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre de Contrôles</label>
            <select value={config.nombreControles} onChange={(e) => handleConfigChange('nombreControles', e.target.value)} style={styles.select}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Semestre</label>
            <select value={config.semestre} onChange={(e) => handleConfigChange('semestre', e.target.value)} style={styles.select}>
              <option value="Premier semestre">Premier semestre</option>
              <option value="Deuxième semestre">Deuxième semestre</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Année Scolaire</label>
            <input type="text" value={config.anneeScolaire} onChange={(e) => handleConfigChange('anneeScolaire', e.target.value)} style={styles.select} />
          </div>

          <button
            onClick={() => setStep('saisie')}
            disabled={!config.niveau}
            style={{...styles.button, ...(config.niveau ? {} : styles.buttonDisabled)}}
          >
            Continuer <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
            <Sidebar onLogout={handleLogout} />
      
      <div style={styles.card}>
        <button onClick={() => setStep('config')} style={styles.backButton}>← Retour</button>
        <h1 style={styles.title}>📝 Saisie des Notes</h1>
        <p style={styles.subtitle}>{config.matiere} | {config.niveau} | {config.semestre}</p>

        {loading ? (
          <p>Chargement...</p>
        ) : etudiants.length === 0 ? (
          <p>Aucun étudiant</p>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.th}>Étudiant</th>
                    <th style={styles.th}>Code Massar</th>
                    <th style={styles.th}>Naissance</th>
                    {Array(config.nombreControles).fill().map((_, i) => (
                      <th key={i} style={styles.th}>C{i + 1}</th>
                    ))}
                    <th style={styles.th}>Activités</th>
                    <th style={styles.th}>Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {etudiants.map(et => (
                    <tr key={et._id}>
                      <td style={styles.td}><strong>{et.nomComplet}</strong></td>
                      <td style={styles.td}>{et.codeMassar}</td>
                      <td style={styles.td}>{bulletins[et._id]?.dateNaissance}</td>
                      {bulletins[et._id]?.controles.map((note, idx) => (
                        <td key={idx} style={styles.td}>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={note}
                            onChange={(e) => handleNoteChange(et._id, idx, e.target.value)}
                            style={styles.input}
                          />
                        </td>
                      ))}
                      <td style={styles.td}>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={bulletins[et._id]?.activitesIntegrees || ''}
                          onChange={(e) => handleActivitesChange(et._id, e.target.value)}
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="text"
                          value={bulletins[et._id]?.observations || ''}
                          onChange={(e) => handleObservationsChange(et._id, e.target.value)}
                          style={styles.input}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={handleSaveAll} disabled={saving} style={styles.button}>
              <Save size={18} /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '20px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  inputDisabled: {
    width: '100%',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#f9fafb',
    color: '#6b7280'
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px'
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  headerRow: {
    backgroundColor: '#f9fafb'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '700',
    borderBottom: '2px solid #e5e7eb'
  },
  td: {
    padding: '10px',
    fontSize: '13px',
    borderBottom: '1px solid #f3f4f6'
  }
};

export default ProfBulletinPage;