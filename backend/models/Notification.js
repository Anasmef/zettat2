// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Référence vers l'étudiant concerné
    etudiant: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Etudiant', 
      required: true,
      index: true
    },

    // Type de notification
    type: { 
      type: String, 
      enum: ['absence', 'retard'], 
      required: true 
    },

    // Informations sur la session
    cours: { 
      type: String, 
      required: true,
      trim: true
    },

    dateSession: { 
      type: Date, 
      required: true,
      index: true
    },

    // Spécifique au retard
    retardMinutes: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 120
    },

    // Remarque optionnelle du professeur
    remarque: { 
      type: String, 
      default: '',
      trim: true,
      maxlength: 500
    },

    // Liste des destinataires et statut d'envoi
    destinataires: [{
      relation: { 
        type: String, 
        enum: ['Père', 'Mère', 'Étudiant'],
        required: true
      },
      telephone: {
        type: String,
        required: true,
        trim: true
      },
      statut: { 
        type: String, 
        enum: ['envoyé', 'échoué', 'en_attente'], 
        default: 'en_attente' 
      },
      dateEnvoi: { 
        type: Date, 
        default: null 
      },
      messageId: {
        type: String,
        default: null
      },
      erreur: {
        type: String,
        default: null
      }
    }],

    // Référence vers le professeur qui a créé la notification
    creePar: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Professeur', 
      required: false 
    },

    // Métadonnées
    nbTentativesEnvoi: {
      type: Number,
      default: 0,
      min: 0
    },

    derniereTentative: {
      type: Date,
      default: null
    },

    statutGlobal: {
      type: String,
      enum: ['en_attente', 'en_cours', 'envoyé', 'partiellement_envoyé', 'échoué'],
      default: 'en_attente'
    }
  },
  { 
    timestamps: true // Ajoute automatiquement createdAt et updatedAt
  }
);

// ========================================
// INDEXES POUR OPTIMISER LES REQUÊTES
// ========================================
notificationSchema.index({ etudiant: 1, dateSession: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ creePar: 1, createdAt: -1 });
notificationSchema.index({ 'destinataires.statut': 1 });
notificationSchema.index({ statutGlobal: 1 });

// ========================================
// VIRTUALS
// ========================================

// Obtenir le nombre de messages envoyés avec succès
notificationSchema.virtual('nbMessagesEnvoyes').get(function() {
  return this.destinataires.filter(d => d.statut === 'envoyé').length;
});

// Obtenir le nombre de messages échoués
notificationSchema.virtual('nbMessagesEchoues').get(function() {
  return this.destinataires.filter(d => d.statut === 'échoué').length;
});

// Obtenir le nombre de messages en attente
notificationSchema.virtual('nbMessagesEnAttente').get(function() {
  return this.destinataires.filter(d => d.statut === 'en_attente').length;
});

// Vérifier si tous les messages ont été envoyés
notificationSchema.virtual('tousEnvoyes').get(function() {
  return this.destinataires.length > 0 && 
         this.destinataires.every(d => d.statut === 'envoyé');
});

// Obtenir un résumé textuel
notificationSchema.virtual('resume').get(function() {
  const typeTexte = this.type === 'absence' ? 'Absence' : `Retard de ${this.retardMinutes} min`;
  const dateTexte = this.dateSession.toLocaleDateString('fr-FR');
  return `${typeTexte} - ${this.cours} - ${dateTexte}`;
});

// Taux de réussite en pourcentage
notificationSchema.virtual('tauxReussite').get(function() {
  const total = this.destinataires.length;
  if (total === 0) return 0;
  const envoyes = this.nbMessagesEnvoyes;
  return Math.round((envoyes / total) * 100);
});

// ========================================
// MÉTHODES D'INSTANCE
// ========================================

/**
 * Marquer un destinataire comme envoyé
 */
notificationSchema.methods.marquerEnvoye = function(telephone, messageId = null) {
  const destinataire = this.destinataires.find(d => d.telephone === telephone);
  if (destinataire) {
    destinataire.statut = 'envoyé';
    destinataire.dateEnvoi = new Date();
    destinataire.messageId = messageId;
    destinataire.erreur = null;
  }
  this.mettreAJourStatutGlobal();
  return this.save();
};

/**
 * Marquer un destinataire comme échoué
 */
notificationSchema.methods.marquerEchoue = function(telephone, erreur) {
  const destinataire = this.destinataires.find(d => d.telephone === telephone);
  if (destinataire) {
    destinataire.statut = 'échoué';
    destinataire.dateEnvoi = new Date();
    destinataire.erreur = erreur;
  }
  this.mettreAJourStatutGlobal();
  return this.save();
};

/**
 * Incrémenter le nombre de tentatives
 */
