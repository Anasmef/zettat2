import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Briefcase } from 'lucide-react';
import ParentSidebar from '../components/ParentSidebar';

const ParentDashboard = () => {
  const [parent, setParent] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('fr');

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
    } catch (err) {
      console.error('Erreur chargement données parent:', err);
    } finally {
      setLoading(false);
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
      status: 'Statut'
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
      status: 'الحالة'
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
          .email-text { fontSize: '13px' !important; }
        }

        .enfant-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1); 
        }
      `}</style>

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
                <img src={enfant.image} alt={enfant.nomComplet} style={{
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