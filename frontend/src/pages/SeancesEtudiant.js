import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Book, Clock, User, Download, MapPin } from 'lucide-react';
import SidebarEtudiant from '../components/sidebaretudiant';

const SeancesEtudiant = () => {
  const [seances, setSeances] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  
  // Nouveaux créneaux horaires mis à jour
  const creneaux = [
    { debut: '08:45', fin: '10:45', label: '8h45 - 10h45' },
    { debut: '11:00', fin: '13:00', label: '11h00 - 13h00' },
    { debut: '14:00', fin: '16:00', label: '14h00 - 16h00' }
  ];

  // Fonction pour obtenir les dates de la semaine
  const getWeekDates = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      weekDates.push(currentDate);
    }
    return weekDates;
  };

  const weekDates = getWeekDates(currentWeek);
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  useEffect(() => {
    const fetchSeances = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setMessage({ type: 'error', text: "Token d'authentification manquant" });
          setLoading(false);
          return;
        }

        const res = await fetch('http://localhost:5000/api/seances/etudiant', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setSeances(data);
        } else {
          setMessage({ type: 'error', text: 'Erreur lors du chargement des séances' });
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des séances', err);
        setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
      } finally {
        setLoading(false);
      }
    };

    fetchSeances();
  }, []);

  // Organiser les séances par jour et créneau
  const organiserSeances = () => {
    const emploi = {};
    
    seances.forEach(seance => {
      const key = `${seance.jour}-${seance.heureDebut}-${seance.heureFin}`;
      emploi[key] = seance;
    });
    
    return emploi;
  };

  const emploiOrganise = organiserSeances();

  // Navigation des semaines
  const changeWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };

  // Télécharger l'emploi du temps en CSV
  const downloadSchedule = () => {
    let csvContent = '';
    csvContent += `Emploi du Temps - Semaine du ${formatDate(weekDates[0])} au ${formatDate(weekDates[5])}\n\n`;
    
    // En-tête du tableau
    csvContent += 'Horaires;';
    jours.forEach((jour, index) => {
      csvContent += `${jour} (${formatDate(weekDates[index])});`;
    });
    csvContent += '\n';

    // Données du tableau
    creneaux.forEach(creneau => {
      csvContent += `${creneau.label};`;
      
      jours.forEach(jour => {
        const key = `${jour}-${creneau.debut}-${creneau.fin}`;
        const seance = emploiOrganise[key];
        
        if (seance) {
          const coursInfo = seance.cours || 'Cours';
          const matiereInfo = seance.matiere ? ` (${seance.matiere})` : '';
          const salleInfo = seance.salle ? ` - Salle: ${seance.salle}` : '';
          const profInfo = seance.professeur?.nom || 'Professeur';
          csvContent += `"${coursInfo}${matiereInfo}${salleInfo} - ${profInfo}";`;
        } else {
          csvContent += '";';
        }
      });
      csvContent += '\n';
    });

    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mon_emploi_du_temps_${formatDate(weekDates[0]).replace('/', '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: 'Emploi du temps téléchargé avec succès !' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Obtenir les statistiques
  const getStats = () => {
    const coursUniques = [...new Set(seances.map(s => s.cours).filter(Boolean))];
    const profsUniques = [...new Set(seances.map(s => s.professeur?.nom).filter(Boolean))];
    const matieresUniques = [...new Set(seances.map(s => s.matiere).filter(Boolean))];
    const sallesUniques = [...new Set(seances.map(s => s.salle).filter(Boolean))];
    
    return {
      totalSeances: seances.length,
      totalCours: coursUniques.length,
      totalProfs: profsUniques.length,
      totalMatieres: matieresUniques.length,
      totalSalles: sallesUniques.length
    };
  };

  const stats = getStats();

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
    },
    content: {
      flexGrow: 1,
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      textAlign: 'center'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    },
    statCard: {
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#3b82f6'
    },
    statLabel: {
      fontSize: '0.9rem',
      color: '#6b7280',
      marginTop: '5px'
    },
    controls: {
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    weekNavigation: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '20px'
    },
    weekButton: {
      padding: '8px 12px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      transition: 'all 0.2s'
    },
    weekInfo: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151'
    },
    downloadButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      backgroundColor: '#f59e0b',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      margin: '0 auto',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    tableContainer: {
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    tableTitle: {
      backgroundColor: '#f8fafc',
      padding: '15px',
      fontSize: '18px',
      fontWeight: '600',
      color: '#374151',
      borderBottom: '2px solid #e5e7eb'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    },
    headerCell: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '15px 8px',
      textAlign: 'center',
      fontWeight: '600',
      border: '1px solid #2563eb'
    },
    timeCell: {
      backgroundColor: '#f8fafc',
      padding: '15px 10px',
      textAlign: 'center',
      fontWeight: '600',
      color: '#374151',
      border: '1px solid #e5e7eb',
      minWidth: '120px'
    },
    cell: {
      border: '1px solid #e5e7eb',
      padding: '8px',
      verticalAlign: 'top',
      height: '120px',
      width: 'calc(100% / 7)',
      position: 'relative'
    },
    seanceCard: {
      backgroundColor: '#dbeafe',
      borderRadius: '4px',
      padding: '8px',
      fontSize: '11px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    coursName: {
      fontWeight: '600',
      color: '#1e40af',
      marginBottom: '3px',
      fontSize: '12px'
    },
    matiereName: {
      fontWeight: '500',
      color: '#7c3aed',
      marginBottom: '3px',
      fontSize: '10px'
    },
    salleName: {
      fontWeight: '500',
      color: '#059669',
      marginBottom: '3px',
      fontSize: '10px'
    },
    profName: {
      color: '#374151',
      fontSize: '10px'
    },
    message: {
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '20px',
      textAlign: 'center'
    },
    successMessage: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      border: '1px solid #bbf7d0'
    },
    errorMessage: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca'
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '16px',
      color: '#6b7280'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: '#6b7280'
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <SidebarEtudiant onLogout={handleLogout} />
        <div style={styles.content}>
          <div style={styles.loading}>
            <div>Chargement de votre emploi du temps...</div>
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              Récupération de vos séances depuis la base de données
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <SidebarEtudiant onLogout={handleLogout} />
      
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1f2937' }}>
            <Calendar size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
            Mon Emploi du Temps
          </h1>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
            Nouveaux créneaux: 8h45-10h45 | 11h00-13h00 | 14h00-16h00
          </div>
        </div>

        {/* Statistiques */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalSeances}</div>
            <div style={styles.statLabel}>
              <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              Séances totales
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalCours}</div>
            <div style={styles.statLabel}>
              <Book size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              Cours différents
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalProfs}</div>
            <div style={styles.statLabel}>
              <User size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              Professeurs
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalMatieres}</div>
            <div style={styles.statLabel}>
              <Book size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              Matières
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalSalles}</div>
            <div style={styles.statLabel}>
              <MapPin size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              Salles
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div style={styles.controls}>
          {/* Navigation des semaines */}
          <div style={styles.weekNavigation}>
            <button 
              style={styles.weekButton} 
              onClick={() => changeWeek(-1)}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              <ChevronLeft size={16} />
              Semaine précédente
            </button>
            <div style={styles.weekInfo}>
              Semaine du {formatDate(weekDates[0])} au {formatDate(weekDates[5])}
            </div>
            <button 
              style={styles.weekButton} 
              onClick={() => changeWeek(1)}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Semaine suivante
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Bouton de téléchargement */}
          <button 
            style={styles.downloadButton}
            onClick={downloadSchedule}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#d97706';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#f59e0b';
              e.target.style.transform = 'translateY(0px)';
            }}
          >
            <Download size={18} />
            Télécharger mon emploi du temps
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            ...styles.message,
            ...(message.type === 'error' ? styles.errorMessage : styles.successMessage)
          }}>
            {message.text}
          </div>
        )}

        {/* Tableau de l'emploi du temps */}
        {seances.length > 0 ? (
          <div style={styles.tableContainer}>
            <div style={styles.tableTitle}>
              Emploi du Temps - Semaine du {formatDate(weekDates[0])} au {formatDate(weekDates[5])}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.headerCell}>Horaires</th>
                    {jours.map((jour, index) => (
                      <th key={jour} style={styles.headerCell}>
                        {jour}<br />
                        <small>{formatDate(weekDates[index])}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {creneaux.map(creneau => (
                    <tr key={`${creneau.debut}-${creneau.fin}`}>
                      <td style={styles.timeCell}>
                        {creneau.label}
                      </td>
                      {jours.map(jour => {
                        const key = `${jour}-${creneau.debut}-${creneau.fin}`;
                        const seance = emploiOrganise[key];
                        
                        return (
                          <td key={jour} style={styles.cell}>
                            {seance ? (
                              <div style={styles.seanceCard}>
                                <div>
                                  <div style={styles.coursName}>
                                    {seance.cours || 'Cours'}
                                  </div>
                                  {seance.matiere && (
                                    <div style={styles.matiereName}>
                                      {seance.matiere}
                                    </div>
                                  )}
                                  {seance.salle && (
                                    <div style={styles.salleName}>
                                      Salle: {seance.salle}
                                    </div>
                                  )}
                                </div>
                                <div style={styles.profName}>
                                  Prof: {seance.professeur?.nom || 'Professeur'}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>Aucune séance programmée</div>
            <div>Votre emploi du temps sera affiché ici une fois que vos cours seront programmés.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeancesEtudiant;