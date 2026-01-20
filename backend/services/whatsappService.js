// ========================================
// ✅ SOLUTION PRODUCTION - 50 رسالة / ساعة
// NO STOP - NO SILENT BLOCK
// ========================================

const axios = require('axios');

class WhatsAppServicePRO {
  constructor() {
    this.apiToken = '6fb0a3f2b3ab2ac2afdd71f8a3c68f8614a515c922f769cf0f7f914a065cb513';
    this.baseUrl = 'https://www.wasenderapi.com/api';
    
    this.sentCount = 0;
    this.lastMessageTime = 0;
    
    // ✅ الإعدادات الآمنة (6-8 ثواني + pause كل 10)
    this.DELAY_MIN = 6000;    // 6 ثواني
    this.DELAY_MAX = 8000;    // 8 ثواني
    this.PAUSE_INTERVAL = 10; // كل 10 رسائل
    this.PAUSE_DURATION = 360000; // 6 دقائق
    
    // 8 templates مختلفة (تغيير emoji + أول سطر + توقيع + طول)
    this.templatesAbsence = [
      // Template 1
      (nom, cours, date, remarque) => 
`🔴 *Notification d'absence*

Cher parent,

Nous vous informons que *${nom}* était absent(e) au cours de *${cours}* le ${date}.

${remarque ? `Remarque: ${remarque}` : 'Pour toute question, contactez l\'école.'}

Cordialement,
École Alfred Kastler`,

      // Template 2
      (nom, cours, date, remarque) => 
`⚠️ *Alerte absence enfant*

Bonjour,

Votre enfant *${nom}* n'a pas assisté à la séance de *${cours}* du ${date}.

${remarque ? `Note: ${remarque}` : ''}

L'administration`,

      // Template 3
      (nom, cours, date, remarque) => 
`📌 *Absence scolaire constatée*

Madame, Monsieur,

Absence: *${nom}* - Cours: *${cours}* - Date: ${date}

${remarque ? `Observation: ${remarque}` : 'Nous apprécions votre vigilance.'}

Bien à vous,
Alfred Kastler`,

      // Template 4
      (nom, cours, date, remarque) => 
`❌ *Absence non justifiée*

Alert Parent!

*${nom}* absent du cours *${cours}* (${date})

${remarque ? `Détail: ${remarque}` : 'SVP contactez l\'école'}

Adm. Scolaire`,

      // Template 5
      (nom, cours, date, remarque) => 
`🚨 *Absence à signaler*

Chère famille,

L'élève *${nom}* n'a pas participé au cours de *${cours}* le ${date}.

${remarque ? `Info: ${remarque}` : ''}

Cordialement,
École Kastler`,

      // Template 6
      (nom, cours, date, remarque) => 
`📋 *Signalement absence*

Bonjour à vous,

Absence enregistrée: *${nom}* durant *${cours}* (${date})

${remarque ? `Motif signalé: ${remarque}` : 'Merci de vérifier.'}

Direction`,

      // Template 7
      (nom, cours, date, remarque) => 
`⏱️ *Absence détectée*

Chers parents,

*${nom}* a manqué la session de *${cours}* le ${date}.

${remarque ? `Raison: ${remarque}` : ''}

Solidarité,
Équipe pédagogique`,

      // Template 8
      (nom, cours, date, remarque) => 
`✋ *Avis absence étudiant*

Notification officielle,

Absence de *${nom}* - Matière: *${cours}* - Jour: ${date}

${remarque ? `${remarque}` : 'Nous restons disponibles.'}

Respectueusement,
Alfred Kastler`
    ];

    this.templatesRetard = [
      // Template 1
      (nom, cours, date, minutes) => 
`🟡 *Notification de retard*

Cher parent,

*${nom}* est arrivé(e) avec *${minutes} minutes de retard* au cours de *${cours}* le ${date}.

Merci de veiller à la ponctualité.
École Alfred Kastler`,

      // Template 2
      (nom, cours, date, minutes) => 
`⏰ *Retard signalé*

Bonjour,

Votre enfant *${nom}* a été en retard de *${minutes} min* pour la séance de *${cours}* du ${date}.

Nous comptons sur votre vigilance.
L'administration`,

      // Template 3
      (nom, cours, date, minutes) => 
`📍 *Arrivée tardive détectée*

Madame, Monsieur,

Retard: *${nom}* - *${minutes} minutes* au cours de *${cours}* le ${date}.

Merci pour votre compréhension.
Alfred Kastler`,

      // Template 4
      (nom, cours, date, minutes) => 
`⚡ *Alert retard enfant*

Notification,

*${nom}* arrivé(e) avec ${minutes}min de retard en *${cours}* (${date})

SVP prendre note.
Adm.`,

      // Template 5
      (nom, cours, date, minutes) => 
`🕐 *Retard cours scolaire*

Famille,

L'élève *${nom}* a manqué le début du cours *${cours}* (retard: ${minutes}min) le ${date}.

Cordialement,
École`,

      // Template 6
      (nom, cours, date, minutes) => 
`📢 *Annonce retard élève*

Bonjour à vous,

Retard enregistré: *${nom}* - *${minutes} minutes* - Cours: *${cours}* (${date})

Direction`,

      // Template 7
      (nom, cours, date, minutes) => 
`⏳ *Pointage: Retard*

Chers parents,

*${nom}* arrivé tard (${minutes}min) à la séance de *${cours}* le ${date}.

Équipe pédagogique`,

      // Template 8
      (nom, cours, date, minutes) => 
`✋ *Retard à signaler*

Notification officielle,

*${nom}* - Retard: ${minutes} minutes - Matière: *${cours}* - Date: ${date}

Merci de votre attention.
Alfred Kastler`
    ];
  }

