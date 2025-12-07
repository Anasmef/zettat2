import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, 
  Eye, 
  FileText, 
  Clock, 
  XCircle, 
  CheckCircle, 
  Calendar, 
  UserX, 
  Filter, 
  Search, 
  Plus, 
  Trash2, 
  Edit,
  Users,
  TrendingUp,
  X,
  MessageSquare
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import './ListeNoire.css';

const ListeNoire = () => {
  const [casListeNoire, setCasListeNoire] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Filtres
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreGravite, setFiltreGravite] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [casSelectionne, setCasSelectionne] = useState(null);
  
  // Form d'ajout
  const [formAjout, setFormAjout] = useState({
    etudiantId: '',
    motif: 'absences_excessives',
    description: '',
    gravite: 'moyen',
    sanction: 'avertissement',
    nombreAbsences: 0,
    nombreRetards: 0,
    nombreRapports: 0
  });
  
  const [observation, setObservation] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchCas();
    fetchEtudiants();
    fetchStats();
  }, []);

  const fetchCas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/liste-noire', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCasListeNoire(res.data);
    } catch (err) {
      console.error('Erreur fetch cas:', err);
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
      console.error('Erreur fetch étudiants:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/liste-noire/stats/general', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Erreur fetch stats:', err);
    }
  };

  const handleAjouterCas = async (e) => {
    e.preventDefault();
    
    if (!formAjout.etudiantId || !formAjout.description) {
      setMessage('❌ Veuillez remplir tous les champs obligatoires');
      setMessageType('error');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/liste-noire', formAjout, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Étudiant ajouté à la liste noire');
      setMessageType('success');
      
      await fetchCas();
      await fetchStats();
      
      setTimeout(() => {
        setShowAddModal(false);
        setFormAjout({
          etudiantId: '',
          motif: 'absences_excessives',
          description: '',
          gravite: 'moyen',
          sanction: 'avertissement',
          nombreAbsences: 0,
          nombreRetards: 0,
          nombreRapports: 0
        });
        setMessage('');
      }, 2000);
      
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Erreur lors de l\'ajout'));
      setMessageType('error');
    }
  };

  const handleResoudre = async (id) => {
    const note = prompt('Note de résolution (optionnel):');
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/liste-noire/${id}/resoudre`, 
        { noteResolution: note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('✅ Cas résolu avec succès');
      await fetchCas();
      await fetchStats();
      
    } catch (err) {
      alert('❌ Erreur lors de la résolution');
    }
  };

  const handleAjouterObservation = async (e) => {
    e.preventDefault();
    
    if (!observation.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/liste-noire/${casSelectionne._id}/observation`,
        { texte: observation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('✅ Observation ajoutée');
      setObservation('');
      setShowObservationModal(false);
      await fetchCas();
      
    } catch (err) {
      alert('❌ Erreur lors de l\'ajout de l\'observation');
    }
  };

  const handleArchiver = async (id) => {
    if (!window.confirm('Voulez-vous vraiment archiver ce cas ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/liste-noire/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('✅ Cas archivé');
      await fetchCas();
      await fetchStats();
      
    } catch (err) {
      alert('❌ Erreur lors de l\'archivage');
    }
  };

  const casFiltres = casListeNoire.filter(cas => {
    const matchRecherche = cas.nomComplet?.toLowerCase().includes(recherche.toLowerCase()) ||
                          cas.description?.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = !filtreStatut || cas.statut === filtreStatut;
    const matchGravite = !filtreGravite || cas.gravite === filtreGravite;
    const matchNiveau = !filtreNiveau || cas.niveau === filtreNiveau;
    
    return matchRecherche && matchStatut && matchGravite && matchNiveau;
  });

  const getGraviteColor = (gravite) => {
    const colors = {
      leger: '#10b981',
      moyen: '#f59e0b',
      grave: '#ef4444',
      tres_grave: '#7f1d1d'
    };
    return colors[gravite] || '#666';
  };

  const getStatutBadge = (statut) => {
    const badges = {
      actif: { text: 'Actif', color: '#ef4444', icon: AlertTriangle },
      en_cours: { text: 'En cours', color: '#f59e0b', icon: Clock },
      resolu: { text: 'Résolu', color: '#10b981', icon: CheckCircle },
      archive: { text: 'Archivé', color: '#6b7280', icon: XCircle }
    };
    return badges[statut] || badges.actif;
  };

  const motifLabels = {
    absences_excessives: 'Absences excessives',
    retards_frequents: 'Retards fréquents',
    comportement_inapproprie: 'Comportement inapproprié',
    violence: 'Violence',
    indiscipline: 'Indiscipline',
    devoirs_non_faits: 'Devoirs non faits',
    manque_respect: 'Manque de respect',
    autre: 'Autre'
  };

  const sanctionLabels = {
    avertissement: 'Avertissement',
    blame: 'Blâme',
    convocation_parents: 'Convocation parents',
    exclusion_1_jour: 'Exclusion 1 jour',
    exclusion_3_jours: 'Exclusion 3 jours',
    exclusion_1_semaine: 'Exclusion 1 semaine',
    conseil_discipline: 'Conseil de discipline',
    exclusion_definitive: 'Exclusion définitive'
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="liste-noire-container">
        <Sidebar onLogout={handleLogout} />
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="liste-noire-container">
      <Sidebar onLogout={handleLogout} />
      
      <div className="liste-noire-content">
        {/* Header avec stats */}
        <div className="header">
          <div>
            <h1>🚨 Liste Noire des Étudiants</h1>
            <p className="subtitle">Gestion des cas disciplinaires</p>
          </div>
          <button className="btn-add" onClick={() => setShowAddModal(true)}>
            <Plus size={20} />
            Ajouter un cas
          </button>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fee2e2' }}>
                <Users size={24} color="#dc2626" />
              </div>
              <div>
                <div className="stat-value">{stats.general.totalCas}</div>
                <div className="stat-label">Total cas</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7' }}>
                <AlertTriangle size={24} color="#f59e0b" />
              </div>
              <div>
                <div className="stat-value">{stats.general.casActifs}</div>
                <div className="stat-label">Cas actifs</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#d1fae5' }}>
                <CheckCircle size={24} color="#10b981" />
              </div>
              <div>
                <div className="stat-value">{stats.general.casResolus}</div>
                <div className="stat-label">Cas résolus</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fee2e2' }}>
                <TrendingUp size={24} color="#dc2626" />
              </div>
              <div>
                <div className="stat-value">{stats.general.casGraves + stats.general.casTresGraves}</div>
                <div className="stat-label">Cas graves</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Rechercher par nom ou description..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
            <option value="archive">Archivé</option>
          </select>
          
          <select value={filtreGravite} onChange={(e) => setFiltreGravite(e.target.value)}>
            <option value="">Toutes les gravités</option>
            <option value="leger">Léger</option>
            <option value="moyen">Moyen</option>
            <option value="grave">Grave</option>
            <option value="tres_grave">Très grave</option>
          </select>
          
          <button className="btn-reset" onClick={() => {
            setRecherche('');
            setFiltreStatut('');
            setFiltreGravite('');
            setFiltreNiveau('');
          }}>
            Réinitialiser
          </button>
        </div>

        {/* Table des cas */}
        <div className="table-container">
          <table className="liste-noire-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Niveau</th>
                <th>Motif</th>
                <th>Gravité</th>
                <th>Sanction</th>
                <th>Infractions</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {casFiltres.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                    <UserX size={48} color="#999" style={{ margin: '0 auto 10px' }} />
                    <p style={{ marginTop: '10px', color: '#666' }}>
                      Aucun cas trouvé
                    </p>
                  </td>
                </tr>
              ) : (
                casFiltres.map(cas => {
                  const statutBadge = getStatutBadge(cas.statut);
                  const IconStatut = statutBadge.icon;
                  
                  return (
                    <tr key={cas._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {cas.etudiant?.image ? (
                            <img 
                              src={cas.etudiant.image} 
                              alt="" 
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '50%', 
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Users size={20} color="#666" />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: '600' }}>{cas.nomComplet}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {cas.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{cas.niveau || 'N/A'}</td>
                      <td>
                        <span style={{ 
                          fontSize: '13px',
                          color: '#666'
                        }}>
                          {motifLabels[cas.motif] || cas.motif}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getGraviteColor(cas.gravite) + '20',
                          color: getGraviteColor(cas.gravite),
                          textTransform: 'capitalize'
                        }}>
                          {cas.gravite.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {sanctionLabels[cas.sanction] || cas.sanction}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          {cas.nombreAbsences > 0 && <div>🚫 {cas.nombreAbsences} absences</div>}
                          {cas.nombreRetards > 0 && <div>⏰ {cas.nombreRetards} retards</div>}
                          {cas.nombreRapports > 0 && <div>📋 {cas.nombreRapports} rapports</div>}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {formatDate(cas.dateAjout)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: statutBadge.color + '20',
                          color: statutBadge.color
                        }}>
                          <IconStatut size={14} />
                          {statutBadge.text}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn-icon"
                            onClick={() => {
                              setCasSelectionne(cas);
                              setShowDetailsModal(true);
                            }}
                            title="Voir détails"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {cas.statut !== 'resolu' && (
                            <>
                              <button 
                                className="btn-icon btn-success"
                                onClick={() => handleResoudre(cas._id)}
                                title="Résoudre"
                              >
                                <CheckCircle size={16} />
                              </button>
                              
                              <button 
                                className="btn-icon btn-warning"
                                onClick={() => {
                                  setCasSelectionne(cas);
                                  setShowObservationModal(true);
                                }}
                                title="Ajouter observation"
                              >
                                <MessageSquare size={16} />
                              </button>
                            </>
                          )}
                          
                          <button 
                            className="btn-icon btn-danger"
                            onClick={() => handleArchiver(cas._id)}
                            title="Archiver"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Ajout */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Ajouter un étudiant à la liste noire</h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAjouterCas}>
                <div className="form-group">
                  <label>Étudiant *</label>
                  <select
                    value={formAjout.etudiantId}
                    onChange={(e) => setFormAjout({...formAjout, etudiantId: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner un étudiant</option>
                    {etudiants.map(e => (
                      <option key={e._id} value={e._id}>
                        {e.nomComplet} - {e.niveau} ({e.cours.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Motif *</label>
                    <select
                      value={formAjout.motif}
                      onChange={(e) => setFormAjout({...formAjout, motif: e.target.value})}
                      required
                    >
                      {Object.entries(motifLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Gravité *</label>
                    <select
                      value={formAjout.gravite}
                      onChange={(e) => setFormAjout({...formAjout, gravite: e.target.value})}
                      required
                    >
                      <option value="leger">Léger</option>
                      <option value="moyen">Moyen</option>
                      <option value="grave">Grave</option>
                      <option value="tres_grave">Très grave</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formAjout.description}
                    onChange={(e) => setFormAjout({...formAjout, description: e.target.value})}
                    rows="4"
                    placeholder="Décrire l'incident..."
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Sanction</label>
                  <select
                    value={formAjout.sanction}
                    onChange={(e) => setFormAjout({...formAjout, sanction: e.target.value})}
                  >
                    {Object.entries(sanctionLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre d'absences</label>
                    <input
                      type="number"
                      min="0"
                      value={formAjout.nombreAbsences}
                      onChange={(e) => setFormAjout({...formAjout, nombreAbsences: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Nombre de retards</label>
                    <input
                      type="number"
                      min="0"
                      value={formAjout.nombreRetards}
                      onChange={(e) => setFormAjout({...formAjout, nombreRetards: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Nombre de rapports</label>
                    <input
                      type="number"
                      min="0"
                      value={formAjout.nombreRapports}
                      onChange={(e) => setFormAjout({...formAjout, nombreRapports: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                
                {message && (
                  <div className={`message ${messageType}`}>
                    {message}
                  </div>
                )}
                
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-submit">
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Détails */}
        {showDetailsModal && casSelectionne && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Détails du cas</h3>
                <button onClick={() => setShowDetailsModal(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Étudiant:</strong>
                  <span>{casSelectionne.nomComplet}</span>
                </div>
                <div className="detail-item">
                  <strong>Niveau:</strong>
                  <span>{casSelectionne.niveau || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <strong>Motif:</strong>
                  <span>{motifLabels[casSelectionne.motif]}</span>
                </div>
                <div className="detail-item">
                  <strong>Gravité:</strong>
                  <span style={{ 
                    color: getGraviteColor(casSelectionne.gravite),
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {casSelectionne.gravite.replace('_', ' ')}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Sanction:</strong>
                  <span>{sanctionLabels[casSelectionne.sanction]}</span>
                </div>
                <div className="detail-item">
                  <strong>Date d'ajout:</strong>
                  <span>{formatDate(casSelectionne.dateAjout)}</span>
                </div>
                <div className="detail-item full-width">
                  <strong>Description:</strong>
                  <p style={{ marginTop: '8px', lineHeight: '1.6' }}>
                    {casSelectionne.description}
                  </p>
                </div>
                
                {casSelectionne.statut === 'resolu' && (
                  <>
                    <div className="detail-item">
                      <strong>Date de résolution:</strong>
                      <span>{formatDate(casSelectionne.dateResolution)}</span>
                    </div>
                    {casSelectionne.noteResolution && (
                      <div className="detail-item full-width">
                        <strong>Note de résolution:</strong>
                        <p style={{ marginTop: '8px', lineHeight: '1.6' }}>
                          {casSelectionne.noteResolution}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {casSelectionne.observations && casSelectionne.observations.length > 0 && (
                  <div className="detail-item full-width">
                    <strong>Observations:</strong>
                    <div style={{ marginTop: '12px' }}>
                      {casSelectionne.observations.map((obs, idx) => (
                        <div key={idx} style={{
                          padding: '12px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          marginBottom: '8px'
                        }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            {formatDate(obs.date)}
                          </div>
                          <div>{obs.texte}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Observation */}
        {showObservationModal && casSelectionne && (
          <div className="modal-overlay" onClick={() => setShowObservationModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Ajouter une observation</h3>
                <button onClick={() => setShowObservationModal(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAjouterObservation}>
                <div className="form-group">
                  <label>Observation</label>
                  <textarea
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    rows="6"
                    placeholder="Décrire l'observation..."
                    required
                  />
                </div>
                
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowObservationModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-submit">
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListeNoire;