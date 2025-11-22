import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Clock, User, FileText, Filter, X, CheckCircle, XCircle } from 'lucide-react';
import ParentSidebar from '../components/ParentSidebar';

const ParentAbsences = () => {
  const [parent, setParent] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [presences, setPresences] = useState([]);
  const [todayPresences, setTodayPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('fr');
  const [dateFilter, setDateFilter] = useState('');
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
      fetchPresences(selectedEnfant._id);
    }
  }, [selectedEnfant, dateFilter]);

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

  const fetchPresences = async (enfantId) => {
    try {
      const token = localStorage.getItem('token');
      let url = `/api/parents/enfants/${enfantId}/presences`;
      
      if (dateFilter) {
        url += `?date=${dateFilter}`;
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Séparer les présences d'aujourd'hui et l'historique
      const today = new Date().toISOString().split('T')[0];
      const todayData = data.filter(p => {
        const pDate = new Date(p.dateSession).toISOString().split('T')[0];
        return pDate === today;
      });
      
      setTodayPresences(todayData);
      setPresences(data);
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

  const getStatusColor = (presence) => {
    if (!presence.present) return { bg: '#fee2e2', border: '#fecaca', text: '#dc2626', badge: '#ef4444' };
    if (presence.retardMinutes > 0) return { bg: '#fef3c7', border: '#fde68a', text: '#d97706', badge: '#f59e0b' };
    return { bg: '#dcfce7', border: '#bbf7d0', text: '#16a34a', badge: '#22c55e' };
  };

  const getStatusText = (presence) => {
    if (!presence.present) return t.absent;
    if (presence.retardMinutes > 0) return `${t.late} (${presence.retardMinutes} ${t.minutes})`;
    return t.present;
  };

  const getStatusIcon = (presence) => {
    if (!presence.present) return <XCircle size={20} />;
    if (presence.retardMinutes > 0) return <Clock size={20} />;
    return <CheckCircle size={20} />;
  };

  const calculateStats = () => {
    const total = presences.length;
    const presents = presences.filter(p => p.present && p.retardMinutes === 0).length;
    const absents = presences.filter(p => !p.present).length;
    const retards = presences.filter(p => p.present && p.retardMinutes > 0).length;
    return { total, presents, absents, retards };
  };

  const stats = calculateStats();

  const translations = {
    fr: {
      title: 'Suivi des Présences',
      selectChild: 'Sélectionner un enfant',
      filterByDate: 'Filtrer par date (optionnel)',
      clearFilters: 'Effacer',
      today: "Aujourd'hui",
      todayPresence: "Présences d'aujourd'hui",
      totalPresent: 'Présent',
      totalAbsent: 'Absent',
      totalRetard: 'Retards',
      noData: 'Aucune donnée',
      noDataText: 'Aucune présence enregistrée pour le moment.',
      date: 'Date',
      course: 'Cours',
      subject: 'Matière',
      period: 'Période',
      time: 'Heure',
      remark: 'Remarque',
      morning: 'Matin',
      evening: 'Soir',
      loading: 'Chargement',
      professor: 'Professeur',
      status: 'Statut',
      present: 'Présent',
      absent: 'Absent',
      late: 'Retard',
      minutes: 'min',
      allRecords: 'Historique complet',
      statistics: 'Statistiques',
      viewToday: "Voir aujourd'hui",
      viewAll: 'Voir tout'
    },
    ar: {
      title: 'متابعة الحضور',
      selectChild: 'اختر طفل',
      filterByDate: 'تصفية حسب التاريخ (اختياري)',
      clearFilters: 'مسح',
      today: 'اليوم',
      todayPresence: 'حضور اليوم',
      totalPresent: 'حاضر',
      totalAbsent: 'غائب',
      totalRetard: 'التأخيرات',
      noData: 'لا توجد بيانات',
      noDataText: 'لا يوجد حضور مسجل في الوقت الحالي.',
      date: 'التاريخ',
      course: 'الفصل',
      subject: 'المادة',
      period: 'الفترة',
      time: 'الوقت',
      remark: 'ملاحظة',
      morning: 'صباحي',
      evening: 'مسائي',
      loading: 'جاري التحميل',
      professor: 'الأستاذ',
      status: 'الحالة',
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      minutes: 'دقيقة',
      allRecords: 'السجل الكامل',
      statistics: 'الإحصائيات',
      viewToday: 'عرض اليوم',
      viewAll: 'عرض الكل'
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

  const displayPresences = showToday ? todayPresences : presences;

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
            <Calendar size={32} color="#4f46e5" />
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

        {/* Toggle et Filtre */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Toggle Today/All */}
            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <button
                onClick={() => {
                  setShowToday(true);
                  setDateFilter('');
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

            {/* Filtre date */}
            {!showToday && (
              <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '250px' }}>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    style={{
                      padding: '12px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <X size={18} />
                    {t.clearFilters}
                  </button>
                )}
              </div>
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
                {t.totalPresent}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#16a34a' }}>
                {stats.presents}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
                {t.totalAbsent}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#dc2626' }}>
                {stats.absents}
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
                {t.totalRetard}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#d97706' }}>
                {stats.retards}
              </div>
            </div>
          </div>
        )}

        {/* Liste des présences */}
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
            <Calendar size={24} color="#4f46e5" />
            {showToday ? t.todayPresence : t.allRecords}
          </h2>

          {displayPresences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Calendar style={{ width: '80px', height: '80px', color: '#9ca3af', margin: '0 auto 20px' }} />
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                {t.noData}
              </h3>
              <p style={{ fontSize: '16px', color: '#6b7280' }}>
                {t.noDataText}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {displayPresences.map((presence, index) => {
                const colors = getStatusColor(presence);
                return (
                  <div key={index} style={{
                    padding: '20px',
                    background: colors.bg,
                    borderRadius: '12px',
                    border: `2px solid ${colors.border}`
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: colors.text,
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Calendar size={20} />
                          {formatDate(presence.dateSession)}
                        </div>
                        <div style={{ fontSize: '14px', color: colors.text, opacity: 0.8 }}>
                          {formatDateShort(presence.dateSession)}
                        </div>
                      </div>
                      <div style={{
                        padding: '8px 16px',
                        background: colors.badge,
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {getStatusIcon(presence)}
                        {getStatusText(presence)}
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px',
                      padding: '16px',
                      background: 'white',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', color: colors.text, fontWeight: '600', marginBottom: '6px' }}>
                          {t.course}
                        </div>
                        <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                          {presence.cours || '-'}
                        </div>
                      </div>

                      {presence.matiere && (
                        <div>
                          <div style={{ fontSize: '13px', color: colors.text, fontWeight: '600', marginBottom: '6px' }}>
                            {t.subject}
                          </div>
                          <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                            {presence.matiere}
                          </div>
                        </div>
                      )}

                      {presence.nomProfesseur && (
                        <div>
                          <div style={{ fontSize: '13px', color: colors.text, fontWeight: '600', marginBottom: '6px' }}>
                            <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {t.professor}
                          </div>
                          <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                            {presence.nomProfesseur}
                          </div>
                        </div>
                      )}

                      {presence.periode && (
                        <div>
                          <div style={{ fontSize: '13px', color: colors.text, fontWeight: '600', marginBottom: '6px' }}>
                            {t.period}
                          </div>
                          <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                            {presence.periode === 'matin' ? t.morning : t.evening}
                          </div>
                        </div>
                      )}

                      {presence.heure && (
                        <div>
                          <div style={{ fontSize: '13px', color: colors.text, fontWeight: '600', marginBottom: '6px' }}>
                            <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {t.time}
                          </div>
                          <div style={{ fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                            {presence.heure}
                          </div>
                        </div>
                      )}
                    </div>

                    {presence.remarque && (
                      <div style={{
                        marginTop: '16px',
                        padding: '14px',
                        background: 'white',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`
                      }}>
                        <div style={{ fontSize: '13px', color: colors.text, fontWeight: '600', marginBottom: '6px' }}>
                          <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                          {t.remark}
                        </div>
                        <div style={{ fontSize: '15px', color: '#111827', lineHeight: '1.6' }}>
                          {presence.remarque}
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

export default ParentAbsences;