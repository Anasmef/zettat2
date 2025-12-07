// models/Etudiant.js
const mongoose = require('mongoose');

const etudiantSchema = new mongoose.Schema(
  {
    // ... tous les champs existants ...
    nomComplet: { type: String, required: true, trim: true },
    genre: { type: String, enum: ['Homme', 'Femme'], trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    motDePasse: { type: String },
    autorise: { type: Boolean, default: false },
    dateNaissance: { type: Date },
    lieuNaissance: { type: String, trim: true },
    nationalite: { type: String, trim: true },
    hidden: { type: Boolean, default: false }, // ✅ Champ hidden
    cin: { 
      type: String, 
      unique: true, 
      sparse: true,
      trim: true 
    },
    niveau: { type: String, trim: true },
    nomCompletPere: { type: String, trim: true },
    nomCompletMere: { type: String, trim: true },
    travailPere: { type: String, default: '', trim: true },
    travailMere: { type: String, default: '', trim: true },
    telephoneEtudiant: { type: String, trim: true },
    telephonePere: { type: String, default: '', trim: true },
    telephoneMere: { type: String, default: '', trim: true },
    codeMassar: { type: String, unique: true, trim: true },
    adresse: { type: String, default: '', trim: true },
    transport: { type: Boolean, default: false },
    cours: { type: [String], default: [] },
    image: { type: String, default: '' },
    actif: { type: Boolean, default: true },
    lastSeen: { type: Date, default: null },
    creeParAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    creeParInscripteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inscripteur',
      default: null
    },
    prixTotal: { type: Number, default: 0, min: 0 },
    paye: { type: Boolean, default: false },
    pourcentageBourse: { type: Number, default: 0, min: 0, max: 100 },
    typePaiement: {
      type: String,
      enum: ['Cash', 'Virement', 'Chèque', 'En ligne'],
      default: 'Cash'
    },
    dateReglement: { type: String, default: null },
    anneeScolaire: {
      type: String,
      validate: {
        validator: v => /^\d{4}\/\d{4}$/.test(v),
        message: "L'année scolaire doit être au format YYYY/YYYY (ex: 2025/2026)"
      }
    }
  },
  { timestamps: true }
);

// ========================================
// ✅ MÉTHODES STATIQUES POUR FILTRER HIDDEN
// ========================================

// 🔹 Méthode 1 : Obtenir SEULEMENT les étudiants VISIBLES (hidden = false)
etudiantSchema.statics.findVisible = function(filter = {}) {
  return this.find({ ...filter, hidden: { $ne: true } })
    .populate('creeParAdmin', 'nom prenom')
    .populate('creeParInscripteur', 'nom prenom')
    .sort({ createdAt: -1 });
};

// 🔹 Méthode 2 : Obtenir SEULEMENT les étudiants CACHÉS (hidden = true)
etudiantSchema.statics.findHidden = function(filter = {}) {
  return this.find({ ...filter, hidden: true })
    .populate('creeParAdmin', 'nom prenom')
    .populate('creeParInscripteur', 'nom prenom')
    .sort({ updatedAt: -1 });
};

// 🔹 Méthode 3 : Archiver un étudiant (soft delete)
etudiantSchema.methods.archiver = function() {
  this.hidden = true;
  this.cours = [];
  this.actif = false;
  return this.save();
};

// 🔹 Méthode 4 : Restaurer un étudiant archivé
etudiantSchema.methods.restaurer = function() {
  this.hidden = false;
  this.actif = true;
  // NE PAS restaurer les cours automatiquement
  return this.save();
};

// ========================================
// Virtuals existants
// ========================================
etudiantSchema.virtual('nomCompletVirtuel').get(function () {
  return this.nomComplet || '';
});

etudiantSchema.virtual('telephone').get(function () {
  return this.telephoneEtudiant || '';
});

etudiantSchema.virtual('montantAPayer').get(function () {
  const reduction = (this.prixTotal * this.pourcentageBourse) / 100;
  return Math.max(0, this.prixTotal - reduction);
});

etudiantSchema.virtual('statutPaiement').get(function () {
  if (this.paye) return 'Payé';
  if (this.prixTotal === 0) return 'Gratuit';
  return 'En attente';
});

// Méthodes existantes
etudiantSchema.methods.marquerCommePaye = function () {
  this.paye = true;
  this.dateReglement = new Date().toISOString().split('T')[0];
  return this.save();
};

etudiantSchema.methods.getMontantRestant = function () {
  return this.paye ? 0 : this.montantAPayer;
};

etudiantSchema.statics.getStatistiquesPaiement = function () {
  return this.aggregate([
    // ✅ IMPORTANT : Exclure les hidden des statistiques
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
        pourcentagePaiement: {
          $cond: [
            { $eq: ['$totalEtudiants', 0] },
            0,
            { $multiply: [{ $divide: ['$etudiantsPayes', '$totalEtudiants'] }, 100] }
          ]
        }
      }
    }
  ]);
};

etudiantSchema.set('toObject', { virtuals: true });
etudiantSchema.set('toJSON', { virtuals: true });

etudiantSchema.index({ email: 1 }, { unique: true });
etudiantSchema.index({ codeMassar: 1 }, { unique: true });
etudiantSchema.index({ hidden: 1 }); // ✅ Index pour améliorer les performances

module.exports = mongoose.model('Etudiant', etudiantSchema);