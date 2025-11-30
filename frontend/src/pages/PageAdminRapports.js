// ============================================
// PAGE ADMIN - GestionRapports.jsx (STYLE DASHBOARD)
// ============================================
import React, { useEffect, useState } from 'react';
import { 
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Calendar,
  User,
  BookOpen,
  AlertTriangle,
  Shield,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SidebarAdmin from '../components/Sidebar';
import './AdminDashboard.css';

const GestionRapports = () => {
  const [rapports, setRapports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const navigate = useNavigate();

  useEffect(() => {
    fetchRapports();
  }, [selectedDate]);

  const fetchRapports = async () => {
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (!token || role !== 'admin') {
        navigate('/');
        return;
      }

      const res = await axios.get('/api/rapports/admin/rapports', {
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
    window.location.href = '/login';
  };

  const handleVisa = async (rapportId, visa) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `/api/rapports/admin/rapports/${rapportId}/visa`,
        { visaDirection: visa },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('visa_success');
      fetchRapports();
      setShowModal(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur visa:', error);
      setMessage('error');
    }
  };

  const handleChangeStatut = async (rapportId, newStatut) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `/api/rapports/admin/rapports/${rapportId}/statut`,
        { statut: newStatut },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('statut_success');
      fetchRapports();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur statut:', error);
      setMessage('error');
    }
  };

  const handleDelete = async (rapportId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `/api/rapports/admin/rapports/${rapportId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('delete_success');
      fetchRapports();
      setShowModal(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur suppression:', error);
      setMessage('error');
    }
  };

  const downloadPDF = async (rapport) => {
    setIsDownloading(true);
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        `/api/rapports/admin/rapports/${rapport._id}/generate-pdf`,
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

  if (isLoading) {
    return (
      <div className="admin-dashboard" style={{ background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)' }}>
        <SidebarAdmin onLogout={handleLogout} />
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
      <SidebarAdmin onLogout={handleLogout} />

      <div className="dashboard-header">
        <div className="container">
          <div className="header-content" style={{ 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center' 
          }}>
            <div className="header-info">
              <h1>Gestion des Rapports Disciplinaires</h1>
              <p style={{ color: '#6B7280', marginBottom: '4px' }}>
                Consultez et gérez les rapports par date
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="dashboard-content">
          
          {/* Navigation par date */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(229, 231, 235, 0.5)'
          }}>
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
                <span style={{ display: 'none' }} className="desktop-text">Jour précédent</span>
                <span className="mobile-text">Précédent</span>
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
                <span style={{ display: 'none' }} className="desktop-text">Jour suivant</span>
                <span className="mobile-text">Suivant</span>
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
                    minWidth: '200px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openModal(rapport)}
                        style={{
                          padding: '8px',
                          background: '#F3F4F6',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        title="Voir détails"
                      >
                        <Eye style={{ width: '18px', height: '18px', color: '#374151' }} />
                      </button>
                      
                      <button
                        onClick={() => downloadPDF(rapport)}
                        disabled={isDownloading}
                        style={{
                          padding: '8px',
                          background: '#DBEAFE',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        title="Télécharger PDF"
                      >
                        <Download style={{ width: '18px', height: '18px', color: '#374151' }} />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(rapport._id)}
                        style={{
                          padding: '8px',
                          background: '#FEE2E2',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        title="Supprimer"
                      >
                        <Trash2 style={{ width: '18px', height: '18px', color: '#374151' }} />
                      </button>
                    </div>

                    <select
                      value={rapport.statut}
                      onChange={(e) => handleChangeStatut(rapport._id, e.target.value)}
                      style={{
                        padding: '8px 16px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        outline: 'none',
                        width: '100%'
                      }}
                    >
                      <option value="en_attente">En attente</option>
                      <option value="traite">Traité</option>
                      <option value="archive">Archivé</option>
                    </select>

                    {!rapport.visaDirection ? (
                      <button
                        onClick={() => handleVisa(rapport._id, true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #059669, #047857)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                          transition: 'transform 0.2s',
                          width: '100%'
                        }}
                      >
                        <Shield style={{ width: '16px', height: '16px' }} />
                        Apposer le Visa
                      </button>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#DCFCE7',
                        color: '#166534',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid #BBF7D0'
                      }}>
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                        Visa apposé
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
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
              border: '2px solid',
              fontSize: '15px',
              fontWeight: '500',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              backgroundColor: message.includes('success') ? '#DCFCE7' : '#FEE2E2',
              borderColor: message.includes('success') ? '#16A34A' : '#DC2626',
              color: message.includes('success') ? '#166534' : '#991B1B'
            }}>
              {message.includes('success') ? (
                <>
                  <CheckCircle style={{ width: '20px', height: '20px' }} />
                  {message === 'visa_success' && 'Visa apposé avec succès'}
                  {message === 'statut_success' && 'Statut mis à jour'}
                  {message === 'delete_success' && 'Rapport supprimé'}
                  {message === 'download_success' && 'PDF téléchargé avec succès'}
                </>
              ) : (
                <>
                  <XCircle style={{ width: '20px', height: '20px' }} />
                  {message === 'error_download' ? 'Erreur lors du téléchargement' : 'Une erreur est survenue'}
                </>
              )}
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
              {/* Contenu du modal - identique au précédent */}
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

              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Nature du problème
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {selectedRapport.natureProbleme.map((nature, i) => (
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
                {selectedRapport.autreProbleme && (
                  <p style={{ fontSize: '15px', color: '#374151', margin: '8px 0' }}>
                    <strong>Autre :</strong> {selectedRapport.autreProbleme}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Description de l'incident
                </h4>
                <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }}>
                  {selectedRapport.descriptionIncident}
                </p>
              </div>

              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Mesures prises
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {selectedRapport.mesurePrise.map((mesure, i) => (
                    <span key={i} style={{
                      padding: '4px 12px',
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: '1px solid #BFDBFE'
                    }}>
                      {mesure}
                    </span>
                  ))}
                </div>
                {selectedRapport.autreMesure && (
                  <p style={{ fontSize: '15px', color: '#374151', margin: '8px 0' }}>
                    <strong>Autre :</strong> {selectedRapport.autreMesure}
                  </p>
                )}
              </div>

              {selectedRapport.observationProfesseur && (
                <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                    Observations du professeur
                  </h4>
                  <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }}>
                    {selectedRapport.observationProfesseur}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #F3F4F6' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                  Visa de la direction
                </h4>
                {selectedRapport.visaDirection ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: '#DCFCE7',
                    color: '#166534',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: '1px solid #BBF7D0'
                  }}>
                    <CheckCircle style={{ width: '16px', height: '16px' }} />
                    Visa apposé le {new Date(selectedRapport.dateVisa).toLocaleDateString('fr-FR')}
                  </div>
                ) : (
                  <button
                    onClick={() => handleVisa(selectedRapport._id, true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                    }}
                  >
                    <Shield style={{ width: '16px', height: '16px' }} />
                    Apposer le Visa
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', paddingTop: '20px' }}>
                <button
                  onClick={() => downloadPDF(selectedRapport)}
                  disabled={isDownloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                >
                  {isDownloading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid #FFFFFF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Download style={{ width: '20px', height: '20px' }} />
                      Télécharger PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Style tag pour le responsive
const style = document.createElement('style');
style.textContent = `
  @media (min-width: 769px) {
    .mobile-text {
      display: none !important;
    }
    .desktop-text {
      display: inline !important;
    }
  }

  @media (max-width: 768px) {
    .desktop-text {
      display: none !important;
    }
    .mobile-text {
      display: inline !important;
    }
  }
`;
document.head.appendChild(style);

export default GestionRapports;