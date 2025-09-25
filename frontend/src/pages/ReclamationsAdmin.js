import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, 
  Eye, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  XCircle,
  Filter,
  Search,
  BarChart3,
  Users,
  TrendingUp,
  Calendar
} from 'lucide-react';
import './ReclamationsAdmin.css';

const ReclamationsAdmin = () => {
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTraiterModal, setShowTraiterModal] = useState(false);
  const [reclamationSelectionnee, setReclamationSelectionnee] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  
  // Filtres
  const [filtres, setFiltres] = useState({
    statut: 'all',
    priorite: 'all',
    professeur: 'all',
    cours: 'all',
    search: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const [professeurs, setProfesseurs] = useState([]);

  const statutsConfig = {
    'En attente': { color: 'pending', icon: Clock },
    'En cours': { color: 'in-progress', icon: AlertTriangle },
    'Résolue': { color: 'resolved', icon: CheckCircle },
    'Fermée': { color: 'closed', icon: XCircle }
  };

  const prioritesConfig = {
    'Faible': { color: 'low' },
    'Moyenne': { color: 'medium' },
    'Élevée': { color: 'high' },
    'Urgente': { color: 'urgent' }
  };

  useEffect(() => {
    fetchReclamations();
    fetchProfesseurs();
    fetchStatistiques();
  }, [filtres, pagination.currentPage]);

  const fetchReclamations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 15,
        ...Object.fromEntries(
          Object.entries(filtres).filter(([_, value]) => value !== 'all' && value !== '')
        )
      });

      const response = await axios.get(`/api/admin/reclamations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReclamations(response.data.reclamations);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });

    } catch (err) {
      console.error('Erreur lors du chargement des réclamations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfesseurs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/professeurs/liste', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfesseurs(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des professeurs:', err);
    }
  };

  const fetchStatistiques = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/reclamations/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatistiques(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  const handleViewDetails = async (reclamation) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin/reclamations/${reclamation._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReclamationSelectionnee(response.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Erreur lors du chargement des détails:', err);
      setReclamationSelectionnee(reclamation);
      setShowDetailModal(true);
    }
  };

  const handleTraiter = (reclamation) => {
    setReclamationSelectionnee(reclamation);
    setShowTraiterModal(true);
  };

  const handleTraiterSubmit = async (reponseData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/admin/reclamations/${reclamationSelectionnee._id}/traiter`,
        reponseData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mettre à jour la liste
      setReclamations(prev => 
        prev.map(r => r._id === reclamationSelectionnee._id ? response.data.reclamation : r)
      );

      setShowTraiterModal(false);
      setReclamationSelectionnee(null);
      
      // Rafraîchir les statistiques
      fetchStatistiques();

    } catch (err) {
      console.error('Erreur lors du traitement:', err);
    }
  };

  const handleFiltreChange = (key, value) => {
    setFiltres(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const viderFiltres = () => {
    setFiltres({
      statut: 'all',
      priorite: 'all',
      professeur: 'all',
      cours: 'all',
      search: ''
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgenceClass = (priorite, statut) => {
    if (statut === 'Résolue' || statut === 'Fermée') return '';
    
    switch (priorite) {
      case 'Urgente': return 'urgent';
      case 'Élevée': return 'high-priority';
      default: return '';
    }
  };

  if (loading && reclamations.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Chargement des réclamations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reclamations-admin">
      <div className="container">
        {/* Header avec statistiques */}
        <div className="header">
          <h1 className="main-title">
            <AlertTriangle className="main-title-icon" size={32} />
            Gestion des Réclamations
          </h1>

          {/* Cartes de statistiques */}
          {statistiques && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-info">
                    <h3>Total</h3>
                    <p className="stat-number total">
                      {statistiques.general.total || 0}
                    </p>
                  </div>
                  <div className="stat-icon blue">
                    <BarChart3 size={24} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-info">
                    <h3>En attente</h3>
                    <p className="stat-number pending">
                      {statistiques.general.statuts?.find(s => s.statut === 'En attente')?.count || 0}
                    </p>
                  </div>
                  <div className="stat-icon yellow">
                    <Clock size={24} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-info">
                    <h3>En cours</h3>
                    <p className="stat-number in-progress">
                      {statistiques.general.statuts?.find(s => s.statut === 'En cours')?.count || 0}
                    </p>
                  </div>
                  <div className="stat-icon blue">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-info">
                    <h3>Résolues</h3>
                    <p className="stat-number resolved">
                      {statistiques.general.statuts?.find(s => s.statut === 'Résolue')?.count || 0}
                    </p>
                  </div>
                  <div className="stat-icon green">
                    <CheckCircle size={24} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filtres */}
        <div className="filters-section">
          <div className="filters-header">
            <Filter size={20} className="filters-header-icon" />
            <h3 className="filters-title">Filtres de recherche</h3>
          </div>
          
          <div className="filters-grid">
            <div className="filter-group">
              <label>Rechercher</label>
              <div className="search-input-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Étudiant, professeur..."
                  value={filtres.search}
                  onChange={(e) => handleFiltreChange('search', e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Statut</label>
              <select
                value={filtres.statut}
                onChange={(e) => handleFiltreChange('statut', e.target.value)}
                className="filter-select"
              >
                <option value="all">Tous les statuts</option>
                <option value="En attente">En attente</option>
                <option value="En cours">En cours</option>
                <option value="Résolue">Résolue</option>
                <option value="Fermée">Fermée</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Priorité</label>
              <select
                value={filtres.priorite}
                onChange={(e) => handleFiltreChange('priorite', e.target.value)}
                className="filter-select"
              >
                <option value="all">Toutes priorités</option>
                <option value="Urgente">Urgente</option>
                <option value="Élevée">Élevée</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Faible">Faible</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Professeur</label>
              <select
                value={filtres.professeur}
                onChange={(e) => handleFiltreChange('professeur', e.target.value)}
                className="filter-select"
              >
                <option value="all">Tous les professeurs</option>
                {professeurs.map(prof => (
                  <option key={prof._id} value={prof._id}>{prof.nom}</option>
                ))}
              </select>
            </div>

            <div className="clear-filters-container">
              <button
                onClick={viderFiltres}
                className="clear-filters-btn"
              >
                Vider les filtres
              </button>
            </div>
          </div>
        </div>

        {/* Liste des réclamations */}
        <div className="reclamations-list">
          {reclamations.length === 0 ? (
            <div className="empty-state">
              <AlertTriangle size={64} className="empty-icon" />
              <h3 className="empty-title">
                Aucune réclamation trouvée
              </h3>
              <p className="empty-text">
                Aucune réclamation ne correspond aux critères de recherche.
              </p>
            </div>
          ) : (
            reclamations.map((reclamation) => {
              const StatutIcon = statutsConfig[reclamation.statut]?.icon || AlertTriangle;
              const urgenceClass = getUrgenceClass(reclamation.priorite, reclamation.statut);
              
              return (
                <div key={reclamation._id} className={`reclamation-card ${urgenceClass}`}>
                  <div className="reclamation-content">
                    <div className="reclamation-main">
                      <div className="reclamation-info">
                        <div className="reclamation-header">
                          <div className="student-info">
                            {reclamation.etudiant?.image ? (
                              <img 
                                src={`/api${reclamation.etudiant.image}`} 
                                alt="Étudiant" 
                                className="student-avatar"
                              />
                            ) : (
                              <div className="student-avatar-placeholder">
                                <Users size={20} className="student-avatar-icon" />
                              </div>
                            )}
                            <div className="student-details">
                              <h3>{reclamation.etudiant?.nomComplet || 'Étudiant supprimé'}</h3>
                              <p>Par: {reclamation.professeur?.nom}</p>
                              <p className="course-info">
                                {reclamation.cours} • {formatDate(reclamation.dateIncident)}
                              </p>
                            </div>
                          </div>

                          <div className="badges-container">
                            <span className={`priority-badge ${prioritesConfig[reclamation.priorite]?.color || 'low'}`}>
                              {reclamation.priorite}
                            </span>
                            
                            <span className={`status-badge ${statutsConfig[reclamation.statut]?.color || 'closed'}`}>
                              <StatutIcon size={12} />
                              <span>{reclamation.statut}</span>
                            </span>
                          </div>
                        </div>

                        <div className="description-section">
                          <p className="description-title">
                            {reclamation.typeReclamation}
                          </p>
                          <p className="description-text">
                            {reclamation.description}
                          </p>
                        </div>

                        <div className="metadata">
                          <span className="metadata-item">
                            <Calendar size={14} className="metadata-icon" />
                            Créée le {formatDateTime(reclamation.createdAt)}
                          </span>
                          
                          {reclamation.dateTraitement && (
                            <span className="metadata-item">
                              <CheckCircle size={14} className="metadata-icon" />
                              Traitée le {formatDateTime(reclamation.dateTraitement)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="actions-container">
                        <button
                          onClick={() => handleViewDetails(reclamation)}
                          className="btn btn-view"
                        >
                          <Eye size={16} />
                          <span className="btn-text">Voir détails</span>
                        </button>
                        
                        {(reclamation.statut === 'En attente' || reclamation.statut === 'En cours') && (
                          <button
                            onClick={() => handleTraiter(reclamation)}
                            className="btn btn-process"
                          >
                            <MessageSquare size={16} />
                            <span className="btn-text">Traiter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-content">
              <p className="pagination-info">
                Affichage {((pagination.currentPage - 1) * 15) + 1} à{' '}
                {Math.min(pagination.currentPage * 15, pagination.total)} sur {pagination.total} réclamations
              </p>
              
              <div className="pagination-buttons">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="pagination-btn"
                >
                  Précédent
                </button>
                
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: pageNum }))}
                      className={`pagination-btn ${pagination.currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="pagination-btn"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDetailModal && reclamationSelectionnee && (
        <ReclamationDetailModal
          reclamation={reclamationSelectionnee}
          onClose={() => {
            setShowDetailModal(false);
            setReclamationSelectionnee(null);
          }}
          onTraiter={() => {
            setShowDetailModal(false);
            setShowTraiterModal(true);
          }}
        />
      )}

      {showTraiterModal && reclamationSelectionnee && (
        <TraiterReclamationModal
          reclamation={reclamationSelectionnee}
          onClose={() => {
            setShowTraiterModal(false);
            setReclamationSelectionnee(null);
          }}
          onSubmit={handleTraiterSubmit}
        />
      )}
    </div>
  );
};

// Modal de détails de réclamation pour admin
const ReclamationDetailModal = ({ reclamation, onClose, onTraiter }) => {
  const statutsConfig = {
    'En attente': { color: 'pending', icon: Clock },
    'En cours': { color: 'in-progress', icon: AlertTriangle },
    'Résolue': { color: 'resolved', icon: CheckCircle },
    'Fermée': { color: 'closed', icon: XCircle }
  };

  const prioritesConfig = {
    'Faible': { color: 'low' },
    'Moyenne': { color: 'medium' },
    'Élevée': { color: 'high' },
    'Urgente': { color: 'urgent' }
  };

  const StatutIcon = statutsConfig[reclamation.statut]?.icon || AlertTriangle;

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            <div>
              <h2 className="modal-title">Détails de la réclamation</h2>
              <p className="modal-subtitle">
                ID: {reclamation._id} • Créée le {formatDateTime(reclamation.createdAt)}
              </p>
            </div>
            <button onClick={onClose} className="modal-close-btn">
              <XCircle size={24} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Informations principales */}
          <div className="detail-grid">
            {/* Étudiant */}
            <div className="info-card">
              <h3 className="info-card-title">
                <Users size={20} className="info-card-icon" />
                Étudiant concerné
              </h3>
              <div className="user-info">
                {reclamation.etudiant?.image ? (
                  <img 
                    src={`/api${reclamation.etudiant.image}`} 
                    alt="Étudiant" 
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    <Users size={24} />
                  </div>
                )}
                <div className="user-details">
                  <p>{reclamation.etudiant?.nomComplet || 'Étudiant supprimé'}</p>
                  <p>{reclamation.etudiant?.email}</p>
                  <p>{reclamation.etudiant?.telephone}</p>
                  <p>Niveau: {reclamation.etudiant?.niveau || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Professeur */}
            <div className="info-card">
              <h3 className="info-card-title">
                <Users size={20} className="info-card-icon" />
                Professeur
              </h3>
              <div className="user-details">
                <p>{reclamation.professeur?.nom || 'Professeur supprimé'}</p>
                <p>{reclamation.professeur?.email}</p>
                <p>{reclamation.professeur?.telephone}</p>
              </div>
            </div>

            {/* Informations de la réclamation */}
            <div className="info-card">
              <h3 className="info-card-title">
                <AlertTriangle size={20} className="info-card-icon" />
                Informations
              </h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{reclamation.typeReclamation}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Cours:</span>
                  <span className="info-value">{reclamation.cours}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Date incident:</span>
                  <span className="info-value">
                    {new Date(reclamation.dateIncident).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Priorité:</span>
                  <span className={`priority-badge ${prioritesConfig[reclamation.priorite]?.color || 'low'}`}>
                    {reclamation.priorite}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Statut:</span>
                  <span className={`status-badge ${statutsConfig[reclamation.statut]?.color || 'closed'}`}>
                    <StatutIcon size={12} />
                    <span>{reclamation.statut}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="section">
            <h3 className="section-title">
              <AlertTriangle size={20} className="section-icon" />
              Description de l'incident
            </h3>
            <div className="content-box red">
              <p className="content-text">{reclamation.description}</p>
            </div>
          </div>

          {/* Mesures prises */}
          {reclamation.mesuresPrises && (
            <div className="section">
              <h3 className="section-title">
                <CheckCircle size={20} className="section-icon" />
                Mesures déjà prises par le professeur
              </h3>
              <div className="content-box blue">
                <p className="content-text">{reclamation.mesuresPrises}</p>
              </div>
            </div>
          )}

          {/* Réponse de l'administration */}
          {reclamation.reponseAdmin && (
            <div className="section">
              <h3 className="section-title">
                <MessageSquare size={20} className="section-icon" />
                Réponse de l'administration
              </h3>
              <div className="content-box green">
                <div className="response-header">
                  <p className="response-author">
                    Traitée par: {reclamation.traitePar?.nom || 'Admin'}
                  </p>
                  <p className="response-date">
                    {formatDateTime(reclamation.dateTraitement)}
                  </p>
                </div>
                <p className="content-text">{reclamation.reponseAdmin}</p>
                
                {reclamation.actionsPrises && (
                  <div className="response-actions">
                    <p className="actions-label">Actions prises:</p>
                    <p className="actions-text">{reclamation.actionsPrises}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historique */}
          {reclamation.historique && reclamation.historique.length > 0 && (
            <div className="section">
              <h3 className="section-title">
                <Clock size={20} className="section-icon" />
                Historique
              </h3>
              <div className="content-box gray">
                <div className="history-list">
                  {reclamation.historique.map((event, index) => (
                    <div key={index} className="history-item">
                      <div className="history-dot"></div>
                      <div className="history-content">
                        <div className="history-header">
                          <p className="history-action">{event.action}</p>
                          <p className="history-date">
                            {formatDateTime(event.date)}
                          </p>
                        </div>
                        <p className="history-user">Par: {event.utilisateur}</p>
                        {event.details && (
                          <p className="history-details">{event.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button onClick={onClose} className="btn-secondary">
              Fermer
            </button>
            
            {(reclamation.statut === 'En attente' || reclamation.statut === 'En cours') && (
              <button onClick={onTraiter} className="btn-primary">
                <MessageSquare size={16} />
                <span>Traiter cette réclamation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal pour traiter une réclamation
const TraiterReclamationModal = ({ reclamation, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    reponseAdmin: '',
    actionsPrises: '',
    statut: 'En cours'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.reponseAdmin.trim()) {
      newErrors.reponseAdmin = 'La réponse est obligatoire';
    } else if (formData.reponseAdmin.trim().length < 10) {
      newErrors.reponseAdmin = 'La réponse doit contenir au moins 10 caractères';
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
      await onSubmit(formData);
    } catch (err) {
      setErrors({ submit: 'Erreur lors du traitement de la réclamation' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content small">
        {/* Header */}
        <div className="modal-header green">
          <div className="modal-header-content">
            <div>
              <h2 className="modal-title">Traiter la réclamation</h2>
              <p className="modal-subtitle">
                Concernant: {reclamation.etudiant?.nomComplet}
              </p>
            </div>
            <button onClick={onClose} className="modal-close-btn">
              <XCircle size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errors.submit && (
            <div className="error-message">
              {errors.submit}
            </div>
          )}

          {/* Résumé de la réclamation */}
          <div className="summary-box">
            <h3 className="summary-title">Réclamation à traiter:</h3>
            <p className="summary-item">
              <strong>Type:</strong> {reclamation.typeReclamation}
            </p>
            <p className="summary-item">
              <strong>Description:</strong> {reclamation.description.substring(0, 150)}
              {reclamation.description.length > 150 ? '...' : ''}
            </p>
            <div className="summary-badges">
              <span className={`priority-badge ${reclamation.priorite.toLowerCase()}`}>
                {reclamation.priorite}
              </span>
              <span className="summary-meta">
                Cours: {reclamation.cours}
              </span>
            </div>
          </div>

          {/* Statut */}
          <div className="form-group">
            <label className="form-label">
              Nouveau statut *
            </label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleChange}
              className="form-input"
            >
              <option value="En cours">En cours de traitement</option>
              <option value="Résolue">Résolue</option>
              <option value="Fermée">Fermée</option>
            </select>
          </div>

          {/* Réponse */}
          <div className="form-group">
            <label className="form-label">
              Réponse à donner au professeur *
            </label>
            <textarea
              name="reponseAdmin"
              value={formData.reponseAdmin}
              onChange={handleChange}
              rows={5}
              placeholder="Expliquez la décision prise, les mesures qui seront appliquées, etc..."
              className={`form-textarea ${errors.reponseAdmin ? 'error' : ''}`}
            />
            <div className="form-footer">
              {errors.reponseAdmin && (
                <p className="form-error">{errors.reponseAdmin}</p>
              )}
              <p className="char-count">
                {formData.reponseAdmin.length}/1000 caractères
              </p>
            </div>
          </div>

          {/* Actions prises */}
          <div className="form-group">
            <label className="form-label">
              Actions concrètes prises (optionnel)
            </label>
            <textarea
              name="actionsPrises"
              value={formData.actionsPrises}
              onChange={handleChange}
              rows={3}
              placeholder="Sanctions, mesures disciplinaires, rencontre avec l'étudiant, etc..."
              className="form-textarea"
            />
            <p className="char-count">
              {formData.actionsPrises.length}/500 caractères
            </p>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Traiter la réclamation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReclamationsAdmin;