// models/Notification.js
// ✅ Ce modèle est maintenant AUSSI la queue persistante (elle survit au redémarrage du serveur)
const mongoose = require('mongoose');

const STATUTS_DEST = ['en_attente', 'envoyé', 'échoué', 'expiré', 'annulé', 'ignoré'];
const STATUTS_GLOBAL = ['en_attente', 'en_cours', 'envoyé', 'partiellement_envoyé', 'échoué', 'expiré', 'annulé', 'ignoré'];

const notificationSchema = new mongoose.Schema(
  {
    etudiant:    { type: mongoose.Schema.Types.ObjectId, ref: 'Etudiant', required: true, index: true },
    nomEtudiant: { type: String, default: '' },   // ✅ pour construire le message sans populate

    type:   { type: String, enum: ['absence', 'retard', 'anniversaire'], required: true },
    cours:  { type: String, default: '', trim: true },       // texte affiché : "Maths, Physique"
    coursListe: { type: [String], default: [] },              // ✅ tous les cours regroupés dans ce message
    dateSession: { type: Date, required: true, index: true },
    jour:   { type: String, default: '' },        // 'YYYY-MM-DD' (fuseau Casablanca)

    // ✅ Séance : matin / soir
    periode: { type: String, enum: ['matin', 'soir', ''], default: '' },

    // ✅ Anti-doublon : étudiant|type|cours|jour|periode
    cle: { type: String },

    retardMinutes: { type: Number, default: 0, min: 0, max: 120 },
    remarque: { type: String, default: '', trim: true, maxlength: 500 },

    // ✅ Après cette date, on n'envoie PLUS (absence/retard: création + 1h, anniversaire: fin de journée)
    expireLe: { type: Date, index: true },

    // ✅ Dernier envoi réussi de cette notification (sert au délai de 30 min entre anniversaires)
    dernierEnvoiAt: { type: Date, default: null },

    destinataires: [{
      relation:  { type: String, enum: ['Père', 'Mère', 'Étudiant'], required: true },
      telephone: { type: String, required: true, trim: true },
      statut:    { type: String, enum: STATUTS_DEST, default: 'en_attente' },
      tentatives:    { type: Number, default: 0 },
      prochainEssai: { type: Date, default: Date.now },
      dateEnvoi: { type: Date, default: null },
      messageId: { type: String, default: null },
      erreur:    { type: String, default: null }
    }],

    creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Professeur', required: false },

    nbTentativesEnvoi: { type: Number, default: 0, min: 0 },
    derniereTentative: { type: Date, default: null },

    statutGlobal: { type: String, enum: STATUTS_GLOBAL, default: 'en_attente' }
  },
  { timestamps: true }
);

// ========================================
// INDEXES
// ========================================
// ✅ Unique seulement quand `cle` existe (les anciennes notifications sans cle ne posent pas de problème)
notificationSchema.index({ cle: 1 }, { unique: true, partialFilterExpression: { cle: { $type: 'string' } } });
notificationSchema.index({ statutGlobal: 1, expireLe: 1 });
notificationSchema.index({ type: 1, dernierEnvoiAt: -1 });
notificationSchema.index({ etudiant: 1, dateSession: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ creePar: 1, createdAt: -1 });

// ========================================
// VIRTUALS
// ========================================
const compter = (doc, s) => doc.destinataires.filter(d => d.statut === s).length;

notificationSchema.virtual('nbMessagesEnvoyes').get(function () { return compter(this, 'envoyé'); });
notificationSchema.virtual('nbMessagesEchoues').get(function () { return compter(this, 'échoué'); });
notificationSchema.virtual('nbMessagesEnAttente').get(function () { return compter(this, 'en_attente'); });
notificationSchema.virtual('tousEnvoyes').get(function () {
  return this.destinataires.length > 0 && this.destinataires.every(d => d.statut === 'envoyé');
});
notificationSchema.virtual('resume').get(function () {
  const dateTexte = this.dateSession.toLocaleDateString('fr-FR');
  if (this.type === 'anniversaire') return `Anniversaire - ${this.nomEtudiant} - ${dateTexte}`;
  const typeTexte = this.type === 'absence' ? 'Absence' : `Retard de ${this.retardMinutes} min`;
  return `${typeTexte} - ${this.cours} - ${dateTexte}${this.periode ? ' (' + this.periode + ')' : ''}`;
});
notificationSchema.virtual('tauxReussite').get(function () {
  const total = this.destinataires.length;
  return total === 0 ? 0 : Math.round((this.nbMessagesEnvoyes / total) * 100);
});

// ========================================
// MÉTHODES D'INSTANCE
// ========================================

