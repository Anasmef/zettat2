const mongoose = require('mongoose');

// Schéma pour les pointages - AVEC ENTRÉE ET SORTIE
const pointageSchema = new mongoose.Schema({
  professeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professeur',
    required: true
  },
  nomProfesseur: {
    type: String,
    required: true
  },
  emailProfesseur: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  // ✅ ENTRÉE
  heureEntree: {
    type: String, // Format: "HH:MM"
    required: true
  },
  timestampEntree: {
    type: Date,
    default: Date.now
  },
  // ✅ SORTIE
  heureSortie: {
    type: String, // Format: "HH:MM"
    default: null
  },
  timestampSortie: {
    type: Date,
    default: null
  },
  // ✅ STATUT SIMPLIFIÉ
  statut: {
    type: String,
    enum: ['présent', 'absent'], // Plus de retard
    default: 'présent'
  },
  // Temps de présence en minutes (calculé automatiquement)
  tempsPresence: {
    type: Number, // en minutes
    default: 0
  },
  codeQRId: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  }
}, { timestamps: true });

// Index pour optimiser les recherches
pointageSchema.index({ date: 1, professeur: 1 });
pointageSchema.index({ professeur: 1, date: -1 });
pointageSchema.index({ codeQRId: 1 });

// Méthode pour calculer le temps de présence
pointageSchema.methods.calculerTempsPresence = function() {
  if (this.timestampSortie && this.timestampEntree) {
    const diffMs = this.timestampSortie - this.timestampEntree;
    return Math.floor(diffMs / (1000 * 60)); // en minutes
  }
  return 0;
};

// Schéma pour les QR codes - UN PAR JOUR valable 20H
const qrCodeSchema = new mongoose.Schema({
  qrId: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: 'Pointage du jour'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  // ✅ Date du jour (pour UN SEUL QR par jour)
  dateJour: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  // ✅ Validité fixe: 20 heures
  validiteMinutes: {
    type: Number,
    default: 1200, // 20 heures = 1200 minutes
    required: true
  },
  scansCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dataURL: {
    type: String,
    required: true
  },
  scanUrl: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Index unique pour UN SEUL QR CODE par jour
qrCodeSchema.index({ dateJour: 1 }, { unique: true });
qrCodeSchema.index({ qrId: 1 });
qrCodeSchema.index({ createdBy: 1 });

// Méthode pour vérifier si le QR code est encore valide
qrCodeSchema.methods.isValid = function() {
  return this.isActive && new Date() < this.expiresAt;
};

// Méthode pour calculer le temps restant en minutes
qrCodeSchema.methods.getTimeRemaining = function() {
  const now = new Date();
  const remaining = Math.max(0, this.expiresAt - now);
  return Math.floor(remaining / (1000 * 60));
};

const Pointage = mongoose.model('Pointage', pointageSchema);
const QRCode = mongoose.model('QRCode', qrCodeSchema);

module.exports = { Pointage, QRCode };