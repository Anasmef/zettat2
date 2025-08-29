const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const inscripteurSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  motDePasse: {
    type: String,
    required: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  creeParAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Méthode pour comparer le mot de passe
inscripteurSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.motDePasse);
};

module.exports = mongoose.model('Inscripteur', inscripteurSchema);