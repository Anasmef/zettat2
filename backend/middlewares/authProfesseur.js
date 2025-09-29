const jwt = require('jsonwebtoken');
const Professeur = require('../models/professeurModel'); // Ajustez le chemin selon votre structure

const authProfesseur = async (req, res, next) => {
  try {
    console.log('=== MIDDLEWARE AUTH PROFESSEUR ===');
    
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token reçu:', token ? 'présent' : 'absent');

    if (!token) {
      console.log('❌ Aucun token fourni');
      return res.status(401).json({ message: 'Accès refusé. Aucun token fourni.' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');
    console.log('Token décodé:', decoded);

    // Vérifier le rôle
    if (decoded.role !== 'prof') {
      console.log('❌ Rôle incorrect:', decoded.role);
      return res.status(403).json({ message: 'Accès non autorisé (rôle incorrect).' });
    }

    // ✅ RÉCUPÉRER L'OBJET PROFESSEUR COMPLET DEPUIS LA BASE
    const professeur = await Professeur.findById(decoded.id).select('-motDePasse');
    console.log('Professeur trouvé:', professeur ? professeur.nom : 'aucun');
    
    if (!professeur) {
      console.log('❌ Professeur introuvable pour ID:', decoded.id);
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    if (!professeur.actif) {
      console.log('❌ Professeur inactif:', professeur.email);
      return res.status(403).json({ message: 'Compte professeur inactif' });
    }

    // ✅ ATTACHER À LA FOIS L'ID ET L'OBJET COMPLET À LA REQUÊTE
    req.professeurId = professeur._id;
    req.professeur = professeur; // CRUCIAL pour éviter l'erreur "Cannot read properties of undefined"
    
    console.log('✅ Authentification réussie:', professeur.nom);
    next();

  } catch (err) {
    console.error('❌ Erreur middleware auth professeur:', err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide.' });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré. Reconnectez-vous.' });
    } else if (err.name === 'CastError') {
      return res.status(400).json({ message: 'ID professeur invalide dans le token.' });
    } else {
      return res.status(500).json({ 
        message: 'Erreur serveur authentification',
        error: err.message 
      });
    }
  }
};

module.exports = authProfesseur;