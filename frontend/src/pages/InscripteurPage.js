import React, { useState, useEffect } from 'react';
import { 
  Trash2, Edit, Plus, X, Phone, Mail, AlertCircle, Eye, 
  CheckCircle, XCircle, UserPlus, EyeOff, Save, Users
} from 'lucide-react';
import './CommercialPage.css';
import Sidebar from '../components/Sidebar';

const handleLogout = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('token');
  }
  window.location.href = '/';
};

const InscripteurPage = () => {
  const [inscripteurs, setInscripteurs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inscripteurToDelete, setInscripteurToDelete] = useState(null);
  const [editingInscripteur, setEditingInscripteur] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newInscripteur, setNewInscripteur] = useState({ 
    nom: '', 
    telephone: '', 
    email: '',
    motDePasse: '',
    confirmPassword: '',
    actif: true
  });

  // Get token from localStorage
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem('token') : null;
  const headers = { 
    'Authorization': `Bearer ${token}`, 
    'Content-Type': 'application/json' 
  };

  const fetchInscripteurs = async () => {
    try {
      console.log('Fetching inscripteurs...');
      setLoading(true);
      
      const res = await fetch('/api/admin/inscripteurs', { 
        headers,
        method: 'GET'
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`Erreur ${res.status}: ${errorText || 'Erreur serveur'}`);
      }
      
      const data = await res.json();
      console.log('Received data:', data);
      
      // Handle both array response and object with inscripteurs property
      const inscripteursArray = Array.isArray(data) ? data : (data.inscripteurs || []);
      setInscripteurs(inscripteursArray);
      setError('');
      
    } catch (error) {
      console.error('Erreur fetchInscripteurs:', error);
      setError('Impossible de charger les inscripteurs: ' + error.message);
      setInscripteurs([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    // Reset errors
    setError('');
    
    if (!newInscripteur.nom || !newInscripteur.nom.trim()) {
      setError('Le nom est requis');
      return false;
    }
    
    if (!newInscripteur.email || !newInscripteur.email.trim()) {
      setError('L\'email est requis');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newInscripteur.email.trim())) {
      setError('Format d\'email invalide');
      return false;
    }
    
    // Validation du mot de passe pour les nouveaux inscripteurs
    if (!editingInscripteur && (!newInscripteur.motDePasse || !newInscripteur.motDePasse.trim())) {
      setError('Le mot de passe est requis');
      return false;
    }
    
    // Si un mot de passe est fourni, valider
    if (newInscripteur.motDePasse && newInscripteur.motDePasse.trim()) {
      if (newInscripteur.motDePasse.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }
      
      // Vérification de la confirmation du mot de passe
      if (newInscripteur.motDePasse !== newInscripteur.confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return false;
      }
    }
    
    return true;
  };

  const handleCreateOrUpdateInscripteur = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const url = editingInscripteur 
        ? `/api/admin/inscripteurs/${editingInscripteur._id}`
        : '/api/admin/inscripteurs';
      
      const method = editingInscripteur ? 'PUT' : 'POST';
      
      // Préparer les données à envoyer
      const dataToSend = {
        nom: newInscripteur.nom.trim(),
        telephone: newInscripteur.telephone?.trim() || '',
        email: newInscripteur.email.trim().toLowerCase(),
        actif: Boolean(newInscripteur.actif)
      };
      
      // Inclure le mot de passe seulement s'il est fourni et non vide
      if (newInscripteur.motDePasse && newInscripteur.motDePasse.trim() !== '') {
        dataToSend.motDePasse = newInscripteur.motDePasse.trim();
      }
      
      console.log('Sending request:', { 
        method, 
        url, 
        data: { ...dataToSend, motDePasse: dataToSend.motDePasse ? '[PROVIDED]' : '[NOT PROVIDED]' } 
      });
      
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(dataToSend)
      });
      
      console.log('Response status:', res.status);
      
      if (res.ok) {
        const responseData = await res.json();
        console.log('Success response:', responseData);
        
        setSuccess(editingInscripteur ? 'Inscripteur modifié avec succès!' : 'Inscripteur créé avec succès!');
        resetForm();
        await fetchInscripteurs();
        setShowModal(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
        
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Erreur serveur' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `Erreur HTTP ${res.status}`);
      }
    } catch (error) {
      console.error('Erreur création/modification inscripteur:', error);
      setError(error.message || 'Impossible de sauvegarder l\'inscripteur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInscripteur = async () => {
    if (!inscripteurToDelete) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`/api/admin/inscripteurs/${inscripteurToDelete._id}`, {
        method: 'DELETE',
        headers
      });
      
      if (res.ok) {
        setSuccess('Inscripteur supprimé avec succès!');
        await fetchInscripteurs();
        setShowDeleteModal(false);
        setInscripteurToDelete(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
        
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Erreur serveur' }));
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression inscripteur:', error);
      setError('Impossible de supprimer l\'inscripteur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (inscripteur) => {
    if (loading) return; // Prevent multiple clicks
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const res = await fetch(`/api/admin/inscripteurs/${inscripteur._id}/toggle`, {
        method: 'PATCH',
        headers
      });
      
      if (res.ok) {
        const newStatus = !inscripteur.actif;
        setSuccess(`Inscripteur ${newStatus ? 'activé' : 'désactivé'} avec succès!`);
        await fetchInscripteurs();
        
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(''), 2000);
        
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Erreur serveur' }));
        throw new Error(errorData.message || 'Erreur lors de la modification du statut');
      }
    } catch (error) {
      console.error('Erreur toggle actif:', error);
      setError('Impossible de modifier le statut: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewInscripteur({ 
      nom: '', 
      telephone: '', 
      email: '',
      motDePasse: '',
      confirmPassword: '',
      actif: true
    });
    setEditingInscripteur(null);
    setShowPassword(false);
    setError('');
    setSuccess('');
  };

  const openEditModal = (inscripteur) => {
    setEditingInscripteur(inscripteur);
    setNewInscripteur({
      nom: inscripteur.nom || '',
      telephone: inscripteur.telephone || '',
      email: inscripteur.email || '',
      motDePasse: '',
      confirmPassword: '',
      actif: inscripteur.actif !== false
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setInscripteurToDelete(null);
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  useEffect(() => {
    fetchInscripteurs();
  }, []);

  // Clear messages after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="commercial-page">
      <Sidebar onLogout={handleLogout} />
      
      <div className="container">
        {/* Header */}
        <div className="header-card">
          <div className="header-content">
            <div className="header-info">
              <h1 className="page-title">
                <Users size={28} />
                Gestion des Inscripteurs
              </h1>
              <p className="page-subtitle">
                Gérez les comptes des inscripteurs qui peuvent ajouter étudiants et professeurs
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={openAddModal}
              disabled={loading}
            >
              <UserPlus size={20} />
              Nouvel Inscripteur
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="success-message" style={{ 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            padding: '12px 16px',
            margin: '16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={20} />
            {success}
            <button 
              onClick={() => setSuccess('')}
              className="btn-close"
              style={{ 
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#155724'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            {error}
            <button 
              onClick={() => setError('')}
              className="btn-close"
              style={{ marginLeft: 'auto' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Inscripteurs List */}
        <div className="commercials-card">
          <div className="section-header">
            <h2 className="section-title">
              <Users size={24} className="icon-green" />
              Inscripteurs ({inscripteurs.length})
            </h2>
            
            {inscripteurs.length > 0 && (
              <button 
                className="btn btn-outline" 
                onClick={fetchInscripteurs}
                disabled={loading}
                title="Actualiser la liste"
              >
                🔄 Actualiser
              </button>
            )}
          </div>
          
          {loading && inscripteurs.length === 0 ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Chargement des inscripteurs...</p>
            </div>
          ) : (
            <>
              {inscripteurs.length > 0 ? (
                <div className="commercials-grid">
                  {inscripteurs.map(inscripteur => (
                    <div key={inscripteur._id} className="commercial-item">
                      <div className="commercial-header">
                        <div className="commercial-name-section">
                          <h3 className="commercial-name">{inscripteur.nom}</h3>
                          <div className="commercial-status">
                            <button
                              onClick={() => handleToggleActive(inscripteur)}
                              className={`badge ${inscripteur.actif ? 'green-badge' : 'red-badge'}`}
                              title={`Cliquer pour ${inscripteur.actif ? 'désactiver' : 'activer'}`}
                              disabled={loading}
                              style={{ 
                                cursor: loading ? 'not-allowed' : 'pointer',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                opacity: loading ? 0.6 : 1
                              }}
                            >
                              {inscripteur.actif ? (
                                <>
                                  <CheckCircle size={12} />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  Inactif
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="commercial-actions">
                          <button
                            onClick={() => openEditModal(inscripteur)}
                            className="btn-icon yellow"
                            title="Modifier"
                            disabled={loading}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setInscripteurToDelete(inscripteur);
                              setShowDeleteModal(true);
                            }}
                            className="btn-icon red"
                            title="Supprimer"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="commercial-details">
                        {inscripteur.telephone && (
                          <div className="detail-item">
                            <Phone size={14} />
                            <span>{inscripteur.telephone}</span>
                          </div>
                        )}
                        {inscripteur.email && (
                          <div className="detail-item">
                            <Mail size={14} />
                            <span>{inscripteur.email}</span>
                          </div>
                        )}
                        {inscripteur.createdAt && (
                          <div className="detail-small">
                            Créé le {formatDate(inscripteur.createdAt)}
                          </div>
                        )}
                        {inscripteur.creeParAdmin && (
                          <div className="detail-small">
                            Par: {inscripteur.creeParAdmin.nom || inscripteur.creeParAdmin.email}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-students">
                  <Users size={48} />
                  <h3>Aucun inscripteur</h3>
                  <p>Commencez par créer votre premier inscripteur</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={openAddModal}
                    disabled={loading}
                  >
                    <UserPlus size={20} />
                    Créer le premier inscripteur
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal for Add/Edit Inscripteur */}
        {showModal && (
          <div className="modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}>
            <div className="modal">
              <div className="modal-header">
                <h3 className="modal-title">
                  {editingInscripteur ? (
                    <>
                      <Edit size={24} />
                      Modifier l'Inscripteur
                    </>
                  ) : (
                    <>
                      <UserPlus size={24} />
                      Nouvel Inscripteur
                    </>
                  )}
                </h3>
                <button
                  onClick={closeModal}
                  className="btn-close"
                  disabled={loading}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleCreateOrUpdateInscripteur}>
                  <div className="form-group">
                    <label htmlFor="nom">Nom complet *</label>
                    <input
                      id="nom"
                      type="text"
                      value={newInscripteur.nom}
                      onChange={e => setNewInscripteur({ ...newInscripteur, nom: e.target.value })}
                      placeholder="Nom et prénom de l'inscripteur"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="telephone">Téléphone</label>
                    <input
                      id="telephone"
                      type="tel"
                      value={newInscripteur.telephone}
                      onChange={e => setNewInscripteur({ ...newInscripteur, telephone: e.target.value })}
                      placeholder="Numéro de téléphone (optionnel)"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      type="email"
                      value={newInscripteur.email}
                      onChange={e => setNewInscripteur({ ...newInscripteur, email: e.target.value })}
                      placeholder="Adresse email"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">
                      {editingInscripteur ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newInscripteur.motDePasse}
                        onChange={e => setNewInscripteur({ ...newInscripteur, motDePasse: e.target.value })}
                        required={!editingInscripteur}
                        placeholder={editingInscripteur ? "Laisser vide pour ne pas changer" : "Minimum 6 caractères"}
                        style={{ paddingRight: '45px' }}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          color: '#6b7280',
                          padding: '4px'
                        }}
                        title={showPassword ? "Masquer" : "Afficher"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {newInscripteur.motDePasse && (
                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={newInscripteur.confirmPassword}
                        onChange={e => setNewInscripteur({ ...newInscripteur, confirmPassword: e.target.value })}
                        placeholder="Retaper le mot de passe"
                        required
                        disabled={loading}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={newInscripteur.actif}
                        onChange={e => setNewInscripteur({ ...newInscripteur, actif: e.target.checked })}
                        disabled={loading}
                      />
                      <CheckCircle size={16} />
                      Compte actif
                    </label>
                    <small style={{ color: '#6b7280', marginLeft: '24px' }}>
                      Les comptes inactifs ne peuvent pas se connecter
                    </small>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {loading ? (
                        <>
                          <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                          {editingInscripteur ? 'Modification...' : 'Création...'}
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {editingInscripteur ? 'Modifier' : 'Créer'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && inscripteurToDelete && (
          <div className="modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal();
          }}>
            <div className="modal small">
              <div className="modal-header">
                <h3 className="modal-title" style={{ color: '#dc3545' }}>
                  <Trash2 size={24} />
                  Confirmer la suppression
                </h3>
                <button
                  onClick={closeDeleteModal}
                  className="btn-close"
                  disabled={loading}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ 
                    backgroundColor: '#ffeaea', 
                    borderRadius: '50%', 
                    width: '60px', 
                    height: '60px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 16px' 
                  }}>
                    <Trash2 size={24} color="#dc3545" />
                  </div>
                  
                  <h4 style={{ margin: '0 0 8px', color: '#333' }}>
                    Supprimer l'inscripteur ?
                  </h4>
                  
                  <p className="modal-text" style={{ margin: '0 0 16px' }}>
                    Êtes-vous sûr de vouloir supprimer <strong>{inscripteurToDelete.nom}</strong> ?
                  </p>
                  
                  <div style={{ 
                    backgroundColor: '#fff3cd', 
                    border: '1px solid #ffeaa7',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '20px'
                  }}>
                    <small style={{ color: '#856404' }}>
                      ⚠️ Cette action est irréversible et supprimera définitivement cet inscripteur.
                    </small>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button
                    onClick={handleDeleteInscripteur}
                    disabled={loading}
                    className="btn btn-danger"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Supprimer définitivement
                      </>
                    )}
                  </button>
                  <button
                    onClick={closeDeleteModal}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InscripteurPage;