notificationSchema.methods.incrementerTentatives = function() {
  this.nbTentativesEnvoi += 1;
  this.derniereTentative = new Date();
  return this.save();
};

/**
 * Mettre à jour le statut global selon les destinataires
 */
notificationSchema.methods.mettreAJourStatutGlobal = function() {
  const nbTotal = this.destinataires.length;
  const nbEnvoyes = this.nbMessagesEnvoyes;
  const nbEchoues = this.nbMessagesEchoues;
  const nbEnAttente = this.nbMessagesEnAttente;

  if (nbEnAttente === nbTotal) {
    this.statutGlobal = 'en_attente';
  } else if (nbEnvoyes === nbTotal) {
    this.statutGlobal = 'envoyé';
  } else if (nbEchoues === nbTotal) {
    this.statutGlobal = 'échoué';
  } else if (nbEnvoyes > 0 || nbEchoues > 0) {
    this.statutGlobal = nbEnAttente > 0 ? 'en_cours' : 'partiellement_envoyé';
  }
};

/**
 * Réinitialiser les destinataires échoués pour réessayer
 */
notificationSchema.methods.reessayerEchecs = function() {
  this.destinataires.forEach(d => {
    if (d.statut === 'échoué') {
      d.statut = 'en_attente';
      d.erreur = null;
    }
  });
  this.mettreAJourStatutGlobal();
  return this.save();
};

// ========================================
// MÉTHODES STATIQUES
// ========================================

/**
 * Obtenir les statistiques de notifications par type
 */
notificationSchema.statics.getStatistiques = async function(professeurId, dateDebut, dateFin) {
  const match = { creePar: professeurId };
  
  if (dateDebut || dateFin) {
    match.dateSession = {};
    if (dateDebut) match.dateSession.$gte = new Date(dateDebut);
    if (dateFin) match.dateSession.$lte = new Date(dateFin);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        messagesEnvoyes: { 
          $sum: { 
            $size: {
              $filter: {
                input: '$destinataires',
                as: 'dest',
                cond: { $eq: ['$$dest.statut', 'envoyé'] }
              }
            }
          }
        },
        messagesEchoues: {
          $sum: {
            $size: {
              $filter: {
                input: '$destinataires',
                as: 'dest',
                cond: { $eq: ['$$dest.statut', 'échoué'] }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        type: '$_id',
        total: 1,
        messagesEnvoyes: 1,
        messagesEchoues: 1,
        tauxReussite: {
          $cond: [
            { $eq: [{ $add: ['$messagesEnvoyes', '$messagesEchoues'] }, 0] },
            0,
            {
              $multiply: [
                {
                  $divide: [
                    '$messagesEnvoyes',
                    { $add: ['$messagesEnvoyes', '$messagesEchoues'] }
                  ]
                },
                100
              ]
            }
          ]
        }
      }
    }
  ]);
};

/**
 * Obtenir les notifications échouées à renvoyer
 */
notificationSchema.statics.getNotificationsEchouees = function(professeurId, limite = 20) {
  return this.find({
    creePar: professeurId,
    'destinataires.statut': 'échoué',
    nbTentativesEnvoi: { $lt: 3 } // Maximum 3 tentatives
  })
    .populate('etudiant', 'nomComplet niveau telephoneEtudiant telephonePere telephoneMere')
    .sort({ derniereTentative: 1 })
    .limit(limite);
};

/**
 * Obtenir les notifications en attente
 */
notificationSchema.statics.getNotificationsEnAttente = function(limite = 50) {
  return this.find({
    statutGlobal: { $in: ['en_attente', 'en_cours'] }
  })
    .populate('etudiant', 'nomComplet')
    .sort({ createdAt: 1 })
    .limit(limite);
};

/**
 * Obtenir l'historique des notifications d'un étudiant
 */
notificationSchema.statics.getHistoriqueEtudiant = function(etudiantId, limite = 50) {
  return this.find({ etudiant: etudiantId })
    .populate('creePar', 'nom prenom')
    .sort({ dateSession: -1 })
    .limit(limite);
};

/**
 * Obtenir le nombre de notifications par statut
 */
notificationSchema.statics.getStatutsCount = async function(professeurId) {
  const match = professeurId ? { creePar: professeurId } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$statutGlobal',
        count: { $sum: 1 }
      }
    }
  ]);
};

// ========================================
// MIDDLEWARE
// ========================================

// Mettre à jour le statut global avant la sauvegarde
notificationSchema.pre('save', function(next) {
  if (this.isModified('destinataires')) {
    this.mettreAJourStatutGlobal();
  }
  next();
});

// ========================================
// CONFIGURATION
// ========================================

// Inclure les virtuals dans les conversions JSON et Object
notificationSchema.set('toObject', { virtuals: true });
notificationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);