  // ✅ NORMALIZE موحّد (ضروري جداً)
  normalizePhone(phone) {
    if (!phone) return null;
    
    let normalized = phone.trim().replace(/\s+/g, '');
    
    if (normalized.startsWith('0')) {
      normalized = '212' + normalized.substring(1);
    } else if (normalized.startsWith('+212')) {
      normalized = normalized.substring(1);
    } else if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    
    return normalized;
  }

  // ✅ SMART DELAY (6-8 ثواني + pause كل 10)
  async smartDelay() {
    this.sentCount++;

    if (this.sentCount % this.PAUSE_INTERVAL === 0) {
      console.log(`⏸️ PAUSE: 6 دقائق (بعد ${this.sentCount} رسائل)...`);
      await this.delay(this.PAUSE_DURATION);
      console.log(`✅ استئناف الإرسال...`);
    } else {
      const delayTime = this.DELAY_MIN + Math.random() * (this.DELAY_MAX - this.DELAY_MIN);
      const seconds = Math.round(delayTime / 1000);
      console.log(`⏱️ انتظار ${seconds}ثواني (رسالة ${this.sentCount}/50)`);
      await this.delay(delayTime);
    }
  }

  // ✅ إرسال الرسالة (بسيط + آمن)
  async envoyerMessage(phone, message) {
    try {
      const phoneNormalized = this.normalizePhone(phone);
      
      if (!phoneNormalized) {
        console.error(`❌ رقم غير صالح: ${phone}`);
        return { success: false, error: 'رقم غير صالح' };
      }

      // احترام الـ minimum delay
      const now = Date.now();
      const timeSinceLastMsg = now - this.lastMessageTime;
      if (timeSinceLastMsg < 1000) {
        await this.delay(1000 - timeSinceLastMsg);
      }
      this.lastMessageTime = Date.now();

      const url = `${this.baseUrl}/send-message`;
      
      const response = await axios.post(url, {
        to: phoneNormalized,
        text: message
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`✅ رسالة أرسلت ل ${phoneNormalized}`);
      return { 
        success: true, 
        data: response.data,
        messageId: response.data?.messageId || null
      };
      
    } catch (error) {
      console.error(`❌ خطأ: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.status === 429) {
        console.error(`⚠️ RATE LIMIT: انتظار 30 ثانية...`);
        await this.delay(30000);
      }
      
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  // ✅ اختيار template عشوائي
  getRandomTemplate(templates) {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // ✅ إشعار غياب
  async notifierAbsence(etudiant, cours, dateSession, remarque = '') {
    const nomEtudiant = etudiant.nomComplet;
    const dateFormatee = new Date(dateSession).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const resultats = [];
    const numerosEnvoyes = new Set();

    // ✅ PÈRE
    if (etudiant.telephonePere && etudiant.telephonePere.trim()) {
      const phoneNorm = this.normalizePhone(etudiant.telephonePere);
      
      if (!numerosEnvoyes.has(phoneNorm)) {
        const template = this.getRandomTemplate(this.templatesAbsence);
        const message = template(nomEtudiant, cours, dateFormatee, remarque);
        
        console.log(`📤 إرسال للأب: ${etudiant.telephonePere}`);
        const result = await this.envoyerMessage(etudiant.telephonePere, message);
        resultats.push({ 
          destinataire: 'الأب', 
          telephone: etudiant.telephonePere,
          ...result 
        });
        
        numerosEnvoyes.add(phoneNorm);
        await this.smartDelay();
      }
    }

    // ✅ الأم
    if (etudiant.telephoneMere && etudiant.telephoneMere.trim()) {
      const phoneNorm = this.normalizePhone(etudiant.telephoneMere);
      
      if (!numerosEnvoyes.has(phoneNorm)) {
        const template = this.getRandomTemplate(this.templatesAbsence);
        const message = template(nomEtudiant, cours, dateFormatee, remarque);
        
        console.log(`📤 إرسال للأم: ${etudiant.telephoneMere}`);
        const result = await this.envoyerMessage(etudiant.telephoneMere, message);
        resultats.push({ 
          destinataire: 'الأم', 
          telephone: etudiant.telephoneMere,
          ...result 
        });
        
        numerosEnvoyes.add(phoneNorm);
        await this.smartDelay();
      }
    }

    // ✅ FALLBACK: الطالب
    if (resultats.length === 0 && etudiant.telephoneEtudiant) {
      const phoneNorm = this.normalizePhone(etudiant.telephoneEtudiant);
      
      if (!numerosEnvoyes.has(phoneNorm)) {
        const template = this.getRandomTemplate(this.templatesAbsence);
        const message = template(nomEtudiant, cours, dateFormatee, remarque);
        
        console.log(`📤 إرسال للطالب: ${etudiant.telephoneEtudiant}`);
        const result = await this.envoyerMessage(etudiant.telephoneEtudiant, message);
        resultats.push({ 
          destinataire: 'الطالب', 
          telephone: etudiant.telephoneEtudiant,
          ...result 
        });
      }
    }

    console.log(`✅ غياب: ${nomEtudiant} - ${resultats.length} رسالة(s) ✅`);

    return {
      etudiant: nomEtudiant,
      messagesEnvoyes: resultats.length,
      details: resultats
    };
  }

  // ✅ إشعار تأخر
  async notifierRetard(etudiant, cours, dateSession, retardMinutes) {
    const nomEtudiant = etudiant.nomComplet;
    const dateFormatee = new Date(dateSession).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const resultats = [];
    const numerosEnvoyes = new Set();

    // ✅ PÈRE
    if (etudiant.telephonePere && etudiant.telephonePere.trim()) {
      const phoneNorm = this.normalizePhone(etudiant.telephonePere);
      
      if (!numerosEnvoyes.has(phoneNorm)) {
        const template = this.getRandomTemplate(this.templatesRetard);
        const message = template(nomEtudiant, cours, dateFormatee, retardMinutes);
        
        console.log(`📤 تأخر - الأب: ${etudiant.telephonePere}`);
        const result = await this.envoyerMessage(etudiant.telephonePere, message);
        resultats.push({ 
          destinataire: 'الأب', 
          telephone: etudiant.telephonePere, 
          ...result 
        });
        
        numerosEnvoyes.add(phoneNorm);
        await this.smartDelay();
      }
    }

    // ✅ الأم
    if (etudiant.telephoneMere && etudiant.telephoneMere.trim()) {
      const phoneNorm = this.normalizePhone(etudiant.telephoneMere);
      
      if (!numerosEnvoyes.has(phoneNorm)) {
        const template = this.getRandomTemplate(this.templatesRetard);
        const message = template(nomEtudiant, cours, dateFormatee, retardMinutes);
        
        console.log(`📤 تأخر - الأم: ${etudiant.telephoneMere}`);
        const result = await this.envoyerMessage(etudiant.telephoneMere, message);
        resultats.push({ 
          destinataire: 'الأم', 
          telephone: etudiant.telephoneMere, 
          ...result 
        });
        
        numerosEnvoyes.add(phoneNorm);
        await this.smartDelay();
      }
    }

    // ✅ FALLBACK: الطالب
    if (resultats.length === 0 && etudiant.telephoneEtudiant) {
      const phoneNorm = this.normalizePhone(etudiant.telephoneEtudiant);
      
      if (!numerosEnvoyes.has(phoneNorm)) {
        const template = this.getRandomTemplate(this.templatesRetard);
        const message = template(nomEtudiant, cours, dateFormatee, retardMinutes);
        
        console.log(`📤 تأخر - الطالب: ${etudiant.telephoneEtudiant}`);
        const result = await this.envoyerMessage(etudiant.telephoneEtudiant, message);
        resultats.push({ 
          destinataire: 'الطالب', 
          telephone: etudiant.telephoneEtudiant, 
          ...result 
        });
      }
    }

    console.log(`✅ تأخر: ${nomEtudiant} - ${resultats.length} رسالة(s) ✅`);

    return { 
      etudiant: nomEtudiant, 
      messagesEnvoyes: resultats.length, 
      details: resultats 
    };
  }

  // ✅ اختبار الاتصال
  async testerConnexion(phone = '0660079060') {
    const messageTest = `✅ *اختبار نظام WhatsApp*

مدرسة ألفريد كاستلر

الاتصال بـ WasenderAPI يعمل بشكل صحيح.

${new Date().toLocaleString('ar-MA')}`;
    
    return await this.envoyerMessage(phone, messageTest);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      messagesEnvoyes: this.sentCount,
      lastMessageTime: new Date(this.lastMessageTime).toLocaleString('ar-MA')
    };
  }
}

module.exports = new WhatsAppServicePRO();