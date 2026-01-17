// services/whatsappService.js
const axios = require('axios');

class WhatsAppService {
  constructor() {
    // Configuration WasenderAPI
    this.apiToken = '6fb0a3f2b3ab2ac2afdd71f8a3c68f8614a515c922f769cf0f7f914a065cb513';
    this.baseUrl = 'https://www.wasenderapi.com/api';
  }

  /**
   * Envoyer un message WhatsApp via WasenderAPI
   * @param {string} phone - Numéro de téléphone (ex: 0660079060 ou +212660079060)
   * @param {string} message - Contenu du message
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async envoyerMessage(phone, message) {
    try {
      // Nettoyer le numéro (supprimer espaces)
      let phoneFormate = phone.trim().replace(/\s+/g, '');
      
      // Convertir au format international sans le +
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
        }
      });

      console.log(`✅ Message WhatsApp envoyé à ${phoneFormate} via WasenderAPI`);
      return { 
        success: true, 
        data: response.data,
        messageId: response.data?.messageId || null
      };
      
    } catch (error) {
      console.error(`❌ Erreur envoi WhatsApp:`, error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
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

    const message = `🔴 *NOTIFICATION D'ABSENCE*

Cher parent,

Votre enfant *${nomEtudiant}* était absent(e) au cours de *${cours}* le ${dateFormatee}.

${remarque ? `Remarque: ${remarque}` : ''}

Veuillez nous contacter pour toute question.

École Alfred Kastler`;

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
      
      // Petit délai pour éviter le spam
      await this.delay(1000);
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
      
      await this.delay(1000);
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

    const message = `🟡 *NOTIFICATION DE RETARD*

Cher parent,

Votre enfant *${nomEtudiant}* est arrivé(e) avec *${retardMinutes} minutes de retard* au cours de *${cours}* le ${dateFormatee}.

Merci de veiller à la ponctualité.

École Alfred Kastler`;

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
      
      await this.delay(1000);
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
      
      await this.delay(1000);
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
   * Vérifier le statut de la session WhatsApp
   * @returns {Promise<Object>}
   */
  async verifierStatut() {
    try {
      const url = `${this.baseUrl}/session-status`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      console.log('✅ Statut session WhatsApp:', response.data);
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * Tester la connexion WhatsApp
   * @param {string} phone - Numéro de test
   * @returns {Promise<Object>}
   */
  async testerConnexion(phone = '0660079060') {
    const messageTest = `✅ *Test de connexion WhatsApp*
    
École Alfred Kastler

Ce message confirme que le système de notification fonctionne correctement via WasenderAPI.

Date: ${new Date().toLocaleString('fr-FR')}`;
    
    return await this.envoyerMessage(phone, messageTest);
  }

  /**
   * Délai pour éviter le spam
   * @param {number} ms - Millisecondes
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exporter une instance unique (singleton)
module.exports = new WhatsAppService();