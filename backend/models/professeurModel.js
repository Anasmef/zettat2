const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const professeurSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    enum: ['Homme', 'Femme'],
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  motDePasse: {
    type: String,
    required: true
  },
  telephone: {
    type: String,
    required: false
  },
  dateNaissance: {
    type: Date,
    required: false
  },
  image: {
    type: String,
    default: ''
  },
  cin: {
  type: String,
  unique: true,
  required: true,
  trim: true
},
  actif: {
    type: Boolean,
    default: true
  },
  cours: {
    type: [String],
    default: []
  },
  matiere: {
    type: String,
    required: true
  },
  creeParAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  creeParInscripteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inscripteur',
    default: null
  },
  lastSeen: {
    type: Date,
    default: null
  },

  // ✅ NOUVEAUX CHAMPS POUR RETARDS ET ABSENCES
  retards: [{
    date: {
      type: Date,
      required: true
    },
    tempsRetard: {
      type: Number, // en minutes
      required: true
    },
    cours: {
      type: String,
      required: false
    },
    remarque: {
      type: String,
      default: ''
    },
    
    signalePar: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'retards.signaleParModel'
    },
    signaleParModel: {
      type: String,
      enum: ['Admin', 'Inscripteur']
    }
  }],

  absences: [{
    date: {
      type: Date,
      required: true
    },
    cours: {
      type: String,
      required: false
    },
    justifiee: {
      type: Boolean,
      default: false
    },
    raisonJustification: {
      type: String,
      default: ''
    },
    remarque: {
      type: String,
      default: ''
    },
    signalePar: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'absences.signaleParModel'
    },
    signaleParModel: {
      type: String,
      enum: ['Admin', 'Inscripteur']
    }
  }],

  // Statistiques calculées automatiquement
  statistiques: {
    totalRetards: {
      type: Number,
      default: 0
    },
    totalAbsences: {
      type: Number,
      default: 0
    },
    tempsRetardTotal: {
      type: Number, // en minutes
      default: 0
    },
    absencesJustifiees: {
      type: Number,
      default: 0
    },
    dernierRetard: {
      type: Date,
      default: null
    },
    derniereAbsence: {
      type: Date,
      default: null
    }
  }

}, { timestamps: true });

// ✅ MÉTHODES POUR GÉRER LES RETARDS ET ABSENCES

// Ajouter un retard
professeurSchema.methods.ajouterRetard = function(retardData) {
  this.retards.push(retardData);
  this.statistiques.totalRetards = this.retards.length;
  this.statistiques.tempsRetardTotal = this.retards.reduce((total, retard) => total + retard.tempsRetard, 0);
  this.statistiques.dernierRetard = retardData.date;
  return this.save();
};

// Ajouter une absence
professeurSchema.methods.ajouterAbsence = function(absenceData) {
  this.absences.push(absenceData);
  this.statistiques.totalAbsences = this.absences.length;
  this.statistiques.absencesJustifiees = this.absences.filter(abs => abs.justifiee).length;
  this.statistiques.derniereAbsence = absenceData.date;
  return this.save();
};

// Calculer les statistiques
professeurSchema.methods.calculerStatistiques = function() {
  this.statistiques.totalRetards = this.retards.length;
  this.statistiques.totalAbsences = this.absences.length;
  this.statistiques.tempsRetardTotal = this.retards.reduce((total, retard) => total + retard.tempsRetard, 0);
  this.statistiques.absencesJustifiees = this.absences.filter(abs => abs.justifiee).length;
  
  if (this.retards.length > 0) {
    this.statistiques.dernierRetard = this.retards[this.retards.length - 1].date;
  }
  if (this.absences.length > 0) {
    this.statistiques.derniereAbsence = this.absences[this.absences.length - 1].date;
  }
  
  return this.save();
};

// Méthode pour comparer le mot de passe
professeurSchema.methods.comparePassword = function (mot) {
  return bcrypt.compare(mot, this.motDePasse);
};

// Middleware pour calculer automatiquement les stats avant sauvegarde
professeurSchema.pre('save', function(next) {
  if (this.isModified('retards') || this.isModified('absences')) {
    this.statistiques.totalRetards = this.retards.length;
    this.statistiques.totalAbsences = this.absences.length;
    this.statistiques.tempsRetardTotal = this.retards.reduce((total, retard) => total + retard.tempsRetard, 0);
    this.statistiques.absencesJustifiees = this.absences.filter(abs => abs.justifiee).length;
    
    if (this.retards.length > 0) {
      this.statistiques.dernierRetard = this.retards[this.retards.length - 1].date;
    }
    if (this.absences.length > 0) {
      this.statistiques.derniereAbsence = this.absences[this.absences.length - 1].date;
    }
  }
  next();
});

module.exports = mongoose.model('Professeur', professeurSchema);