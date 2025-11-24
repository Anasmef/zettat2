import React, { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, Star, Award, AlertCircle, Calendar, User, Filter, Download } from 'lucide-react';
import ParentSidebar from '../components/ParentSidebar';

const ParentBulletins = () => {
  const [parent, setParent] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [bulletins, setBulletins] = useState([]);
  const [moyennes, setMoyennes] = useState({});
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('fr');
  const [filters, setFilters] = useState({
    semestre: '',
    anneeScolaire: '2024/2025',
    cours: ''
  });

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
      fetchBulletins(selectedEnfant._id);
    }
  }, [selectedEnfant, filters]);

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

  const fetchBulletins = async (enfantId) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.semestre) params.append('semestre', filters.semestre);
      if (filters.anneeScolaire) params.append('anneeScolaire', filters.anneeScolaire);
      if (filters.cours) params.append('cours', filters.cours);
      
      const url = `/api/bulletins/etudiant/${enfantId}?${params}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      setBulletins(data.bulletins || []);
      setMoyennes(data.moyennesParCours || {});
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  const groupByCoursAndSemestre = () => {
    const grouped = {};
    
    bulletins.forEach(b => {
      const key = `${b.cours}-${b.semestre}`;
      if (!grouped[key]) {
        grouped[key] = {
          cours: b.cours,
          semestre: b.semestre,
          anneeScolaire: b.anneeScolaire,
          matieres: []
        };
      }
      grouped[key].matieres.push(b);
    });

    // Calculer les moyennes pour chaque groupe
    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      const sum = group.matieres.reduce((acc, m) => acc + (m.moyenneMatiere || 0), 0);
      group.moyenneGenerale = group.matieres.length > 0 
        ? (sum / group.matieres.length).toFixed(2)
        : '0.00';
      group.admis = parseFloat(group.moyenneGenerale) >= 10;
    });

    return Object.values(grouped);
  };

  const getStatusColor = (moyenne) => {
    if (moyenne >= 16) return { bg: '#dcfce7', border: '#22c55e', text: '#166534' };
    if (moyenne >= 14) return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
    if (moyenne >= 12) return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
    if (moyenne >= 10) return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
    return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' };
  };

  const getMention = (moyenne) => {
    if (moyenne >= 16) return language === 'fr' ? 'Très Bien' : 'ممتاز';
    if (moyenne >= 14) return language === 'fr' ? 'Bien' : 'جيد';
    if (moyenne >= 12) return language === 'fr' ? 'Assez Bien' : 'جيد نسبيا';
    if (moyenne >= 10) return language === 'fr' ? 'Passable' : 'مقبول';
    return language === 'fr' ? 'Insuffisant' : 'غير كافي';
  };

  const coursUniques = [...new Set(bulletins.map(b => b.cours))];
  const groupedData = groupByCoursAndSemestre();

  const translations = {
    fr: {
      title: 'Notes et Bulletins',
      selectChild: 'Sélectionner un enfant',
      filterSemester: 'Filtrer par semestre',
      filterYear: 'Année scolaire',
      filterCourse: 'Filtrer par cours',
      allSemesters: 'Tous les semestres',
      allCourses: 'Tous les cours',
      s1: 'Semestre 1',
      s2: 'Semestre 2',
      year: 'Année',
      noData: 'Aucune note disponible',
      noDataText: 'Les notes de votre enfant apparaîtront ici une fois saisies par les professeurs.',
      subject: 'Matière',
      professor: 'Professeur',
      cc: 'Contrôle Continu',
      exam: 'Examen',
      average: 'Moyenne',
      generalAverage: 'Moyenne Générale',
      status: 'Statut',
      admitted: 'Admis',
      failed: 'Non admis',
      remark: 'Remarque',
      absences: 'Absences',
      loading: 'Chargement',
      mention: 'Mention',
      downloadPDF: 'Télécharger PDF',
      statistics: 'Statistiques',
      bestSubject: 'Meilleure matière',
      weakestSubject: 'Matière à améliorer',
      totalSubjects: 'Total matières'
    },
    ar: {
      title: 'النقط والبطاقات',
      selectChild: 'اختر طفل',
      filterSemester: 'تصفية حسب الفصل',
      filterYear: 'السنة الدراسية',
      filterCourse: 'تصفية حسب القسم',
      allSemesters: 'كل الفصول',
      allCourses: 'كل الأقسام',
      s1: 'الفصل 1',
      s2: 'الفصل 2',
      year: 'السنة',
      noData: 'لا توجد نقط متاحة',
      noDataText: 'ستظهر نقط طفلك هنا بمجرد إدخالها من قبل الأساتذة.',
      subject: 'المادة',
      professor: 'الأستاذ',
      cc: 'المراقبة المستمرة',
      exam: 'الامتحان',
      average: 'المعدل',
      generalAverage: 'المعدل العام',
      status: 'الحالة',
      admitted: 'ناجح',
      failed: 'راسب',
      remark: 'ملاحظة',
      absences: 'الغيابات',
      loading: 'جاري التحميل',
      mention: 'التقدير',
      downloadPDF: 'تحميل PDF',
      statistics: 'الإحصائيات',
      bestSubject: 'أفضل مادة',
      weakestSubject: 'مادة تحتاج تحسين',
      totalSubjects: 'مجموع المواد'
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
          .filters-grid { grid-template-columns: 1fr !important; }
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
            <BookOpen size={32} color="#4f46e5" />
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

        {/* Filtres */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <div className="filters-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                {t.filterSemester}
              </label>
              <select
                value={filters.semestre}
                onChange={(e) => setFilters({...filters, semestre: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">{t.allSemesters}</option>
                <option value="S1">{t.s1}</option>
                <option value="S2">{t.s2}</option>
                <option value="Année">{t.year}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                {t.filterYear}
              </label>
              <select
                value={filters.anneeScolaire}
                onChange={(e) => setFilters({...filters, anneeScolaire: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                {t.filterCourse}
              </label>
              <select
                value={filters.cours}
                onChange={(e) => setFilters({...filters, cours: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">{t.allCourses}</option>
                {coursUniques.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bulletins */}
        {groupedData.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <BookOpen style={{ width: '80px', height: '80px', color: '#9ca3af', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              {t.noData}
            </h3>
            <p style={{ fontSize: '16px', color: '#6b7280' }}>
              {t.noDataText}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {groupedData.map((group, idx) => {
              const colors = getStatusColor(parseFloat(group.moyenneGenerale));
              const bestMatiere = group.matieres.reduce((best, m) => 
                (m.moyenneMatiere || 0) > (best.moyenneMatiere || 0) ? m : best
              , group.matieres[0]);
              
              const worstMatiere = group.matieres.reduce((worst, m) => 
                (m.moyenneMatiere || 0) < (worst.moyenneMatiere || 0) ? m : worst
              , group.matieres[0]);

              return (
                <div key={idx} style={{
                  background: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: `3px solid ${colors.border}`
                }}>
                  {/* Header du bulletin */}
                  <div style={{
                    background: colors.bg,
                    padding: '24px',
                    borderBottom: `2px solid ${colors.border}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '8px' }}>
                          {group.cours}
                        </h2>
                        <div style={{ fontSize: '16px', color: colors.text, opacity: 0.9 }}>
                          {group.semestre} • {group.anneeScolaire}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        <div style={{ fontSize: '48px', fontWeight: '800', color: colors.text, lineHeight: 1 }}>
                          {group.moyenneGenerale}
                          <span style={{ fontSize: '24px' }}>/20</span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: colors.text, marginTop: '8px' }}>
                          {getMention(parseFloat(group.moyenneGenerale))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistiques rapides */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '16px',
                    padding: '20px 24px',
                    background: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                        {t.totalSubjects}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                        {group.matieres.length}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                        {t.bestSubject}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                        {bestMatiere.matiere}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {(bestMatiere.moyenneMatiere || 0).toFixed(2)}/20
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                        {t.weakestSubject}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#ef4444' }}>
                        {worstMatiere.matiere}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {(worstMatiere.moyenneMatiere || 0).toFixed(2)}/20
                      </div>
                    </div>
                  </div>

                  {/* Détails des matières */}
                  <div style={{ padding: '24px' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f9fafb' }}>
                            <th style={{ padding: '12px', textAlign: language === 'ar' ? 'right' : 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280' }}>
                              {t.subject}
                            </th>
                            <th style={{ padding: '12px', textAlign: language === 'ar' ? 'right' : 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280' }}>
                              {t.professor}
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280' }}>
                              {t.cc}
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280' }}>
                              {t.exam}
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280' }}>
                              {t.average}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.matieres
                            .sort((a, b) => (b.moyenneMatiere || 0) - (a.moyenneMatiere || 0))
                            .map((matiere, mIdx) => {
                              const mColors = getStatusColor(matiere.moyenneMatiere || 0);
                              return (
                                <tr key={mIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '16px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                                    {matiere.matiere}
                                  </td>
                                  <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                                    {matiere.professeur?.nom || '-'}
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'center', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                                    {matiere.noteControleContinu}/20
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'center', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                                    {matiere.noteExamen}/20
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{
                                      display: 'inline-block',
                                      padding: '6px 16px',
                                      background: mColors.bg,
                                      border: `2px solid ${mColors.border}`,
                                      borderRadius: '8px',
                                      fontSize: '16px',
                                      fontWeight: '700',
                                      color: mColors.text
                                    }}>
                                      {(matiere.moyenneMatiere || 0).toFixed(2)}/20
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentBulletins;