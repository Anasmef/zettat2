import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Book, Clock, User, Download, MapPin } from 'lucide-react';
import ParentSidebar from '../components/ParentSidebar';

const ParentEmploiDuTemps = () => {
  const [parent, setParent] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [seances, setSeances] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('fr');
  const [message, setMessage] = useState({ type: '', text: '' });

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  
  const creneaux = [
    { debut: '08:45', fin: '10:45', label: '8h45 - 10h45' },
    { debut: '11:00', fin: '13:00', label: '11h00 - 13h00' },
    { debut: '14:00', fin: '16:00', label: '14h00 - 16h00' }
  ];

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
      fetchSeances(selectedEnfant._id);
    }
  }, [selectedEnfant]);

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
      setMessage({ type: 'error', text: 'Erreur de chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSeances = async (enfantId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/parents/enfants/${enfantId}/seances`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSeances(data);
      } else {
        setMessage({ type: 'error', text: 'Erreur lors du chargement de l\'emploi du temps' });
      }
    } catch (err) {
      console.error('Erreur:', err);
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    }
  };

  const getWeekDates = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      weekDates.push(currentDate);
    }
    return weekDates;
  };

  const weekDates = getWeekDates(currentWeek);

  const formatDate = (date) => {
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ar-MA', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const organiserSeances = () => {
    const emploi = {};
    seances.forEach(seance => {
      const key = `${seance.jour}-${seance.heureDebut}-${seance.heureFin}`;
      emploi[key] = seance;
    });
    return emploi;
  };

  const emploiOrganise = organiserSeances();

  const changeWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };

  const downloadSchedule = () => {
    if (!selectedEnfant) return;

    let csvContent = '';
    csvContent += `Emploi du Temps - ${selectedEnfant.nomComplet}\n`;
    csvContent += `Semaine du ${formatDate(weekDates[0])} au ${formatDate(weekDates[5])}\n\n`;
    
    csvContent += 'Horaires;';
    jours.forEach((jour, index) => {
      csvContent += `${jour} (${formatDate(weekDates[index])});`;
    });
    csvContent += '\n';

    creneaux.forEach(creneau => {
      csvContent += `${creneau.label};`;
      
      jours.forEach(jour => {
        const key = `${jour}-${creneau.debut}-${creneau.fin}`;
        const seance = emploiOrganise[key];
        
        if (seance) {
          const coursInfo = seance.cours || 'Cours';
          const matiereInfo = seance.matiere ? ` (${seance.matiere})` : '';
          const salleInfo = seance.salle ? ` - Salle: ${seance.salle}` : '';
          const profInfo = seance.professeur?.nom || 'Professeur';
          csvContent += `"${coursInfo}${matiereInfo}${salleInfo} - ${profInfo}";`;
        } else {
          csvContent += '";';
        }
      });
      csvContent += '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `emploi_temps_${selectedEnfant.nomComplet}_${formatDate(weekDates[0]).replace('/', '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: t.downloadSuccess });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const getStats = () => {
    const profsUniques = [...new Set(seances.map(s => s.professeur?.nom).filter(Boolean))];
    const matieresUniques = [...new Set(seances.map(s => s.matiere).filter(Boolean))];
    const sallesUniques = [...new Set(seances.map(s => s.salle).filter(Boolean))];
    
    return {
      totalSeances: seances.length,
      totalProfs: profsUniques.length,
      totalMatieres: matieresUniques.length,
      totalSalles: sallesUniques.length
    };
  };

  const stats = getStats();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  const translations = {
    fr: {
      title: 'Emploi du Temps',
      selectChild: 'Sélectionner un enfant',
      previousWeek: 'Semaine précédente',
      nextWeek: 'Semaine suivante',
      weekOf: 'Semaine du',
      to: 'au',
      download: 'Télécharger l\'emploi du temps',
      downloadSuccess: 'Emploi du temps téléchargé avec succès !',
      totalSessions: 'Séances totales',
      professors: 'Professeurs',
      subjects: 'Matières',
      rooms: 'Salles',
      schedule: 'Horaires',
      room: 'Salle',
      prof: 'Prof',
      loading: 'Chargement',
      noSchedule: 'Aucune séance programmée',
      noScheduleText: 'L\'emploi du temps sera affiché ici une fois que les cours seront programmés.',
      course: 'Cours',
      newSchedule: 'Nouveaux créneaux: 8h45-10h45 | 11h00-13h00 | 14h00-16h00'
    },
    ar: {
      title: 'جدول الحصص',
      selectChild: 'اختر طفل',
      previousWeek: 'الأسبوع السابق',
      nextWeek: 'الأسبوع التالي',
      weekOf: 'أسبوع',
      to: 'إلى',
      download: 'تحميل جدول الحصص',
      downloadSuccess: 'تم تحميل جدول الحصص بنجاح!',
      totalSessions: 'مجموع الحصص',
      professors: 'الأساتذة',
      subjects: 'المواد',
      rooms: 'القاعات',
      schedule: 'التوقيت',
      room: 'القاعة',
      prof: 'الأستاذ',
      loading: 'جاري التحميل',
      noSchedule: 'لا توجد حصص مجدولة',
      noScheduleText: 'سيتم عرض جدول الحصص هنا بمجرد جدولة الدروس.',
      course: 'الدورة',
      newSchedule: 'أوقات جديدة: 8:45-10:45 | 11:00-13:00 | 14:00-16:00'
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
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
            {t.newSchedule}
          </div>
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
                      {enfant.niveau} • {enfant.cours}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques */}
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#4f46e5', marginBottom: '8px' }}>
              {stats.totalSeances}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Clock size={16} />
              {t.totalSessions}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#10b981', marginBottom: '8px' }}>
              {stats.totalProfs}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <User size={16} />
              {t.professors}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#f59e0b', marginBottom: '8px' }}>
              {stats.totalMatieres}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Book size={16} />
              {t.subjects}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#8b5cf6', marginBottom: '8px' }}>
              {stats.totalSalles}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <MapPin size={16} />
              {t.rooms}
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => changeWeek(-1)}
              style={{
                padding: '10px 20px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <ChevronLeft size={18} />
              {t.previousWeek}
            </button>

            <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
              {t.weekOf} {formatDate(weekDates[0])} {t.to} {formatDate(weekDates[5])}
            </div>

            <button
              onClick={() => changeWeek(1)}
              style={{
                padding: '10px 20px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {t.nextWeek}
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={downloadSchedule}
            style={{
              padding: '12px 24px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            <Download size={20} />
            {t.download}
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center',
            background: message.type === 'error' ? '#fef2f2' : '#dcfce7',
            color: message.type === 'error' ? '#dc2626' : '#166534',
            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Tableau emploi du temps */}
        {seances.length > 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            overflowX: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr>
                  <th style={{
                    background: '#4f46e5',
                    color: 'white',
                    padding: '15px 8px',
                    textAlign: 'center',
                    fontWeight: '600',
                    border: '1px solid #4338ca'
                  }}>
                    {t.schedule}
                  </th>
                  {jours.map((jour, index) => (
                    <th key={jour} style={{
                      background: '#4f46e5',
                      color: 'white',
                      padding: '15px 8px',
                      textAlign: 'center',
                      fontWeight: '600',
                      border: '1px solid #4338ca'
                    }}>
                      {jour}<br />
                      <small>{formatDate(weekDates[index])}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creneaux.map(creneau => (
                  <tr key={`${creneau.debut}-${creneau.fin}`}>
                    <td style={{
                      background: '#f8fafc',
                      padding: '15px 10px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#374151',
                      border: '1px solid #e5e7eb',
                      minWidth: '120px'
                    }}>
                      {creneau.label}
                    </td>
                    {jours.map(jour => {
                      const key = `${jour}-${creneau.debut}-${creneau.fin}`;
                      const seance = emploiOrganise[key];
                      
                      return (
                        <td key={jour} style={{
                          border: '1px solid #e5e7eb',
                          padding: '8px',
                          verticalAlign: 'top',
                          height: '120px'
                        }}>
                          {seance ? (
                            <div style={{
                              background: '#dbeafe',
                              borderRadius: '8px',
                              padding: '10px',
                              fontSize: '12px',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}>
                              <div>
                                <div style={{
                                  fontWeight: '700',
                                  color: '#1e40af',
                                  marginBottom: '4px',
                                  fontSize: '13px'
                                }}>
                                  {seance.cours || t.course}
                                </div>
                                {seance.matiere && (
                                  <div style={{
                                    fontWeight: '600',
                                    color: '#7c3aed',
                                    marginBottom: '4px',
                                    fontSize: '11px'
                                  }}>
                                    {seance.matiere}
                                  </div>
                                )}
                                {seance.salle && (
                                  <div style={{
                                    fontWeight: '500',
                                    color: '#059669',
                                    marginBottom: '4px',
                                    fontSize: '11px'
                                  }}>
                                    {t.room}: {seance.salle}
                                  </div>
                                )}
                              </div>
                              <div style={{
                                color: '#374151',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}>
                                {t.prof}: {seance.professeur?.nom || 'Professeur'}
                              </div>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <Calendar style={{ width: '80px', height: '80px', color: '#9ca3af', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              {t.noSchedule}
            </h3>
            <p style={{ fontSize: '16px', color: '#6b7280' }}>
              {t.noScheduleText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentEmploiDuTemps;