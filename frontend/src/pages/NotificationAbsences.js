import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, AlertCircle, Filter, Phone, Users, Calendar, Clock, AlertTriangle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './AdminDashboard.css';

export default function NotificationAbsences() {
  const [absencesNonNotifiees, setAbsencesNonNotifiees] = useState([]);
  const [selectedAbsences, setSelectedAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtres, setFiltres] = useState({
    dateDebut: '',
    dateFin: '',
    cours: '',
    periode: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    absents: 0,
    retards: 0,
    contactsDisponibles: 0
  });

  useEffect(() => {
    chargerAbsences();
  }, [filtres]);

  const chargerAbsences = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filtres.dateDebut) params.append('dateDebut', filtres.dateDebut);
      if (filtres.dateFin) params.append('dateFin', filtres.dateFin);
      if (filtres.cours) params.append('cours', filtres.cours);
      if (filtres.periode) params.append('periode', filtres.periode);

      const response = await fetch(`/api/presences/non-notifiees?${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const absences = Array.isArray(data) ? data : [];
      setAbsencesNonNotifiees(absences);
      
      // Calculer les stats
      const statsCalculees = {
        total: absences.length,
        absents: absences.filter(a => !a.present).length,
        retards: absences.filter(a => a.retardMinutes > 0).length,
        contactsDisponibles: absences.filter(a => 
          a.contactsDisponibles?.etudiant || 
          a.contactsDisponibles?.mere || 
          a.contactsDisponibles?.pere
        ).length
      };
      setStats(statsCalculees);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      setError('Erreur lors du chargement des absences');
      setAbsencesNonNotifiees([]);
    }
  };

  const toggleSelection = (id) => {
    setSelectedAbsences(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedAbsences.length === absencesNonNotifiees.length) {
      setSelectedAbsences([]);
    } else {
      setSelectedAbsences(absencesNonNotifiees.map(a => a._id));
    }
  };

  const envoyerNotifications = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/presences/envoyer-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ presenceIds: selectedAbsences })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`✅ ${result.notifications.length} notifications envoyées avec succès!`);
        setSelectedAbsences([]);
        setShowConfirm(false);
        setTimeout(() => {
          chargerAbsences();
          setSuccess('');
        }, 3000);
      } else {
        setError('❌ Erreur lors de l\'envoi des notifications');
      }
    } catch (error) {
      setError('❌ Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const compterContacts = (absence) => {
    if (!absence.contactsDisponibles) return 0;
    const contacts = absence.contactsDisponibles;
    let count = 0;
    if (contacts.etudiant) count++;
    if (contacts.mere) count++;
    if (contacts.pere) count++;
    return count;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-card-content">
        <div className="stat-card-info">
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value">{value || 0}</p>
          {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
        </div>
        <div className="stat-card-icon">
          <Icon />
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard" style={{
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)'
    }}>
      <Sidebar onLogout={handleLogout} />
      <Header />

      <div className="dashboard-container">
        <div className="dashboard-content">
          {/* En-tête */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: '8px'
            }}>
              📱 Notifications d'Absences WhatsApp
            </h1>
            <p style={{ color: '#6B7280' }}>
              Sélectionnez les absences et envoyez les notifications aux étudiants et parents
            </p>
          </div>

          {/* Statistiques */}
          <div className="stats-grid">
            <StatCard
              title="Total Absences"
              value={stats.total}
              icon={AlertTriangle}
              colorClass="blue"
              subtitle="Non notifiées"
            />
            <StatCard
              title="Absents"
              value={stats.absents}
              icon={XCircle}
              colorClass="red"
              subtitle="Sans présence"
            />
            <StatCard
              title="Retards"
              value={stats.retards}
              icon={Clock}
              colorClass="yellow"
              subtitle="Arrivés en retard"
            />
            <StatCard
              title="Contacts Disponibles"
              value={stats.contactsDisponibles}
              icon={Phone}
              colorClass="green"
              subtitle="Avec numéro WhatsApp"
            />
          </div>

          {/* Messages de succès/erreur */}
          {success && (
            <div style={{
              background: '#D1FAE5',
              border: '1px solid #10B981',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              color: '#065F46',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              color: '#991B1B',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Filtres */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Filter size={20} style={{ color: '#3B82F6' }} />
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Filtres</h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <input
                type="date"
                value={filtres.dateDebut}
                onChange={(e) => setFiltres({...filtres, dateDebut: e.target.value})}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '14px'
                }}
                placeholder="Date début"
              />
              <input
                type="date"
                value={filtres.dateFin}
                onChange={(e) => setFiltres({...filtres, dateFin: e.target.value})}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '14px'
                }}
                placeholder="Date fin"
              />
              <input
                type="text"
                value={filtres.cours}
                onChange={(e) => setFiltres({...filtres, cours: e.target.value})}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '14px'
                }}
                placeholder="Cours"
              />
              <select
                value={filtres.periode}
                onChange={(e) => setFiltres({...filtres, periode: e.target.value})}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '14px'
                }}
              >
                <option value="">Toutes périodes</option>
                <option value="matin">Matin</option>
                <option value="soir">Soir</option>
              </select>
            </div>
          </div>

          {/* Liste des absences */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
                  Absences non notifiées ({absencesNonNotifiees.length})
                </h2>
                {selectedAbsences.length > 0 && (
                  <span style={{
                    background: '#DBEAFE',
                    color: '#1E40AF',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {selectedAbsences.length} sélectionnée(s)
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={toggleAll}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {selectedAbsences.length === absencesNonNotifiees.length 
                    ? 'Tout désélectionner' 
                    : 'Tout sélectionner'}
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={selectedAbsences.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: selectedAbsences.length === 0 ? '#D1D5DB' : '#10B981',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: selectedAbsences.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <Send size={16} />
                  Envoyer les notifications
                </button>
              </div>
            </div>

            {absencesNonNotifiees.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#6B7280'
              }}>
                <CheckCircle size={64} style={{ margin: '0 auto 16px', color: '#10B981' }} />
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>Aucune absence à notifier</p>
                <p style={{ fontSize: '14px' }}>Toutes les absences ont été notifiées</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {absencesNonNotifiees.map((absence) => (
                  <div
                    key={absence._id}
                    onClick={() => toggleSelection(absence._id)}
                    style={{
                      border: selectedAbsences.includes(absence._id) 
                        ? '2px solid #3B82F6' 
                        : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'pointer',
                      background: selectedAbsences.includes(absence._id) ? '#EFF6FF' : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                      <input
                        type="checkbox"
                        checked={selectedAbsences.includes(absence._id)}
                        onChange={() => toggleSelection(absence._id)}
                        style={{ marginTop: '4px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          marginBottom: '12px'
                        }}>
                          <div>
                            <h3 style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                              {absence.etudiant?.nom} {absence.etudiant?.prenom}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#6B7280' }}>
                              {absence.cours} - {absence.matiere}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '14px', color: '#6B7280' }}>
                              {new Date(absence.dateSession).toLocaleDateString('fr-FR')}
                            </p>
                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                              {absence.periode} - {absence.heure}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            background: absence.retardMinutes > 0 ? '#FEF3C7' : '#FEE2E2',
                            color: absence.retardMinutes > 0 ? '#92400E' : '#991B1B',
                            fontWeight: '500'
                          }}>
                            {absence.retardMinutes > 0 
                              ? `Retard: ${absence.retardMinutes} min` 
                              : 'Absent'}
                          </span>
                          <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={14} />
                            {compterContacts(absence)} contact(s)
                          </span>
                          {absence.remarque && (
                            <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                              {absence.remarque}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal de confirmation */}
          {showConfirm && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '450px',
                width: '90%',
                margin: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <AlertCircle size={32} style={{ color: '#F59E0B' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '600' }}>Confirmer l'envoi</h3>
                </div>
                <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                  Vous allez envoyer <strong>{selectedAbsences.length}</strong> notification(s) WhatsApp 
                  aux étudiants et parents concernés. Voulez-vous continuer ?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={envoyerNotifications}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: loading ? '#D1D5DB' : '#10B981',
                      color: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {loading ? 'Envoi en cours...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}