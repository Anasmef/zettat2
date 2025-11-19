const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const parentSchema = new mongoose.Schema(
  {
    // Identité du parent
    nomComplet: {
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
    
    telephone: {
      type: String,
      trim: true
    },
    
    // Relation avec les étudiants (plusieurs enfants possibles)
    enfants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Etudiant'
    }],
    
    // Statut du compte
    actif: {
      type: Boolean,
      default: true
    },
    
    // Dernière connexion
    lastSeen: {
      type: Date,
      default: null
    },
    
    // Créé par quel admin
    creeParAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  { timestamps: true }
);

// Hash du mot de passe avant sauvegarde
parentSchema.pre('save', async function(next) {
  if (!this.isModified('motDePasse')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Méthode pour comparer les mots de passe
parentSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.motDePasse);
  } catch (err) {
    throw err;
  }
};

// Méthode pour retourner un objet sécurisé (sans mot de passe)
parentSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.motDePasse;
  return obj;
};

// Index
parentSchema.index({ email: 1 });
parentSchema.index({ enfants: 1 });

module.exports = mongoose.model('Parent', parentSchema);