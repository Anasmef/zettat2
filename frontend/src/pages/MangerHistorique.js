import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Calendar, Check, X, AlertCircle, Download,
  ArrowLeft, RefreshCw, Users, BookOpen, UserCheck, UserX, TrendingUp
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx-js-style';
import Sidebar from '../components/Sidebarmanager';
import Header from '../components/Header';
import './AdminDashboard.css';
import './MangerHistorique.css';

const PAGE_BG = { background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)' };

const KpiCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <div className={`stat-card ${colorClass}`}>
    <div className="stat-card-content">
      <div className="stat-card-info">
        <p className="stat-card-title">{title}</p>
        <p className="stat-card-value">{value}</p>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
      </div>
      <div className="stat-card-icon">
        <Icon />
      </div>
    </div>
  </div>
);

/* ============================================================
   Suivi des présences — vue manager
   2 écrans seulement : la liste des étudiants, et l'historique
   complet d'un étudiant (tous les filtres, tout l'historique).
   ============================================================ */

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR');

const getStatus = (p) => {
  if (!p.present) return 'absent';
  if (p.retardMinutes > 0) return 'retard';
  return 'present';
};

const STATUS_LABEL = { present: 'Présent', retard: 'En retard', absent: 'Absent' };

const tauxClass = (t) => (t >= 80 ? 'mh-taux-high' : t >= 50 ? 'mh-taux-mid' : 'mh-taux-low');

const Badge = ({ status, retardMinutes }) => (
  <span className={`mh-badge ${status}`}>
    {status === 'present' && <Check size={12} />}
    {status === 'retard' && <AlertCircle size={12} />}
    {status === 'absent' && <X size={12} />}
    {STATUS_LABEL[status]}{status === 'retard' ? ` (${retardMinutes} min)` : ''}
  </span>
);

const MangerHistorique = () => {
  const [view, setView] = useState('list'); // 'list' | 'detail'

  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [filterCours, setFilterCours] = useState('');

  const [selStudent, setSelStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stats, setStats] = useState(null);

  const [hDateFrom, setHDateFrom] = useState('');
  const [hDateTo, setHDateTo] = useState('');
  const [hStatus, setHStatus] = useState('');
  const [hCours, setHCours] = useState('');
  const [hMatiere, setHMatiere] = useState('');
  const [hProf, setHProf] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  /* ── liste des étudiants ── */
  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const { data } = await axios.get('/api/etudiants', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAllStudents(data.filter((s) => !s.hidden));
    } catch (err) {
      console.error('Erreur chargement étudiants:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const allCours = useMemo(
    () => [...new Set(allStudents.flatMap((s) => (Array.isArray(s.cours) ? s.cours : [s.cours])).filter(Boolean))].sort(),
    [allStudents]
  );

  const filteredStudents = useMemo(() => {
    const q = searchName.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (q && !(s.nomComplet || '').toLowerCase().includes(q) && !(s.email || '').toLowerCase().includes(q)) return false;
      if (filterCours) {
        const sc = Array.isArray(s.cours) ? s.cours : [s.cours];
        if (!sc.includes(filterCours)) return false;
      }
      return true;
    }).sort((a, b) => (a.nomComplet || '').localeCompare(b.nomComplet || '', 'fr'));
  }, [allStudents, searchName, filterCours]);

  const clearListFilters = () => { setSearchName(''); setFilterCours(''); };

  /* ── historique complet d'un étudiant ── */
  const calcStats = (h) => {
    const total = h.length;
    const presents = h.filter((p) => p.present).length;
    const retards = h.filter((p) => p.present && p.retardMinutes > 0).length;
    setStats({
      total, presents, absents: total - presents, retards,
      taux: total > 0 ? Math.round((presents / total) * 100) : 0
    });
  };

  const openStudent = async (student) => {
    setSelStudent(student);
    setView('detail');
    resetHistoryFilters();
    try {
      setLoadingHistory(true);
      const { data } = await axios.get(`/api/presences/student/${student._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setHistory(data);
      calcStats(data);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      setHistory([]);
      setStats(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetHistoryFilters = () => {
    setHDateFrom(''); setHDateTo(''); setHStatus(''); setHCours(''); setHMatiere(''); setHProf('');
  };

  const backToList = () => {
    setView('list');
    setSelStudent(null);
    setHistory([]);
    setStats(null);
  };

  const hOpts = useMemo(() => ({
    cours: [...new Set(history.map((p) => p.cours).filter(Boolean))],
    matiere: [...new Set(history.map((p) => p.matiere).filter(Boolean))],
    prof: [...new Set(history.map((p) => p.nomProfesseur).filter(Boolean))]
  }), [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((p) => {
      if (hDateFrom && new Date(p.dateSession) < new Date(hDateFrom)) return false;
      if (hDateTo && new Date(p.dateSession) > new Date(hDateTo)) return false;
      if (hStatus && getStatus(p) !== hStatus) return false;
      if (hCours && p.cours !== hCours) return false;
      if (hMatiere && p.matiere !== hMatiere) return false;
      if (hProf && p.nomProfesseur !== hProf) return false;
      return true;
    }).sort((a, b) => new Date(b.dateSession) - new Date(a.dateSession));
  }, [history, hDateFrom, hDateTo, hStatus, hCours, hMatiere, hProf]);

  const activeFiltersCount = [hDateFrom, hDateTo, hStatus, hCours, hMatiere, hProf].filter(Boolean).length;

  const exportHistory = () => {
    if (filteredHistory.length === 0) return;
    const data = filteredHistory.map((p) => ({
      'Date': fmt(p.dateSession),
      'Cours': p.cours,
      'Matière': p.matiere || '',
      'Professeur': p.nomProfesseur || '',
      'Période': p.periode || '',
      'Heure': p.heure || '',
      'Statut': p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent',
      'Retard (min)': p.retardMinutes || 0,
      'Remarque': p.remarque || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historique');
    XLSX.writeFile(wb, `historique_${selStudent.nomComplet.replace(/\s+/g, '_')}.xlsx`);
  };

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="admin-dashboard" style={PAGE_BG}>
      <Sidebar onLogout={handleLogout} />
      <Header />
      <div className="dashboard-container">
      <div className="dashboard-content mh-container">

        {/* ══ VUE LISTE ══ */}
        {view === 'list' && (
          <>
            <div className="mh-header">
              <h1>Suivi des présences</h1>
              <p>{allStudents.length} étudiant{allStudents.length !== 1 ? 's' : ''} · recherchez un nom, puis cliquez pour voir son historique complet</p>
            </div>

            <div className="mh-filter-card">
              <div className="mh-filter-row">
                <div className="mh-search-wrap">
                  <Search size={16} />
                  <input
                    className="mh-input"
                    type="text"
                    placeholder="Rechercher un étudiant par nom ou email"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
                <select className="mh-select" value={filterCours} onChange={(e) => setFilterCours(e.target.value)}>
                  <option value="">Toutes les classes</option>
                  {allCours.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {(searchName || filterCours) && (
                  <button className="mh-reset-btn" onClick={clearListFilters}>Réinitialiser</button>
                )}
              </div>
            </div>

            <div className="mh-list-card">
              <div className="mh-list-header">
                <Users size={16} color="var(--text-secondary)" />
                <h3>Étudiants</h3>
                <span className="mh-count-badge">{filteredStudents.length} résultat{filteredStudents.length !== 1 ? 's' : ''}</span>
              </div>

              {loadingStudents ? (
                <div className="mh-loading">
                  <RefreshCw size={22} />
                  <div>Chargement des étudiants…</div>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="mh-empty">
                  <Users size={28} />
                  <div className="mh-empty-title">Aucun étudiant trouvé</div>
                  <div className="mh-empty-sub">Essayez un autre nom ou changez de classe.</div>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student._id} className="mh-student-row" onClick={() => openStudent(student)}>
                    <div className="mh-avatar">{(student.nomComplet || '?').charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mh-student-name">{student.nomComplet}</div>
                      <div className="mh-student-tags">
                        {(Array.isArray(student.cours) ? student.cours : [student.cours]).filter(Boolean).map((c) => (
                          <span key={c} className="mh-tag">{c}</span>
                        ))}
                      </div>
                    </div>
                    <BookOpen size={16} color="var(--text-muted)" />
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ══ VUE DÉTAIL ══ */}
        {view === 'detail' && selStudent && (
          <>
            <button className="mh-back-btn" onClick={backToList}>
              <ArrowLeft size={14} />
              Retour à la liste
            </button>

            <div className="mh-profile-card">
              <div className="mh-profile-top">
                <div className="mh-avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
                  {(selStudent.nomComplet || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 className="mh-profile-name">{selStudent.nomComplet}</h2>
                  <div className="mh-student-tags" style={{ marginTop: 6 }}>
                    {selStudent.email && <span className="mh-tag">{selStudent.email}</span>}
                    {(Array.isArray(selStudent.cours) ? selStudent.cours : [selStudent.cours]).filter(Boolean).map((c) => (
                      <span key={c} className="mh-tag">{c}</span>
                    ))}
                  </div>
                </div>
                {stats && <span className={`mh-taux-pill ${tauxClass(stats.taux)}`}>{stats.taux}% de présence</span>}
              </div>

              {stats && (
                <div className="stats-grid mh-kpi-grid">
                  <KpiCard title="Sessions" value={stats.total} icon={Calendar} colorClass="blue" subtitle="Total enregistré" />
                  <KpiCard title="Présences" value={stats.presents} icon={UserCheck} colorClass="green" subtitle="Séances suivies" />
                  <KpiCard title="Absences" value={stats.absents} icon={UserX} colorClass="red" subtitle="Séances manquées" />
                  <KpiCard title="Retards" value={stats.retards} icon={AlertCircle} colorClass="yellow" subtitle="Arrivées tardives" />
                </div>
              )}
            </div>

            {loadingHistory ? (
              <div className="mh-table-card">
                <div className="mh-loading">
                  <RefreshCw size={22} />
                  <div>Chargement de l'historique…</div>
                </div>
              </div>
            ) : (
              <>
                {/* Filtres complets de l'historique */}
                <div className="mh-history-filters">
                  <div className="mh-history-filters-title">
                    Filtrer l'historique {activeFiltersCount > 0 ? `(${activeFiltersCount} actif${activeFiltersCount > 1 ? 's' : ''})` : ''}
                  </div>
                  <div className="mh-history-filters-grid">
                    <div>
                      <label className="mh-field-label">Date de début</label>
                      <input className="mh-input" type="date" value={hDateFrom} onChange={(e) => setHDateFrom(e.target.value)} />
                    </div>
                    <div>
                      <label className="mh-field-label">Date de fin</label>
                      <input className="mh-input" type="date" value={hDateTo} onChange={(e) => setHDateTo(e.target.value)} />
                    </div>
                    <div>
                      <label className="mh-field-label">Statut</label>
                      <select className="mh-select" value={hStatus} onChange={(e) => setHStatus(e.target.value)}>
                        <option value="">Tous les statuts</option>
                        <option value="present">Présent</option>
                        <option value="absent">Absent</option>
                        <option value="retard">En retard</option>
                      </select>
                    </div>
                    <div>
                      <label className="mh-field-label">Cours</label>
                      <select className="mh-select" value={hCours} onChange={(e) => setHCours(e.target.value)}>
                        <option value="">Tous ({hOpts.cours.length})</option>
                        {hOpts.cours.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mh-field-label">Matière</label>
                      <select className="mh-select" value={hMatiere} onChange={(e) => setHMatiere(e.target.value)}>
                        <option value="">Toutes ({hOpts.matiere.length})</option>
                        {hOpts.matiere.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mh-field-label">Professeur</label>
                      <select className="mh-select" value={hProf} onChange={(e) => setHProf(e.target.value)}>
                        <option value="">Tous ({hOpts.prof.length})</option>
                        {hOpts.prof.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mh-history-actions">
                    {activeFiltersCount > 0 && (
                      <button className="mh-reset-btn" onClick={resetHistoryFilters}>Réinitialiser les filtres</button>
                    )}
                    <button className="mh-export-btn" onClick={exportHistory} disabled={filteredHistory.length === 0}>
                      <Download size={14} />
                      Exporter Excel
                    </button>
                  </div>
                </div>

                {/* Table complète — toutes les lignes, aucune troncature */}
                <div className="mh-table-card">
                  <div className="mh-table-header">
                    <Calendar size={16} color="var(--text-secondary)" />
                    <h3>Historique complet</h3>
                    <span className="mh-count-badge">{filteredHistory.length} / {history.length} séances</span>
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="mh-empty">
                      <Calendar size={28} />
                      <div className="mh-empty-title">Aucune séance ne correspond à ces filtres</div>
                      <div className="mh-empty-sub">Essayez de réinitialiser les filtres ci-dessus.</div>
                    </div>
                  ) : (
                    <div className="mh-table-wrap">
                      <table className="mh-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Cours</th>
                            <th>Matière</th>
                            <th>Professeur</th>
                            <th>Période / Heure</th>
                            <th>Statut</th>
                            <th>Remarque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.map((p, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(p.dateSession)}</td>
                              <td>{p.cours || '—'}</td>
                              <td>{p.matiere || '—'}</td>
                              <td>{p.nomProfesseur || '—'}</td>
                              <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                {[p.heure, p.periode].filter(Boolean).join(' · ') || '—'}
                              </td>
                              <td><Badge status={getStatus(p)} retardMinutes={p.retardMinutes} /></td>
                              <td style={{ color: 'var(--text-muted)' }}>{p.remarque || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default MangerHistorique;