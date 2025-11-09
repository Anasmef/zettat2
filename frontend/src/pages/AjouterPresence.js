import React, { useEffect, useState, useCallback } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Save, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Clock,
  Sun,
  Moon,
  UserCheck,
  Loader
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/SidebarProf';
import ModalMessageProf from '../components/ModalMessageProf';

const AjouterPresence = () => {
  const [cours, setCours] = useState([]);
  const [selectedCours, setSelectedCours] = useState('');
  const [dateSession, setDateSession] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedHoraire, setSelectedHoraire] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [periode, setPeriode] = useState('matin');
  const [presences, setPresences] = useState([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(true); // true = s'affiche automatiquement

  const navigate = useNavigate();

  // Charger les cours au montage
  useEffect(() => {
    const fetchCours = async () => {
      try {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        if (!token || role !== 'prof') {
          navigate('/');
          return;
        }

        const res = await axios.get('/api/professeur/mes-cours', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });

        setCours(res.data);
      } catch (error) {
        console.error('❌ Erreur chargement cours:', error);
        setMessage('error');
      }
    };

    fetchCours();
  }, [navigate]);

  // Configuration responsive
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }

    const styles = document.createElement('style');
    styles.textContent = `
      * { box-sizing: border-box !important; }
      html, body { overflow-x: hidden !important; width: 100% !important; }
      
      /* Affichage par défaut - Desktop */
      .desktop-view { display: block !important; }
      .mobile-view { display: none !important; }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .form-select:focus, .form-input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        outline: none !important;
      }
      
      @media (max-width: 968px) {
        .config-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
      }
      
      @media (max-width: 768px) {
        /* Cacher desktop, afficher mobile */
        .desktop-view { display: none !important; }
        .mobile-view { display: block !important; }
        
        .main-content { padding: 12px !important; }
        .form-content { padding: 16px !important; }
        .card-header { padding: 16px 20px !important; }
        .card-title-text { font-size: 17px !important; }
        .config-grid { gap: 12px !important; }
        .left-column, .right-column { padding: 16px !important; }
      }
      
      @media (max-width: 480px) {
        /* Forcer mobile view sur petits écrans */
        .desktop-view { display: none !important; }
        .mobile-view { display: block !important; }
        
        .main-content { padding: 8px !important; }
        .form-content { padding: 12px !important; }
        .title { font-size: 20px !important; }
        .submit-button { width: 100% !important; font-size: 15px !important; }
      }
    `;
    document.head.appendChild(styles);
    
    return () => {
      if (document.head.contains(styles)) {
        document.head.removeChild(styles);
      }
    };
  }, []);

  // Mettre à jour l'horaire automatiquement
  useEffect(() => {
    if (selectedHoraire === 'matin') {
      setHeureDebut('08:45');
      setHeureFin('13:00');
      setPeriode('matin');
    } else if (selectedHoraire === 'apresmidi') {
      setHeureDebut('14:00');
      setHeureFin('16:00');
      setPeriode('soir');
    } else {
      setHeureDebut('');
      setHeureFin('');
    }
  }, [selectedHoraire]);

  // Vérifier si tous les champs sont remplis
  const areAllFieldsFilled = useCallback(() => {
    return Boolean(selectedCours && dateSession && heureDebut && heureFin);
  }, [selectedCours, dateSession, heureDebut, heureFin]);

  // Charger les étudiants avec debounce (optimisation mobile)
  useEffect(() => {
    if (!areAllFieldsFilled()) {
      setPresences([]);
      setIsLoadingStudents(false);
      return;
    }

    setIsLoadingStudents(true);
    setMessage('');

    // Debounce: attendre 800ms avant de charger
    const timeoutId = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        
        const res = await axios.get('/api/professeur/etudiants', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000 // 15 secondes pour connexion lente
        });

        const filtered = res.data.filter(et => et.cours.includes(selectedCours));
        const initialPresences = filtered.map(et => ({
          etudiant: et._id,
          nom: et.nomComplet,
          present: true,
          remarque: '',
          retardMinutes: 0
        }));
        
        setPresences(initialPresences);
        setIsLoadingStudents(false);
      } catch (error) {
        console.error('Erreur chargement étudiants:', error);
        setIsLoadingStudents(false);
        if (error.code === 'ECONNABORTED') {
          setMessage('timeout');
        } else {
          setMessage('error');
        }
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [selectedCours, dateSession, heureDebut, heureFin, areAllFieldsFilled]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const handleCoursChange = (e) => {
    setSelectedCours(e.target.value);
    setMessage('');
    setPresences([]);
  };

  const handlePresenceChange = (index, field, value) => {
    const updated = [...presences];
    updated[index][field] = value;
    setPresences(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || isLoadingStudents) return;

    const token = localStorage.getItem('token');

    if (!selectedCours || !dateSession || !heureDebut || !heureFin) {
      setMessage('error');
      return;
    }

    if (heureFin <= heureDebut) {
      setMessage('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('loading');

    const heure = `${heureDebut}-${heureFin}`;

    try {
      const promises = presences.map(pres => {
        const dataToSend = {
          etudiant: pres.etudiant,
          cours: selectedCours,
          dateSession,
          present: pres.present,
          remarque: pres.remarque,
          retardMinutes: Number(pres.retardMinutes) || 0,
          heure,
          periode
        };

        return axios.post('/api/presences', dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000
        });
      });

      await Promise.all(promises);
      
      setMessage('success');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err) {
      console.error('Erreur:', err);
      
      if (err.response?.status === 409) {
        setMessage('duplicate');
      } else if (err.response?.status === 403) {
        setMessage('unauthorized');
      } else if (err.code === 'ECONNABORTED') {
        setMessage('timeout');
      } else {
        setMessage('error');
      }
      
      setIsSubmitting(false);
    }
  };

  const formatTimeToAMPM = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getPeriodeIcon = () => {
    if (!heureDebut) return <Clock style={s.labelIcon} />;
    const hour = parseInt(heureDebut.split(':')[0]);
    return hour < 12 ? <Sun style={s.labelIcon} /> : <Moon style={s.labelIcon} />;
  };

  const getPeriodeText = () => {
    if (!heureDebut) return '';
    const hour = parseInt(heureDebut.split(':')[0]);
    return hour < 12 ? 'Matin' : 'Soir';
  };

  return (
    <div style={s.container}>
      <Sidebar onLogout={handleLogout} />

      <div style={s.header}>
        <div style={s.headerContent}>
          <div style={s.titleSection}>
            <h1 style={s.title}>Enregistrement de Présence</h1>
          </div>
        </div>
      </div>

      <div style={s.mainContent} className="main-content">
        <div style={s.formCard}>
          <div style={s.cardHeader} className="card-header">
            <div style={s.cardTitle}>
              <BookOpen style={s.cardIcon} />
              <h2 style={s.cardTitleText} className="card-title-text">Configuration de la session</h2>
            </div>
          </div>

          <div style={s.formContent} className="form-content">
            <div style={s.configurationGrid} className="config-grid">
              {/* Colonne gauche */}
              <div style={s.leftColumn} className="left-column">
                <div style={s.columnHeader}>
                  <BookOpen style={s.columnIcon} />
                  <h3 style={s.columnTitle}>Informations du classe</h3>
                </div>
                
                <div style={s.formGroup}>
                  <label style={s.label}>
                    <BookOpen style={s.labelIcon} />
                    Sélectionner un classe
                  </label>
                  <select 
                    style={s.select} 
                    value={selectedCours} 
                    onChange={handleCoursChange} 
                    required
                    className="form-select"
                    disabled={isLoadingStudents}
                  >
                    <option value="">Choisir un classe...</option>
                    {cours.map(c => (
                      <option key={c._id} value={c.nom}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>
                    <Calendar style={s.labelIcon} />
                    Date de session
                  </label>
                  <input 
                    type="date" 
                    style={s.input}
                    value={dateSession} 
                    onChange={e => setDateSession(e.target.value)} 
                    required 
                    className="form-input"
                    disabled={isLoadingStudents}
                  />
                </div>
              </div>

              {/* Colonne droite */}
              <div style={s.rightColumn} className="right-column">
                <div style={s.columnHeader}>
                  <Clock style={s.columnIcon} />
                  <h3 style={s.columnTitle}>Horaire de session</h3>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>
                    <Clock style={s.labelIcon} />
                    Sélectionner l'horaire
                  </label>
                  <select
                    style={s.select}
                    value={selectedHoraire}
                    onChange={e => setSelectedHoraire(e.target.value)}
                    required
                    className="form-select"
                    disabled={isLoadingStudents}
                  >
                    <option value="">Choisir un horaire...</option>
                    <option value="matin">08:45 AM à 13:00 PM</option>
                    <option value="apresmidi">14:00 PM à 16:00 PM</option>
                  </select>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>
                    <Clock style={s.labelIcon} />
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={heureDebut}
                    readOnly
                    style={s.input}
                    required
                    className="form-input"
                  />
                  {heureDebut && (
                    <div style={s.timeDisplay}>
                      <span style={s.timeDisplayText}>
                        {formatTimeToAMPM(heureDebut)}
                      </span>
                    </div>
                  )}
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>
                    <Clock style={s.labelIcon} />
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={heureFin}
                    readOnly
                    style={s.input}
                    required
                    className="form-input"
                  />
                  {heureFin && (
                    <div style={s.timeDisplay}>
                      <span style={s.timeDisplayText}>
                        {formatTimeToAMPM(heureFin)}
                      </span>
                    </div>
                  )}
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>
                    {getPeriodeIcon()}
                    Période (automatique)
                  </label>
                  <div style={s.periodeDisplay}>
                    {heureDebut ? (
                      <div style={{
                        ...s.periodeTag,
                        backgroundColor: periode === 'matin' ? '#dbeafe' : '#fef3c7',
                        color: periode === 'matin' ? '#1e40af' : '#d97706',
                        borderColor: periode === 'matin' ? '#93c5fd' : '#fcd34d'
                      }}>
                        {periode === 'matin' ? 
                          <Sun style={s.periodeIcon} /> : 
                          <Moon style={s.periodeIcon} />
                        }
                        {getPeriodeText()}
                      </div>
                    ) : (
                      <div style={{...s.periodeTag, backgroundColor: '#f3f4f6', color: '#6b7280', borderColor: '#d1d5db'}}>
                        <Clock style={s.periodeIcon} />
                        Sélectionnez une heure
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Message instruction */}
            {!areAllFieldsFilled() && !isLoadingStudents && (
              <div style={s.instructionMessage}>
                <div style={s.instructionContent}>
                  <Clock style={s.instructionIcon} />
                  <div>
                    <h4 style={s.instructionTitle}>Complétez la configuration</h4>
                    <p style={s.instructionText}>
                      Veuillez remplir tous les champs ci-dessus pour voir la liste des étudiants.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Message chargement */}
            {isLoadingStudents && (
              <div style={s.loadingMessage}>
                <div style={s.loadingContent}>
                  <div style={s.spinner} />
                  <div>
                    <h4 style={s.loadingTitle}>Chargement en cours...</h4>
                    <p style={s.loadingText}>
                      Récupération de la liste des étudiants, veuillez patienter.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Liste des étudiants */}
            {areAllFieldsFilled() && !isLoadingStudents && presences.length > 0 && (
              <div style={s.presenceSection}>
                <div style={s.presenceHeader}>
                  <h3 style={s.presenceTitle}>
                    <Users style={s.presenceIcon} />
                    Liste des étudiants ({presences.length})
                  </h3>
                </div>

                {/* Desktop */}
                <div className="desktop-view">
                  <div style={s.tableContainer}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.tableHeader}>
                          <th style={s.th}>Étudiant</th>
                          <th style={s.th}>Statut</th>
                          <th style={s.th}>Retard (min)</th>
                          <th style={s.th}>Remarque</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presences.map((p, i) => (
                          <tr key={p.etudiant} style={s.tableRow}>
                            <td style={s.td}>
                              <div style={s.studentInfo}>
                                <div style={s.avatar}>
                                  <span style={s.avatarText}>
                                    {p.nom.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div style={s.studentName}>{p.nom}</div>
                              </div>
                            </td>
                            <td style={s.td}>
                              <select 
                                style={{
                                  ...s.statusSelect,
                                  backgroundColor: p.present ? '#dcfce7' : '#fee2e2',
                                  color: p.present ? '#166534' : '#991b1b',
                                  borderColor: p.present ? '#bbf7d0' : '#fecaca'
                                }}
                                value={p.present} 
                                onChange={(e) => handlePresenceChange(i, 'present', e.target.value === 'true')}
                              >
                                <option value="true">✓ Présent</option>
                                <option value="false">✗ Absent</option>
                              </select>
                            </td>
                            <td style={s.td}>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                style={{
                                  ...s.retardInput,
                                  opacity: p.present ? 1 : 0.5
                                }}
                                value={p.retardMinutes}
                                onChange={(e) => handlePresenceChange(i, 'retardMinutes', parseInt(e.target.value) || 0)}
                                disabled={!p.present}
                                placeholder="0"
                              />
                            </td>
                            <td style={s.td}>
                              <div style={s.remarqueContainer}>
                                <MessageSquare style={s.remarqueIcon} />
                                <input 
                                  type="text" 
                                  style={s.remarqueInput}
                                  value={p.remarque} 
                                  onChange={(e) => handlePresenceChange(i, 'remarque', e.target.value)}
                                  placeholder="Remarque..."
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile */}
                <div className="mobile-view">
                  {presences.map((p, i) => (
                    <div key={p.etudiant} style={s.mobileCard}>
                      <div style={s.mobileCardHeader}>
                        <div style={s.mobileAvatar}>
                          <span style={s.mobileAvatarText}>
                            {p.nom.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div style={s.mobileStudentName}>{p.nom}</div>
                      </div>

                      <div style={s.mobileCardContent}>
                        <div style={s.mobileField}>
                          <label style={s.mobileLabel}>
                            <UserCheck style={s.mobileLabelIcon} />
                            Statut
                          </label>
                          <select
                            style={{
                              ...s.mobileSelect,
                              backgroundColor: p.present ? '#dcfce7' : '#fee2e2',
                              color: p.present ? '#166534' : '#991b1b',
                              borderColor: p.present ? '#bbf7d0' : '#fecaca'
                            }}
                            value={p.present}
                            onChange={(e) => handlePresenceChange(i, 'present', e.target.value === 'true')}
                          >
                            <option value="true">✓ Présent</option>
                            <option value="false">✗ Absent</option>
                          </select>
                        </div>

                        <div style={s.mobileField}>
                          <label style={s.mobileLabel}>
                            <Clock style={s.mobileLabelIcon} />
                            Retard (min)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            style={{
                              ...s.mobileInput,
                              opacity: p.present ? 1 : 0.5
                            }}
                            value={p.retardMinutes}
                            onChange={(e) => handlePresenceChange(i, 'retardMinutes', parseInt(e.target.value) || 0)}
                            disabled={!p.present}
                            placeholder="0"
                          />
                        </div>

                        <div style={s.mobileField}>
                          <label style={s.mobileLabel}>
                            <MessageSquare style={s.mobileLabelIcon} />
                            Remarque
                          </label>
                          <input
                            type="text"
                            style={s.mobileInput}
                            value={p.remarque}
                            onChange={(e) => handlePresenceChange(i, 'remarque', e.target.value)}
                            placeholder="Remarque..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={s.submitContainer}>
                  <button
                    type="button"
                    style={{
                      ...s.submitButton,
                      opacity: (isSubmitting || isLoadingStudents) ? 0.6 : 1,
                      cursor: (isSubmitting || isLoadingStudents) ? 'not-allowed' : 'pointer',
                      background: (isSubmitting || isLoadingStudents)
                        ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                        : 'linear-gradient(135deg, #3b82f6, #4f46e5)'
                    }}
                    onClick={handleSubmit}
                    disabled={isSubmitting || isLoadingStudents}
                    className="submit-button"
                  >
                    {isSubmitting ? (
                      <>
                        <div style={s.spinner} />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save style={s.buttonIcon} />
                        Enregistrer la présence
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {message && (
              <div style={{
                ...s.messageContainer,
                backgroundColor: 
                  message === 'success' ? '#dcfce7' : 
                  message === 'loading' ? '#eff6ff' : 
                  message === 'duplicate' ? '#fef3c7' :
                  message === 'unauthorized' ? '#fed7e2' :
                  message === 'timeout' ? '#fef3c7' :
                  '#fee2e2',
                borderColor: 
                  message === 'success' ? '#16a34a' : 
                  message === 'loading' ? '#3b82f6' : 
                  message === 'duplicate' ? '#d97706' :
                  message === 'unauthorized' ? '#e53e3e' :
                  message === 'timeout' ? '#d97706' :
                  '#dc2626',
                color: 
                  message === 'success' ? '#166534' : 
                  message === 'loading' ? '#1e40af' : 
                  message === 'duplicate' ? '#92400e' :
                  message === 'unauthorized' ? '#9b2c2c' :
                  message === 'timeout' ? '#92400e' :
                  '#991b1b'
              }}>
                {message === 'success' ? (
                  <>
                    <CheckCircle style={s.messageIcon} />
                    <div>
                      <strong>✓ Succès!</strong>
                      <div style={{fontSize: '14px', marginTop: '4px'}}>
                        Présence enregistrée avec succès.
                      </div>
                    </div>
                  </>
                ) : message === 'loading' ? (
                  <>
                    <div style={s.spinner} />
                    Enregistrement en cours...
                  </>
                ) : message === 'duplicate' ? (
                  <>
                    <XCircle style={s.messageIcon} />
                    <div>
                      <strong>⚠️ Session déjà enregistrée</strong>
                      <div style={{fontSize: '14px', marginTop: '4px'}}>
                        Cette séance existe déjà dans le système.
                      </div>
                    </div>
                  </>
                ) : message === 'unauthorized' ? (
                  <>
                    <XCircle style={s.messageIcon} />
                    <div>
                      <strong>🔒 Accès refusé</strong>
                      <div style={{fontSize: '14px', marginTop: '4px'}}>
                        Vous n'êtes pas autorisé pour ce cours.
                      </div>
                    </div>
                  </>
                ) : message === 'timeout' ? (
                  <>
                    <XCircle style={s.messageIcon} />
                    <div>
                      <strong>⏱️ Connexion lente</strong>
                      <div style={{fontSize: '14px', marginTop: '4px'}}>
                        Vérifiez votre connexion Internet et réessayez.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle style={s.messageIcon} />
                    Erreur: Vérifiez tous les champs.
                  </>
                )}
              </div>
            )}
   
          </div>
        </div>
      </div>
         <ModalMessageProf 
      isOpen={showInfoModal} 
      onClose={() => setShowInfoModal(false)} 
    />
    </div>
  );
};

const s = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    width: '100%',
    overflowX: 'hidden'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(229, 231, 235, 0.6)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px'
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 0'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1f2937, #374151)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  mainContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px'
  },
  formCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '24px 32px',
    borderBottom: '1px solid #e5e7eb'
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cardIcon: {
    width: '20px',
    height: '20px',
    color: '#1f2937'
  },
  cardTitleText: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  formContent: {
    padding: '28px'
  },
  configurationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '20px'
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    borderRadius: '12px',
    border: '1px solid rgba(229, 231, 235, 0.6)'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    background: 'linear-gradient(135deg, #fefcbf, #fef3c7)',
    borderRadius: '12px',
    border: '1px solid rgba(217, 119, 6, 0.2)'
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  },
  columnIcon: {
    width: '18px',
    height: '18px',
    color: '#4338ca'
  },
  columnTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  labelIcon: {
    width: '16px',
    height: '16px',
    color: '#3b82f6'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  timeDisplay: {
    marginTop: '8px',
    padding: '8px 12px',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '6px',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  timeDisplayText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e40af'
  },
  periodeDisplay: {
    display: 'flex',
    alignItems: 'center'
  },
  periodeTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid',
    fontSize: '16px',
    fontWeight: '500'
  },
  periodeIcon: {
    width: '18px',
    height: '18px'
  },
  instructionMessage: {
    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    border: '2px solid #93c5fd',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px'
  },
  instructionContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  instructionIcon: {
    width: '24px',
    height: '24px',
    color: '#3b82f6',
    flexShrink: 0
  },
  instructionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    margin: '0 0 8px 0'
  },
  instructionText: {
    fontSize: '14px',
    color: '#1e3a8a',
    margin: 0,
    lineHeight: '1.5'
  },
  loadingMessage: {
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px'
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  loadingTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    margin: '0 0 8px 0'
  },
  loadingText: {
    fontSize: '14px',
    color: '#78350f',
    margin: 0,
    lineHeight: '1.5'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(59, 130, 246, 0.3)',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0
  },
  presenceSection: {
    marginTop: '24px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px'
  },
  presenceHeader: {
    marginBottom: '16px'
  },
  presenceTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  presenceIcon: {
    width: '20px',
    height: '20px',
    color: '#3b82f6'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff'
  },
  tableHeader: {
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'uppercase',
    borderBottom: '2px solid #e5e7eb'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '14px 16px',
    verticalAlign: 'middle'
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  avatarText: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600'
  },
  studentName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1f2937'
  },
  statusSelect: {
    padding: '8px 14px',
    border: '2px solid',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '110px'
  },
  retardInput: {
    width: '80px',
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center',
    outline: 'none'
  },
  remarqueContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '250px'
  },
  remarqueIcon: {
    width: '16px',
    height: '16px',
    color: '#9ca3af',
    flexShrink: 0
  },
  remarqueInput: {
    flex: 1,
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none'
  },
  mobileCard: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e5e7eb',
    marginBottom: '16px',
    overflow: 'hidden'
  },
  mobileCardHeader: {
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #e5e7eb'
  },
  mobileAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mobileAvatarText: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '600'
  },
  mobileStudentName: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1f2937'
  },
  mobileCardContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  mobileField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  mobileLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151'
  },
  mobileLabelIcon: {
    width: '16px',
    height: '16px',
    color: '#3b82f6'
  },
  mobileSelect: {
    padding: '11px 14px',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer'
  },
  mobileInput: {
    padding: '11px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none'
  },
  submitContainer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '20px'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  },
  buttonIcon: {
    width: '20px',
    height: '20px'
  },
  messageContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid',
    marginTop: '20px',
    fontSize: '15px',
    fontWeight: '500'
  },
  messageIcon: {
    width: '20px',
    height: '20px',
    flexShrink: 0,
    marginTop: '2px'
  }
};

export default AjouterPresence;