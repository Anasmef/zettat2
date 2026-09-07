// models/PointageProf.js
const mongoose = require('mongoose');

const pointageProfSchema = new mongoose.Schema({
  professeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professeur',
    required: true
  },
  date: {
    type: String, // format "YYYY-MM-DD" pour grouper facilement par jour
    required: true
  },
  heureArrivee: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { timestamps: true });

// ✅ Plusieurs pointages par jour sont maintenant autorisés (matin + soir, entrée + sortie...)
// L'ancien index "unique" empêchait un 2e scan le même jour — on le retire.
// On garde un index (non-unique) pour accélérer les requêtes par professeur + date,
// et un autre pour retrouver rapidement le DERNIER scan d'un professeur (contrôle du cooldown 1h).
pointageProfSchema.index({ professeur: 1, date: 1 });
pointageProfSchema.index({ professeur: 1, heureArrivee: -1 });

module.exports = mongoose.model('PointageProf', pointageProfSchema);