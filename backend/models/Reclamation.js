// models/Reclamation.js
const mongoose = require('mongoose');

const reclamationSchema = new mongoose.Schema({
  // Référence vers le professeur qui fait la réclamation
  professeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professeur',
    required: true
  },
  
  // Référence vers l'étudiant concerné
  etudiant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Etudiant',
    required: true
  },
  
  // Le cours dans lequel s'est produit l'incident
  cours: {
    type: String,
    required: true
  },
  
  // Type de réclamation
  typeReclamation: {
    type: String,
    required: true,
    enum: [
      'Étudiant absent',
      'Mauvais comportement', 
      'Étudiant qui dort',
      'Retards répétés',
      'Non respect des règles',
      'Problème de discipline',
      'Travail non rendu',
      'Utilisation de téléphone',
      'Perturbation du cours',
      'Manque de respect',
      'Autre'
    ]
  },
  
  // Date de l'incident
  dateIncident: {
    type: Date,
    required: true
  },
  
  // Priorité de la réclamation
  priorite: {
    type: String,
    enum: ['Faible', 'Moyenne', 'Élevée', 'Urgente'],
    default: 'Moyenne'
  },
  
  // Description détaillée (optionnelle)
  description: {
    type: String,
    trim: true
  },
  
  // Statut de la réclamation
  statut: {
    type: String,
    enum: ['En attente', 'En cours de traitement', 'Résolue', 'Fermée'],
    default: 'En attente'
  },
  
  // Commentaire de l'admin (optionnel)
  commentaireAdmin: {
    type: String,
    trim: true
  },
  
  // Date de traitement par l'admin
  dateTraitement: {
    type: Date
  },
  
  // Admin qui a traité la réclamation
  adminTraitant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

// Index pour optimiser les requêtes
reclamationSchema.index({ professeur: 1, createdAt: -1 });
reclamationSchema.index({ etudiant: 1, createdAt: -1 });
reclamationSchema.index({ statut: 1, createdAt: -1 });
reclamationSchema.index({ priorite: 1, createdAt: -1 });

// Méthode pour obtenir le label de priorité avec couleur
reclamationSchema.methods.getPrioriteInfo = function() {
  const prioriteMap = {
    'Faible': { label: 'Faible', color: '#10b981' },
    'Moyenne': { label: 'Moyenne', color: '#f59e0b' },
    'Élevée': { label: 'Élevée', color: '#f97316' },
    'Urgente': { label: 'Urgente', color: '#ef4444' }
  };
  return prioriteMap[this.priorite] || prioriteMap['Moyenne'];
};

// Méthode pour obtenir le statut avec couleur
reclamationSchema.methods.getStatutInfo = function() {
  const statutMap = {
    'En attente': { label: 'En attente', color: '#6b7280' },
    'En cours de traitement': { label: 'En cours', color: '#f59e0b' },
    'Résolue': { label: 'Résolue', color: '#10b981' },
    'Fermée': { label: 'Fermée', color: '#374151' }
  };
  return statutMap[this.statut] || statutMap['En attente'];
};

// Middleware pré-sauvegarde pour validation
reclamationSchema.pre('save', function(next) {
  // Si le statut change vers "Résolue" ou "Fermée", enregistrer la date de traitement
  if (this.isModified('statut') && (this.statut === 'Résolue' || this.statut === 'Fermée')) {
    this.dateTraitement = new Date();
  }
  next();
});

module.exports = mongoose.model('Reclamation', reclamationSchema);