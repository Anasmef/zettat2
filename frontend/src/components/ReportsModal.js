import React, { useEffect, useState } from 'react';
import { FileText, X, Calendar, User, AlertCircle, CheckCircle, Clock, Filter } from 'lucide-react';

const ReportsModal = ({ show, onClose, enfantId, enfantName }) => {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('fr');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  useEffect(() => {
    const savedLang = localStorage.getItem('parentLanguage') || 'fr';
    setLanguage(savedLang);
  }, []);

  useEffect(() => {
    if (show && enfantId) {
      fetchRapports();
    }
  }, [show, enfantId, filterStatus, dateDebut, dateFin]);

  const fetchRapports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `/api/parents/enfants/${enfantId}/rapports?`;
      
      if (filterStatus) url += `statut=${filterStatus}&`;
      if (dateDebut) url += `dateDebut=${dateDebut}&`;
      if (dateFin) url += `dateFin=${dateFin}&`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Erreur réseau');
      
      const data = await res.json();
      setRapports(data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterStatus('');
    setDateDebut('');
    setDateFin('');
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'en_attente':
        return { bg: '#fef3c7', border: '#fde68a', text: '#92400e', badge: '#f59e0b' };
      case 'resolu':
        return { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46', badge: '#10b981' };
      case 'non_resolu':
        return { bg: '#fee2e2', border: '#fecaca', text: '#991b1b', badge: '#ef4444' };
      default:
        return { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151', badge: '#6b7280' };
    }
  };

  const getStatusIcon = (statut) => {
    switch (statut) {
      case 'en_attente':
        return <Clock size={20} />;
      case 'resolu':
        return <CheckCircle size={20} />;
      case 'non_resolu':
        return <AlertCircle size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const getSeverityColor = (gravite) => {
    switch (gravite) {
      case 'faible':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'moyenne':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'grave':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const translations = {
    fr: {
      title: 'Rapports Disciplinaires',
      filters: 'Filtres',
      status: 'Statut',
      all: 'Tous',
      pending: 'En attente',
      resolved: 'Résolu',
      notResolved: 'Non résolu',
      startDate: 'Date de début',
      endDate: 'Date de fin',
      clearFilters: 'Effacer les filtres',
      noData: 'Aucun rapport',
      noDataText: 'Aucun rapport disciplinaire enregistré.',
      loading: 'Chargement',
      close: 'Fermer',
      date: 'Date',
      professor: 'Professeur',
      type: 'Type',
      severity: 'Gravité',
      description: 'Description',
      measures: 'Mesures prises',
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Grave',
      totalReports: 'Total',
      pendingReports: 'En attente',
      resolvedReports: 'Résolus',
      notResolvedReports: 'Non résolus'
    },
    ar: {
      title: 'التقارير التأديبية',
      filters: 'التصفية',
      status: 'الحالة',
      all: 'الكل',
      pending: 'قيد الانتظار',
      resolved: 'تم الحل',
      notResolved: 'لم يتم الحل',
      startDate: 'تاريخ البداية',
      endDate: 'تاريخ النهاية',
      clearFilters: 'مسح الفلاتر',
      noData: 'لا توجد تقارير',
      noDataText: 'لم يتم تسجيل أي تقارير تأديبية.',
      loading: 'جاري التحميل',
      close: 'إغلاق',
      date: 'التاريخ',
      professor: 'الأستاذ',
      type: 'النوع',
      severity: 'الخطورة',
      description: 'الوصف',
      measures: 'الإجراءات المتخذة',
      low: 'منخفض',
      medium: 'متوسط',
      high: 'خطير',
      totalReports: 'المجموع',
      pendingReports: 'قيد الانتظار',
      resolvedReports: 'تم الحل',
      notResolvedReports: 'لم يتم الحل'
    }
  };

  const t = translations[language];

  if (!show) return null;

  const totalReports = rapports.length;
  const pendingReports = rapports.filter(r => r.statut === 'en_attente').length;
  const resolvedReports = rapports.filter(r => r.statut === 'resolu').length;
  const notResolvedReports = rapports.filter(r => r.statut === 'non_resolu').length;

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ar-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
          .filters-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
              <FileText size={28} />
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
          {/* Filtres */}
          <div style={{
            marginBottom: '28px',
            background: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <Filter size={20} color="#4f46e5" />
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                {t.filters}
              </span>
            </div>

            <div className="filters-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  {t.status}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="">{t.all}</option>
                  <option value="en_attente">{t.pending}</option>
                  <option value="resolu">{t.resolved}</option>
                  <option value="non_resolu">{t.notResolved}</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  {t.startDate}
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none',
                    background: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  {t.endDate}
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none',
                    background: 'white'
                  }}
                />
              </div>
            </div>

            {(filterStatus || dateDebut || dateFin) && (
              <button
                onClick={clearFilters}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <X size={16} />
                {t.clearFilters}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #ef4444',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p style={{ fontSize: '17px', color: '#6b7280', fontWeight: '600' }}>
                {t.loading}...
              </p>
            </div>
          ) : rapports.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#f9fafb',
              borderRadius: '16px',
              border: '2px dashed #d1d5db'
            }}>
              <FileText style={{ width: '80px', height: '80px', color: '#9ca3af', margin: '0 auto 20px' }} />
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
                    {t.totalReports}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e3a8a' }}>
                    {totalReports}
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '600', marginBottom: '8px' }}>
                    {t.pendingReports}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#78350f' }}>
                    {pendingReports}
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#065f46', fontWeight: '600', marginBottom: '8px' }}>
                    {t.resolvedReports}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#064e3b' }}>
                    {resolvedReports}
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#991b1b', fontWeight: '600', marginBottom: '8px' }}>
                    {t.notResolvedReports}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#7f1d1d' }}>
                    {notResolvedReports}
                  </div>
                </div>
              </div>

              {/* Liste des rapports */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {rapports.map((rapport, index) => {
                  const statusColors = getStatusColor(rapport.statut);
                  const severityColors = getSeverityColor(rapport.gravite);

                  return (
                    <div key={index} style={{
                      padding: '24px',
                      background: statusColors.bg,
                      borderRadius: '12px',
                      border: `2px solid ${statusColors.border}`
                    }}>
                      {/* Header du rapport */}
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                          }}>
                            <Calendar size={18} color={statusColors.text} />
                            <span style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: statusColors.text
                            }}>
                              {formatDate(rapport.date)}
                            </span>
                          </div>
                          
                          {rapport.professeur && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '14px',
                              color: '#6b7280'
                            }}>
                              <User size={16} />
                              <span>{rapport.professeur.nom} {rapport.professeur.prenom}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{
                            padding: '6px 14px',
                            background: statusColors.badge,
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {getStatusIcon(rapport.statut)}
                            {rapport.statut === 'en_attente' ? t.pending : 
                             rapport.statut === 'resolu' ? t.resolved : t.notResolved}
                          </div>

                          {rapport.gravite && (
                            <div style={{
                              padding: '6px 14px',
                              background: severityColors.bg,
                              color: severityColors.text,
                              borderRadius: '20px',
                              fontSize: '13px',
                              fontWeight: '700'
                            }}>
                              {rapport.gravite === 'faible' ? t.low :
                               rapport.gravite === 'moyenne' ? t.medium : t.high}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Type */}
                      {rapport.type && (
                        <div style={{
                          padding: '12px',
                          background: 'white',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '600',
                            marginBottom: '4px'
                          }}>
                            {t.type}
                          </div>
                          <div style={{
                            fontSize: '15px',
                            color: '#111827',
                            fontWeight: '700'
                          }}>
                            {rapport.type}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {rapport.description && (
                        <div style={{
                          padding: '12px',
                          background: 'white',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '600',
                            marginBottom: '6px'
                          }}>
                            {t.description}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#111827',
                            lineHeight: '1.6'
                          }}>
                            {rapport.description}
                          </div>
                        </div>
                      )}

                      {/* Mesures prises */}
                      {rapport.mesuresPrises && (
                        <div style={{
                          padding: '12px',
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '600',
                            marginBottom: '6px'
                          }}>
                            {t.measures}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#111827',
                            lineHeight: '1.6'
                          }}>
                            {rapport.mesuresPrises}
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
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#dc2626'}
            onMouseOut={(e) => e.target.style.background = '#ef4444'}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;