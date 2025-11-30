import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, Clock, Check, X, AlertCircle, TrendingUp, Download, Filter, ChevronDown } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx-js-style';
import Sidebar from '../components/Sidebar';

const HistoriqueEtudiant = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [presenceHistory, setPresenceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  
  // Filtres
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [coursFilter, setCoursFilter] = useState('');
  const [availableCours, setAvailableCours] = useState([]);

// Dans HistoriqueEtudiant.js, remplacez la fonction searchStudents par :
const searchStudents = async (query) => {
  if (query.length < 2) {
    setStudents([]);
    return;
  }

  try {
    setSearchLoading(true);
    const token = localStorage.getItem('token');
    
    // Utiliser la route qui fonctionne pour récupérer tous les étudiants
    const response = await axios.get(`/api/etudiants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Filtrer côté client
    const filtered = response.data.filter(student => {
      const nomComplet = (student.nomComplet || '').toLowerCase();
      const nom = (student.nom || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      const queryLower = query.toLowerCase();
      
      return nomComplet.includes(queryLower) ||
             nom.includes(queryLower) ||
             email.includes(queryLower);
    }).slice(0, 10);
    
    setStudents(filtered);
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    setStudents([]);
  } finally {
    setSearchLoading(false);
  }
};

  // Récupérer l'historique d'un étudiant
  const fetchStudentHistory = async (studentId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/presences/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const history = response.data;
      setPresenceHistory(history);
      
      // Calculer les statistiques
      calculateStatistics(history);
      
      // Extraire les cours disponibles
      const cours = [...new Set(history.map(p => p.cours).filter(Boolean))];
      setAvailableCours(cours);
      
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      setPresenceHistory([]);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const calculateStatistics = (history) => {
    const total = history.length;
    const presents = history.filter(p => p.present).length;
    const absents = total - presents;
    const retards = history.filter(p => p.present && p.retardMinutes > 0).length;
    const tauxPresence = total > 0 ? Math.round((presents / total) * 100) : 0;

    // Statistiques par mois (derniers 6 mois)
    const now = new Date();
    const monthlyStats = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthHistory = history.filter(p => {
        const presenceDate = new Date(p.dateSession);
        return presenceDate >= monthStart && presenceDate <= monthEnd;
      });
      
      const monthPresents = monthHistory.filter(p => p.present).length;
      const monthTotal = monthHistory.length;
      const monthTaux = monthTotal > 0 ? Math.round((monthPresents / monthTotal) * 100) : 0;
      
      monthlyStats.push({
        month: monthDate.toLocaleString('fr-FR', { month: 'short', year: 'numeric' }),
        total: monthTotal,
        presents: monthPresents,
        taux: monthTaux
      });
    }

    setStatistics({
      total,
      presents,
      absents,
      retards,
      tauxPresence,
      monthlyStats
    });
  };

  // Filtrer l'historique
  const filteredHistory = presenceHistory.filter(presence => {
    // Filtre par dates
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (new Date(presence.dateSession) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (new Date(presence.dateSession) > to) return false;
    }
    
    // Filtre par statut
    if (statusFilter === 'present' && !presence.present) return false;
    if (statusFilter === 'absent' && presence.present) return false;
    if (statusFilter === 'retard' && (!presence.present || presence.retardMinutes === 0)) return false;
    
    // Filtre par cours
    if (coursFilter && presence.cours !== coursFilter) return false;
    
    return true;
  });

  // Export Excel
  const exportToExcel = () => {
    if (!selectedStudent || filteredHistory.length === 0) return;

    const data = filteredHistory.map(p => ({
      'Date': new Date(p.dateSession).toLocaleDateString('fr-FR'),
      'Cours': p.cours,
      'Matière': p.matiere || 'N/A',
      'Professeur': p.nomProfesseur || 'N/A',
      'Période': p.periode || 'N/A',
      'Heure': p.heure || 'N/A',
      'Statut': p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent',
      'Retard (min)': p.retardMinutes || 0,
      'Remarque': p.remarque || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historique');
    
    const filename = `historique_${selectedStudent.nomComplet.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchStudents(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      marginBottom: '24px'
    },
    searchContainer: {
      padding: '24px'
    },
    searchBar: {
      position: 'relative',
      marginBottom: '16px'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 44px',
      fontSize: '14px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af'
    },
    studentsList: {
      maxHeight: '200px',
      overflowY: 'auto',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: 'white'
    },
    studentItem: {
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      padding: '20px',
      borderRadius: '12px',
      textAlign: 'center'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: '1px solid #e5e7eb'
    },
    td: {
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6',
      verticalAlign: 'middle'
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500'
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none'
    },
    filterInput: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white'
    },
    filterSelect: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <Sidebar onLogout={handleLogout} />

        {/* Header */}
        <div style={styles.card}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              Historique des Présences
            </h1>
            <p style={{ color: '#6b7280', marginTop: '8px' }}>
              Recherchez un étudiant pour voir son historique complet
            </p>
          </div>
        </div>

        {/* Recherche d'étudiant */}
        <div style={styles.card}>
          <div style={styles.searchContainer}>
            <div style={styles.searchBar}>
              <Search size={20} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Rechercher un étudiant par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                Recherche en cours...
              </div>
            )}

            {students.length > 0 && (
              <div style={styles.studentsList}>
                {students.map((student) => (
                  <div
                    key={student._id}
                    style={styles.studentItem}
                    onClick={() => {
                      setSelectedStudent(student);
                      setSearchTerm('');
                      setStudents([]);
                      fetchStudentHistory(student._id);
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <User size={20} color="#6b7280" />
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {student.nomComplet}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {student.email} • {student.cours}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Étudiant sélectionné */}
        {selectedStudent && (
          <>
            {/* Informations de l'étudiant */}
            <div style={styles.card}>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}>
                    {selectedStudent.nomComplet.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                      {selectedStudent.nomComplet}
                    </h2>
                    <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
                      {selectedStudent.email} • Classe: {selectedStudent.cours}
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      onClick={exportToExcel}
                      style={{
                        ...styles.button,
                        backgroundColor: '#10b981',
                        color: 'white'
                      }}
                      disabled={filteredHistory.length === 0}
                    >
                      <Download size={16} />
                      Exporter Excel
                    </button>
                  </div>
                </div>

                {/* Statistiques */}
                {statistics && (
                  <div style={styles.statsGrid}>
                    <div style={{
                      ...styles.statCard,
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe'
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af' }}>
                        {statistics.total}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        Total Sessions
                      </div>
                    </div>
                    
                    <div style={{
                      ...styles.statCard,
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0'
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#166534' }}>
                        {statistics.presents}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        Présences
                      </div>
                    </div>
                    
                    <div style={{
                      ...styles.statCard,
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca'
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#991b1b' }}>
                        {statistics.absents}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        Absences
                      </div>
                    </div>
                    
                    <div style={{
                      ...styles.statCard,
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a'
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#92400e' }}>
                        {statistics.retards}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        Retards
                      </div>
                    </div>
                    
                    <div style={{
                      ...styles.statCard,
                      backgroundColor: statistics.tauxPresence >= 80 ? '#f0fdf4' : statistics.tauxPresence >= 60 ? '#fef3c7' : '#fef2f2',
                      border: `1px solid ${statistics.tauxPresence >= 80 ? '#bbf7d0' : statistics.tauxPresence >= 60 ? '#fde68a' : '#fecaca'}`
                    }}>
                      <div style={{ 
                        fontSize: '32px', 
                        fontWeight: 'bold', 
                        color: statistics.tauxPresence >= 80 ? '#166534' : statistics.tauxPresence >= 60 ? '#92400e' : '#991b1b'
                      }}>
                        {statistics.tauxPresence}%
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        Taux de Présence
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filtres */}
            <div style={styles.card}>
              <div style={{ padding: '20px' }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    ...styles.button,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    marginBottom: showFilters ? '20px' : '0'
                  }}
                >
                  <Filter size={16} />
                  Filtres
                  <ChevronDown 
                    size={16} 
                    style={{ 
                      transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }} 
                  />
                </button>

                {showFilters && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        style={styles.filterInput}
                      />
                    </div>
                    
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Date de fin
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        style={styles.filterInput}
                      />
                    </div>
                    
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Statut
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={styles.filterSelect}
                      >
                        <option value="all">Tous</option>
                        <option value="present">Présent</option>
                        <option value="absent">Absent</option>
                        <option value="retard">En retard</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Cours
                      </label>
                      <select
                        value={coursFilter}
                        onChange={(e) => setCoursFilter(e.target.value)}
                        style={styles.filterSelect}
                      >
                        <option value="">Tous les cours</option>
                        {availableCours.map(cours => (
                          <option key={cours} value={cours}>{cours}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Historique */}
            <div style={styles.card}>
              <div style={{ padding: '20px 20px 0 20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' }}>
                  Historique des Présences ({filteredHistory.length} entrées)
                </h3>
              </div>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Chargement de l'historique...
                </div>
              ) : filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Aucune donnée trouvée
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={styles.th}>
                          <Calendar size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                          Date
                        </th>
                        <th style={styles.th}>Cours</th>
                        <th style={styles.th}>Matière</th>
                        <th style={styles.th}>Professeur</th>
                        <th style={styles.th}>
                          <Clock size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                          Période/Heure
                        </th>
                        <th style={styles.th}>Statut</th>
                        <th style={styles.th}>Remarque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory
                        .sort((a, b) => new Date(b.dateSession) - new Date(a.dateSession))
                        .map((presence, index) => (
                        <tr key={index} style={{ transition: 'background-color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '500' }}>
                              {formatDate(presence.dateSession)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '500', color: '#111827' }}>
                              {presence.cours}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ color: '#6b7280' }}>
                              {presence.matiere || '—'}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ color: '#6b7280' }}>
                              {presence.nomProfesseur || '—'}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ color: '#6b7280', fontSize: '13px' }}>
                              {presence.periode && presence.heure 
                                ? `${presence.heure} (${presence.periode})`
                                : presence.heure || presence.periode || '—'
                              }
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                ...styles.badge,
                                backgroundColor: presence.present 
                                  ? (presence.retardMinutes > 0 ? '#fef3c7' : '#f0fdf4')
                                  : '#fef2f2',
                                color: presence.present 
                                  ? (presence.retardMinutes > 0 ? '#92400e' : '#166534')
                                  : '#991b1b',
                                border: `1px solid ${presence.present 
                                  ? (presence.retardMinutes > 0 ? '#fde68a' : '#bbf7d0')
                                  : '#fecaca'}`
                              }}>
                                {presence.present ? (
                                  presence.retardMinutes > 0 ? (
                                    <>
                                      <AlertCircle size={12} />
                                      En retard ({presence.retardMinutes}min)
                                    </>
                                  ) : (
                                    <>
                                      <Check size={12} />
                                      Présent
                                    </>
                                  )
                                ) : (
                                  <>
                                    <X size={12} />
                                    Absent
                                  </>
                                )}
                              </span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ color: '#6b7280', fontSize: '13px' }}>
                              {presence.remarque || '—'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HistoriqueEtudiant;