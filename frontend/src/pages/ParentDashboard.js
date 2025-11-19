import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Briefcase, X, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import ParentSidebar from '../components/ParentSidebar';

const ParentDashboard = () => {
  const [parent, setParent] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('fr');
  const [showModal, setShowModal] = useState(false);
  const [dailyStatus, setDailyStatus] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(false);

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

  const fetchParentData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/parents/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setParent(data);
      setEnfants(data.enfants || []);
      
      // Charger automatiquement le statut du jour
      if (data.enfants && data.enfants.length > 0) {
        await fetchDailyStatus(data.enfants);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Erreur chargement données parent:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyStatus = async (enfantsList) => {
    setLoadingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const statusPromises = enfantsList.map(async (enfant) => {
        try {
          // Récupérer les présences du jour
          const presencesRes = await fetch(
            `/api/parents/enfants/${enfant._id}/presences/today`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const presences = await presencesRes.json();

          // Récupérer les rapports du jour
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const rapportsRes = await fetch(
            `/api/parents/enfants/${enfant._id}/rapports?dateDebut=${today.toISOString()}&dateFin=${tomorrow.toISOString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const rapports = await rapportsRes.json();

          return {
            enfant,
            presences: presences || [],
            rapports: rapports || [],
            hasPresence: presences && presences.length > 0,
            hasRapport: rapports && rapports.length > 0
          };
        } catch (error) {
          console.error(`Erreur pour enfant ${enfant.nomComplet}:`, error);
          return {
            enfant,
            presences: [],
            rapports: [],
            hasPresence: false,
            hasRapport: false
          };
        }
      });

      const results = await Promise.all(statusPromises);
      setDailyStatus(results);
    } catch (err) {
      console.error('Erreur récupération statut journalier:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('parentLanguage');
    window.location.href = '/';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ar-MA');
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'ar-MA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const translations = {
    fr: {
      welcome: 'Bienvenue',
      myChildren: 'Mes Enfants',
      personalInfo: 'Informations Personnelles',
      academicInfo: 'Informations Académiques',
      parentInfo: 'Informations Parentales',
      contactInfo: 'Coordonnées',
      gender: 'Genre',
      dateOfBirth: 'Date de Naissance',
      placeOfBirth: 'Lieu de Naissance',
      nationality: 'Nationalité',
      level: 'Niveau',
      codeMassar: 'Code Massar',
      courses: 'Cours',
      academicYear: 'Année Scolaire',
      fatherName: 'Nom du Père',
      motherName: 'Nom de la Mère',
      fatherWork: 'Profession du Père',
      motherWork: 'Profession de la Mère',
      email: 'Email',
      phone: 'Téléphone',
      address: 'Adresse',
      fatherPhone: 'Téléphone Père',
      motherPhone: 'Téléphone Mère',
      transport: 'Transport Scolaire',
      yes: 'Oui',
      no: 'Non',
      loading: 'Chargement',
      noChildren: 'Aucun enfant associé',
      contactAdmin: 'Contactez l\'administration pour associer vos enfants à votre compte.',
      male: 'Homme',
      female: 'Femme',
      active: 'Actif',
      inactive: 'Inactif',
      status: 'Statut',
      dailyStatusTitle: 'Statut du Jour',
      todayDate: 'Aujourd\'hui',
      presence: 'Présence',
      rapport: 'Rapport',
      present: 'Présent',
      absent: 'Absent',
      late: 'Retard',
      noPresenceToday: 'Aucune présence enregistrée',
      noRapportToday: 'Aucun rapport',
      minutes: 'minutes',
      close: 'Fermer',
      viewDetails: 'Voir les détails'
    },
    ar: {
      welcome: 'مرحبا',
      myChildren: 'أبنائي',
      personalInfo: 'المعلومات الشخصية',
      academicInfo: 'المعلومات الأكاديمية',
      parentInfo: 'معلومات الوالدين',
      contactInfo: 'معلومات الاتصال',
      gender: 'الجنس',
      dateOfBirth: 'تاريخ الميلاد',
      placeOfBirth: 'مكان الميلاد',
      nationality: 'الجنسية',
      level: 'المستوى',
      codeMassar: 'رمز مسار',
      courses: 'الدروس',
      academicYear: 'السنة الدراسية',
      fatherName: 'اسم الأب',
      motherName: 'اسم الأم',
      fatherWork: 'مهنة الأب',
      motherWork: 'مهنة الأم',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      address: 'العنوان',
      fatherPhone: 'هاتف الأب',
      motherPhone: 'هاتف الأم',
      transport: 'النقل المدرسي',
      yes: 'نعم',
      no: 'لا',
      loading: 'جاري التحميل',
      noChildren: 'لا يوجد أطفال مرتبطون',
      contactAdmin: 'اتصل بالإدارة لربط أطفالك بحسابك.',
      male: 'ذكر',
      female: 'أنثى',
      active: 'نشط',
      inactive: 'غير نشط',
      status: 'الحالة',
      dailyStatusTitle: 'حالة اليوم',
      todayDate: 'اليوم',
      presence: 'الحضور',
      rapport: 'التقرير',
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      noPresenceToday: 'لا يوجد حضور مسجل',
      noRapportToday: 'لا يوجد تقرير',
      minutes: 'دقائق',
      close: 'إغلاق',
      viewDetails: 'عرض التفاصيل'
    }
  };

  const t = translations[language];

  // Modal Component
  const DailyStatusModal = () => {
    if (!showModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white'
          }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                {t.dailyStatusTitle}
              </h2>
              <p style={{ fontSize: '14px', opacity: 0.9 }}>
                {t.todayDate}: {formatDate(new Date())}
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              <X size={24} color="white" />
            </button>
          </div>

          {/* Content */}
          <div style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1
          }}>
            {loadingStatus ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #e5e7eb',
                  borderTop: '4px solid #4f46e5',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }}></div>
                <p style={{ color: '#6b7280' }}>{t.loading}...</p>
              </div>
            ) : dailyStatus.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <AlertCircle size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#6b7280', fontSize: '16px' }}>{t.noChildren}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {dailyStatus.map((status, index) => (
                  <div key={index} style={{
                    background: '#f9fafb',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {/* Nom de l'enfant */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '16px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      {status.enfant.image ? (
                        <img
                          src={`http://localhost:5000${status.enfant.image}`}
                          alt={status.enfant.nomComplet}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover'
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
                          {status.enfant.nomComplet?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                          {status.enfant.nomComplet}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {status.enfant.niveau}
                        </div>
                      </div>
                    </div>

                    {/* Statut de présence et rapport */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px'
                    }}>
                      {/* Présence */}
                      <div style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '16px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <CheckCircle size={20} color="#4f46e5" />
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#4f46e5' }}>
                            {t.presence}
                          </span>
                        </div>
                        {status.hasPresence && status.presences.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {status.presences.map((presence, idx) => (
                              <div key={idx} style={{
                                padding: '8px 12px',
                                background: presence.present ? '#d1fae5' : '#fee2e2',
                                borderRadius: '6px'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '4px'
                                }}>
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: presence.present ? '#065f46' : '#991b1b'
                                  }}>
                                    {presence.present ? t.present : t.absent}
                                  </span>
                                  <span style={{
                                    fontSize: '12px',
                                    color: presence.present ? '#065f46' : '#991b1b'
                                  }}>
                                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                    {formatTime(presence.heure)}
                                  </span>
                                </div>
                                {presence.retardMinutes > 0 && (
                                  <div style={{
                                    fontSize: '12px',
                                    color: '#d97706',
                                    fontWeight: '600'
                                  }}>
                                    {t.late}: {presence.retardMinutes} {t.minutes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px',
                            background: '#f3f4f6',
                            borderRadius: '6px'
                          }}>
                            <XCircle size={16} color="#9ca3af" />
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>
                              {t.noPresenceToday}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rapport */}
                      <div style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '16px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <AlertCircle size={20} color="#ef4444" />
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
                            {t.rapport}
                          </span>
                        </div>
                        {status.hasRapport && status.rapports.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {status.rapports.map((rapport, idx) => (
                              <div key={idx} style={{
                                padding: '16px',
                                background: 'white',
                                borderRadius: '10px',
                                border: '2px solid #fbbf24',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
                              }}>
                                {/* En-tête du rapport */}
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  marginBottom: '12px',
                                  paddingBottom: '12px',
                                  borderBottom: '2px solid #fef3c7',
                                  flexWrap: 'wrap',
                                  gap: '8px'
                                }}>
                                  <div style={{ flex: '1', minWidth: '150px' }}>
                                    <div style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      color: '#92400e',
                                      marginBottom: '4px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}>
                                      Date et Heure
                                    </div>
                                    <div style={{
                                      fontSize: '13px',
                                      color: '#78350f',
                                      fontWeight: '600'
                                    }}>
                                      {formatDate(rapport.date)} à {formatTime(rapport.date)}
                                    </div>
                                  </div>
                                  {rapport.statut && (
                                    <div style={{
                                      padding: '6px 14px',
                                      borderRadius: '8px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      background: rapport.statut === 'traite' ? '#d1fae5' : 
                                                 rapport.statut === 'en_attente' ? '#fef3c7' : '#e5e7eb',
                                      color: rapport.statut === 'traite' ? '#065f46' : 
                                             rapport.statut === 'en_attente' ? '#92400e' : '#374151'
                                    }}>
                                      {rapport.statut === 'traite' ? 'Traité' : 
                                       rapport.statut === 'en_attente' ? 'En attente' : 'Archivé'}
                                    </div>
                                  )}
                                </div>

                                {/* Informations Cours et Niveau */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                  gap: '8px',
                                  marginBottom: '12px'
                                }}>
                                  {rapport.cours && (
                                    <div style={{
                                      padding: '8px 10px',
                                      background: '#fef3c7',
                                      borderRadius: '6px',
                                      border: '1px solid #fbbf24'
                                    }}>
                                      <div style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: '#92400e',
                                        marginBottom: '3px',
                                        textTransform: 'uppercase'
                                      }}>
                                        Matière
                                      </div>
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#78350f',
                                        fontWeight: '600'
                                      }}>
                                        {rapport.cours}
                                      </div>
                                    </div>
                                  )}
                                  {rapport.niveau && (
                                    <div style={{
                                      padding: '8px 10px',
                                      background: '#fef3c7',
                                      borderRadius: '6px',
                                      border: '1px solid #fbbf24'
                                    }}>
                                      <div style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: '#92400e',
                                        marginBottom: '3px',
                                        textTransform: 'uppercase'
                                      }}>
                                        Niveau
                                      </div>
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#78350f',
                                        fontWeight: '600'
                                      }}>
                                        {rapport.niveau}
                                      </div>
                                    </div>
                                  )}
                                  {rapport.anneeScolaire && (
                                    <div style={{
                                      padding: '8px 10px',
                                      background: '#fef3c7',
                                      borderRadius: '6px',
                                      border: '1px solid #fbbf24'
                                    }}>
                                      <div style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: '#92400e',
                                        marginBottom: '3px',
                                        textTransform: 'uppercase'
                                      }}>
                                        Année
                                      </div>
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#78350f',
                                        fontWeight: '600'
                                      }}>
                                        {rapport.anneeScolaire}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Professeur */}
                                {rapport.professeur && (
                                  <div style={{
                                    padding: '10px',
                                    background: '#dbeafe',
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    border: '1px solid #60a5fa'
                                  }}>
                                    <div style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      color: '#1e40af',
                                      marginBottom: '4px',
                                      textTransform: 'uppercase'
                                    }}>
                                      Rapporté par
                                    </div>
                                    <div style={{
                                      fontSize: '13px',
                                      color: '#1e3a8a',
                                      fontWeight: '600'
                                    }}>
                                      {rapport.professeur.nom} {rapport.professeur.prenom}
                                    </div>
                                    {rapport.professeur.email && (
                                      <div style={{
                                        fontSize: '11px',
                                        color: '#1e40af',
                                        marginTop: '3px',
                                        fontWeight: '500'
                                      }}>
                                        {rapport.professeur.email}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Nature du problème */}
                                {rapport.natureProbleme && rapport.natureProbleme.length > 0 && (
                                  <div style={{
                                    marginBottom: '12px',
                                    padding: '10px',
                                    background: '#fee2e2',
                                    borderRadius: '8px',
                                    border: '1px solid #fca5a5'
                                  }}>
                                    <div style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      color: '#991b1b',
                                      marginBottom: '6px',
                                      textTransform: 'uppercase'
                                    }}>
                                      Nature du problème
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {rapport.natureProbleme.map((nature, i) => (
                                        <span key={i} style={{
                                          fontSize: '11px',
                                          padding: '4px 10px',
                                          background: '#fca5a5',
                                          color: '#7f1d1d',
                                          borderRadius: '6px',
                                          fontWeight: '600'
                                        }}>
                                          {nature}
                                        </span>
                                      ))}
                                    </div>
                                    {rapport.autreProbleme && (
                                      <div style={{
                                        marginTop: '6px',
                                        fontSize: '11px',
                                        color: '#991b1b',
                                        fontWeight: '500',
                                        fontStyle: 'italic'
                                      }}>
                                        Autre: {rapport.autreProbleme}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Description de l'incident */}
                                {rapport.descriptionIncident && (
                                  <div style={{
                                    marginBottom: '12px',
                                    padding: '10px',
                                    background: '#f3f4f6',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db'
                                  }}>
                                    <div style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      color: '#374151',
                                      marginBottom: '4px',
                                      textTransform: 'uppercase'
                                    }}>
                                      Description de l'incident
                                    </div>
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#111827',
                                      lineHeight: '1.5',
                                      fontWeight: '500'
                                    }}>
                                      {rapport.descriptionIncident}
                                    </div>
                                  </div>
                                )}

                                {/* Mesures prises */}
                                {rapport.mesurePrise && rapport.mesurePrise.length > 0 && (
                                  <div style={{
                                    marginBottom: '12px',
                                    padding: '10px',
                                    background: '#ddd6fe',
                                    borderRadius: '8px',
                                    border: '1px solid #a78bfa'
                                  }}>
                                    <div style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      color: '#5b21b6',
                                      marginBottom: '6px',
                                      textTransform: 'uppercase'
                                    }}>
                                      Mesures prises
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {rapport.mesurePrise.map((mesure, i) => (
                                        <span key={i} style={{
                                          fontSize: '11px',
                                          padding: '4px 10px',
                                          background: '#a78bfa',
                                          color: '#3730a3',
                                          borderRadius: '6px',
                                          fontWeight: '600'
                                        }}>
                                          {mesure}
                                        </span>
                                      ))}
                                    </div>
                                    {rapport.autreMesure && (
                                      <div style={{
                                        marginTop: '6px',
                                        fontSize: '11px',
                                        color: '#5b21b6',
                                        fontWeight: '500',
                                        fontStyle: 'italic'
                                      }}>
                                        Autre: {rapport.autreMesure}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Observation du professeur */}
                                {rapport.observationProfesseur && (
                                  <div style={{
                                    marginBottom: '12px',
                                    padding: '10px',
                                    background: '#fef3c7',
                                    borderRadius: '8px',
                                    border: '1px solid #fbbf24'
                                  }}>
                                    <div style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      color: '#92400e',
                                      marginBottom: '4px',
                                      textTransform: 'uppercase'
                                    }}>
                                      Observation du professeur
                                    </div>
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#78350f',
                                      lineHeight: '1.5',
                                      fontWeight: '500'
                                    }}>
                                      {rapport.observationProfesseur}
                                    </div>
                                  </div>
                                )}

                                {/* Visa Direction */}
                                {rapport.visaDirection && (
                                  <div style={{
                                    padding: '8px 12px',
                                    background: '#d1fae5',
                                    borderRadius: '6px',
                                    border: '1px solid #10b981',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <CheckCircle size={16} color="#065f46" />
                                    <div>
                                      <div style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: '#065f46'
                                      }}>
                                        Visa Direction
                                      </div>
                                      {rapport.dateVisa && (
                                        <div style={{
                                          fontSize: '10px',
                                          color: '#047857'
                                        }}>
                                          {formatDate(rapport.dateVisa)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px',
                            background: '#f3f4f6',
                            borderRadius: '6px'
                          }}>
                            <CheckCircle size={16} color="#10b981" />
                            <span style={{ fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                              {t.noRapportToday}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#4338ca'}
              onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)'
      }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
          <p style={{ fontSize: '16px', color: '#6b7280', fontWeight: '500' }}>{t.loading}...</p>
        </div>
      </div>
    );
  }

  if (!parent || enfants.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
        direction: language === 'ar' ? 'rtl' : 'ltr'
      }}>
        <ParentSidebar onLogout={handleLogout} />
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '24px 32px'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {t.welcome}
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} />
            {parent?.nomComplet || '-'}
          </p>
        </div>
        <div style={{ padding: '32px' }}>
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
          }}>
            <User style={{ width: '80px', height: '80px', color: '#d1d5db', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              {t.noChildren}
            </h3>
            <p style={{ fontSize: '15px', color: '#6b7280' }}>{t.contactAdmin}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      direction: language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .enfants-grid { grid-template-columns: 1fr !important; }
          .header-content { flex-direction: column; align-items: center !important; }
          .content-padding { padding: 20px !important; }
        }

        @media (max-width: 480px) {
          .content-padding { padding: 16px !important; }
          .enfant-card { padding: 16px !important; }
          .header-title { font-size: 22px !important; }
          .welcome-text { font-size: 14px !important; }
          .email-text { font-size: 13px !important; }
        }

        .enfant-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1); 
        }
      `}</style>

      {/* Modal */}
      <DailyStatusModal />

      <ParentSidebar onLogout={handleLogout} />

      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div className="header-content" style={{
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h1 className="header-title" style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#111827', 
              marginBottom: '12px'
            }}>
              Alfred Kastler
            </h1>
            <div style={{ marginBottom: '8px' }}>
              <span className="welcome-text" style={{ fontSize: '16px', fontWeight: '600', color: '#4f46e5' }}>
                {t.welcome}, {parent.nomComplet}
              </span>
            </div>
            <p className="email-text" style={{ 
              fontSize: '15px', 
              color: '#6b7280', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <Mail size={16} />
              <span>{parent.email || t.email}</span>
            </p>
          </div>
          
          {/* Bouton pour rouvrir le modal */}
          <button
            onClick={() => {
              fetchDailyStatus(enfants);
              setShowModal(true);
            }}
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#4338ca'}
            onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
          >
            <Calendar size={18} />
            {t.dailyStatusTitle}
          </button>
        </div>
      </div>

      <div className="content-padding" style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          textAlign: 'center',
          flexWrap: 'wrap'
        }}>
          <BookOpen size={28} />
          <span>{t.myChildren} ({enfants.length})</span>
        </h2>

        <div className="enfants-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {enfants.map(enfant => (
            <div key={enfant._id} className="enfant-card" style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
              border: '1px solid #e5e7eb',
              transition: 'all 0.3s'
            }}>
              {/* Header avec photo et nom */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: '2px solid #f3f4f6'
              }}>
                {enfant.image ? (
                  <img src={`http://localhost:5000${enfant.image}`} alt={enfant.nomComplet} style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }} />
                ) : (
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '48px',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)'
                  }}>
                    {enfant.nomComplet?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                    {enfant.nomComplet}
                  </div>
                  <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '4px' }}>
                    {enfant.niveau || '-'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '500' }}>
                    {enfant.anneeScolaire || '-'}
                  </div>
                </div>
              </div>

              {/* Informations Personnelles */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#4f46e5',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {t.personalInfo}
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {enfant.genre && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <User size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.gender}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {enfant.genre === 'Homme' ? t.male : t.female}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.dateNaissance && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <Calendar size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.dateOfBirth}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {formatDate(enfant.dateNaissance)}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.lieuNaissance && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <MapPin size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.placeOfBirth}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {enfant.lieuNaissance}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.nationalite && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <User size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.nationality}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {enfant.nationalite}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations Académiques */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#4f46e5',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {t.academicInfo}
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {enfant.codeMassar && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <BookOpen size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.codeMassar}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {enfant.codeMassar}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.cours && enfant.cours.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <BookOpen size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                          {t.courses}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {enfant.cours.map((cours, idx) => (
                            <span key={idx} style={{
                              padding: '4px 10px',
                              background: '#eef2ff',
                              color: '#4338ca',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {cours}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.actif !== undefined && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <User size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.status}
                        </div>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: enfant.actif ? '#d1fae5' : '#fee2e2',
                          color: enfant.actif ? '#065f46' : '#991b1b'
                        }}>
                          {enfant.actif ? t.active : t.inactive}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Coordonnées */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#4f46e5',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {t.contactInfo}
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {enfant.email && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <Mail size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.email}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', wordBreak: 'break-word' }}>
                          {enfant.email}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.telephoneEtudiant && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <Phone size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.phone}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {enfant.telephoneEtudiant}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.adresse && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <MapPin size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.address}
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {enfant.adresse}
                        </div>
                      </div>
                    </div>
                  )}
                  {enfant.transport !== undefined && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <MapPin size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                          {t.transport}
                        </div>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: enfant.transport ? '#d1fae5' : '#fee2e2',
                          color: enfant.transport ? '#065f46' : '#991b1b'
                        }}>
                          {enfant.transport ? t.yes : t.no}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations Parentales */}
              {(enfant.nomCompletPere || enfant.nomCompletMere || enfant.telephonePere || enfant.telephoneMere || enfant.travailPere || enfant.travailMere) && (
                <div style={{ marginBottom: '0' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#4f46e5',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {t.parentInfo}
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {enfant.nomCompletPere && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <Briefcase size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                            {t.fatherWork}
                          </div>
                          <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                            {enfant.travailPere}
                          </div>
                        </div>
                      </div>
                    )}
                    {enfant.telephonePere && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <Phone size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                            {t.fatherPhone}
                          </div>
                          <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                            {enfant.telephonePere}
                          </div>
                        </div>
                      </div>
                    )}
                    {enfant.nomCompletMere && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <User size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                            {t.motherName}
                          </div>
                          <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                            {enfant.nomCompletMere}
                          </div>
                        </div>
                      </div>
                    )}
                    {enfant.travailMere && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <Briefcase size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                            {t.motherWork}
                          </div>
                          <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                            {enfant.travailMere}
                          </div>
                        </div>
                      </div>
                    )}
                    {enfant.telephoneMere && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <Phone size={16} style={{ color: '#6b7280', marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px', fontWeight: '600' }}>
                            {t.motherPhone}
                          </div>
                          <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                            {enfant.telephoneMere}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;