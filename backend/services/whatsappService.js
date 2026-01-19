// services/whatsappService.js
const axios = require('axios');

class WhatsAppService {
  constructor() {
    // Configuration Wasender
    this.apiToken = '6fb0a3f2b3ab2ac2afdd71f8a3c68f8614a515c922f769cf0f7f914a065cb513';
    this.baseUrl = 'https://www.wasenderapi.com/api';
    
    // 🛡️ Compteurs anti-spam
    this.sentCount = 0;
    this.lastResetTime = Date.now();
    
    // 📝 Templates variés pour absence (3 versions)
    this.templatesAbsence = [
      (nom, cours, date, remarque) => 
`🔴 *Notification d'absence*

Cher parent,

Nous vous informons que *${nom}* était absent(e) au cours de *${cours}* le ${date}.

${remarque ? `Remarque: ${remarque}` : ''}

Pour toute question, contactez-nous.
École Alfred Kastler`,

      (nom, cours, date, remarque) => 
`⚠️ *Alerte absence*

Bonjour,

Votre enfant *${nom}* n'a pas assisté à la séance de *${cours}* en date du ${date}.

${remarque ? `Note: ${remarque}` : ''}

Cordialement,
Administration`,

      (nom, cours, date, remarque) => 
`📌 *Absence élève*

Madame, Monsieur,

Nous constatons l'absence de *${nom}* lors du cours de *${cours}* du ${date}.

${remarque ? `Observation: ${remarque}` : ''}

Bien à vous,
Alfred Kastler`
    ];

    // 📝 Templates variés pour retard (3 versions)
    this.templatesRetard = [
      (nom, cours, date, minutes) => 
`🟡 *Notification de retard*

Cher parent,

*${nom}* est arrivé(e) avec *${minutes} minutes de retard* au cours de *${cours}* le ${date}.

Merci de veiller à la ponctualité.
École Alfred Kastler`,

      (nom, cours, date, minutes) => 
`⏰ *Retard signalé*

Bonjour,

Votre enfant *${nom}* a été en retard de *${minutes} min* pour la séance de *${cours}* du ${date}.

Nous comptons sur votre vigilance.
L'administration`,

      (nom, cours, date, minutes) => 
`📍 *Arrivée tardive*

Madame, Monsieur,

Retard constaté: *${nom}* - *${minutes} minutes* au cours de *${cours}* le ${date}.

Merci pour votre compréhension.
Alfred Kastler`
    ];
  }

  /**
   * 🔄 Réinitialiser le compteur toutes les heures
   */
  resetCounterIfNeeded() {
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - this.lastResetTime > oneHour) {
      this.sentCount = 0;
      this.lastResetTime = Date.now();
      console.log('🔄 Compteur anti-spam réinitialisé');
    }
  }

  /**
   * ⏸️ Pause intelligente selon le nombre de messages envoyés
   */
  async smartDelay() {
    this.resetCounterIfNeeded();
    this.sentCount++;

    // Pause de 2 minutes tous les 5 messages (batch)
    if (this.sentCount % 5 === 0) {
      console.log(`⏸️ Pause anti-spam: 2 minutes (batch ${this.sentCount / 5})...`);
      await this.delay(120000); // 2 minutes
    } else {
      // Délai standard entre messages: 18-22 secondes (aléatoire)
      const delayTime = 18000 + Math.random() * 4000;
      console.log(`⏱️ Attente: ${Math.round(delayTime / 1000)}s...`);
      await this.delay(delayTime);
    }
  }

  /**
   * 📤 Envoyer un message WhatsApp via Wasender
   */
  async envoyerMessage(phone, message) {
    try {
      let phoneFormate = phone.trim().replace(/\s+/g, '');
      
      // Format international sans +
      if (phoneFormate.startsWith('0')) {
        phoneFormate = '212' + phoneFormate.substring(1);
      } else if (phoneFormate.startsWith('+')) {
        phoneFormate = phoneFormate.substring(1);
      } else if (!phoneFormate.startsWith('212')) {
        phoneFormate = '212' + phoneFormate;
      }

      const url = `${this.baseUrl}/send-message`;
      
      const response = await axios.post(url, {
        to: phoneFormate,
        text: message
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 secondes timeout
      });

      console.log(`✅ Message envoyé à ${phoneFormate}`);
      return { 
        success: true, 
        data: response.data,
        messageId: response.data?.messageId || null
      };
      
    } catch (error) {
      console.error(`❌ Erreur envoi:`, error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * 📋 Sélectionner un template aléatoire
   */
  getRandomTemplate(templates) {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * 🔴 Notifier une absence avec anti-spam
   */
  async notifierAbsence(etudiant, cours, dateSession, remarque = '') {
    const nomEtudiant = etudiant.nomComplet;
    const dateFormatee = new Date(dateSession).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const resultats = [];

    // 👨 Envoyer au père
    if (etudiant.telephonePere && etudiant.telephonePere.trim()) {
      // Template aléatoire pour le père
      const template = this.getRandomTemplate(this.templatesAbsence);
      const message = template(nomEtudiant, cours, dateFormatee, remarque);
      
      console.log(`📤 Envoi absence au père: ${etudiant.telephonePere}`);
      const result = await this.envoyerMessage(etudiant.telephonePere, message);
      resultats.push({ 
        destinataire: 'Père', 
        telephone: etudiant.telephonePere,
        ...result 
      });
      
      // Délai intelligent
      await this.smartDelay();
    }

    // 👩 Envoyer à la mère
    if (etudiant.telephoneMere && etudiant.telephoneMere.trim()) {
      // Template différent pour la mère
      const template = this.getRandomTemplate(this.templatesAbsence);
      const message = template(nomEtudiant, cours, dateFormatee, remarque);
      
      console.log(`📤 Envoi absence à la mère: ${etudiant.telephoneMere}`);
      const result = await this.envoyerMessage(etudiant.telephoneMere, message);
      resultats.push({ 
        destinataire: 'Mère', 
        telephone: etudiant.telephoneMere,
        ...result 
      });
      
      // Délai plus long entre père et mère (30-35 secondes)
      const longDelay = 30000 + Math.random() * 5000;
      console.log(`⏱️ Pause père/mère: ${Math.round(longDelay / 1000)}s...`);
      await this.delay(longDelay);
    }

    // 👤 Fallback: étudiant si aucun parent
    if (resultats.length === 0 && etudiant.telephoneEtudiant) {
      const template = this.getRandomTemplate(this.templatesAbsence);
      const message = template(nomEtudiant, cours, dateFormatee, remarque);
      
      console.log(`📤 Envoi absence à l'étudiant: ${etudiant.telephoneEtudiant}`);
      const result = await this.envoyerMessage(etudiant.telephoneEtudiant, message);
      resultats.push({ 
        destinataire: 'Étudiant', 
        telephone: etudiant.telephoneEtudiant,
        ...result 
      });
    }

    console.log(`✅ Notification absence: ${nomEtudiant} - ${resultats.length} message(s)`);

    return {
      etudiant: nomEtudiant,
      messagesEnvoyes: resultats.length,
      details: resultats
    };
  }

  /**
   * 🟡 Notifier un retard avec anti-spam
   */
  async notifierRetard(etudiant, cours, dateSession, retardMinutes) {
    const nomEtudiant = etudiant.nomComplet;
    const dateFormatee = new Date(dateSession).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const resultats = [];

    // 👨 Père
    if (etudiant.telephonePere && etudiant.telephonePere.trim()) {
      const template = this.getRandomTemplate(this.templatesRetard);
      const message = template(nomEtudiant, cours, dateFormatee, retardMinutes);
      
      console.log(`📤 Envoi retard au père: ${etudiant.telephonePere}`);
      const result = await this.envoyerMessage(etudiant.telephonePere, message);
      resultats.push({ 
        destinataire: 'Père', 
        telephone: etudiant.telephonePere, 
        ...result 
      });
      
      await this.smartDelay();
    }

    // 👩 Mère
    if (etudiant.telephoneMere && etudiant.telephoneMere.trim()) {
      const template = this.getRandomTemplate(this.templatesRetard);
      const message = template(nomEtudiant, cours, dateFormatee, retardMinutes);
      
      console.log(`📤 Envoi retard à la mère: ${etudiant.telephoneMere}`);
      const result = await this.envoyerMessage(etudiant.telephoneMere, message);
      resultats.push({ 
        destinataire: 'Mère', 
        telephone: etudiant.telephoneMere, 
        ...result 
      });
      
      // Délai père/mère
      const longDelay = 30000 + Math.random() * 5000;
      console.log(`⏱️ Pause père/mère: ${Math.round(longDelay / 1000)}s...`);
      await this.delay(longDelay);
    }

    // 👤 Fallback: étudiant
    if (resultats.length === 0 && etudiant.telephoneEtudiant) {
      const template = this.getRandomTemplate(this.templatesRetard);
      const message = template(nomEtudiant, cours, dateFormatee, retardMinutes);
      
      console.log(`📤 Envoi retard à l'étudiant: ${etudiant.telephoneEtudiant}`);
      const result = await this.envoyerMessage(etudiant.telephoneEtudiant, message);
      resultats.push({ 
        destinataire: 'Étudiant', 
        telephone: etudiant.telephoneEtudiant, 
        ...result 
      });
    }

    console.log(`✅ Notification retard: ${nomEtudiant} - ${resultats.length} message(s)`);

    return { 
      etudiant: nomEtudiant, 
      messagesEnvoyes: resultats.length, 
      details: resultats 
    };
  }

  /**
   * ✅ Vérifier le statut de la session
   */
  async verifierStatut() {
    try {
      const url = `${this.baseUrl}/session-status`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      console.log('✅ Statut session:', response.data);
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('❌ Erreur statut:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * 🧪 Tester la connexion
   */
  async testerConnexion(phone = '0660079060') {
    const messageTest = `✅ *Test système WhatsApp*

École Alfred Kastler

Connexion Wasender opérationnelle.

${new Date().toLocaleString('fr-FR')}`;
    
    return await this.envoyerMessage(phone, messageTest);
  }

  /**
   * ⏱️ Délai simple
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 Statistiques d'envoi
   */
  getStats() {
    return {
      messagesEnvoyes: this.sentCount,
      derniereReinitialisation: new Date(this.lastResetTime).toLocaleString('fr-FR')
    };
  }
}

// Export singleton
module.exports = new WhatsAppService();