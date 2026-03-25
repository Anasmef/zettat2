// ============================================
// ✅ DUAL API - UltraMsg FIRST → WaSender AUTO
// Messages bilingues FR + AR avec période matin/soir
// ============================================

const axios = require('axios');

class WhatsAppService {
  constructor() {

    // ✅ API 1 - UltraMsg (RAPIDE - PRINCIPALE)
    this.ULTRAMSG_TOKEN = '67zb1kmeym6y31as';
    this.ULTRAMSG_URL   = 'https://api.ultramsg.com/instance164744/messages/chat';

    // ✅ API 2 - WaSender (BACKUP AUTO)
    this.WASENDER_TOKEN = '6fb0a3f2b3ab2ac2afdd71f8a3c68f8614a515c922f769cf0f7f914a065cb513';
    this.WASENDER_URL   = 'https://www.wasenderapi.com/api/send-message';

    // UltraMsg état
    this.ultraFails  = 0;
    this.ultraActive = true;

    // WaSender délais
    this.waSenderCount = 0;
    this.lastSentTime  = 0;
    this.WA_DELAY    = 3000;
    this.WA_PAUSE_AT = 15;
    this.WA_PAUSE_MS = 120000;
  }

  // ============================================
  // ✅ PÉRIODE : labels FR + AR
  // ============================================
  getPeriodeLabel(periode) {
    if (periode === 'matin') return { fr: 'matin 🌅',   ar: 'الصباح 🌅' };
    if (periode === 'soir')  return { fr: 'soir 🌙',    ar: 'المساء 🌙' };
    return { fr: '', ar: '' };
  }

  // ============================================
  // ✅ TEMPLATES ABSENCE bilingues FR + AR + période
  // ============================================
  buildAbsenceMessage(nom, cours, date, remarque, periode) {
    const p = this.getPeriodeLabel(periode);

    const templates = [

      () =>
`🔴 *Notification d'absence | إشعار غياب*
――――――――――――――――――――
🇫🇷 *Français :*
Cher parent, *${nom}* était absent(e) au cours de *${cours}*
📅 ${date} ${p.fr ? `| 🕐 Session du ${p.fr}` : ''}
${remarque ? `Remarque: ${remarque}` : 'Veuillez contacter l\'école pour justifier l\'absence.'}

🇲🇦 *العربية :*
ولي الأمر الكريم، نُعلمكم بغياب التلميذ(ة) *${nom}* عن حصة *${cours}*
📅 ${date} ${p.ar ? `| 🕐 حصة ${p.ar}` : ''}
${remarque ? `ملاحظة: ${remarque}` : 'يرجى الاتصال بالإدارة لتبرير الغياب.'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`⚠️ *Alerte absence | تنبيه غياب*
――――――――――――――――――――
🇫🇷 Votre enfant *${nom}* n'a pas assisté au cours de *${cours}*
📅 ${date}${p.fr ? ` - ${p.fr}` : ''}
${remarque ? `Note: ${remarque}` : 'Merci de justifier cette absence.'}

🇲🇦 تغيّب التلميذ(ة) *${nom}* عن حصة *${cours}*
📅 ${date}${p.ar ? ` - ${p.ar}` : ''}
${remarque ? `ملاحظة: ${remarque}` : 'شكراً لتواصلكم مع الإدارة.'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`📌 *Absence constatée | غياب مسجّل*
――――――――――――――――――――
🇫🇷 *${nom}* - Cours: *${cours}*
📅 ${date}${p.fr ? ` | Session: ${p.fr}` : ''}
${remarque ? `Observation: ${remarque}` : 'Nous apprécions votre vigilance.'}

🇲🇦 *${nom}* - المادة: *${cours}*
📅 ${date}${p.ar ? ` | الحصة: ${p.ar}` : ''}
${remarque ? `ملاحظة: ${remarque}` : 'نقدر تعاونكم ومتابعتكم.'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`❌ *Absence signalée | إشعار بالغياب*
――――――――――――――――――――
🇫🇷 *${nom}* absent(e) du cours *${cours}*
📅 ${date}${p.fr ? ` (${p.fr})` : ''}
${remarque ? `Détail: ${remarque}` : 'SVP contactez l\'administration.'}

🇲🇦 التلميذ(ة) *${nom}* غائب(ة) عن *${cours}*
📅 ${date}${p.ar ? ` (${p.ar})` : ''}
${remarque ? `تفاصيل: ${remarque}` : 'يرجى التواصل مع الإدارة.'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🚨 *Avis d'absence | إخطار بالغياب*
――――――――――――――――――――
🇫🇷 L'élève *${nom}* n'a pas participé au cours de *${cours}*
📅 ${date}${p.fr ? ` - ${p.fr}` : ''}
${remarque ? `Info: ${remarque}` : 'Merci de votre compréhension.'}

🇲🇦 لم يحضر(تحضر) التلميذ(ة) *${nom}* حصة *${cours}*
📅 ${date}${p.ar ? ` - ${p.ar}` : ''}
${remarque ? `معلومة: ${remarque}` : 'شكراً على تفهمكم.'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`📋 *Absence enregistrée | تسجيل الغياب*
――――――――――――――――――――
🇫🇷 *${nom}* absent(e) durant *${cours}*
📅 ${date}${p.fr ? ` | ${p.fr}` : ''}
${remarque ? `Motif: ${remarque}` : 'Merci de vérifier avec votre enfant.'}

🇲🇦 تم تسجيل غياب *${nom}* في حصة *${cours}*
📅 ${date}${p.ar ? ` | ${p.ar}` : ''}
${remarque ? `السبب: ${remarque}` : 'يرجى الاستفسار من التلميذ(ة).'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`⏱️ *Absence détectée | رصد الغياب*
――――――――――――――――――――
🇫🇷 *${nom}* a manqué la session de *${cours}*
📅 ${date}${p.fr ? ` - ${p.fr}` : ''}
${remarque ? `Raison: ${remarque}` : 'Équipe pédagogique à votre disposition.'}

🇲🇦 تغيّب(ت) *${nom}* عن حصة *${cours}*
📅 ${date}${p.ar ? ` - ${p.ar}` : ''}
${remarque ? `السبب: ${remarque}` : 'الفريق التربوي رهن إشارتكم.'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`✋ *Notification absence | إعلام بالغياب*
――――――――――――――――――――
🇫🇷 *${nom}* - Matière: *${cours}*
📅 ${date}${p.fr ? ` | ${p.fr}` : ''}
${remarque ? `${remarque}` : 'Nous restons disponibles pour toute question.'}

🇲🇦 *${nom}* - المادة: *${cours}*
📅 ${date}${p.ar ? ` | ${p.ar}` : ''}
${remarque ? `${remarque}` : 'نحن في خدمتكم لأي استفسار.'}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`

    ];

    return templates[Math.floor(Math.random() * templates.length)]();
  }

  // ============================================
  // ✅ TEMPLATES RETARD bilingues FR + AR + période
  // ============================================
  buildRetardMessage(nom, cours, date, min, periode) {
    const p = this.getPeriodeLabel(periode);

    const templates = [

      () =>
`🟡 *Notification de retard | إشعار تأخر*
――――――――――――――――――――
🇫🇷 *Français :*
Cher parent, *${nom}* est arrivé(e) avec *${min} minutes de retard*
Cours: *${cours}* | 📅 ${date}${p.fr ? ` | ${p.fr}` : ''}
Merci de veiller à la ponctualité.

🇲🇦 *العربية :*
ولي الأمر الكريم، وصل(ت) التلميذ(ة) *${nom}* متأخر(ة) *${min} دقيقة*
المادة: *${cours}* | 📅 ${date}${p.ar ? ` | ${p.ar}` : ''}
يرجى الحرص على الانضباط في المواعيد. شكراً.
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`⏰ *Retard signalé | تسجيل تأخر*
――――――――――――――――――――
🇫🇷 *${nom}* était en retard de *${min} min* pour *${cours}*
📅 ${date}${p.fr ? ` - ${p.fr}` : ''}
Nous comptons sur votre vigilance.

🇲🇦 تأخر(ت) التلميذ(ة) *${nom}* بمقدار *${min} دقيقة* عن حصة *${cours}*
📅 ${date}${p.ar ? ` - ${p.ar}` : ''}
نرجو متابعة مواعيد الحضور.
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`📍 *Arrivée tardive | حضور متأخر*
――――――――――――――――――――
🇫🇷 *${nom}* - *${min} minutes* de retard
Cours: *${cours}* | 📅 ${date}${p.fr ? ` (${p.fr})` : ''}
Merci pour votre compréhension.

🇲🇦 *${nom}* - تأخر: *${min} دقيقة*
المادة: *${cours}* | 📅 ${date}${p.ar ? ` (${p.ar})` : ''}
شكراً على تفهمكم.
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`⚡ *Retard enfant | تأخر التلميذ*
――――――――――――――――――――
🇫🇷 *${nom}* arrivé(e) avec ${min}min de retard en *${cours}*
📅 ${date}${p.fr ? ` | ${p.fr}` : ''}
SVP prendre note.

🇲🇦 وصل(ت) *${nom}* متأخر(ة) ${min} دقيقة في مادة *${cours}*
📅 ${date}${p.ar ? ` | ${p.ar}` : ''}
يرجى الاطلاع والمتابعة.
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🕐 *Retard scolaire | تأخر مدرسي*
――――――――――――――――――――
🇫🇷 *${nom}* a manqué le début de *${cours}* (retard: ${min}min)
📅 ${date}${p.fr ? ` | ${p.fr}` : ''}

🇲🇦 فاتت التلميذ(ة) *${nom}* بداية حصة *${cours}* بتأخر ${min} دقيقة
📅 ${date}${p.ar ? ` | ${p.ar}` : ''}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`📢 *Retard enregistré | تأخر مسجّل*
――――――――――――――――――――
🇫🇷 *${nom}* - *${min} minutes* - Cours: *${cours}*
📅 ${date}${p.fr ? ` - ${p.fr}` : ''}

🇲🇦 تم تسجيل تأخر *${nom}* بمقدار *${min} دقيقة* في *${cours}*
📅 ${date}${p.ar ? ` - ${p.ar}` : ''}
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`⏳ *Retard détecté | رصد التأخر*
――――――――――――――――――――
🇫🇷 *${nom}* arrivé(e) tard (${min}min) à *${cours}*
📅 ${date}${p.fr ? ` | ${p.fr}` : ''}
Équipe pédagogique.

🇲🇦 رُصد تأخر *${nom}* (${min} دقيقة) في حصة *${cours}*
📅 ${date}${p.ar ? ` | ${p.ar}` : ''}
الفريق التربوي.
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`✋ *Retard à signaler | إشعار تأخر*
――――――――――――――――――――
🇫🇷 *${nom}* - Retard: ${min} min - Matière: *${cours}*
📅 ${date}${p.fr ? ` | ${p.fr}` : ''}
Merci de votre attention.

🇲🇦 *${nom}* - تأخر: ${min} دقيقة - المادة: *${cours}*
📅 ${date}${p.ar ? ` | ${p.ar}` : ''}
شكراً على اهتمامكم.
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`

    ];

    return templates[Math.floor(Math.random() * templates.length)]();
  }

  // ============================================
  // ✅ TEMPLATES ANNIVERSAIRE bilingues FR + AR
  // ============================================
  buildAnniversaireMessage(nom) {
    const templates = [

      () =>
`🎂 *Joyeux anniversaire ! | عيد ميلاد سعيد !*
――――――――――――――――――――
🇫🇷 *Français :*
Cher parent, toute l'équipe de l'école Alfred Kastler est heureuse de souhaiter un
🎉 *Joyeux anniversaire à ${nom} !* 🎉
Nous lui souhaitons une journée pleine de joie, de bonheur et de réussite scolaire 🌟

🇲🇦 *العربية :*
ولي الأمر الكريم، يسعد فريق مؤسسة ألفريد كاستلر أن يتقدم بأحر التهاني بمناسبة عيد ميلاد
🎉 *${nom}* 🎉
نتمنى له/لها يوماً مليئاً بالفرح والسعادة والتوفيق الدراسي 🌟
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🌟 *Anniversaire élève | عيد ميلاد تلميذ*
――――――――――――――――――――
🇫🇷 Toute l'équipe pédagogique félicite *${nom}* pour son anniversaire 🎂
Que cette nouvelle année soit synonyme de succès et de bonheur ! 🎊

🇲🇦 يُهنئ الفريق التربوي كامل التلميذ(ة) *${nom}* بعيد ميلاده/ها 🎂
نتمنى أن يكون هذا العام حافلاً بالنجاح والسعادة ! 🎊
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🎊 *Joyeux anniversaire | مبروك عيد الميلاد*
――――――――――――――――――――
🇫🇷 L'école Alfred Kastler souhaite un très
🎂 *Joyeux anniversaire à ${nom}* 🎂
Beaucoup de bonheur, de santé et de réussite ! ✨

🇲🇦 تُهدي مؤسسة ألفريد كاستلر أجمل التهاني لـ
🎂 *${nom}* بمناسبة عيد ميلاده/ها 🎂
كل عام وأنتم بخير، وعمر مديد بالصحة والنجاح ! ✨
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🎈 *Bonne fête ! | كل عام وأنتم بخير !*
――――――――――――――――――――
🇫🇷 Cher parent, nous avons la joie de vous informer que
*${nom}* fête son anniversaire aujourd'hui 🎂
Toute l'équipe lui souhaite une magnifique journée pleine de rires et de bonheur ! 🥳

🇲🇦 ولي الأمر الكريم، يسعدنا إعلامكم بأن
*${nom}* يحتفل/تحتفل بعيد ميلاده/ها اليوم 🎂
يتمنى له/لها الفريق كامل يوماً رائعاً مليئاً بالضحكات والسعادة ! 🥳
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🥳 *Célébration anniversaire | احتفال عيد الميلاد*
――――――――――――――――――――
🇫🇷 *${nom}* souffle ses bougies aujourd'hui ! 🕯️🎂
L'équipe d'Alfred Kastler lui adresse ses vœux les plus chaleureux.
Santé, bonheur et excellence scolaire ! 💫

🇲🇦 *${nom}* ينفخ/تنفخ الشموع اليوم ! 🕯️🎂
يبعث فريق ألفريد كاستلر بأصدق التمنيات.
صحة، سعادة وتميز دراسي ! 💫
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🎁 *Joyeux anniversaire ! | عيد ميلاد مبارك !*
――――――――――――――――――――
🇫🇷 En ce jour spécial, l'école Alfred Kastler tient à féliciter
🌸 *${nom}* 🌸
pour son anniversaire et lui souhaite tout le bonheur du monde ! 🌈

🇲🇦 في هذا اليوم المميز، تتقدم مؤسسة ألفريد كاستلر بالتهنئة لـ
🌸 *${nom}* 🌸
بمناسبة عيد ميلاده/ها وتتمنى له/لها كل السعادة ! 🌈
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`⭐ *Happy Birthday ! | عيد ميلاد سعيد !*
――――――――――――――――――――
🇫🇷 *${nom}*, toute la famille Alfred Kastler te souhaite un
🎂 *Joyeux anniversaire* 🎂
Que tes rêves se réalisent et que cette année t'apporte joie et succès ! 🌟

🇲🇦 *${nom}*، تتمنى لك عائلة ألفريد كاستلر كاملة
🎂 *عيد ميلاد سعيد* 🎂
لتتحقق أحلامك وتكون هذه السنة مليئة بالفرح والنجاح ! 🌟
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`,

      () =>
`🌈 *Félicitations ! | مبروك !*
――――――――――――――――――――
🇫🇷 Cher parent, c'est avec grand plaisir que nous vous souhaitons
un *joyeux anniversaire pour ${nom}* ! 🎂🎉
Que cette belle journée soit le début d'une année remplie de succès ! ✨

🇲🇦 ولي الأمر الكريم، يسعدنا أن نُهنئكم بمناسبة
عيد ميلاد *${nom}* ! 🎂🎉
نتمنى أن يكون هذا اليوم الجميل بداية عام مليء بالنجاحات ! ✨
――――――――――――――――――――
🏫 مؤسسة ألفريد كاستلر | École Alfred Kastler`

    ];

    return templates[Math.floor(Math.random() * templates.length)]();
  }

  // ============================================
  // NORMALIZE PHONE
  // ============================================
  normalizePhone(phone) {
    if (!phone) return null;
    let p = phone.trim().replace(/\s+/g, '');
    if (p.startsWith('0'))    p = '212' + p.substring(1);
    else if (p.startsWith('+')) p = p.substring(1);
    return p;
  }

  // ============================================
  // ENVOI ULTRAMSG (rapide)
  // ============================================
  async sendViaUltraMsg(phone, message) {
    try {
      const to = phone.startsWith('+') ? phone : '+' + this.normalizePhone(phone);
      const params = new URLSearchParams();
      params.append('token', this.ULTRAMSG_TOKEN);
      params.append('to', to);
      params.append('body', message);

      const res = await axios.post(this.ULTRAMSG_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      });

      const d = res.data;
      if (d && (d.sent === 'true' || d.sent === true || d.id)) {
        this.ultraFails = 0;
        console.log(`✅ [UltraMsg] → ${to}`);
        return { success: true, api: 'ultramsg', data: d };
      } else {
        throw new Error(d?.error || JSON.stringify(d));
      }
    } catch (err) {
      this.ultraFails++;
      const msg = err.response?.data?.error || err.message;
      console.warn(`⚠️ [UltraMsg] Échec #${this.ultraFails}: ${msg}`);
      if (this.ultraFails >= 3) {
        this.ultraActive = false;
        console.error(`🔴 [UltraMsg] DÉSACTIVÉ 3 min`);
        setTimeout(() => {
          this.ultraActive = true;
          this.ultraFails = 0;
          console.log(`🟢 [UltraMsg] RÉACTIVÉ`);
        }, 3 * 60 * 1000);
      }
      return { success: false, api: 'ultramsg', error: msg };
    }
  }

  // ============================================
  // ENVOI WASENDER (backup)
  // ============================================
  async sendViaWaSender(phone, message) {
    try {
      const phoneNorm = this.normalizePhone(phone);
      if (!phoneNorm) return { success: false, error: 'Numéro invalide' };

      const elapsed = Date.now() - this.lastSentTime;
      if (elapsed < 1500) await this.delay(1500 - elapsed);
      this.lastSentTime = Date.now();

      const res = await axios.post(this.WASENDER_URL, {
        to: phoneNorm,
        text: message
      }, {
        headers: {
          'Authorization': `Bearer ${this.WASENDER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      console.log(`✅ [WaSender] → ${phoneNorm}`);
      return { success: true, api: 'wasender', data: res.data };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error(`❌ [WaSender] Échec: ${msg}`);
      if (err.response?.status === 429) {
        console.warn(`⚠️ [WaSender] Rate limit → attente 20s`);
        await this.delay(20000);
      }
      return { success: false, api: 'wasender', error: msg };
    }
  }

  // ============================================
  // ✅ ENVOI PRINCIPAL - UltraMsg FIRST → WaSender AUTO
  // ============================================
  async envoyerMessage(phone, message) {
    if (this.ultraActive) {
      const result = await this.sendViaUltraMsg(phone, message);
      if (result.success) return result;
      console.log(`🔄 Bascule automatique → WaSender`);
    } else {
      console.log(`⏭️ UltraMsg inactif → WaSender direct`);
    }
    return await this.sendViaWaSender(phone, message);
  }

  // ============================================
  // DÉLAI INTELLIGENT
  // ============================================
  async smartDelay() {
    if (this.ultraActive && this.ultraFails === 0) {
      await this.delay(200);
      return;
    }
    this.waSenderCount++;
    if (this.waSenderCount % this.WA_PAUSE_AT === 0) {
      console.log(`⏸️ [WaSender] Pause 2 min...`);
      await this.delay(this.WA_PAUSE_MS);
      console.log(`▶️ [WaSender] Reprise`);
    } else {
      const d = this.WA_DELAY + Math.random() * 1000;
      console.log(`⏱️ [WaSender] Attente ${Math.round(d/1000)}s...`);
      await this.delay(d);
    }
  }

  formatDate(dateSession) {
    return new Date(dateSession).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ============================================
  // ✅ NOTIFIER ABSENCE - TOUS LES PARENTS + période
  // ============================================
  async notifierAbsence(etudiant, cours, dateSession, remarque = '', periode = '') {
    const nom  = etudiant.nomComplet;
    const date = this.formatDate(dateSession);
    const resultats = [];
    const dejaSent  = new Set();

    // ── PÈRE ──
    if (etudiant.telephonePere?.trim()) {
      const norm = this.normalizePhone(etudiant.telephonePere);
      if (!dejaSent.has(norm)) {
        const msg = this.buildAbsenceMessage(nom, cours, date, remarque, periode);
        console.log(`📤 [Absence ${periode}→Père] ${etudiant.telephonePere}`);
        const r = await this.envoyerMessage(etudiant.telephonePere, msg);
        resultats.push({ destinataire: 'Père', telephone: etudiant.telephonePere, ...r });
        dejaSent.add(norm);
        await this.smartDelay();
      }
    }

    // ── MÈRE ──
    if (etudiant.telephoneMere?.trim()) {
      const norm = this.normalizePhone(etudiant.telephoneMere);
      if (!dejaSent.has(norm)) {
        const msg = this.buildAbsenceMessage(nom, cours, date, remarque, periode);
        console.log(`📤 [Absence ${periode}→Mère] ${etudiant.telephoneMere}`);
        const r = await this.envoyerMessage(etudiant.telephoneMere, msg);
        resultats.push({ destinataire: 'Mère', telephone: etudiant.telephoneMere, ...r });
        dejaSent.add(norm);
        await this.smartDelay();
      }
    }

    // ── FALLBACK ÉTUDIANT ──
    if (resultats.length === 0 && etudiant.telephoneEtudiant?.trim()) {
      const norm = this.normalizePhone(etudiant.telephoneEtudiant);
      if (!dejaSent.has(norm)) {
        const msg = this.buildAbsenceMessage(nom, cours, date, remarque, periode);
        console.log(`📤 [Absence ${periode}→Étudiant] ${etudiant.telephoneEtudiant}`);
        const r = await this.envoyerMessage(etudiant.telephoneEtudiant, msg);
        resultats.push({ destinataire: 'Étudiant', telephone: etudiant.telephoneEtudiant, ...r });
      }
    }

    const ok = resultats.filter(r => r.success).length;
    console.log(`✅ Absence [${periode}] ${nom}: ${ok}/${resultats.length} envoyé(s)`);
    return { etudiant: nom, messagesEnvoyes: resultats.length, details: resultats };
  }

  // ============================================
  // ✅ NOTIFIER RETARD - TOUS LES PARENTS + période
  // ============================================
  async notifierRetard(etudiant, cours, dateSession, retardMinutes, periode = '') {
    // ✅ Minimum 15 min toujours
    retardMinutes = Math.max(15, retardMinutes || 15);

    const nom  = etudiant.nomComplet;
    const date = this.formatDate(dateSession);
    const resultats = [];
    const dejaSent  = new Set();

    // ── PÈRE ──
    if (etudiant.telephonePere?.trim()) {
      const norm = this.normalizePhone(etudiant.telephonePere);
      if (!dejaSent.has(norm)) {
        const msg = this.buildRetardMessage(nom, cours, date, retardMinutes, periode);
        console.log(`📤 [Retard ${periode}→Père] ${etudiant.telephonePere}`);
        const r = await this.envoyerMessage(etudiant.telephonePere, msg);
        resultats.push({ destinataire: 'Père', telephone: etudiant.telephonePere, ...r });
        dejaSent.add(norm);
        await this.smartDelay();
      }
    }

    // ── MÈRE ──
    if (etudiant.telephoneMere?.trim()) {
      const norm = this.normalizePhone(etudiant.telephoneMere);
      if (!dejaSent.has(norm)) {
        const msg = this.buildRetardMessage(nom, cours, date, retardMinutes, periode);
        console.log(`📤 [Retard ${periode}→Mère] ${etudiant.telephoneMere}`);
        const r = await this.envoyerMessage(etudiant.telephoneMere, msg);
        resultats.push({ destinataire: 'Mère', telephone: etudiant.telephoneMere, ...r });
        dejaSent.add(norm);
        await this.smartDelay();
      }
    }

    // ── FALLBACK ÉTUDIANT ──
    if (resultats.length === 0 && etudiant.telephoneEtudiant?.trim()) {
      const norm = this.normalizePhone(etudiant.telephoneEtudiant);
      if (!dejaSent.has(norm)) {
        const msg = this.buildRetardMessage(nom, cours, date, retardMinutes, periode);
        console.log(`📤 [Retard ${periode}→Étudiant] ${etudiant.telephoneEtudiant}`);
        const r = await this.envoyerMessage(etudiant.telephoneEtudiant, msg);
        resultats.push({ destinataire: 'Étudiant', telephone: etudiant.telephoneEtudiant, ...r });
      }
    }

    const ok = resultats.filter(r => r.success).length;
    console.log(`✅ Retard [${periode}] ${nom}: ${ok}/${resultats.length} envoyé(s)`);
    return { etudiant: nom, messagesEnvoyes: resultats.length, details: resultats };
  }

  // ============================================
  // ✅ NOTIFIER ANNIVERSAIRE - PÈRE + MÈRE + ÉTUDIANT
  // ============================================
  async notifierAnniversaire(etudiant) {
    const nom = etudiant.nomComplet;
    const resultats = [];
    const dejaSent = new Set();

    // ── PÈRE ──
    if (etudiant.telephonePere?.trim()) {
      const norm = this.normalizePhone(etudiant.telephonePere);
      if (!dejaSent.has(norm)) {
        const msg = this.buildAnniversaireMessage(nom);
        console.log(`🎂 [Anniversaire→Père] ${etudiant.telephonePere}`);
        const r = await this.envoyerMessage(etudiant.telephonePere, msg);
        resultats.push({ destinataire: 'Père', telephone: etudiant.telephonePere, ...r });
        dejaSent.add(norm);
        await this.smartDelay();
      }
    }

    // ── MÈRE ──
    if (etudiant.telephoneMere?.trim()) {
      const norm = this.normalizePhone(etudiant.telephoneMere);
      if (!dejaSent.has(norm)) {
        const msg = this.buildAnniversaireMessage(nom);
        console.log(`🎂 [Anniversaire→Mère] ${etudiant.telephoneMere}`);
        const r = await this.envoyerMessage(etudiant.telephoneMere, msg);
        resultats.push({ destinataire: 'Mère', telephone: etudiant.telephoneMere, ...r });
        dejaSent.add(norm);
        await this.smartDelay();
      }
    }

    // ── ÉTUDIANT (toujours envoyé, pas juste fallback) ──
    if (etudiant.telephoneEtudiant?.trim()) {
      const norm = this.normalizePhone(etudiant.telephoneEtudiant);
      if (!dejaSent.has(norm)) {
        const msg = this.buildAnniversaireMessage(nom);
        console.log(`🎂 [Anniversaire→Étudiant] ${etudiant.telephoneEtudiant}`);
        const r = await this.envoyerMessage(etudiant.telephoneEtudiant, msg);
        resultats.push({ destinataire: 'Étudiant', telephone: etudiant.telephoneEtudiant, ...r });
        dejaSent.add(norm);
        await this.smartDelay();
      }
    }

    const ok = resultats.filter(r => r.success).length;
    console.log(`✅ Anniversaire ${nom}: ${ok}/${resultats.length} envoyé(s)`);
    return { etudiant: nom, messagesEnvoyes: resultats.length, details: resultats };
  }

  // ============================================
  // TEST
  // ============================================
  async testerConnexion(phone = '0660079060') {
    const msg = `✅ *Test WhatsApp*\nÉcole Alfred Kastler\n${new Date().toLocaleString('fr-FR')}`;
    const u = await this.sendViaUltraMsg(phone, msg + '\n[UltraMsg]');
    console.log(`UltraMsg: ${u.success ? '✅ OK' : '❌ ' + u.error}`);
    const w = await this.sendViaWaSender(phone, msg + '\n[WaSender]');
    console.log(`WaSender: ${w.success ? '✅ OK' : '❌ ' + w.error}`);
    return { ultraMsg: u, waSender: w };
  }

  getStatus() {
    return {
      ultraMsg : { actif: this.ultraActive, echecs: this.ultraFails },
      waSender : { messagesEnvoyes: this.waSenderCount },
      apiActive: this.ultraActive ? '🟢 UltraMsg (rapide)' : '🟡 WaSender (backup)'
    };
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = new WhatsAppService();