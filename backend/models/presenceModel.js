const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  etudiant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Etudiant', 
    required: true 
  },

  cours: { 
    type: String, 
    required: true 
  },

  dateSession: { 
    type: Date, 
    required: true 
  },

  present: { 
    type: Boolean, 
    default: false 
  },

  retardMinutes: {
    type: Number,
    default: 0,
    min: 0,
    max: 60
  },

  remarque: { 
    type: String 
  },

  creePar: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin' 
  },

  heure: {
    type: String,
    required: false
  },

  periode: {
    type: String,
    enum: ['matin', 'soir'],
    required: true
  },
  
  matiere: { 
    type: String 
  },
  
  nomProfesseur: { 
    type: String 
  },

}, { timestamps: true });

// ✅ يمنع تكرار نفس الحضور
presenceSchema.index(
  { 
    etudiant: 1, 
    cours: 1, 
    dateSession: 1, 
    heure: 1, 
    periode: 1,
    creePar: 1
  },
  { unique: true }
);

module.exports = mongoose.model('Presence', presenceSchema);