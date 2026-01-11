// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Etudiant',
      required: true
    },
    montantTotal: {
      type: Number,
      required: true,
      min: 0
    },
    montantPaye: {
      type: Number,
      required: true,
      min: 0
    },
    montantRestant: {
      type: Number,
      required: true,
      min: 0
    },
    typePaiement: {
      type: String,
      enum: ['Cash', 'Chèque', 'Virement', 'En ligne'],
      required: true
    },
    // Informations spécifiques pour les chèques
    numeroCheque: {
      type: String,
      trim: true
    },
    banque: {
      type: String,
      trim: true
    },
    dateEcheance: {
      type: Date
    },
    statutCheque: {
      type: String,
      enum: ['En attente', 'Encaissé', 'Rejeté', 'Expiré'],
      default: 'En attente'
    },
    // Période concernée
    moisDebut: {
      type: Date,
      required: true
    },
    nombreMois: {
      type: Number,
      required: true,
      min: 1
    },
    // Informations complémentaires
    cours: {
      type: [String],
      default: []
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    // Qui a créé ce paiement
    creeParInscripteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inscripteur'
    },
    creeParAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    anneeScolaire: {
      type: String,
      validate: {
        validator: v => /^\d{4}\/\d{4}$/.test(v),
        message: "L'année scolaire doit être au format YYYY/YYYY"
      }
    }
  },
  { 
    timestamps: true 
  }
);

// Index pour améliorer les performances
paymentSchema.index({ etudiant: 1, createdAt: -1 });
paymentSchema.index({ dateEcheance: 1, statutCheque: 1 });
paymentSchema.index({ typePaiement: 1 });

// Virtuals
paymentSchema.virtual('dateFin').get(function() {
  if (!this.moisDebut) return null;
  const date = new Date(this.moisDebut);
  date.setMonth(date.getMonth() + this.nombreMois);
  return date;
});

// Méthodes statiques pour les notifications
paymentSchema.statics.getChequesExpiresSoon = function(jours = 7) {
  const maintenant = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + jours);
  
  return this.find({
    typePaiement: 'Chèque',
    statutCheque: 'En attente',
    dateEcheance: {
      $gte: maintenant,
      $lte: limite
    }
  })
  .populate('etudiant', 'nomComplet email telephoneEtudiant')
  .populate('creeParInscripteur', 'nom prenom')
  .sort({ dateEcheance: 1 });
};

paymentSchema.statics.getChequesExpires = function() {
  const maintenant = new Date();
  
  return this.find({
    typePaiement: 'Chèque',
    statutCheque: 'En attente',
    dateEcheance: { $lt: maintenant }
  })
  .populate('etudiant', 'nomComplet email telephoneEtudiant')
  .populate('creeParInscripteur', 'nom prenom')
  .sort({ dateEcheance: 1 });
};

// Calculer le total payé et restant pour un étudiant
paymentSchema.statics.getStatistiquesEtudiant = async function(etudiantId) {
  const stats = await this.aggregate([
    { $match: { etudiant: new mongoose.Types.ObjectId(etudiantId) } },
    {
      $group: {
        _id: null,
        totalAPayer: { $sum: '$montantTotal' },
        totalPaye: { $sum: '$montantPaye' },
        totalRestant: { $sum: '$montantRestant' }
      }
    }
  ]);
  
  return stats[0] || {
    totalAPayer: 0,
    totalPaye: 0,
    totalRestant: 0
  };
};

paymentSchema.set('toObject', { virtuals: true });
paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);