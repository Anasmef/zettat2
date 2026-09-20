// models/NumeroBloque.js
// ✅ Registre des numéros qui ne marchent pas (pas de WhatsApp, refus répétés...)
// Un numéro bloqué est SKIPPÉ automatiquement : on ne perd plus de temps dessus.
const mongoose = require('mongoose');

const numeroBloqueSchema = new mongoose.Schema(
  {
    telephone:    { type: String, required: true, unique: true, index: true }, // format normalisé 212XXXXXXXXX
    raison:       { type: String, default: '' },
    nbEchecs:     { type: Number, default: 0 },   // échecs cumulés avant blocage
    bloqueJusqua: { type: Date, default: null },  // null = pas encore bloqué
    dernierEchec: { type: Date, default: null }
  },
  { timestamps: true }
);

// Le numéro est-il actuellement bloqué ? (retourne le document ou null)
numeroBloqueSchema.statics.estBloque = async function (telephone) {
  const d = await this.findOne({ telephone });
  if (d && d.bloqueJusqua && d.bloqueJusqua > new Date()) return d;
  return null;
};

// Blocage immédiat (ex: "ce numéro n'a pas WhatsApp")
numeroBloqueSchema.statics.bloquer = async function (telephone, raison, jours = 30) {
  return this.findOneAndUpdate(
    { telephone },
    { $set: { raison, bloqueJusqua: new Date(Date.now() + jours * 86400000), dernierEchec: new Date() } },
    { upsert: true, new: true }
  );
};

// Échec "normal" : on compte, et on bloque après `seuil` échecs
numeroBloqueSchema.statics.enregistrerEchec = async function (telephone, raison, seuil = 3, jours = 7) {
  const d = await this.findOneAndUpdate(
    { telephone },
    { $inc: { nbEchecs: 1 }, $set: { raison, dernierEchec: new Date() } },
    { upsert: true, new: true }
  );
  if (d.nbEchecs >= seuil) {
    d.bloqueJusqua = new Date(Date.now() + jours * 86400000);
    d.nbEchecs = 0;
    await d.save();
    console.log(`🚫 Numéro ${telephone} bloqué ${jours} jours (${raison})`);
  }
  return d;
};

// Un envoi réussi remet le compteur à zéro
numeroBloqueSchema.statics.reussite = function (telephone) {
  return this.deleteOne({ telephone });
};

// Débloquer manuellement (ex: le parent a corrigé son numéro / installé WhatsApp)
numeroBloqueSchema.statics.debloquer = function (telephone) {
  return this.deleteOne({ telephone });
};

module.exports = mongoose.model('NumeroBloque', numeroBloqueSchema);