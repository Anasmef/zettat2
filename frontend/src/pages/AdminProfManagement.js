import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Send,
  UserX,
  CheckCircle,
  Plus,
  Settings,
  Filter,
  UserCheck,
  Edit3,
  History,
  X
} from 'lucide-react';
import Sidebar from '../components/Sidebar'; // ✅ استيراد صحيح

const AdminProfManagement = () => {
  const [professeurs, setProfesseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState({}); // Pour tracking emails individuels
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterType, setFilterType] = useState('tous');
  const [showAddModal, setShowAddModal] = useState({ show: false, type: '', profId: '', profNom: '' });
  const [modalData, setModalData] = useState({ tempsRetard: '', cours: '', remarque: '', justifiee: false, raisonJustification: '' });
  const [stats, setStats] = useState({
    total: 0,
    avecRetards: 0,
    absents: 0,
    actifs: 0
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historiqueData, setHistoriqueData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      window.location.href = '/';
    }
    fetchProfesseurs();
  }, []);

  const fetchProfesseurs = async () => {
    const token = localStorage.getItem('token');
    try {
      const resProfesseurs = await fetch('http://localhost:5000/api/admin/professeurs-avec-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (resProfesseurs.ok) {
        const dataProfs = await resProfesseurs.json();
        setProfesseurs(dataProfs);
        
        const total = dataProfs.length;
        const avecRetards = dataProfs.filter(p => p.retards > 0).length;
        const absents = dataProfs.filter(p => p.absences > 0).length;
        const actifs = dataProfs.filter(p => p.actif).length;
        
        setStats({ total, avecRetards, absents, actifs });
      }
    } catch (err) {
      console.error('Erreur récupération professeurs:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const ajouterRetard = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/professeur/${showAddModal.profId}/retard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tempsRetard: parseInt(modalData.tempsRetard),
          cours: modalData.cours,
          remarque: modalData.remarque
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Retard ajouté pour ${showAddModal.profNom}` });
        fetchProfesseurs(); // Recharger les données
        setShowAddModal({ show: false, type: '', profId: '', profNom: '' });
        setModalData({ tempsRetard: '', cours: '', remarque: '', justifiee: false, raisonJustification: '' });
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: errorData.message || 'Erreur lors de l\'ajout du retard' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    }
  };

  const ajouterAbsence = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/professeur/${showAddModal.profId}/absence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cours: modalData.cours,
          justifiee: modalData.justifiee,
          raisonJustification: modalData.raisonJustification,
          remarque: modalData.remarque
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Absence ajoutée pour ${showAddModal.profNom}` });
        fetchProfesseurs();
        setShowAddModal({ show: false, type: '', profId: '', profNom: '' });
        setModalData({ tempsRetard: '', cours: '', remarque: '', justifiee: false, raisonJustification: '' });
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: errorData.message || 'Erreur lors de l\'ajout de l\'absence' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    }
  };


  const envoyerStatistiquesProf = async (prof) => {
  setSendingEmails(prev => ({ ...prev, [prof._id]: true }));
  setMessage({ type: '', text: '' });

  const token = localStorage.getItem('token');
  
  try {
    // ETAPE 1: Récupérer les données actualisées directement du serveur
    const resHistorique = await fetch(`http://localhost:5000/api/admin/professeur/${prof._id}/historique`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!resHistorique.ok) {
      throw new Error('Impossible de récupérer les données actualisées');
    }
    
    const donneesActualisees = await resHistorique.json();
    
    // ETAPE 2: Construire le rapport avec TOUTES les données actuelles
    const rapportComplet = {
      professeur: donneesActualisees.professeur,
      statistiques: donneesActualisees.statistiques,
      retards: donneesActualisees.retards, // Tous les retards avec détails
      absences: donneesActualisees.absences, // Toutes les absences avec détails
      date: new Date().toLocaleDateString('fr-FR')
    };

    // ETAPE 3: Envoyer l'email avec les données complètes
    const res = await fetch('http://localhost:5000/api/admin/send-prof-individual-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        destinataire: 'glaibi2@gmail.com',
        rapport: rapportComplet
      })
    });

    if (res.ok) {
      setMessage({ 
        type: 'success', 
        text: `Rapport complet de ${prof.nom} envoyé avec toutes les données actualisées!` 
      });
    } else {
      const errorData = await res.json();
      setMessage({ 
        type: 'error', 
        text: errorData.message || 'Erreur lors de l\'envoi' 
      });
    }
  } catch (err) {
    console.error('Erreur envoi email:', err);
    setMessage({ 
      type: 'error', 
      text: 'Erreur de connexion lors de l\'envoi' 
    });
  } finally {
    setSendingEmails(prev => ({ ...prev, [prof._id]: false }));
  }
};
  const fetchHistorique = async (profId) => {
    setLoadingHistory(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/professeur/${profId}/historique`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoriqueData(data);
        setShowHistoryModal(true);
      } else {
        setMessage({ type: 'error', text: "Erreur lors du chargement de l'historique" });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const getProfesseursFiltres = () => {
    switch (filterType) {
      case 'retards':
        return professeurs.filter(p => p.retards > 0);
      case 'absents':
        return professeurs.filter(p => p.absences > 0);
      default:
        return professeurs;
    }
  };

  const getStatutColor = (prof) => {
    if (prof.absences > 3) return '#ef4444';
    if (prof.retards > 5) return '#f59e0b';
    if (prof.retards > 0 || prof.absences > 0) return '#eab308';
    return '#10b981';
  };

  const openModal = (type, profId, profNom) => {
    setShowAddModal({ show: true, type, profId, profNom });
    setModalData({ tempsRetard: '', cours: '', remarque: '', justifiee: false, raisonJustification: '' });
  };

  const closeModal = () => {
    setShowAddModal({ show: false, type: '', profId: '', profNom: '' });
    setModalData({ tempsRetard: '', cours: '', remarque: '', justifiee: false, raisonJustification: '' });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#64748b' }}>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>              <Sidebar onLogout={handleLogout} />

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Users size={32} style={{ color: '#3b82f6' }} />
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1e293b',
              margin: 0,
              textAlign: 'center'
            }}>
              Gestion des Professeurs
            </h1>
            <p style={{
              color: '#64748b',
              fontSize: '16px',
              margin: '4px 0 0 0',
              textAlign: 'center'
            }}>
              Marquer absences/retards et envoyer statistiques
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <Users size={24} style={{ color: '#3b82f6', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>
              {stats.total}
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Total Professeurs</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <Clock size={24} style={{ color: '#f59e0b', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>
              {stats.avecRetards}
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Avec Retards</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <UserX size={24} style={{ color: '#ef4444', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>
              {stats.absents}
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Avec Absences</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <CheckCircle size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>
              {stats.actifs}
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Actifs</p>
          </div>
        </div>

        {/* Filtres */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          {message.text && (
            <div style={{
              backgroundColor: message.type === 'success' ? '#dcfce7' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {message.type === 'success' ? (
                <CheckCircle size={20} style={{ color: '#059669' }} />
              ) : (
                <AlertTriangle size={20} style={{ color: '#dc2626' }} />
              )}
              <span style={{
                color: message.type === 'success' ? '#059669' : '#dc2626',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {message.text}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Filter size={20} style={{ color: '#64748b' }} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="tous">Tous les professeurs</option>
              <option value="retards">Avec retards seulement</option>
              <option value="absents">Avec absences seulement</option>
            </select>
          </div>
        </div>

        {/* Liste des professeurs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '20px'
          }}>
            Liste des Professeurs ({getProfesseursFiltres().length})
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            {getProfesseursFiltres().map((prof) => (
              <div
                key={prof._id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: '#fafafa',
                  borderLeft: `4px solid ${getStatutColor(prof)}`
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '20px',
                  alignItems: 'center'
                }}>
                  {/* Info professeur */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1e293b',
                        margin: '0 0 4px 0'
                      }}>
                        {prof.nom}
                      </h3>
                      <p style={{
                        color: '#64748b',
                        fontSize: '14px',
                        margin: '0 0 2px 0'
                      }}>
                        {prof.email}
                      </p>
                      <p style={{
                        color: '#64748b',
                        fontSize: '14px',
                        margin: 0
                      }}>
                        Matière: {prof.matiere}
                      </p>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '4px'
                      }}>
                        <Clock size={16} style={{ color: '#f59e0b' }} />
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: prof.retards > 0 ? '#f59e0b' : '#10b981'
                        }}>
                          {prof.retards} retards
                        </span>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: '#64748b',
                        margin: 0
                      }}>
                        {prof.tempsRetardTotal} min total
                      </p>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '4px'
                      }}>
                        <UserX size={16} style={{ color: '#ef4444' }} />
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: prof.absences > 0 ? '#ef4444' : '#10b981'
                        }}>
                          {prof.absences} absences
                        </span>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: '#64748b',
                        margin: 0
                      }}>
                        {prof.dernierRetard ? `Dernier: ${new Date(prof.dernierRetard).toLocaleDateString('fr-FR')}` : 'Aucun retard'}
                      </p>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minWidth: '200px'
                  }}>
                    {/* Boutons pour ajouter retard/absence */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openModal('retard', prof._id, prof.nom)}
                        style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flex: 1
                        }}
                      >
                        <Clock size={14} />
                        Retard
                      </button>
                      
                      <button
                        onClick={() => openModal('absence', prof._id, prof.nom)}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flex: 1
                        }}
                      >
                        <UserX size={14} />
                        Absence
                      </button>
                    </div>

                    {/* Bouton pour envoyer email individuel */}
                    <button
                      onClick={() => envoyerStatistiquesProf(prof)}
                      disabled={sendingEmails[prof._id]}
                      style={{
                        backgroundColor: sendingEmails[prof._id] ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: sendingEmails[prof._id] ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%'
                      }}
                    >
                      {sendingEmails[prof._id] ? (
                        <>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid #ffffff40',
                            borderTop: '2px solid #ffffff',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Envoyer Stats
                        </>
                      )}
                    </button>

                    {/* Bouton pour voir l'historique */}
                    <button
                      onClick={() => fetchHistorique(prof._id)}
                      disabled={loadingHistory}
                      style={{
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: loadingHistory ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%'
                      }}
                    >
                      <History size={14} />
                      Historique
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getProfesseursFiltres().length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748b'
            }}>
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', margin: 0 }}>
                Aucun professeur trouvé pour ce filtre
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal pour ajouter retard/absence */}
      {showAddModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {showAddModal.type === 'retard' ? <Clock size={24} style={{ color: '#f59e0b' }} /> : <UserX size={24} style={{ color: '#ef4444' }} />}
              {showAddModal.type === 'retard' ? 'Ajouter un retard' : 'Ajouter une absence'}
              <span style={{ color: '#64748b', fontWeight: '400' }}>- {showAddModal.profNom}</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {showAddModal.type === 'retard' && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Temps de retard (minutes) *
                  </label>
                  <input
                    type="number"
                    value={modalData.tempsRetard}
                    onChange={(e) => setModalData(prev => ({ ...prev, tempsRetard: e.target.value }))}
                    placeholder="ex: 15"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {showAddModal.type === 'absence' && (
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={modalData.justifiee}
                      onChange={(e) => setModalData(prev => ({ ...prev, justifiee: e.target.checked }))}
                    />
                    Absence justifiée
                  </label>
                  {modalData.justifiee && (
                    <input
                      type="text"
                      value={modalData.raisonJustification}
                      onChange={(e) => setModalData(prev => ({ ...prev, raisonJustification: e.target.value }))}
                      placeholder="Raison de la justification"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        marginTop: '8px'
                      }}
                    />
                  )}
                </div>
              )}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Remarque
                </label>
                <textarea
                  value={modalData.remarque}
                  onChange={(e) => setModalData(prev => ({ ...prev, remarque: e.target.value }))}
                  placeholder="Commentaire optionnel..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                onClick={closeModal}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={showAddModal.type === 'retard' ? ajouterRetard : ajouterAbsence}
                disabled={showAddModal.type === 'retard' ? !modalData.tempsRetard : false}
                style={{
                  backgroundColor: showAddModal.type === 'retard' ? '#f59e0b' : '#ef4444',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  opacity: (showAddModal.type === 'retard' && !modalData.tempsRetard) ? 0.5 : 1
                }}
              >
                {showAddModal.type === 'retard' ? 'Ajouter Retard' : 'Ajouter Absence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && historiqueData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1e293b',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <History size={24} style={{ color: '#8b5cf6' }} />
                Historique - {historiqueData.professeur.nom}
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px'
                }}
              >
                <X size={24} style={{ color: '#64748b' }} />
              </button>
            </div>
            {/* Info professeur */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div><strong>Email:</strong> {historiqueData.professeur.email}</div>
                <div><strong>Matière:</strong> {historiqueData.professeur.matiere}</div>
                <div><strong>Téléphone:</strong> {historiqueData.professeur.telephone || 'N/A'}</div>
              </div>
            </div>
            {/* Statistiques rapides */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
                  {historiqueData.statistiques?.totalRetards || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Retards</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
                  {historiqueData.statistiques?.totalAbsences || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Absences</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>
                  {historiqueData.statistiques?.tempsRetardTotal || 0}m
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Temps total</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Section Retards */}
              <div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Clock size={20} style={{ color: '#f59e0b' }} />
                  Retards ({historiqueData.retards.length})
                </h4>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {historiqueData.retards.length > 0 ? (
                    historiqueData.retards.map((retard, index) => (
                      <div key={index} style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontWeight: '600', color: '#dc2626' }}>
                            {new Date(retard.date).toLocaleDateString('fr-FR')}
                          </span>
                          <span style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            {retard.tempsRetard}min
                          </span>
                        </div>
                        {retard.cours && (
                          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                            <strong>Cours:</strong> {retard.cours}
                          </div>
                        )}
                        {retard.remarque && (
                          <div style={{ fontSize: '14px', color: '#64748b' }}>
                            <strong>Remarque:</strong> {retard.remarque}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                      Aucun retard enregistré
                    </p>
                  )}
                </div>
              </div>
              {/* Section Absences */}
              <div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <UserX size={20} style={{ color: '#ef4444' }} />
                  Absences ({historiqueData.absences.length})
                </h4>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {historiqueData.absences.length > 0 ? (
                    historiqueData.absences.map((absence, index) => (
                      <div key={index} style={{
                        backgroundColor: absence.justifiee ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${absence.justifiee ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontWeight: '600', color: absence.justifiee ? '#059669' : '#dc2626' }}>
                            {new Date(absence.date).toLocaleDateString('fr-FR')}
                          </span>
                          <span style={{
                            backgroundColor: absence.justifiee ? '#059669' : '#dc2626',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            {absence.justifiee ? 'JUSTIFIÉE' : 'NON JUSTIFIÉE'}
                          </span>
                        </div>
                        {absence.cours && (
                          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                            <strong>Cours:</strong> {absence.cours}
                          </div>
                        )}
                        {absence.raisonJustification && (
                          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                            <strong>Justification:</strong> {absence.raisonJustification}
                          </div>
                        )}
                        {absence.remarque && (
                          <div style={{ fontSize: '14px', color: '#64748b' }}>
                            <strong>Remarque:</strong> {absence.remarque}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                      Aucune absence enregistrée
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminProfManagement;
