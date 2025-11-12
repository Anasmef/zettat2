// ============================================
// 1. MODEL - models/Rapport.js
// ============================================
const mongoose = require('mongoose');

const rapportSchema = new mongoose.Schema({
  professeur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Professeur', 
    required: true 
  },
  etudiant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Etudiant', 
    required: true 
  },
  cours: { 
    type: String, 
    required: true 
  },
  anneeScolaire: {
    type: String,
    required: true
  },
  niveau: {
    type: String,
    required: true
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  natureProbleme: { 
    type: [String], 
    default: [],
    enum: [
      'Devoirs non faits',
      'Indiscipline en classe',
      'Bavardage excessif',
      "Refus d'obéir",
      'Violence verbale / physique',
      'Retard ou absence répétée',
      'Autre'
    ]
  },
  autreProbleme: {
    type: String,
    trim: true
  },
  descriptionIncident: { 
    type: String, 
    trim: true,
    required: true
  },
  mesurePrise: { 
    type: [String], 
    default: [],
    enum: [
      'Observation / remarque orale',
      'Avertissement écrit',
      'Élève exclu temporairement du cours',
      'Communication avec les parents',
      'Autre'
    ]
  },
  autreMesure: {
    type: String,
    trim: true
  },
  observationProfesseur: { 
    type: String, 
    trim: true 
  },
  visaDirection: {
    type: Boolean,
    default: false
  },
  dateVisa: {
    type: Date
  },
  statut: {
    type: String,
    enum: ['en_attente', 'traite', 'archive'],
    default: 'en_attente'
  }
}, { timestamps: true });

// Index pour recherche rapide
rapportSchema.index({ professeur: 1, date: -1 });
rapportSchema.index({ etudiant: 1, date: -1 });
rapportSchema.index({ statut: 1 });

module.exports = mongoose.model('Rapport', rapportSchema);