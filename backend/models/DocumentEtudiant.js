// models/DocumentEtudiant.js
const mongoose = require('mongoose');

/*
  Un seul modele pour les 3 types de documents.
  Chaque document est lie a un etudiant + un type + son contenu (data),
  avec un historique des versions precedentes.
*/

const historiqueSchema = new mongoose.Schema({
  data: { type: mongoose.Schema.Types.Mixed },
  modifiePar: { type: String },       // nom de l'admin/manager qui a modifie
  modifieParRole: { type: String },   // 'admin' ou 'manager'
  dateModification: { type: Date, default: Date.now }
}, { _id: false });

const documentEtudiantSchema = new mongoose.Schema(
  {
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Etudiant',
      required: true
    },

    type: {
      type: String,
      enum: ['inscription', 'reglement', 'sante'],
      required: true
    },

    // Contenu du formulaire (structure libre selon le type, voir plus bas)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    complet: {
      type: Boolean,
      default: false
    },

    dernierModifiePar: { type: String, default: '' },
    dernierModifieParRole: { type: String, default: '' },

    // Historique des versions precedentes (avant chaque modification)
    historique: {
      type: [historiqueSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Un seul document par (etudiant, type)
documentEtudiantSchema.index({ etudiant: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('DocumentEtudiant', documentEtudiantSchema);

/*
  ============================================================
  STRUCTURE SUGGEREE DU CHAMP "data" SELON LE TYPE
  ============================================================

  type: 'inscription' (Demande de pre-inscription)
  {
    niveauDemande: "1AC",              // pre-rempli depuis Etudiant
    rangFratrie: "1er",
    ecoleFrequentee: "",
    classeFrequentee: "",
    pereNom: "", pereNationalite: "", pereFonction: "",
    pereTelPortable: "", pereTelDomicile: "", pereEmail: "",
    mereNom: "", mereNationalite: "", mereFonction: "",
    mereTelPortable: "", mereTelDomicile: "", mereEmail: "",
    tuteurNom: "", tuteurTelPortable: "", tuteurTelDomicile: "",
    tuteurLienParente: "", tuteurEmail: "",
    transportScolaire: false,
    quartier: "",
    dateSignature: null
  }

  type: 'reglement' (Engagement au reglement interieur)
  {
    nomSignataire: "",       // nom du pere/mere/tuteur qui signe
    accepte: false,          // case "j'ai pris connaissance..."
    dateSignature: null,
    signatureImage: ""       // optionnel: signature electronique en base64
  }

  type: 'sante' (Fiche de sante)
  {
    contactUrgenceNom: "",
    contactUrgenceLien: "",
    contactUrgenceTel: "",
    asthme: false, diabete: false, ellipse: false, migraine: false,
    hernie: false, varicelle: false, rougeole: false,
    troubleComportement: false, troubleComportementType: "", // 'opposition' | 'agressivite'
    troubleAttention: false, troubleAttentionType: "",       // 'avec' | 'sans' hyperactivite
    santeMentale: "",
    autre: "",
    hospitalise: false, hospitaliseDate: null, hospitaliseDescription: "",
    suiviProfessionnel: false, suiviProfessionnelDetails: ""
  }
*/