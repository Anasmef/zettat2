// models/Etudiant.js
const mongoose = require('mongoose');

const etudiantSchema = new mongoose.Schema(
  {
    // Identité de l'étudiant
    nomComplet: { type: String, required: true, trim: true },
    genre: { type: String, enum: ['Homme', 'Femme'], required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    motDePasse: { type: String, required: true },
    dateNaissance: { type: Date, required: true },
    lieuNaissance: { type: String, required: true, trim: true },
    nationalite: { type: String, required: true, trim: true },

    // Scolarité (libre pour pouvoir ajouter des valeurs côté frontend)
    niveau: { type: String, required: true, trim: true },

    // Parents
    nomCompletPere: { type: String, required: true, trim: true },
    nomCompletMere: { type: String, required: true, trim: true },
    travailPere: { type: String, default: '', trim: true },
    travailMere: { type: String, default: '', trim: true },

    // Téléphones
    telephoneEtudiant: { type: String, required: true, trim: true },
    telephonePere: { type: String, default: '', trim: true },
    telephoneMere: { type: String, default: '', trim: true },

    // Code Massar
    codeMassar: { type: String, required: true, unique: true, trim: true },

    // Adresse
    adresse: { type: String, default: '', trim: true },

    // Transport scolaire
    transport: { type: Boolean, default: false },

    // Cours / options
    cours: { type: [String], default: [] },

    // Médias & statut
    image: { type: String, default: '' },
    actif: { type: Boolean, default: true },
    lastSeen: { type: Date, default: null },

    // Références
    creeParAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // Paiements
    prixTotal: { type: Number, default: 0, min: 0 },
    paye: { type: Boolean, default: false },
    pourcentageBourse: { type: Number, default: 0, min: 0, max: 100 },
    typePaiement: {
      type: String,
      enum: ['Cash', 'Virement', 'Chèque', 'En ligne'],
      default: 'Cash'
    },
    // Date du règlement (optionnelle) — on la renseigne quand on marque comme payé
    dateReglement: { type: String, default: null }, // format YYYY-MM-DD

    // Année scolaire (ex: 2025/2026)
    anneeScolaire: {
      type: String,
      required: true,
      validate: {
        validator: v => /^\d{4}\/\d{4}$/.test(v),
        message: "L'année scolaire doit être au format YYYY/YYYY (ex: 2025/2026)"
      }
    }
  },
  { timestamps: true }
);

// Virtuals utiles
etudiantSchema.virtual('nomCompletVirtuel').get(function () {
  return this.nomComplet || '';
});

etudiantSchema.virtual('telephone').get(function () {
  return this.telephoneEtudiant || '';
});

// Montant à payer après application de la bourse
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

// Méthodes d'instance
etudiantSchema.methods.marquerCommePaye = function () {
  this.paye = true;
  this.dateReglement = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return this.save();
};

etudiantSchema.methods.getMontantRestant = function () {
  return this.paye ? 0 : this.montantAPayer;
};

// Statistiques globales de paiement
etudiantSchema.statics.getStatistiquesPaiement = function () {
  return this.aggregate([
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

// Options d'export (inclure les virtuals)
etudiantSchema.set('toObject', { virtuals: true });
etudiantSchema.set('toJSON', { virtuals: true });

// Index conseillés
etudiantSchema.index({ email: 1 }, { unique: true });
etudiantSchema.index({ codeMassar: 1 }, { unique: true });

module.exports = mongoose.model('Etudiant', etudiantSchema);
