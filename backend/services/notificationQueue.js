// services/notificationQueue.js
const whatsappService = require('./whatsappService');
const Notification = require('../models/Notification');

class NotificationQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.stats = {
      total: 0,
      envoyes: 0,
      enAttente: 0,
      echoues: 0
    };
  }

  /**
   * 📥 Ajouter une notification à la queue (sans bloquer)
   */
  async ajouterNotification(type, etudiantData, cours, dateSession, options = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      etudiantData,
      cours,
      dateSession,
      retardMinutes: options.retardMinutes || 0,
      remarque: options.remarque || '',
      periode: options.periode || '',
      creePar: options.creePar || null,
      timestamp: new Date()
    };

    this.queue.push(notification);
    this.stats.total++;
    this.stats.enAttente++;

    console.log(`📥 Notification [${type}] [${notification.periode}] ajoutée: ${etudiantData.nomComplet}`);
    console.log(`📊 Queue: ${this.queue.length} notification(s) en attente`);

    if (!this.isProcessing) {
      this.traiterQueue();
    }

    return {
      success: true,
      message: 'Notification ajoutée à la file d\'attente',
      positionQueue: this.queue.length
    };
  }

  /**
   * ⚙️ Traiter la queue en arrière-plan
   */
  async traiterQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`\n🚀 Démarrage traitement queue: ${this.queue.length} notification(s)\n`);

    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      this.stats.enAttente--;

      try {
        await this.envoyerNotification(notification);
        this.stats.envoyes++;
      } catch (error) {
        console.error(`❌ Erreur traitement notification ${notification.id}:`, error.message);
        this.stats.echoues++;
      }

      console.log(`📊 Progression: ${this.stats.envoyes}/${this.stats.total} envoyés | ${this.queue.length} restants\n`);
    }

    this.isProcessing = false;
    console.log(`✅ Queue terminée: ${this.stats.envoyes} envoyés, ${this.stats.echoues} échoués\n`);
  }

  /**
   * 📤 Envoyer une notification
   */
  async envoyerNotification(notification) {
    const { type, etudiantData, cours, dateSession, retardMinutes, remarque, periode, creePar } = notification;

    // ✅ Pour anniversaire : pas de document Notification créé (pas de cours/dateSession)
    if (type === 'anniversaire') {
      const result = await whatsappService.notifierAnniversaire(etudiantData);
      return result;
    }

    // ✅ Construire l'objet Notification pour absence/retard
    const notifData = {
      etudiant: etudiantData._id,
      type,
      cours,
      dateSession: new Date(dateSession),
      retardMinutes: type === 'retard' ? retardMinutes : 0,
      remarque: remarque || '',
      destinataires: [
        ...(etudiantData.telephonePere ? [{
          relation: 'Père',
          telephone: etudiantData.telephonePere,
          statut: 'en_attente'
        }] : []),
        ...(etudiantData.telephoneMere ? [{
          relation: 'Mère',
          telephone: etudiantData.telephoneMere,
          statut: 'en_attente'
        }] : []),
        ...(!etudiantData.telephonePere && !etudiantData.telephoneMere && etudiantData.telephoneEtudiant ? [{
          relation: 'Étudiant',
          telephone: etudiantData.telephoneEtudiant,
          statut: 'en_attente'
        }] : [])
      ],
      statutGlobal: 'en_cours'
    };

    // ✅ Ajouter creePar SEULEMENT s'il existe
    if (creePar) {
      notifData.creePar = creePar;
    }

    const notificationDoc = await Notification.create(notifData);

    let result;

    if (type === 'absence') {
      result = await whatsappService.notifierAbsence(
        etudiantData,
        cours,
        dateSession,
        remarque,
        periode
      );
    } else if (type === 'retard') {
      result = await whatsappService.notifierRetard(
        etudiantData,
        cours,
        dateSession,
        retardMinutes,
        periode
      );
    }

    // Mettre à jour les statuts dans la BDD
    if (result && result.details) {
      for (const detail of result.details) {
        if (detail.success) {
          await notificationDoc.marquerEnvoye(detail.telephone, detail.data?.messageId);
        } else {
          await notificationDoc.marquerEchoue(detail.telephone, detail.error);
        }
      }
    }

    await notificationDoc.incrementerTentatives();

    return result;
  }

  /**
   * 📊 Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      enCours: this.isProcessing,
      queueLength: this.queue.length
    };
  }

  /**
   * 🔄 Réinitialiser les statistiques
   */
  resetStats() {
    this.stats = {
      total: 0,
      envoyes: 0,
      enAttente: 0,
      echoues: 0
    };
  }
}

module.exports = new NotificationQueue();