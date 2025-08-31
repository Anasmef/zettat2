import React, { useEffect, useState } from 'react';

const ModalFinance = ({ show, etudiant, onClose, onSubmit }) => {
  const [formFinance, setFormFinance] = useState({
    prixTotal: 0,
    paye: false,
    pourcentageBourse: 0,
    typePaiement: 'Cash'
  });

  useEffect(() => {
    if (etudiant) {
      setFormFinance({
        prixTotal: etudiant.prixTotal || 0,
        paye: etudiant.paye || false,
        pourcentageBourse: etudiant.pourcentageBourse || 0,
        typePaiement: etudiant.typePaiement || 'Cash'
      });
    }
  }, [etudiant]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formFinance);
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Gestion Financière - {etudiant?.nomComplet}</h3>
          <button className="btn-fermer-modal" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Prix Total</label>
              <input
                type="number"
                value={formFinance.prixTotal}
                onChange={(e) => setFormFinance({...formFinance, prixTotal: e.target.value})}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Pourcentage Bourse (%)</label>
              <input
                type="number"
                value={formFinance.pourcentageBourse}
                onChange={(e) => setFormFinance({...formFinance, pourcentageBourse: e.target.value})}
                min="0"
                max="100"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Type Paiement</label>
              <select 
                value={formFinance.typePaiement}
                onChange={(e) => setFormFinance({...formFinance, typePaiement: e.target.value})}
              >
                <option value="Cash">Cash</option>
                <option value="Virement">Virement</option>
                <option value="Chèque">Chèque</option>
                <option value="En ligne">En ligne</option>
              </select>
            </div>
            <div className="form-group">
              <label>Statut Paiement</label>
              <select 
                value={formFinance.paye}
                onChange={(e) => setFormFinance({...formFinance, paye: e.target.value === 'true'})}
              >
                <option value="false">Non payé</option>
                <option value="true">Payé</option>
              </select>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-annuler">
              Annuler
            </button>
            <button type="submit" className="btn-enregistrer">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalFinance;