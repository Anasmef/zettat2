const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
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

const authAdminOrPaiementManager = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token requis' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');
    console.log('Token décodé:', decoded);

    // ── Essayer Admin ──
    const admin = await Admin.findById(decoded.id);
    if (admin && admin.actif) {
      const check = checkMinutesAcces(admin, decoded, admin.email);
      if (check.expired) {
        return res.status(403).json({ message: check.message, code: check.code });
      }
      req.userId = admin._id;
      req.user = admin;
      req.userRole = 'admin';
      console.log('Authentification Admin réussie pour:', admin.email);
      return next();
    }

    // ── Essayer PaiementManager ──
    const manager = await PaiementManager.findById(decoded.id);
    if (manager && manager.actif) {
      const check = checkMinutesAcces(manager, decoded, manager.email);
      if (check.expired) {
        return res.status(403).json({ message: check.message, code: check.code });
      }
      req.userId = manager._id;
      req.user = manager;
      req.userRole = 'paiement_manager';
      console.log('Authentification PaiementManager réussie pour:', manager.email);
      return next();
    }

    return res.status(404).json({
      message: 'Utilisateur non trouvé ou compte inactif'
    });

  } catch (err) {
    console.error('Erreur authAdminOrPaiementManager:', err);
    res.status(401).json({
      message: 'Token invalide ou expiré',
      error: err.message
    });
  }
};

module.exports = authAdminOrPaiementManager;