import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, AlertTriangle, User, Calendar, BookOpen, FileText } from 'lucide-react';
import './ReclamationForm.css';

const ReclamationForm = ({ onClose, onSubmit, etudiant = null }) => {
  const [formData, setFormData] = useState({
    etudiantId: etudiant?._id || '',
    typeReclamation: '',
    cours: '',
    dateIncident: '',
    priorite: 'Moyenne',
    description: '',
    mesuresPrises: ''
  });

  const [etudiants, setEtudiants] = useState([]);
  const [coursDisponibles, setCours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const typesReclamation = [
    'Comportement perturbateur',
    'Retards répétés',
    'Absences non justifiées',
    'Non respect des règles',
    'Problème de discipline',
    'Travail non rendu',
    'Autre'
  ];

  const niveauxPriorite = [
    { value: 'Faible', color: 'low' },
    { value: 'Moyenne', color: 'medium' },
    { value: 'Élevée', color: 'high' },
    { value: 'Urgente', color: 'urgent' }
  ];

  useEffect(() => {
    fetchEtudiantsEtCours();
    // Définir la date d'aujourd'hui par défaut
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, dateIncident: today }));
  }, []);

  const fetchEtudiantsEtCours = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Récupérer les étudiants du professeur
      const resEtudiants = await axios.get('http://localhost:5000/api/professeur/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEtudiants(resEtudiants.data);

      // Récupérer les cours du professeur
      const resProfesseur = await axios.get('http://localhost:5000/api/professeur/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCours(resProfesseur.data.cours || []);

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.etudiantId) {
      newErrors.etudiantId = 'Veuillez sélectionner un étudiant';
    }
    
    if (!formData.typeReclamation) {
      newErrors.typeReclamation = 'Veuillez sélectionner un type de réclamation';
    }
    
    if (!formData.cours) {
      newErrors.cours = 'Veuillez sélectionner un cours';
    }
    
    if (!formData.dateIncident) {
      newErrors.dateIncident = 'Veuillez spécifier la date de l\'incident';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Veuillez décrire l\'incident';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/professeur/reclamations', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSubmit(response.data.reclamation);
      onClose();

    } catch (err) {
      console.error('Erreur lors de la création de la réclamation:', err);
      setErrors({ 
        submit: err.response?.data?.message || 'Erreur lors de la création de la réclamation'
      });
    } finally {
      setLoading(false);
    }
  };

  const etudiantSelectionne = etudiants.find(e => e._id === formData.etudiantId);

  return (
    <div className="form-modal-overlay">
      <div className="form-modal-container">
        {/* Header */}
        <div className="form-modal-header">
          <div className="form-header-content">
            <div className="form-header-info">
              <AlertTriangle size={28} />
              <div>
                <h2 className="form-modal-title">Nouvelle Réclamation</h2>
                <p className="form-modal-subtitle">Signaler un problème concernant un étudiant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="form-close-btn"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-content">
            {errors.submit && (
              <div className="form-error-message">
                {errors.submit}
              </div>
            )}

            {/* Sélection d'étudiant */}
            <div className="form-group">
              <label className="form-label">
                <User size={16} className="form-label-icon" />
                Étudiant concerné *
              </label>
              <select
                name="etudiantId"
                value={formData.etudiantId}
                onChange={handleChange}
                className={`form-select ${errors.etudiantId ? 'error' : ''}`}
                disabled={!!etudiant}
              >
                <option value="">Sélectionner un étudiant...</option>
                {etudiants.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.nomComplet} - {e.niveau || 'N/A'}
                  </option>
                ))}
              </select>
              {errors.etudiantId && (
                <p className="form-field-error">{errors.etudiantId}</p>
              )}
            </div>

            {/* Aperçu de l'étudiant sélectionné */}
            {etudiantSelectionne && (
              <div className="student-preview">
                <h4 className="student-preview-title">Étudiant sélectionné:</h4>
                <div className="student-info-container">
                  {etudiantSelectionne.image ? (
                    <img 
                      src={`/api${etudiantSelectionne.image}`} 
                      alt="Étudiant" 
                      className="student-avatar"
                    />
                  ) : (
                    <div className="student-avatar-placeholder">
                      <User size={20} />
                    </div>
                  )}
                  <div className="student-details">
                    <p>{etudiantSelectionne.nomComplet}</p>
                    <p>{etudiantSelectionne.email}</p>
                    <p>Tél: {etudiantSelectionne.telephone}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid">
              {/* Type de réclamation */}
              <div className="form-group">
                <label className="form-label">
                  <AlertTriangle size={16} className="form-label-icon" />
                  Type de réclamation *
                </label>
                <select
                  name="typeReclamation"
                  value={formData.typeReclamation}
                  onChange={handleChange}
                  className={`form-select ${errors.typeReclamation ? 'error' : ''}`}
                >
                  <option value="">Sélectionner un type...</option>
                  {typesReclamation.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.typeReclamation && (
                  <p className="form-field-error">{errors.typeReclamation}</p>
                )}
              </div>

              {/* Cours */}
              <div className="form-group">
                <label className="form-label">
                  <BookOpen size={16} className="form-label-icon" />
                  Cours concerné *
                </label>
                <select
                  name="cours"
                  value={formData.cours}
                  onChange={handleChange}
                  className={`form-select ${errors.cours ? 'error' : ''}`}
                >
                  <option value="">Sélectionner un cours...</option>
                  {coursDisponibles.map(cours => (
                    <option key={cours} value={cours}>{cours}</option>
                  ))}
                </select>
                {errors.cours && (
                  <p className="form-field-error">{errors.cours}</p>
                )}
              </div>

              {/* Date de l'incident */}
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={16} className="form-label-icon" />
                  Date de l'incident *
                </label>
                <input
                  type="date"
                  name="dateIncident"
                  value={formData.dateIncident}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className={`form-input ${errors.dateIncident ? 'error' : ''}`}
                />
                {errors.dateIncident && (
                  <p className="form-field-error">{errors.dateIncident}</p>
                )}
              </div>

              {/* Priorité */}
              <div className="form-group">
                <label className="form-label">
                  <AlertTriangle size={16} className="form-label-icon" />
                  Niveau de priorité
                </label>
                <select
                  name="priorite"
                  value={formData.priorite}
                  onChange={handleChange}
                  className="form-select"
                >
                  {niveauxPriorite.map(niveau => (
                    <option key={niveau.value} value={niveau.value}>
                      {niveau.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">
                <FileText size={16} className="form-label-icon" />
                Description détaillée de l'incident *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Décrivez précisément ce qui s'est passé, le comportement observé, les circonstances..."
                className={`form-textarea ${errors.description ? 'error' : ''}`}
              />
              <div className="char-count-container">
                {errors.description && (
                  <p className="form-field-error">{errors.description}</p>
                )}
                <p className="char-count">
                  {formData.description.length}/1000 caractères
                </p>
              </div>
            </div>

            {/* Mesures prises */}
            <div className="form-group">
              <label className="form-label">
                <FileText size={16} className="form-label-icon" />
                Mesures déjà prises (optionnel)
              </label>
              <textarea
                name="mesuresPrises"
                value={formData.mesuresPrises}
                onChange={handleChange}
                rows={3}
                placeholder="Décrivez les actions que vous avez déjà entreprises pour résoudre le problème..."
                className="form-textarea"
              />
              <p className="char-count">
                {formData.mesuresPrises.length}/500 caractères
              </p>
            </div>

            {/* Aperçu de la priorité sélectionnée */}
            <div className="form-preview">
              <h4 className="form-preview-title">Aperçu de la réclamation:</h4>
              <div className="preview-content">
                <div className="preview-item">
                  <span className="preview-label">Priorité:</span>
                  <span className={`priority-badge ${
                    niveauxPriorite.find(n => n.value === formData.priorite)?.color || 'medium'
                  }`}>
                    {formData.priorite}
                  </span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Type:</span>
                  <span className="preview-value">
                    {formData.typeReclamation || 'Non sélectionné'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-cancel"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-submit"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    <span>Créer la réclamation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReclamationForm;