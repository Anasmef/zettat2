// services/whatsappSender.js
// ✅ Un seul envoi HTTP vers WABridges + CLASSIFICATION de l'erreur.
// Ce fichier ne fait AUCUNE attente : le rythme est géré par notificationQueue.
const axios = require('axios');
const whatsappService = require('./whatsappService'); // on réutilise la même config (API key, bridge id)

/**
 * Types retournés :
 *  'ok'              → message envoyé
 *  'deconnecte'      → bridge non appairé / session coupée / clé invalide → PAUSE de la queue
 *  'numero_invalide' → le numéro n'a pas WhatsApp / numéro incorrect      → numéro bloqué
 *  'temporaire'      → 429, 502, 503, 504, timeout, réseau                → retry avec attente
 *  'echec'           → autre erreur définitive
 *
 * ⚠️ Les mots-clés ci-dessous sont des hypothèses : regardez les logs "❌ [WABridges]"
 *    (ils affichent le vrai code HTTP + corps) et ajustez les regex si besoin.
 */
function classer(status, texte, codeReseau) {
  const t = (texte || '').toLowerCase();

  if (!status) {
    // pas de réponse HTTP : timeout / DNS / connexion refusée
    return 'temporaire';
  }
  if (status === 401 || status === 403 ||
      /not[ _-]?(paired|connected|linked)|unpaired|logged[ _-]?out|disconnected|session[ _-]?(ended|closed|expired)/.test(t)) {
    return 'deconnecte';
  }
  if (/not (registered|on whatsapp|a whatsapp)|no whatsapp|invalid (number|phone|chat|jid)|does not exist|isn't on whatsapp/.test(t)) {
    return 'numero_invalide';
  }
  if ([429, 502, 503, 504].includes(status)) return 'temporaire';
  return 'echec';
}

async function envoyer(phone, body) {
  try {
    const res = await axios.post(
      `${whatsappService.WA_BASE_URL}/instances/${whatsappService.WA_BRIDGE_ID}/proxy/send/text`,
      { chat: phone, body },
      {
        headers: {
          Authorization: `Bearer ${whatsappService.WA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    // ✅ WABridges renvoie "message_id" (et non messageId)
    return { type: 'ok', messageId: res.data?.message_id || res.data?.messageId || null };

  } catch (err) {
    const status = err.response?.status || null;
    const data = err.response?.data;
    const texte = typeof data === 'string' ? data : JSON.stringify(data || err.message || '');
    const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10);

    console.error(`❌ [WABridges] ${phone} → HTTP ${status || 'réseau'} : ${texte.slice(0, 300)}`);

    return {
      type: classer(status, texte, err.code),
      status,
      error: texte.slice(0, 300),
      retryAfterMs: retryAfter > 0 ? retryAfter * 1000 : null
    };
  }
}

module.exports = { envoyer, classer };