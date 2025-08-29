const jwt = require('jsonwebtoken');
const Inscripteur = require('../models/inscripteurModel');

const authInscripteur = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token d\'accès requis' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');
    
    if (decoded.role !== 'inscripteur') {
      return res.status(403).json({ message: 'Accès refusé - Inscripteur requis' });
    }

    const inscripteur = await Inscripteur.findById(decoded.id);
    if (!inscripteur || !inscripteur.actif) {
      return res.status(403).json({ message: 'Compte inscripteur inactif' });
    }

    req.inscripteurId = decoded.id;
    req.inscripteur = inscripteur;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = authInscripteur;