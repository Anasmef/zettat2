// ============================================
// PAGE PROFESSEUR - AjouterRapport.jsx
// ============================================
import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Save, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  User,
  Shield,
  MessageSquare,
  Loader
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/SidebarProf';

const AjouterRapport = () => {
  const [cours, setCours] = useState([]);
  const [selectedCours, setSelectedCours] = useState('');
  const [etudiants, setEtudiants] = useState([]);
  const [selectedEtudiant, setSelectedEtudiant] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    natureProbleme: [],
    autreProbleme: '',
    descriptionIncident: '',
    mesurePrise: [],
    autreMesure: '',
    observationProfesseur: ''
  });

  const navigate = useNavigate();

  const naturesProbleme = [
    'Devoirs non faits',
    'Indiscipline en classe',
    'Bavardage excessif',
    "Refus d'obéir",
    'Violence verbale / physique',
    'Retard ou absence répétée',
    'Autre'
  ];

  const mesuresPrises = [
    'Observation / remarque orale',
    'Avertissement écrit',
    'Élève exclu temporairement du cours',
    'Communication avec les parents',
    'Autre'
  ];

  // ✅ Charger les cours au montage
  useEffect(() => {
    const fetchCours = async () => {
      try {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        if (!token || role !== 'prof') {
          navigate('/');
          return;
        }

        // ✅ تبديل الراوت
        const res = await axios.get('/api/professeur/mes-cours', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });

        console.log('✅ Cours chargés:', res.data); // للديباغ
        setCours(res.data);
      } catch (error) {
        console.error('❌ Erreur chargement cours:', error);
        setMessage('error');
      }
    };

    fetchCours();
  }, [navigate]);

  // ✅ Charger les étudiants quand un cours est sélectionné
  useEffect(() => {
    if (!selectedCours) {
      setEtudiants([]);
      return;
    }

    const fetchEtudiants = async () => {
      setIsLoadingStudents(true);
      setMessage('');
      
      try {
        const token = localStorage.getItem('token');
        
        // ✅ جلب كاع الإيتوديان ومن بعد فيلتري
        const res = await axios.get('/api/professeur/etudiants', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });

        // ✅ فيلتري الإيتوديان حسب الكورس
        const filtered = res.data.filter(et => et.cours.includes(selectedCours));
        console.log('✅ Étudiants filtrés:', filtered); // للديباغ
        
        setEtudiants(filtered);
        setIsLoadingStudents(false);
      } catch (error) {
        console.error('❌ Erreur chargement étudiants:', error);
        setIsLoadingStudents(false);
        setMessage('error_students');
      }
    };

    fetchEtudiants();
  }, [selectedCours]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => {
      const currentArray = prev[field];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return { ...prev, [field]: newArray };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || isLoadingStudents) return;

    const token = localStorage.getItem('token');

    // Validation
    if (!selectedCours || !selectedEtudiant) {
      setMessage('error_selection');
      return;
    }

    if (formData.natureProbleme.length === 0) {
      setMessage('error_nature');
      return;
    }

    if (!formData.descriptionIncident.trim()) {
      setMessage('error_description');
      return;
    }

    if (formData.mesurePrise.length === 0) {
      setMessage('error_mesure');
      return;
    }

    setIsSubmitting(true);
    setMessage('loading');

    try {
      const dataToSend = {
        etudiant: selectedEtudiant,
        cours: selectedCours,
        ...formData
      };

      await axios.post('/api/rapports/professeur/rapports', dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000
      });

      setMessage('success');
      setTimeout(() => {
        navigate('/professeur/mes-rapports');
      }, 2000);
      
    } catch (err) {
      console.error('Erreur:', err);
      
      if (err.response?.status === 403) {
        setMessage('unauthorized');
      } else if (err.code === 'ECONNABORTED') {
        setMessage('timeout');
      } else {
        setMessage('error');
      }
      
      setIsSubmitting(false);
    }
  };

  return (
    <div style={s.container}>
      <Sidebar onLogout={handleLogout} />

      <div style={s.header}>
        <div style={s.headerContent}>
          <h1 style={s.title}>Créer un Rapport Disciplinaire</h1>
        </div>
      </div>

      <div style={s.mainContent}>
        <form onSubmit={handleSubmit} style={s.formCard}>
          {/* Section 1: Sélection Cours et Étudiant */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <BookOpen style={s.sectionIcon} />
              <h2 style={s.sectionTitle}>1. Sélection du Cours et de l'Étudiant</h2>
            </div>
            
            <div style={s.formGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>
                  <BookOpen style={s.labelIcon} />
                  Sélectionner un cours *
                </label>
                <select 
                  style={s.select} 
                  value={selectedCours} 
                  onChange={(e) => {
                    setSelectedCours(e.target.value);
                    setSelectedEtudiant('');
                  }}
                  required
                  disabled={isLoadingStudents || isSubmitting}
                >
                  <option value="">Choisir un cours...</option>
                  {cours.map(c => (
                    <option key={c._id} value={c.nom}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>
                  <User style={s.labelIcon} />
                  Sélectionner un étudiant *
                </label>
                <select 
                  style={s.select} 
                  value={selectedEtudiant} 
                  onChange={(e) => setSelectedEtudiant(e.target.value)}
                  required
                  disabled={!selectedCours || isLoadingStudents || isSubmitting}
                >
                  <option value="">
                    {isLoadingStudents ? 'Chargement...' : 'Choisir un étudiant...'}
                  </option>
                  {etudiants.map(et => (
                    <option key={et._id} value={et._id}>
                      {et.nomComplet} - {et.niveau}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Nature du Problème */}
          {selectedCours && selectedEtudiant && (
            <>
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <AlertTriangle style={s.sectionIcon} />
                  <h2 style={s.sectionTitle}>2. Nature du Problème *</h2>
                </div>

                <div style={s.checkboxGrid}>
                  {naturesProbleme.map(nature => (
                    <label key={nature} style={s.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.natureProbleme.includes(nature)}
                        onChange={() => handleCheckboxChange('natureProbleme', nature)}
                        style={s.checkbox}
                        disabled={isSubmitting}
                      />
                      <span style={s.checkboxText}>{nature}</span>
                    </label>
                  ))}
                </div>

                {formData.natureProbleme.includes('Autre') && (
                  <div style={s.formGroup}>
                    <label style={s.label}>Préciser autre problème</label>
                    <input
                      type="text"
                      style={s.input}
                      value={formData.autreProbleme}
                      onChange={(e) => setFormData({...formData, autreProbleme: e.target.value})}
                      placeholder="Décrivez le problème..."
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>

              {/* Section 3: Description de l'Incident */}
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <FileText style={s.sectionIcon} />
                  <h2 style={s.sectionTitle}>3. Description de l'Incident *</h2>
                </div>

                <div style={s.formGroup}>
                  <textarea
                    style={s.textarea}
                    value={formData.descriptionIncident}
                    onChange={(e) => setFormData({...formData, descriptionIncident: e.target.value})}
                    placeholder="Décrivez en détail l'incident, le contexte, ce qui s'est passé..."
                    rows="6"
                    required
                    disabled={isSubmitting}
                  />
                  <div style={s.charCount}>
                    {formData.descriptionIncident.length} caractères
                  </div>
                </div>
              </div>

              {/* Section 4: Mesures Prises */}
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <Shield style={s.sectionIcon} />
                  <h2 style={s.sectionTitle}>4. Mesures Prises *</h2>
                </div>

                <div style={s.checkboxGrid}>
                  {mesuresPrises.map(mesure => (
                    <label key={mesure} style={s.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.mesurePrise.includes(mesure)}
                        onChange={() => handleCheckboxChange('mesurePrise', mesure)}
                        style={s.checkbox}
                        disabled={isSubmitting}
                      />
                      <span style={s.checkboxText}>{mesure}</span>
                    </label>
                  ))}
                </div>

                {formData.mesurePrise.includes('Autre') && (
                  <div style={s.formGroup}>
                    <label style={s.label}>Préciser autre mesure</label>
                    <input
                      type="text"
                      style={s.input}
                      value={formData.autreMesure}
                      onChange={(e) => setFormData({...formData, autreMesure: e.target.value})}
                      placeholder="Décrivez la mesure prise..."
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>

              {/* Section 5: Observations */}
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <MessageSquare style={s.sectionIcon} />
                  <h2 style={s.sectionTitle}>5. Observations du Professeur (Facultatif)</h2>
                </div>

                <div style={s.formGroup}>
                  <textarea
                    style={s.textarea}
                    value={formData.observationProfesseur}
                    onChange={(e) => setFormData({...formData, observationProfesseur: e.target.value})}
                    placeholder="Ajoutez vos observations, recommandations ou contexte supplémentaire..."
                    rows="4"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Bouton Submit */}
              <div style={s.submitContainer}>
                <button
                  type="submit"
                  style={{
                    ...s.submitButton,
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader style={{...s.buttonIcon, animation: 'spin 1s linear infinite'}} />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Save style={s.buttonIcon} />
                      Envoyer le Rapport
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Messages */}
          {message && (
            <div style={{
              ...s.messageContainer,
              backgroundColor: 
                message === 'success' ? '#dcfce7' : 
                message === 'loading' ? '#eff6ff' : 
                '#fee2e2',
              borderColor: 
                message === 'success' ? '#16a34a' : 
                message === 'loading' ? '#3b82f6' : 
                '#dc2626',
              color: 
                message === 'success' ? '#166534' : 
                message === 'loading' ? '#1e40af' : 
                '#991b1b'
            }}>
              {message === 'success' && (
                <>
                  <CheckCircle style={s.messageIcon} />
                  <div>
                    <strong>✓ Succès!</strong>
                    <div style={{fontSize: '14px', marginTop: '4px'}}>
                      Rapport envoyé avec succès à l'administration.
                    </div>
                  </div>
                </>
              )}
              {message === 'loading' && (
                <>
                  <Loader style={{...s.messageIcon, animation: 'spin 1s linear infinite'}} />
                  Envoi en cours...
                </>
              )}
              {message === 'error_selection' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Veuillez sélectionner un cours et un étudiant.
                </>
              )}
              {message === 'error_nature' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Veuillez sélectionner au moins une nature de problème.
                </>
              )}
              {message === 'error_description' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Veuillez décrire l'incident.
                </>
              )}
              {message === 'error_mesure' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Veuillez sélectionner au moins une mesure prise.
                </>
              )}
              {message === 'error_students' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Erreur de chargement des étudiants.
                </>
              )}
              {message === 'unauthorized' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Vous n'êtes pas autorisé pour ce cours.
                </>
              )}
              {message === 'timeout' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Connexion lente, réessayez.
                </>
              )}
              {message === 'error' && (
                <>
                  <XCircle style={s.messageIcon} />
                  Une erreur est survenue.
                </>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

const s = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
    padding: '20px',
    textAlign: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  mainContent: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px'
  },
  formCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    padding: '32px'
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '32px',
    borderBottom: '2px solid #f3f4f6'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  sectionIcon: {
    width: '24px',
    height: '24px',
    color: '#dc2626'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
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
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 0.2s'
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px'
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  checkboxText: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500'
  },
  submitContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '32px'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
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

export default AjouterRapport;