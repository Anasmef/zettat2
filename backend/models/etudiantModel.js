// models/Etudiant.js
const mongoose = require('mongoose');

const etudiantSchema = new mongoose.Schema(
  {
    // Informations personnelles
    nomComplet: { 
      type: String, 
      required: true, 
      trim: true 
    },
    genre: { 
      type: String, 
      enum: ['Homme', 'Femme'], 
      trim: true 
    },
    email: { 
      type: String, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    motDePasse: { 
      type: String 
    },
    autorise: { 
      type: Boolean, 
      default: false 
    },
    dateNaissance: { 
      type: Date 
    },
    lieuNaissance: { 
      type: String, 
      trim: true 
    },
    nationalite: { 
      type: String, 
      trim: true 
    },
    
    // Gestion de la visibilité
    hidden: { 
      type: Boolean, 
      default: false 
    },
    actif: { 
      type: Boolean, 
      default: true 
    },
    
    // Frais d'inscription
    fraisInscription: { 
      type: Number, 
      default: 0 
    },
    fraisInscriptionMontantPaye: { 
      type: Number, 
      default: 0 
    },
    fraisInscriptionPaye: { 
      type: Boolean, 
      default: false 
    },
    fraisInscriptionDate: { 
      type: Date 
    },
    fraisInscriptionTypePaiement: {
      type: String,
      enum: ['Cash', 'Chèque', 'Virement', 'En ligne'],
      default: 'Cash'
    },
    
    // Mensualités
    mensualite: { 
      type: Number, 
      default: 0,
      required: true 
    },
    
    // Informations administratives
    cin: { 
      type: String, 
      unique: true, 
      sparse: true,
      trim: true 
    },
    niveau: { 
      type: String, 
      trim: true 
    },
    codeMassar: { 
      type: String, 
      unique: true, 
      trim: true 
    },
    
    // Informations familiales
    nomCompletPere: { 
      type: String, 
      trim: true 
    },
    nomCompletMere: { 
      type: String, 
      trim: true 
    },
    travailPere: { 
      type: String, 
      default: '', 
      trim: true 
    },
    travailMere: { 
      type: String, 
      default: '', 
      trim: true 
    },
    
    // Contacts
    telephoneEtudiant: { 
      type: String, 
      trim: true 
    },
    telephonePere: { 
      type: String, 
      default: '', 
      trim: true 
    },
    telephoneMere: { 
      type: String, 
      default: '', 
      trim: true 
    },
    
    // Autres informations
    adresse: { 
      type: String, 
      default: '', 
      trim: true 
    },
    transport: { 
      type: Boolean, 
      default: false 
    },
    cours: { 
      type: [String], 
      default: [] 
    },
    image: { 
      type: String, 
      default: '' 
    },
    
    // Suivi
    lastSeen: { 
      type: Date, 
      default: null 
    },
    
    // Création
    creeParAdmin: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Admin' 
    },
    creeParInscripteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inscripteur',
      default: null
    },
    
    // Anciens champs (à conserver pour compatibilité)
    prixTotal: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    paye: { 
      type: Boolean, 
      default: false 
    },
    pourcentageBourse: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 100 
    },
    typePaiement: {
      type: String,
      enum: ['Cash', 'Virement', 'Chèque', 'En ligne'],
      default: 'Cash'
    },
    dateReglement: { 
      type: String, 
      default: null 
    },
    
    // Année scolaire
    anneeScolaire: {
      type: String,
      validate: {
        validator: v => /^\d{4}\/\d{4}$/.test(v),
        message: "L'année scolaire doit être au format YYYY/YYYY (ex: 2025/2026)"
      }
    }
  },
  { 
    timestamps: true 
  }
);

// ========================================
// MÉTHODES STATIQUES POUR FILTRER HIDDEN
// ========================================

// Obtenir SEULEMENT les étudiants VISIBLES (hidden = false)
etudiantSchema.statics.findVisible = function(filter = {}) {
  return this.find({ ...filter, hidden: { $ne: true } })
    .populate('creeParAdmin', 'nom prenom')
    .populate('creeParInscripteur', 'nom prenom')
    .sort({ createdAt: -1 });
};

// Obtenir SEULEMENT les étudiants CACHÉS (hidden = true)
etudiantSchema.statics.findHidden = function(filter = {}) {
  return this.find({ ...filter, hidden: true })
    .populate('creeParAdmin', 'nom prenom')
    .populate('creeParInscripteur', 'nom prenom')
    .sort({ updatedAt: -1 });
};

// Archiver un étudiant (soft delete)
etudiantSchema.methods.archiver = function() {
  this.hidden = true;
  this.cours = [];
  this.actif = false;
  return this.save();
};

// Restaurer un étudiant archivé
etudiantSchema.methods.restaurer = function() {
  this.hidden = false;
  this.actif = true;
  return this.save();
};

// ========================================
// VIRTUALS
// ========================================

etudiantSchema.virtual('nomCompletVirtuel').get(function () {
  return this.nomComplet || '';
});

etudiantSchema.virtual('telephone').get(function () {
  return this.telephoneEtudiant || '';
});

