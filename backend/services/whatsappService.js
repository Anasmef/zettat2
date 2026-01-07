// services/whatsappService.js
const axios = require('axios');

class WhatsAppService {
  constructor() {
    // Configuration de votre instance UltraMsg
    this.instanceId = '158141';
    this.token = 'e5k0vr2phnntfewt';
    this.baseUrl = `https://api.ultramsg.com/instance${this.instanceId}`;
  }

  /**
   * Envoyer un message WhatsApp
   * @param {string} phone - Numéro de téléphone (ex: 0660079060 ou +212660079060)
   * @param {string} message - Contenu du message
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async envoyerMessage(phone, message) {
    try {
      // Nettoyer le numéro (supprimer espaces)
      let phoneFormate = phone.trim().replace(/\s+/g, '');
      
      // Convertir au format international (+212...)
      if (phoneFormate.startsWith('0')) {
        phoneFormate = '+212' + phoneFormate.substring(1);
      } else if (!phoneFormate.startsWith('+')) {
        phoneFormate = '+212' + phoneFormate;
      }

      const url = `${this.baseUrl}/messages/chat`;
      
      const response = await axios.post(url, {
        token: this.token,
        to: phoneFormate,
        body: message,
        priority: 10
      });

      console.log(`✅ Message WhatsApp envoyé à ${phoneFormate}`);
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error(`❌ Erreur envoi WhatsApp:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoyer une notification d'absence aux parents
   * @param {Object} etudiant - Objet étudiant complet
   * @param {string} cours - Nom du cours
   * @param {Date} dateSession - Date de la session
   * @param {string} remarque - Remarque optionnelle
   * @returns {Promise<Object>} Résultats des envois
   */
  async notifierAbsence(etudiant, cours, dateSession, remarque = '') {
    const nomEtudiant = etudiant.nomComplet;
    const dateFormatee = new Date(dateSession).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `
🔴 *NOTIFICATION D'ABSENCE*

Cher parent,

Votre enfant *${nomEtudiant}* était absent(e) au cours de *${cours}* le ${dateFormatee}.

${remarque ? `Remarque: ${remarque}` : ''}

Veuillez nous contacter pour toute question.

École Alfred Kastler
`.trim();

    const resultats = [];

    // Envoyer au père si numéro disponible
    if (etudiant.telephonePere && etudiant.telephonePere.trim()) {
      console.log(`📤 Envoi notification absence au père: ${etudiant.telephonePere}`);
      const result = await this.envoyerMessage(etudiant.telephonePere, message);
      resultats.push({ 
        destinataire: 'Père', 
        telephone: etudiant.telephonePere,
        ...result 
      });
    }

    // Envoyer à la mère si numéro disponible
    if (etudiant.telephoneMere && etudiant.telephoneMere.trim()) {
      console.log(`📤 Envoi notification absence à la mère: ${etudiant.telephoneMere}`);
      const result = await this.envoyerMessage(etudiant.telephoneMere, message);
      resultats.push({ 
        destinataire: 'Mère', 
        telephone: etudiant.telephoneMere,
        ...result 
      });
    }

    // Si aucun parent n'a de numéro, envoyer à l'étudiant
    if (resultats.length === 0 && etudiant.telephoneEtudiant) {
      console.log(`📤 Envoi notification absence à l'étudiant: ${etudiant.telephoneEtudiant}`);
      const result = await this.envoyerMessage(etudiant.telephoneEtudiant, message);
      resultats.push({ 
        destinataire: 'Étudiant', 
        telephone: etudiant.telephoneEtudiant,
        ...result 
      });
    }

    console.log(`✅ Notification absence envoyée pour ${nomEtudiant}: ${resultats.length} message(s)`);

    return {
      etudiant: nomEtudiant,
      messagesEnvoyes: resultats.length,
      details: resultats
    };
  }

  /**
   * Envoyer une notification de retard aux parents
   * @param {Object} etudiant - Objet étudiant complet
   * @param {string} cours - Nom du cours
   * @param {Date} dateSession - Date de la session
   * @param {number} retardMinutes - Nombre de minutes de retard
   * @returns {Promise<Object>} Résultats des envois
   */
  async notifierRetard(etudiant, cours, dateSession, retardMinutes) {
    const nomEtudiant = etudiant.nomComplet;
    const dateFormatee = new Date(dateSession).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `
🟡 *NOTIFICATION DE RETARD*

Cher parent,

Votre enfant *${nomEtudiant}* est arrivé(e) avec *${retardMinutes} minutes de retard* au cours de *${cours}* le ${dateFormatee}.

Merci de veiller à la ponctualité.

École Alfred Kastler
`.trim();

    const resultats = [];

    // Envoyer au père
    if (etudiant.telephonePere && etudiant.telephonePere.trim()) {
      console.log(`📤 Envoi notification retard au père: ${etudiant.telephonePere}`);
      const result = await this.envoyerMessage(etudiant.telephonePere, message);
      resultats.push({ 
        destinataire: 'Père', 
        telephone: etudiant.telephonePere, 
        ...result 
      });
    }

    // Envoyer à la mère
    if (etudiant.telephoneMere && etudiant.telephoneMere.trim()) {
      console.log(`📤 Envoi notification retard à la mère: ${etudiant.telephoneMere}`);
      const result = await this.envoyerMessage(etudiant.telephoneMere, message);
      resultats.push({ 
        destinataire: 'Mère', 
        telephone: etudiant.telephoneMere, 
        ...result 
      });
    }

    // Si aucun parent, envoyer à l'étudiant
    if (resultats.length === 0 && etudiant.telephoneEtudiant) {
      console.log(`📤 Envoi notification retard à l'étudiant: ${etudiant.telephoneEtudiant}`);
      const result = await this.envoyerMessage(etudiant.telephoneEtudiant, message);
      resultats.push({ 
        destinataire: 'Étudiant', 
        telephone: etudiant.telephoneEtudiant, 
        ...result 
      });
    }

    console.log(`✅ Notification retard envoyée pour ${nomEtudiant}: ${resultats.length} message(s)`);

    return { 
      etudiant: nomEtudiant, 
      messagesEnvoyes: resultats.length, 
      details: resultats 
    };
  }

  /**
   * Tester la connexion WhatsApp
   * @param {string} phone - Numéro de test
   * @returns {Promise<Object>}
   */
  async testerConnexion(phone = '+212660079060') {
    const messageTest = `✅ Test de connexion WhatsApp - École Alfred Kastler\n\nCe message confirme que le système de notification fonctionne correctement.`;
    return await this.envoyerMessage(phone, messageTest);
  }
}

// Exporter une instance unique (singleton)
module.exports = new WhatsAppService();