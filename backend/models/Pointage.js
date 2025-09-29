const mongoose = require('mongoose');

// Schéma pour les pointages
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
  heure: {
    type: String, // Format: "HH:MM"
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  codeQRId: {
    type: String,
    required: true
  },
  statut: {
    type: String,
    enum: ['présent', 'retard'],
    default: 'présent'
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

// Schéma pour les QR codes
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
  validiteMinutes: {
    type: Number,
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

// Index pour l'expiration automatique
qrCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
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