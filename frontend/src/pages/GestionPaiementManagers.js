import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  UserCheck, 
  UserX, 
  Phone, 
  Mail, 
  Calendar,
  RotateCcw,
  X,
  Save,
  User
} from 'lucide-react';
import axios from 'axios';

const GestionPaiementManagers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreActif, setFiltreActif] = useState('');
  
  // États pour les modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // États pour les formulaires
  const [formAdd, setFormAdd] = useState({
    nom: '',
    email: '',
    telephone: '',
    motDePasse: '',
    actif: true
  });
  
  const [formEdit, setFormEdit] = useState({
    nom: '',
    email: '',
    telephone: '',
    motDePasse: '',
    actif: true
  });
  
  const [managerSelectionne, setManagerSelectionne] = useState(null);
  const [managerAModifier, setManagerAModifier] = useState(null);
  
  const [messageAdd, setMessageAdd] = useState('');
  const [messageEdit, setMessageEdit] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/paiement-managers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManagers(res.data);
    } catch (err) {
      console.error('Erreur chargement managers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des managers
  const managersFiltres = managers.filter(manager => {
    const matchRecherche = !recherche || 
      manager.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      manager.email.toLowerCase().includes(recherche.toLowerCase()) ||
      manager.telephone.includes(recherche);
    
    const matchActif = filtreActif === '' || 
      manager.actif.toString() === filtreActif;
    
    return matchRecherche && matchActif;
  });

  // Fonctions pour les modals
  const openAddModal = () => {
    setShowAddModal(true);
    setMessageAdd('');
    setFormAdd({
      nom: '',
      email: '',
      telephone: '',
      motDePasse: '',
      actif: true
    });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormAdd({
      nom: '',
      email: '',
      telephone: '',
      motDePasse: '',
      actif: true
    });
    setMessageAdd('');
  };

  const openEditModal = (manager) => {
    setManagerAModifier(manager);
    setFormEdit({
      nom: manager.nom,
      email: manager.email,
      telephone: manager.telephone,
      motDePasse: '',
      actif: manager.actif
    });
    setShowEditModal(true);
    setMessageEdit('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setManagerAModifier(null);
    setFormEdit({
      nom: '',
      email: '',
      telephone: '',
      motDePasse: '',
      actif: true
    });
    setMessageEdit('');
  };

  const openViewModal = (manager) => {
    setManagerSelectionne(manager);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setManagerSelectionne(null);
  };

  // Gestion des changements de formulaire
  const handleChangeAdd = (e) => {
    const { name, value, type, checked } = e.target;
    setFormAdd(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleChangeEdit = (e) => {
    const { name, value, type, checked } = e.target;
    setFormEdit(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Soumission du formulaire d'ajout
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setLoadingAdd(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/paiement-managers', formAdd, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessageAdd('Gestionnaire créé avec succès');
      await fetchManagers();
      
      setTimeout(() => {
        closeAddModal();
      }, 2000);
      
    } catch (err) {
      console.error('Erreur création:', err);
      setMessageAdd(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoadingAdd(false);
    }
  };

  // Soumission du formulaire de modification
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setLoadingEdit(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/paiement-managers/${managerAModifier._id}`, formEdit, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessageEdit('Gestionnaire modifié avec succès');
      await fetchManagers();
      
      setTimeout(() => {
        closeEditModal();
      }, 2000);
      
    } catch (err) {
      console.error('Erreur modification:', err);
      setMessageEdit(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setLoadingEdit(false);
    }
  };

  // Toggle statut actif
  const handleToggleActif = async (managerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/admin/paiement-managers/${managerId}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchManagers();
    } catch (err) {
      console.error('Erreur toggle:', err);
    }
  };

  // Suppression
  const handleDelete = async (managerId, managerNom) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le gestionnaire "${managerNom}" ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/paiement-managers/${managerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchManagers();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Chargement des gestionnaires...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Gestion des Gestionnaires de Paiement</h1>
        <button onClick={openAddModal} style={styles.btnAdd}>
          <Plus size={20} />
          Ajouter un gestionnaire
        </button>
      </div>

      {/* Filtres */}
      <div style={styles.filtres}>
        <div style={styles.searchContainer}>
          <Search size={20} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou téléphone..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <select
          value={filtreActif}
          onChange={(e) => setFiltreActif(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actifs uniquement</option>
          <option value="false">Inactifs uniquement</option>
        </select>

        <div style={styles.statsInfo}>
          Total: {managersFiltres.length} gestionnaire(s)
        </div>
      </div>

      {/* Tableau des gestionnaires */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Nom</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Téléphone</th>
              <th style={styles.th}>Statut</th>
              <th style={styles.th}>Date de création</th>
              <th style={styles.th}>Dernière connexion</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {managersFiltres.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.noResults}>
                  Aucun gestionnaire trouvé
                </td>
              </tr>
            ) : (
              managersFiltres.map((manager) => (
                <tr key={manager._id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.managerInfo}>
                      <div style={styles.avatar}>
                        {manager.nom.charAt(0).toUpperCase()}
                      </div>
                      <span style={styles.managerName}>{manager.nom}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.emailContainer}>
                      <Mail size={16} style={styles.icon} />
                      {manager.email}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.phoneContainer}>
                      <Phone size={16} style={styles.icon} />
                      {manager.telephone}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.statusContainer}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: manager.actif ? '#dcfce7' : '#fee2e2',
                        color: manager.actif ? '#166534' : '#991b1b'
                      }}>
                        {manager.actif ? (
                          <><UserCheck size={14} /> Actif</>
                        ) : (
                          <><UserX size={14} /> Inactif</>
                        )}
                      </span>
                      <button
                        onClick={() => handleToggleActif(manager._id)}
                        style={styles.toggleBtn}
                        title={manager.actif ? 'Désactiver' : 'Activer'}
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.dateContainer}>
                      <Calendar size={14} style={styles.icon} />
                      {formatDate(manager.createdAt)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {manager.lastSeen ? formatDate(manager.lastSeen) : 'Jamais'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => openViewModal(manager)}
                        style={styles.btnAction}
                        title="Voir détails"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(manager)}
                        style={{...styles.btnAction, backgroundColor: '#fbbf24'}}
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(manager._id, manager.nom)}
                        style={{...styles.btnAction, backgroundColor: '#ef4444'}}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={closeAddModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>Ajouter un Gestionnaire de Paiement</h3>
              <button onClick={closeAddModal} style={styles.btnClose}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitAdd} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <User size={16} />
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={formAdd.nom}
                    onChange={handleChangeAdd}
                    required
                    style={styles.input}
                    placeholder="Nom complet du gestionnaire"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <Mail size={16} />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formAdd.email}
                    onChange={handleChangeAdd}
                    required
                    style={styles.input}
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <Phone size={16} />
                    Téléphone *
                  </label>
                  <input
                    type="text"
                    name="telephone"
                    value={formAdd.telephone}
                    onChange={handleChangeAdd}
                    required
                    style={styles.input}
                    placeholder="Numéro de téléphone"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    name="motDePasse"
                    value={formAdd.motDePasse}
                    onChange={handleChangeAdd}
                    required
                    minLength="6"
                    style={styles.input}
                    placeholder="Minimum 6 caractères"
                  />
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="actif"
                    checked={formAdd.actif}
                    onChange={handleChangeAdd}
                    style={styles.checkbox}
                  />
                  Compte actif
                </label>
              </div>

              {messageAdd && (
                <div style={{
                  ...styles.message,
                  backgroundColor: messageAdd.includes('succès') ? '#dcfce7' : '#fee2e2',
                  color: messageAdd.includes('succès') ? '#166534' : '#991b1b'
                }}>
                  {messageAdd}
                </div>
              )}

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={closeAddModal} 
                  style={styles.btnCancel}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={loadingAdd}
                  style={styles.btnSubmit}
                >
                  <Save size={16} />
                  {loadingAdd ? 'Création...' : 'Créer le gestionnaire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de modification */}
      {showEditModal && managerAModifier && (
        <div style={styles.modalOverlay} onClick={closeEditModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>Modifier le Gestionnaire</h3>
              <button onClick={closeEditModal} style={styles.btnClose}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitEdit} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <User size={16} />
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={formEdit.nom}
                    onChange={handleChangeEdit}
                    required
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <Mail size={16} />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formEdit.email}
                    onChange={handleChangeEdit}
                    required
                    style={styles.input}
                  />
                </div>
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <Phone size={16} />
                    Téléphone *
                  </label>
                  <input
                    type="text"
                    name="telephone"
                    value={formEdit.telephone}
                    onChange={handleChangeEdit}
                    required
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    name="motDePasse"
                    value={formEdit.motDePasse}
                    onChange={handleChangeEdit}
                    minLength="6"
                    style={styles.input}
                    placeholder="Laisser vide pour garder l'ancien"
                  />
                  <small style={styles.smallText}>
                    Laisser vide pour conserver le mot de passe actuel
                  </small>
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="actif"
                    checked={formEdit.actif}
                    onChange={handleChangeEdit}
                    style={styles.checkbox}
                  />
                  Compte actif
                </label>
              </div>

              {messageEdit && (
                <div style={{
                  ...styles.message,
                  backgroundColor: messageEdit.includes('succès') ? '#dcfce7' : '#fee2e2',
                  color: messageEdit.includes('succès') ? '#166534' : '#991b1b'
                }}>
                  {messageEdit}
                </div>
              )}

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={closeEditModal} 
                  style={styles.btnCancel}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={loadingEdit}
                  style={styles.btnSubmit}
                >
                  <Save size={16} />
                  {loadingEdit ? 'Modification...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de visualisation */}
      {showViewModal && managerSelectionne && (
        <div style={styles.modalOverlay} onClick={closeViewModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>Détails du Gestionnaire</h3>
              <button onClick={closeViewModal} style={styles.btnClose}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.viewContent}>
              <div style={styles.managerHeader}>
                <div style={styles.avatarLarge}>
                  {managerSelectionne.nom.charAt(0).toUpperCase()}
                </div>
                <div style={styles.managerMainInfo}>
                  <h2 style={styles.managerNameLarge}>{managerSelectionne.nom}</h2>
                  <span style={{
                    ...styles.statusBadgeLarge,
                    backgroundColor: managerSelectionne.actif ? '#dcfce7' : '#fee2e2',
                    color: managerSelectionne.actif ? '#166534' : '#991b1b'
                  }}>
                    {managerSelectionne.actif ? (
                      <><UserCheck size={16} /> Compte Actif</>
                    ) : (
                      <><UserX size={16} /> Compte Inactif</>
                    )}
                  </span>
                </div>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>Email</div>
                  <div style={styles.infoValue}>
                    <Mail size={16} style={styles.infoIcon} />
                    {managerSelectionne.email}
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>Téléphone</div>
                  <div style={styles.infoValue}>
                    <Phone size={16} style={styles.infoIcon} />
                    {managerSelectionne.telephone}
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>Date de création</div>
                  <div style={styles.infoValue}>
                    <Calendar size={16} style={styles.infoIcon} />
                    {formatDate(managerSelectionne.createdAt)}
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>Dernière mise à jour</div>
                  <div style={styles.infoValue}>
                    <Calendar size={16} style={styles.infoIcon} />
                    {formatDate(managerSelectionne.updatedAt)}
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>Dernière connexion</div>
                  <div style={styles.infoValue}>
                    {managerSelectionne.lastSeen ? formatDate(managerSelectionne.lastSeen) : 'Jamais connecté'}
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.infoLabel}>ID</div>
                  <div style={styles.infoValue}>
                    {managerSelectionne._id}
                  </div>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button 
                  onClick={() => {
                    closeViewModal();
                    openEditModal(managerSelectionne);
                  }}
                  style={styles.btnEdit}
                >
                  <Edit size={16} />
                  Modifier
                </button>
                <button onClick={closeViewModal} style={styles.btnCancel}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '0 8px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  btnAdd: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
  },
  filtres: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  searchContainer: {
    position: 'relative',
    flex: 1
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  filterSelect: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none'
  },
  statsInfo: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f9fafb'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s ease',
    cursor: 'pointer'
  },
  td: {
    padding: '16px',
    verticalAlign: 'middle'
  },
  managerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600'
  },
  managerName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  emailContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280'
  },
  phoneContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280'
  },
  dateContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280'
  },
  icon: {
    color: '#9ca3af'
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  toggleBtn: {
    padding: '4px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s ease'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  btnAction: {
    padding: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '16px'
  },
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
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  btnClose: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px'
  },
  form: {
    padding: '24px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  smallText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px'
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px'
  },
  btnCancel: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  btnSubmit: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  },
  btnEdit: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  viewContent: {
    padding: '24px'
  },
  managerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  avatarLarge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '600'
  },
  managerMainInfo: {
    flex: 1
  },
  managerNameLarge: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  statusBadgeLarge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  infoCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px'
  },
  infoValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500'
  },
  infoIcon: {
    color: '#9ca3af'
  }
};

// CSS pour l'animation du spinner
const spinKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Ajouter les keyframes au document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = spinKeyframes;
  document.head.appendChild(styleSheet);
}

export default GestionPaiementManagers;