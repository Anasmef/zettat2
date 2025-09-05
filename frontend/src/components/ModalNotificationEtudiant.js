import React from 'react';
import './ModalNotificationEtudiant.css';

const ModalNotificationEtudiant = ({ show, etudiant, onClose, onSetPrice }) => {
  if (!show || !etudiant) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-notification" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <div className="notification-icon">
            📋
          </div>
          <h3>Nouveau Étudiant Inscrit</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="notification-body">
          <div className="student-info-card">
            {etudiant.image && (
              <img 
                src={`http://localhost:5000${etudiant.image}`} 
                alt={etudiant.nomComplet}
                className="student-avatar"
                onError={(e) => {e.target.style.display = 'none'}}
              />
            )}
            <div className="student-details">
              <h4 className="student-name">{etudiant.nomComplet}</h4>
              <div className="student-meta">
                <span className="meta-item">
                  <strong>Niveau:</strong> {etudiant.niveau}
                </span>
                <span className="meta-item">
                  <strong>Email:</strong> {etudiant.email}
                </span>
                <span className="meta-item">
                  <strong>Téléphone:</strong> {etudiant.telephoneEtudiant}
                </span>
                {etudiant.cours && etudiant.cours.length > 0 && (
                  <span className="meta-item">
                    <strong>Cours:</strong> {etudiant.cours.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="alert-message">
            <div className="alert-icon">⚠️</div>
            <div className="alert-text">
              <strong>Action requise:</strong>
              <p>Ce nouvel étudiant n'a pas encore de prix total défini. Veuillez configurer les informations financières pour finaliser son inscription.</p>
            </div>
          </div>

          <div className="current-status">
            <div className="status-row">
              <span>Prix total actuel:</span>
              <span className="status-value empty">{etudiant.prixTotal || 0} DH</span>
            </div>
            <div className="status-row">
              <span>Statut paiement:</span>
              <span className={`status-badge ${etudiant.paye ? 'paid' : 'unpaid'}`}>
                {etudiant.paye ? 'Payé' : 'Non payé'}
              </span>
            </div>
            <div className="status-row">
              <span>Date d'inscription:</span>
              <span className="status-value">
                {etudiant.createdAt ? new Date(etudiant.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="notification-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Ignorer pour maintenant
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => onSetPrice(etudiant)}
          >
            Définir le prix maintenant
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalNotificationEtudiant;