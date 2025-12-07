import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Calendar,
  User,
  X
} from 'lucide-react';
import './Corbeille.css';

const Corbeille = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [etudiantASupprimer, setEtudiantASupprimer] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCorbeille();
  }, []);

  const fetchCorbeille = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/etudiants/corbeille/liste', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEtudiants(res.data);
    } catch (err) {
      console.error('Erreur chargement corbeille:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurer = async (id) => {
    if (!window.confirm('Voulez-vous restaurer cet étudiant ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/etudiants/${id}/restaurer`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ Étudiant restauré avec succès');
      fetchCorbeille();
    } catch (err) {
      console.error('Erreur restauration:', err);
      alert('❌ Erreur lors de la restauration');
    }
  };

  const handleSupprimerDefinitivement = (etudiant) => {
    setEtudiantASupprimer(etudiant);
    setDeleteCode('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    
    if (deleteCode !== 'allahakbir') {
      setDeleteError('❌ Code incorrect. Veuillez réessayer.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `/api/etudiants/${etudiantASupprimer._id}/definitif`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { code: deleteCode }
        }
      );
      alert('✅ Étudiant supprimé définitivement');
      setShowDeleteModal(false);
      fetchCorbeille();
    } catch (err) {
      console.error('Erreur suppression:', err);
      setDeleteError('❌ Erreur lors de la suppression');
    }
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const annee = date.getFullYear();
    const heures = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="loading">Chargement de la corbeille...</div>;
  }

  return (
    <div className="corbeille-container">
      <Sidebar onLogout={handleLogout} />

      <div className="header">
        <h2>🗑️ Corbeille des Étudiants</h2>
        <div className="header-actions">
          <div className="stats">
            {etudiants.length} étudiant{etudiants.length > 1 ? 's' : ''} dans la corbeille
          </div>
          <button 
            onClick={() => navigate('/etudiants')} 
            className="btn-retour"
          >
            ← Retour à la liste
          </button>
        </div>
      </div>

      {etudiants.length === 0 ? (
        <div className="corbeille-vide">
          <Trash2 size={64} color="#ccc" />
          <h3>La corbeille est vide</h3>
          <p>Aucun étudiant supprimé</p>
        </div>
      ) : (
        <div className="tableau-container">
          <table className="tableau-corbeille">
            <thead>
              <tr>
                <th>Nom Complet</th>
                <th>Genre</th>
                <th>Téléphone</th>
                <th>Code Massar</th>
                <th>Cours Sauvegardés</th>
                <th>Date Suppression</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {etudiants.map((e) => (
                <tr key={e._id}>
                  <td className="nom-colonne">{e.nomComplet}</td>
                  <td>{e.genre}</td>
                  <td>{e.telephoneEtudiant}</td>
                  <td>{e.codeMassar}</td>
                  <td>
                    <div className="cours-sauvegarde">
                      {e.coursSauvegarde && e.coursSauvegarde.length > 0 ? (
                        e.coursSauvegarde.map((cours, idx) => (
                          <span key={idx} className="cours-tag">{cours}</span>
                        ))
                      ) : (
                        <span className="no-cours">Aucun cours</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="date-suppression">
                      <Calendar size={14} className="inline mr-1" />
                      {formatDate(e.dateSuppression)}
                    </span>
                  </td>
                  <td className="actions-colonne">
                    <button 
                      onClick={() => handleRestaurer(e._id)}
                      className="btn-restaurer"
                      title="Restaurer l'étudiant"
                    >
                      <RotateCcw size={16} />
                      Restaurer
                    </button>
                    <button 
                      onClick={() => handleSupprimerDefinitivement(e)}
                      className="btn-supprimer-definitif"
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={16} />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de suppression définitive */}
      {showDeleteModal && etudiantASupprimer && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ SUPPRESSION DÉFINITIVE</h3>
              <button className="btn-fermer-modal" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleConfirmDelete} className="form-delete">
              <div className="warning-box">
                <AlertTriangle size={48} color="#dc2626" />
                <p><strong>ATTENTION : Cette action est IRRÉVERSIBLE !</strong></p>
                <p>L'étudiant sera définitivement supprimé de la base de données.</p>
              </div>

              <div className="etudiant-info">
                <p><strong>Étudiant:</strong> {etudiantASupprimer.nomComplet}</p>
                <p><strong>Email:</strong> {etudiantASupprimer.email}</p>
                <p><strong>Code Massar:</strong> {etudiantASupprimer.codeMassar}</p>
              </div>

              <div className="form-group">
                <label>Code de suppression définitive</label>
                <input
                  type="password"
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value)}
                  placeholder="Entrez le code..."
                  required
                  autoFocus
                />
                <small>Entrez le code secret pour confirmer</small>
              </div>

              {deleteError && (
                <div className="error-message">{deleteError}</div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowDeleteModal(false)} 
                  className="btn-annuler"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn-confirmer-suppression"
                >
                  <Trash2 size={16} />
                  Supprimer Définitivement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Corbeille;