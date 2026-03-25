// services/birthdayCron.js
// ✅ Cron job anniversaires - à importer dans server.js / app.js
// Usage: require('./services/birthdayCron');

const cron = require('node-cron');
const Etudiant = require('../models/etudiantModel');
const notificationQueue = require('./notificationQueue');

// ============================================
// ✅ Vérification chaque jour à 08:00
// ============================================
cron.schedule('0 8 * * *', async () => {
  console.log('\n🎂 ====== Vérification anniversaires ======');

  const today = new Date();
  const day   = today.getDate();
  const month = today.getMonth() + 1;

  console.log(`📅 Aujourd'hui: ${today.toLocaleDateString('fr-FR')} (jour: ${day}, mois: ${month})`);

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
      if (!e.dateNaissance) return false;
      const dn = new Date(e.dateNaissance);
      return dn.getDate() === day && (dn.getMonth() + 1) === month;
    });

    if (anniversaires.length === 0) {
      console.log('ℹ️  Aucun anniversaire aujourd\'hui');
      console.log('🎂 ==========================================\n');
      return;
    }

    console.log(`🎉 ${anniversaires.length} anniversaire(s) aujourd'hui :`);
    anniversaires.forEach(e => {
      const age = today.getFullYear() - new Date(e.dateNaissance).getFullYear();
      console.log(`   🎂 ${e.nomComplet} (${age} ans) - ${e.cours?.join(', ') || 'N/A'}`);
    });

    // Envoyer les notifications via la queue
    for (const etudiant of anniversaires) {
      await notificationQueue.ajouterNotification(
        'anniversaire',
        etudiant,
        '',       // cours vide pour anniversaire
        today,    // date du jour
        {}        // pas d'options spéciales
      );
    }

    console.log(`✅ ${anniversaires.length} notification(s) anniversaire ajoutée(s) à la queue`);
    console.log('🎂 ==========================================\n');

  } catch (err) {
    console.error('❌ Erreur cron anniversaires:', err.message);
    console.log('🎂 ==========================================\n');
  }

}, {
  timezone: 'Africa/Casablanca'  // ✅ Fuseau horaire Maroc
});

console.log('🎂 Cron anniversaires activé (08:00 chaque jour - Casablanca)');

module.exports = {};