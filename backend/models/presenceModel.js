const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'Etudiant', required: true },

  cours: { type: String, required: true }, // أو ObjectId إذا عدلت النظام

  dateSession: { type: Date, required: true },

  present: { type: Boolean, default: false },

    retardMinutes: {
    type: Number,
    default: 0,
    min: 0,
    max: 60 // Maximum 1 heure de retard
  },

  remarque: { type: String },

  creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

  // 🕒 الوقت الفعلي (hh:mm)
  heure: {
    type: String,
    required: false // يمكنك جعله مطلوب إذا أردت
  },

  // 🌅 matin أو soir
  periode: {
    type: String,
    enum: ['matin', 'soir'],
    required: true
  }
  ,matiere: { type: String },
nomProfesseur: { type: String },


}, { timestamps: true });

module.exports = mongoose.model('Presence', presenceSchema);
