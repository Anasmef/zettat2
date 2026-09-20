// services/notificationQueue.js
// ✅ Queue PERSISTANTE (MongoDB) + worker unique en arrière-plan
//
//  - 5 à 10 s aléatoires entre 2 messages
//  - anniversaires : 30 min entre 2 élèves différents
//  - retry 502/503 avec attente croissante (max 3 essais)
//  - disjoncteur : bridge déconnecté → pause, rien n'est perdu
//  - absence/retard valables 1 h, puis 'expiré' (jamais envoyés en retard)
//  - le soir annule les messages du matin encore en attente
//  - absence/retard AVANT anniversaires
//  - anti-doublon (index unique sur `cle`)
//  - numéros qui ne marchent pas → skippés automatiquement
//
// ⚠️ Un SEUL processus Node doit faire tourner ce worker (pas de PM2 cluster avec plusieurs instances).

const Notification = require('../models/Notification');
const NumeroBloque = require('../models/NumeroBloque');
const whatsappService = require('./whatsappService');
const sender = require('./whatsappSender');

const CFG = {
  DELAI_MIN: 8000,                    // ✅ délai ALÉATOIRE entre 2 messages : 8 à 12 s (moyenne 10 s)
  DELAI_MAX: 12000,
  LOT_MIN: 25,                        // ✅ après 25 à 35 messages envoyés (taille du lot aléatoire)...
  LOT_MAX: 35,
  DELAI_REGROUPEMENT: 0,              // ms d'attente avant le 1er envoi pour regrouper les cours (ex: 5 * 60 * 1000). 0 = envoi immédiat
  PAUSE_LOT_MIN_MS: 2 * 60 * 1000,    // ...pause aléatoire de 2 à 3 minutes (anti-spam)
  PAUSE_LOT_MAX_MS: 3 * 60 * 1000,
  DELAI_ENTRE_ANNIVERSAIRES: 30 * 60 * 1000, // 30 min entre 2 élèves
  VALIDITE_MS: 60 * 60 * 1000,        // 1 h pour absence / retard
  MAX_TENTATIVES: 3,                  // retry sur 502/503
  BACKOFF_BASE: 30 * 1000,            // 30 s, 60 s, ...
  PAUSE_SONDE: 5 * 60 * 1000,         // en pause : on retente toutes les 5 min
  ECHECS_SYSTEMIQUES: 4,              // 4 échecs de suite sur des numéros différents = problème global, pas les numéros
  ECHECS_AVANT_BLOCAGE: 3,            // 3 échecs sur le même numéro → bloqué
  BLOCAGE_JOURS: 7,                   // durée du blocage après échecs répétés
  BLOCAGE_INVALIDE_JOURS: 30,         // durée du blocage si "pas de WhatsApp"
  IDLE_MS: 3000                       // quand rien à faire
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.floor(Math.random() * (b - a));

class NotificationQueue {
  constructor() {
    this.actif = false;
    this.pause = null;               // { raison, depuis } quand le disjoncteur est ouvert
    this.pauseJusqua = 0;
    this.echecsConsecutifs = 0;
    this.dernierNettoyage = 0;
    this.compteurLot = 0;            // messages réellement envoyés dans le lot en cours
    this.tailleLot = rand(CFG.LOT_MIN, CFG.LOT_MAX + 1); // taille du lot en cours (aléatoire)
    this.dernierEnvoiTs = 0;
    this.stats = { envoyes: 0, echoues: 0, ignores: 0 };
  }

  // ============================================
  // 📥 AJOUTER (même signature qu'avant)
  // ============================================
  async ajouterNotification(type, etudiantData, cours = '', dateSession = new Date(), options = {}) {
    const periode = type === 'anniversaire' ? '' : (options.periode || '');
    const date = new Date(dateSession);
    const jour = date.toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' }); // YYYY-MM-DD
    // ✅ Clé SANS le cours : UN SEUL message par élève / type / jour / période
    const cle = [String(etudiantData._id), type, jour, periode].join('|');
    const retardCalc = type === 'retard' ? Math.min(120, Math.max(15, options.retardMinutes || 15)) : 0;

    // ✅ Une notification existe déjà pour cet élève / jour / période ?
    const existante = await Notification.findOne({ cle });
    if (existante) {
      const rienEnvoye = !existante.destinataires.some(d => d.statut === 'envoyé');
      const enAttente = existante.destinataires.some(d => d.statut === 'en_attente');

      if (cours && existante.coursListe.includes(cours)) {
        console.log(`♻️  Doublon ignoré: ${etudiantData.nomComplet} [${type}] [${periode}] ${cours}`);
        return { success: false, duplicate: true, message: 'Notification déjà enregistrée' };
      }

      if (cours && rienEnvoye && enAttente) {
        // Le message n'est pas encore parti → on ajoute le cours dans le MÊME message
        if (cours) existante.coursListe.push(cours);
        existante.cours = existante.coursListe.join(', ');
        if (type === 'retard') existante.retardMinutes = Math.max(existante.retardMinutes, retardCalc);
        await existante.save();
        console.log(`🔗 Fusionné: ${etudiantData.nomComplet} → cours: ${existante.cours}`);
        const restants = await Notification.countDocuments({ statutGlobal: { $in: ['en_attente', 'en_cours'] } });
        return { success: true, merged: true, message: 'Cours ajouté au message déjà en attente', positionQueue: restants };
      }

      // Message déjà envoyé (ou clôturé) : on n'envoie PAS un 2ᵉ message aux parents
      console.log(`⏭️  Parents déjà notifiés pour ${etudiantData.nomComplet} [${type}] [${periode}] (cours ${cours} non renvoyé)`);
      return { success: false, duplicate: true, dejaNotifie: true, message: 'Parents déjà notifiés pour cette période' };
    }

    const expireLe = type === 'anniversaire'
      ? new Date(`${jour}T23:59:59+01:00`)               // valable jusqu'à la fin de la journée
      : new Date(Date.now() + CFG.VALIDITE_MS);          // ✅ 1 h à partir de la validation du prof

    const destinataires = await this.construireDestinataires(type, etudiantData);

    try {
      await Notification.create({
        etudiant: etudiantData._id,
        nomEtudiant: etudiantData.nomComplet,
        type,
        cours: cours || '',
        coursListe: cours ? [cours] : [],
        dateSession: date,
        jour,
        periode,
        cle,
        retardMinutes: retardCalc,
        remarque: options.remarque || '',
        expireLe,
        destinataires: destinataires.map(d => ({
          ...d,
          // ✅ Optionnel : attendre avant le 1er envoi pour laisser d'autres profs ajouter leur cours (0 = désactivé)
          prochainEssai: new Date(Date.now() + CFG.DELAI_REGROUPEMENT)
        })),
        creePar: options.creePar || undefined
      });
    } catch (err) {
      if (err.code === 11000) {
        console.log(`♻️  Doublon ignoré: ${etudiantData.nomComplet} [${type}] [${periode}] ${cours}`);
        return { success: false, duplicate: true, message: 'Notification déjà enregistrée' };
      }
      throw err;
    }

    // ✅ Le soir commence → les messages du matin encore en attente sont annulés
    if (periode === 'soir') {
      const anciens = await Notification.find({
        type: { $in: ['absence', 'retard'] },
        jour,
        periode: 'matin',
        statutGlobal: { $in: ['en_attente', 'en_cours'] }
      });
      for (const n of anciens) {
        n.cloturerEnAttente('annulé', 'Séance du soir commencée');
        await n.save();
      }
      if (anciens.length) console.log(`🚫 ${anciens.length} notification(s) du matin annulée(s) (séance du soir)`);
    }

    console.log(`📥 [${type}] [${periode || '-'}] ajoutée: ${etudiantData.nomComplet}`);
    const enAttente = await Notification.countDocuments({ statutGlobal: { $in: ['en_attente', 'en_cours'] } });
    return { success: true, message: "Notification ajoutée à la file d'attente", positionQueue: enAttente };
  }

  /** Père + Mère (+ Étudiant pour anniversaire), sans doublon, numéros bloqués marqués 'ignoré' */
  async construireDestinataires(type, e) {
    const vus = new Set();
    const resultat = [];
    let valides = 0;

    const ajouter = async (relation, tel) => {
      if (!tel || !String(tel).trim()) return;
      const norm = whatsappService.normalizePhone(tel);
      if (!norm || vus.has(norm)) return;
      vus.add(norm);
      const bloque = await NumeroBloque.estBloque(norm);
      if (bloque) {
        resultat.push({ relation, telephone: String(tel).trim(), statut: 'ignoré', erreur: `Numéro bloqué: ${bloque.raison}` });
      } else {
        resultat.push({ relation, telephone: String(tel).trim(), statut: 'en_attente' });
        valides++;
      }
    };

    await ajouter('Père', e.telephonePere);
    await ajouter('Mère', e.telephoneMere);
    if (type === 'anniversaire') await ajouter('Étudiant', e.telephoneEtudiant);
    // ✅ Fallback: aucun parent utilisable (vide ou bloqué) → on essaie le numéro de l'élève
    else if (valides === 0) await ajouter('Étudiant', e.telephoneEtudiant);

    return resultat;
  }

  construireMessage(doc) {
    const date = whatsappService.formatDate(doc.dateSession);
    if (doc.type === 'absence')
      return whatsappService.buildAbsenceMessage(doc.nomEtudiant, doc.cours, date, doc.remarque, doc.periode);
    if (doc.type === 'retard')
      return whatsappService.buildRetardMessage(doc.nomEtudiant, doc.cours, date, doc.retardMinutes, doc.periode);
    return whatsappService.buildAnniversaireMessage(doc.nomEtudiant);
  }

  // ============================================
  // ⚙️ WORKER
  // ============================================
  demarrer() {
    if (this.actif) return;
    this.actif = true;
    console.log('🚀 Worker notifications démarré (queue MongoDB)');
    this.boucle();
  }

  async boucle() {
    while (true) {
      try {
        // Nettoyage des expirés (1 fois par minute)
        if (Date.now() - this.dernierNettoyage > 60000) {
          this.dernierNettoyage = Date.now();
          await this.expirer();
        }

        // Disjoncteur ouvert : on attend, puis on teste avec le prochain message
        if (this.pause && Date.now() < this.pauseJusqua) {
          await sleep(CFG.IDLE_MS);
          continue;
        }

        const item = await this.prochain();
        if (!item) {
          // Queue vide depuis plus de 2 min : le prochain lot repart de zéro
          if (this.compteurLot > 0 && Date.now() - this.dernierEnvoiTs > CFG.PAUSE_LOT_MIN_MS) this.compteurLot = 0;
          await sleep(CFG.IDLE_MS);
          continue;
        }

        const delai = await this.traiter(item);
        if (delai > 0) await sleep(delai);

        // ✅ Lot terminé (25 à 35 messages) → pause aléatoire de 2 à 3 min (anti-spam)
        if (this.compteurLot >= this.tailleLot) {
          const pause = rand(CFG.PAUSE_LOT_MIN_MS, CFG.PAUSE_LOT_MAX_MS + 1);
          console.log(`⏸️  ${this.compteurLot} messages envoyés → pause de ${Math.round(pause / 1000)} s (anti-spam)`);
          this.compteurLot = 0;
          this.tailleLot = rand(CFG.LOT_MIN, CFG.LOT_MAX + 1);
          await sleep(pause);
          console.log('▶️  Fin de la pause, on continue');
        }
      } catch (err) {
        console.error('❌ Erreur worker:', err.message);
        await sleep(10000);
      }
    }
  }

  /** Passe en 'expiré' tout ce qui est en attente après expireLe */
  async expirer() {
    const docs = await Notification.find({
      statutGlobal: { $in: ['en_attente', 'en_cours'] },
      expireLe: { $lt: new Date() }
    });
    for (const d of docs) {
      d.cloturerEnAttente('expiré', 'Délai dépassé - non envoyé');
      await d.save();
      console.log(`⌛ Expiré (non envoyé): ${d.nomEtudiant} [${d.type}] [${d.periode || '-'}]`);
    }
  }

  /** Choisit le prochain message à envoyer : absence/retard d'abord, puis anniversaires */
  async prochain() {
    const now = new Date();
    const filtre = {
      expireLe: { $gt: now },
      destinataires: { $elemMatch: { statut: 'en_attente', prochainEssai: { $lte: now } } }
    };

    let doc = await Notification.findOne({ ...filtre, type: { $in: ['absence', 'retard'] } }).sort({ createdAt: 1 });

    if (!doc) {
      // Anniversaire : celui déjà commencé d'abord, puis le plus ancien
      doc = await Notification.findOne({ ...filtre, type: 'anniversaire' }).sort({ dernierEnvoiAt: -1, createdAt: 1 });
      if (doc) {
        // ✅ 30 min entre deux élèves différents
        const dernier = await Notification.findOne({
          type: 'anniversaire',
          _id: { $ne: doc._id },
          dernierEnvoiAt: { $ne: null }
        }).sort({ dernierEnvoiAt: -1 }).select('dernierEnvoiAt');
        if (dernier && Date.now() - dernier.dernierEnvoiAt.getTime() < CFG.DELAI_ENTRE_ANNIVERSAIRES) {
          return null;
        }
      }
    }
    if (!doc) return null;

    const dest = doc.destinataires.find(d => d.statut === 'en_attente' && d.prochainEssai <= now);
    return dest ? { doc, dest } : null;
  }

  /** Envoie 1 message à 1 destinataire. Retourne le délai à attendre ensuite (ms). */
  async traiter({ doc, dest }) {
    const norm = whatsappService.normalizePhone(dest.telephone);

    // ✅ Numéro connu comme mauvais → SKIP immédiat, aucune attente
    const blocage = norm ? await NumeroBloque.estBloque(norm) : { raison: 'numéro vide' };
    if (blocage) {
      dest.statut = 'ignoré';
      dest.erreur = `Numéro bloqué: ${blocage.raison}`;
      await doc.save();
      this.stats.ignores++;
      console.log(`⏭️  Skip ${dest.relation} ${dest.telephone} (${blocage.raison})`);
      return 0;
    }

    console.log(`📤 [${doc.type}${doc.periode ? ' ' + doc.periode : ''} → ${dest.relation}] ${norm} (${doc.nomEtudiant})`);
    const r = await sender.envoyer(norm, this.construireMessage(doc));

    // ✅ On compte seulement les vrais envois (pas les numéros invalides ni les bridge déconnectés)
    if (['ok', 'temporaire', 'echec'].includes(r.type)) {
      this.compteurLot++;
      this.dernierEnvoiTs = Date.now();
    }

    doc.nbTentativesEnvoi += 1;
    doc.derniereTentative = new Date();
    let delai = rand(CFG.DELAI_MIN, CFG.DELAI_MAX);

    switch (r.type) {
      case 'ok':
        dest.statut = 'envoyé';
        dest.dateEnvoi = new Date();
        dest.messageId = r.messageId;
        dest.erreur = null;
        doc.dernierEnvoiAt = new Date();
        this.stats.envoyes++;
        this.echecsConsecutifs = 0;
        await NumeroBloque.reussite(norm);
        if (this.pause) {
          console.log('✅ Envoi réussi → la queue reprend normalement');
          this.pause = null;
        }
        break;

      case 'deconnecte':
        // Le message reste en attente, rien n'est perdu
        this.mettreEnPause(`Bridge déconnecté ou non appairé (${r.error})`);
        delai = 0;
        break;

      case 'numero_invalide':
        dest.statut = 'ignoré';
        dest.erreur = r.error;
        this.stats.ignores++;
        await NumeroBloque.bloquer(norm, r.error || 'pas de WhatsApp', CFG.BLOCAGE_INVALIDE_JOURS);
        console.log(`🚫 ${norm} n'a pas WhatsApp → bloqué ${CFG.BLOCAGE_INVALIDE_JOURS} jours`);
        delai = 1000; // aucun message réel envoyé, pas besoin d'attendre 5-10 s
        break;

      case 'temporaire':
        dest.tentatives += 1;
        dest.erreur = r.error;
        if (dest.tentatives >= CFG.MAX_TENTATIVES) {
          await this.echecDefinitif(dest, norm, r);
        } else {
          const attente = Math.max(r.retryAfterMs || 0, CFG.BACKOFF_BASE * 2 ** (dest.tentatives - 1));
          dest.prochainEssai = new Date(Date.now() + attente);
          console.log(`🔁 Retry ${dest.tentatives}/${CFG.MAX_TENTATIVES} dans ${Math.round(attente / 1000)} s`);
        }
        break;

      default: // 'echec'
        dest.tentatives += 1;
        await this.echecDefinitif(dest, norm, r);
        break;
    }

    await doc.save();
    return delai;
  }

  /** Échec définitif d'un destinataire : bloque le numéro, sauf si c'est un problème global */
  async echecDefinitif(dest, norm, r) {
    this.echecsConsecutifs++;

    if (this.echecsConsecutifs >= CFG.ECHECS_SYSTEMIQUES) {
      // Trop d'échecs de suite sur des numéros différents → ce n'est pas le numéro, c'est le bridge
      dest.tentatives = 0;
      dest.prochainEssai = new Date(Date.now() + CFG.PAUSE_SONDE);
      this.mettreEnPause(`${this.echecsConsecutifs} échecs consécutifs (dernier: ${r.error})`);
      return;
    }

    dest.statut = 'échoué';
    dest.erreur = r.error;
    this.stats.echoues++;
    await NumeroBloque.enregistrerEchec(norm, r.error, CFG.ECHECS_AVANT_BLOCAGE, CFG.BLOCAGE_JOURS);
  }

  // ============================================
  // 🔌 DISJONCTEUR
  // ============================================
  mettreEnPause(raison) {
    this.pause = { raison, depuis: this.pause?.depuis || new Date() };
    this.pauseJusqua = Date.now() + CFG.PAUSE_SONDE;
    console.error(`\n🚨🚨 QUEUE EN PAUSE: ${raison}`);
    console.error('🚨 Les messages restent en attente (rien perdu, mais ils expirent après 1 h).');
    console.error('🚨 Réappairez le bridge WABridges : la queue reprend toute seule (test toutes les 5 min).\n');
    // TODO: ici on peut ajouter un email / Telegram d'alerte
  }

  /**
   * ✅ Reprise IMMÉDIATE (route POST /api/queue/reprendre), à appeler juste après avoir réappairé le bridge.
   * Lève la pause ET remet à "maintenant" les messages qui avaient été repoussés par le disjoncteur.
   */
  async reprendre() {
    this.pause = null;
    this.pauseJusqua = 0;
    this.echecsConsecutifs = 0;

    const r = await Notification.updateMany(
      { statutGlobal: { $in: ['en_attente', 'en_cours'] }, expireLe: { $gt: new Date() } },
      { $set: { 'destinataires.$[d].prochainEssai': new Date() } },
      { arrayFilters: [{ 'd.statut': 'en_attente' }] }
    );
    console.log(`▶️  Queue reprise manuellement (${r.modifiedCount ?? r.nModified ?? 0} notification(s) remises en file)`);
    return { repris: true, notificationsRemisesEnFile: r.modifiedCount ?? r.nModified ?? 0 };
  }

  // ============================================
  // 📊 STATS
  // ============================================
  getStats() {
    return {
      ...this.stats,
      enPause: !!this.pause,
      raisonPause: this.pause?.raison || null,
      pauseDepuis: this.pause?.depuis || null,
      workerActif: this.actif
    };
  }

  async getStatsDB() {
    const parStatut = await Notification.aggregate([{ $group: { _id: '$statutGlobal', count: { $sum: 1 } } }]);
    const numerosBloques = await NumeroBloque.countDocuments({ bloqueJusqua: { $gt: new Date() } });
    return { ...this.getStats(), parStatut, numerosBloques };
  }

  resetStats() {
    this.stats = { envoyes: 0, echoues: 0, ignores: 0 };
  }
}

const queue = new NotificationQueue();
queue.demarrer(); // ✅ démarre dès le require() dans server.js
module.exports = queue;