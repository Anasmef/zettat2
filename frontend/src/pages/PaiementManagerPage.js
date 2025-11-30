import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Users, 
  CheckCircle, 
  XCircle, 
  Search, 
  RefreshCw, 
  Edit3, 
  Save, 
  X, 
  Filter,
  TrendingUp,
  Calendar,
  Building,
  DollarSign,
  AlertTriangle,
  Eye,
  User,
  Phone,
  Mail,
  GraduationCap,
  MapPin,
  Cake,
  BookOpen
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

const PaiementManagerPage = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [filteredEtudiants, setFilteredEtudiants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('unpaidFirst');
  const [vueMode, setVueMode] = useState('tableau');
  
  // États pour le modal de visualisation
  const [showViewModal, setShowViewModal] = useState(false);
  const [etudiantSelectionne, setEtudiantSelectionne] = useState(null);
  
  // Suppression de la pagination - afficher tous les étudiants

  useEffect(() => {
    fetchEtudiants();
  }, []);

  const fetchEtudiants = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token manquant - veuillez vous reconnecter');
      }

      console.log('🔍 Tentative de récupération des étudiants...');
      console.log('🔑 Token présent:', !!token);

      // Utiliser l'endpoint filtré pour les gestionnaires de paiement
      const response = await fetch('/api/etudiants/filtered', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Réponse status:', response.status);

      if (response.status === 403) {
        throw new Error('Accès refusé - Vérifiez vos permissions de gestionnaire de paiement');
      }

      if (response.status === 401) {
        throw new Error('Token expiré - veuillez vous reconnecter');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erreur inconnue');
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Étudiants récupérés:', data.length);
      
      setEtudiants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des étudiants:', err);
      setError(`Erreur: ${err.message}`);
      setEtudiants([]);
      
      // Si erreur d'authentification, proposer de se reconnecter
      if (err.message.includes('Token') || err.message.includes('Accès refusé')) {
        setTimeout(() => {
          if (window.confirm('Problème d\'authentification. Voulez-vous vous reconnecter ?')) {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = etudiants.filter(etudiant => {
      const matchesSearch = 
        etudiant.nomComplet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        etudiant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        etudiant.niveau?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        etudiant.cours?.some(cours => cours.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter = 
        filterStatus === 'all' ||
        (filterStatus === 'paid' && etudiant.paye) ||
        (filterStatus === 'unpaid' && !etudiant.paye) ||
        (filterStatus === 'zeroPrice' && (etudiant.prixTotal === 0 || !etudiant.prixTotal));

      return matchesSearch && matchesFilter;
    });

    // Tri
    filtered.sort((a, b) => {
      if (sortBy === 'unpaidFirst') {
        if (a.paye !== b.paye) return a.paye ? 1 : -1;
      } else if (sortBy === 'paidFirst') {
        if (a.paye !== b.paye) return a.paye ? -1 : 1;
      } else if (sortBy === 'zeroPriceFirst') {
        const aIsZero = a.prixTotal === 0 || !a.prixTotal;
        const bIsZero = b.prixTotal === 0 || !b.prixTotal;
        if (aIsZero !== bIsZero) return aIsZero ? -1 : 1;
      } else if (sortBy === 'priceDesc') {
        return (b.prixTotal || 0) - (a.prixTotal || 0);
      } else if (sortBy === 'priceAsc') {
        return (a.prixTotal || 0) - (b.prixTotal || 0);
      }
      
      // Tri par nom alphabétique, puis par date de création (plus récent en premier)
      const nameComparison = a.nomComplet.localeCompare(b.nomComplet);
      if (nameComparison === 0) {
        // Si même nom, trier par date de création décroissante
        return new Date(b.createdAt || b.dateInscription || 0) - new Date(a.createdAt || a.dateInscription || 0);
      }
      return nameComparison;
    });

    setFilteredEtudiants(filtered);
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchTerm, etudiants, filterStatus, sortBy]);

  const handleEdit = (etudiant) => {
    setEditingId(etudiant._id);
    setFormData({
      prixTotal: etudiant.prixTotal || 0,
      paye: etudiant.paye || false,
      pourcentageBourse: etudiant.pourcentageBourse || 0,
      typePaiement: etudiant.typePaiement || 'Cash'
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async (etudiantId) => {
    try {
      setSaving(true);
      
      const prixTotal = parseFloat(formData.prixTotal) || 0;
      const pourcentageBourse = parseFloat(formData.pourcentageBourse) || 0;
      
      if (prixTotal < 0) {
        alert('Le prix total ne peut pas être négatif');
        return;
      }
      
      if (pourcentageBourse < 0 || pourcentageBourse > 100) {
        alert('Le pourcentage de bourse doit être entre 0 et 100');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token manquant');
      }

      const requestBody = {
        prixTotal: prixTotal,
        paye: Boolean(formData.paye),
        pourcentageBourse: pourcentageBourse,
        typePaiement: formData.typePaiement || 'Cash'
      };

      console.log('💾 Sauvegarde des données:', requestBody);

      const response = await fetch(`/api/etudiants/${etudiantId}/finance`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const responseData = await response.json();
      console.log('✅ Sauvegarde réussie:', responseData);

      setEtudiants(prev => prev.map(etudiant => 
        etudiant._id === etudiantId 
          ? { ...etudiant, ...responseData.etudiant }
          : etudiant
      ));

      setEditingId(null);
      setFormData({});
      
      showSuccessNotification('Informations financières mises à jour avec succès !');
      
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour:', err);
      alert(`Erreur lors de la mise à jour: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const showSuccessNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const handleView = (etudiant) => {
    setEtudiantSelectionne(etudiant);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setEtudiantSelectionne(null);
  };

  const calculateMontantAPayer = (prixTotal, pourcentageBourse) => {
    const prix = parseFloat(prixTotal) || 0;
    const bourse = parseFloat(pourcentageBourse) || 0;
    const reduction = (prix * bourse) / 100;
    return Math.max(0, prix - reduction);
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('fr-MA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num) + ' DH';
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const annee = date.getFullYear();
    return `${jour}-${mois}-${annee}`;
  };

  const calculerAge = (dateNaissance) => {
    const dob = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const viderFiltres = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSortBy('unpaidFirst');
  };

  // Statistiques
  const totalEtudiants = filteredEtudiants.length;
  const etudiantsPayes = filteredEtudiants.filter(e => e.paye).length;
  const etudiantsNonPayes = filteredEtudiants.filter(e => !e.paye).length;
  const montantTotal = filteredEtudiants.reduce((sum, e) => sum + (parseFloat(e.prixTotal) || 0), 0);
  const etudiantsZeroPrice = filteredEtudiants.filter(e => e.prixTotal === 0 || !e.prixTotal).length;

  const getRowClassName = (etudiant) => {
    const isZeroPrice = etudiant.prixTotal === 0 || !etudiant.prixTotal;
    const isUnpaid = !etudiant.paye;
    
    if (isZeroPrice && isUnpaid) {
      return 'student-row danger-row';
    }
    return 'student-row';
  };

  if (loading) {
    return (
      <div className="liste-etudiants-containe">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des étudiants...</p>
        </div>
      </div>
    );
  }

  return (
<div
  className="liste-etudiants-containe"
  style={{
    minHeight: '100vh',
    padding: 24,
    backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #a6dbff 25%, #f3e8ff 100%)',
    backgroundAttachment: 'fixed' // يخلي التدرّج ثابت مع التمرير (اختياري)
  }}
>      {/* Header moderne */}      <Sidebar onLogout={handleLogout} />
      
      <div
  className="header"
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',   // يوسّط أفقيًا
    justifyContent: 'center',
    textAlign: 'center',    // يوسّط النص
    gap: '12px',
    marginBottom: '20px'
  }}
>
  {/* العنوان */}
  <h2
    style={{
      margin: 0,
      fontSize: '2rem',
      fontWeight: 700,
      color: '#1f2937'
    }}
  >
    Gestion des Paiements
  </h2>

  {/* الإجراءات — تحت العنوان ومتمركزة */}
  <div
    className="header-actions"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',  // يوسّط العناصر
      gap: '16px',
      flexWrap: 'wrap',          // يلف العناصر على الشاشات الصغيرة
      marginTop: '8px'
    }}
  >
    <div className="stats" style={{ color: '#374151' }}>
      Total: {totalEtudiants} étudiants
    </div>

    {/* Boutons de basculement vue */}
    <div className="vue-toggle" style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => setVueMode('tableau')}
        className={`btn-vue ${vueMode === 'tableau' ? 'active' : ''}`}
      >
        Tableau
      </button>
      <button
        onClick={() => setVueMode('carte')}
        className={`btn-vue ${vueMode === 'carte' ? 'active' : ''}`}
      >
        Cartes
      </button>
    </div>
  </div>
</div>


      {/* Section des filtres moderne */}
      <div className="filtres-section">
        <div className="filtres-row" style={{ justifyContent: 'center' }}>
          <div className="filtre-groupe">
            <label>Rechercher:</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#9ca3af' 
              }} />
              <input
                type="text"
                placeholder="Nom, email, niveau ou cours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-recherche"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="filtre-groupe">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} />
              Statut:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select-filtre"
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payés seulement</option>
              <option value="unpaid">Non payés seulement</option>
              <option value="zeroPrice">Prix zéro seulement</option>
            </select>
          </div>

          <div className="filtre-groupe">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} />
              Tri:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select-filtre"
            >
              <option value="unpaidFirst">Non payés en premier</option>
              <option value="paidFirst">Payés en premier</option>
              <option value="zeroPriceFirst">Prix zéro en premier</option>
              <option value="priceDesc">Prix décroissant</option>
              <option value="priceAsc">Prix croissant</option>
            </select>
          </div>

          <button onClick={viderFiltres} className="btn-vider-filtres">
            Vider les filtres
          </button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Total étudiants</div>
              <div className="stat-value">{totalEtudiants}</div>
            </div>
            <Users size={32} className="stat-icon stat-icon-blue" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Étudiants payés</div>
              <div className="stat-value stat-value-green">{etudiantsPayes}</div>
            </div>
            <CheckCircle size={32} className="stat-icon stat-icon-green" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Non payés</div>
              <div className="stat-value stat-value-red">{etudiantsNonPayes}</div>
            </div>
            <XCircle size={32} className="stat-icon stat-icon-red" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Prix zéro</div>
              <div className="stat-value stat-value-orange">{etudiantsZeroPrice}</div>
            </div>
            <AlertTriangle size={32} className="stat-icon stat-icon-orange" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Montant total</div>
              <div className="stat-value stat-value-purple">{formatCurrency(montantTotal)}</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <div className="error-content">
            <XCircle size={20} />
            <strong>Erreur:</strong> {error}
          </div>
        </div>
      )}

      {/* Vue Tableau ou Cartes */}
      {vueMode === 'tableau' ? (
        <div className="tableau-container">
          <table className="tableau-etudiants" >
            <thead >
              <tr>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Étudiant
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Formation
                  </div>
                </th>
                <th style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Prix Total
                  </div>
                </th>
                <th style={{ textAlign: 'center' }}>Bourse (%)</th>
                <th style={{ textAlign: 'center' }}>Statut</th>
                <th style={{ textAlign: 'center' }}>Type Paiement</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEtudiants.map((etudiant) => {
                const isZeroPrice = etudiant.prixTotal === 0 || !etudiant.prixTotal;
                const isUnpaid = !etudiant.paye;
                const isDanger = isZeroPrice && isUnpaid;
                
                return (
                  <tr 
                    key={etudiant._id} 
                    className={getRowClassName(etudiant)}
                  >
                    <td className="student-info-cell">
                      <div className="student-info">
                        {etudiant.image ? (
                          <img
                            src={`/api${etudiant.image}`}
                            alt={etudiant.nomComplet}
                            className="student-avatar"
                            onError={(e) => {e.target.style.display = 'none'}}
                          />
                        ) : (
                          <div className="student-avatar-fallback">
                            {etudiant.nomComplet?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="student-details">
                          <div className="student-name">
                            {etudiant.nomComplet}
                            {isDanger && <AlertTriangle size={16} className="danger-icon" />}
                          </div>
                          <div className="student-email">{etudiant.email}</div>
                          {etudiant.telephoneEtudiant && (
                            <div className="student-phone">{etudiant.telephoneEtudiant}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div className="formation-info">
                        <div className="student-level">{etudiant.niveau}</div>
                        <div className="student-courses">
                          {etudiant.cours?.length > 0 ? etudiant.cours.join(', ') : 'Aucun cours'}
                        </div>
                        <div className="student-year" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {etudiant.anneeScolaire || 'Non définie'}
                        </div>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {editingId === etudiant._id ? (
                        <input
                          type="number"
                          value={formData.prixTotal || 0}
                          onChange={(e) => setFormData({...formData, prixTotal: e.target.value})}
                          className="edit-input"
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        <span className={`price-display ${isDanger ? 'price-danger' : 'price-normal'}`}>
                          {formatCurrency(etudiant.prixTotal)}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {editingId === etudiant._id ? (
                        <div className="percentage-input">
                          <input
                            type="number"
                            value={formData.pourcentageBourse || 0}
                            onChange={(e) => setFormData({...formData, pourcentageBourse: e.target.value})}
                            className="edit-input-small"
                            min="0"
                            max="100"
                          />
                          <span>%</span>
                        </div>
                      ) : (
                        <span className="badge badge-blue">
                          {etudiant.pourcentageBourse || 0}%
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {editingId === etudiant._id ? (
                        <select
                          value={formData.paye}
                          onChange={(e) => setFormData({...formData, paye: e.target.value === 'true'})}
                          className="edit-select"
                        >
                          <option value="false">Non payé</option>
                          <option value="true">Payé</option>
                        </select>
                      ) : (
                        <span className={`status-badge ${etudiant.paye ? 'status-paid' : 'status-unpaid'}`}>
                          {etudiant.paye ? (
                            <>
                              <CheckCircle size={14} />
                              Payé
                            </>
                          ) : (
                            <>
                              <XCircle size={14} />
                              Non payé
                            </>
                          )}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {editingId === etudiant._id ? (
                        <select
                          value={formData.typePaiement || 'Cash'}
                          onChange={(e) => setFormData({...formData, typePaiement: e.target.value})}
                          className="edit-select"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Virement">Virement</option>
                          <option value="Chèque">Chèque</option>
                          <option value="En ligne">En ligne</option>
                        </select>
                      ) : (
                        <span className="badge badge-gray">
                          {etudiant.typePaiement || 'Cash'}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {editingId === etudiant._id ? (
                        <div className="action-buttons">
                          <button
                            onClick={() => handleSave(etudiant._id)}
                            disabled={saving}
                            className="btn-save"
                            title="Enregistrer"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="btn-cancel"
                            title="Annuler"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button
                            onClick={() => handleView(etudiant)}
                            className="btn-voir"
                            title="Voir détails"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleEdit(etudiant)}
                            className="btn-edit"
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredEtudiants.length === 0 && !loading && (
            <div className="empty-state">
              <Users size={48} className="empty-icon" />
              <h3>Aucun étudiant trouvé</h3>
              <p>
                {searchTerm || filterStatus !== 'all'
                  ? 'Aucun étudiant ne correspond à vos critères de recherche ou de filtre.' 
                  : 'Aucun étudiant disponible pour le moment.'
                }
              </p>
              {(searchTerm || filterStatus !== 'all') && (
                <button
                  onClick={viderFiltres}
                  className="btn-ajouter-etudiant"
                >
                  <RefreshCw size={16} />
                  Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Vue Cartes
        <div className="cartes-container">
          {filteredEtudiants.length === 0 && !loading ? (
            <div className="aucun-resultat-cartes">
              Aucun étudiant trouvé
            </div>
          ) : (
            <div className="cartes-grid">
              {filteredEtudiants.map((e) => {
                const isDanger = (e.prixTotal === 0 || !e.prixTotal) && !e.paye;
                return (
                  <div key={e._id} className={`carte-etudiant ${isDanger ? 'carte-danger' : ''}`}>
                    <div className="carte-header">
                      <div className="carte-image">
                        {e.image ? (
                          <img 
                            src={`/api${e.image}`} 
                            alt="etudiant" 
                            className="carte-photo"
                            onError={(e) => {e.target.style.display = 'none'}}
                          />
                        ) : (
                          <div className="carte-placeholder">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                      <div className="carte-statut">
                        <span className={`statut-badge ${e.paye ? 'paye' : 'non-paye'}`}>
                          {e.paye ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        </span>
                      </div>
                    </div>
                    
                    <div className="carte-content">
                      <h3 className="carte-nom">{e.nomComplet}</h3>
                      <div className="carte-info">
                        <div className="carte-detail">
                          <span className="carte-label">Niveau:</span>
                          <span>
                            <GraduationCap size={16} className="inline mr-1" /> {e.niveau || 'Non défini'}
                          </span>
                        </div>
                        <div className="carte-detail">
                          <span className="carte-label">Prix Total:</span>
                          <span className={isDanger ? 'price-danger' : 'price-normal'}>
                            {formatCurrency(e.prixTotal)}
                          </span>
                        </div>
                        <div className="carte-detail">
                          <span className="carte-label">Bourse:</span>
                          <span>{e.pourcentageBourse || 0}%</span>
                        </div>
                        <div className="carte-detail">
                          <span className="carte-label">Type Paiement:</span>
                          <span>{e.typePaiement || 'Cash'}</span>
                        </div>
                        <div className="carte-detail cours-detail">
                          <span className="carte-label">Cours:</span>
                          <div className="carte-cours">
                            {(Array.isArray(e.cours) && e.cours.length > 0) ? (
                              e.cours.map((cours, index) => (
                                <span key={index} className="cours-tag">{cours}</span>
                              ))
                            ) : (
                              <span className="no-cours">Aucun cours</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="carte-actions">
                      <button 
                        onClick={() => handleView(e)}
                        className="btn-carte btn-voir"
                        title="Voir détails"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(e)}
                        className="btn-carte btn-modifier"
                        title="Modifier"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de visualisation */}
      {showViewModal && etudiantSelectionne && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content modal-view" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Informations de l'étudiant</h3>
              <button className="btn-fermer-modal" onClick={closeViewModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="etudiant-details">
              <div className="etudiant-header">
                <div className="etudiant-image-section">
                  {etudiantSelectionne.image ? (
                    <img 
                      src={`/api${etudiantSelectionne.image}`} 
                      alt="Photo de l'étudiant" 
                      className="etudiant-image-large"
                      onError={(e) => {e.target.style.display = 'none'}}
                    />
                  ) : (
                    <div className="etudiant-image-placeholder">
                      <User size={48} />
                    </div>
                  )}
                </div>
                <div className="etudiant-info-principal">
                  <h2>{etudiantSelectionne.nomComplet}</h2>
                  <div className="statut-badge">
                    <span className={`badge ${etudiantSelectionne.paye ? 'paye' : 'non-paye'}`}>
                      {etudiantSelectionne.paye ? (
                        <><CheckCircle size={16} className="inline mr-1" /> Payé</>
                      ) : (
                        <><XCircle size={16} className="inline mr-1" /> Non payé</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="etudiant-info-grid">
                <div className="info-card">
                  <div className="info-label">Genre</div>
                  <div className="info-value">
                    <User size={16} className="inline mr-1" /> {etudiantSelectionne.genre}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-label">Niveau</div>
                  <div className="info-value">
                    <GraduationCap size={16} className="inline mr-1" /> {etudiantSelectionne.niveau || 'Non défini'}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-label">Date de Naissance</div>
                  <div className="info-value">
                    <Calendar size={16} className="inline mr-1" /> {formatDate(etudiantSelectionne.dateNaissance)}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-label">Âge</div>
                  <div className="info-value">
                    <Cake size={16} className="inline mr-1" /> {calculerAge(etudiantSelectionne.dateNaissance)} ans
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-label">Lieu de Naissance</div>
                  <div className="info-value">
                    <MapPin size={16} className="inline mr-1" /> {etudiantSelectionne.lieuNaissance || 'Non spécifié'}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-label">Nationalité</div>
                  <div className="info-value">{etudiantSelectionne.nationalite || 'Non spécifiée'}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Téléphone Étudiant</div>
                  <div className="info-value">
                    <Phone size={16} className="inline mr-1" /> {etudiantSelectionne.telephoneEtudiant}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-label">Code Massar</div>
                  <div className="info-value">{etudiantSelectionne.codeMassar}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Email</div>
                  <div className="info-value">
                    <Mail size={16} className="inline mr-1" /> {etudiantSelectionne.email}
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-label">Année Scolaire</div>
                  <div className="info-value">{etudiantSelectionne.anneeScolaire || 'Non définie'}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Prix Total</div>
                  <div className="info-value">{formatCurrency(etudiantSelectionne.prixTotal)}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Pourcentage Bourse</div>
                  <div className="info-value">{etudiantSelectionne.pourcentageBourse || 0}%</div>
                </div>

                <div className="info-card">
                  <div className="info-label">Type Paiement</div>
                  <div className="info-value">{etudiantSelectionne.typePaiement || 'Cash'}</div>
                </div>

                <div className="info-card full-width">
                  <div className="info-label">Adresse</div>
                  <div className="info-value">
                    <MapPin size={16} className="inline mr-1" /> 
                    {etudiantSelectionne.adresse || 'Non spécifiée'}
                  </div>
                </div>
              </div>

              <div className="cours-section">
                <h4>
                  <BookOpen size={20} className="inline mr-2" /> Cours Inscrits
                </h4>
                <div className="cours-badges">
                  {(Array.isArray(etudiantSelectionne.cours) && etudiantSelectionne.cours.length > 0) ? (
                    etudiantSelectionne.cours.map((cours, index) => (
                      <span key={index} className="cours-badge">{cours}</span>
                    ))
                  ) : (
                    <span className="no-cours">Aucun cours inscrit</span>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  onClick={() => {
                    closeViewModal();
                    handleEdit(etudiantSelectionne);
                  }}
                  className="btn-modifier-depuis-view"
                >
                  <Edit3 size={16} className="inline mr-1" /> Modifier
                </button>
                <button onClick={closeViewModal} className="btn-fermer">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* CSS inspiré de ListeEtudiants avec style moderne */
        .liste-etudiants-containe {
          padding: 24px;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        /* Header moderne */
        .header {
          margin-bottom: 24px;
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .title-icon-container {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 16px;
          justify-content: center;
        }

        .stats {
          background-color: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }

        .vue-toggle {
          display: flex;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 4px;
          gap: 4px;
        }

        .btn-vue {
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
          color: #64748b;
        }

        .btn-vue.active {
          background: white;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .btn-ajouter-etudiant {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-ajouter-etudiant:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .btn-ajouter-etudiant:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        /* Loading styles */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          margin: 20px 0;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .loading-container p {
          color: #6b7280;
          font-size: 1.1rem;
          font-weight: 500;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Section filtres moderne */
        .filtres-section {
          background: white;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }

        .filtres-row {
          display: flex;
          gap: 20px;
          align-items: end;
          flex-wrap: wrap;
          justify-content: center;
        }

        .filtre-groupe {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filtre-groupe label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .input-recherche {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.875rem;
          background: #f9fafb;
          transition: all 0.2s;
          min-width: 280px;
          box-sizing: border-box;
        }

        .input-recherche:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .select-filtre {
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
          min-width: 150px;
        }

        .select-filtre:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .btn-vider-filtres {
          background: #ef4444;
          color: white;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .btn-vider-filtres:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        /* Cartes de statistiques */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .stat-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-value-green { color: #059669; }
        .stat-value-red { color: #dc2626; }
        .stat-value-orange { color: #ea580c; }
        .stat-value-purple { color: #9333ea; }

        .stat-icon {
          opacity: 0.8;
        }

        .stat-icon-blue { color: #3b82f6; }
        .stat-icon-green { color: #059669; }
        .stat-icon-red { color: #dc2626; }
        .stat-icon-orange { color: #ea580c; }
        .stat-icon-purple { color: #9333ea; }

        /* Messages d'erreur */
        .error-message {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid #fca5a5;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }

        /* Tableau moderne */
        .tableau-container {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          margin-bottom: 20px;
        }

        .tableau-etudiants {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .tableau-etudiants th {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 16px 12px;
          text-align: left;
          font-weight: 700;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .student-row {
          border-bottom: 1px solid #f3f4f6;
          transition: all 0.2s;
        }

        .student-row:hover {
          background: linear-gradient(135deg, #f8fafc, #f0f9ff);
        }

        .danger-row {
          background: linear-gradient(135deg, #fef2f2, #fee2e2) !important;
          border-left: 4px solid #ef4444;
        }

        .danger-row:hover {
          background: linear-gradient(135deg, #fee2e2, #fecaca) !important;
        }

        .tableau-etudiants td {
          padding: 16px 12px;
          vertical-align: middle;
        }

        /* Styles pour les informations étudiants */
        .student-info-cell {
          min-width: 250px;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e5e7eb;
          flex-shrink: 0;
        }

        .student-avatar-fallback {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .student-details {
          flex: 1;
          min-width: 0;
        }

        .student-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .danger-icon {
          color: #ef4444;
          flex-shrink: 0;
        }

        .student-email {
          color: #6b7280;
          font-size: 0.8rem;
          margin-bottom: 2px;
        }

        .student-phone {
          color: #9ca3af;
          font-size: 0.75rem;
        }

        .formation-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .student-level {
          font-weight: 600;
          color: #1f2937;
        }

        .student-courses {
          color: #6b7280;
          font-size: 0.8rem;
        }

        .student-year {
          color: #9ca3af;
          font-size: 0.75rem;
        }

        /* Prix et montants */
        .price-display {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .price-normal {
          color: #1f2937;
        }

        .price-danger {
          color: #dc2626;
          font-weight: 700;
        }

        .amount-display {
          font-weight: 700;
          color: #059669;
          font-size: 0.95rem;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
        }

        .badge-blue {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1d4ed8;
        }

        .badge-gray {
          background: #f3f4f6;
          color: #374151;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-paid {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
        }

        .status-unpaid {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
        }

        /* Éléments de formulaire */
        .edit-input {
          width: 100px;
          padding: 8px 10px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          text-align: center;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .edit-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .edit-input-small {
          width: 60px;
          padding: 6px 8px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          text-align: center;
          font-size: 0.875rem;
        }

        .edit-input-small:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .percentage-input {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .edit-select {
          padding: 8px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .edit-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Boutons d'action */
        .action-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-voir, .btn-edit, .btn-save, .btn-cancel {
          padding: 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-voir {
          background: #3b82f6;
          color: white;
        }

        .btn-voir:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-edit {
          background: #f59e0b;
          color: white;
        }

        .btn-edit:hover {
          background: #d97706;
          transform: translateY(-1px);
        }

        .btn-save {
          background: #059669;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: #047857;
          transform: translateY(-1px);
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: #6b7280;
          color: white;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #4b5563;
          transform: translateY(-1px);
        }

        /* Vue Cartes */
        .cartes-container {
          margin-bottom: 20px;
        }

        .aucun-resultat-cartes {
          text-align: center;
          padding: 48px 24px;
          color: #6b7280;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .cartes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }

        .carte-etudiant {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .carte-etudiant:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .carte-danger {
          border-left: 4px solid #ef4444;
          background: linear-gradient(135deg, #fefefe, #fef2f2);
        }

        .carte-header {
          padding: 16px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .carte-image {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .carte-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .carte-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .carte-statut {
          display: flex;
          align-items: center;
        }

        .statut-badge {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .statut-badge.paye {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
        }

        .statut-badge.non-paye {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
        }

        .carte-content {
          padding: 16px;
        }

        .carte-nom {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 12px;
        }

        .carte-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .carte-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }

        .carte-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 0.8rem;
        }

        .cours-detail {
          flex-direction: column;
          align-items: flex-start;
        }

        .carte-cours {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }

        .cours-tag {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1d4ed8;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .no-cours {
          color: #9ca3af;
          font-style: italic;
          font-size: 0.8rem;
        }

        .carte-actions {
          display: flex;
          gap: 8px;
          padding: 16px;
          background: #f9fafb;
        }

        .btn-carte {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
        }

        .btn-carte.btn-voir {
          background: #3b82f6;
          color: white;
        }

        .btn-carte.btn-voir:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }

        .btn-carte.btn-modifier {
          background: #f59e0b;
          color: white;
        }

        .btn-carte.btn-modifier:hover {
          background: #d97706;
          transform: translateY(-2px);
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .empty-icon {
          margin: 0 auto 16px;
          color: #d1d5db;
        }

        .empty-state h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .empty-state p {
          margin-bottom: 16px;
          color: #6b7280;
        }

        /* Pagination moderne */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 20px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .btn-pagination {
          padding: 10px 16px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .btn-pagination:hover:not(:disabled) {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          transform: translateY(-1px);
        }

        .btn-pagination:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .numeros-pages {
          display: flex;
          gap: 4px;
        }

        .btn-page {
          width: 40px;
          height: 40px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .btn-page:hover {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          transform: translateY(-1px);
        }

        .btn-page.active {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-color: #3b82f6;
        }

        .info-pagination {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Modal moderne */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          border: 1px solid #e5e7eb;
        }

        .modal-view {
          width: 800px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 20px 20px 0 0;
        }

        .modal-header h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .btn-fermer-modal {
          padding: 8px;
          background: #f3f4f6;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }

        .btn-fermer-modal:hover {
          background: #ef4444;
          color: white;
          transform: scale(1.1);
        }

        .etudiant-details {
          padding: 20px;
        }

        .etudiant-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .etudiant-image-section {
          flex-shrink: 0;
        }

        .etudiant-image-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e5e7eb;
        }

        .etudiant-image-placeholder {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .etudiant-info-principal h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .etudiant-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .info-card {
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .info-card.full-width {
          grid-column: 1 / -1;
        }

        .info-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 4px;
        }

        .info-value {
          color: #1f2937;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .inline {
          display: inline;
        }

        .mr-1 {
          margin-right: 4px;
        }

        .mr-2 {
          margin-right: 8px;
        }

        .cours-section {
          margin-bottom: 24px;
        }

        .cours-section h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
        }

        .cours-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .cours-badge {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1d4ed8;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-modifier-depuis-view {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-modifier-depuis-view:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);
        }

        .btn-fermer {
          background: #6b7280;
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-fermer:hover {
          background: #4b5563;
          transform: translateY(-2px);
        }

        /* Notification de succès */
        .success-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
          z-index: 1001;
          font-weight: 600;
          animation: slideInRight 0.3s ease-out;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .liste-etudiants-containe {
            padding: 16px;
          }

          .header {
            padding: 16px;
          }

          .header-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .filtres-row {
            flex-direction: column;
            gap: 12px;
          }

          .filtre-groupe {
            width: 100%;
          }

          .input-recherche {
            min-width: 100%;
          }

          .select-filtre {
            min-width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .tableau-container {
            overflow-x: auto;
          }

          .tableau-etudiants {
            min-width: 800px;
          }

          .cartes-grid {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95vw;
            margin: 20px;
          }

          .etudiant-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default PaiementManagerPage;