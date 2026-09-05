// models/PointageProf.js
const mongoose = require('mongoose');

const pointageProfSchema = new mongoose.Schema({
  professeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professeur',
    required: true
  },
  date: {
    type: String, // format "YYYY-MM-DD" pour grouper facilement par jour
    required: true
  },
  heureArrivee: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { timestamps: true });

// Un seul pointage par professeur par jour
pointageProfSchema.index({ professeur: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PointageProf', pointageProfSchema);