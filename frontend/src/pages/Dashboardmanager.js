import React, { useEffect, useState } from 'react';
import { 
  DollarSign, Users, AlertTriangle, TrendingUp, RefreshCw, Bell,
  Search, Settings, LogOut, CreditCard, UserCheck,
  Calculator, Target, Clock, X, Activity
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import RappelModal from '../components/RappelModal'; // adapte le chemin si besoin
import Header from '../components/Header';

const Dashboardmanager = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const [stats, setStats] = useState({
    totalEtudiants: 0,
    etudiantsPayes: 0,
    montantTotal: 0,
    montantCollecte: 0,
    paiementsExpires: 0
  });
  
  // États pour les modals
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [nouveauxEtudiants, setNouveauxEtudiants] = useState([]);
  
  // États pour les rappels (ajoutés)
  const [rappelModal, setRappelModal] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  
  // États généraux
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatsFinancieres();
    checkNouveauxEtudiants();
    
    // Vérifier périodiquement les nouveaux étudiants (toutes les 5 minutes)
    const interval = setInterval(checkNouveauxEtudiants, 300000);
    return () => clearInterval(interval);
  }, []);

  // Hook pour les rappels (ajouté)
  useEffect(() => {
    const fetchRappels = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const res = await fetch('http://localhost:5000/api/rappels', { headers });
        if (!res.ok) throw new Error('Erreur lors du chargement des rappels');

        const data = await res.json();

        // Filtrage des rappels pour la date actuelle
        const today = new Date();
        const rappelsAujourdhui = data.filter(r =>
          r.status === 'actif' &&
          new Date(r.dateRappel).toDateString() <= today.toDateString()
        );

        console.log('📢 Rappels à afficher aujourd\'hui:', rappelsAujourdhui);

        if (rappelsAujourdhui.length > 0) {
          setRappelModal(rappelsAujourdhui[0]);
          setEditDate(rappelsAujourdhui[0].dateRappel?.split('T')[0] || '');
          setEditNote(rappelsAujourdhui[0].note || '');
        }

      } catch (err) {
        console.error('❌ Erreur rappels:', err.message);
      }
    };

    fetchRappels();
  }, []);

  // Gestionnaires pour les rappels (ajoutés)
  const handleUpdateRappel = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/rappels/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ dateRappel: editDate, note: editNote })
      });

      if (res.ok) {
        setRappelModal(null);
        alert("Rappel mis à jour avec succès");
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Erreur mise à jour rappel:', err);
      alert('Erreur lors de la mise à jour: ' + err.message);
    }
  };

  const handleDeleteRappel = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/rappels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setRappelModal(null);
        alert("Rappel supprimé avec succès");
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Erreur suppression rappel:', err);
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  const fetchStatsFinancieres = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Présent' : 'Absent');
      console.log('URL appelée:', 'http://localhost:5000/api/paiement-manager/stats');
      
      const res = await fetch('http://localhost:5000/api/paiement-manager/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Réponse reçue:', data);
      setStats(data);
      
    } catch (err) {
      console.error('Erreur complète:', err);
      setError(`Erreur de connexion: ${err.message}`);
      
      // Données de démonstration en cas d'erreur
      setStats({
        totalEtudiants: 156,
        etudiantsPayes: 98,
        montantTotal: 468000,
        montantCollecte: 294000,
        paiementsExpires: 12
      });
    } finally {
      setLoading(false);
    }
  };

  const checkNouveauxEtudiants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/paiement-manager/etudiants-nouveaux', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Filtrer les étudiants sans prix défini
        const etudiantsSansPrix = data.filter(etudiant => 
          !etudiant.prixTotal || etudiant.prixTotal === 0
        );
        
        setNouveauxEtudiants(etudiantsSansPrix);
        
        // Afficher la modal s'il y a de nouveaux étudiants et qu'elle n'est pas déjà ouverte
        if (etudiantsSansPrix.length > 0 && !showNotificationModal && !showFinanceModal) {
          setSelectedEtudiant(etudiantsSansPrix[0]);
          setShowNotificationModal(true);
        }
      }
    } catch (err) {
      console.error('Erreur vérification nouveaux étudiants:', err);
      // Données de démonstration en cas d'erreur
     
    }
  };

  const handleSetPrice = (etudiant) => {
    setSelectedEtudiant(etudiant);
    setShowNotificationModal(false);
    setShowFinanceModal(true);
  };

  const handleFinanceSubmit = async (financeData) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:5000/api/etudiants/${selectedEtudiant._id}/finance`,
        {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(financeData)
        }
      );
      
      if (res.ok) {
        // Rafraîchir les stats et vérifier les nouveaux étudiants
        await fetchStatsFinancieres();
        await checkNouveauxEtudiants();
        setShowFinanceModal(false);
        
        // Message de succès
        alert('Prix défini avec succès pour ' + selectedEtudiant.nomComplet);
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
      
    } catch (err) {
      console.error('Erreur mise à jour finance:', err);
      alert('Erreur lors de la mise à jour: ' + err.message);
    }
  };

  const handleShowNextStudent = () => {
    if (nouveauxEtudiants.length > 1) {
      const currentIndex = nouveauxEtudiants.findIndex(e => e._id === selectedEtudiant._id);
      const nextIndex = (currentIndex + 1) % nouveauxEtudiants.length;
      setSelectedEtudiant(nouveauxEtudiants[nextIndex]);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle, percentage, formatAsAmount = false }) => (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-card-content">
        <div className="stat-card-info">
          <h3 className="stat-card-title">{title}</h3>
          <p className="stat-card-value">
            {formatAsAmount ? `${formatMontant(value)} DH` : value?.toLocaleString() || 0}
          </p>
          {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
          {percentage !== undefined && (
            <div style={{marginTop: '12px'}}>
              <div style={{
                background: '#E5E7EB',
                borderRadius: '9999px',
                height: '8px',
                marginBottom: '4px'
              }}>
                <div 
                  style={{
                    background: colorClass === 'blue' ? '#3B82F6' : colorClass === 'green' ? '#10B981' : '#8B5CF6',
                    borderRadius: '9999px',
                    height: '8px',
                    width: `${Math.min(percentage, 100)}%`,
                    transition: 'width 0.7s ease-in-out'
                  }}
                ></div>
              </div>
              <p style={{fontSize: '0.75rem', color: '#6B7280'}}>{percentage}% collecté</p>
            </div>
          )}
        </div>
        <div className={`stat-card-icon ${colorClass}`}>
          <Icon />
        </div>
      </div>
    </div>
  );

  // Modal de notification pour nouveaux étudiants
  const ModalNotificationEtudiant = () => {
    if (!showNotificationModal || !selectedEtudiant) return null;
    
    const currentIndex = nouveauxEtudiants.findIndex(e => e._id === selectedEtudiant._id) + 1;
    
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <h3 style={{fontSize: '18px', fontWeight: 'bold', color: '#1F2937'}}>Nouvel Étudiant Détecté</h3>
            <button 
              onClick={() => setShowNotificationModal(false)}
              style={{
                padding: '4px',
                background: 'none',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <p style={{fontWeight: '600', color: '#1F2937'}}>{selectedEtudiant.nomComplet}</p>
            <p style={{color: '#6B7280', fontSize: '14px'}}>{selectedEtudiant.email}</p>
            <p style={{color: '#3B82F6', fontSize: '12px', marginTop: '4px'}}>
              Étudiant {currentIndex} sur {nouveauxEtudiants.length}
            </p>
          </div>
          
          <p style={{color: '#6B7280', marginBottom: '24px'}}>
            Cet étudiant n'a pas encore de prix défini. Voulez-vous configurer ses informations financières ?
          </p>
          
          <div style={{display: 'flex', gap: '12px'}}>
            <button 
              onClick={() => handleSetPrice(selectedEtudiant)}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Définir le Prix
            </button>
            {nouveauxEtudiants.length > 1 && (
              <button 
                onClick={handleShowNextStudent}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #D1D5DB',
                  color: '#374151',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Suivant
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Modal de configuration financière utilisant votre composant existant
  const ModalFinance = () => {
    if (!showFinanceModal || !selectedEtudiant) return null;

    const handleModalSubmit = (formFinance) => {
      handleFinanceSubmit(formFinance);
    };

    const handleModalClose = () => {
      setShowFinanceModal(false);
    };

    return (
      <div className="modal-overlay" onClick={handleModalClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Gestion Financière - {selectedEtudiant?.nomComplet}</h3>
            <button className="btn-fermer-modal" onClick={handleModalClose}>×</button>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const formFinance = {
              prixTotal: parseFloat(formData.get('prixTotal')) || 0,
              paye: formData.get('paye') === 'true',
              pourcentageBourse: parseFloat(formData.get('pourcentageBourse')) || 0,
              typePaiement: formData.get('typePaiement') || 'Cash'
            };
            handleModalSubmit(formFinance);
          }}>
            <div className="form-row">
              <div className="form-group">
                <label>Prix Total</label>
                <input
                  name="prixTotal"
                  type="number"
                  defaultValue={selectedEtudiant?.prixTotal || 0}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Pourcentage Bourse (%)</label>
                <input
                  name="pourcentageBourse"
                  type="number"
                  defaultValue={selectedEtudiant?.pourcentageBourse || 0}
                  min="0"
                  max="100"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Type Paiement</label>
                <select name="typePaiement" defaultValue={selectedEtudiant?.typePaiement || 'Cash'}>
                  <option value="Cash">Cash</option>
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                  <option value="En ligne">En ligne</option>
                </select>
              </div>
              <div className="form-group">
                <label>Statut Paiement</label>
                <select name="paye" defaultValue={selectedEtudiant?.paye ? 'true' : 'false'}>
                  <option value="false">Non payé</option>
                  <option value="true">Payé</option>
                </select>
              </div>
            </div>
            
            <div className="modal-actions">
              <button type="button" onClick={handleModalClose} className="btn-annuler">
                Annuler
              </button>
              <button type="submit" className="btn-enregistrer">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-MA').format(montant || 0);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Chargement des statistiques...</p>
          <p className="loading-subtext">Récupération des données financières</p>
        </div>
      </div>
    );
  }

  const collectionRate = calculatePercentage(stats.montantCollecte, stats.montantTotal);
  const paymentRate = calculatePercentage(stats.etudiantsPayes, stats.totalEtudiants);

  return (
    <div className="admin-dashboard" style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #a6dbff 25%, #f3e8ff 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Header ajouté */}
      <Header />
      <Sidebar onLogout={handleLogout} />
      
      {/* Modal de rappel ajouté */}
      {rappelModal && (
        <RappelModal
          rappel={rappelModal}
          onClose={() => setRappelModal(null)}
          onUpdate={() => handleUpdateRappel(rappelModal._id)}
          onDelete={() => handleDeleteRappel(rappelModal._id)}
          editDate={editDate}
          setEditDate={setEditDate}
          editNote={editNote}
          setEditNote={setEditNote}
        />
      )}
      
      <div className="dashboard-container">
        <div className="dashboard-content">
          {/* Message d'erreur */}
          {error && (
            <div className="alert-section">
              <div className="alert-content">
                <AlertTriangle />
                <div className="alert-text">
                  <h3>Erreur de Connexion</h3>
                  <p>{error} - Affichage des données de démonstration</p>
                </div>
              </div>
            </div>
          )}

          {/* Cartes de statistiques principales */}
          <div className="stats-grid">
            <StatCard
              title="Étudiants Inscrits"
              value={stats.totalEtudiants}
              icon={Users}
              colorClass="blue"
              subtitle={`${stats.etudiantsPayes} payés`}
              percentage={paymentRate}
            />
            
            <StatCard
              title="Montant Total Attendu"
              value={stats.montantTotal}
              icon={Target}
              colorClass="purple"
              subtitle="Revenus prévus"
              formatAsAmount={true}
            />
            
            <StatCard
              title="Montant Collecté"
              value={stats.montantCollecte}
              icon={DollarSign}
              colorClass="green"
              subtitle={`${collectionRate}% collecté`}
              percentage={collectionRate}
              formatAsAmount={true}
            />
            
            <StatCard
              title="Paiements Expirés"
              value={stats.paiementsExpires}
              icon={AlertTriangle}
              colorClass="red"
              subtitle="Nécessitent action"
            />
          </div>

          {/* Section de résumé financier */}
          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px'}}>
            {/* Résumé principal */}
            <div className="chart-card">
              <div className="chart-header">
                <Calculator />
                <div>
                  <h3>Résumé Financier</h3>
                  <p style={{fontSize: '14px', color: '#6B7280'}}>Aperçu des performances de collecte</p>
                </div>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{color: '#166534', fontWeight: '600', marginBottom: '8px'}}>Montant Collecté</h4>
                  <p style={{fontSize: '24px', fontWeight: 'bold', color: '#16A34A'}}>{formatMontant(stats.montantCollecte)} DH</p>
                  <div style={{marginTop: '8px', background: '#BBF7D0', borderRadius: '9999px', height: '8px'}}>
                    <div 
                      style={{
                        background: '#16A34A',
                        borderRadius: '9999px',
                        height: '8px',
                        width: `${collectionRate}%`,
                        transition: 'width 1s ease-in-out'
                      }}
                    ></div>
                  </div>
                  <p style={{color: '#15803D', fontSize: '12px', marginTop: '4px'}}>{collectionRate}% de l'objectif</p>
                </div>
                
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{color: '#1E40AF', fontWeight: '600', marginBottom: '8px'}}>Montant Restant</h4>
                  <p style={{fontSize: '24px', fontWeight: 'bold', color: '#2563EB'}}>{formatMontant(stats.montantTotal - stats.montantCollecte)} DH</p>
                  <div style={{marginTop: '8px', background: '#BFDBFE', borderRadius: '9999px', height: '8px'}}>
                    <div 
                      style={{
                        background: '#2563EB',
                        borderRadius: '9999px',
                        height: '8px',
                        width: `${100 - collectionRate}%`,
                        transition: 'width 1s ease-in-out'
                      }}
                    ></div>
                  </div>
                  <p style={{color: '#1D4ED8', fontSize: '12px', marginTop: '4px'}}>{100 - collectionRate}% restant</p>
                </div>
              </div>
            </div>

            {/* Métriques rapides */}
            <div className="chart-card">
              <h3 style={{color: '#1F2937', fontWeight: 'bold', fontSize: '18px', marginBottom: '16px'}}>Métriques Clés</h3>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '8px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <UserCheck size={16} style={{color: '#10B981', marginRight: '8px'}} />
                    <span style={{fontSize: '14px', color: '#374151'}}>Taux de Paiement</span>
                  </div>
                  <span style={{fontWeight: 'bold', color: '#16A34A'}}>{paymentRate}%</span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '8px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <DollarSign size={16} style={{color: '#3B82F6', marginRight: '8px'}} />
                    <span style={{fontSize: '14px', color: '#374151'}}>Taux de Collecte</span>
                  </div>
                  <span style={{fontWeight: 'bold', color: '#2563EB'}}>{collectionRate}%</span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '8px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <Clock size={16} style={{color: '#F59E0B', marginRight: '8px'}} />
                    <span style={{fontSize: '14px', color: '#374151'}}>Paiements Expirés</span>
                  </div>
                  <span style={{fontWeight: 'bold', color: '#D97706'}}>{stats.paiementsExpires}</span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '8px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <Calculator size={16} style={{color: '#8B5CF6', marginRight: '8px'}} />
                    <span style={{fontSize: '14px', color: '#374151'}}>Revenus Moyens</span>
                  </div>
                  <span style={{fontWeight: 'bold', color: '#7C3AED'}}>
                    {formatMontant(stats.totalEtudiants > 0 ? stats.montantTotal / stats.totalEtudiants : 0)} DH
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau de bord détaillé */}
          <div className="chart-card">
            <div className="chart-header">
              <Activity />
              <div>
                <h3>Analyse Détaillée</h3>
                <p style={{fontSize: '14px', color: '#6B7280'}}>Métriques de performance financière</p>
              </div>
              <div style={{marginLeft: 'auto', textAlign: 'right'}}>
                <p style={{fontSize: '12px', color: '#9CA3AF'}}>Dernière mise à jour</p>
                <p style={{fontSize: '14px', fontWeight: '500', color: '#374151'}}>Il y a quelques instants</p>
              </div>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'}}>
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'linear-gradient(135deg, #EBF8FF 0%, #DBEAFE 100%)',
                borderRadius: '12px',
                border: '1px solid #BFDBFE'
              }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '12px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.2)',
                  marginBottom: '12px'
                }}>
                  <Users style={{color: '#2563EB'}} size={24} />
                </div>
                <h4 style={{fontWeight: '600', color: '#1E40AF', marginBottom: '4px'}}>Taux de Participation</h4>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#2563EB'}}>{paymentRate}%</p>
                <p style={{fontSize: '12px', color: '#1D4ED8'}}>{stats.etudiantsPayes} sur {stats.totalEtudiants}</p>
              </div>
              
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                borderRadius: '12px',
                border: '1px solid #BBF7D0'
              }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '12px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  marginBottom: '12px'
                }}>
                  <DollarSign style={{color: '#059669'}} size={24} />
                </div>
                <h4 style={{fontWeight: '600', color: '#166534', marginBottom: '4px'}}>Efficacité Collecte</h4>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#16A34A'}}>{collectionRate}%</p>
                <p style={{fontSize: '12px', color: '#15803D'}}>de l'objectif atteint</p>
              </div>
              
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                borderRadius: '12px',
                border: '1px solid #FCD34D'
              }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '12px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.2)',
                  marginBottom: '12px'
                }}>
                  <AlertTriangle style={{color: '#D97706'}} size={24} />
                </div>
                <h4 style={{fontWeight: '600', color: '#92400E', marginBottom: '4px'}}>Retards de Paiement</h4>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#D97706'}}>{stats.paiementsExpires}</p>
                <p style={{fontSize: '12px', color: '#A16207'}}>étudiants en retard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModalNotificationEtudiant />
      <ModalFinance />
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  // Fonction pour calculer les pourcentages
  function calculatePercentage(value, total) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
};

export default Dashboardmanager;