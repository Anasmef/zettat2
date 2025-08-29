const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const Inscripteur = require('../models/inscripteurModel');

const authAdminOrInscripteur = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token d\'accès requis' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');
    
    if (decoded.role === 'admin') {
      // Vérifier si l'admin existe et est actif
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return res.status(403).json({ message: 'Compte admin introuvable' });
      }
      
      req.adminId = decoded.id;
      req.userRole = 'admin';
      req.userId = decoded.id;
      
    } else if (decoded.role === 'inscripteur') {
      // Vérifier si l'inscripteur existe et est actif
      const inscripteur = await Inscripteur.findById(decoded.id);
      if (!inscripteur || !inscripteur.actif) {
        return res.status(403).json({ message: 'Compte inscripteur inactif ou introuvable' });
      }
      
      req.inscripteurId = decoded.id;
      req.userRole = 'inscripteur';
      req.userId = decoded.id;
      
    } else {
      return res.status(403).json({ message: 'Rôle non autorisé pour cette action' });
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

module.exports = authAdminOrInscripteur;