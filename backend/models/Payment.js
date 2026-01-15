// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // Étudiant concerné
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Etudiant',
      required: true
    },
    
    // Informations financières
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
    
    // Type de paiement
    typePaiement: {
      type: String,
      enum: ['Cash', 'Chèque', 'Virement', 'En ligne'],
      required: true
    },
    
    // Paiements par mois
    moisConcernes: [{
      mois: { // Format: "YYYY-MM"
        type: String,
        required: true
      },
      nomMois: { // Format: "Septembre 2025"
        type: String,
        required: true
      },
      montantDu: {
        type: Number,
        required: true,
        min: 0
      },
      montantPaye: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      },
      montantRestant: {
        type: Number,
        required: true,
        min: 0
      },
      payeComplet: {
        type: Boolean,
        default: false
      }
    }],
    
    // Informations pour les chèques
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
    
    // Type de paiement (mensuel ou frais d'inscription)
    type: {
      type: String,
      enum: ['mensuel', 'frais_inscription'],
      default: 'mensuel'
    },
    
    // Année scolaire
    anneeScolaire: {
      type: String,
      validate: {
        validator: v => /^\d{4}\/\d{4}$/.test(v),
        message: "L'année scolaire doit être au format YYYY/YYYY"
      },
      required: true
    }
  },
  { 
    timestamps: true 
  }
);

// ========================================
// INDEXES
// ========================================

paymentSchema.index({ etudiant: 1, createdAt: -1 });
paymentSchema.index({ dateEcheance: 1, statutCheque: 1 });
paymentSchema.index({ typePaiement: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ anneeScolaire: 1 });
paymentSchema.index({ 'moisConcernes.mois': 1 });

// ========================================
// VIRTUALS
// ========================================

paymentSchema.virtual('dateFin').get(function() {
  if (!this.moisDebut) return null;
  const date = new Date(this.moisDebut);
  date.setMonth(date.getMonth() + this.nombreMois);
  return date;
});

paymentSchema.virtual('estEnRetard').get(function() {
  if (this.typePaiement !== 'Chèque') return false;
  if (this.statutCheque !== 'En attente') return false;
  if (!this.dateEcheance) return false;
  
  return new Date() > this.dateEcheance;
});

// ========================================
// MÉTHODES STATIQUES
// ========================================

// Chèques qui expirent bientôt
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
  .populate('creeParAdmin', 'nom prenom')
  .sort({ dateEcheance: 1 });
};

// Chèques expirés
paymentSchema.statics.getChequesExpires = function() {
  const maintenant = new Date();
  
  return this.find({
    typePaiement: 'Chèque',
    statutCheque: 'En attente',
    dateEcheance: { $lt: maintenant }
  })
  .populate('etudiant', 'nomComplet email telephoneEtudiant')
  .populate('creeParInscripteur', 'nom prenom')
  .populate('creeParAdmin', 'nom prenom')
  .sort({ dateEcheance: 1 });
};

// Statistiques pour un étudiant
paymentSchema.statics.getStatistiquesEtudiant = async function(etudiantId, anneeScolaire) {
  const stats = await this.aggregate([
    { 
      $match: { 
        etudiant: new mongoose.Types.ObjectId(etudiantId),
        anneeScolaire: anneeScolaire
      } 
    },
    { $unwind: '$moisConcernes' },
    {
      $group: {
        _id: null,
        totalAPayer: { $sum: '$moisConcernes.montantDu' },
        totalPaye: { $sum: '$moisConcernes.montantPaye' },
        totalRestant: { $sum: '$moisConcernes.montantRestant' },
        moisPayes: {
          $sum: { $cond: [{ $eq: ['$moisConcernes.payeComplet', true] }, 1, 0] }
        },
        moisEnAttente: {
          $sum: { $cond: [{ $gt: ['$moisConcernes.montantRestant', 0] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalAPayer: 0,
    totalPaye: 0,
    totalRestant: 0,
    moisPayes: 0,
    moisEnAttente: 0
  };
};

// Obtenir les paiements par mois pour un étudiant
paymentSchema.statics.getPaiementsParMois = async function(etudiantId, anneeScolaire) {
  const paiements = await this.aggregate([
    { 
      $match: { 
        etudiant: new mongoose.Types.ObjectId(etudiantId),
        anneeScolaire: anneeScolaire,
        type: 'mensuel'
      } 
    },
    { $unwind: '$moisConcernes' },
    {
      $group: {
        _id: '$moisConcernes.mois',
        nomMois: { $first: '$moisConcernes.nomMois' },
        montantDu: { $first: '$moisConcernes.montantDu' },
        montantPaye: { $sum: '$moisConcernes.montantPaye' },
        montantRestant: { $sum: '$moisConcernes.montantRestant' },
        payeComplet: { 
          $max: { 
            $cond: [{ $eq: ['$moisConcernes.montantRestant', 0] }, true, false] 
          } 
        }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
  
  return paiements;
};

// Obtenir les paiements de frais d'inscription
paymentSchema.statics.getFraisInscription = async function(etudiantId, anneeScolaire) {
  return this.find({
    etudiant: etudiantId,
    anneeScolaire: anneeScolaire,
    type: 'frais_inscription'
  })
  .sort({ createdAt: -1 });
};

// ========================================
// MÉTHODES D'INSTANCE
// ========================================

// Mettre à jour le statut d'un chèque
paymentSchema.methods.updateStatutCheque = function(statut) {
  this.statutCheque = statut;
  return this.save();
};

// Ajouter un paiement pour un mois spécifique
paymentSchema.methods.ajouterPaiementMois = function(moisIndex, montant) {
  if (moisIndex >= 0 && moisIndex < this.moisConcernes.length) {
    this.moisConcernes[moisIndex].montantPaye += montant;
    this.moisConcernes[moisIndex].montantRestant = Math.max(
      0, 
      this.moisConcernes[moisIndex].montantDu - this.moisConcernes[moisIndex].montantPaye
    );
    this.moisConcernes[moisIndex].payeComplet = 
      this.moisConcernes[moisIndex].montantRestant === 0;
    
    // Mettre à jour les totaux
    this.montantPaye = this.moisConcernes.reduce((sum, mois) => sum + mois.montantPaye, 0);
    this.montantRestant = this.moisConcernes.reduce((sum, mois) => sum + mois.montantRestant, 0);
    
    return this.save();
  }
  return Promise.reject(new Error('Index de mois invalide'));
};

// ========================================
// HOOKS (MIDDLEWARE)
// ========================================

// Avant de sauvegarder, calculer les totaux
paymentSchema.pre('save', function(next) {
  // Si c'est un paiement mensuel, calculer les totaux
  if (this.type === 'mensuel' && this.moisConcernes && this.moisConcernes.length > 0) {
    this.montantTotal = this.moisConcernes.reduce((sum, mois) => sum + mois.montantDu, 0);
    this.montantPaye = this.moisConcernes.reduce((sum, mois) => sum + mois.montantPaye, 0);
    this.montantRestant = this.moisConcernes.reduce((sum, mois) => sum + mois.montantRestant, 0);
  }
  
  // Mettre à jour le statut payeComplet pour chaque mois
  if (this.moisConcernes) {
    this.moisConcernes.forEach(mois => {
      mois.payeComplet = mois.montantRestant === 0;
    });
  }
  
  next();
});

paymentSchema.set('toObject', { virtuals: true });
paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);