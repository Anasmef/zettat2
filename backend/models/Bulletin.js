const mongoose = require('mongoose');

const controleSchema = new mongoose.Schema({
  numero: { type: Number, required: true },
  note: { type: Number, min: 0, max: 20, default: 0 }
});

const bulletinSchema = new mongoose.Schema(
  {
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Etudiant',
      required: true
    },
    professeur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professeur',
      required: true
    },
    cours: { type: String, required: true },
    matiere: { type: String, required: true },
    niveau: { type: String, required: true },
    semestre: { type: String, enum: ['Premier semestre', 'Deuxième semestre'], default: 'Premier semestre' },
    anneeScolaire: { type: String, required: true },

    // Contrôles continus (dynamique)
    controles: [controleSchema],

    // Activités intégrées
    activitesIntegrees: { type: Number, min: 0, max: 20, default: 0 },

    // Absences
    nombreAbsences: { type: Number, default: 0 },

    // Signature
    signe: { type: Boolean, default: false },
    dateSignature: { type: Date, default: null },

    observations: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bulletin', bulletinSchema);
