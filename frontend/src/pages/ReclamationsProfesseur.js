import React, { useState, useEffect } from 'react';
import { User, AlertTriangle, BookOpen, Search, Filter, Plus, Calendar, FileText, X, Clock, CheckCircle } from 'lucide-react';

const ReclamationProfesseur = () => {
  const [coursDisponibles, setCours] = useState([]);
  const [coursSelectionne, setCoursSelectionne] = useState('');
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsFiltres, setEtudiantsFiltres] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReclamationModal, setShowReclamationModal] = useState(false);
  const [etudiantSelectionne, setEtudiantSelectionne] = useState(null);
  const [formData, setFormData] = useState({
    typeReclamation: '',
    description: '',
    priorite: 'Moyenne'
  });

  const typesReclamation = [
    'Étudiant absent',
    'Mauvais comportement',
    'Étudiant qui dort',
    'Retards répétés',
    'Non respect des règles',
    'Problème de discipline',
    'Travail non rendu',
    'Autre'
  ];

  const priorites = ['Faible', 'Moyenne', 'Élevée', 'Urgente'];

  useEffect(() => {
    fetchCoursDisponibles();
  }, []);

  useEffect(() => {
    if (coursSelectionne) {
      fetchEtudiants();
    }
  }, [coursSelectionne]);

  useEffect(() => {
    filtrerEtudiants();
  }, [etudiants, recherche]);

  const fetchCoursDisponibles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/professeur/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCours(data.cours || []);
    } catch (err) {
      console.error('Erreur lors du chargement des cours:', err);
    }
  };

  const fetchEtudiants = async () => {
    if (!coursSelectionne) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/professeur/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des étudiants');
      }
      
      const data = await response.json();
      
      // Vérifier que data est un tableau
      if (Array.isArray(data)) {
        // Filtrer les étudiants autorisés pour le cours sélectionné
        const etudiantsAutorises = data.filter(e => 
          e.autorise && e.cours && e.cours.includes(coursSelectionne)
        );
        setEtudiants(etudiantsAutorises);
      } else {
        console.error('Les données reçues ne sont pas un tableau:', data);
        setEtudiants([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des étudiants:', err);
      setEtudiants([]);
    } finally {
      setLoading(false);
    }
  };

  const filtrerEtudiants = () => {
    let resultats = etudiants;
    
    if (recherche) {
      resultats = resultats.filter(e =>
        (e.nomComplet && e.nomComplet.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.email && e.email.toLowerCase().includes(recherche.toLowerCase()))
      );
    }
    
    setEtudiantsFiltres(resultats);
  };

  const handleOpenReclamation = (etudiant) => {
    setEtudiantSelectionne(etudiant);
    setFormData({
      typeReclamation: '',
      description: '',
      priorite: 'Moyenne'
    });
    setShowReclamationModal(true);
  };

  const handleCloseModal = () => {
    setShowReclamationModal(false);
    setEtudiantSelectionne(null);
    setFormData({
      typeReclamation: '',
      description: '',
      priorite: 'Moyenne'
    });
  };

  const handleSubmitReclamation = async (e) => {
    e.preventDefault();
    
    if (!formData.typeReclamation || !formData.description.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const reclamationData = {
        etudiantId: etudiantSelectionne._id,
        typeReclamation: formData.typeReclamation,
        cours: coursSelectionne,
        dateIncident: new Date().toISOString().split('T')[0],
        priorite: formData.priorite,
        description: formData.description
      };

      const response = await fetch('/api/professeur/reclamations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reclamationData)
      });

      if (response.ok) {
        alert('Réclamation créée avec succès !');
        handleCloseModal();
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.message);
      }
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      alert('Erreur lors de la création de la réclamation');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
    },

    header: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
    },

    title: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '28px',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 16px 0',
    },

    coursSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '24px',
    },

    label: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },

    select: {
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: '#ffffff',
      outline: 'none',
      cursor: 'pointer',
      transition: 'border-color 0.2s ease',
      maxWidth: '300px',
    },

    searchSection: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
    },

    searchContainer: {
      position: 'relative',
      maxWidth: '400px',
    },

    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 44px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.2s ease',
    },

    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#6b7280',
    },

    statsBar: {
      backgroundColor: '#f8fafc',
      padding: '16px',
      borderRadius: '8px',
      marginTop: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    statsText: {
      fontSize: '14px',
      color: '#64748b',
    },

    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '20px',
      padding: '0',
    },

    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },

    studentInfo: {
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
    },

    avatar: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      objectFit: 'cover',
      border: '2px solid #e2e8f0',
    },

    avatarPlaceholder: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: '#f1f5f9',
      border: '2px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    studentDetails: {
      flex: 1,
      minWidth: 0,
    },

    studentName: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 8px 0',
      wordWrap: 'break-word',
    },

    infoRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '4px',
      fontSize: '14px',
      color: '#64748b',
    },

    reclamationBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 20px',
      backgroundColor: '#ef4444',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },

    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
    },

    emptyIcon: {
      color: '#d1d5db',
      marginBottom: '16px',
    },

    emptyTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 8px 0',
    },

    emptyText: {
      fontSize: '16px',
      color: '#64748b',
      margin: '0',
    },

    // Modal styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },

    modalContent: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    },

    modalHeader: {
      padding: '24px 24px 0 24px',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '24px',
    },

    modalTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '24px',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 8px 0',
    },

    modalSubtitle: {
      fontSize: '16px',
      color: '#64748b',
      margin: '0 0 16px 0',
    },

    closeBtn: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#64748b',
      padding: '8px',
      borderRadius: '6px',
      transition: 'background-color 0.2s ease',
    },

    form: {
      padding: '0 24px 24px 24px',
    },

    formGroup: {
      marginBottom: '20px',
    },

    formLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
    },

    formSelect: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: '#ffffff',
      outline: 'none',
      cursor: 'pointer',
    },

    textarea: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      resize: 'vertical',
      minHeight: '120px',
    },

    formActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
      paddingTop: '24px',
      borderTop: '1px solid #e2e8f0',
    },

    cancelBtn: {
      padding: '12px 24px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },

    submitBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      backgroundColor: '#ef4444',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },

    // Responsive styles
    '@media (max-width: 768px)': {
      grid: {
        gridTemplateColumns: '1fr',
      },
      modalContent: {
        margin: '20px',
        maxHeight: '80vh',
      },
      formActions: {
        flexDirection: 'column',
      },
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <AlertTriangle size={32} color="#ef4444" />
          Réclamations Étudiants
        </h1>
        
        {/* Sélection du cours */}
        <div style={styles.coursSection}>
          <label style={styles.label}>
            <BookOpen size={20} />
            Choisir un cours :
          </label>
          <select 
            style={styles.select}
            value={coursSelectionne}
            onChange={(e) => setCoursSelectionne(e.target.value)}
          >
            <option value="">Sélectionnez un cours...</option>
            {coursDisponibles.map(cours => (
              <option key={cours} value={cours}>{cours}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Section de recherche */}
      {coursSelectionne && (
        <div style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <Search size={20} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher un étudiant..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.statsBar}>
            <span style={styles.statsText}>
              {etudiantsFiltres.length} étudiant{etudiantsFiltres.length > 1 ? 's' : ''} autorisé{etudiantsFiltres.length > 1 ? 's' : ''} trouvé{etudiantsFiltres.length > 1 ? 's' : ''}
            </span>
            <span style={styles.statsText}>
              Cours: {coursSelectionne}
            </span>
          </div>
        </div>
      )}

      {/* Liste des étudiants */}
      {coursSelectionne && (
        <div>
          {loading ? (
            <div style={styles.emptyState}>
              <div>Chargement des étudiants...</div>
            </div>
          ) : etudiantsFiltres.length === 0 ? (
            <div style={styles.emptyState}>
              <User size={64} style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>Aucun étudiant trouvé</h3>
              <p style={styles.emptyText}>
                {etudiants.length === 0 
                  ? "Aucun étudiant autorisé dans ce cours"
                  : "Aucun étudiant ne correspond à votre recherche"
                }
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {etudiantsFiltres.map((etudiant) => (
                <div key={etudiant._id} style={styles.card}>
                  <div style={styles.studentInfo}>
                    <div>
                      {etudiant.image ? (
                        <img 
                          src={etudiant.image} 
                          alt={etudiant.nomComplet}
                          style={styles.avatar}
                        />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          <User size={24} color="#6b7280" />
                        </div>
                      )}
                    </div>
                    
                    <div style={styles.studentDetails}>
                      <h3 style={styles.studentName}>{etudiant.nomComplet}</h3>
                      
                      <div style={styles.infoRow}>
                        <User size={16} />
                        <span>Niveau: {etudiant.niveau}</span>
                      </div>
                      
                      <div style={styles.infoRow}>
                        <span>{etudiant.email}</span>
                      </div>
                      
                      <div style={styles.infoRow}>
                        <span>{etudiant.telephone}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenReclamation(etudiant)}
                    style={styles.reclamationBtn}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                  >
                    <AlertTriangle size={16} />
                    Faire une réclamation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de réclamation */}
      {showReclamationModal && etudiantSelectionne && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              style={styles.closeBtn}
              onClick={handleCloseModal}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <X size={24} />
            </button>
            
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <AlertTriangle size={28} color="#ef4444" />
                Nouvelle Réclamation
              </h2>
              <p style={styles.modalSubtitle}>
                Concernant: {etudiantSelectionne.nomComplet} - {coursSelectionne}
              </p>
            </div>

            <form style={styles.form} onSubmit={handleSubmitReclamation}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Type de réclamation *</label>
                <select
                  style={styles.formSelect}
                  value={formData.typeReclamation}
                  onChange={(e) => setFormData({...formData, typeReclamation: e.target.value})}
                  required
                >
                  <option value="">Sélectionner un type...</option>
                  {typesReclamation.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Priorité</label>
                <select
                  style={styles.formSelect}
                  value={formData.priorite}
                  onChange={(e) => setFormData({...formData, priorite: e.target.value})}
                >
                  {priorites.map(priorite => (
                    <option key={priorite} value={priorite}>{priorite}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description détaillée *</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Décrivez précisément le problème, le comportement observé, les circonstances..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={handleCloseModal}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={styles.submitBtn}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                >
                  <Plus size={16} />
                  Créer la réclamation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReclamationProfesseur;