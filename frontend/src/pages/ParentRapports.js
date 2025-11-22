import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Clock, User, FileText, Filter, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import ParentSidebar from '../components/ParentSidebar';

const ParentRapports = () => {
  const [parent, setParent] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [rapports, setRapports] = useState([]);
  const [todayRapports, setTodayRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('fr');
  const [dateFilter, setDateFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [showToday, setShowToday] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem('parentLanguage') || 'fr';
    setLanguage(savedLang);
    
    const interval = setInterval(() => {
      const currentLang = localStorage.getItem('parentLanguage') || 'fr';
      if (currentLang !== language) {
        setLanguage(currentLang);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [language]);

  useEffect(() => {
    fetchParentData();
  }, []);

  useEffect(() => {
    if (selectedEnfant) {
      fetchRapports(selectedEnfant._id);
    }
  }, [selectedEnfant, dateFilter, statutFilter]);

  const fetchParentData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/parents/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setParent(data);
      setEnfants(data.enfants || []);
      
      if (data.enfants && data.enfants.length > 0) {
        setSelectedEnfant(data.enfants[0]);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRapports = async (enfantId) => {
    try {
      const token = localStorage.getItem('token');
      let url = `/api/parents/enfants/${enfantId}/rapports?`;
      
      const params = new URLSearchParams();
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append('dateDebut', startDate.toISOString());
        params.append('dateFin', endDate.toISOString());
      }
      if (statutFilter) {
        params.append('statut', statutFilter);
      }
      
      const res = await fetch(url + params.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Séparer les rapports d'aujourd'hui et l'historique
      const today = new Date().toISOString().split('T')[0];
      const todayData = data.filter(r => {
        const rDate = new Date(r.date).toISOString().split('T')[0];
        return rDate === today;
      });
      
      setTodayRapports(todayData);
      setRapports(data);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ar-MA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ar-MA');
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'ar-MA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'traite':
        return { bg: '#dcfce7', border: '#bbf7d0', text: '#16a34a', badge: '#22c55e' };
      case 'en_attente':
        return { bg: '#fef3c7', border: '#fde68a', text: '#d97706', badge: '#f59e0b' };
      case 'archive':
        return { bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280', badge: '#9ca3af' };
      default:
        return { bg: '#fee2e2', border: '#fecaca', text: '#dc2626', badge: '#ef4444' };
    }
  };

  const getStatutText = (statut) => {
    switch (statut) {
      case 'traite': return t.treated;
      case 'en_attente': return t.pending;
      case 'archive': return t.archived;
      default: return statut;
    }
  };

  const getStatutIcon = (statut) => {
    switch (statut) {
      case 'traite': return <CheckCircle size={20} />;
      case 'en_attente': return <Clock size={20} />;
      case 'archive': return <FileText size={20} />;
      default: return <AlertCircle size={20} />;
    }
  };

  const calculateStats = () => {
    const total = rapports.length;
    const traites = rapports.filter(r => r.statut === 'traite').length;
    const enAttente = rapports.filter(r => r.statut === 'en_attente').length;
    const archives = rapports.filter(r => r.statut === 'archive').length;
    return { total, traites, enAttente, archives };
  };

  const stats = calculateStats();

  const translations = {
    fr: {
      title: 'Suivi des Rapports',
      selectChild: 'Sélectionner un enfant',
      filterByDate: 'Filtrer par date',
      filterByStatus: 'Filtrer par statut',
      clearFilters: 'Effacer',
      today: "Aujourd'hui",
      todayReports: "Rapports d'aujourd'hui",
      totalTreated: 'Traités',
      totalPending: 'En attente',
      totalArchived: 'Archivés',
      noData: 'Aucun rapport',
      noDataText: 'Aucun rapport enregistré pour le moment.',
      date: 'Date',
      course: 'Matière',
      professor: 'Professeur',
      status: 'Statut',
      treated: 'Traité',
      pending: 'En attente',
      archived: 'Archivé',
      loading: 'Chargement',
      allRecords: 'Historique complet',
      statistics: 'Statistiques',
      viewToday: "Voir aujourd'hui",
      viewAll: 'Voir tout',
      allStatus: 'Tous les statuts',
      level: 'Niveau',
      schoolYear: 'Année scolaire',
      reportedBy: 'Rapporté par',
      problemNature: 'Nature du problème',
      incidentDescription: 'Description de l\'incident',
      measuresTaken: 'Mesures prises',
      professorObservation: 'Observation du professeur',
      directionVisa: 'Visa Direction',
      visaDate: 'Date du visa',
      other: 'Autre'
    },
    ar: {
      title: 'متابعة التقارير',
      selectChild: 'اختر طفل',
      filterByDate: 'تصفية حسب التاريخ',
      filterByStatus: 'تصفية حسب الحالة',
      clearFilters: 'مسح',
      today: 'اليوم',
      todayReports: 'تقارير اليوم',
      totalTreated: 'معالج',
      totalPending: 'قيد الانتظار',
      totalArchived: 'مؤرشف',
      noData: 'لا توجد تقارير',
      noDataText: 'لا توجد تقارير مسجلة في الوقت الحالي.',
      date: 'التاريخ',
      course: 'المادة',
      professor: 'الأستاذ',
      status: 'الحالة',
      treated: 'معالج',
      pending: 'قيد الانتظار',
      archived: 'مؤرشف',
      loading: 'جاري التحميل',
      allRecords: 'السجل الكامل',
      statistics: 'الإحصائيات',
      viewToday: 'عرض اليوم',
      viewAll: 'عرض الكل',
      allStatus: 'جميع الحالات',
      level: 'المستوى',
      schoolYear: 'السنة الدراسية',
      reportedBy: 'أبلغ من قبل',
      problemNature: 'طبيعة المشكلة',
      incidentDescription: 'وصف الحادث',
      measuresTaken: 'الإجراءات المتخذة',
      professorObservation: 'ملاحظة الأستاذ',
      directionVisa: 'تأشيرة الإدارة',
      visaDate: 'تاريخ التأشيرة',
      other: 'آخر'
    }
  };

  const t = translations[language];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #4f46e5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '18px', color: '#6b7280', fontWeight: '600' }}>{t.loading}...</p>
        </div>
      </div>
    );
  }

  const displayRapports = showToday ? todayRapports : rapports;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      direction: language === 'ar' ? 'rtl' : 'ltr',
      fontFamily: language === 'ar' ? 'Arial, sans-serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .filters-grid { grid-template-columns: 1fr !important; }
          .content-padding { padding: 20px !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <ParentSidebar onLogout={handleLogout} />

      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ padding: '24px 32px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <AlertTriangle size={32} color="#4f46e5" />
            {t.title}
          </h1>
        </div>
      </div>

      <div className="content-padding" style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Sélection enfant */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '16px'
          }}>
            {t.selectChild}
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {enfants.map(enfant => (
              <button
                key={enfant._id}
                onClick={() => setSelectedEnfant(enfant)}
                style={{
                  padding: '18px',
                  border: selectedEnfant?._id === enfant._id ? '3px solid #4f46e5' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  background: selectedEnfant?._id === enfant._id ? '#eef2ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: language === 'ar' ? 'right' : 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {enfant.image ? (
                  // ✅ SOLUTION
<img 
  src={enfant.image} 
  alt={enfant.nomComplet}
  style={{
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
  }} 
/>
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: '700'
                    }}>
                      {enfant.nomComplet?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>
                      {enfant.nomComplet}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                      {enfant.niveau}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Toggle et Filtres */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Toggle Today/All */}
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '250px' }}>
              <button
                onClick={() => {
                  setShowToday(true);
                  setDateFilter('');
                  setStatutFilter('');
                }}
                style={{
                  padding: '12px 24px',
                  background: showToday ? '#4f46e5' : 'white',
                  color: showToday ? 'white' : '#6b7280',
                  border: '2px solid ' + (showToday ? '#4f46e5' : '#e5e7eb'),
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1
                }}
              >
                {t.viewToday}
              </button>
              <button
                onClick={() => setShowToday(false)}
                style={{
                  padding: '12px 24px',
                  background: !showToday ? '#4f46e5' : 'white',
                  color: !showToday ? 'white' : '#6b7280',
                  border: '2px solid ' + (!showToday ? '#4f46e5' : '#e5e7eb'),
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1
                }}
              >
                {t.viewAll}
              </button>
            </div>

            {/* Filtres */}
            {!showToday && (
              <>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <select
                    value={statutFilter}
                    onChange={(e) => setStatutFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '15px',
                      outline: 'none',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">{t.allStatus}</option>
                    <option value="en_attente">{t.pending}</option>
                    <option value="traite">{t.treated}</option>
                    <option value="archive">{t.archived}</option>
                  </select>
                </div>

                {(dateFilter || statutFilter) && (
                  <button
                    onClick={() => {
                      setDateFilter('');
                      setStatutFilter('');
                    }}
                    style={{
                      padding: '12px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '600'
                    }}
                  >
                    <X size={18} />
                    {t.clearFilters}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Statistiques */}
        {!showToday && (
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
                {t.totalTreated}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#16a34a' }}>
                {stats.traites}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                {t.totalPending}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#d97706' }}>
                {stats.enAttente}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                {t.totalArchived}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#6b7280' }}>
                {stats.archives}
              </div>
            </div>
          </div>
        )}

        {/* Liste des rapports */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertTriangle size={24} color="#4f46e5" />
            {showToday ? t.todayReports : t.allRecords}
          </h2>

          {displayRapports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <AlertTriangle style={{ width: '80px', height: '80px', color: '#9ca3af', margin: '0 auto 20px' }} />
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                {t.noData}
              </h3>
              <p style={{ fontSize: '16px', color: '#6b7280' }}>
                {t.noDataText}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {displayRapports.map((rapport, index) => {
                const colors = getStatutColor(rapport.statut);
                return (
                  <div key={index} style={{
                    padding: '24px',
                    background: colors.bg,
                    borderRadius: '12px',
                    border: `2px solid ${colors.border}`
                  }}>
                    {/* En-tête du rapport */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '20px',
                      flexWrap: 'wrap',
                      gap: '12px',
                      paddingBottom: '16px',
                      borderBottom: `2px solid ${colors.border}`
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#991b1b',
                          marginBottom: '8px',
                          textTransform: 'uppercase'
                        }}>
                          {t.problemNature}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {rapport.natureProbleme.map((nature, i) => (
                            <span key={i} style={{
                              fontSize: '13px',
                              padding: '6px 14px',
                              background: '#fca5a5',
                              color: '#7f1d1d',
                              borderRadius: '8px',
                              fontWeight: '600'
                            }}>
                              {nature}
                            </span>
                          ))}
                        </div>
                        {rapport.autreProbleme && (
                          <div style={{
                            marginTop: '10px',
                            fontSize: '13px',
                            color: '#991b1b',
                            fontWeight: '500',
                            fontStyle: 'italic'
                          }}>
                            {t.other}: {rapport.autreProbleme}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description de l'incident */}
                    {rapport.descriptionIncident && (
                      <div style={{
                        marginBottom: '16px',
                        padding: '14px',
                        background: 'white',
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: colors.text,
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <FileText size={16} />
                          {t.incidentDescription}
                        </div>
                        <div style={{
                          fontSize: '15px',
                          color: '#111827',
                          lineHeight: '1.6',
                          fontWeight: '500'
                        }}>
                          {rapport.descriptionIncident}
                        </div>
                      </div>
                    )}

                    {/* Mesures prises */}
                    {rapport.mesurePrise && rapport.mesurePrise.length > 0 && (
                      <div style={{
                        marginBottom: '16px',
                        padding: '14px',
                        background: '#ddd6fe',
                        borderRadius: '10px',
                        border: '1px solid #a78bfa'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#5b21b6',
                          marginBottom: '8px',
                          textTransform: 'uppercase'
                        }}>
                          {t.measuresTaken}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {rapport.mesurePrise.map((mesure, i) => (
                            <span key={i} style={{
                              fontSize: '13px',
                              padding: '6px 14px',
                              background: '#a78bfa',
                              color: '#3730a3',
                              borderRadius: '8px',
                              fontWeight: '600'
                            }}>
                              {mesure}
                            </span>
                          ))}
                        </div>
                        {rapport.autreMesure && (
                          <div style={{
                            marginTop: '10px',
                            fontSize: '13px',
                            color: '#5b21b6',
                            fontWeight: '500',
                            fontStyle: 'italic'
                          }}>
                            {t.other}: {rapport.autreMesure}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Observation du professeur */}
                    {rapport.observationProfesseur && (
                      <div style={{
                        marginBottom: '16px',
                        padding: '14px',
                        background: 'white',
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: colors.text,
                          marginBottom: '8px',
                          textTransform: 'uppercase'
                        }}>
                          {t.professorObservation}
                        </div>
                        <div style={{
                          fontSize: '15px',
                          color: '#111827',
                          lineHeight: '1.6',
                          fontWeight: '500'
                        }}>
                          {rapport.observationProfesseur}
                        </div>
                      </div>
                    )}

                    {/* Visa Direction */}
                    {rapport.visaDirection && (
                      <div style={{
                        padding: '12px 16px',
                        background: '#d1fae5',
                        borderRadius: '10px',
                        border: '1px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <CheckCircle size={20} color="#065f46" />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#065f46'
                          }}>
                            {t.directionVisa}
                          </div>
                          {rapport.dateVisa && (
                            <div style={{
                              fontSize: '12px',
                              color: '#047857',
                              marginTop: '2px'
                            }}>
                              {t.visaDate}: {formatDateShort(rapport.dateVisa)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentRapports;