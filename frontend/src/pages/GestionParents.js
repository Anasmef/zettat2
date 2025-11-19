import React, { useEffect, useState } from 'react';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, Search, Mail, Phone, Grid, List } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import Sidebar from '../components/Sidebar';

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

const GestionParents = () => {
  const [parents, setParents] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'cards'
  const [form, setForm] = useState({
    nomComplet: '',
    email: '',
    motDePasse: '',
    telephone: '',
    enfants: []
  });

  useEffect(() => {
    fetchParents();
    fetchEtudiants();
  }, []);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/parents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParents(res.data);
    } catch (err) {
      console.error('Erreur chargement parents:', err);
      alert('Erreur lors du chargement des parents');
    } finally {
      setLoading(false);
    }
  };

  const fetchEtudiants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEtudiants(res.data);
    } catch (err) {
      console.error('Erreur chargement étudiants:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.nomComplet || !form.email || (!editingParent && !form.motDePasse)) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (form.enfants.length === 0) {
      alert('Veuillez sélectionner au moins un enfant');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (editingParent) {
        await axios.put(
          `/api/admin/parents/${editingParent._id}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Parent modifié avec succès');
      } else {
        await axios.post(
          '/api/admin/parents',
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Parent créé avec succès');
      }
      
      fetchParents();
      handleCloseModal();
    } catch (err) {
      console.error('Erreur:', err);
      alert(err.response?.data?.message || 'Erreur lors de l\'opération');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce parent ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/parents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Parent supprimé avec succès');
      fetchParents();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggleActif = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/api/admin/parents/${id}/toggle-actif`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchParents();
    } catch (err) {
      console.error('Erreur toggle actif:', err);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setForm({
      nomComplet: parent.nomComplet,
      email: parent.email,
      motDePasse: '',
      telephone: parent.telephone || '',
      enfants: parent.enfants.map(e => e._id)
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingParent(null);
    setSelectedNiveau(null);
    setForm({
      nomComplet: '',
      email: '',
      motDePasse: '',
      telephone: '',
      enfants: []
    });
  };

  const toggleEnfant = (etudiantId) => {
    setForm(prev => ({
      ...prev,
      enfants: prev.enfants.includes(etudiantId)
        ? prev.enfants.filter(id => id !== etudiantId)
        : [...prev.enfants, etudiantId]
    }));
  };

  const filteredParents = parents.filter(parent =>
    parent.nomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const niveauxUniques = [...new Set(etudiants.map(e => e.niveau))].filter(Boolean);
  const niveauxOptions = niveauxUniques.map(niveau => ({
    value: niveau,
    label: niveau
  }));

  const etudiantsFiltres = selectedNiveau
    ? etudiants.filter(e => e.niveau === selectedNiveau.value)
    : etudiants;

  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '44px',
      borderColor: '#d1d5db',
      borderRadius: '8px',
      '&:hover': {
        borderColor: '#2563eb'
      }
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      cursor: 'pointer'
    })
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
      padding: '10px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      marginBottom: '24px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      padding: '16px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'center'
    },
    headerTop: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      position: 'relative'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#111827',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: 0,
      textAlign: 'center'
    },
    headerButtons: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      position: 'absolute',
      right: 0,
      '@media (maxWidth: 768px)': {
        position: 'static',
        width: '100%',
        justifyContent: 'center'
      }
    },
    button: {
      padding: '10px 16px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap'
    },
    viewButton: {
      padding: '10px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    viewButtonActive: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    searchContainer: {
      padding: '16px',
      borderBottom: '1px solid #e5e7eb'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 44px',
      fontSize: '14px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '16px',
      padding: '16px'
    },
    parentCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    },
    parentCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableContainer: {
      overflowX: 'auto',
      padding: '0'
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb'
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #f3f4f6'
    },
    modal: {
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
      padding: '10px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      maxWidth: '700px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      padding: '20px',
      borderBottom: '1px solid #e5e7eb',
      fontSize: '18px',
      fontWeight: '600'
    },
    modalBody: {
      padding: '20px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '8px',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    etudiantsList: {
      maxHeight: '300px',
      overflowY: 'auto',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px'
    },
    etudiantItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      marginBottom: '4px'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    actionButtons: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    iconButton: {
      padding: '8px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block'
    },
    formActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
      flexWrap: 'wrap'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar onLogout={handleLogout} />
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar onLogout={handleLogout} />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>
              <Users size={24} color="#2563eb" />
              Gestion des Parents
            </h1>
            <div style={{
              ...styles.headerButtons,
              ...(window.innerWidth <= 768 ? {
                position: 'static',
                width: '100%',
                justifyContent: 'center',
                marginTop: '12px'
              } : {})
            }}>
              <button 
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'table' ? styles.viewButtonActive : {})
                }}
                onClick={() => setViewMode('table')}
                title="Vue tableau"
              >
                <List size={20} />
              </button>
              <button 
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'cards' ? styles.viewButtonActive : {})
                }}
                onClick={() => setViewMode('cards')}
                title="Vue cartes"
              >
                <Grid size={20} />
              </button>
              <button style={styles.button} onClick={() => setShowModal(true)}>
                <Plus size={20} />
                <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>Ajouter</span>
              </button>
            </div>
          </div>
        </div>

        <div style={styles.searchContainer}>
          <div style={{ position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {viewMode === 'table' ? (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Parent</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Téléphone</th>
                  <th style={styles.th}>Enfants</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParents.map(parent => (
                  <tr key={parent._id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>{parent.nomComplet}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                        <Mail size={16} />
                        {parent.email}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                        <Phone size={16} />
                        {parent.telephone || '—'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ ...styles.badge, backgroundColor: '#eff6ff', color: '#1e40af' }}>
                          {parent.enfants?.length || 0} enfant(s)
                        </span>
                        {parent.enfants && parent.enfants.length > 0 && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            {parent.enfants.map((enfant) => (
                              <div key={enfant._id} style={{ marginTop: '2px' }}>
                                • {enfant.nomComplet}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: parent.actif ? '#f0fdf4' : '#fef2f2',
                        color: parent.actif ? '#166534' : '#991b1b'
                      }}>
                        {parent.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleEdit(parent)}
                          style={{ ...styles.iconButton, backgroundColor: '#dbeafe', color: '#1e40af' }}
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActif(parent._id)}
                          style={{ 
                            ...styles.iconButton, 
                            backgroundColor: parent.actif ? '#fee2e2' : '#dcfce7',
                            color: parent.actif ? '#991b1b' : '#166534'
                          }}
                          title={parent.actif ? 'Désactiver' : 'Activer'}
                        >
                          {parent.actif ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(parent._id)}
                          style={{ ...styles.iconButton, backgroundColor: '#fee2e2', color: '#991b1b' }}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {filteredParents.map(parent => (
              <div key={parent._id} style={styles.parentCard}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {parent.nomComplet}
                    </h3>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: parent.actif ? '#f0fdf4' : '#fef2f2',
                      color: parent.actif ? '#166534' : '#991b1b'
                    }}>
                      {parent.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                      <Mail size={16} />
                      <span>{parent.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                      <Phone size={16} />
                      <span>{parent.telephone || '—'}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Users size={16} color="#2563eb" />
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>
                        {parent.enfants?.length || 0} enfant(s)
                      </span>
                    </div>
                    {parent.enfants && parent.enfants.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginLeft: '24px' }}>
                        {parent.enfants.map((enfant) => (
                          <div key={enfant._id} style={{ marginTop: '4px' }}>
                            • {enfant.nomComplet}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ ...styles.actionButtons, justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                  <button
                    onClick={() => handleEdit(parent)}
                    style={{ ...styles.iconButton, backgroundColor: '#dbeafe', color: '#1e40af' }}
                    title="Modifier"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActif(parent._id)}
                    style={{ 
                      ...styles.iconButton, 
                      backgroundColor: parent.actif ? '#fee2e2' : '#dcfce7',
                      color: parent.actif ? '#991b1b' : '#166534'
                    }}
                    title={parent.actif ? 'Désactiver' : 'Activer'}
                  >
                    {parent.actif ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(parent._id)}
                    style={{ ...styles.iconButton, backgroundColor: '#fee2e2', color: '#991b1b' }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              {editingParent ? 'Modifier un parent' : 'Ajouter un parent'}
            </div>
            <div style={styles.modalBody}>
              <div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom complet *</label>
                  <input
                    type="text"
                    value={form.nomComplet}
                    onChange={(e) => setForm({ ...form, nomComplet: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Mot de passe {editingParent ? '(laisser vide pour ne pas changer)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={form.motDePasse}
                    onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
                    style={styles.input}
                    required={!editingParent}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Téléphone</label>
                  <input
                    type="tel"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Filtrer par niveau</label>
                  <Select
                    options={niveauxOptions}
                    value={selectedNiveau}
                    onChange={setSelectedNiveau}
                    isClearable
                    placeholder="Tous les niveaux"
                    styles={selectStyles}
                    noOptionsMessage={() => "Aucun niveau disponible"}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Enfants sélectionnés ({form.enfants.length})
                  </label>
                  {form.enfants.length > 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '8px', 
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {form.enfants.map(enfantId => {
                        const etudiant = etudiants.find(e => e._id === enfantId);
                        return etudiant ? (
                          <div
                            key={enfantId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 12px',
                              backgroundColor: '#2563eb',
                              color: 'white',
                              borderRadius: '20px',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            <span>{etudiant.nomComplet}</span>
                            <button
                              type="button"
                              onClick={() => toggleEnfant(enfantId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '18px',
                                fontWeight: 'bold'
                              }}
                              title="Retirer"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '13px',
                      marginBottom: '16px'
                    }}>
                      Aucun enfant sélectionné
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Liste des étudiants disponibles
                  </label>
                  <div style={styles.etudiantsList}>
                    {etudiantsFiltres.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        Aucun étudiant disponible
                      </div>
                    ) : (
                      etudiantsFiltres.map(etudiant => (
                        <div
                          key={etudiant._id}
                          style={{
                            ...styles.etudiantItem,
                            backgroundColor: form.enfants.includes(etudiant._id) ? '#eff6ff' : 'transparent'
                          }}
                          onClick={() => toggleEnfant(etudiant._id)}
                        >
                          <input
                            type="checkbox"
                            checked={form.enfants.includes(etudiant._id)}
                            onChange={() => toggleEnfant(etudiant._id)}
                            style={styles.checkbox}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', color: '#111827' }}>
                              {etudiant.nomComplet}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                              {etudiant.niveau || 'Niveau non spécifié'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                    Cliquez sur un étudiant pour le sélectionner/désélectionner
                  </small>
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    style={{ ...styles.button, backgroundColor: '#6b7280' }}
                  >
                    Annuler
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSubmit}
                    style={styles.button}
                  >
                    {editingParent ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionParents;