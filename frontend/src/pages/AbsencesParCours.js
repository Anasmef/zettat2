import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Users, 
  Calendar, 
  Phone, 
  Mail, 
  TrendingDown, 
  BookOpen,
  UserX,
  Clock,
  Target,
  Activity,
  ChevronDown,
  ChevronUp,
  Search,
  Grid,
  List,
  Filter,
  MoreHorizontal,
  MapPin,
  GraduationCap,
  CalendarDays,
  Percent,
  Eye
} from 'lucide-react';
import Sidebar from '../components/SidebarProf';

const AbsencesParCours = () => {
  const [cours, setCours] = useState([]);
  const [coursSelectionne, setCoursSelectionne] = useState('');
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsFiltres, setEtudiantsFiltres] = useState([]);
  const [statistiques, setStatistiques] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
  const [filterLevel, setFilterLevel] = useState('all'); // 'all', 'problematic', 'critical'

  // Récupérer les cours du professeur
  useEffect(() => {
    const fetchCours = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/professeur/mes-cours', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCours(data);
          if (data.length > 0) {
            setCoursSelectionne(data[0].nom);
          }
        }
      } catch (err) {
        setError('Erreur lors du chargement des cours');
      }
    };

    fetchCours();
  }, []);

  // Récupérer les absences du cours sélectionné
  useEffect(() => {
    if (coursSelectionne) {
      fetchAbsences(coursSelectionne);
    }
  }, [coursSelectionne]);

  // Filtrer les étudiants selon la recherche et le filtre
  useEffect(() => {
    let filtered = etudiants;

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(etudiant =>
        etudiant.nomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        etudiant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        etudiant.telephoneEtudiant.includes(searchTerm)
      );
    }

    // Filtrage par niveau de problème
    if (filterLevel === 'problematic') {
      filtered = filtered.filter(etudiant => etudiant.absences.total >= 3);
    } else if (filterLevel === 'critical') {
      filtered = filtered.filter(etudiant => etudiant.absences.total >= 5);
    }

    setEtudiantsFiltres(filtered);
  }, [etudiants, searchTerm, filterLevel]);

  const fetchAbsences = async (nomCours) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/professeur/etudiants-absences/${nomCours}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEtudiants(data.etudiants);
        setStatistiques(data.statistiques);
      } else {
        throw new Error('Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur lors du chargement des absences');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const getStatutColor = (totalAbsences) => {
    if (totalAbsences >= 5) return { 
      backgroundColor: '#fee2e2', 
      color: '#dc2626', 
      borderColor: '#fecaca' 
    };
    if (totalAbsences >= 3) return { 
      backgroundColor: '#fed7aa', 
      color: '#ea580c', 
      borderColor: '#fdba74' 
    };
    if (totalAbsences >= 1) return { 
      backgroundColor: '#fef3c7', 
      color: '#d97706', 
      borderColor: '#fde68a' 
    };
    return { 
      backgroundColor: '#dcfce7', 
      color: '#16a34a', 
      borderColor: '#bbf7d0' 
    };
  };

  const getStatutText = (totalAbsences) => {
    if (totalAbsences >= 5) return 'Critique';
    if (totalAbsences >= 3) return 'Attention';
    if (totalAbsences >= 1) return 'Surveillé';
    return 'Bon';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const toggleStudentDetails = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  // Composant pour la vue en cartes
  const CardView = () => (
    <div style={styles.cardsGrid}>
      {etudiantsFiltres.map((etudiant) => {
        const statut = getStatutColor(etudiant.absences.total);
        const isExpanded = expandedStudent === etudiant._id;
        
        return (
          <div key={etudiant._id} style={styles.studentCardModern}>
            {/* En-tête de la carte */}
            <div style={styles.cardHeader}>
              <div style={styles.studentInfoModern}>
                <div style={styles.avatar}>
                  {etudiant.image ? (
                    <img 
                      src={`/api${etudiant.image}`} 
                      alt={etudiant.nomComplet}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <span style={styles.avatarText}>
                      {etudiant.nomComplet.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                <div style={styles.studentDetailsModern}>
                  <h4 style={styles.studentNameModern}>{etudiant.nomComplet}</h4>
                  <div style={{...styles.statutBadgeModern, ...statut}}>
                    {getStatutText(etudiant.absences.total)}
                  </div>
                </div>
              </div>
              
              <button 
                style={styles.expandButton}
                onClick={() => toggleStudentDetails(etudiant._id)}
              >
                <Eye style={styles.expandButtonIcon} />
              </button>
            </div>
            
            {/* Statistiques principales */}
            <div style={styles.cardStats}>
              <div style={styles.cardStat}>
                <div style={styles.cardStatNumber}>{etudiant.absences.total}</div>
                <div style={styles.cardStatLabel}>Absences totales</div>
              </div>
              <div style={styles.cardStat}>
                <div style={styles.cardStatNumber}>{etudiant.absences.ceMois}</div>
                <div style={styles.cardStatLabel}>Ce mois</div>
              </div>
              <div style={styles.cardStat}>
                <div style={styles.cardStatNumber}>{etudiant.sessions.tauxPresence}%</div>
                <div style={styles.cardStatLabel}>Présence</div>
              </div>
            </div>
            
            {/* Informations de contact */}
            <div style={styles.cardContact}>
              <div style={styles.contactItemModern}>
                <Phone style={styles.contactIconModern} />
                <span>{etudiant.telephoneEtudiant}</span>
              </div>
              <div style={styles.contactItemModern}>
                <Mail style={styles.contactIconModern} />
                <span>{etudiant.email}</span>
              </div>
            </div>
            
            {/* Détails expandables */}
            {isExpanded && (
              <div style={styles.cardExpanded}>
                <div style={styles.expandedHeader}>
                  <Calendar style={styles.expandedIcon} />
                  <span>Historique des absences</span>
                </div>
                
                {etudiant.absences.details.length > 0 ? (
                  <div style={styles.absenceListCard}>
                    {etudiant.absences.details.slice(0, 5).map((absence, index) => (
                      <div key={index} style={styles.absenceItemCard}>
                        <div style={styles.absenceDateCard}>
                          <Clock style={styles.absenceDateIconCard} />
                          {formatDate(absence.dateSession)}
                        </div>
                        {absence.periode && (
                          <div style={styles.absencePeriodeCard}>
                            {absence.periode}
                          </div>
                        )}
                        {absence.remarque && (
                          <div style={styles.absenceRemarqueCard}>
                            "{absence.remarque}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.noAbsencesCard}>
                    <Target style={styles.noAbsencesIconCard} />
                    <span>Aucune absence enregistrée</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Composant pour la vue en tableau
  const TableView = () => (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.th}>Étudiant</th>
            <th style={styles.th}>Contact</th>
            <th style={styles.th}>Statut</th>
            <th style={styles.th}>Total Absences</th>
            <th style={styles.th}>Ce Mois</th>
            <th style={styles.th}>Taux Présence</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {etudiantsFiltres.map((etudiant) => {
            const statut = getStatutColor(etudiant.absences.total);
            
            return (
              <tr key={etudiant._id} style={styles.tableRow}>
                <td style={styles.td}>
                  <div style={styles.studentInfoTable}>
                    <div style={styles.avatarSmall}>
                      {etudiant.image ? (
                        <img 
                          src={`/api${etudiant.image}`} 
                          alt={etudiant.nomComplet}
                          style={styles.avatarImageSmall}
                        />
                      ) : (
                        <span style={styles.avatarTextSmall}>
                          {etudiant.nomComplet.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span style={styles.studentNameTable}>{etudiant.nomComplet}</span>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.contactTable}>
                    <div>{etudiant.telephoneEtudiant}</div>
                    <div style={styles.emailTable}>{etudiant.email}</div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{...styles.statutBadgeTable, ...statut}}>
                    {getStatutText(etudiant.absences.total)}
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={styles.numberBold}>{etudiant.absences.total}</span>
                </td>
                <td style={styles.td}>
                  <span style={styles.numberBold}>{etudiant.absences.ceMois}</span>
                </td>
                <td style={styles.td}>
                  <span style={styles.numberBold}>{etudiant.sessions.tauxPresence}%</span>
                </td>
                <td style={styles.td}>
                  <button 
                    style={styles.actionButton}
                    onClick={() => toggleStudentDetails(etudiant._id)}
                  >
                    <Eye style={styles.actionButtonIcon} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={styles.container}>
      <Sidebar onLogout={handleLogout} />
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <UserX style={styles.titleIcon} />
            <h1 style={styles.title}>Suivi des Absences par Cours</h1>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={styles.mainContent}>
        {/* Section de contrôles */}
        <div style={styles.controlsSection}>
          {/* Sélecteur de cours */}
          <div style={styles.selectionCard}>
            <div style={styles.selectionHeader}>
              <BookOpen style={styles.selectionIcon} />
              <h2 style={styles.selectionTitle}>Cours sélectionné</h2>
            </div>
            <select
              value={coursSelectionne}
              onChange={(e) => setCoursSelectionne(e.target.value)}
              style={styles.courseSelect}
            >
              {cours.map((c) => (
                <option key={c._id} value={c.nom}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Barre de recherche et filtres */}
          <div style={styles.searchAndFilters}>
            <div style={styles.searchContainer}>
              <Search style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Rechercher un étudiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            
            <div style={styles.filtersContainer}>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">Tous les étudiants</option>
                <option value="problematic">Problématiques (3+)</option>
                <option value="critical">Critiques (5+)</option>
              </select>
              
              <div style={styles.viewToggle}>
                <button
                  style={{
                    ...styles.viewButton,
                    ...(viewMode === 'cards' ? styles.viewButtonActive : {})
                  }}
                  onClick={() => setViewMode('cards')}
                >
                  <Grid style={styles.viewButtonIcon} />
                </button>
                <button
                  style={{
                    ...styles.viewButton,
                    ...(viewMode === 'table' ? styles.viewButtonActive : {})
                  }}
                  onClick={() => setViewMode('table')}
                >
                  <List style={styles.viewButtonIcon} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques améliorées */}
        {statistiques && (
          <div style={styles.statsGridImproved}>
            <div style={styles.statCardImproved}>
              <div style={styles.statHeaderImproved}>
                <Users style={styles.statIconImproved} />
                <span style={styles.statTitleImproved}>Total Étudiants</span>
              </div>
              <div style={styles.statValueImproved}>{statistiques.totalEtudiants}</div>
              <div style={styles.statSubtext}>
                Affichés: {etudiantsFiltres.length}
              </div>
            </div>
            
            <div style={styles.statCardImproved}>
              <div style={styles.statHeaderImproved}>
                <AlertTriangle style={styles.statIconImproved} />
                <span style={styles.statTitleImproved}>Problématiques</span>
              </div>
              <div style={{...styles.statValueImproved, color: '#ea580c'}}>
                {statistiques.etudiantsProblematiques}
              </div>
              <div style={styles.statSubtext}>
                {((statistiques.etudiantsProblematiques / statistiques.totalEtudiants) * 100).toFixed(1)}% du total
              </div>
            </div>
            
            <div style={styles.statCardImproved}>
              <div style={styles.statHeaderImproved}>
                <TrendingDown style={styles.statIconImproved} />
                <span style={styles.statTitleImproved}>Critiques</span>
              </div>
              <div style={{...styles.statValueImproved, color: '#dc2626'}}>
                {statistiques.etudiantsCritiques}
              </div>
              <div style={styles.statSubtext}>
                Nécessitent une attention immédiate
              </div>
            </div>
            
            <div style={styles.statCardImproved}>
              <div style={styles.statHeaderImproved}>
                <Percent style={styles.statIconImproved} />
                <span style={styles.statTitleImproved}>Taux de Réussite</span>
              </div>
              <div style={{...styles.statValueImproved, color: '#16a34a'}}>
                {((statistiques.totalEtudiants - statistiques.etudiantsProblematiques) / statistiques.totalEtudiants * 100).toFixed(1)}%
              </div>
              <div style={styles.statSubtext}>
                Étudiants avec bon suivi
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal basé sur le mode de vue */}
        {loading ? (
          <div style={styles.loadingCard}>
            <Activity style={styles.loadingIcon} />
            <span>Chargement des données...</span>
          </div>
        ) : error ? (
          <div style={styles.errorCard}>
            <AlertTriangle style={styles.errorIcon} />
            <span>{error}</span>
          </div>
        ) : (
          <div style={styles.studentsContainer}>
            <div style={styles.studentsHeader}>
              <h3 style={styles.studentsTitle}>
                {viewMode === 'cards' ? 'Vue en cartes' : 'Vue en tableau'} 
                ({etudiantsFiltres.length} étudiant{etudiantsFiltres.length > 1 ? 's' : ''})
              </h3>
            </div>
            
            {etudiantsFiltres.length === 0 ? (
              <div style={styles.emptyState}>
                <Users style={styles.emptyIcon} />
                <span>
                  {searchTerm || filterLevel !== 'all' 
                    ? 'Aucun étudiant ne correspond aux critères de recherche'
                    : 'Aucun étudiant trouvé pour ce cours'
                  }
                </span>
              </div>
            ) : viewMode === 'cards' ? (
              <CardView />
            ) : (
              <TableView />
            )}
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(229, 231, 235, 0.6)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px'
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px 0'
  },
  titleIcon: {
    width: '32px',
    height: '32px',
    color: '#dc2626'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  controlsSection: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '24px',
    alignItems: 'start'
  },
  selectionCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(229, 231, 235, 0.5)'
  },
  selectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  selectionIcon: {
    width: '20px',
    height: '20px',
    color: '#3b82f6'
  },
  selectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  courseSelect: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    outline: 'none',
    cursor: 'pointer'
  },
  searchAndFilters: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    width: '20px',
    height: '20px',
    color: '#6b7280',
    zIndex: 1
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  },
  filterSelect: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    outline: 'none',
    cursor: 'pointer'
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '4px'
  },
  viewButton: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  viewButtonActive: {
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  viewButtonIcon: {
    width: '18px',
    height: '18px',
    color: '#6b7280'
  },
  statsGridImproved: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  statCardImproved: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    transition: 'transform 0.2s ease'
  },
  statHeaderImproved: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px'
  },
  statIconImproved: {
    width: '20px',
    height: '20px',
    color: '#6b7280'
  },
  statTitleImproved: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280'
  },
  statValueImproved: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '8px'
  },
  statSubtext: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  studentsContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    overflow: 'hidden'
  },
  studentsHeader: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  studentsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    padding: '24px'
  },
  studentCardModern: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  studentInfoModern: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  avatarText: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '600'
  },
  studentDetailsModern: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  studentNameModern: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  statutBadgeModern: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid',
    width: 'fit-content'
  },
  expandButton: {
    padding: '8px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  expandButtonIcon: {
    width: '16px',
    height: '16px',
    color: '#6b7280'
  },
  cardStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '16px'
  },
  cardStat: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  cardStatNumber: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px'
  },
  cardStatLabel: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '500'
  },
  cardContact: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  contactItemModern: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280'
  },
  contactIconModern: {
    width: '14px',
    height: '14px'
  },
  cardExpanded: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px'
  },
  expandedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  expandedIcon: {
    width: '16px',
    height: '16px',
    color: '#6b7280'
  },
  absenceListCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  absenceItemCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  absenceDateCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151'
  },
  absenceDateIconCard: {
    width: '12px',
    height: '12px'
  },
  absencePeriodeCard: {
    padding: '2px 6px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '500'
  },
  absenceRemarqueCard: {
    fontSize: '11px',
    color: '#6b7280',
    fontStyle: 'italic',
    flex: 1
  },
  noAbsencesCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px'
  },
  noAbsencesIconCard: {
    width: '16px',
    height: '16px'
  },
  // Styles pour la vue tableau
  tableContainer: {
    overflowX: 'auto',
    padding: '24px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff'
  },
  tableHeader: {
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)'
  },
  th: {
    padding: '16px 20px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e5e7eb'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s ease'
  },
  td: {
    padding: '16px 20px',
    verticalAlign: 'middle'
  },
  studentInfoTable: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatarSmall: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0
  },
  avatarImageSmall: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  avatarTextSmall: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600'
  },
  studentNameTable: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  contactTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  emailTable: {
    fontSize: '12px',
    color: '#6b7280'
  },
  statutBadgeTable: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid',
    width: 'fit-content'
  },
  numberBold: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  actionButton: {
    padding: '6px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  actionButtonIcon: {
    width: '14px',
    height: '14px',
    color: '#6b7280'
  },
  // États communs
  loadingCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '40px',
    color: '#6b7280'
  },
  loadingIcon: {
    width: '20px',
    height: '20px',
    animation: 'spin 1s linear infinite'
  },
  errorCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: '#fee2e2',
    borderRadius: '16px',
    padding: '40px',
    color: '#dc2626'
  },
  errorIcon: {
    width: '20px',
    height: '20px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 40px',
    color: '#6b7280',
    textAlign: 'center'
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    color: '#d1d5db',
    marginBottom: '8px'
  },
  // Nouveaux styles pour la vue tableau étendue
  expandedRow: {
    backgroundColor: '#f9fafb'
  },
  expandedCell: {
    padding: '0',
    border: 'none'
  },
  tableExpandedContent: {
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  tableExpandedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  tableExpandedTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  tableAbsenceList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '12px'
  },
  tableAbsenceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  tableAbsenceDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    minWidth: '100px'
  },
  tableAbsencePeriode: {
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500'
  },
  tableAbsenceRemarque: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    flex: 1
  },
  tableMoreAbsences: {
    textAlign: 'center',
    padding: '12px',
    color: '#6b7280',
    fontSize: '13px',
    fontStyle: 'italic',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    gridColumn: '1 / -1'
  },
  tableNoAbsences: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px',
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px'
  }
};

export default AbsencesParCours