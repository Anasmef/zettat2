import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, RotateCcw, Eye, Trash2, User, Phone, Mail, GraduationCap } from 'lucide-react';
import './EtudiantsArchives.css';

const EtudiantsArchives = ({ show, onClose }) => {
  const [etudiantsArchives, setEtudiantsArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [etudiantSelectionne, setEtudiantSelectionne] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [messageAction, setMessageAction] = useState('');

  useEffect(() => {
    if (show) {
      fetchEtudiantsArchives();
    }
  }, [show]);

  const fetchEtudiantsArchives = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/etudiants/archives', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEtudiantsArchives(res.data);
    } catch (err) {
      console.error('Erreur chargement archives:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurer = async (id) => {
    if (!window.confirm('Voulez-vous restaurer cet étudiant ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/etudiants/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessageAction('✅ Étudiant restauré avec succès');
      await fetchEtudiantsArchives();
      
      setTimeout(() => setMessageAction(''), 3000);
    } catch (err) {
      console.error('Erreur restauration:', err);
      setMessageAction('❌ Erreur lors de la restauration');
    }
  };

  const handleSupprimerDefinitivement = async (id) => {
    const code = prompt('⚠️ ATTENTION : Suppression DÉFINITIVE !\n\nEntrez le code de confirmation :');
    
    if (code !== 'allahakbir') {
      alert('❌ Code incorrect');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/etudiants/${id}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessageAction('✅ Étudiant supprimé définitivement');
      await fetchEtudiantsArchives();
      
      setTimeout(() => setMessageAction(''), 3000);
    } catch (err) {
      console.error('Erreur suppression:', err);
      setMessageAction('❌ Erreur lors de la suppression');
    }
  };

  const handleVoirDetails = (etudiant) => {
    setEtudiantSelectionne(etudiant);
    setShowDetailsModal(true);
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR');
  };

  const etudiantsFiltres = etudiantsArchives.filter(e =>
    e.nomComplet.toLowerCase().includes(recherche.toLowerCase()) ||
    e.email.toLowerCase().includes(recherche.toLowerCase()) ||
    e.codeMassar.toLowerCase().includes(recherche.toLowerCase())
  );

  if (!show) return null;

  return (
    <div className="modal-overlay-archives" onClick={onClose}>
      <div className="modal-content-archives" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-archives">
          <h2>📦 Étudiants Archivés ({etudiantsArchives.length})</h2>
          <button className="btn-fermer-archives" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="search-section-archives">
          <input
            type="text"
            placeholder="🔍 Rechercher un étudiant archivé..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="input-recherche-archives"
          />
        </div>

        {messageAction && (
          <div className={`message-action ${messageAction.includes('✅') ? 'success' : 'error'}`}>
            {messageAction}
          </div>
        )}

        {loading ? (
          <div className="loading-archives">Chargement des archives...</div>
        ) : etudiantsFiltres.length === 0 ? (
          <div className="aucun-resultat-archives">
            {recherche ? 'Aucun étudiant trouvé' : 'Aucun étudiant archivé'}
          </div>
        ) : (
          <div className="table-container-archives">
            <table className="table-archives">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Nom Complet</th>
                  <th>Email</th>
                  <th>Code Massar</th>
                  <th>Niveau</th>
                  <th>Date Archivage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {etudiantsFiltres.map((etudiant) => (
                  <tr key={etudiant._id}>
                    <td>
                      {etudiant.image ? (
                        <img 
                          src={etudiant.image} 
                          alt="Photo" 
                          className="photo-mini-archives"
                        />
                      ) : (
                        <div className="photo-placeholder-archives">
                          <User size={20} />
                        </div>
                      )}
                    </td>
                    <td className="nom-etudiant-archives">{etudiant.nomComplet}</td>
                    <td>{etudiant.email}</td>
                    <td>{etudiant.codeMassar}</td>
                    <td>
                      <span className="niveau-badge-archives">
                        <GraduationCap size={14} />
                        {etudiant.niveau}
                      </span>
                    </td>
                    <td>{formatDate(etudiant.updatedAt)}</td>
                    <td className="actions-archives">
                      <button
                        onClick={() => handleVoirDetails(etudiant)}
                        className="btn-action-archives btn-voir"
                        title="Voir détails"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleRestaurer(etudiant._id)}
                        className="btn-action-archives btn-restaurer"
                        title="Restaurer"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => handleSupprimerDefinitivement(etudiant._id)}
                        className="btn-action-archives btn-supprimer-def"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de détails */}
        {showDetailsModal && etudiantSelectionne && (
          <div className="modal-overlay-details" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content-details" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-details">
                <h3>Détails de l'étudiant archivé</h3>
                <button onClick={() => setShowDetailsModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="details-grid-archives">
                <div className="detail-item">
                  <strong>Nom complet:</strong>
                  <span>{etudiantSelectionne.nomComplet}</span>
                </div>
                <div className="detail-item">
                  <strong>Genre:</strong>
                  <span>{etudiantSelectionne.genre}</span>
                </div>
                <div className="detail-item">
                  <strong>Email:</strong>
                  <span><Mail size={14} /> {etudiantSelectionne.email}</span>
                </div>
                <div className="detail-item">
                  <strong>Téléphone:</strong>
                  <span><Phone size={14} /> {etudiantSelectionne.telephoneEtudiant}</span>
                </div>
                <div className="detail-item">
                  <strong>Code Massar:</strong>
                  <span>{etudiantSelectionne.codeMassar}</span>
                </div>
                <div className="detail-item">
                  <strong>CIN:</strong>
                  <span>{etudiantSelectionne.cin || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <strong>Niveau:</strong>
                  <span>{etudiantSelectionne.niveau}</span>
                </div>
                <div className="detail-item">
                  <strong>Date de naissance:</strong>
                  <span>{formatDate(etudiantSelectionne.dateNaissance)}</span>
                </div>
                <div className="detail-item full-width">
                  <strong>Adresse:</strong>
                  <span>{etudiantSelectionne.adresse || 'N/A'}</span>
                </div>
                <div className="detail-item full-width">
                  <strong>Date d'archivage:</strong>
                  <span>{formatDate(etudiantSelectionne.updatedAt)}</span>
                </div>
              </div>
              <div className="actions-details">
                <button 
                  onClick={() => {
                    handleRestaurer(etudiantSelectionne._id);
                    setShowDetailsModal(false);
                  }}
                  className="btn-restaurer-details"
                >
                  <RotateCcw size={16} /> Restaurer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EtudiantsArchives;