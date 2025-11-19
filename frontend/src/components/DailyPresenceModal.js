import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, X, User, BookOpen } from 'lucide-react';

const DailyPresenceModal = ({ show, onClose, enfantId, enfantName }) => {
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [language, setLanguage] = useState('fr');

  useEffect(() => {
    const savedLang = localStorage.getItem('parentLanguage') || 'fr';
    setLanguage(savedLang);
  }, []);

  useEffect(() => {
    if (show && enfantId) {
      fetchDailyPresence();
    }
  }, [show, enfantId, selectedDate]);

  const fetchDailyPresence = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const url = `/api/parents/enfants/${enfantId}/presences?date=${selectedDate}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Erreur réseau');
      
      const data = await res.json();
      setPresences(data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const translations = {
    fr: {
      title: 'Présence Journalière',
      selectDate: 'Sélectionner une date',
      present: 'Présent',
      absent: 'Absent',
      delay: 'Retard',
      minutes: 'minutes',
      course: 'Cours',
      subject: 'Matière',
      period: 'Période',
      time: 'Heure',
      morning: 'Matin',
      evening: 'Soir',
      remark: 'Remarque',
      noData: 'Aucune donnée',
      noDataText: 'Aucune session de cours enregistrée pour cette date.',
      loading: 'Chargement',
      close: 'Fermer',
      totalSessions: 'Total des sessions',
      presences: 'Présences',
      absences: 'Absences',
      delays: 'Retards',
      professor: 'Professeur'
    },
    ar: {
      title: 'الحضور اليومي',
      selectDate: 'اختر تاريخ',
      present: 'حاضر',
      absent: 'غائب',
      delay: 'متأخر',
      minutes: 'دقيقة',
      course: 'الفصل',
      subject: 'المادة',
      period: 'الفترة',
      time: 'الوقت',
      morning: 'صباحي',
      evening: 'مسائي',
      remark: 'ملاحظة',
      noData: 'لا توجد بيانات',
      noDataText: 'لم يتم تسجيل أي جلسات دراسية في هذا التاريخ.',
      loading: 'جاري التحميل',
      close: 'إغلاق',
      totalSessions: 'مجموع الجلسات',
      presences: 'الحضور',
      absences: 'الغيابات',
      delays: 'التأخيرات',
      professor: 'الأستاذ'
    }
  };

  const t = translations[language];

  if (!show) return null;

  const presentCount = presences.filter(p => p.present && p.retardMinutes === 0).length;
  const absentCount = presences.filter(p => !p.present).length;
  const delayCount = presences.filter(p => p.present && p.retardMinutes > 0).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        direction: language === 'ar' ? 'rtl' : 'ltr',
        fontFamily: language === 'ar' ? 'Arial, sans-serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .modal-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '26px',
              fontWeight: '700',
              margin: 0,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Calendar size={28} />
              {t.title}
            </h2>
            <div style={{ fontSize: '16px', opacity: 0.95, fontWeight: '500' }}>
              {enfantName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <X size={24} color="white" />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '32px',
          overflowY: 'auto',
          maxHeight: 'calc(90vh - 140px)'
        }}>
          {/* Sélection de date */}
          <div style={{
            marginBottom: '28px',
            background: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <label style={{
              display: 'block',
              fontSize: '15px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '12px'
            }}>
              📅 {t.selectDate}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '600',
                outline: 'none',
                background: 'white'
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #4f46e5',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p style={{ fontSize: '17px', color: '#6b7280', fontWeight: '600' }}>
                {t.loading}...
              </p>
            </div>
          ) : presences.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#f9fafb',
              borderRadius: '16px',
              border: '2px dashed #d1d5db'
            }}>
              <Calendar style={{ width: '80px', height: '80px', color: '#9ca3af', margin: '0 auto 20px' }} />
              <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                {t.noData}
              </h3>
              <p style={{ fontSize: '16px', color: '#6b7280' }}>
                {t.noDataText}
              </p>
            </div>
          ) : (
            <>
              {/* Statistiques */}
              <div className="modal-stats" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '28px'
              }}>
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '600', marginBottom: '8px' }}>
                    {t.totalSessions}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e3a8a' }}>
                    {presences.length}
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#065f46', fontWeight: '600', marginBottom: '8px' }}>
                    {t.presences}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#064e3b' }}>
                    {presentCount}
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#991b1b', fontWeight: '600', marginBottom: '8px' }}>
                    {t.absences}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#7f1d1d' }}>
                    {absentCount}
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '600', marginBottom: '8px' }}>
                    {t.delays}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#78350f' }}>
                    {delayCount}
                  </div>
                </div>
              </div>

              {/* Liste des présences */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {presences.map((presence, index) => {
                  const isPresent = presence.present && presence.retardMinutes === 0;
                  const isDelay = presence.present && presence.retardMinutes > 0;
                  const isAbsent = !presence.present;

                  return (
                    <div key={index} style={{
                      padding: '20px',
                      background: isPresent ? '#d1fae5' : (isDelay ? '#fef3c7' : '#fee2e2'),
                      borderRadius: '12px',
                      border: isPresent ? '2px solid #a7f3d0' : (isDelay ? '2px solid #fde68a' : '2px solid #fecaca')
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {isPresent && <CheckCircle size={24} color="#065f46" />}
                          {isDelay && <Clock size={24} color="#92400e" />}
                          {isAbsent && <XCircle size={24} color="#991b1b" />}
                          <span style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: isPresent ? '#065f46' : (isDelay ? '#92400e' : '#991b1b')
                          }}>
                            {isPresent ? t.present : (isDelay ? `${t.delay} (${presence.retardMinutes} ${t.minutes})` : t.absent)}
                          </span>
                        </div>
                        
                        {presence.periode && (
                          <div style={{
                            padding: '6px 14px',
                            background: 'white',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#4f46e5'
                          }}>
                            {presence.periode === 'matin' ? t.morning : t.evening}
                            {presence.heure && ` - ${presence.heure}`}
                          </div>
                        )}
                      </div>

                      <div style={{
                        padding: '16px',
                        background: 'white',
                        borderRadius: '10px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>
                            <BookOpen size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {t.course}
                          </div>
                          <div style={{ fontSize: '15px', color: '#111827', fontWeight: '700' }}>
                            {presence.cours || '-'}
                          </div>
                        </div>

                        {presence.matiere && (
                          <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>
                              {t.subject}
                            </div>
                            <div style={{ fontSize: '15px', color: '#111827', fontWeight: '700' }}>
                              {presence.matiere}
                            </div>
                          </div>
                        )}

                        {presence.nomProfesseur && (
                          <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>
                              <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                              {t.professor}
                            </div>
                            <div style={{ fontSize: '15px', color: '#111827', fontWeight: '700' }}>
                              {presence.nomProfesseur}
                            </div>
                          </div>
                        )}
                      </div>

                      {presence.remarque && (
                        <div style={{
                          marginTop: '12px',
                          padding: '14px',
                          background: 'white',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '6px' }}>
                            💬 {t.remark}
                          </div>
                          <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5' }}>
                            {presence.remarque}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '14px 32px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#4338ca'}
            onMouseOut={(e) => e.target.style.background = '#4f46e5'}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyPresenceModal;