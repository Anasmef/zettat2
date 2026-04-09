const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const Inscripteur = require('../models/inscripteurModel');
const PaiementManager = require('../models/paiementManagerModel');

// ─── Helper : vérifier les minutes d'accès ───────────────────
const checkMinutesAcces = (user, decoded, nom) => {
  if (
    user.minutesAcces !== undefined &&
    user.minutesAcces !== null &&
    user.minutesAcces > 0
  ) {
    const tokenCreatedAt = decoded.iat * 1000; // secondes → ms
    const minutesEcoulees = (Date.now() - tokenCreatedAt) / 60000;

    console.log(`⏱ Minutes écoulées (${nom}): ${minutesEcoulees.toFixed(1)} min`);
    console.log(`⏱ Minutes autorisées (${nom}): ${user.minutesAcces} min`);

    if (minutesEcoulees >= user.minutesAcces) {
      console.log(`❌ Session expirée pour: ${nom}`);
      return {
        expired: true,
        message: `⛔ Votre session a expiré (limite: ${user.minutesAcces} min). Veuillez vous reconnecter.`,
        code: 'SESSION_EXPIRED'
      };
    }
  }
  return { expired: false };
};

const authAdminOrInscripteurOrPaiementManager = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token requis' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');

    // ── Essayer Admin ──
    const admin = await Admin.findById(decoded.id);
    if (admin && admin.actif) {
      const check = checkMinutesAcces(admin, decoded, admin.nom || admin.email);
      if (check.expired) {
        return res.status(403).json({ message: check.message, code: check.code });
      }
      req.adminId = admin._id;
      req.userRole = 'admin';
      req.user = admin;
      return next();
    }

    // ── Essayer Inscripteur ──
    const inscripteur = await Inscripteur.findById(decoded.id);
    if (inscripteur && inscripteur.actif) {
      const check = checkMinutesAcces(inscripteur, decoded, inscripteur.nom || inscripteur.email);
      if (check.expired) {
        return res.status(403).json({ message: check.message, code: check.code });
      }
      req.inscripteurId = inscripteur._id;
      req.userRole = 'inscripteur';
      req.user = inscripteur;
      return next();
    }

    // ── Essayer PaiementManager ──
    const paiementManager = await PaiementManager.findById(decoded.id);
    if (paiementManager && paiementManager.actif) {
      const check = checkMinutesAcces(paiementManager, decoded, paiementManager.nom || paiementManager.email);
      if (check.expired) {
        return res.status(403).json({ message: check.message, code: check.code });
      }
      req.paiementManagerId = paiementManager._id;
      req.userRole = 'paiement_manager';
      req.user = paiementManager;
      return next();
    }

    return res.status(404).json({ message: 'Utilisateur non trouvé ou inactif' });

  } catch (err) {
    console.error('Erreur auth:', err);
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = authAdminOrInscripteurOrPaiementManager;