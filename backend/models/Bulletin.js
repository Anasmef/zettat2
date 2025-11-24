const mongoose = require('mongoose');

const bulletinSchema = new mongoose.Schema({
  etudiant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Etudiant',
    required: true
  },
  professeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professeur',
    required: true
  },
  // ✅ Le cours (ex: "1AC Mathématiques", "2BAC Sciences")
  cours: {
    type: String,
    required: true
  },
  // ✅ La matière du professeur (automatique depuis Professeur.matiere)
  matiere: {
    type: String,
    required: true
  },
  semestre: {
    type: String,
    enum: ['S1', 'S2', 'Année'],
    default: 'S1',
    required: true
  },
  // ✅ Année scolaire (2024/2025)
  anneeScolaire: {
    type: String,
    required: true,
    validate: {
      validator: v => /^\d{4}\/\d{4}$/.test(v),
      message: "Format attendu: YYYY/YYYY (ex: 2024/2025)"
    }
  },
  
  // ✅ NOTES DÉTAILLÉES (système marocain)
  noteControleContinu: {
    type: Number,
    min: 0,
    max: 20,
    default: 0
  },
  noteExamen: {
    type: Number,
    min: 0,
    max: 20,
    default: 0
  },
  // Calcul automatique: (CC + Examen) / 2
  moyenneMatiere: {
    type: Number,
    min: 0,
    max: 20
  },
  
  remarque: {
    type: String,
    default: ''
  },
  
  // ✅ Absences pour cette matière
  nombreAbsences: {
    type: Number,
    default: 0,
    min: 0
  }
}, { 
  timestamps: true 
});

// ✅ INDEX UNIQUE: Un étudiant ne peut avoir qu'UNE SEULE note par matière/cours/semestre/année
// Cela permet à plusieurs profs de noter DIFFÉRENTES MATIÈRES pour le même cours
bulletinSchema.index(
  { etudiant: 1, cours: 1, matiere: 1, semestre: 1, anneeScolaire: 1 }, 
  { unique: true }
);

// ✅ Calcul automatique de la moyenne avant sauvegarde
bulletinSchema.pre('save', function(next) {
  if (this.noteControleContinu !== undefined && this.noteExamen !== undefined) {
    this.moyenneMatiere = parseFloat(((this.noteControleContinu + this.noteExamen) / 2).toFixed(2));
  }
  next();
});

// ✅ Méthode pour calculer la moyenne générale d'un étudiant pour un cours
bulletinSchema.statics.getMoyenneGenerale = async function(etudiantId, cours, semestre, anneeScolaire) {
  const bulletins = await this.find({ 
    etudiant: etudiantId, 
    cours,
    semestre, 
    anneeScolaire 
  });
  
  if (bulletins.length === 0) return 0;
  
  const somme = bulletins.reduce((acc, b) => acc + (b.moyenneMatiere || 0), 0);
  return parseFloat((somme / bulletins.length).toFixed(2));
};

// ✅ Méthode pour vérifier si l'étudiant est admis (moyenne >= 10)
bulletinSchema.statics.isAdmis = async function(etudiantId, cours, semestre, anneeScolaire) {
  const moyenne = await this.getMoyenneGenerale(etudiantId, cours, semestre, anneeScolaire);
  return moyenne >= 10;
};

// ✅ Récupérer le bulletin complet d'un étudiant pour un cours
bulletinSchema.statics.getBulletinComplet = async function(etudiantId, cours, semestre, anneeScolaire) {
  return await this.find({ 
    etudiant: etudiantId, 
    cours,
    semestre, 
    anneeScolaire 
  })
  .populate('professeur', 'nom matiere')
  .populate('etudiant', 'nomComplet')
  .sort({ matiere: 1 });
};

module.exports = mongoose.model('Bulletin', bulletinSchema);