// Calcul du montant à payer avec bourse
etudiantSchema.virtual('montantAPayer').get(function () {
  const reduction = (this.prixTotal * this.pourcentageBourse) / 100;
  return Math.max(0, this.prixTotal - reduction);
});

// Statut de paiement
etudiantSchema.virtual('statutPaiement').get(function () {
  if (this.paye) return 'Payé';
  if (this.prixTotal === 0) return 'Gratuit';
  return 'En attente';
});

// Calcul du reste des frais d'inscription
etudiantSchema.virtual('fraisInscriptionRestant').get(function () {
  return Math.max(0, this.fraisInscription - this.fraisInscriptionMontantPaye);
});

// ========================================
// MÉTHODES D'INSTANCE
// ========================================

// Marquer comme payé
etudiantSchema.methods.marquerCommePaye = function () {
  this.paye = true;
  this.dateReglement = new Date().toISOString().split('T')[0];
  return this.save();
};

// Obtenir le montant restant
etudiantSchema.methods.getMontantRestant = function () {
  return this.paye ? 0 : this.montantAPayer;
};

// Mettre à jour les frais d'inscription
etudiantSchema.methods.updateFraisInscription = function(data) {
  this.fraisInscription = data.montantTotal || this.fraisInscription;
  this.fraisInscriptionMontantPaye = data.montantPaye || this.fraisInscriptionMontantPaye;
  this.fraisInscriptionPaye = data.paye || this.fraisInscriptionPaye;
  
  if (data.paye) {
    this.fraisInscriptionDate = new Date();
    this.fraisInscriptionMontantPaye = this.fraisInscription;
  }
  
  if (data.typePaiement) {
    this.fraisInscriptionTypePaiement = data.typePaiement;
  }
  
  return this.save();
};

// ========================================
// MÉTHODES STATIQUES
// ========================================

// Statistiques de paiement
etudiantSchema.statics.getStatistiquesPaiement = function () {
  return this.aggregate([
    { $match: { hidden: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalEtudiants: { $sum: 1 },
        etudiantsPayes: { $sum: { $cond: [{ $eq: ['$paye', true] }, 1, 0] } },
        etudiantsNonPayes: { $sum: { $cond: [{ $eq: ['$paye', false] }, 1, 0] } },
        montantTotalAttendu: { $sum: '$prixTotal' },
        montantTotalPaye: {
          $sum: { $cond: [{ $eq: ['$paye', true] }, '$prixTotal', 0] }
        },
        totalFraisInscription: { $sum: '$fraisInscription' },
        totalFraisInscriptionPayes: { 
          $sum: { $cond: [{ $eq: ['$fraisInscriptionPaye', true] }, '$fraisInscription', 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalEtudiants: 1,
        etudiantsPayes: 1,
        etudiantsNonPayes: 1,
        montantTotalAttendu: 1,
        montantTotalPaye: 1,
        totalFraisInscription: 1,
        totalFraisInscriptionPayes: 1,
        pourcentagePaiement: {
          $cond: [
            { $eq: ['$totalEtudiants', 0] },
            0,
            { $multiply: [{ $divide: ['$etudiantsPayes', '$totalEtudiants'] }, 100] }
          ]
        },
        pourcentageFraisPayes: {
          $cond: [
            { $eq: ['$totalFraisInscription', 0] },
            0,
            { $multiply: [{ $divide: ['$totalFraisInscriptionPayes', '$totalFraisInscription'] }, 100] }
          ]
        }
      }
    }
  ]);
};

// Obtenir les étudiants avec paiements mensuels
etudiantSchema.statics.getEtudiantsAvecPaiementsMensuels = function(anneeScolaire) {
  return this.aggregate([
    { $match: { 
      hidden: { $ne: true },
      actif: true,
      anneeScolaire: anneeScolaire 
    }},
    { $lookup: {
      from: 'payments',
      let: { etudiantId: '$_id' },
      pipeline: [
        { $match: { 
          $expr: { $eq: ['$etudiant', '$$etudiantId'] },
          anneeScolaire: anneeScolaire
        }},
        { $unwind: '$moisConcernes' },
        { $group: {
          _id: '$moisConcernes.mois',
          montantDu: { $first: '$moisConcernes.montantDu' },
          montantPaye: { $sum: '$moisConcernes.montantPaye' },
          montantRestant: { $sum: '$moisConcernes.montantRestant' }
        }}
      ],
      as: 'paiementsMensuels'
    }},
    { $project: {
      nomComplet: 1,
      cours: 1,
      mensualite: 1,
      fraisInscription: 1,
      fraisInscriptionMontantPaye: 1,
      fraisInscriptionPaye: 1,
      paiementsMensuels: 1
    }}
  ]);
};

// ========================================
// INDEXES
// ========================================

etudiantSchema.index({ email: 1 }, { unique: true });
etudiantSchema.index({ codeMassar: 1 }, { unique: true });
etudiantSchema.index({ cin: 1 }, { unique: true, sparse: true });
etudiantSchema.index({ hidden: 1 });
etudiantSchema.index({ actif: 1 });
etudiantSchema.index({ anneeScolaire: 1 });
etudiantSchema.index({ cours: 1 });

etudiantSchema.set('toObject', { virtuals: true });
etudiantSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Etudiant', etudiantSchema);