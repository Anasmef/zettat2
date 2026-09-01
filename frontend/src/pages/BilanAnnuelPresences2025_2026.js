import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Download, Archive, Users, TrendingUp,
  TrendingDown, Clock, ChevronUp, ChevronDown, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import Sidebar from '../components/Sidebar';
import {
  studentsArchive2025_2026,
  ANNEE_SCOLAIRE,
  DATE_ARCHIVAGE
} from '../data/studentsArchive2025_2026';

// ============================================================
// Page STATIQUE — Bilan annuel des présences (année 2025/2026)
// ------------------------------------------------------------
// Ces données proviennent d'un export figé (resume_presences.csv)
// et NE sont PAS relues depuis l'API /api/presences. Elles restent
// donc consultables même après une purge de la collection "presences".
// ============================================================

const NIVEAU_ORDER = {
  '2BAC PC': 1,
  '2BAC Économie': 2,
  '1BAC SC': 3,
  '1BAC Économie': 4,
  'Tronc Commun': 5,
  '3AC': 6,
  '2AC': 7,
  '1AC': 8,
  'Non spécifié': 99
};

const BilanAnnuelPresences2025_2026 = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [niveauFilter, setNiveauFilter] = useState('');
  const [tauxFilter, setTauxFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nom', direction: 'asc' });

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const availableNiveaux = useMemo(() => {
    return [...new Set(studentsArchive2025_2026.map(s => s.niveau))]
      .sort((a, b) => (NIVEAU_ORDER[a] || 999) - (NIVEAU_ORDER[b] || 999));
  }, []);

  // Statistiques globales de l'archive
  const globalStats = useMemo(() => {
    const totalEtudiants = studentsArchive2025_2026.length;
    const totalSessions = studentsArchive2025_2026.reduce((s, e) => s + e.totalSessions, 0);
    const totalPresences = studentsArchive2025_2026.reduce((s, e) => s + e.totalPresences, 0);
    const totalAbsences = studentsArchive2025_2026.reduce((s, e) => s + e.totalAbsences, 0);
    const totalRetardMinutes = studentsArchive2025_2026.reduce((s, e) => s + e.totalRetardMinutes, 0);
    const tauxMoyen = totalSessions > 0 ? Math.round((totalPresences / totalSessions) * 100) : 0;
    return { totalEtudiants, totalSessions, totalPresences, totalAbsences, totalRetardMinutes, tauxMoyen };
  }, []);

  const filteredStudents = useMemo(() => {
    let result = [...studentsArchive2025_2026];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.nom.toLowerCase().includes(term) ||
        s.codeMassar.toLowerCase().includes(term)
      );
    }

    if (niveauFilter) {
      result = result.filter(s => s.niveau === niveauFilter);
    }

    if (tauxFilter) {
      result = result.filter(s => {
        if (tauxFilter === 'high') return s.tauxPresence >= 80;
        if (tauxFilter === 'medium') return s.tauxPresence >= 50 && s.tauxPresence < 80;
        if (tauxFilter === 'low') return s.tauxPresence < 50;
        return true;
      });
    }

    result.sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA = a[key];
      let valB = b[key];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return direction === 'asc' ? valA.localeCompare(valB, 'fr') : valB.localeCompare(valA, 'fr');
      }
      return direction === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [searchTerm, niveauFilter, tauxFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setNiveauFilter('');
    setTauxFilter('');
  };

  const exportToExcel = () => {
    const header = [
      'Étudiant', 'Code Massar', 'Niveau', 'Total Sessions',
      'Total Présences', 'Total Absences', 'Retard (min)', 'Taux Présence (%)'
    ];
    const rows = filteredStudents.map(s => ([
      s.nom, s.codeMassar, s.niveau, s.totalSessions,
      s.totalPresences, s.totalAbsences, s.totalRetardMinutes, s.tauxPresence
    ]));

    const aoa = [
      [`BILAN ANNUEL DES PRÉSENCES — ${ANNEE_SCOLAIRE}`, ...Array(header.length - 1).fill('')],
      Array(header.length).fill(''),
      header,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];
    ws['!cols'] = [
      { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
      { wch: 15 }, { wch: 14 }, { wch: 13 }, { wch: 15 }
    ];

    const titleStyle = {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '111827' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerStyle = {
      font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2563EB' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const dataStyle = {
      font: { sz: 9 },
      border: {
        top: { style: 'hair', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'hair', color: { rgb: 'DDDDDD' } },
        left: { style: 'hair', color: { rgb: 'DDDDDD' } },
        right: { style: 'hair', color: { rgb: 'DDDDDD' } }
      }
    };

    for (let r = 0; r < aoa.length; r++) {
      for (let c = 0; c < header.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        if (r === 0) ws[addr].s = titleStyle;
        else if (r === 2) ws[addr].s = headerStyle;
        else if (r > 2) ws[addr].s = dataStyle;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Bilan ${ANNEE_SCOLAIRE.replace('/', '-')}`);
    XLSX.writeFile(wb, `bilan_annuel_presences_${ANNEE_SCOLAIRE.replace('/', '-')}.xlsx`);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    maxWidth: { maxWidth: '1200px', margin: '0 auto' },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      marginBottom: '24px'
    },
    header: { padding: '24px' },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      fontSize: '13px',
      fontWeight: '500',
      color: '#374151',
      backgroundColor: '#f3f4f6',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      cursor: 'pointer',
      marginBottom: '16px'
    },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0, textAlign: 'center' },
    archiveBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: '#fef3c7',
      color: '#92400e',
      fontSize: '12px',
      fontWeight: '600',
      marginTop: '8px'
    },
    subtitle: { color: '#6b7280', margin: '8px 0 0 0', fontSize: '13px', textAlign: 'center' },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      padding: '0 24px 24px 24px'
    },
    statCard: { padding: '16px', borderRadius: '8px', border: '1px solid' },
    searchContainer: { padding: '24px', borderTop: '1px solid #e5e7eb' },
    searchBar: { position: 'relative', marginBottom: '16px' },
    searchInput: {
      width: '100%', padding: '12px 16px 12px 44px', fontSize: '14px',
      border: '2px solid #e5e7eb', borderRadius: '10px', outline: 'none'
    },
    searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
    filtersRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
    filterSelect: {
      padding: '8px 12px', fontSize: '14px', border: '1px solid #d1d5db',
      borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer'
    },
    clearButton: {
      padding: '8px 16px', fontSize: '12px', fontWeight: '500', color: '#6b7280',
      backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer'
    },
    exportButton: {
      display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
      fontSize: '14px', fontWeight: '500', color: 'white', backgroundColor: '#059669',
      border: 'none', borderRadius: '8px', cursor: 'pointer'
    },
    resultsCount: { fontSize: '14px', color: '#6b7280', margin: '16px 0 0 0' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: {
      padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500',
      color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
      userSelect: 'none'
    },
    td: { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' },
    progressBar: { width: '90px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '4px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <Sidebar onLogout={handleLogout} />

        <div style={styles.card}>
          <div style={styles.header}>
            <button style={styles.backButton} onClick={() => navigate('/liste-presences')}>
              <ArrowLeft size={16} />
              Retour à la liste des présences
            </button>

            <h1 style={styles.title}>Bilan Annuel des Présences</h1>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={styles.archiveBadge}>
                <Archive size={13} />
                Données archivées — non modifiables
              </span>
            </div>
            <p style={styles.subtitle}>
              Année scolaire {ANNEE_SCOLAIRE} · Bilan figé le {new Date(DATE_ARCHIVAGE).toLocaleDateString('fr-FR')} ·{' '}
              {globalStats.totalEtudiants} étudiants
            </p>
          </div>

          {/* Stats globales */}
          <div style={styles.statsGrid}>
            <div style={{ ...styles.statCard, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Users size={18} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Étudiants</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{globalStats.totalEtudiants}</p>
            </div>
            <div style={{ ...styles.statCard, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp size={18} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Total présences</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{globalStats.totalPresences}</p>
            </div>
            <div style={{ ...styles.statCard, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingDown size={18} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Total absences</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{globalStats.totalAbsences}</p>
            </div>
            <div style={{ ...styles.statCard, backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#92400e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={18} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Retard cumulé</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{globalStats.totalRetardMinutes} min</p>
            </div>
          </div>

          {/* Recherche et filtres */}
          <div style={styles.searchContainer}>
            <div style={styles.searchBar}>
              <Search size={20} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Rechercher par nom ou code Massar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.filtersRow}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <select
                  value={niveauFilter}
                  onChange={(e) => setNiveauFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">Tous les niveaux</option>
                  {availableNiveaux.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>

                <select
                  value={tauxFilter}
                  onChange={(e) => setTauxFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">Tous les taux</option>
                  <option value="high">Élevé (≥80%)</option>
                  <option value="medium">Moyen (50-79%)</option>
                  <option value="low">Faible (&lt;50%)</option>
                </select>

                {(searchTerm || niveauFilter || tauxFilter) && (
                  <button style={styles.clearButton} onClick={clearFilters}>
                    Effacer les filtres
                  </button>
                )}
              </div>

              <button style={styles.exportButton} onClick={exportToExcel}>
                <Download size={16} />
                Exporter Excel
              </button>
            </div>

            <p style={styles.resultsCount}>
              {filteredStudents.length} étudiant{filteredStudents.length !== 1 ? 's' : ''} affiché
              {filteredStudents.length !== 1 ? 's' : ''}
              {filteredStudents.length !== studentsArchive2025_2026.length && (
                <span> sur {studentsArchive2025_2026.length} au total</span>
              )}
            </p>
          </div>
        </div>

        {/* Tableau */}
        <div style={styles.card}>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
              <AlertCircle size={40} color="#9ca3af" style={{ marginBottom: '12px' }} />
              <p>Aucun étudiant ne correspond à ces critères.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    {[
                      { key: 'nom', label: 'Étudiant' },
                      { key: 'codeMassar', label: 'Code Massar' },
                      { key: 'niveau', label: 'Niveau' },
                      { key: 'totalSessions', label: 'Sessions' },
                      { key: 'totalPresences', label: 'Présences' },
                      { key: 'totalAbsences', label: 'Absences' },
                      { key: 'totalRetardMinutes', label: 'Retard (min)' },
                      { key: 'tauxPresence', label: 'Taux' }
                    ].map(col => (
                      <th key={col.key} style={styles.th} onClick={() => handleSort(col.key)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {col.label}
                          {sortConfig.key === col.key && (
                            sortConfig.direction === 'asc'
                              ? <ChevronUp size={13} />
                              : <ChevronDown size={13} />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => (
                    <tr key={`${s.codeMassar}-${idx}`}>
                      <td style={styles.td}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>{s.nom}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#6b7280' }}>{s.codeMassar}</span>
                      </td>
                      <td style={styles.td}>{s.niveau}</td>
                      <td style={styles.td}>{s.totalSessions}</td>
                      <td style={styles.td}>
                        <span style={{ color: '#166534', fontWeight: '500' }}>{s.totalPresences}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#991b1b', fontWeight: '500' }}>{s.totalAbsences}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: s.totalRetardMinutes > 0 ? '#92400e' : '#6b7280' }}>
                          {s.totalRetardMinutes}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={styles.progressBar}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${s.tauxPresence}%`,
                                backgroundColor:
                                  s.tauxPresence >= 80 ? '#10b981' :
                                  s.tauxPresence >= 50 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                            {s.tauxPresence}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BilanAnnuelPresences2025_2026;