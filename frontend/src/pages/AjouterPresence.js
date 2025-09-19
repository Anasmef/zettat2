import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Save, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Clock,
  GraduationCap,
  Sun,
  Moon,
  UserCheck,
  UserX
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/SidebarProf'; // Composant sidebar pour professeur

const AjouterPresence = () => {
  const [cours, setCours] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [selectedCours, setSelectedCours] = useState('');
  const [dateSession, setDateSession] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [periode, setPeriode] = useState('matin');
  const [presences, setPresences] = useState([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCours = async () => {
      try {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        // 🔒 التحقق من الصلاحيات
        if (!token || role !== 'prof') {
          navigate('/');
          return;
        }

        const res = await axios.get('http://localhost:5000/api/professeur/mes-cours', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCours(res.data);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des cours:', error);
      }
    };

    fetchCours();
  }, []);

  // Move the CSS class addition useEffect inside the component
  useEffect(() => {
    // Add viewport meta tag for mobile responsiveness
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (!existingViewport) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(viewport);
    }
    
    const configGrid = document.querySelector('[data-config-grid]');
    if (configGrid) {
      configGrid.classList.add('configuration-grid');
    }
    
    const leftCol = document.querySelector('[data-left-column]');
    if (leftCol) {
      leftCol.classList.add('left-column');
    }
    
    const rightCol = document.querySelector('[data-right-column]');  
    if (rightCol) {
      rightCol.classList.add('right-column');
    }
  }, []);

  // Ajouter les styles CSS
  useEffect(() => {
    const additionalStyles = `
      .form-select:focus, .form-input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      }
      
      .table-row:hover {
        background-color: #f8fafc !important;
      }
      
      .remarque-input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      }
      
      /* Animation de rotation pour l'icône de chargement */
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Style pour bouton désactivé */
      button:disabled {
        pointer-events: none;
      }
      
      /* Mobile-first responsive design */
      html, body {
        overflow-x: hidden !important;
        width: 100% !important;
      }
      
      * {
        box-sizing: border-box !important;
      }
      
      /* Responsive Design */
      @media (max-width: 968px) {
        .configuration-grid {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
        }
        
        .left-column, .right-column {
          padding: 20px !important;
        }
      }
      
      @media (max-width: 768px) {
        .main-content {
          padding: 16px !important;
        }
        
        .form-content {
          padding: 20px !important;
        }
        
        .configuration-grid {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
          margin-bottom: 16px !important;
        }
        
        .left-column {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9) !important;
          margin-bottom: 0 !important;
        }
        
        .right-column {
          background: linear-gradient(135deg, #fefcbf, #fef3c7) !important;
        }
        
        .title {
          font-size: 24px !important;
        }
        
        .table-container {
          font-size: 14px !important;
          overflow-x: auto !important;
        }
        
        .th, .td {
          padding: 12px 8px !important;
        }
        
        .remarque-container {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 6px !important;
        }
        
        .submit-button {
          width: 100% !important;
          justify-content: center !important;
        }
        
        .student-info {
          flex-direction: column !important;
          align-items: center !important;
          text-align: center !important;
          gap: 8px !important;
        }
        
        .student-name {
          font-size: 14px !important;
        }
        
        .avatar {
          width: 35px !important;
          height: 35px !important;
        }
        
        .avatar-text {
          font-size: 14px !important;
        }
        
        .status-select {
          min-width: 100px !important;
          font-size: 13px !important;
          padding: 6px 12px !important;
        }
        
        .form-group {
          margin-bottom: 16px !important;
        }
        
        .card-header {
          padding: 20px 24px !important;
        }
        
        .card-title-text {
          font-size: 18px !important;
        }
      }
      
      @media (max-width: 480px) {
        .main-content {
          padding: 8px !important;
          margin: 0 !important;
        }
        
        .form-content {
          padding: 16px !important;
        }
        
        .left-column, .right-column {
          padding: 16px !important;
          gap: 16px !important;
          margin: 0 !important;
        }
        
        .header-content {
          padding: 0 16px !important;
        }
        
        .title {
          font-size: 20px !important;
          text-align: center !important;
        }
        
        .title-section {
          flex-direction: column !important;
          gap: 8px !important;
          padding: 16px 0 !important;
        }
        
        .card-header {
          padding: 16px 20px !important;
        }
        
        .table-container {
          border-radius: 8px !important;
          margin: 0 -8px !important;
          width: calc(100% + 16px) !important;
        }
        
        .submit-container {
          padding-top: 16px !important;
          margin: 0 -8px !important;
        }
        
        .submit-button {
          padding: 14px 24px !important;
          font-size: 15px !important;
          width: calc(100% + 16px) !important;
          margin: 0 8px !important;
          border-radius: 8px !important;
        }
        
        /* Table mobile styling */
        .table {
          min-width: 100% !important;
          display: block !important;
          overflow-x: auto !important;
          white-space: nowrap !important;
        }
        
        .table thead {
          display: none !important;
        }
        
        .table tbody {
          display: block !important;
        }
        
        .table-row {
          display: block !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          margin-bottom: 12px !important;
          padding: 12px !important;
          background: #ffffff !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }
        
        .table-row td {
          display: block !important;
          padding: 8px 0 !important;
          border: none !important;
          text-align: left !important;
          position: relative !important;
          padding-left: 50% !important;
        }
        
        .table-row td:before {
          content: attr(data-label) !important;
          position: absolute !important;
          left: 0 !important;
          width: 45% !important;
          padding-right: 10px !important;
          white-space: nowrap !important;
          font-weight: 600 !important;
          color: #4b5563 !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
        }
        
        .student-info {
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 8px !important;
        }
        
        .student-name {
          font-size: 14px !important;
          text-align: left !important;
        }
        
        .status-select {
          width: 100% !important;
          max-width: 150px !important;
        }
        
        .remarque-container {
          flex-direction: row !important;
          align-items: center !important;
          gap: 8px !important;
        }
        
        .remarque-input {
          width: 100% !important;
          max-width: 200px !important;
        }
        
        /* Form responsive */
        .configuration-grid {
          grid-template-columns: 1fr !important;
          gap: 12px !important;
        }
        
        .form-group {
          margin-bottom: 12px !important;
        }
        
        .label {
          font-size: 13px !important;
        }
        
        .input, .select {
          font-size: 14px !important;
          padding: 10px 12px !important;
        }
        
        .time-display {
          margin-top: 6px !important;
          padding: 6px 10px !important;
        }
        
        .periode-tag {
          padding: 10px 12px !important;
          font-size: 14px !important;
        }
        
        .instruction-message {
          margin: 16px -8px !important;
          padding: 16px !important;
        }
        
        .instruction-title {
          font-size: 15px !important;
        }
        
        .instruction-text {
          font-size: 13px !important;
        }
        
        .presence-section {
          margin: 20px -8px 0 -8px !important;
          padding: 16px 8px 0 8px !important;
        }
        
        .presence-title {
          font-size: 16px !important;
        }
        
        .message-container {
          margin: 16px -8px 0 -8px !important;
          padding: 12px 16px !important;
          font-size: 14px !important;
        }
      }
      
      /* Extra small phones */
      @media (max-width: 360px) {
        .main-content {
          padding: 4px !important;
        }
        
        .form-content {
          padding: 12px !important;
        }
        
        .left-column, .right-column {
          padding: 12px !important;
        }
        
        .title {
          font-size: 18px !important;
        }
        
        .card-title-text {
          font-size: 16px !important;
        }
        
        .table-container {
          margin: 0 -4px !important;
          width: calc(100% + 8px) !important;
        }
        
        .table-row {
          padding: 10px !important;
          margin-bottom: 10px !important;
        }
        
        .table-row td {
          padding: 6px 0 !important;
          padding-left: 45% !important;
        }
        
        .table-row td:before {
          width: 40% !important;
          font-size: 11px !important;
        }
        
        .student-name {
          font-size: 13px !important;
        }
        
        .avatar {
          width: 30px !important;
          height: 30px !important;
        }
        
        .avatar-text {
          font-size: 12px !important;
        }
        
        .status-select {
          font-size: 12px !important;
          padding: 5px 8px !important;
        }
        
        .remarque-input {
          font-size: 12px !important;
          padding: 6px 8px !important;
        }
        
        .submit-button {
          font-size: 14px !important;
          padding: 12px 20px !important;
        }
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = additionalStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      // Cleanup
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  // تحديث الفترة تلقائياً عند تغيير وقت البداية
  useEffect(() => {
    if (heureDebut) {
      const hour = parseInt(heureDebut.split(':')[0]);
      setPeriode(hour < 12 ? 'matin' : 'soir');
    }
  }, [heureDebut]);

  // 🆕 Fonction pour vérifier si tous les champs requis sont remplis
  const areAllFieldsFilled = () => {
    return selectedCours && dateSession && heureDebut && heureFin;
  };

  // 🆕 useEffect pour charger les étudiants uniquement quand tous les champs sont remplis
  useEffect(() => {
    const loadStudents = async () => {
      if (!areAllFieldsFilled()) {
        setPresences([]);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        
        const res = await axios.get('http://localhost:5000/api/professeur/etudiants', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Filtrer par le cours sélectionné
        const filtered = res.data.filter(et => et.cours.includes(selectedCours));

        const initialPresences = filtered.map(et => ({
          etudiant: et._id,
          nom: et.nomComplet,
          present: true,
          remarque: '',
          retardMinutes: 0
        }));
        setPresences(initialPresences);
      } catch (error) {
        console.error('Erreur lors du chargement des étudiants:', error);
        setMessage('error');
      }
    };

    loadStudents();
  }, [selectedCours, dateSession, heureDebut, heureFin]); // 🆕 Déclencher quand un de ces champs change

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // 🔄 Fonction simplifiée pour la sélection du cours
  const handleCoursChange = (e) => {
    setSelectedCours(e.target.value);
    setMessage(''); // Reset message
  };

  const handlePresenceChange = (index, field, value) => {
    const updated = [...presences];
    updated[index][field] = value;
    setPresences(updated);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (isSubmitting) return;

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

  // 🔍 DEBUGGING - Vérifiez l'état des présences avant envoi
  console.log('=== DEBUGGING RETARDS ===');
  presences.forEach((pres, index) => {
    if (pres.retardMinutes > 0) {
      console.log(`Étudiant ${index}: ${pres.nom}`, {
        present: pres.present,
        retardMinutes: pres.retardMinutes,
        type: typeof pres.retardMinutes
      });
    }
  });

  try {
    const promises = presences.map((pres, index) => {
      const dataToSend = {
        etudiant: pres.etudiant,
        cours: selectedCours,
        dateSession,
        present: pres.present,
        remarque: pres.remarque,
        retardMinutes: Number(pres.retardMinutes) || 0, // Conversion explicite
        heure,
        periode
      };

      // 🔍 DEBUGGING - Log chaque donnée envoyée
      if (pres.retardMinutes > 0) {
        console.log(`Envoi pour ${pres.nom}:`, dataToSend);
      }

      return axios.post('http://localhost:5000/api/presences', dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
    });

    const results = await Promise.all(promises);
    
    // 🔍 DEBUGGING - Vérifiez les réponses
    results.forEach((result, index) => {
      if (result.data.retardMinutes > 0) {
        console.log(`Réponse pour ${presences[index].nom}:`, {
          retardMinutes: result.data.retardMinutes,
          present: result.data.present
        });
      }
    });

    setMessage('success');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (err) {
    console.error('Erreur:', err);
    setMessage('error');
    setIsSubmitting(false);
  }
};
  // Fonction pour convertir l'heure en format 12h avec AM/PM
  const formatTimeToAMPM = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Fonction pour obtenir le texte de la période
  const getPeriodeText = () => {
    if (!heureDebut) return '';
    const hour = parseInt(heureDebut.split(':')[0]);
    return hour < 12 ? 'Matin' : 'Soir';
  };

  // Fonction pour obtenir l'icône selon la période
  const getPeriodeIcon = () => {
    if (!heureDebut) return <Clock style={styles.labelIcon} />;
    const hour = parseInt(heureDebut.split(':')[0]);
    return hour < 12 ? <Sun style={styles.labelIcon} /> : <Moon style={styles.labelIcon} />;
  };

  return (
    <div style={styles.container}>
      {/* Header moderne */}
      <Sidebar onLogout={handleLogout} />

      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <div style={styles.iconContainer}>
            </div>
            <h1 style={styles.title}>Enregistrement de Présence</h1>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={styles.mainContent}>
        <div style={styles.formCard}>
          {/* En-tête de la carte */}
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <BookOpen style={styles.cardIcon} />
              <h2 style={styles.cardTitleText}>Configuration de la session</h2>
            </div>
          </div>

          {/* Formulaire */}
          <div style={styles.formContent}>
            {/* Configuration en deux colonnes */}
            <div style={styles.configurationGrid} data-config-grid>
              {/* Colonne gauche */}
              <div style={styles.leftColumn} data-left-column>
                {/* En-tête colonne gauche */}
                <div style={styles.columnHeader}>
                  <BookOpen style={styles.columnIcon} />
                  <h3 style={styles.columnTitle}>Informations du classe</h3>
                </div>
                
                {/* Sélection du cours */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <BookOpen style={styles.labelIcon} />
                    Sélectionner un classe
                  </label>
                  <select 
                    style={styles.select} 
                    value={selectedCours} 
                    onChange={handleCoursChange} 
                    required
                    className="form-select"
                  >
                    <option value="">Choisir un classe...</option>
                    {cours.map(c => (
                      <option key={c._id} value={c.nom}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Date de session */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <Calendar style={styles.labelIcon} />
                    Date de session
                  </label>
                  <input 
                    type="date" 
                    style={styles.input}
                    value={dateSession} 
                    onChange={e => setDateSession(e.target.value)} 
                    required 
                    className="form-input"
                  />
                </div>
              </div>

              {/* Colonne droite */}
              <div style={styles.rightColumn} data-right-column>
                {/* En-tête colonne droite */}
                <div style={styles.columnHeader}>
                  <Clock style={styles.columnIcon} />
                  <h3 style={styles.columnTitle}>Horaire de session</h3>
                </div>
                
                {/* Heure de début */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <Clock style={styles.labelIcon} />
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    style={styles.input}
                    required
                    className="form-input"
                  />
                  {/* Affichage automatique AM/PM */}
                  {heureDebut && (
                    <div style={styles.timeDisplay}>
                      <span style={styles.timeDisplayText}>
                        {formatTimeToAMPM(heureDebut)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Heure de fin */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <Clock style={styles.labelIcon} />
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    style={styles.input}
                    required
                    className="form-input"
                  />
                  {/* Affichage automatique AM/PM */}
                  {heureFin && (
                    <div style={styles.timeDisplay}>
                      <span style={styles.timeDisplayText}>
                        {formatTimeToAMPM(heureFin)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Période (automatique) */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {getPeriodeIcon()}
                    Période (automatique)
                  </label>
                  <div style={styles.periodeDisplay}>
                    {heureDebut ? (
                      <div style={{
                        ...styles.periodeTag,
                        backgroundColor: periode === 'matin' ? '#dbeafe' : '#fef3c7',
                        color: periode === 'matin' ? '#1e40af' : '#d97706',
                        borderColor: periode === 'matin' ? '#93c5fd' : '#fcd34d'
                      }}>
                        {periode === 'matin' ? 
                          <Sun style={styles.periodeIcon} /> : 
                          <Moon style={styles.periodeIcon} />
                        }
                        {getPeriodeText()}
                      </div>
                    ) : (
                      <div style={{...styles.periodeTag, backgroundColor: '#f3f4f6', color: '#6b7280', borderColor: '#d1d5db'}}>
                        <Clock style={styles.periodeIcon} />
                        Sélectionnez une heure
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 🆕 Message d'instruction si tous les champs ne sont pas remplis */}
            {!areAllFieldsFilled() && (
              <div style={styles.instructionMessage}>
                <div style={styles.instructionContent}>
                  <Clock style={styles.instructionIcon} />
                  <div>
                    <h4 style={styles.instructionTitle}>Complétez la configuration</h4>
                    <p style={styles.instructionText}>
                      Veuillez remplir tous les champs ci-dessus pour voir la liste des étudiants et enregistrer la présence.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Liste des présences - 🆕 Affichée seulement si tous les champs sont remplis */}
            {areAllFieldsFilled() && presences.length > 0 && (
              <>
                {/* Section des étudiants */}
                <div style={styles.presenceSection}>
                  <div style={styles.presenceHeader}>
                    <h3 style={styles.presenceTitle}>
                      <Users style={styles.presenceIcon} />
                      Liste des étudiants ({presences.length})
                    </h3>
                  </div>

                  {/* Desktop/Tablet Table View */}
                  <div className="desktop-view" style={styles.desktopView}>
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeader}>
                            <th style={styles.th}>Étudiant</th>
                            <th style={styles.th}>Statut</th>
                            <th style={styles.th}>Retard (min)</th>
                            <th style={styles.th}>Remarque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presences.map((p, i) => (
                            <tr key={p.etudiant} style={styles.tableRow} className="table-row">
                              <td style={styles.td}>
                                <div style={styles.studentInfo}>
                                  <div style={styles.avatar}>
                                    <span style={styles.avatarText}>
                                      {p.nom.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div style={styles.studentName}>{p.nom}</div>
                                </div>
                              </td>
                              <td style={styles.td}>
                                <select 
                                  style={{
                                    ...styles.statusSelect,
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
                              <td style={styles.td}>
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  style={{
                                    ...styles.retardInput,
                                    opacity: p.present ? 1 : 0.5
                                  }}
                                  value={p.retardMinutes}
                                  onChange={(e) => handlePresenceChange(i, 'retardMinutes', parseInt(e.target.value) || 0)}
                                  disabled={!p.present}
                                  placeholder="0"
                                />
                              </td>
                              <td style={styles.td}>
                                <div style={styles.remarqueContainer}>
                                  <MessageSquare style={styles.remarqueIcon} />
                                  <input 
                                    type="text" 
                                    style={styles.remarqueInput}
                                    value={p.remarque} 
                                    onChange={(e) => handlePresenceChange(i, 'remarque', e.target.value)}
                                    placeholder="Ajouter une remarque..."
                                    className="remarque-input"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="mobile-view" style={styles.mobileView}>
                    <div style={styles.mobileCardsContainer}>
                      {presences.map((p, i) => (
                        <div key={p.etudiant} style={styles.mobileStudentCard}>
                          {/* En-tête de la carte avec info étudiant */}
                          <div style={styles.mobileCardHeader}>
                            <div style={styles.mobileStudentInfo}>
                              <div style={styles.mobileAvatar}>
                                <span style={styles.mobileAvatarText}>
                                  {p.nom.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div style={styles.mobileStudentName}>{p.nom}</div>
                            </div>
                          </div>

                          {/* Contenu de la carte */}
                          <div style={styles.mobileCardContent}>
                            {/* Statut */}
                            <div style={styles.mobileField}>
                              <label style={styles.mobileFieldLabel}>
                                <UserCheck style={styles.mobileFieldIcon} />
                                Statut de présence
                              </label>
                              <select
                                style={{
                                  ...styles.mobileStatusSelect,
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

                            {/* Retard */}
                            <div style={styles.mobileField}>
                              <label style={styles.mobileFieldLabel}>
                                <Clock style={styles.mobileFieldIcon} />
                                Retard (minutes)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                style={{
                                  ...styles.mobileRetardInput,
                                  opacity: p.present ? 1 : 0.5
                                }}
                                value={p.retardMinutes}
                                onChange={(e) => handlePresenceChange(i, 'retardMinutes', parseInt(e.target.value) || 0)}
                                disabled={!p.present}
                                placeholder="0"
                              />
                            </div>

                            {/* Remarque */}
                            <div style={styles.mobileField}>
                              <label style={styles.mobileFieldLabel}>
                                <MessageSquare style={styles.mobileFieldIcon} />
                                Remarque
                              </label>
                              <input
                                type="text"
                                style={styles.mobileRemarqueInput}
                                value={p.remarque}
                                onChange={(e) => handlePresenceChange(i, 'remarque', e.target.value)}
                                placeholder="Ajouter une remarque..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bouton de soumission */}
                  <div style={styles.submitContainer}>
                    <button
                      type="submit"
                      style={{
                        ...styles.submitButton,
                        opacity: isSubmitting ? 0.6 : 1,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        background: isSubmitting
                          ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                          : 'linear-gradient(135deg, #3b82f6, #4f46e5)'
                      }}
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="submit-button"
                    >
                      {isSubmitting ? (
                        <>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid #ffffff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Enregistrement en cours...
                        </>
                      ) : (
                        <>
                          <Save style={styles.buttonIcon} />
                          Enregistrer la présence
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Message de statut */}
            {message && (
              <div style={{
                ...styles.messageContainer,
                backgroundColor: message === 'success' ? '#dcfce7' : 
                                message === 'loading' ? '#eff6ff' : '#fee2e2',
                borderColor: message === 'success' ? '#16a34a' : 
                           message === 'loading' ? '#3b82f6' : '#dc2626',
                color: message === 'success' ? '#166534' : 
                      message === 'loading' ? '#1e40af' : '#991b1b'
              }}>
                {message === 'success' ? (
                  <>
                    <CheckCircle style={styles.messageIcon} />
                    Présence enregistrée avec succès ! Redirection en cours...
                  </>
                ) : message === 'loading' ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid #3b82f6',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Enregistrement en cours, veuillez patienter...
                  </>
                ) : (
                  <>
                    <XCircle style={styles.messageIcon} />
                    Erreur: Veuillez vérifier tous les champs requis et que l'heure de fin soit après l'heure de début.
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    width: '100%',
    overflow: 'hidden'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.9)',
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
    padding: '0 24px'
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px 0'
  },
 
 
  title: {
    fontSize: '32px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1f2937, #374151)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0'
  },
  mainContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '24px'
  },
  formCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '24px 32px'
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cardIcon: {
    width: '20px',
    height: '20px',
    color: 'black'
  },
  cardTitleText: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'black',
    margin: '0'
  },
  formContent: {
    padding: '32px'
  },
  configurationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    marginBottom: '24px'
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '24px',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    borderRadius: '16px',
    border: '1px solid rgba(229, 231, 235, 0.6)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    position: 'relative'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '24px',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    borderRadius: '16px',
    border: '1px solid rgba(217, 119, 6, 0.2)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    position: 'relative'
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    paddingBottom: '12px',
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
    margin: '0'
  },
  formGroup: {
    marginBottom: '24px'
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
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '8px',
    border: '2px solid #93c5fd',
    fontSize: '16px',
    fontWeight: '500'
  },
  periodeIcon: {
    width: '18px',
    height: '18px'
  },
  // 🆕 Styles pour le message d'instruction
  instructionMessage: {
    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    border: '2px solid #93c5fd',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px'
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
    marginTop: '2px',
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
    margin: '0',
    lineHeight: '1.5'
  },
  presenceSection: {
    marginTop: '32px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px'
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
    margin: '0'
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
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    marginBottom: '24px'
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
    padding: '16px 20px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e5e7eb'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s ease'
  },
  td: {
    padding: '16px 20px',
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
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
  },
  avatarText: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600'
  },
  studentName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1f2937'
  },
  statusSelect: {
    padding: '8px 16px',
    border: '2px solid',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '120px'
  },
  retardInput: {
    width: '80px',
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center',
    outline: 'none',
    transition: 'all 0.2s ease'
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
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  submitContainer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '24px'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
  },
  buttonIcon: {
    width: '20px',
    height: '20px'
  },
  messageContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid',
    marginTop: '24px',
    fontSize: '16px',
    fontWeight: '500'
  },
  messageIcon: {
    width: '20px',
    height: '20px'
  },
  // Ajout des nouveaux styles pour mobile
  desktopView: {
    display: 'block'
  },
  mobileView: {
    display: 'none'
  },
  mobileCardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  mobileStudentCard: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease'
  },
  mobileCardHeader: {
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb'
  },
  mobileStudentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  mobileAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
  },
  mobileAvatarText: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '600'
  },
  mobileStudentName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937'
  },
  mobileCardContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  mobileField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  mobileFieldLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  mobileFieldIcon: {
    width: '16px',
    height: '16px',
    color: '#3b82f6'
  },
  mobileStatusSelect: {
    padding: '12px 16px',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  mobileRetardInput: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    textAlign: 'center',
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  mobileRemarqueInput: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s ease'
  }
};

export default AjouterPresence;