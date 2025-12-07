// models/ListeNoire.js
const mongoose = require('mongoose');

const listeNoireSchema = new mongoose.Schema({
  etudiant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Etudiant',
    required: true
  },
  
  // Informations copiées pour historique
  nomComplet: { type: String, required: true },
  niveau: { type: String },
  cours: { type: [String], default: [] },
  email: { type: String },
  telephoneEtudiant: { type: String },
  
  // Type d'infraction
  motif: {
    type: String,
    enum: [
      'absences_excessives',
      'retards_frequents',
      'comportement_inapproprie',
      'violence',
      'indiscipline',
      'devoirs_non_faits',
      'manque_respect',
      'autre'
    ],
    required: true
  },
  
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Niveau de gravité
  gravite: {
    type: String,
    enum: ['leger', 'moyen', 'grave', 'tres_grave'],
    default: 'moyen'
  },
  
  // Compteurs d'infractions
  nombreAbsences: { type: Number, default: 0, min: 0 },
  nombreRetards: { type: Number, default: 0, min: 0 },
  nombreRapports: { type: Number, default: 0, min: 0 },
  
  // Sanction appliquée
  sanction: {
    type: String,
    enum: [
      'avertissement',
      'blame',
      'convocation_parents',
      'exclusion_1_jour',
      'exclusion_3_jours',
      'exclusion_1_semaine',
      'conseil_discipline',
      'exclusion_definitive'
    ],
    default: 'avertissement'
  },
  
  // Dates
  dateAjout: { type: Date, default: Date.now },
  dateInfraction: { type: Date, default: Date.now },
  dateResolution: { type: Date, default: null },
  
  // Statut
  statut: {
    type: String,
    enum: ['actif', 'resolu', 'en_cours', 'archive'],
    default: 'actif'
  },
  
  // Parents informés
  parentsInformes: { type: Boolean, default: false },
  dateInformationParents: { type: Date },
  
  // Suivi du comportement
  observations: [{
    date: { type: Date, default: Date.now },
    texte: { type: String },
    ajoutePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  }],
  
  // Résolution
  noteResolution: { type: String },
  resoluPar: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  
  // Qui a ajouté à la liste noire
  ajoutePar: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin',
    required: true 
  },
  
  // Année scolaire
  anneeScolaire: {
    type: String,
    default: '2025/2026'
  }
  
}, { timestamps: true });

// Index pour recherche rapide
listeNoireSchema.index({ etudiant: 1 });
listeNoireSchema.index({ statut: 1 });
listeNoireSchema.index({ gravite: 1 });
listeNoireSchema.index({ dateAjout: -1 });
listeNoireSchema.index({ anneeScolaire: 1 });

// Méthode pour résoudre un cas
listeNoireSchema.methods.resoudre = function(noteResolution, adminId) {
  this.statut = 'resolu';
  this.dateResolution = new Date();
  this.noteResolution = noteResolution;
  this.resoluPar = adminId;
  return this.save();
};

// Méthode pour ajouter une observation
listeNoireSchema.methods.ajouterObservation = function(texte, adminId) {
  this.observations.push({
    texte: texte,
    ajoutePar: adminId,
    date: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('ListeNoire', listeNoireSchema);