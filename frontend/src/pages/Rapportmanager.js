// ============================================
// PAGE STAFF - GestionRapportsStaff.jsx
// Pour Inscripteur et Paiement Manager
// ============================================
import React, { useEffect, useState } from 'react';
import { 
  FileText,
  Eye,
  Calendar,
  User,
  BookOpen,
  AlertTriangle,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  Phone
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SidebarStaff from '../components/Sidebarmanager';
import './AdminDashboard.css';

const GestionRapportsStaff = () => {
  const [rapports, setRapports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userRole, setUserRole] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role);
    fetchRapports();
  }, [selectedDate]);

  const fetchRapports = async () => {
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (!token || (role !== 'inscripteur' && role !== 'paiement_manager')) {
        navigate('/');
        return;
      }

      const res = await axios.get('/api/rapports/staff/rapports', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });

      // Filtrer par date sélectionnée
      const filtered = res.data.filter(rapport => {
        const rapportDate = new Date(rapport.date);
        return (
          rapportDate.getDate() === selectedDate.getDate() &&
          rapportDate.getMonth() === selectedDate.getMonth() &&
          rapportDate.getFullYear() === selectedDate.getFullYear()
        );
      });

      setRapports(filtered);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement rapports:', error);
      setMessage('error');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  const downloadPDF = async (rapport) => {
    setIsDownloading(true);
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        `/api/rapports/staff/rapports/${rapport._id}/generate-pdf`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const date = new Date(rapport.date).toLocaleDateString('fr-FR').replace(/\//g, '-');
      const filename = `Rapport_${rapport.etudiant?.nomComplet || 'Etudiant'}_${date}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('download_success');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      setMessage('error_download');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const setToday = () => {
    setSelectedDate(new Date());
  };

  const openModal = (rapport) => {
    setSelectedRapport(rapport);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRapport(null);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTitle = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  };

  const getStatutBadge = (statut) => {
    const config = {
      'en_attente': { bg: '#FEF3C7', color: '#92400E', text: 'En attente' },
      'traite': { bg: '#DCFCE7', color: '#166534', text: 'Traité' },
      'archive': { bg: '#F3F4F6', color: '#6B7280', text: 'Archivé' }
    };
    
    const conf = config[statut] || config['en_attente'];
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: conf.bg,
        color: conf.color,
        border: `1px solid ${conf.color}30`
      }}>
        {conf.text}
      </span>
    );
  };

  const getRoleTitle = () => {
    if (userRole === 'inscripteur') return 'Inscripteur';
    if (userRole === 'paiement_manager') return 'Gestionnaire de Paiements';
    return 'Personnel';
  };

  if (isLoading) {
    return (
      <div className="admin-dashboard" style={{ background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)' }}>
        <SidebarStaff onLogout={handleLogout} />
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">Chargement des rapports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" style={{ background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)' }}>
      <SidebarStaff onLogout={handleLogout} />

      <div className="dashboard-header">
        <div className="container">
          <div className="header-content" style={{ 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center' 
          }}>
            <div className="header-info">
              <h1>Consultation des Rapports Disciplinaires</h1>
              <p style={{ color: '#6B7280', marginBottom: '4px' }}>
                Espace {getRoleTitle()} - Consultation uniquement
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="dashboard-content">

          {/* Navigation par date */}
          <div className="chart-card" style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
          <button 
            onClick={() => changeDate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              flex: '1',
              minWidth: '150px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <ChevronLeft style={{ width: '20px', height: '20px' }} />
            Précédent
          </button>
          
          <div style={{ textAlign: 'center', flex: '2', minWidth: '200px' }}>
            <Calendar style={{ 
              width: '32px', 
              height: '32px', 
              color: '#3B82F6', 
              margin: '0 auto 8px',
              display: 'block'
            }} />
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1F2937',
              margin: '0 0 4px 0',
              textTransform: 'capitalize'
            }}>
              {formatDateTitle(selectedDate)}
            </h2>
            <span style={{ fontSize: '16px', color: '#6B7280' }}>
              {selectedDate.toLocaleDateString('fr-FR')}
            </span>
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={setToday}
                style={{
                  padding: '8px 16px',
                  background: '#DBEAFE',
                  color: '#1E40AF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Retour à aujourd'hui
              </button>
            </div>
          </div>

          <button 
            onClick={() => changeDate(1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              flex: '1',
              minWidth: '150px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Suivant
            <ChevronRight style={{ width: '20px', height: '20px' }} />
          </button>
            </div>
          </div>

          {/* Liste des rapports */}
          {rapports.length === 0 ? (
            <div className="chart-card">
              <div className="chart-empty">
                <FileText />
                <div>
                  <h4>Aucun rapport pour cette date</h4>
                  <p>Sélectionnez une autre date pour voir les rapports</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {rapports.map(rapport => (
                <div key={rapport._id} className="chart-card" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '24px',
                  flexWrap: 'wrap'
                }}>
              {/* Gauche - Infos */}
              <div style={{ flex: 1, minWidth: '300px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #F3F4F6'
                }}>
                  <Clock style={{ width: '20px', height: '20px', color: '#6B7280' }} />
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                    {new Date(rapport.date).toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {getStatutBadge(rapport.statut)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <User style={{ width: '18px', height: '18px', color: '#9CA3AF', marginTop: '2px' }} />
                    <div>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600', marginRight: '8px' }}>
                        Étudiant:
                      </span>
                      <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>
                        {rapport.etudiant?.nomComplet}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <User style={{ width: '18px', height: '18px', color: '#9CA3AF', marginTop: '2px' }} />
                    <div>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600', marginRight: '8px' }}>
                        Professeur:
                      </span>
                      <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>
                        {rapport.professeur?.prenom} {rapport.professeur?.nom}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <BookOpen style={{ width: '18px', height: '18px', color: '#9CA3AF', marginTop: '2px' }} />
                    <div>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600', marginRight: '8px' }}>
                        Cours:
                      </span>
                      <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>
                        {rapport.cours}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#9CA3AF', marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {rapport.natureProbleme.map((nature, i) => (
                        <span key={i} style={{
                          padding: '4px 12px',
                          background: '#FEF3C7',
                          color: '#92400E',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: '1px solid #FDE68A'
                        }}>
                          {nature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Droite - Actions */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minWidth: '180px'
              }}>
                <button
                  onClick={() => openModal(rapport)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Eye style={{ width: '18px', height: '18px' }} />
                  Voir détails
                </button>
                
                <button
                  onClick={() => downloadPDF(rapport)}
                  disabled={isDownloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    opacity: isDownloading ? 0.6 : 1,
                    transition: 'transform 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => !isDownloading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Download style={{ width: '18px', height: '18px' }} />
                  Télécharger PDF
                </button>
              </div>
                </div>
              ))}
            </div>
          )}

          {/* Messages de notification */}
          {message && (
            <div style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '500',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              backgroundColor: message.includes('success') ? '#DCFCE7' : '#FEE2E2',
              color: message.includes('success') ? '#166534' : '#991B1B',
              border: `2px solid ${message.includes('success') ? '#16A34A' : '#DC2626'}`
            }}>
              {message === 'download_success' && '✓ PDF téléchargé avec succès'}
              {message === 'error_download' && '✗ Erreur lors du téléchargement'}
              {message === 'error' && '✗ Une erreur est survenue'}
            </div>
          )}
        </div>
      </div>

      {/* Modal Détails */}
      {showModal && selectedRapport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={closeModal}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '24px 32px',
              borderBottom: '2px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                Détails du Rapport
              </h2>
              <button
                onClick={closeModal}
                style={{
                  width: '36px',
                  height: '36px',
                  border: 'none',
                  background: '#F3F4F6',
                  borderRadius: '8px',
                  fontSize: '24px',
                  color: '#6B7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >×</button>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              {/* Informations générales */}
              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Informations générales
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Date :</span>
                    <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>{formatDate(selectedRapport.date)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Statut :</span>
                    {getStatutBadge(selectedRapport.statut)}
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Étudiant :</span>
                    <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>{selectedRapport.etudiant?.nomComplet}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Niveau :</span>
                    <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>{selectedRapport.niveau}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Professeur :</span>
                    <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>
                      {selectedRapport.professeur?.prenom} {selectedRapport.professeur?.nom}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Cours :</span>
                    <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: '500' }}>{selectedRapport.cours}</span>
                  </div>
                </div>
              </div>

              {/* Contact parents */}
              {(selectedRapport.etudiant?.telephonePere || selectedRapport.etudiant?.telephoneMere) && (
                <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                    Contact Parents
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {selectedRapport.etudiant?.telephonePere && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#DBEAFE',
                        borderRadius: '8px',
                        border: '1px solid #93C5FD'
                      }}>
                        <Phone style={{ width: '16px', height: '16px', color: '#1E40AF' }} />
                        <span style={{ fontSize: '14px', color: '#1E40AF', fontWeight: '500' }}>
                          Père: {selectedRapport.etudiant.telephonePere}
                        </span>
                      </div>
                    )}
                    {selectedRapport.etudiant?.telephoneMere && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#FCE7F3',
                        borderRadius: '8px',
                        border: '1px solid #FBCFE8'
                      }}>
                        <Phone style={{ width: '16px', height: '16px', color: '#BE185D' }} />
                        <span style={{ fontSize: '14px', color: '#BE185D', fontWeight: '500' }}>
                          Mère: {selectedRapport.etudiant.telephoneMere}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nature du problème */}
              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Nature du problème observé
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {selectedRapport.natureProbleme.map((nature, i) => (
                    <span key={i} style={{
                      padding: '6px 14px',
                      background: '#FEF3C7',
                      color: '#92400E',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      border: '1px solid #FDE68A'
                    }}>
                      {nature}
                    </span>
                  ))}
                </div>
                {selectedRapport.autreProbleme && (
                  <p style={{ fontSize: '15px', color: '#374151', margin: '12px 0 0 0', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
                    <strong style={{ color: '#1F2937' }}>Autre problème :</strong> {selectedRapport.autreProbleme}
                  </p>
                )}
              </div>

              {/* Description de l'incident */}
              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Description de l'incident
                </h4>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#374151', 
                  lineHeight: '1.7', 
                  margin: 0,
                  padding: '16px',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  {selectedRapport.descriptionIncident}
                </p>
              </div>

              {/* Mesures prises */}
              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Mesures prises par le professeur
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {selectedRapport.mesurePrise.map((mesure, i) => (
                    <span key={i} style={{
                      padding: '6px 14px',
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      border: '1px solid #BFDBFE'
                    }}>
                      {mesure}
                    </span>
                  ))}
                </div>
                {selectedRapport.autreMesure && (
                  <p style={{ fontSize: '15px', color: '#374151', margin: '12px 0 0 0', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
                    <strong style={{ color: '#1F2937' }}>Autre mesure :</strong> {selectedRapport.autreMesure}
                  </p>
                )}
              </div>

              {/* Observations du professeur */}
              {selectedRapport.observationProfesseur && (
                <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                    Observations du professeur
                  </h4>
                  <p style={{ 
                    fontSize: '15px', 
                    color: '#374151', 
                    lineHeight: '1.7', 
                    margin: 0,
                    padding: '16px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB'
                  }}>
                    {selectedRapport.observationProfesseur}
                  </p>
                </div>
              )}

              {/* Visa de la direction */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Visa de la direction
                </h4>
                {selectedRapport.visaDirection ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: '#DCFCE7',
                    color: '#166534',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '1px solid #BBF7D0'
                  }}>
                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Visa apposé le {new Date(selectedRapport.dateVisa).toLocaleDateString('fr-FR')}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '1px solid #FDE68A'
                  }}>
                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    En attente du visa de la direction
                  </div>
                )}
              </div>

              {/* Bouton de téléchargement */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                <button
                  onClick={() => downloadPDF(selectedRapport)}
                  disabled={isDownloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 28px',
                    background: isDownloading 
                      ? 'linear-gradient(135deg, #9CA3AF, #6B7280)' 
                      : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'transform 0.2s',
                    opacity: isDownloading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => !isDownloading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {isDownloading ? (
                    <>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid #FFFFFF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Téléchargement en cours...
                    </>
                  ) : (
                    <>
                      <Download style={{ width: '20px', height: '20px' }} />
                      Télécharger le PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GestionRapportsStaff;