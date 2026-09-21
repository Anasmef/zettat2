// services/birthdayCron.js
// ✅ Cron job anniversaires - à importer dans server.js / app.js
// Usage: require('./services/birthdayCron');
//
// Le message d'anniversaire part SEULEMENT sur le numéro de l'élève (pas les parents).
// Le rythme (30 min entre 2 élèves) est géré par notificationQueue, pas ici.

const cron = require('node-cron');
const Etudiant = require('../models/etudiantModel');
const notificationQueue = require('./notificationQueue');

const TZ = 'Africa/Casablanca';

// ✅ Jour / mois / année dans le fuseau du Maroc (indépendant du fuseau du serveur)
function jourMoisAnnee(date) {
  const [annee, mois, jour] = new Date(date)
    .toLocaleDateString('en-CA', { timeZone: TZ }) // format YYYY-MM-DD
    .split('-')
    .map(Number);
  return { annee, mois, jour };
}

// ============================================
// ✅ Vérification des anniversaires du jour
// ============================================
async function verifierAnniversaires(origine = 'cron') {
  console.log(`\n🎂 ====== Vérification anniversaires (${origine}) ======`);

  const today = new Date();
  const { annee, mois, jour } = jourMoisAnnee(today);

  console.log(`📅 Aujourd'hui: ${today.toLocaleDateString('fr-FR', { timeZone: TZ })} (jour: ${jour}, mois: ${mois})`);

  try {
    // Récupérer tous les étudiants actifs avec une date de naissance
    const etudiants = await Etudiant.find({
      hidden:        { $ne: true },
      actif:         true,
      dateNaissance: { $exists: true, $ne: null }
    });

    console.log(`👥 ${etudiants.length} étudiants actifs vérifiés`);

    // Filtrer ceux dont c'est l'anniversaire aujourd'hui
    const anniversaires = etudiants.filter(e => {
      const dn = jourMoisAnnee(e.dateNaissance);
      return dn.jour === jour && dn.mois === mois;
    });

    if (anniversaires.length === 0) {
      console.log("ℹ️  Aucun anniversaire aujourd'hui");
      console.log('🎂 ==========================================\n');
      return;
    }

    console.log(`🎉 ${anniversaires.length} anniversaire(s) aujourd'hui :`);

    let ajoutes = 0, dejaFaits = 0, sansTelephone = 0, erreurs = 0;

    for (const etudiant of anniversaires) {
      const age = annee - jourMoisAnnee(etudiant.dateNaissance).annee;
      console.log(`   🎂 ${etudiant.nomComplet} (${age} ans) - ${etudiant.cours?.join(', ') || 'N/A'}`);

      // ✅ Le message part sur le numéro de l'élève : sans numéro, rien à envoyer
      if (!etudiant.telephoneEtudiant || !String(etudiant.telephoneEtudiant).trim()) {
        console.log(`      ⏭️  Pas de numéro élève → ignoré`);
        sansTelephone++;
        continue;
      }

      try {
        const r = await notificationQueue.ajouterNotification(
          'anniversaire',
          etudiant,
          '',       // cours vide pour anniversaire
          today,    // date du jour
          {}        // pas d'options spéciales
        );
        if (r.duplicate) dejaFaits++; else ajoutes++;
      } catch (err) {
        // ✅ une erreur sur un élève n'arrête plus les autres
        console.error(`      ❌ ${etudiant.nomComplet}: ${err.message}`);
        erreurs++;
      }
    }

    console.log(`✅ ${ajoutes} ajouté(s) à la queue | ${dejaFaits} déjà fait(s) | ${sansTelephone} sans numéro | ${erreurs} erreur(s)`);
    if (ajoutes > 1) {
      console.log(`⏳ 1 message toutes les 30 min → environ ${(ajoutes * 0.5).toFixed(1)} h pour tout envoyer`);
    }
    console.log('🎂 ==========================================\n');

  } catch (err) {
    console.error('❌ Erreur cron anniversaires:', err.message);
    console.log('🎂 ==========================================\n');
  }
}

// ============================================
// ✅ Chaque jour à 08:00 (heure du Maroc)
// ============================================
cron.schedule('0 8 * * *', () => verifierAnniversaires('cron 08:00'), {
  timezone: TZ
});

// ============================================
// ✅ Rattrapage : si le serveur (re)démarre entre 08:00 et 20:00, on vérifie tout de suite.
//    Sans danger : la protection anti-doublon empêche tout double envoi.
// ============================================
setTimeout(() => {
  const heure = Number(
    new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false })
  );
  if (heure >= 8 && heure < 20) verifierAnniversaires('rattrapage au démarrage');
}, 15000);

console.log('🎂 Cron anniversaires activé (08:00 chaque jour - Casablanca)');

module.exports = { verifierAnniversaires };