/** Recalcule le statut global à partir des statuts des destinataires */
notificationSchema.methods.mettreAJourStatutGlobal = function () {
  const total = this.destinataires.length;
  const n = s => compter(this, s);
  const envoyes = n('envoyé');
  const attente = n('en_attente');
  const ignores = n('ignoré');

  if (total === 0) { this.statutGlobal = 'ignoré'; return; }

  if (attente > 0) {
    this.statutGlobal = (envoyes > 0 || n('échoué') > 0) ? 'en_cours' : 'en_attente';
  } else if (envoyes > 0) {
    this.statutGlobal = (total - envoyes - ignores === 0) ? 'envoyé' : 'partiellement_envoyé';
  } else if (n('expiré') > 0) {
    this.statutGlobal = 'expiré';
  } else if (n('annulé') > 0) {
    this.statutGlobal = 'annulé';
  } else if (n('échoué') > 0) {
    this.statutGlobal = 'échoué';
  } else {
    this.statutGlobal = 'ignoré';
  }
};

/** Clôturer tout ce qui est encore en attente ('expiré' ou 'annulé') */
notificationSchema.methods.cloturerEnAttente = function (statut, motif) {
  this.destinataires.forEach(d => {
    if (d.statut === 'en_attente') { d.statut = statut; d.erreur = motif; }
  });
  this.mettreAJourStatutGlobal();
};

/** Renvoi manuel par l'admin (expiré / annulé / échoué) avec une nouvelle fenêtre de validité */
notificationSchema.methods.relancer = function (dureeMs = 60 * 60 * 1000) {
  this.destinataires.forEach(d => {
    if (['expiré', 'annulé', 'échoué'].includes(d.statut)) {
      d.statut = 'en_attente';
      d.tentatives = 0;
      d.prochainEssai = new Date();
      d.erreur = null;
    }
  });
  this.expireLe = new Date(Date.now() + dureeMs);
  this.mettreAJourStatutGlobal();
  return this.save();
};

notificationSchema.methods.marquerEnvoye = function (telephone, messageId = null) {
  const d = this.destinataires.find(x => x.telephone === telephone);
  if (d) { d.statut = 'envoyé'; d.dateEnvoi = new Date(); d.messageId = messageId; d.erreur = null; }
  this.mettreAJourStatutGlobal();
  return this.save();
};

notificationSchema.methods.marquerEchoue = function (telephone, erreur) {
  const d = this.destinataires.find(x => x.telephone === telephone);
  if (d) { d.statut = 'échoué'; d.dateEnvoi = new Date(); d.erreur = erreur; }
  this.mettreAJourStatutGlobal();
  return this.save();
};

notificationSchema.methods.incrementerTentatives = function () {
  this.nbTentativesEnvoi += 1;
  this.derniereTentative = new Date();
  return this.save();
};

notificationSchema.methods.reessayerEchecs = function () {
  return this.relancer();
};

// ========================================
// MÉTHODES STATIQUES
// ========================================
notificationSchema.statics.getStatistiques = async function (professeurId, dateDebut, dateFin) {
  const match = { creePar: professeurId };
  if (dateDebut || dateFin) {
    match.dateSession = {};
    if (dateDebut) match.dateSession.$gte = new Date(dateDebut);
    if (dateFin) match.dateSession.$lte = new Date(dateFin);
  }
  const compte = statut => ({
    $sum: { $size: { $filter: { input: '$destinataires', as: 'dest', cond: { $eq: ['$$dest.statut', statut] } } } }
  });
  return this.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: 1 }, messagesEnvoyes: compte('envoyé'), messagesEchoues: compte('échoué') } },
    {
      $project: {
        _id: 0, type: '$_id', total: 1, messagesEnvoyes: 1, messagesEchoues: 1,
        tauxReussite: {
          $cond: [
            { $eq: [{ $add: ['$messagesEnvoyes', '$messagesEchoues'] }, 0] }, 0,
            { $multiply: [{ $divide: ['$messagesEnvoyes', { $add: ['$messagesEnvoyes', '$messagesEchoues'] }] }, 100] }
          ]
        }
      }
    }
  ]);
};

notificationSchema.statics.getNotificationsEchouees = function (professeurId, limite = 20) {
  return this.find({ creePar: professeurId, 'destinataires.statut': { $in: ['échoué', 'expiré'] } })
    .populate('etudiant', 'nomComplet niveau telephoneEtudiant telephonePere telephoneMere')
    .sort({ derniereTentative: 1 })
    .limit(limite);
};

notificationSchema.statics.getNotificationsEnAttente = function (limite = 50) {
  return this.find({ statutGlobal: { $in: ['en_attente', 'en_cours'] } })
    .populate('etudiant', 'nomComplet')
    .sort({ createdAt: 1 })
    .limit(limite);
};

notificationSchema.statics.getHistoriqueEtudiant = function (etudiantId, limite = 50) {
  return this.find({ etudiant: etudiantId }).populate('creePar', 'nom prenom').sort({ dateSession: -1 }).limit(limite);
};

notificationSchema.statics.getStatutsCount = async function (professeurId) {
  const match = professeurId ? { creePar: professeurId } : {};
  return this.aggregate([{ $match: match }, { $group: { _id: '$statutGlobal', count: { $sum: 1 } } }]);
};

// ========================================
// MIDDLEWARE
// ========================================
notificationSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('destinataires')) this.mettreAJourStatutGlobal();
  next();
});

notificationSchema.set('toObject', { virtuals: true });
notificationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);