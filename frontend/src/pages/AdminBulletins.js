import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, Eye, Trash2, Search, 
  Star, TrendingUp, AlertCircle, Download
} from 'lucide-react';

const AdminBulletins = () => {
  const [cours, setCours] = useState([]);
  const [bulletinsData, setBulletinsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCours, setSelectedCours] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [filters, setFilters] = useState({
    semestre: 'S1',
    anneeScolaire: '2025/2026'
  });

  useEffect(() => {
    fetchData();
  }, [filters.semestre, filters.anneeScolaire]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const coursRes = await fetch('/api/cours', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const coursData = await coursRes.json();
      setCours(coursData);

      const bulletinsRes = await fetch('/api/bulletins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allBulletins = await bulletinsRes.json();

      // ✅ Extraire les années depuis les ÉTUDIANTS (pas depuis le bulletin directement)
      const years = [...new Set(
        allBulletins
          .map(b => b.etudiant?.anneeScolaire)
          .filter(Boolean)
      )].sort().reverse();
      
      setAvailableYears(years);

      // ✅ Auto-sélection de la première année disponible
      if (years.length > 0 && !years.includes(filters.anneeScolaire)) {
        setFilters(prev => ({ ...prev, anneeScolaire: years[0] }));
        return;
      }

      // ✅ Filtrer par semestre ET par année scolaire de l'étudiant
      const filtered = allBulletins.filter(b => 
        b.semestre === filters.semestre && 
        b.etudiant?.anneeScolaire === filters.anneeScolaire
      );

      console.log(`📊 Bulletins filtrés: ${filtered.length} pour ${filters.anneeScolaire} - ${filters.semestre}`);

      const grouped = groupBulletinsByCours(filtered, coursData);
      setBulletinsData(grouped);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupBulletinsByCours = (bulletins, coursList) => {
    const grouped = {};

    coursList.forEach(cours => {
      const bulletinsDuCours = bulletins.filter(b => b.cours === cours.nom);
      
      const parProf = {};
      bulletinsDuCours.forEach(b => {
        const key = `${b.professeur?._id}-${b.matiere}`;
        if (!parProf[key]) {
          parProf[key] = {
            professeur: b.professeur?.nom || 'Inconnu',
            professeurId: b.professeur?._id,
            matiere: b.matiere,
            bulletins: [],
            etudiants: new Set()
          };
        }
        parProf[key].bulletins.push(b);
        parProf[key].etudiants.add(b.etudiant?._id);
      });

      Object.values(parProf).forEach(prof => {
        const moyennes = prof.bulletins.map(b => b.moyenneMatiere || 0);
        prof.nombreEtudiants = prof.etudiants.size;
        prof.nombreNotes = prof.bulletins.length;
        prof.moyenneClasse = moyennes.length > 0 
          ? (moyennes.reduce((a, b) => a + b, 0) / moyennes.length).toFixed(2)
          : 'N/A';
        prof.admis = prof.bulletins.filter(b => (b.moyenneMatiere || 0) >= 10).length;
        prof.echecs = prof.bulletins.filter(b => (b.moyenneMatiere || 0) < 10).length;
      });

      if (Object.keys(parProf).length > 0) {
        grouped[cours.nom] = {
          cours: cours,
          professeurs: Object.values(parProf),
          totalEtudiants: new Set(bulletinsDuCours.map(b => b.etudiant?._id)).size,
          totalNotes: bulletinsDuCours.length
        };
      }
    });

    return grouped;
  };

  const calculateCoursStats = (coursData) => {
    if (!coursData.professeurs.length) return null;
    
    const toutesLesMoyennes = coursData.professeurs
      .flatMap(p => p.bulletins.map(b => b.moyenneMatiere || 0));
    
    return {
      moyenneGenerale: toutesLesMoyennes.length > 0
        ? (toutesLesMoyennes.reduce((a, b) => a + b, 0) / toutesLesMoyennes.length).toFixed(2)
        : 'N/A',
      totalAdmis: coursData.professeurs.reduce((acc, p) => acc + p.admis, 0),
      totalEchecs: coursData.professeurs.reduce((acc, p) => acc + p.echecs, 0),
      nombreMatieres: coursData.professeurs.length
    };
  };

  const filteredCours = Object.entries(bulletinsData).filter(([coursNom]) => 
    coursNom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (coursNom) => {
    setSelectedCours(bulletinsData[coursNom]);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des bulletins...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des Bulletins</h1>
          <p style={styles.subtitle}>
            {Object.keys(bulletinsData).length} cours • {
              Object.values(bulletinsData).reduce((acc, c) => acc + c.totalNotes, 0)
            } notes enregistrées • {filters.semestre} • {filters.anneeScolaire}
          </p>
        </div>
      </div>

      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            placeholder="Rechercher un cours..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <select
            value={filters.semestre}
            onChange={(e) => setFilters({...filters, semestre: e.target.value})}
            style={styles.select}
          >
            <option value="S1">Semestre 1</option>
            <option value="S2">Semestre 2</option>
            <option value="Année">Année</option>
          </select>
          
          <select
            value={filters.anneeScolaire}
            onChange={(e) => setFilters({...filters, anneeScolaire: e.target.value})}
            style={styles.select}
          >
            {availableYears.length > 0 ? (
              availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))
            ) : (
              <>
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
              </>
            )}
          </select>
        </div>
      </div>

      <div style={styles.coursGrid}>
        {filteredCours.length === 0 ? (
          <div style={styles.emptyState}>
            <BookOpen size={48} color="#9ca3af" />
            <h3>Aucun bulletin trouvé</h3>
            <p>Aucune note n'a été enregistrée pour les étudiants de <strong>{filters.anneeScolaire}</strong> en <strong>{filters.semestre}</strong></p>
            {availableYears.length > 0 && (
              <p style={{marginTop: '12px', fontSize: '14px'}}>
                📅 Années disponibles : {availableYears.join(', ')}
              </p>
            )}
          </div>
        ) : (
          filteredCours.map(([coursNom, data]) => {
            const stats = calculateCoursStats(data);
            return (
              <div key={coursNom} style={styles.coursCard}>
                <div style={styles.coursHeader}>
                  <div style={styles.coursIcon}>
                    <BookOpen size={24} color="#3b82f6" />
                  </div>
                  <div style={styles.coursInfo}>
                    <h3 style={styles.coursName}>{coursNom}</h3>
                    <p style={styles.coursSubtitle}>
                      {stats.nombreMatieres} matière(s) • {data.totalEtudiants} étudiant(s)
                    </p>
                  </div>
                </div>

                {stats && (
                  <div style={styles.statsRow}>
                    <div style={styles.statBox}>
                      <Star size={16} color="#f59e0b" />
                      <div>
                        <div style={styles.statValue}>{stats.moyenneGenerale}</div>
                        <div style={styles.statLabel}>Moyenne</div>
                      </div>
                    </div>
                    <div style={styles.statBox}>
                      <TrendingUp size={16} color="#10b981" />
                      <div>
                        <div style={styles.statValue}>{stats.totalAdmis}</div>
                        <div style={styles.statLabel}>Admis</div>
                      </div>
                    </div>
                    <div style={styles.statBox}>
                      <AlertCircle size={16} color="#ef4444" />
                      <div>
                        <div style={styles.statValue}>{stats.totalEchecs}</div>
                        <div style={styles.statLabel}>Échecs</div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={styles.profsSection}>
                  <h4 style={styles.profsSectionTitle}>Professeurs & Matières</h4>
                  {data.professeurs.map((prof, idx) => (
                    <div key={idx} style={styles.profItem}>
                      <div style={styles.profInfo}>
                        <div style={styles.profName}>{prof.professeur}</div>
                        <div style={styles.matiereBadge}>{prof.matiere}</div>
                      </div>
                      <div style={styles.profStats}>
                        <span style={styles.profStatItem}>
                          {prof.nombreNotes} notes
                        </span>
                        <span style={styles.profStatItem}>
                          Moy: <strong>{prof.moyenneClasse}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => handleViewDetails(coursNom)}
                    style={styles.viewButton}
                  >
                    <Eye size={16} />
                    Voir détails
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showDetailModal && selectedCours && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {selectedCours.cours.nom} - {filters.semestre} - {filters.anneeScolaire}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={styles.modalContent}>
              {selectedCours.professeurs.map((prof, idx) => (
                <div key={idx} style={styles.profDetailSection}>
                  <div style={styles.profDetailHeader}>
                    <h3 style={styles.profDetailName}>
                      📚 {prof.matiere} - {prof.professeur}
                    </h3>
                    <div style={styles.profDetailStats}>
                      <span>Moyenne: <strong>{prof.moyenneClasse}/20</strong></span>
                      <span>Admis: <strong style={{color: '#10b981'}}>{prof.admis}</strong></span>
                      <span>Échecs: <strong style={{color: '#ef4444'}}>{prof.echecs}</strong></span>
                    </div>
                  </div>

                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Étudiant</th>
                          <th style={styles.th}>Année</th>
                          <th style={styles.th}>CC</th>
                          <th style={styles.th}>Examen</th>
                          <th style={styles.th}>Moyenne</th>
                          <th style={styles.th}>Statut</th>
                          <th style={styles.th}>Absences</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prof.bulletins
                          .sort((a, b) => (b.moyenneMatiere || 0) - (a.moyenneMatiere || 0))
                          .map(bulletin => (
                            <tr key={bulletin._id} style={styles.tr}>
                              <td style={styles.td}>{bulletin.etudiant?.nomComplet}</td>
                              <td style={styles.td}>
                                <span style={{fontSize: '12px', color: '#6b7280'}}>
                                  {bulletin.etudiant?.anneeScolaire}
                                </span>
                              </td>
                              <td style={styles.td}>{bulletin.noteControleContinu}/20</td>
                              <td style={styles.td}>{bulletin.noteExamen}/20</td>
                              <td style={styles.td}>
                                <strong>{(bulletin.moyenneMatiere || 0).toFixed(2)}/20</strong>
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.statusBadge,
                                  backgroundColor: (bulletin.moyenneMatiere || 0) >= 10 ? '#dcfce7' : '#fee2e2',
                                  color: (bulletin.moyenneMatiere || 0) >= 10 ? '#166534' : '#dc2626'
                                }}>
                                  {(bulletin.moyenneMatiere || 0) >= 10 ? '✓ Admis' : '✗ Échec'}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {bulletin.nombreAbsences > 0 && (
                                  <span style={{color: '#ef4444', fontWeight: '600'}}>
                                    {bulletin.nombreAbsences}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
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
    backgroundColor: '#f9fafb',
    padding: '20px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  filtersBar: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f9fafb',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  searchInput: {
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    fontSize: '14px',
    flex: 1
  },
  filterGroup: {
    display: 'flex',
    gap: '12px'
  },
  select: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  coursGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '20px'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    color: '#6b7280'
  },
  coursCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  coursHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f3f4f6'
  },
  coursIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coursInfo: {
    flex: 1
  },
  coursName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0'
  },
  coursSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  statBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827'
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  profsSection: {
    marginBottom: '16px'
  },
  profsSectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px'
  },
  profItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb'
  },
  profInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  profName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827'
  },
  matiereBadge: {
    padding: '2px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  profStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#6b7280'
  },
  profStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  cardActions: {
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6'
  },
  viewButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1000px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '28px',
    color: '#6b7280',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px'
  },
  modalContent: {
    padding: '24px',
    maxHeight: 'calc(85vh - 80px)',
    overflowY: 'auto'
  },
  profDetailSection: {
    marginBottom: '32px'
  },
  profDetailHeader: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e5e7eb'
  },
  profDetailName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px'
  },
  profDetailStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: '#6b7280'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb'
  },
  tr: {
    borderBottom: '1px solid #f3f4f6'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#111827'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  }
};

export default AdminBulletins;