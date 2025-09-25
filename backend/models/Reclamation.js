const mongoose = require('mongoose');

const reclamationSchema = new mongoose.Schema({
  // Référence au professeur qui fait la réclamation
  professeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professeur',
    required: true
  },
  
  // Référence à l'étudiant concerné par la réclamation
  etudiant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Etudiant',
    required: true
  },
  
  // Type de réclamation
  typeReclamation: {
    type: String,
    enum: [
      'Comportement perturbateur',
      'Retards répétés', 
      'Absences non justifiées',
      'Non respect des règles',
      'Problème de discipline',
      'Travail non rendu',
      'Autre'
    ],
    required: true
  },
  
  // Cours concerné
  cours: {
    type: String,
    required: true
  },
  
  // Date de l'incident
  dateIncident: {
    type: Date,
    required: true
  },
  
  // Niveau de priorité
  priorite: {
    type: String,
    enum: ['Faible', 'Moyenne', 'Élevée', 'Urgente'],
    default: 'Moyenne'
  },
  
  // Description détaillée
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000
  },
  
  // Mesures déjà prises par le professeur (optionnel)
  mesuresPrises: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Statut de la réclamation
  statut: {
    type: String,
    enum: ['En attente', 'En cours', 'Résolue', 'Fermée'],
    default: 'En attente'
  },
  
  // Réponse de l'administration
  reponseAdmin: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  
  // Admin qui a traité la réclamation
  traitePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // Date de traitement
  dateTraitement: {
    type: Date,
    default: null
  },
  
  // Actions prises par l'admin
  actionsPrises: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Pièces jointes (photos, documents)
  pieceJointe: {
    type: String,
    default: ''
  },
  
  // Historique des modifications
  historique: [{
    action: {
      type: String,
      required: true
    },
    utilisateur: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String,
      default: ''
    }
  }]
  
}, { timestamps: true });

// Index pour optimiser les requêtes
reclamationSchema.index({ professeur: 1, statut: 1 });
reclamationSchema.index({ etudiant: 1 });
reclamationSchema.index({ dateIncident: -1 });
reclamationSchema.index({ statut: 1, priorite: 1 });

// Méthode pour ajouter une entrée à l'historique
reclamationSchema.methods.ajouterHistorique = function(action, utilisateur, details = '') {
  this.historique.push({
    action,
    utilisateur,
    details,
    date: new Date()
  });
  return this.save();
};

// Méthode pour marquer comme traitée
reclamationSchema.methods.marquerCommeTraitee = function(adminId, reponse, actions = '') {
  this.statut = 'Résolue';
  this.traitePar = adminId;
  this.dateTraitement = new Date();
  this.reponseAdmin = reponse;
  this.actionsPrises = actions;
  
  // Ajouter à l'historique
  this.historique.push({
    action: 'Réclamation résolue',
    utilisateur: 'Admin',
    details: `Réponse: ${reponse.substring(0, 50)}...`,
    date: new Date()
  });
  
  return this.save();
};

// Statistiques pour l'admin
reclamationSchema.statics.getStatistiques = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        statuts: {
          $push: {
            statut: '$_id',
            count: '$count'
          }
        }
      }
    }
  ]);
};

// Statistiques par professeur
reclamationSchema.statics.getStatistiquesParProfesseur = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'professeurs',
        localField: 'professeur',
        foreignField: '_id',
        as: 'professeurInfo'
      }
    },
    {
      $unwind: '$professeurInfo'
    },
    {
      $group: {
        _id: '$professeur',
        nomProfesseur: { $first: '$professeurInfo.nom' },
        totalReclamations: { $sum: 1 },
        enAttente: {
          $sum: { $cond: [{ $eq: ['$statut', 'En attente'] }, 1, 0] }
        },
        resolues: {
          $sum: { $cond: [{ $eq: ['$statut', 'Résolue'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { totalReclamations: -1 }
    }
  ]);
};

// Middleware pour ajouter automatiquement l'historique lors de la création
reclamationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.historique.push({
      action: 'Réclamation créée',
      utilisateur: 'Professeur',
      details: `Type: ${this.typeReclamation}`,
      date: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('Reclamation', reclamationSchema);