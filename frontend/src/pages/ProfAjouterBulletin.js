import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, X, BookOpen, Users, 
  Star, AlertCircle, Check, Eye, Search
} from 'lucide-react';
import Sidebar from '../components/SidebarProf';
 const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };
const ProfBulletins = () => {
  const [cours, setCours] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  const [filters, setFilters] = useState({
    cours: '',
    semestre: 'S1',
    anneeScolaire: '2024/2025',
    search: ''
  });
  
  const [etudiantsNotes, setEtudiantsNotes] = useState({});

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchCours();
    fetchBulletins();
  }, []);

  const fetchCours = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/professeur/mes-cours', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCours(data);
    } catch (error) {
      showNotification('Erreur chargement cours', 'error');
    }
  };

  const fetchBulletins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/bulletins/professeur', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBulletins(data);
    } catch (error) {
      showNotification('Erreur chargement bulletins', 'error');
    }
  };

  const fetchEtudiants = async (coursNom) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/professeur/etudiants/cours/${coursNom}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEtudiants(data);
      
      const initialNotes = {};
      data.forEach(etudiant => {
        initialNotes[etudiant._id] = {
          nomComplet: etudiant.nomComplet,
          noteCC: '',
          noteExamen: '',
          remarque: '',
          absences: 0
        };
      });
      setEtudiantsNotes(initialNotes);
    } catch (error) {
      showNotification('Erreur chargement étudiants', 'error');
    }
  };

  useEffect(() => {
    if (filters.cours) {
      fetchEtudiants(filters.cours);
    }
  }, [filters.cours]);

  const handleNoteChange = (etudiantId, field, value) => {
    setEtudiantsNotes(prev => ({
      ...prev,
      [etudiantId]: {
        ...prev[etudiantId],
        [field]: value
      }
    }));
  };

  const handleSubmitAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const promises = [];
      
      Object.keys(etudiantsNotes).forEach(etudiantId => {
        const data = etudiantsNotes[etudiantId];
        
        if (data.noteCC || data.noteExamen) {
          promises.push(
            fetch('/api/bulletins', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                etudiant: etudiantId,
                cours: filters.cours,
                semestre: filters.semestre,
                anneeScolaire: filters.anneeScolaire,
                noteControleContinu: parseFloat(data.noteCC) || 0,
                noteExamen: parseFloat(data.noteExamen) || 0,
                remarque: data.remarque,
                nombreAbsences: parseInt(data.absences) || 0
              })
            })
          );
        }
      });
      
      if (promises.length === 0) {
        showNotification('Aucune note à enregistrer', 'error');
        return;
      }
      
      await Promise.all(promises);
      showNotification(`${promises.length} bulletin(s) enregistré(s)`);
      setShowModal(false);
      fetchBulletins();
    } catch (error) {
      showNotification('Erreur enregistrement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const groupedBulletins = bulletins.reduce((acc, b) => {
    const key = `${b.cours}-${b.semestre}`;
    if (!acc[key]) {
      acc[key] = {
        cours: b.cours,
        semestre: b.semestre,
        matiere: b.matiere,
        etudiants: []
      };
    }
    acc[key].etudiants.push(b);
    return acc;
  }, {});

  const filteredGroups = Object.values(groupedBulletins).filter(group => {
    if (filters.search) {
      return group.etudiants.some(b => 
        b.etudiant?.nomComplet?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    return true;
  });

  const calculateAverage = (etudiants) => {
    if (!etudiants.length) return 'N/A';
    const sum = etudiants.reduce((acc, e) => acc + (e.moyenneMatiere || 0), 0);
    return (sum / etudiants.length).toFixed(2);
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Supprimer tous les bulletins de "${group.cours}" ?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        group.etudiants.map(e => 
          fetch(`/api/bulletins/${e._id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      showNotification('Bulletins supprimés');
      fetchBulletins();
    } catch (error) {
      showNotification('Erreur suppression', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
            <Sidebar onLogout={handleLogout} />
      
      {notification && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: notification.type === 'error' ? '#dc2626' : '#166534'
        }}>
          {notification.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          {notification.message}
        </div>
      )}

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>Mes Bulletins</h1>
          <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
            <Plus size={20} /> Nouveau Bulletin
          </button>
        </div>

        <div style={styles.filtersBar}>
          <div style={styles.filterItem}>
            <Search size={18} color="#6b7280" />
            <input
              type="text"
              placeholder="Rechercher un étudiant..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.cardsGrid}>
          {filteredGroups.map((group, idx) => (
            <div key={idx} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>{group.cours}</h3>
                  <p style={styles.cardSubtitle}>
                    {group.matiere} • {group.semestre} • {group.etudiants.length} étudiants
                  </p>
                </div>
                <div style={styles.cardActions}>
                  <button
                    onClick={() => { setViewingGroup(group); setShowViewModal(true); }}
                    style={styles.viewButton}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={styles.cardStats}>
                <div style={styles.statBox}>
                  <Star size={16} color="#f59e0b" />
                  <div>
                    <div style={styles.statValue}>{calculateAverage(group.etudiants)}</div>
                    <div style={styles.statLabel}>Moyenne</div>
                  </div>
                </div>
                <div style={styles.statBox}>
                  <Check size={16} color="#10b981" />
                  <div>
                    <div style={styles.statValue}>
                      {group.etudiants.filter(e => (e.moyenneMatiere || 0) >= 10).length}
                    </div>
                    <div style={styles.statLabel}>Admis</div>
                  </div>
                </div>
                <div style={styles.statBox}>
                  <AlertCircle size={16} color="#ef4444" />
                  <div>
                    <div style={styles.statValue}>
                      {group.etudiants.filter(e => (e.moyenneMatiere || 0) < 10).length}
                    </div>
                    <div style={styles.statLabel}>Échecs</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Création */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Créer des Bulletins</h2>
              <button onClick={() => setShowModal(false)} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cours</label>
                  <select
                    value={filters.cours}
                    onChange={(e) => setFilters({ ...filters, cours: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Choisir un cours</option>
                    {cours.map(c => (
                      <option key={c._id} value={c.nom}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Semestre</label>
                  <select
                    value={filters.semestre}
                    onChange={(e) => setFilters({ ...filters, semestre: e.target.value })}
                    style={styles.select}
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="Année">Année</option>
                  </select>
                </div>
              </div>

              {filters.cours && etudiants.length > 0 && (
                <>
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Étudiant</th>
                          <th style={styles.th}>CC /20</th>
                          <th style={styles.th}>Examen /20</th>
                          <th style={styles.th}>Abs</th>
                          <th style={styles.th}>Remarque</th>
                        </tr>
                      </thead>
                      <tbody>
                        {etudiants.map(etudiant => (
                          <tr key={etudiant._id} style={styles.tr}>
                            <td style={styles.td}>{etudiant.nomComplet}</td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max="20"
                                placeholder="CC"
                                value={etudiantsNotes[etudiant._id]?.noteCC || ''}
                                onChange={(e) => handleNoteChange(etudiant._id, 'noteCC', e.target.value)}
                                style={styles.noteInput}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max="20"
                                placeholder="Examen"
                                value={etudiantsNotes[etudiant._id]?.noteExamen || ''}
                                onChange={(e) => handleNoteChange(etudiant._id, 'noteExamen', e.target.value)}
                                style={styles.noteInput}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={etudiantsNotes[etudiant._id]?.absences || ''}
                                onChange={(e) => handleNoteChange(etudiant._id, 'absences', e.target.value)}
                                style={styles.absInput}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="text"
                                placeholder="Remarque..."
                                value={etudiantsNotes[etudiant._id]?.remarque || ''}
                                onChange={(e) => handleNoteChange(etudiant._id, 'remarque', e.target.value)}
                                style={styles.remarqueInput}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={styles.modalActions}>
                    <button onClick={() => setShowModal(false)} style={styles.cancelButton}>
                      Annuler
                    </button>
                    <button onClick={handleSubmitAll} style={styles.primaryButton} disabled={loading}>
                      <Save size={16} />
                      {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualisation */}
      {showViewModal && viewingGroup && (
        <div style={styles.modalOverlay} onClick={() => setShowViewModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {viewingGroup.cours} - {viewingGroup.matiere} - {viewingGroup.semestre}
              </h2>
              <button onClick={() => setShowViewModal(false)} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Étudiant</th>
                      <th style={styles.th}>CC</th>
                      <th style={styles.th}>Examen</th>
                      <th style={styles.th}>Moyenne</th>
                      <th style={styles.th}>Remarque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingGroup.etudiants
                      .sort((a, b) => (b.moyenneMatiere || 0) - (a.moyenneMatiere || 0))
                      .map(b => (
                        <tr key={b._id} style={styles.tr}>
                          <td style={styles.td}>{b.etudiant?.nomComplet}</td>
                          <td style={styles.td}>{b.noteControleContinu || 0}</td>
                          <td style={styles.td}>{b.noteExamen || 0}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.noteBadge,
                              backgroundColor: (b.moyenneMatiere || 0) >= 10 ? '#dcfce7' : '#fee2e2',
                              color: (b.moyenneMatiere || 0) >= 10 ? '#166534' : '#dc2626'
                            }}>
                              {(b.moyenneMatiere || 0).toFixed(2)}/20
                            </span>
                          </td>
                          <td style={styles.td}>{b.remarque || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px' },
  notification: {
    position: 'fixed', top: '20px', right: '20px', padding: '12px 16px',
    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
    zIndex: 1001, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: '500'
  },
  mainContent: { maxWidth: '1200px', margin: '0 auto' },
  header: {
    backgroundColor: 'white', borderRadius: '12px', padding: '24px',
    marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 },
  filtersBar: {
    backgroundColor: 'white', padding: '20px', borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px'
  },
  filterItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: '#f9fafb', padding: '10px 15px',
    borderRadius: '8px', border: '1px solid #e5e7eb'
  },
  searchInput: {
    border: 'none', backgroundColor: 'transparent',
    outline: 'none', fontSize: '14px', flex: 1
  },
  cardsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px'
  },
  card: {
    backgroundColor: 'white', borderRadius: '12px', padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb'
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f3f4f6' },
  cardTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' },
  cardSubtitle: { fontSize: '13px', color: '#6b7280', margin: 0 },
  cardActions: { display: 'flex', gap: '8px' },
  viewButton: {
    backgroundColor: '#f0fdf4', color: '#059669', border: 'none',
    padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex'
  },
  deleteButton: {
    backgroundColor: '#fef2f2', color: '#ef4444', border: 'none',
    padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex'
  },
  cardStats: { display: 'flex', justifyContent: 'space-between', gap: '10px' },
  statBox: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
  statValue: { fontSize: '18px', fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
  },
  modal: {
    backgroundColor: 'white', borderRadius: '16px', width: '100%',
    maxWidth: '1000px', maxHeight: '85vh', overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  modalTitle: { fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 },
  closeButton: {
    backgroundColor: 'transparent', color: '#6b7280', border: 'none',
    padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex'
  },
  modalContent: { padding: '24px', maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#374151' },
  select: {
    padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db',
    fontSize: '14px', backgroundColor: 'white'
  },
  tableWrapper: { overflowX: 'auto', marginBottom: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600',
    color: '#374151', backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'
  },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '12px', fontSize: '14px', color: '#111827' },
  noteInput: {
    width: '70px', padding: '6px', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '14px', textAlign: 'center'
  },
  absInput: {
    width: '50px', padding: '6px', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '14px', textAlign: 'center'
  },
  remarqueInput: {
    width: '100%', padding: '6px', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '14px'
  },
  noteBadge: {
    padding: '4px 10px', borderRadius: '6px',
    fontSize: '14px', fontWeight: '600', display: 'inline-block'
  },
  modalActions: {
    display: 'flex', gap: '12px', justifyContent: 'flex-end',
    paddingTop: '20px', borderTop: '1px solid #e5e7eb'
  },
  primaryButton: {
    backgroundColor: '#3b82f6', color: 'white', border: 'none',
    padding: '10px 20px', borderRadius: '8px', fontSize: '14px',
    fontWeight: '500', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '8px'
  },
  cancelButton: {
    backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db',
    padding: '10px 20px', borderRadius: '8px', fontSize: '14px',
    fontWeight: '500', cursor: 'pointer'
  }
};

export default ProfBulletins;