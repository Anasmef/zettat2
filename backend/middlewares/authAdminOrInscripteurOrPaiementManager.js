// middlewares/authAdminOrInscripteurOrPaiementManager.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const Inscripteur = require('../models/inscripteurModel');
const PaiementManager = require('../models/paiementManagerModel');

const authAdminOrInscripteurOrPaiementManager = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token requis' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');

    // Essayer Admin
    const admin = await Admin.findById(decoded.id);
    if (admin && admin.actif) {
      req.adminId = admin._id;
      req.userRole = 'admin';
      req.user = admin;
      return next();
    }

    // Essayer Inscripteur
    const inscripteur = await Inscripteur.findById(decoded.id);
    if (inscripteur && inscripteur.actif) {
      req.inscripteurId = inscripteur._id;
      req.userRole = 'inscripteur';
      req.user = inscripteur;
      return next();
    }

    // Essayer PaiementManager
    const paiementManager = await PaiementManager.findById(decoded.id);
    if (paiementManager && paiementManager.actif) {
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