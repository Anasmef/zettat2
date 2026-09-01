const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const DocumentEtudiant = require('./models/DocumentEtudiant');

const Admin = require('./models/adminModel');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Reclamation = require('./models/Reclamation'); // Ajuster le chemin selon votre structure
const QRCodeGen = require('qrcode');
const Parent = require('./models/Parent'); // ← AJOUTER CETTE LIGNE
const pdfMake = require('pdfmake');
const ListeNoire = require('./models/ListeNoire');
const Notification = require('./models/Notification');
const whatsappService = require('./services/whatsappService');
const notificationQueue = require('./services/notificationQueue');
const { v4: uuidv4 } = require('uuid');
const { Pointage, QRCode } = require('./models/Pointage'); // ou le bon chemin
const Rapport = require('./models/Rapport'); // 👈 importe ton modèle
const Payment = require('./models/Payment');

const jwt = require('jsonwebtoken');
const fs = require('fs');
const Actualite = require('./models/Actualite');
const authInscripteur = require('./middlewares/authInscripteur');
const Commercial = require('./models/commercialModel');
const Inscripteur = require('./models/inscripteurModel');
const authAdminOrInscripteurOrPaiementManager = require('./middlewares/authAdminOrInscripteurOrPaiementManager');
const Bulletin = require('./models/Bulletin'); // Ajustez le chemin selon votre structure
const { NotificationSupprimee, Configuration } = require('./models/notificationModel');
const authPaiementManager = require('./middlewares/authPaiementManager');
const authAdminOrPaiementManager = require('./middlewares/authAdminOrPaiementManager');
const { checkFieldPermissions } = require('./middlewares/checkFieldPermissions');
const ContactMessage = require('./models/contactModel');
const Activity = require('./models/Activity');

const Etudiant = require('./models/etudiantModel');
const multer = require('multer');
const path = require('path');
const uploadMessageFile = require('./middlewares/uploadMessageFile');
const Rappel = require('./models/RappelPaiement');
const Cours = require('./models/coursModel');
const Evenement = require('./models/evenementModel');
const Presence = require('./models/presenceModel');
const Professeur = require('./models/professeurModel'); // تأكد أنك أنشأت هذا الملف
const authAdmin = require('./middlewares/authAdmin');
const authProfesseur = require('./middlewares/authProfesseur');
const authEtudiant = require('./middlewares/authEtudiant');
const Document = require('./models/documentModel');
const Exercice = require('./models/exerciceModel');
const Paiement = require('./models/paiementModel'); // تأكد أنك قمت بإنشاء الملف
// Ajoutez cette ligne avec vos autres imports de modèles
const PaiementManager = require('./models/paiementManagerModel'); // Ajustez le chemin selon votre structure
const Message = require('./models/messageModel');
const Seance = require('./models/Seance');

const app = express();


// Middlewares
app.use(cors());
app.use(express.json());
app.use('/documents', express.static('documents'));
function genererLienLive(nomCours) {
  const dateStr = new Date().toISOString().split('T')[0]; // ex: 2025-07-07
  const nomSession = `Zettat_${nomCours}_${dateStr}`.replace(/\s+/g, '_');
  return `https://meet.jit.si/${nomSession}`;
}

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion à MongoDB réussie');
  require('./services/birthdayCron');
})
.catch((err) => console.error('❌ Erreur MongoDB:', err));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // مجلد الصور
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
// ============================================
// MIDDLEWARE D'AUTHENTIFICATION PARENT
// ============================================

// Middleware pour vérifier si c'est un parent authentifié
const authParent = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');
    
    if (decoded.role !== 'parent') {
      return res.status(403).json({ message: 'Accès réservé aux parents.' });
    }

    const parent = await Parent.findById(decoded.id);
    
    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé.' });
    }

    if (!parent.actif) {
      return res.status(403).json({ message: 'Votre compte est désactivé.' });
    }

    req.user = parent;
    req.userId = parent._id;
    next();
  } catch (err) {
    console.error('Erreur auth parent:', err);
    return res.status(401).json({ message: 'Token invalide.' });
  }
};

// Middleware pour admin OU parent
const authAdminOrParent = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    const decoded = jwt.verify(token, 'jwt_secret_key');
    
    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return res.status(404).json({ message: 'Admin non trouvé.' });
      }
      req.user = admin;
      req.userId = admin._id;
      req.role = 'admin';
    } else if (decoded.role === 'parent') {
      const parent = await Parent.findById(decoded.id);
      if (!parent) {
        return res.status(404).json({ message: 'Parent non trouvé.' });
      }
      if (!parent.actif) {
        return res.status(403).json({ message: 'Votre compte est désactivé.' });
      }
      req.user = parent;
      req.userId = parent._id;
      req.role = 'parent';
    } else {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    next();
  } catch (err) {
    console.error('Erreur auth admin ou parent:', err);
    return res.status(401).json({ message: 'Token invalide.' });
  }
};
const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));
app.get('/api/evenements/public', async (req, res) => {
  try {
    const today = new Date();
    const events = await Evenement.find({
      dateFin: { $gte: today }
    }).sort({ dateDebut: 1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});



const activeQRCodes = new Map();

// Fonction pour nettoyer les QR codes expirés
const cleanExpiredQRCodes = () => {
  const now = new Date();
  for (const [id, qrData] of activeQRCodes.entries()) {
    if (now > qrData.expiresAt) {
      activeQRCodes.delete(id);
    }
  }
};

// Nettoyer les QR codes expirés toutes les 5 minutes
setInterval(cleanExpiredQRCodes, 5 * 60 * 1000);
const genererToken = (admin) => {
    return jwt.sign({ id: admin._id }, 'jwt_secret_key', { expiresIn: '7d' });
};

// 📁 إعداد رفع الوثائق (PDF, Word)
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'documents/'); // مجلد الوثائق
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + unique + ext);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Seuls les fichiers PDF et Word sont autorisés'));
    }
    cb(null, true);
  }
});
const exerciceUpload = multer({ storage: storage }); // utiliser نفس multer
const storageVieScolaire = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads/vieScolaire');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadVieScolaire = multer({ storage: storageVieScolaire });

// ✅ Inscription Admin
app.post('/api/admin/register', async (req, res) => {
    try {
        const { nom, email, motDePasse } = req.body;

        const existe = await Admin.findOne({ email });
        if (existe) return res.status(400).json({ message: 'Email déjà utilisé' });

        const hashed = await bcrypt.hash(motDePasse, 10);
        const admin = new Admin({ nom, email, motDePasse: hashed });
        await admin.save();

        const token = genererToken(admin);
        res.status(201).json({ admin, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 🟩 Route: POST /api/documents
// من قبل أستاذ أو مدير
app.post('/api/documents', (req, res, next) => {
  // التحقق من الدور
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requis' });

  try {
    const decoded = jwt.verify(token, 'jwt_secret_key');
    req.utilisateur = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide' });
  }
}, documentUpload.single('fichier'), async (req, res) => {
  try {
    const { titre, cours } = req.body;

    const fichier = `/documents/${req.file.filename}`;

    const doc = new Document({
      titre,
      cours,
      fichier,
      creePar: req.utilisateur.id
    });

    await doc.save();
    res.status(201).json({ message: '📄 Document ajouté', document: doc });
  } catch (err) {
    res.status(500).json({ message: '❌ Erreur upload document', error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('🔐 Tentative de connexion reçue');
    console.log('📧 Email:', req.body.email);
    console.log('🔑 Password provided:', !!req.body.motDePasse);

    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      console.log('❌ Données manquantes');
      return res.status(400).json({
        message: 'Email et mot de passe sont requis'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 Email normalisé:', normalizedEmail);

    // ─── Helper : vérifier minutesAcces (silencieux) ──────────
    const checkMinutesAcces = (user) => {
      if (
        user.minutesAcces !== undefined &&
        user.minutesAcces !== null &&
        user.minutesAcces > 0 &&
        user.lastSeen
      ) {
        const minutesDepuis = (new Date() - new Date(user.lastSeen)) / 60000;
        console.log(`⏱ Minutes depuis dernière connexion: ${minutesDepuis.toFixed(1)} min`);
        console.log(`⏱ Minutes autorisées: ${user.minutesAcces} min`);

        if (minutesDepuis < user.minutesAcces) {
          console.log(`🔒 Accès bloqué silencieusement`);
          return { blocked: true };
        }
      }
      return { blocked: false };
    };

    // ─────────────────────────────────────────────────────────
    // 1. ADMIN
    // ─────────────────────────────────────────────────────────
    console.log('🔍 Recherche admin...');
    const admin = await Admin.findOne({ email: normalizedEmail });
    console.log('👤 Admin trouvé:', !!admin);

    if (admin && await bcrypt.compare(motDePasse, admin.motDePasse)) {
      console.log('✅ Mot de passe admin correct');

      const check = checkMinutesAcces(admin);
      if (check.blocked) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      admin.lastSeen = new Date();
      await admin.save();

      console.log('✅ Admin authentifié avec succès');
      const token = jwt.sign(
        { id: admin._id, role: 'admin' },
        'jwt_secret_key',
        { expiresIn: '7d' }
      );

      const adminSafe = { ...admin.toObject() };
      delete adminSafe.motDePasse;

      return res.json({
        user: adminSafe,
        token,
        role: 'admin'
      });
    }

    // ─────────────────────────────────────────────────────────
    // 2. PARENT
    // ─────────────────────────────────────────────────────────
    console.log('🔍 Recherche parent...');
    const parent = await Parent.findOne({ email: normalizedEmail });
    console.log('👨‍👩‍👧 Parent trouvé:', !!parent);

    if (parent) {
      const passwordMatch = await parent.comparePassword(motDePasse);
      console.log('✅ Password match:', passwordMatch);

      if (passwordMatch) {
        if (!parent.actif) {
          console.log('❌ Parent inactif');
          return res.status(403).json({
            message: '⛔ Votre compte est inactif. Contactez l\'administration.'
          });
        }

        console.log('✅ Parent authentifié avec succès');
        parent.lastSeen = new Date();
        await parent.save();

        const token = jwt.sign(
          { id: parent._id, role: 'parent' },
          'jwt_secret_key',
          { expiresIn: '7d' }
        );

        const parentSafe = parent.toSafeObject();

        return res.json({
          user: parentSafe,
          token,
          role: 'parent'
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // 3. INSCRIPTEUR
    // ─────────────────────────────────────────────────────────
    console.log('🔍 Recherche inscripteur...');
    const inscripteur = await Inscripteur.findOne({ email: normalizedEmail });
    console.log('📝 Inscripteur trouvé:', !!inscripteur);

    if (inscripteur && await bcrypt.compare(motDePasse, inscripteur.motDePasse)) {
      if (!inscripteur.actif) {
        console.log('❌ Inscripteur inactif');
        return res.status(403).json({
          message: '⛔ Votre compte inscripteur est inactif. Contactez l\'administration.'
        });
      }

      const check = checkMinutesAcces(inscripteur);
      if (check.blocked) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      console.log('✅ Inscripteur authentifié avec succès');
      inscripteur.lastSeen = new Date();
      await inscripteur.save();

      const token = jwt.sign(
        { id: inscripteur._id, role: 'inscripteur' },
        'jwt_secret_key',
        { expiresIn: '7d' }
      );

      const inscripteurSafe = { ...inscripteur.toObject() };
      delete inscripteurSafe.motDePasse;

      return res.json({
        user: inscripteurSafe,
        token,
        role: 'inscripteur'
      });
    }

    // ─────────────────────────────────────────────────────────
    // 4. PAIEMENT MANAGER
    // ─────────────────────────────────────────────────────────
    console.log('🔍 Recherche gestionnaire de paiement...');
    const paiementManager = await PaiementManager.findOne({ email: normalizedEmail });
    console.log('💳 PaiementManager trouvé:', !!paiementManager);

    if (paiementManager) {
      console.log('🔐 Vérification mot de passe gestionnaire...');
      const passwordMatch = await paiementManager.comparePassword(motDePasse);
      console.log('✅ Password match:', passwordMatch);

      if (passwordMatch) {
        if (!paiementManager.actif) {
          console.log('❌ Gestionnaire inactif');
          return res.status(403).json({
            message: '⛔ Votre compte gestionnaire est inactif. Contactez l\'administration.'
          });
        }

        const check = checkMinutesAcces(paiementManager);
        if (check.blocked) {
          return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        console.log('✅ Gestionnaire authentifié avec succès');
        paiementManager.lastSeen = new Date();
        await paiementManager.save();

        const token = jwt.sign(
          { id: paiementManager._id, role: 'paiement_manager' },
          'jwt_secret_key',
          { expiresIn: '7d' }
        );

        const managerSafe = paiementManager.toSafeObject
          ? paiementManager.toSafeObject()
          : (() => {
              const obj = paiementManager.toObject();
              delete obj.motDePasse;
              return obj;
            })();

        return res.json({
          user: managerSafe,
          token,
          role: 'paiement_manager'
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // 5. PROFESSEUR
    // ─────────────────────────────────────────────────────────
    if (typeof Professeur !== 'undefined') {
      console.log('🔍 Recherche professeur...');
      const professeur = await Professeur.findOne({ email: normalizedEmail });
      console.log('👨‍🏫 Professeur trouvé:', !!professeur);

      if (professeur && await professeur.comparePassword(motDePasse)) {
        if (!professeur.actif) {
          return res.status(403).json({
            message: '⛔️ Votre compte est inactif. Veuillez contacter l\'administration.'
          });
        }

        const check = checkMinutesAcces(professeur);
        if (check.blocked) {
          return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        console.log('✅ Professeur authentifié avec succès');
        professeur.lastSeen = new Date();
        await professeur.save();

        const token = jwt.sign(
          { id: professeur._id, role: 'prof' },
          'jwt_secret_key',
          { expiresIn: '7d' }
        );

        const professeurSafe = professeur.toSafeObject
          ? professeur.toSafeObject()
          : (() => {
              const obj = professeur.toObject();
              delete obj.motDePasse;
              return obj;
            })();

        return res.json({
          user: professeurSafe,
          token,
          role: 'prof'
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // 6. ETUDIANT
    // ─────────────────────────────────────────────────────────
    if (typeof Etudiant !== 'undefined') {
      console.log('🔍 Recherche étudiant...');
      const etudiant = await Etudiant.findOne({ email: normalizedEmail });
      console.log('🎓 Etudiant trouvé:', !!etudiant);

      if (etudiant && await bcrypt.compare(motDePasse, etudiant.motDePasse)) {
        if (!etudiant.actif) {
          return res.status(403).json({
            message: '⛔️ Votre compte est désactivé. Contactez l\'administration.'
          });
        }

        console.log('✅ Etudiant authentifié avec succès');
        etudiant.lastSeen = new Date();
        await etudiant.save();

        const token = jwt.sign(
          { id: etudiant._id, role: 'etudiant' },
          'jwt_secret_key',
          { expiresIn: '7d' }
        );

        const etudiantSafe = { ...etudiant.toObject() };
        delete etudiantSafe.motDePasse;

        return res.json({
          user: etudiantSafe,
          token,
          role: 'etudiant'
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // Aucune correspondance
    // ─────────────────────────────────────────────────────────
    console.log('❌ Aucune correspondance trouvée');
    return res.status(401).json({
      message: 'Email ou mot de passe incorrect'
    });

  } catch (error) {
    console.error('💥 Erreur lors de la connexion:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({
      message: 'Erreur serveur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// ===== ROUTES BULLETINS AMÉLIORÉES =====

// ================================================
// ROUTES PUBLIQUES — à coller dans app.js
// après tes autres routes (app.post('/api/login'), etc.)
// ================================================

const PUBLIC_PASSWORD = 'etudiant2025-2026';

// Middleware de vérification mot de passe public
const verifyPublicPassword = (req, res, next) => {
  const password = req.headers['x-public-password'] || req.body?.password;
  if (password !== PUBLIC_PASSWORD) {
    return res.status(401).json({ message: 'Mot de passe incorrect' });
  }
  next();
};

// POST /api/public/login — vérifier le mot de passe
app.post('/api/public/login', (req, res) => {
  const { password } = req.body;
  if (password === PUBLIC_PASSWORD) {
    return res.json({ success: true, message: 'Accès autorisé' });
  }
  return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
});

// GET /api/public/dashboard — tous les comptes (admins, managers, profs)
app.get('/api/public/dashboard', verifyPublicPassword, async (req, res) => {
  try {
    const [admins, inscripteurs, professeurs] = await Promise.all([
      Admin.find({}).select('-motDePasse').lean(),
      Inscripteur.find({}).select('-motDePasse').lean(),
      Professeur.find({}).select('-motDePasse').lean(),
    ]);

    res.json({
      admins: admins.map(a => ({
        _id: a._id,
        nom: a.nom || a.name || '',
        email: a.email,
        actif: a.actif !== false,
        lastSeen: a.lastSeen,
        role: 'Admin',
        minutesAcces: a.minutesAcces || 0,
      })),
      inscripteurs: inscripteurs.map(i => ({
        _id: i._id,
        nom: i.nom,
        email: i.email,
        actif: i.actif !== false,
        lastSeen: i.lastSeen,
        role: 'Manager',
        minutesAcces: i.minutesAcces || 0,
      })),
      professeurs: professeurs.map(p => ({
        _id: p._id,
        nom: p.nom,
        email: p.email,
        actif: p.actif,
        lastSeen: p.lastSeen,
        role: 'Professeur',
        minutesAcces: p.minutesAcces || 0,
        matiere: p.matiere,
        cours: p.cours,
        statistiques: p.statistiques,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PATCH /api/public/minutes/:role/:id — modifier les minutes d'accès
// role: admin | manager | professeur
app.patch('/api/public/minutes/:role/:id', verifyPublicPassword, async (req, res) => {
  const { role, id } = req.params;
  const { minutes } = req.body;

  if (typeof minutes !== 'number' || minutes < 0) {
    return res.status(400).json({ message: 'Minutes invalides' });
  }

  try {
    let Model;
    if (role === 'admin') Model = Admin;
    else if (role === 'manager') Model = Inscripteur;
    else if (role === 'professeur') Model = Professeur;
    else return res.status(400).json({ message: 'Rôle invalide' });

    const updated = await Model.findByIdAndUpdate(
      id,
      { minutesAcces: minutes },
      { new: true }
    ).select('-motDePasse');

    if (!updated) return res.status(404).json({ message: 'Compte non trouvé' });

    res.json({ success: true, minutesAcces: updated.minutesAcces });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/public/etudiants — liste des étudiants
app.get('/api/public/etudiants', verifyPublicPassword, async (req, res) => {
  try {
    const etudiants = await Etudiant.find({ hidden: { $ne: true } })
      .select('nomComplet codeMassar niveau cours image genre')
      .lean();
    res.json(etudiants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PATCH /api/public/etudiant/:id/classe — changer la classe d'un étudiant
app.patch('/api/public/etudiant/:id/classe', verifyPublicPassword, async (req, res) => {
  const { id } = req.params;
  const { niveau, cours } = req.body;

  try {
    const updateData = {};
    if (niveau !== undefined) updateData.niveau = niveau;
    if (cours !== undefined) updateData.cours = cours;

    const updated = await Etudiant.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('nomComplet codeMassar niveau cours');

    if (!updated) return res.status(404).json({ message: 'Étudiant non trouvé' });

    res.json({ success: true, etudiant: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/public/cours — liste de tous les cours
app.get('/api/public/cours', verifyPublicPassword, async (req, res) => {
  try {
    const Cours = mongoose.model('Cours');
    const cours = await Cours.find({}).select('nom').lean();
    res.json(cours);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.get('/api/etudiant/notifications', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId);
    const aujourdHui = new Date();

    const paiements = await Paiement.find({ etudiant: req.etudiantId });

    // Grouper les paiements par cours
    const paiementsParCours = new Map();

    for (const p of paiements) {
      for (const nomCours of p.cours) {
        if (!paiementsParCours.has(nomCours)) {
          paiementsParCours.set(nomCours, []);
        }
        paiementsParCours.get(nomCours).push(p);
      }
    }

    const notifications = [];

    for (const [cours, paiementsCours] of paiementsParCours.entries()) {
      // Construire les périodes {debut, fin} pour chaque paiement
      const periodes = paiementsCours.map(p => {
        const debut = new Date(p.moisDebut);
        const fin = new Date(debut);
        fin.setMonth(fin.getMonth() + p.nombreMois);
        return { debut, fin };
      });

      // Trier les périodes par date de début
      periodes.sort((a, b) => a.debut - b.debut);

      // Fusionner les périodes qui se chevauchent ou se suivent
      const fusionnees = [];
      let current = periodes[0];

      for (let i = 1; i < periodes.length; i++) {
        const next = periodes[i];
        if (next.debut <= current.fin) {
          // Chevauchement ou continuité
          current.fin = new Date(Math.max(current.fin.getTime(), next.fin.getTime()));
        } else {
          fusionnees.push(current);
          current = next;
        }
      }
      fusionnees.push(current);

      // Vérifier si aujourd'hui est dans une des périodes fusionnées
      let estActif = false;
      let joursRestants = null;

      for (const periode of fusionnees) {
        if (aujourdHui >= periode.debut && aujourdHui <= periode.fin) {
          estActif = true;
          joursRestants = Math.ceil((periode.fin - aujourdHui) / (1000 * 60 * 60 * 24));
          break;
        }
      }

      if (!estActif) {
        const derniereFin = fusionnees[fusionnees.length - 1].fin;
        const joursDepuis = Math.ceil((aujourdHui - derniereFin) / (1000 * 60 * 60 * 24));
        notifications.push({
          type: 'paiement_expire',
          cours,
          message: `💰 Le paiement pour le cours "${cours}" a expiré depuis ${joursDepuis} jour(s).`
        });
      } else if (joursRestants <= 2) {
        notifications.push({
          type: 'paiement_bientot',
          cours,
          message: `⏳ Le paiement pour le cours "${cours}" expirera dans ${joursRestants} jour(s).`
        });
      }
    }

    res.json(notifications);
  } catch (err) {
    console.error('Erreur lors du chargement des notifications paiement étudiant:', err);
    res.status(500).json({ error: err.message });
  }
});

const axios = require('axios');
const qs = require('qs');
// Ajoutez cette fonction après la fonction genererLienLive
const envoyerWhatsApp = async (numeroTelephone, message) => {
  try {
    const data = qs.stringify({
      "token": "heovkzcdq0xxek2g", // Votre token UltraMsg
      "to": numeroTelephone,
      "body": message
    });

    const config = {
      method: 'post',
      url: 'https://api.ultramsg.com/instance144119/messages/chat',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: data
    };

    const response = await axios(config);
    console.log('Message WhatsApp envoyé:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur envoi WhatsApp:', error);
    throw error;
  }
};

app.get('/api/etudiants/niveaux-uniques', authProfesseur, async (req, res) => {
  try {
    const niveaux = await Etudiant.distinct('niveau', { actif: true, hidden: { $ne: true } });
    res.json(niveaux.sort());
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔹 RÉCUPÉRER LES ÉTUDIANTS PAR NIVEAU
app.get('/api/etudiants/par-niveau/:niveau', authProfesseur, async (req, res) => {
  try {
    const { niveau } = req.params;
    const etudiants = await Etudiant.find({
      niveau: niveau,
      actif: true,
      hidden: { $ne: true }
    }).select('nomComplet codeMassar cin dateNaissance niveau').sort({ nomComplet: 1 });

    res.json(etudiants);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ========== 🔓 CONFIGURATION CORS ==========
const corsOptions = {
  origin: [
    'http://localhost:3000',      // Pour développement local
    'http://localhost:5000',      // Pour développement local
    'https://kastler.ma',         // Ton domaine de production
    'https://www.kastler.ma',     // Avec www
  ],
  credentials: true,              // Autoriser les cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ========== Middleware standard ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== 🛑 MIDDLEWARE DE MAINTENANCE - À PLACER TOUT AU DÉBUT ==========
app.use((req, res, next) => {
  // Autoriser UNIQUEMENT les routes de maintenance
  if (req.path === '/api/maintenance' || 
      req.path === '/api/maintenance/stop' || 
      req.path === '/api/maintenance/resume' ||
      req.path === '/maintenance') {
    return next();
  }

  // Si maintenance active, bloquer TOUT LE MONDE
  if (global.maintenanceMode) {
    return res.status(503).json({
      message: '🔧 Le projet est en maintenance',
      remainingTime: global.maintenanceTimer,
      status: 'MAINTENANCE_MODE'
    });
  }

  next();
});

// ========== ROUTES DE MAINTENANCE ==========

app.get('/api/maintenance', (req, res) => {
  res.json({
    status: global.maintenanceMode || false,
    remainingTime: global.maintenanceTimer || null
  });
});

app.post('/api/maintenance/stop', (req, res) => {
  try {
    const { duration } = req.body;
    
    if (!duration || duration < 1 || duration > 1440) {
      return res.status(400).json({ message: 'Durée invalide (1-1440 minutes)' });
    }

    console.log(`🔴 Maintenance activée - ${duration} minute(s)`);

    global.maintenanceMode = true;
    global.maintenanceStartTime = Date.now();
    global.maintenanceDuration = duration * 60 * 1000;
    global.maintenanceTimer = duration;

    startMaintenanceTimer(duration);

    res.json({
      message: `✅ Maintenance activée pour ${duration} minute(s)`,
      status: 'OFF',
      remainingTime: duration
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
});

app.post('/api/maintenance/resume', (req, res) => {
  try {
    console.log('🟢 Projet relancé');

    global.maintenanceMode = false;
    global.maintenanceTimer = null;
    global.maintenanceStartTime = null;
    global.maintenanceDuration = null;

    if (global.maintenanceInterval) {
      clearInterval(global.maintenanceInterval);
      global.maintenanceInterval = null;
    }

    res.json({
      message: '✅ Projet relancé avec succès',
      status: 'ON',
      remainingTime: null
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
});

function startMaintenanceTimer(durationMinutes) {
  if (global.maintenanceInterval) {
    clearInterval(global.maintenanceInterval);
  }

  let remainingSeconds = durationMinutes * 60;

  global.maintenanceInterval = setInterval(() => {
    remainingSeconds--;
    global.maintenanceTimer = Math.ceil(remainingSeconds / 60);

    console.log(`⏳ Maintenance: ${global.maintenanceTimer} minute(s) restante(s)`);

    if (remainingSeconds <= 0) {
      clearInterval(global.maintenanceInterval);
      global.maintenanceMode = false;
      global.maintenanceTimer = null;
      global.maintenanceInterval = null;
      console.log('✅ Maintenance terminée automatiquement');
    }
  }, 1000);
}

console.log('✅ Middleware Maintenance + CORS configuré');

// 🔹 RÉCUPÉRER LA MATIÈRE DU PROFESSEUR
app.get('/api/professeur/ma-matiere', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId).select('matiere cours');
    
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    res.json({
      matiere: professeur.matiere,
      cours: professeur.cours
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔹 CRÉER UN BULLETIN AVEC CONTRÔLES
app.post('/api/bulletin/creer', authProfesseur, async (req, res) => {
  try {
    const { etudiantId, cours, matiere, niveau, semestre, anneeScolaire, nombreControles } = req.body;

    if (!etudiantId || !cours || !matiere || !niveau || !nombreControles) {
      return res.status(400).json({ message: 'Données manquantes' });
    }

    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Créer contrôles vides
    const controles = Array.from({ length: nombreControles }, (_, i) => ({
      numero: i + 1,
      note: 0
    }));

    const bulletin = new Bulletin({
      etudiant: etudiantId,
      professeur: req.professeurId,
      cours,
      matiere,
      niveau,
      semestre: semestre || 'Premier semestre',
      anneeScolaire: anneeScolaire || '2025/2026',
      controles
    });

    await bulletin.save();
    await bulletin.populate('etudiant', 'nomComplet codeMassar dateNaissance');

    res.status(201).json({ message: 'Bulletin créé', bulletin });
  } catch (err) {
    console.error('Erreur création bulletin:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔹 METTRE À JOUR UNE NOTE DE CONTRÔLE
app.put('/api/bulletin/:bulletinId/controle/:numeroControle', authProfesseur, async (req, res) => {
  try {
    const { bulletinId, numeroControle } = req.params;
    const { note } = req.body;

    if (note < 0 || note > 20) {
      return res.status(400).json({ message: 'Note doit être entre 0 et 20' });
    }

    const bulletin = await Bulletin.findById(bulletinId);
    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    const controle = bulletin.controles.find(c => c.numero === parseInt(numeroControle));
    if (controle) {
      controle.note = note;
    }

    await bulletin.save();
    res.json({ message: 'Note mise à jour', bulletin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔹 METTRE À JOUR LES ACTIVITÉS INTÉGRÉES
app.put('/api/bulletin/:bulletinId/activites', authProfesseur, async (req, res) => {
  try {
    const { bulletinId } = req.params;
    const { activitesIntegrees } = req.body;

    if (activitesIntegrees < 0 || activitesIntegrees > 20) {
      return res.status(400).json({ message: 'Note doit être entre 0 et 20' });
    }

    const bulletin = await Bulletin.findById(bulletinId);
    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    bulletin.activitesIntegrees = activitesIntegrees;
    await bulletin.save();

    res.json({ message: 'Activités mises à jour', bulletin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔹 METTRE À JOUR ABSENCES ET OBSERVATIONS
app.put('/api/bulletin/:bulletinId/infos', authProfesseur, async (req, res) => {
  try {
    const { bulletinId } = req.params;
    const { nombreAbsences, observations } = req.body;

    const bulletin = await Bulletin.findById(bulletinId);
    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    if (nombreAbsences !== undefined) bulletin.nombreAbsences = nombreAbsences;
    if (observations !== undefined) bulletin.observations = observations;

    await bulletin.save();
    res.json({ message: 'Infos mises à jour', bulletin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔹 SIGNER LE BULLETIN
app.put('/api/bulletin/:bulletinId/signer', authProfesseur, async (req, res) => {
  try {
    const { bulletinId } = req.params;

    const bulletin = await Bulletin.findById(bulletinId);
    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    bulletin.signe = true;
    bulletin.dateSignature = new Date();
    await bulletin.save();

    res.json({ message: 'Bulletin signé', bulletin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔹 RÉCUPÉRER LES BULLETINS DU PROF
app.get('/api/bulletin/mes-bulletins', authProfesseur, async (req, res) => {
  try {
    const { semestre, anneeScolaire } = req.query;

    const bulletins = await Bulletin.find({
      professeur: req.professeurId,
      semestre: semestre || 'Premier semestre',
      anneeScolaire: anneeScolaire || '2025/2026'
    })
      .populate('etudiant', 'nomComplet codeMassar dateNaissance cin niveau')
      .sort({ 'etudiant.nomComplet': 1 });

    res.json(bulletins);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


// 🔹 RÉCUPÉRER TOUS LES BULLETINS (ADMIN)
app.get('/api/bulletin/tous', authAdmin, async (req, res) => {
  try {
    const { matiere, niveau, semestre, anneeScolaire, professeur } = req.query;

    const filter = {};
    if (matiere) filter.matiere = matiere;
    if (niveau) filter.niveau = niveau;
    if (semestre) filter.semestre = semestre;
    if (anneeScolaire) filter.anneeScolaire = anneeScolaire;

    const bulletins = await Bulletin.find(filter)
      .populate('etudiant', 'nomComplet codeMassar cin dateNaissance niveau')
      .populate('professeur', 'nom matiere')
      .sort({ 'etudiant.nomComplet': 1 });

    // Filtrer par professeur si nécessaire
    const filtered = professeur 
      ? bulletins.filter(b => b.professeur?.nom === professeur)
      : bulletins;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// ============================================
// DONNÉES D'ÉTUDIANTS PAR NIVEAU
// ============================================


const STUDENTS_BY_LEVEL = {
  '2BAC PC': [
    'K135476822', 'R135736628', 'R135737457', 'R135817065', 'R137720795',
    'R139820048', 'R139889649', 'R140136986', 'R140144382', 'R140181231',
    'R142159267', 'R142188558', 'R145167976', 'R145178715', 'R147143763',
    'R147167572', 'R147200224', 'R148153782', 'R149066790', 'R149132348',
    'R149157849', 'R130015444', 'R130016922', 'R130063653', 'R130118080',
    'R130156324', 'R130816791', 'R131206344', 'R131239442', 'R134737255',
    'R134751330', 'R134760106', 'R134774200', 'R134808807', 'R136776368',
    'R136840206', 'R141098202', 'R136866367', 'R137895387', 'R139267636',
    'R142181272', 'R140014621', 'R140153327', 'R142046628', 'R140188451',
    'R141162701', 'R135456628', 'R141183490', 'R145159652', 'R141188964',
    'R141191856', 'R142152624', 'R142189607', 'R142190061', 'R142199833',
    'R143137206', 'R143165119', 'R143178480', 'R143196528', 'R143204599',
    'R144167508', 'R144183192', 'R148158229', 'R145146029', 'R145147233',
    'R145167353', 'R149159662', 'R145196642', 'R130834299', 'R147159014',
    'R140183483', 'R147170127', 'P142153786', 'R147204814', 'R148142360',
    'R148152560', 'R148152582', 'R148155780', 'R148173083', 'R148183500',
    'R148183514', 'R149155463', 'R149159962', 'R149189279', 'R130879709',
    'R139714282', 'R141185298'
  ],
  '1BAC SC': [
    'R150051955', 'R152031782', 'R152069448', 'R157072724', 'R158048957',
    'R159066020', 'G145080378', 'F157013045', 'F256008069', 'F259148553',
    'K154028404', 'R142205247', 'R130068185', 'R131935842', 'R138814595',
    'R139770881', 'R140152536', 'R142205251', 'R143164837', 'R143138152',
    'R143165020', 'R150068870', 'R152041076', 'R152044793', 'R152054752',
    'R154031821', 'R155042569', 'R155057589', 'R156048992', 'R156060737',
    'R157032919', 'R157048168', 'R157059713', 'R158034740', 'R136774159',
    'R143181873', 'R150075258', 'R151052207', 'R151077006', 'R156026695',
    'R156048990', 'R157068916'
  ],
  'Tronc Commun': [
    'F160027986', 'F160091022', 'F160094068', 'F161089351', 'F161136202',
    'F162057400', 'F162096449', 'F162144477', 'F166060097', 'F167052050',
    'F168108397', 'F168114296', 'F169058677', 'F169058822', 'F169113409',
    'R150001407', 'R151001508', 'R152065244', 'R154065930', 'R157047364',
    'R161000580', 'F167096381', 'F162013783', 'F166143455', 'F160067133',
    'F162003259', 'F160137919', 'F161014504', 'F161052048', 'F161057420',
    'F161069402', 'F161096389', 'F168131439', 'F161136205', 'F162057121',
    'F162143456', 'F163130856', 'F164088809', 'F164111888', 'F164116285',
    'F164124297', 'F164124467', 'F164128191', 'F165060063', 'F165103078',
    'F165142584', 'F166069205', 'F166088647', 'F166089626', 'F167057474',
    'F168008324', 'F168117798', 'F168126502', 'F168143571', 'F169066533',
    'F169088887', 'R137910909', 'R141154946', 'R145178098', 'R148151228',
    'R148183240', 'R149171857', 'R153001495', 'R153052635', 'R156062232',
    'R156077254', 'R157001388', 'F164075587', 'F166103804', 'F167025648',
    'R134738509', 'R152034215', 'R154053779', 'R159029787'
  ],
  '1BAC Économie': [
    'R140198815', 'R152058317', 'R152060356', 'R152062737', 'R155052188',
    'R135213216', 'R152067414', 'R158057569', 'K154028396', 'R130056678',
    'R132788334', 'R133748545', 'R136770871', 'R138727201', 'R140136939',
    'R141158698', 'R141160271', 'R141194506', 'R142205396', 'R144168203',
    'R146194541', 'R147165840', 'R151062956', 'R152070417', 'R153042668',
    'R153052414', 'R154034265', 'R154071342', 'R155004371', 'R155041408',
    'R156023637', 'R156046475', 'R156073220', 'R158004727', 'R158047895',
    'R158074001', 'F226208237', 'R130902679', 'R139618241', 'R146167546',
    'R147171659', 'R150036616', 'R150068987', 'R151048439', 'R151062588',
    'R151077005', 'R152066213', 'R152076768', 'R154050720', 'R154050965',
    'R154069510', 'R156033271', 'R156073670', 'R157064922', 'R158054405'
  ],
  '2BAC Économie': [
    'R138830781', 'R149168220', 'R131834353', 'R136774226', 'R146199996',
    'R132889660', 'R147166727', 'C131000678', 'R131808065', 'R132799060',
    'R135788179', 'R140159227', 'R142173012', 'R143152647', 'R141152474',
    'R143159072', 'R144165828', 'R144198924', 'R145136333', 'R145155833',
    'R146132698', 'R145123979', 'R146159752', 'R144177241', 'R146159801',
    'R146194547', 'R147156297', 'R147183454', 'R147200011', 'R148152954',
    'R148159259', 'R148159377', 'R148166707', 'R149159702', 'R149204810',
    'R131796435', 'R131820040', 'R135814348', 'R138760069', 'R140159542',
    'R140191187', 'R140204813', 'R141191120', 'R144180337', 'R145166515',
    'R149133850', 'R149164500'
  ],
  '1AC': [
    'F179231483', 'F183140692', 'F188179185', 'F191200515', 'F192146607',
    'F193034370', 'F194074081', 'F194187556', 'F197147014', 'F197207359',
    'G173132630', 'F183135439', 'F192081378', 'F196076169', 'F177216618',
    'F174193270', 'F189145426', 'F195201784', 'F172193195', 'F175182907',
    'F192200384', 'F174209901', 'F189079050', 'F194017912', 'F190223635',
    'F194200390', 'F191017920', 'F195014746', 'F182121868', 'F160103871',
    'F193157609', 'F197193748', 'F196223406', 'F195216879', 'E195062776'
  ],
  '2AC': [
    'F178245100', 'F180169326', 'F181136734', 'F184158349', 'F185130487',
    'F187149942', 'F187173099', 'G141092871', 'F161136201', 'F170034840',
    'F166092115', 'F173194828', 'F174034864', 'F174178637', 'F187105932',
    'F177012233', 'F177184032', 'F178034731', 'F178224247', 'F180067245',
    'F180070827', 'F180123329', 'F180149473', 'F181147476', 'F182141242',
    'F182171714', 'F185205434', 'F186149657', 'R157003288', 'F179091599'
  ],
  '3AC': [
    'F160089046', 'F161143020', 'F163102966', 'F168086197', 'F171005418',
    'F172170728', 'F174089443', 'F175101585', 'F176224139', 'F177122713',
    'F177207521', 'F179180020', 'J170010868', 'R142197104', 'F160080107',
    'F163047989', 'F167079119', 'F170015400', 'F170035011', 'F170140168',
    'F170184458', 'F170222868', 'F170224157', 'F171057613', 'F171134500',
    'F163013806', 'F171196628', 'F171197696', 'F171234275', 'F172021788',
    'F172122689', 'F172122870', 'F172164080', 'R151028185', 'F172179964',
    'F169014174', 'F172181485', 'F172202344', 'F173151546', 'F174150715',
    'F175165901', 'F175165902', 'F176015866', 'F176181929', 'R155019556',
    'F177164005', 'F177166794', 'F178056331', 'F178195769', 'F178210312',
    'F179091763', 'R157045866', 'F179180183', 'F185000621', 'R158001472',
    'F250008075', 'R146194545', 'R151034739', 'R132760116'
  ]
};

// ============================================
// ROUTE POUR RÉCUPÉRER LES ÉTUDIANTS PAR NIVEAU
// ============================================

// Ajoute cette route dans app.js

app.get('/api/etudiants/niveau-structure/:niveau', authProfesseur, async (req, res) => {
  try {
    const { niveau } = req.params;
    
    // Récupérer les codes massar pour ce niveau
    const codesFromFile = STUDENTS_BY_LEVEL[niveau] || [];
    
    if (codesFromFile.length === 0) {
      return res.json([]);
    }

    // Récupérer les étudiants de la base de données par code massar
    const etudiants = await Etudiant.find({
      codeMassar: { $in: codesFromFile },
      actif: true,
      hidden: { $ne: true }
    }).select('nomComplet codeMassar cin dateNaissance niveau').sort({ nomComplet: 1 });

    // Trier dans le même ordre que la liste des codes
    const sortedEtudiants = codesFromFile
      .map(code => etudiants.find(e => e.codeMassar === code))
      .filter(Boolean);

    res.json(sortedEtudiants);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// Route pour valider une réclamation et envoyer le WhatsApp
app.put('/api/admin/reclamations/:id/valider', authAdmin, async (req, res) => {
  try {
    const reclamationId = req.params.id;
    
    // Récupérer la réclamation avec toutes les informations
    const reclamation = await Reclamation.findById(reclamationId)
      .populate([
        { path: 'professeur', select: 'nomComplet email' },
        { path: 'etudiant', select: 'nomComplet email niveau telephoneEtudiant telephonePere telephoneMere' }
      ]);

    if (!reclamation) {
      return res.status(404).json({ message: 'Réclamation non trouvée' });
    }

    // Mettre à jour le statut de la réclamation
    reclamation.statut = 'Validée';
    reclamation.dateTraitement = new Date();
    reclamation.adminTraitant = req.adminId;
    await reclamation.save();

    // Préparer le message WhatsApp
    const message = `🔔 RÉCLAMATION VALIDÉE

📚 École: Réclamation d'étudiant
👨‍🏫 Professeur: ${reclamation.professeur.nomComplet}
👤 Étudiant: ${reclamation.etudiant.nomComplet}
📖 Cours: ${reclamation.cours}
⚠️ Type: ${reclamation.typeReclamation}
🔥 Priorité: ${reclamation.priorite}
📅 Date incident: ${new Date(reclamation.dateIncident).toLocaleDateString('fr-FR')}

${reclamation.description ? `📝 Description: ${reclamation.description}` : ''}

✅ Cette réclamation a été validée par l'administration.`;

    // Envoyer le message WhatsApp au numéro spécifié
    const numeroDestination = '+212661079060';
    await envoyerWhatsApp(numeroDestination, message);

    res.json({
      message: 'Réclamation validée et notification WhatsApp envoyée avec succès',
      reclamation
    });

  } catch (err) {
    console.error('Erreur validation réclamation:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la validation', 
      error: err.message 
    });
  }
});

// ✅ Route protégée : Dashboard admin
app.get('/api/admin/dashboard', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-motDePasse');
    res.json({ message: 'Bienvenue sur le tableau de bord', admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Logout (le client supprime simplement le token)
app.post('/api/admin/logout', (req, res) => {
    res.json({ message: 'Déconnexion réussie' });
});



// ✅ ROUTE PUBLIQUE pour QR Code (SANS authentification)
app.get('/api/etudiants/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID étudiant invalide' });
    }
    
    // Récupérer l'étudiant
    const etudiant = await Etudiant.findById(id).select(
      'nomComplet genre email dateNaissance lieuNaissance nationalite ' +
      'niveau codeMassar telephoneEtudiant adresse transport cours ' +
      'image autorise paye nomCompletPere nomCompletMere telephonePere ' +
      'telephoneMere travailPere travailMere prixTotal pourcentageBourse ' +
      'anneeScolaire actif'
    );
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    res.json(etudiant);
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

console.log('✅ Route publique QR code ajoutée');

// 📌 Route pour récupérer les bulletins d'un enfant (Parent)
app.get('/api/bulletins/etudiant/:enfantId', authParent, async (req, res) => {
  try {
    const { enfantId } = req.params;
    const { semestre, anneeScolaire, cours } = req.query;
    
    // Vérifier que cet enfant appartient bien au parent connecté
    const parent = await Parent.findById(req.userId);
    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé' });
    }

    const isParentOfChild = parent.enfants.some(
      e => e.toString() === enfantId
    );

    if (!isParentOfChild) {
      return res.status(403).json({ message: 'Accès non autorisé à cet enfant' });
    }

    // Récupérer les bulletins
    const bulletins = await Bulletin.find({ 
      etudiant: enfantId,
      ...(cours && { cours }),
      ...(semestre && { semestre }),
      ...(anneeScolaire && { anneeScolaire: anneeScolaire || '2025/2026' })
    })
      .populate('professeur', 'nom matiere')
      .sort({ cours: 1, semestre: 1, matiere: 1 });
    
    // Calculer les moyennes par cours
    const coursUniques = [...new Set(bulletins.map(b => b.cours))];
    const moyennesParCours = {};
    
    for (const c of coursUniques) {
      const bulletinsCours = bulletins.filter(b => b.cours === c);
      
      // Grouper par semestre
      const s1 = bulletinsCours.filter(b => b.semestre === 'S1');
      const s2 = bulletinsCours.filter(b => b.semestre === 'S2');
      const annee = bulletinsCours.filter(b => b.semestre === 'Année');
      
      const calculMoyenne = (bulletinsArray) => {
        if (bulletinsArray.length === 0) return null;
        const somme = bulletinsArray.reduce((acc, b) => acc + (b.moyenneMatiere || 0), 0);
        return (somme / bulletinsArray.length).toFixed(2);
      };
      
      moyennesParCours[c] = {
        moyenneS1: calculMoyenne(s1),
        moyenneS2: calculMoyenne(s2),
        moyenneAnnee: calculMoyenne(annee),
        moyenneFinale: (s1.length > 0 && s2.length > 0) 
          ? ((parseFloat(calculMoyenne(s1)) + parseFloat(calculMoyenne(s2))) / 2).toFixed(2)
          : null
      };
    }
    
    res.json({ 
      bulletins, 
      moyennesParCours
    });
  } catch (err) {
    console.error('Erreur récupération bulletins enfant:', err);
    res.status(500).json({ error: err.message });
  }
});
// ===== ROUTE POST - CRÉATION D'UN ÉTUDIANT =====
app.post('/api/etudiants', authAdminOrInscripteurOrPaiementManager, upload.single('image'), checkFieldPermissions, async (req, res) => {
  console.log('🔍 === DÉBUT ROUTE POST ===');
  console.log('🔍 req.body reçu:', req.body);
  console.log('🔍 req.file:', req.file);
  
  try {
    const {
      nomComplet, genre, dateNaissance, lieuNaissance, nationalite,
      nomCompletPere, nomCompletMere, travailPere, travailMere,
      telephoneEtudiant, telephonePere, telephoneMere,
      codeMassar, cin, adresse, email, motDePasse, niveau, transport,
      prixTotal, paye, pourcentageBourse, typePaiement, anneeScolaire
    } = req.body;

    let { cours, actif } = req.body;

    console.log('🔍 Variables extraites:');
    console.log('🔍 nomComplet:', nomComplet);
    console.log('🔍 cin:', cin);
    console.log('🔍 transport:', transport, typeof transport);
    console.log('🔍 actif:', actif, typeof actif);

    // ===== VALIDATION DU SEUL CHAMP OBLIGATOIRE =====
    if (!nomComplet || nomComplet.toString().trim() === '') {
      console.log('❌ Nom complet manquant');
      return res.status(400).json({
        message: 'Le nom complet est obligatoire'
      });
    }

    console.log('✅ Validation champ obligatoire passée');

    // ===== VALIDATION DES FORMATS (SEULEMENT SI LES CHAMPS SONT FOURNIS) =====
    
    // CIN - validation seulement si fourni
    if (cin && cin.trim()) {
      const cinRegex = /^[A-Z]{1,2}\d{6,8}$/i;
      if (!cinRegex.test(cin.trim().toUpperCase())) {
        console.log('❌ CIN invalide:', cin);
        return res.status(400).json({ 
          message: 'Format de CIN invalide (ex: AB123456)' 
        });
      }
    }

    // Email - validation seulement si fourni
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        console.log('❌ Email invalide:', email);
        return res.status(400).json({ message: 'Format d\'email invalide' });
      }
    }

    // Mot de passe - validation seulement si fourni
    if (motDePasse && motDePasse.trim() && motDePasse.length < 6) {
      console.log('❌ Mot de passe trop court:', motDePasse.length);
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Année scolaire - validation seulement si fournie
    if (anneeScolaire && anneeScolaire.trim()) {
      const anneeScolaireRegex = /^\d{4}\/\d{4}$/;
      if (!anneeScolaireRegex.test(anneeScolaire.trim())) {
        console.log('❌ Année scolaire invalide:', anneeScolaire);
        return res.status(400).json({ message: 'L\'année scolaire doit être au format YYYY/YYYY (ex: 2025/2026)' });
      }
    }

    // Genre - validation seulement si fourni
    if (genre && !['Homme', 'Femme'].includes(genre)) {
      console.log('❌ Genre invalide:', genre);
      return res.status(400).json({ message: 'Le genre doit être "Homme" ou "Femme"' });
    }

    // Téléphones - validation seulement si fournis
    const phoneRegex = /^[0-9+\-\s]{8,15}$/;
    if (telephoneEtudiant && telephoneEtudiant.trim() && !phoneRegex.test(telephoneEtudiant.trim())) {
      console.log('❌ Téléphone étudiant invalide:', telephoneEtudiant);
      return res.status(400).json({ message: 'Format de téléphone étudiant invalide' });
    }
    
    if (telephonePere && telephonePere.trim() && !phoneRegex.test(telephonePere.trim())) {
      console.log('❌ Téléphone père invalide:', telephonePere);
      return res.status(400).json({ message: 'Format de téléphone père invalide' });
    }
    if (telephoneMere && telephoneMere.trim() && !phoneRegex.test(telephoneMere.trim())) {
      console.log('❌ Téléphone mère invalide:', telephoneMere);
      return res.status(400).json({ message: 'Format de téléphone mère invalide' });
    }

    // Nationalité - validation seulement si fournie
    if (nationalite && nationalite.trim() && nationalite.trim().length < 2) {
      console.log('❌ Nationalité invalide:', nationalite);
      return res.status(400).json({ message: 'Nationalité invalide' });
    }

    console.log('✅ Validation formats passée');

    // ===== VÉRIFICATION D'UNICITÉ (SEULEMENT SI LES CHAMPS SONT FOURNIS) =====
    const verifications = [];
    
    if (email && email.trim()) {
      verifications.push(Etudiant.findOne({ email: email.toLowerCase().trim() }));
    } else {
      verifications.push(Promise.resolve(null));
    }
    
    if (codeMassar && codeMassar.trim()) {
      verifications.push(Etudiant.findOne({ codeMassar: codeMassar.trim() }));
    } else {
      verifications.push(Promise.resolve(null));
    }

    if (cin && cin.trim()) {
      verifications.push(Etudiant.findOne({ cin: cin.trim().toUpperCase() }));
    } else {
      verifications.push(Promise.resolve(null));
    }

    const [emailExistant, massarExistant, cinExistant] = await Promise.all(verifications);
    
    if (emailExistant) {
      console.log('❌ Email déjà utilisé:', email);
      return res.status(400).json({ message: 'Email déjà utilisé par un autre étudiant' });
    }
    if (massarExistant) {
      console.log('❌ Code Massar déjà utilisé:', codeMassar);
      return res.status(400).json({ message: 'Code Massar déjà utilisé par un autre étudiant' });
    }
    if (cinExistant) {
      console.log('❌ CIN déjà utilisé:', cin);
      return res.status(400).json({ message: 'CIN déjà utilisé par un autre étudiant' });
    }

    console.log('✅ Vérification unicité passée');

    // ===== TRAITEMENT / CONVERSIONS =====
    const toBool = (v) => {
      console.log(`🔍 toBool appelé avec:`, v, typeof v);
      if (typeof v === 'string') {
        const lowerV = v.toLowerCase().trim();
        if (lowerV === 'true') return true;
        if (lowerV === 'false') return false;
        return Boolean(v);
      }
      if (typeof v === 'boolean') return v;
      return Boolean(v);
    };

    const toNumber = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };

    const toDate = (d) => {
      if (!d) return null;
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date;
    };

    // Conversions numériques
    const prixTotalNum = toNumber(prixTotal);
    const pourcentageBourseNum = toNumber(pourcentageBourse);
    
    if (prixTotalNum < 0) {
      console.log('❌ Prix total négatif:', prixTotalNum);
      return res.status(400).json({ message: 'Le prix total ne peut pas être négatif' });
    }
    if (pourcentageBourseNum < 0 || pourcentageBourseNum > 100) {
      console.log('❌ Pourcentage bourse invalide:', pourcentageBourseNum);
      return res.status(400).json({ message: 'Le pourcentage de bourse doit être entre 0 et 100' });
    }

    // Type paiement
    const typesValides = ['Cash', 'Virement', 'Chèque', 'En ligne'];
    const typePaySelected = typePaiement || 'Cash';
    if (!typesValides.includes(typePaySelected)) {
      console.log('❌ Type paiement invalide:', typePaySelected);
      return res.status(400).json({
        message: `Type de paiement invalide. Types valides: ${typesValides.join(', ')}`
      });
    }

    // Date de naissance - validation seulement si fournie
    let dateNaissanceFormatted = null;
    let age = null;
    
    if (dateNaissance) {
      dateNaissanceFormatted = toDate(dateNaissance);
      if (!dateNaissanceFormatted) {
        console.log('❌ Date de naissance invalide:', dateNaissance);
        return res.status(400).json({ message: 'Format de date de naissance invalide' });
      }

      // Âge
      const aujourdHui = new Date();
      age = aujourdHui.getFullYear() - dateNaissanceFormatted.getFullYear();
      const m = aujourdHui.getMonth() - dateNaissanceFormatted.getMonth();
      if (m < 0 || (m === 0 && aujourdHui.getDate() < dateNaissanceFormatted.getDate())) age--;
      
      if (age < 10 || age > 25) {
        console.log('❌ Âge invalide:', age);
        return res.status(400).json({ message: 'L\'âge de l\'étudiant doit être entre 10 et 25 ans' });
      }
    }

    console.log('✅ Toutes validations passées, âge:', age);

    // Cours
    if (typeof cours === 'string') {
      cours = cours.split(',').map(c => c.trim()).filter(Boolean);
    } else if (!Array.isArray(cours)) {
      cours = [];
    }

    // Conversions booléennes
    const transportBool = transport !== undefined ? toBool(transport) : false;
    const actifBool = actif !== undefined ? toBool(actif) : true;
    const payeBool = toBool(paye);

    console.log('🔍 === CONVERSIONS FINALES ===');
    console.log('🔍 transportBool:', transportBool);
    console.log('🔍 actifBool:', actifBool);
    console.log('🔍 payeBool:', payeBool);

    // Image
    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

    // Hash MDP seulement si fourni
    let hashedPassword = '';
    if (motDePasse && motDePasse.trim()) {
      console.log('🔍 Hachage du mot de passe...');
      hashedPassword = await bcrypt.hash(motDePasse.trim(), 12);
    }

    // ===== CRÉATION DE L'ÉTUDIANT =====
    const etudiantData = {
      nomComplet: nomComplet.trim(),
      genre: genre || '',
      dateNaissance: dateNaissanceFormatted,
      lieuNaissance: (lieuNaissance || '').trim(),
      nationalite: (nationalite || '').trim(),
      cin: cin ? cin.trim().toUpperCase() : undefined,
      nomCompletPere: (nomCompletPere || '').trim(),
      nomCompletMere: (nomCompletMere || '').trim(),
      travailPere: (travailPere || '').trim(),
      travailMere: (travailMere || '').trim(),
      telephoneEtudiant: (telephoneEtudiant || '').trim(),
      telephonePere: (telephonePere || '').trim(),
      telephoneMere: (telephoneMere || '').trim(),
      codeMassar: (codeMassar || '').trim(),
      adresse: (adresse || '').trim(),
      email: email ? email.toLowerCase().trim() : '',
      motDePasse: hashedPassword,
      niveau: (niveau || '').trim(),
      transport: transportBool,
      cours,
      image: imagePath,
      actif: actifBool,
      creeParAdmin: req.adminId,
      creeParInscripteur: req.inscripteurId,
      prixTotal: prixTotalNum,
      paye: payeBool,
      pourcentageBourse: pourcentageBourseNum,
      typePaiement: typePaySelected,
      anneeScolaire: (anneeScolaire || '').trim()
    };

    console.log('🔍 === DONNÉES AVANT SAUVEGARDE ===');
    console.log('🔍 etudiantData.cin:', etudiantData.cin);
    console.log('🔍 etudiantData.transport:', etudiantData.transport);
    console.log('🔍 etudiantData.actif:', etudiantData.actif);
    console.log('🔍 etudiantData.paye:', etudiantData.paye);

    console.log('🔍 Création de l\'instance Etudiant...');
    const etudiant = new Etudiant(etudiantData);
    
    console.log('🔍 Sauvegarde en cours...');
    const etudiantSauve = await etudiant.save();

    console.log('✅ Étudiant sauvegardé avec succès!');
    console.log('🔍 etudiantSauve.cin:', etudiantSauve.cin);
    console.log('🔍 etudiantSauve.transport:', etudiantSauve.transport);

    // Réponse (sans mot de passe)
    const etudiantResponse = etudiantSauve.toObject();
    delete etudiantResponse.motDePasse;

    const montantBourse = (prixTotalNum * pourcentageBourseNum) / 100;
    const montantAPayer = prixTotalNum - montantBourse;

    res.status(201).json({
      message: 'Étudiant créé avec succès',
      etudiant: etudiantResponse,
      infosPaiement: {
        montantTotal: prixTotalNum,
        montantBourse: montantBourse,
        montantAPayer: montantAPayer,
        pourcentageBourse: pourcentageBourseNum,
        typePaiement: typePaySelected,
        statutPaiement: payeBool ? 'Payé' : (prixTotalNum === 0 ? 'Gratuit' : 'En attente')
      },
      metadata: {
        anneeScolaire: anneeScolaire ? anneeScolaire.trim() : '',
        niveau: niveau ? niveau.trim() : '',
        transport: transportBool,
        nombreCours: cours.length,
        dateCreation: etudiantSauve.createdAt
      }
    });

  } catch (err) {
    console.error('❌ === ERREUR DANS ROUTE POST ===');
    console.error('❌ Type d\'erreur:', err.name);
    console.error('❌ Message:', err.message);
    console.error('❌ Stack:', err.stack);

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      console.error('❌ Erreurs de validation:', errors);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const fieldNames = { 
        email: 'Email', 
        codeMassar: 'Code Massar',
        cin: 'CIN'
      };
      console.error('❌ Doublon détecté:', field);
      return res.status(400).json({
        message: `${fieldNames[field] || field} déjà utilisé par un autre étudiant`
      });
    }

    if (err.name === 'CastError') {
      console.error('❌ Erreur de cast:', err.path);
      return res.status(400).json({ message: `Format invalide pour le champ ${err.path}` });
    }

    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
    });
  }
});
// ===== ROUTE PUT - MODIFICATION D'UN ÉTUDIANT (COMPLÈTE AVEC CIN) =====
app.put('/api/etudiants/:id', authAdminOrInscripteurOrPaiementManager, upload.single('image'), checkFieldPermissions, async (req, res) => {
  try {
    const {
      // Identité
      nomComplet,
      genre,
      dateNaissance,
      lieuNaissance,
      nationalite,
      cin,

      // Parents
      nomCompletPere,
      nomCompletMere,
      travailPere,
      travailMere,

      // Contact
      telephoneEtudiant,
      telephonePere,
      telephoneMere,

      // Scolarité
      codeMassar,
      adresse,
      email,
      motDePasse,
      niveau,
      transport,

      // Paiements
      prixTotal,
      paye,
      pourcentageBourse,
      typePaiement,
      anneeScolaire
    } = req.body;

    let { cours, actif } = req.body;

    // ===== VALIDATION DU CHAMP OBLIGATOIRE =====
    if (!nomComplet || nomComplet.toString().trim() === '') {
      return res.status(400).json({
        message: 'Le nom complet est obligatoire'
      });
    }

    // Trouver l'étudiant existant
    const etudiantExistant = await Etudiant.findById(req.params.id);
    if (!etudiantExistant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // ===== VALIDATION DES FORMATS (SEULEMENT SI LES CHAMPS SONT FOURNIS) =====
    
    // CIN (validation seulement si fourni)
    if (cin && cin.trim() !== '') {
      const cinRegex = /^[A-Z]{1,2}\d{6,8}$/i;
      if (!cinRegex.test(cin.trim().toUpperCase())) {
        return res.status(400).json({ 
          message: 'Format de CIN invalide (ex: AB123456)' 
        });
      }
    }

    // Email (validation seulement si fourni)
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: 'Format d\'email invalide' });
      }
    }

    // Mot de passe (seulement si fourni)
    if (motDePasse && motDePasse.trim() !== '' && motDePasse.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Année scolaire (validation seulement si fournie)
    if (anneeScolaire && anneeScolaire.trim() !== '') {
      const anneeScolaireRegex = /^\d{4}\/\d{4}$/;
      if (!anneeScolaireRegex.test(anneeScolaire.trim())) {
        return res.status(400).json({ message: 'L\'année scolaire doit être au format YYYY/YYYY (ex: 2025/2026)' });
      }
    }

    // Genre (validation seulement si fourni)
    if (genre && !['Homme', 'Femme'].includes(genre)) {
      return res.status(400).json({ message: 'Le genre doit être "Homme" ou "Femme"' });
    }

    // Téléphones (validation seulement si fournis)
    const phoneRegex = /^[0-9+\-\s]{8,15}$/;
    if (telephoneEtudiant && telephoneEtudiant.trim() !== '' && !phoneRegex.test(telephoneEtudiant.trim())) {
      return res.status(400).json({ message: 'Format de téléphone étudiant invalide' });
    }
    if (telephonePere && telephonePere.trim() !== '' && !phoneRegex.test(telephonePere.trim())) {
      return res.status(400).json({ message: 'Format de téléphone père invalide' });
    }
    if (telephoneMere && telephoneMere.trim() !== '' && !phoneRegex.test(telephoneMere.trim())) {
      return res.status(400).json({ message: 'Format de téléphone mère invalide' });
    }

    // Nationalité (validation seulement si fournie)
    if (nationalite && nationalite.trim() !== '' && nationalite.trim().length < 2) {
      return res.status(400).json({ message: 'Nationalité invalide' });
    }

    // ===== VÉRIFICATION D'UNICITÉ (SEULEMENT SI LES CHAMPS SONT FOURNIS) =====
    const checks = [];
    
    if (email && email.trim() !== '') {
      checks.push(
        Etudiant.findOne({ 
          email: email.toLowerCase().trim(),
          _id: { $ne: req.params.id }
        })
      );
    } else {
      checks.push(Promise.resolve(null));
    }

    if (codeMassar && codeMassar.trim() !== '') {
      checks.push(
        Etudiant.findOne({ 
          codeMassar: codeMassar.trim(),
          _id: { $ne: req.params.id }
        })
      );
    } else {
      checks.push(Promise.resolve(null));
    }

    if (cin && cin.trim() !== '') {
      checks.push(
        Etudiant.findOne({ 
          cin: cin.trim().toUpperCase(),
          _id: { $ne: req.params.id }
        })
      );
    } else {
      checks.push(Promise.resolve(null));
    }

    const [emailExistant, massarExistant, cinExistant] = await Promise.all(checks);

    if (emailExistant) {
      return res.status(400).json({ message: 'Email déjà utilisé par un autre étudiant' });
    }
    if (massarExistant) {
      return res.status(400).json({ message: 'Code Massar déjà utilisé par un autre étudiant' });
    }
    if (cinExistant) {
      return res.status(400).json({ message: 'CIN déjà utilisé par un autre étudiant' });
    }

    // ===== TRAITEMENT / CONVERSIONS =====
    const toBool = (v) => {
      if (typeof v === 'string') {
        const lowerV = v.toLowerCase().trim();
        if (lowerV === 'true') return true;
        if (lowerV === 'false') return false;
        return Boolean(v);
      }
      if (typeof v === 'boolean') return v;
      return Boolean(v);
    };

    const toNumber = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };

    const toDate = (d) => {
      if (!d) return null;
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date;
    };

    const prixTotalNum = toNumber(prixTotal);
    const pourcentageBourseNum = toNumber(pourcentageBourse);
    
    if (prixTotal !== undefined && prixTotalNum < 0) {
      return res.status(400).json({ message: 'Le prix total ne peut pas être négatif' });
    }
    if (pourcentageBourse !== undefined && (pourcentageBourseNum < 0 || pourcentageBourseNum > 100)) {
      return res.status(400).json({ message: 'Le pourcentage de bourse doit être entre 0 et 100' });
    }

    // Type de paiement
    const typesValides = ['Cash', 'Virement', 'Chèque', 'En ligne'];
    let typePaySelected = etudiantExistant.typePaiement || 'Cash';
    if (typePaiement) {
      if (!typesValides.includes(typePaiement)) {
        return res.status(400).json({
          message: `Type de paiement invalide. Types valides: ${typesValides.join(', ')}`
        });
      }
      typePaySelected = typePaiement;
    }

    // Date de naissance
    let dateNaissanceFormatted = etudiantExistant.dateNaissance;
    if (dateNaissance) {
      dateNaissanceFormatted = toDate(dateNaissance);
      if (!dateNaissanceFormatted) {
        return res.status(400).json({ message: 'Format de date de naissance invalide' });
      }

      // Validation de l'âge seulement si une nouvelle date est fournie
      const aujourdHui = new Date();
      let age = aujourdHui.getFullYear() - dateNaissanceFormatted.getFullYear();
      const m = aujourdHui.getMonth() - dateNaissanceFormatted.getMonth();
      if (m < 0 || (m === 0 && aujourdHui.getDate() < dateNaissanceFormatted.getDate())) age--;
      if (age < 10 || age > 25) {
        return res.status(400).json({ message: 'L\'âge de l\'étudiant doit être entre 10 et 25 ans' });
      }
    }

    // Cours
    let coursArray = etudiantExistant.cours || [];
    if (cours !== undefined) {
      if (typeof cours === 'string') {
        coursArray = cours.split(',').map(c => c.trim()).filter(Boolean);
      } else if (Array.isArray(cours)) {
        coursArray = cours;
      }
    }

    // Conversions booléennes
    const actifBool = actif !== undefined ? toBool(actif) : etudiantExistant.actif;
    const payeBool = paye !== undefined ? toBool(paye) : etudiantExistant.paye;
    const transportBool = transport !== undefined ? toBool(transport) : etudiantExistant.transport;

    console.log('✅ PUT - Données reçues et converties:', {
      cin: { original: cin, converti: cin ? cin.trim().toUpperCase() : etudiantExistant.cin },
      transport: { original: transport, converti: transportBool },
      actif: { original: actif, converti: actifBool },
      paye: { original: paye, converti: payeBool }
    });

    // Image (garder l'ancienne si pas de nouvelle)
    let imagePath = etudiantExistant.image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    // Hash MDP seulement si un nouveau mot de passe est fourni
    let hashedPassword = etudiantExistant.motDePasse;
    if (motDePasse && motDePasse.trim() !== '') {
      hashedPassword = await bcrypt.hash(motDePasse.trim(), 12);
    }

    // ===== MISE À JOUR DE L'ÉTUDIANT =====
    const etudiantData = {
      // Identité (seulement les champs fournis)
      nomComplet: nomComplet.trim(),
      ...(genre && { genre }),
      ...(dateNaissanceFormatted && { dateNaissance: dateNaissanceFormatted }),
      ...(lieuNaissance && { lieuNaissance: lieuNaissance.trim() }),
      ...(nationalite && { nationalite: nationalite.trim() }),
      ...(cin && cin.trim() !== '' && { cin: cin.trim().toUpperCase() }),

      // Parents (seulement les champs fournis)
      ...(nomCompletPere && { nomCompletPere: nomCompletPere.trim() }),
      ...(nomCompletMere && { nomCompletMere: nomCompletMere.trim() }),
      ...(travailPere !== undefined && { travailPere: (travailPere || '').trim() }),
      ...(travailMere !== undefined && { travailMere: (travailMere || '').trim() }),

      // Contact (seulement les champs fournis)
      ...(telephoneEtudiant && { telephoneEtudiant: telephoneEtudiant.trim() }),
      ...(telephonePere !== undefined && { telephonePere: (telephonePere || '').trim() }),
      ...(telephoneMere !== undefined && { telephoneMere: (telephoneMere || '').trim() }),

      // Scolarité (seulement les champs fournis)
      ...(codeMassar && { codeMassar: codeMassar.trim() }),
      ...(adresse !== undefined && { adresse: (adresse || '').trim() }),
      ...(email && { email: email.toLowerCase().trim() }),
      motDePasse: hashedPassword,
      ...(niveau && { niveau: niveau.trim() }),
      transport: transportBool,

      // Divers
      cours: coursArray,
      image: imagePath,
      actif: actifBool,

      // Paiement (seulement les champs fournis)
      ...(prixTotal !== undefined && { prixTotal: prixTotalNum }),
      paye: payeBool,
      ...(pourcentageBourse !== undefined && { pourcentageBourse: pourcentageBourseNum }),
      typePaiement: typePaySelected,
      ...(anneeScolaire && { anneeScolaire: anneeScolaire.trim() })
    };

    console.log('✅ Données finales avant modification:', {
      cin: etudiantData.cin,
      transport: etudiantData.transport,
      actif: etudiantData.actif,
      paye: etudiantData.paye
    });

    const etudiantModifie = await Etudiant.findByIdAndUpdate(
      req.params.id,
      etudiantData,
      { new: true, runValidators: true }
    );

    // Réponse (sans mot de passe)
    const etudiantResponse = etudiantModifie.toObject();
    delete etudiantResponse.motDePasse;

    const montantBourse = (etudiantModifie.prixTotal * etudiantModifie.pourcentageBourse) / 100;
    const montantAPayer = etudiantModifie.prixTotal - montantBourse;

    res.json({
      message: 'Étudiant modifié avec succès',
      etudiant: etudiantResponse,
      infosPaiement: {
        montantTotal: etudiantModifie.prixTotal,
        montantBourse: montantBourse,
        montantAPayer: montantAPayer,
        pourcentageBourse: etudiantModifie.pourcentageBourse,
        typePaiement: etudiantModifie.typePaiement,
        statutPaiement: etudiantModifie.paye ? 'Payé' : (etudiantModifie.prixTotal === 0 ? 'Gratuit' : 'En attente')
      },
      metadata: {
        anneeScolaire: etudiantModifie.anneeScolaire,
        niveau: etudiantModifie.niveau,
        transport: etudiantModifie.transport,
        nombreCours: etudiantModifie.cours.length,
        dateModification: new Date()
      }
    });

  } catch (err) {
    console.error('❌ Erreur modification étudiant:', err);

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const fieldNames = { 
        email: 'Email', 
        codeMassar: 'Code Massar',
        cin: 'CIN'
      };
      return res.status(400).json({
        message: `${fieldNames[field] || field} déjà utilisé par un autre étudiant`
      });
    }

    if (err.name === 'CastError') {
      return res.status(400).json({ message: `Format invalide pour le champ ${err.path}` });
    }

    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
    });
  }
});
app.patch('/api/etudiants/:id/finance', authAdminOrPaiementManager, async (req, res) => {
  try {
    const { prixTotal, paye, pourcentageBourse, typePaiement } = req.body;
    
    // Validation
    if (prixTotal < 0) {
      return res.status(400).json({ message: 'Le prix total ne peut pas être négatif' });
    }
    if (pourcentageBourse < 0 || pourcentageBourse > 100) {
      return res.status(400).json({ message: 'Le pourcentage de bourse doit être entre 0 et 100' });
    }
    
    const typesValides = ['Cash', 'Virement', 'Chèque', 'En ligne'];
    if (typePaiement && !typesValides.includes(typePaiement)) {
      return res.status(400).json({ message: 'Type de paiement invalide' });
    }
    
    const updateData = {};
    if (prixTotal !== undefined) updateData.prixTotal = prixTotal;
    if (paye !== undefined) updateData.paye = paye;
    if (pourcentageBourse !== undefined) updateData.pourcentageBourse = pourcentageBourse;
    if (typePaiement) updateData.typePaiement = typePaiement;
    
    const etudiant = await Etudiant.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    res.json({
      message: 'Informations financières mises à jour',
      etudiant: etudiant
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ========================================
// 4. ROUTE SPÉCIALE POUR RÉCUPÉRER ÉTUDIANTS
// ========================================



// ✅ 1. GÉNÉRER UN SEUL QR CODE PAR MOIS (valable 30 JOURS, réutilisable chaque jour)
app.post('/api/admin/generate-qr', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const maintenant = new Date();
    const moisActuel = maintenant.getMonth() + 1; // 1-12
    const anneeActuelle = maintenant.getFullYear();
    
    console.log(`📅 Vérification QR pour ${moisActuel}/${anneeActuelle}`);
    
    // ✅ Vérifier s'il existe déjà un QR pour ce mois
    const qrExistant = await QRCode.findOne({ 
      mois: moisActuel,
      annee: anneeActuelle,
      isActive: true 
    });
    
    if (qrExistant && qrExistant.isValid()) {
      const joursRestants = qrExistant.getTimeRemaining();
      console.log(`✅ QR existant trouvé, ${joursRestants} jours restants`);
      
      return res.json({
        success: true,
        message: `QR Code actif pour ce mois (${joursRestants} jours restants)`,
        qrCode: {
          id: qrExistant.qrId,
          dataURL: qrExistant.dataURL,
          scanUrl: qrExistant.scanUrl,
          expiresAt: qrExistant.expiresAt,
          description: qrExistant.description,
          validiteJours: qrExistant.validiteJours,
          mois: qrExistant.mois,
          annee: qrExistant.annee,
          joursRestants: joursRestants,
          scansCount: qrExistant.scansCount
        }
      });
    }
    
    // ✅ Créer un nouveau QR pour ce mois (30 jours de validité)
    const qrId = uuidv4();
    const expirationTime = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 jours
    
    const scanUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/scan-qr/${qrId}`;
    
    const qrCodeDataURL = await QRCodeGen.toDataURL(scanUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 256
    });
    
    const nomMois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                     'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    const newQRCode = new QRCode({
      qrId: qrId,
      description: req.body.description || `Pointage ${nomMois[moisActuel - 1]} ${anneeActuelle}`,
      createdBy: req.adminId,
      mois: moisActuel,
      annee: anneeActuelle,
      expiresAt: expirationTime,
      validiteJours: 30,
      dataURL: qrCodeDataURL,
      scanUrl: scanUrl
    });
    
    await newQRCode.save();
    
    console.log(`✅ Nouveau QR créé pour ${nomMois[moisActuel - 1]} ${anneeActuelle} (valable 30 jours)`);
    
    res.json({
      success: true,
      message: `QR Code créé pour ${nomMois[moisActuel - 1]} ${anneeActuelle}`,
      qrCode: {
        id: qrId,
        dataURL: qrCodeDataURL,
        scanUrl: scanUrl,
        expiresAt: expirationTime,
        description: newQRCode.description,
        validiteJours: 30,
        mois: moisActuel,
        annee: anneeActuelle,
        joursRestants: 30,
        scansCount: 0
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur génération QR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du QR code'
    });
  }
});

// ✅ 2. SCAN QR - ENTRÉE (même QR réutilisable chaque jour)
app.post('/api/scan-qr/:qrId', authProfesseur, async (req, res) => {
  try {
    const { qrId } = req.params;
    const professeur = req.professeur;
    
    console.log('=== SCAN QR ENTRÉE ===');
    console.log('QR ID:', qrId);
    console.log('Professeur:', professeur.nom);
    
    // ✅ Vérifier le QR code
    const qrCode = await QRCode.findOne({ qrId: qrId, isActive: true });
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code invalide ou introuvable'
      });
    }
    
    if (!qrCode.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'QR code expiré'
      });
    }
    
    // ✅ Vérifier si déjà pointé AUJOURD'HUI (fuseau horaire Maroc)
    const maintenant = new Date();
    // Convertir en heure locale Maroc (UTC+1 en hiver, UTC+0 en été)
    const marocTime = new Date(maintenant.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    
    const today = new Date(marocTime);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const pointageExistant = await Pointage.findOne({
      professeur: professeur._id,
      date: { $gte: today, $lt: tomorrow }
    });
    
    if (pointageExistant) {
      console.log(`⚠️ ${professeur.nom} a déjà scanné aujourd'hui`);
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà scanné aujourd\'hui (entrée enregistrée)',
        pointageExistant: {
          heureEntree: pointageExistant.heureEntree,
          heureSortie: pointageExistant.heureSortie,
          statut: pointageExistant.statut
        }
      });
    }
    
    // ✅ CRÉER LE POINTAGE D'ENTRÉE POUR AUJOURD'HUI (heure Maroc)
    const heureEntree = marocTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const nouveauPointage = new Pointage({
      professeur: professeur._id,
      nomProfesseur: professeur.nom,
      emailProfesseur: professeur.email,
      date: marocTime,
      heureEntree: heureEntree,
      timestampEntree: marocTime,
      codeQRId: qrId,
      statut: 'présent',
      ipAddress: req.ip
    });
    
    await nouveauPointage.save();
    
    // Incrémenter le compteur de scans
    qrCode.scansCount += 1;
    await qrCode.save();
    
    console.log(`✅ ENTRÉE enregistrée: ${professeur.nom} à ${heureEntree}`);
    
    res.json({
      success: true,
      message: `Entrée enregistrée à ${heureEntree}`,
      pointage: {
        professeur: professeur.nom,
        heureEntree: heureEntree,
        date: marocTime.toLocaleDateString('fr-FR'),
        statut: 'présent'
      }
    });
    
  } catch (error) {
    console.error('❌ ERREUR SCAN QR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du scan',
      error: error.message
    });
  }
});

// ✅ 3. SORTIE (bouton)
app.post('/api/professeur/sortie', authProfesseur, async (req, res) => {
  try {
    const professeur = req.professeur;
    
    console.log('=== SORTIE PROFESSEUR ===');
    console.log('Professeur:', professeur.nom);
    
    // Trouver le pointage d'aujourd'hui (heure Maroc)
    const marocTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    
    const today = new Date(marocTime);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const pointage = await Pointage.findOne({
      professeur: professeur._id,
      date: { $gte: today, $lt: tomorrow }
    });
    
    if (!pointage) {
      return res.status(404).json({
        success: false,
        message: 'Aucune entrée enregistrée aujourd\'hui. Scannez d\'abord le QR code.'
      });
    }
    
    if (pointage.heureSortie) {
      return res.status(400).json({
        success: false,
        message: 'Sortie déjà enregistrée',
        heureSortie: pointage.heureSortie
      });
    }
    
    // ✅ ENREGISTRER LA SORTIE (heure Maroc) - Réutilise marocTime pour l'heure actuelle
    const marocTimeSortie = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    
    const heureSortie = marocTimeSortie.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    pointage.heureSortie = heureSortie;
    pointage.timestampSortie = marocTimeSortie;
    pointage.tempsPresence = pointage.calculerTempsPresence();
    
    await pointage.save();
    
    console.log(`✅ SORTIE enregistrée: ${professeur.nom} à ${heureSortie}`);
    console.log(`⏱️ Temps de présence: ${pointage.tempsPresence} minutes`);
    
    res.json({
      success: true,
      message: `Sortie enregistrée à ${heureSortie}`,
      pointage: {
        professeur: professeur.nom,
        heureEntree: pointage.heureEntree,
        heureSortie: heureSortie,
        tempsPresence: pointage.tempsPresence,
        statut: pointage.statut
      }
    });
    
  } catch (error) {
    console.error('❌ ERREUR SORTIE:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la sortie',
      error: error.message
    });
  }
});
// ==========================================
// 📚 ROUTES BULLETINS - AVEC COURS ET MATIÈRES
// ==========================================

// 📌 Créer/Mettre à jour un bulletin (Professeur)





// 📌 Récupérer tous les bulletins (Admin) - Groupés par cours
app.get('/api/bulletins', authAdmin, async (req, res) => {
  try {
    const bulletins = await Bulletin.find()
      .populate('etudiant', 'nomComplet email niveau')
      .populate('professeur', 'nom matiere')
      .sort({ cours: 1, anneeScolaire: -1, createdAt: -1 });

    res.json(bulletins);
  } catch (err) {
    console.error('Erreur récupération bulletins admin:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Créer/Mettre à jour un bulletin (Professeur)
app.post('/api/bulletins', authProfesseur, async (req, res) => {
  try {
    const { 
      etudiant, 
      cours, 
      semestre,
      noteControleContinu, 
      noteExamen,
      remarque,
      nombreAbsences 
    } = req.body;

    // Validation
    if (!etudiant || !cours || !semestre) {
      return res.status(400).json({ 
        message: 'Données manquantes: etudiant, cours, semestre requis' 
      });
    }

    // Récupérer le professeur pour obtenir sa matière
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    // ✅ Récupérer l'étudiant pour obtenir son année scolaire
    const etudiantData = await Etudiant.findById(etudiant);
    if (!etudiantData) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // ✅ Vérifier que l'étudiant a une année scolaire
    if (!etudiantData.anneeScolaire) {
      return res.status(400).json({ 
        message: 'L\'étudiant n\'a pas d\'année scolaire définie' 
      });
    }

    // ✅ Utiliser l'année scolaire de l'étudiant
    const anneeScolaire = etudiantData.anneeScolaire;

    // ✅ Chercher un bulletin existant pour CE PROFESSEUR et CETTE MATIÈRE
    let bulletin = await Bulletin.findOne({
      etudiant,
      cours,
      matiere: professeur.matiere,
      semestre,
      anneeScolaire // Utilise l'année scolaire de l'étudiant
    });

    if (bulletin) {
      // Mettre à jour le bulletin existant
      bulletin.noteControleContinu = noteControleContinu || 0;
      bulletin.noteExamen = noteExamen || 0;
      bulletin.remarque = remarque || '';
      bulletin.nombreAbsences = nombreAbsences || 0;
      
      await bulletin.save();
    } else {
      // Créer un nouveau bulletin
      bulletin = new Bulletin({
        etudiant,
        professeur: req.professeurId,
        cours,
        matiere: professeur.matiere,
        semestre,
        anneeScolaire, // ✅ Année scolaire de l'étudiant
        noteControleContinu: noteControleContinu || 0,
        noteExamen: noteExamen || 0,
        remarque: remarque || '',
        nombreAbsences: nombreAbsences || 0
      });

      await bulletin.save();
    }

    const bulletinPopulated = await Bulletin.findById(bulletin._id)
      .populate('etudiant', 'nomComplet email niveau anneeScolaire')
      .populate('professeur', 'nom matiere');

    res.json(bulletinPopulated);
  } catch (err) {
    console.error('Erreur création bulletin:', err);
    res.status(500).json({ error: err.message });
  }
});
// 📌 Récupérer tous les bulletins d'un professeur (SA MATIÈRE uniquement)
app.get('/api/bulletins/professeur', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    const bulletins = await Bulletin.find({ 
      professeur: req.professeurId,
      matiere: professeur.matiere 
    })
      .populate('etudiant', 'nomComplet email niveau')
      .populate('professeur', 'nom matiere')
      .sort({ cours: 1, createdAt: -1 });

    res.json(bulletins);
  } catch (err) {
    console.error('Erreur récupération bulletins:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer le bulletin COMPLET d'un étudiant (toutes les matières)
app.get('/api/bulletins/etudiant/me', authEtudiant, async (req, res) => {
  try {
    const { semestre, anneeScolaire, cours } = req.query;
    
    const bulletins = await Bulletin.find({ 
      etudiant: req.utilisateur.id,
      ...(cours && { cours }),
      ...(semestre && { semestre }),
      ...(anneeScolaire && { anneeScolaire })
    })
      .populate('professeur', 'nom matiere')
      .sort({ cours: 1, matiere: 1 });
    
    // ✅ Calculer la moyenne générale pour chaque cours
    const coursUniques = [...new Set(bulletins.map(b => b.cours))];
    const moyennesParCours = {};
    
    for (const c of coursUniques) {
      const bulletinsCours = bulletins.filter(b => b.cours === c);
      
      // Grouper par semestre
      const s1 = bulletinsCours.filter(b => b.semestre === 'S1');
      const s2 = bulletinsCours.filter(b => b.semestre === 'S2');
      const annee = bulletinsCours.filter(b => b.semestre === 'Année');
      
      const calculMoyenne = (bulletinsArray) => {
        if (bulletinsArray.length === 0) return null;
        const somme = bulletinsArray.reduce((acc, b) => acc + (b.moyenneMatiere || 0), 0);
        return (somme / bulletinsArray.length).toFixed(2);
      };
      
      moyennesParCours[c] = {
        moyenneS1: calculMoyenne(s1),
        moyenneS2: calculMoyenne(s2),
        moyenneAnnee: calculMoyenne(annee),
        // ✅ Moyenne finale (S1 + S2) / 2 si les deux existent
        moyenneFinale: (s1.length > 0 && s2.length > 0) 
          ? ((parseFloat(calculMoyenne(s1)) + parseFloat(calculMoyenne(s2))) / 2).toFixed(2)
          : null
      };
    }
    
    res.json({ 
      bulletins, 
      moyennesParCours
    });
  } catch (err) {
    console.error('Erreur récupération bulletins étudiant:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer le bulletin d'un cours complet (Admin) - TOUTES LES MATIÈRES
app.get('/api/bulletins/cours/:cours', authAdmin, async (req, res) => {
  try {
    const { cours } = req.params;
    const { semestre, anneeScolaire } = req.query;

    const bulletins = await Bulletin.find({
      cours,
      ...(semestre && { semestre }),
      ...(anneeScolaire && { anneeScolaire })
    })
      .populate('etudiant', 'nomComplet')
      .populate('professeur', 'nom matiere')
      .sort({ 'etudiant.nomComplet': 1, matiere: 1 });

    // ✅ Grouper par étudiant avec TOUTES ses matières
    const parEtudiant = {};
    
    bulletins.forEach(b => {
      const etudiantId = b.etudiant._id.toString();
      
      if (!parEtudiant[etudiantId]) {
        parEtudiant[etudiantId] = {
          etudiant: b.etudiant,
          matieresS1: [],
          matieresS2: [],
          matieresAnnee: [],
          moyenneS1: 0,
          moyenneS2: 0,
          moyenneAnnee: 0,
          moyenneFinale: 0,
          admis: false
        };
      }
      
      const matiereData = {
        matiere: b.matiere,
        professeur: b.professeur.nom,
        noteCC: b.noteControleContinu,
        noteExamen: b.noteExamen,
        moyenne: b.moyenneMatiere,
        remarque: b.remarque,
        absences: b.nombreAbsences
      };
      
      // Séparer par semestre
      if (b.semestre === 'S1') {
        parEtudiant[etudiantId].matieresS1.push(matiereData);
      } else if (b.semestre === 'S2') {
        parEtudiant[etudiantId].matieresS2.push(matiereData);
      } else if (b.semestre === 'Année') {
        parEtudiant[etudiantId].matieresAnnee.push(matiereData);
      }
    });

    // ✅ Calculer les moyennes pour chaque étudiant
    Object.keys(parEtudiant).forEach(etudiantId => {
      const etudiant = parEtudiant[etudiantId];
      
      // Moyenne S1
      if (etudiant.matieresS1.length > 0) {
        const sommeS1 = etudiant.matieresS1.reduce((acc, m) => acc + parseFloat(m.moyenne || 0), 0);
        etudiant.moyenneS1 = (sommeS1 / etudiant.matieresS1.length).toFixed(2);
      }
      
      // Moyenne S2
      if (etudiant.matieresS2.length > 0) {
        const sommeS2 = etudiant.matieresS2.reduce((acc, m) => acc + parseFloat(m.moyenne || 0), 0);
        etudiant.moyenneS2 = (sommeS2 / etudiant.matieresS2.length).toFixed(2);
      }
      
      // Moyenne Année
      if (etudiant.matieresAnnee.length > 0) {
        const sommeAnnee = etudiant.matieresAnnee.reduce((acc, m) => acc + parseFloat(m.moyenne || 0), 0);
        etudiant.moyenneAnnee = (sommeAnnee / etudiant.matieresAnnee.length).toFixed(2);
      }
      
      // ✅ Moyenne FINALE (S1 + S2) / 2
      if (etudiant.moyenneS1 > 0 && etudiant.moyenneS2 > 0) {
        etudiant.moyenneFinale = ((parseFloat(etudiant.moyenneS1) + parseFloat(etudiant.moyenneS2)) / 2).toFixed(2);
        etudiant.admis = parseFloat(etudiant.moyenneFinale) >= 10;
      }
    });

    res.json(Object.values(parEtudiant));
  } catch (err) {
    console.error('Erreur récupération bulletin cours:', err);
    res.status(500).json({ error: err.message });
  }
});


// 📌 Mettre à jour un bulletin
app.put('/api/bulletins/:id', authProfesseur, async (req, res) => {
  try {
    const { noteControleContinu, noteExamen, remarque, nombreAbsences } = req.body;

    const bulletin = await Bulletin.findById(req.params.id);

    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    if (bulletin.professeur.toString() !== req.professeurId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    if (noteControleContinu !== undefined) bulletin.noteControleContinu = noteControleContinu;
    if (noteExamen !== undefined) bulletin.noteExamen = noteExamen;
    if (remarque !== undefined) bulletin.remarque = remarque;
    if (nombreAbsences !== undefined) bulletin.nombreAbsences = nombreAbsences;

    await bulletin.save();

    const bulletinUpdated = await Bulletin.findById(bulletin._id)
      .populate('etudiant', 'nomComplet email')
      .populate('professeur', 'nom matiere');

    res.json(bulletinUpdated);
  } catch (err) {
    console.error('Erreur mise à jour bulletin:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Supprimer un bulletin (Admin ou Professeur propriétaire)
app.delete('/api/bulletins/:id', async (req, res) => {
  try {
    const bulletin = await Bulletin.findById(req.params.id);

    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    // Vérifier si c'est un admin ou le professeur propriétaire
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && bulletin.professeur.toString() !== decoded.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await Bulletin.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bulletin supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression bulletin:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/fix-index', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bulletins = db.collection('bulletins');
    
    await bulletins.dropIndex('etudiant_1_cours_1_semestre_1');
    await bulletins.createIndex(
      { etudiant: 1, cours: 1, matiere: 1, semestre: 1, anneeScolaire: 1 },
      { unique: true }
    );
    
    res.json({ message: 'Index corrigé!' });
  } catch (error) {
    res.json({ error: error.message });
  }
});
// 📌 Récupérer les cours d'un professeur (où il enseigne)
app.get('/api/professeur/mes-cours', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    // Les cours où ce professeur enseigne (depuis professeur.cours)
    const cours = await Cours.find({ 
      nom: { $in: professeur.cours }
    });

    res.json(cours);
  } catch (err) {
    console.error('Erreur récupération cours:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer les étudiants d'un cours spécifique
app.get('/api/professeur/etudiants/cours/:cours', authProfesseur, async (req, res) => {
  try {
    const { cours } = req.params;
    
    const etudiants = await Etudiant.find({
      cours: cours, // L'étudiant a ce cours dans son tableau
      actif: true
    }).select('nomComplet email niveau cours');

    res.json(etudiants);
  } catch (err) {
    console.error('Erreur récupération étudiants:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer les statistiques des bulletins (Admin)
app.get('/api/bulletins/stats', authAdmin, async (req, res) => {
  try {
    const totalBulletins = await Bulletin.countDocuments();
    
    const bulletinsParCours = await Bulletin.aggregate([
      {
        $group: {
          _id: '$cours',
          count: { $sum: 1 },
          moyenneGenerale: { $avg: '$moyenneMatiere' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const bulletinsParMatiere = await Bulletin.aggregate([
      {
        $group: {
          _id: '$matiere',
          count: { $sum: 1 },
          moyenneGenerale: { $avg: '$moyenneMatiere' }
        }
      },
      { $sort: { moyenneGenerale: -1 } }
    ]);

    res.json({
      total: totalBulletins,
      parCours: bulletinsParCours,
      parMatiere: bulletinsParMatiere
    });
  } catch (err) {
    console.error('Erreur statistiques:', err);
    res.status(500).json({ error: err.message });
  }
});
// ✅ 4. ROUTE - Statut du professeur aujourd'hui
app.get('/api/professeur/statut-aujourd-hui', authProfesseur, async (req, res) => {
  try {
    const professeur = req.professeur;
    
    const now = new Date();
    const marocTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    
    const today = new Date(marocTime);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const pointage = await Pointage.findOne({
      professeur: professeur._id,
      date: { $gte: today, $lt: tomorrow }
    });
    
    res.json({
      success: true,
      professeur: {
        nom: professeur.nom,
        email: professeur.email,
        matiere: professeur.matiere
      },
      aPointe: !!pointage,
      pointageAujourdhui: pointage ? {
        heureEntree: pointage.heureEntree,
        heureSortie: pointage.heureSortie,
        tempsPresence: pointage.tempsPresence,
        statut: pointage.statut
      } : null
    });
    
  } catch (error) {
    console.error('❌ Erreur statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut'
    });
  }
});

// ✅ 5. ADMIN - Pointages avec statistiques
app.get('/api/admin/pointages', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { date } = req.query;
    
    let dateRecherche = date ? new Date(date) : new Date();
    dateRecherche.setHours(0, 0, 0, 0);
    
    const finJour = new Date(dateRecherche);
    finJour.setHours(23, 59, 59, 999);
    
    const pointages = await Pointage.find({
      date: { $gte: dateRecherche, $lte: finJour }
    }).populate('professeur', 'nom email matiere').sort({ createdAt: -1 });
    
    const tousProfesseurs = await Professeur.find({ actif: true });
    const professeursPointes = pointages.map(p => p.professeur?._id?.toString()).filter(Boolean);
    const professeursAbsents = tousProfesseurs.filter(p => 
      !professeursPointes.includes(p._id.toString())
    );
    
    const stats = {
      date: dateRecherche.toLocaleDateString('fr-FR'),
      totalProfesseurs: tousProfesseurs.length,
      presents: pointages.length,
      absents: professeursAbsents.length,
      tauxPresence: tousProfesseurs.length > 0 ? 
        Math.round((pointages.length / tousProfesseurs.length) * 100) : 0,
      avecSortie: pointages.filter(p => p.heureSortie).length,
      sansSortie: pointages.filter(p => !p.heureSortie).length
    };
    
    res.json({
      success: true,
      stats: stats,
      pointages: pointages.map(p => ({
        _id: p._id,
        nomProfesseur: p.nomProfesseur,
        emailProfesseur: p.emailProfesseur,
        heureEntree: p.heureEntree,
        heureSortie: p.heureSortie,
        tempsPresence: p.tempsPresence,
        statut: p.statut,
        date: p.date
      })),
      professeursAbsents: professeursAbsents.map(p => ({
        _id: p._id,
        nom: p.nom,
        email: p.email,
        matiere: p.matiere
      }))
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération pointages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des pointages'
    });
  }
});

// ✅ 6. ADMIN - QR Codes actifs (pour afficher dans l'interface)
app.get('/api/admin/qr-codes-actifs', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const qrCodesActifs = await QRCode.find({ 
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    const qrCodesFormates = qrCodesActifs.map(qr => ({
      id: qr.qrId,
      description: qr.description,
      mois: qr.mois,
      annee: qr.annee,
      joursRestants: qr.getTimeRemaining(),
      scansCount: qr.scansCount,
      createdAt: qr.createdAt,
      expiresAt: qr.expiresAt
    }));
    
    res.json({
      success: true,
      qrCodesActifs: qrCodesFormates
    });
    
  } catch (error) {
    console.error('❌ Erreur QR codes actifs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des QR codes'
    });
  }
});

// ✅ 7. ADMIN - Supprimer un QR code
app.delete('/api/admin/qr-code/:qrId', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const qrCode = await QRCode.findOne({ qrId: qrId });
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code introuvable'
      });
    }
    
    qrCode.isActive = false;
    await qrCode.save();
    
    console.log(`🗑️ QR Code désactivé: ${qrId}`);
    
    res.json({
      success: true,
      message: 'QR code supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression QR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du QR code'
    });
  }
});






// ✅ ROUTE CORRECTE - Pointages sans paramètre (défaut aujourd'hui)
app.get('/api/admin/pointages', authAdmin, async (req, res) => {
  try {
    console.log('=== ROUTE ADMIN POINTAGES (sans date) ===');
    
    const { date } = req.query;
    
    // Date par défaut = aujourd'hui
    let dateRecherche = date ? new Date(date) : new Date();
    dateRecherche.setHours(0, 0, 0, 0);
    
    const finJour = new Date(dateRecherche);
    finJour.setHours(23, 59, 59, 999);
    
    console.log('Date recherchée:', dateRecherche.toLocaleDateString('fr-FR'));
    
    // Récupérer tous les pointages du jour avec populate
    const pointages = await Pointage.find({
      date: {
        $gte: dateRecherche,
        $lte: finJour
      }
    }).populate('professeur', 'nom email matiere').sort({ createdAt: -1 });
    
    console.log('Pointages trouvés:', pointages.length);
    
    // Récupérer tous les professeurs actifs
    const tousProfesseurs = await Professeur.find({ actif: true });
    console.log('Total professeurs actifs:', tousProfesseurs.length);
    
    // Identifier les professeurs qui ont pointé
    const professeursPointes = pointages.map(p => p.professeur?._id?.toString()).filter(Boolean);
    
    // Identifier les professeurs absents
    const professeursAbsents = tousProfesseurs.filter(p => 
      !professeursPointes.includes(p._id.toString())
    );
    
    console.log('Professeurs absents:', professeursAbsents.length);
    
    // Calculer les statistiques
    const stats = {
      date: dateRecherche.toLocaleDateString('fr-FR'),
      totalProfesseurs: tousProfesseurs.length,
      presents: pointages.filter(p => p.statut === 'présent').length,
      retards: pointages.filter(p => p.statut === 'retard').length,
      absents: professeursAbsents.length,
      tauxPresence: tousProfesseurs.length > 0 ? 
        Math.round((pointages.length / tousProfesseurs.length) * 100) : 0
    };
    
    console.log('Statistiques:', stats);
    
    res.json({
      success: true,
      stats: stats,
      pointages: pointages.map(p => ({
        _id: p._id,
        nomProfesseur: p.nomProfesseur,
        emailProfesseur: p.emailProfesseur,
        date: p.date,
        heure: p.heure,
        statut: p.statut,
        codeQRId: p.codeQRId,
        professeur: p.professeur ? {
          nom: p.professeur.nom,
          email: p.professeur.email,
          matiere: p.professeur.matiere
        } : null
      })),
      professeursAbsents: professeursAbsents.map(p => ({
        _id: p._id,
        nom: p.nom,
        email: p.email,
        matiere: p.matiere
      }))
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération pointages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des pointages',
      error: error.message
    });
  }
});

// ✅ ROUTE CORRECTE - Pointages avec date spécifique
app.get('/api/admin/pointages/:date', authAdmin, async (req, res) => {
  try {
    console.log('=== ROUTE ADMIN POINTAGES (avec date) ===');
    
    const { date } = req.params;
    
    let dateRecherche = new Date(date);
    dateRecherche.setHours(0, 0, 0, 0);
    
    const finJour = new Date(dateRecherche);
    finJour.setHours(23, 59, 59, 999);
    
    console.log('Date recherchée:', dateRecherche.toLocaleDateString('fr-FR'));
    
    const pointages = await Pointage.find({
      date: {
        $gte: dateRecherche,
        $lte: finJour
      }
    }).populate('professeur', 'nom email matiere').sort({ createdAt: -1 });
    
    const tousProfesseurs = await Professeur.find({ actif: true });
    const professeursPointes = pointages.map(p => p.professeur?._id?.toString()).filter(Boolean);
    const professeursAbsents = tousProfesseurs.filter(p => 
      !professeursPointes.includes(p._id.toString())
    );
    
    const stats = {
      date: dateRecherche.toLocaleDateString('fr-FR'),
      totalProfesseurs: tousProfesseurs.length,
      presents: pointages.filter(p => p.statut === 'présent').length,
      retards: pointages.filter(p => p.statut === 'retard').length,
      absents: professeursAbsents.length,
      tauxPresence: tousProfesseurs.length > 0 ? 
        Math.round((pointages.length / tousProfesseurs.length) * 100) : 0
    };
    
    res.json({
      success: true,
      stats: stats,
      pointages: pointages,
      professeursAbsents: professeursAbsents
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération pointages avec date:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des pointages',
      error: error.message
    });
  }
});



app.post('/api/cours', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    let { nom, professeur } = req.body;

    // ✅ تحويل professeur إلى مصفوفة إذا لم يكن مصفوفة
  if (!Array.isArray(professeur)) {
  professeur = professeur ? [professeur] : [];
}


    // التحقق من عدم تكرار الكورس
    const existe = await Cours.findOne({ nom });
    if (existe) return res.status(400).json({ message: 'Cours déjà existant' });

    const cours = new Cours({
      nom,
      professeur, // مصفوفة من الأسماء
      creePar: req.adminId
    });

    await cours.save();

    // تحديث كل أستاذ وربط الكورس به
    for (const profNom of professeur) {
      const prof = await Professeur.findOne({ nom: profNom });
      if (prof && !prof.cours.includes(nom)) {
        prof.cours.push(nom);
        await prof.save();
      }
    }

    res.status(201).json(cours);
  } catch (err) {
    console.error('❌ Erreur ajout cours:', err);
    res.status(500).json({ error: err.message || 'Erreur inconnue côté serveur' });
  }
});

app.patch('/api/etudiants/:id/actif', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id);
    if (!etudiant) return res.status(404).json({ message: 'Étudiant non trouvé' });

    etudiant.actif = !etudiant.actif;
    await etudiant.save();

    res.json(etudiant);
  } catch (err) {
    console.error('Erreur PATCH actif:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ Récupérer tous les professeurs avec leurs statistiques
app.get('/api/admin/professeurs-avec-stats', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeurs = await Professeur.find({})
      .select('nom email matiere cours actif retards absences statistiques telephone')
      .lean();
    
    // Transformer les données pour correspondre à ce que le frontend attend
    const professeursTransformes = professeurs.map(prof => ({
      _id: prof._id,
      nom: prof.nom,
      email: prof.email,
      matiere: prof.matiere,
      cours: prof.cours,
      telephone: prof.telephone,
      actif: prof.actif,
      retards: prof.statistiques?.totalRetards || 0,
      absences: prof.statistiques?.totalAbsences || 0,
      tempsRetardTotal: prof.statistiques?.tempsRetardTotal || 0,
      absencesJustifiees: prof.statistiques?.absencesJustifiees || 0,
      dernierRetard: prof.statistiques?.dernierRetard || null,
      derniereAbsence: prof.statistiques?.derniereAbsence || null
    }));
    
    res.json(professeursTransformes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des professeurs' });
  }
});

// ✅ Ajouter un retard à un professeur (route spécifique admin)
app.post('/api/admin/professeur/:id/retard', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { tempsRetard, cours, remarque } = req.body;
    
    if (!tempsRetard) {
      return res.status(400).json({ message: 'Temps de retard requis' });
    }

    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const retardData = {
      date: new Date(),
      tempsRetard: parseInt(tempsRetard),
      cours: cours || '',
      remarque: remarque || '',
      signalePar: req.user.id,
      signaleParModel: req.user.role === 'admin' ? 'Admin' : 'Inscripteur'
    };

    await professeur.ajouterRetard(retardData);
    
    res.json({ 
      message: 'Retard ajouté avec succès', 
      professeur: {
        id: professeur._id,
        nom: professeur.nom,
        statistiques: professeur.statistiques
      }
    });
  } catch (err) {
    console.error('Erreur ajout retard:', err);
    res.status(500).json({ message: 'Erreur lors de l\'ajout du retard' });
  }
});

// ✅ Ajouter une absence à un professeur (route spécifique admin)
app.post('/api/admin/professeur/:id/absence', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { cours, justifiee, raisonJustification, remarque } = req.body;

    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const absenceData = {
      date: new Date(),
      cours: cours || '',
      justifiee: justifiee || false,
      raisonJustification: justifiee ? raisonJustification || '' : '',
      remarque: remarque || '',
      signalePar: req.user.id,
      signaleParModel: req.user.role === 'admin' ? 'Admin' : 'Inscripteur'
    };

    await professeur.ajouterAbsence(absenceData);
    
    res.json({ 
      message: 'Absence ajoutée avec succès', 
      professeur: {
        id: professeur._id,
        nom: professeur.nom,
        statistiques: professeur.statistiques
      }
    });
  } catch (err) {
    console.error('Erreur ajout absence:', err);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'absence' });
  }
});


// Votre code complet corrigé :
app.post('/api/admin/send-prof-individual-report', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { destinataire, rapport } = req.body;
    
    if (!destinataire || !rapport) {
      return res.status(400).json({ message: 'Destinataire et rapport requis' });
    }

    // Configuration du transporteur email (CORRIGÉ)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          📊 RAPPORT COMPLET ACTUALISÉ - ${rapport.professeur.nom}
        </h2>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">👨‍🏫 INFORMATIONS</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 5px 0;"><strong>Nom:</strong> ${rapport.professeur.nom}</li>
            <li style="padding: 5px 0;"><strong>Email:</strong> ${rapport.professeur.email}</li>
            <li style="padding: 5px 0;"><strong>Matière:</strong> ${rapport.professeur.matiere}</li>
            <li style="padding: 5px 0;"><strong>Téléphone:</strong> ${rapport.professeur.telephone || 'N/A'}</li>
          </ul>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">📈 STATISTIQUES ACTUALISÉES</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 5px 0;"><strong>Total Retards:</strong> <span style="color: #dc2626;">${rapport.statistiques?.totalRetards || 0}</span></li>
            <li style="padding: 5px 0;"><strong>Total Absences:</strong> <span style="color: #dc2626;">${rapport.statistiques?.totalAbsences || 0}</span></li>
            <li style="padding: 5px 0;"><strong>Temps retard total:</strong> <span style="color: #f59e0b;">${rapport.statistiques?.tempsRetardTotal || 0} minutes</span></li>
            <li style="padding: 5px 0;"><strong>Absences justifiées:</strong> <span style="color: #10b981;">${rapport.statistiques?.absencesJustifiees || 0}</span></li>
          </ul>
        </div>

        <!-- TOUS LES RETARDS -->
        <div style="margin: 20px 0;">
          <h3 style="color: #1e40af;">⏰ TOUS LES RETARDS (${rapport.retards?.length || 0})</h3>
          ${rapport.retards && rapport.retards.length > 0 ? 
            rapport.retards.map((retard, index) => 
              `<div style="margin: 10px 0; padding: 15px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <strong>📅 ${new Date(retard.date).toLocaleDateString('fr-FR')}</strong>
                  <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${retard.tempsRetard} minutes</span>
                </div>
                <div><strong>Cours:</strong> ${retard.cours || 'N/A'}</div>
                ${retard.remarque ? `<div><strong>Remarque:</strong> ${retard.remarque}</div>` : ''}
              </div>`
            ).join('') 
            : '<p style="color: #6b7280; font-style: italic;">Aucun retard enregistré</p>'
          }
        </div>

        <!-- TOUTES LES ABSENCES -->
        <div style="margin: 20px 0;">
          <h3 style="color: #1e40af;">❌ TOUTES LES ABSENCES (${rapport.absences?.length || 0})</h3>
          ${rapport.absences && rapport.absences.length > 0 ? 
            rapport.absences.map((absence, index) => 
              `<div style="margin: 10px 0; padding: 15px; background: ${absence.justifiee ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${absence.justifiee ? '#10b981' : '#dc2626'}; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <strong>📅 ${new Date(absence.date).toLocaleDateString('fr-FR')}</strong>
                  <span style="background: ${absence.justifiee ? '#10b981' : '#dc2626'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${absence.justifiee ? 'JUSTIFIÉE' : 'NON JUSTIFIÉE'}</span>
                </div>
                <div><strong>Cours:</strong> ${absence.cours || 'N/A'}</div>
                ${absence.raisonJustification ? `<div><strong>Justification:</strong> ${absence.raisonJustification}</div>` : ''}
                ${absence.remarque ? `<div><strong>Remarque:</strong> ${absence.remarque}</div>` : ''}
              </div>`
            ).join('') 
            : '<p style="color: #6b7280; font-style: italic;">Aucune absence enregistrée</p>'
          }
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          Rapport complet généré le ${rapport.date} - Données actualisées en temps réel
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: destinataire,
      subject: `📊 Rapport Complet Actualisé - ${rapport.professeur.nom} - ${rapport.date}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Rapport complet envoyé avec succès par email' });
  } catch (err) {
    console.error('Erreur envoi email:', err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email: ' + err.message });
  }
});

// ✅ Ajouter un retard à un professeur
app.post('/api/professeurs/:id/retard', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { date, tempsRetard, cours, remarque } = req.body;
    
    if (!date || !tempsRetard) {
      return res.status(400).json({ message: 'Date et temps de retard sont requis' });
    }

    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const retardData = {
      date: new Date(date),
      tempsRetard: parseInt(tempsRetard),
      cours: cours || '',
      remarque: remarque || '',
      signalePar: req.user.id,
      signaleParModel: 'Admin'
    };

    await professeur.ajouterRetard(retardData);
    
    res.json({ 
      message: 'Retard ajouté avec succès', 
      professeur: {
        id: professeur._id,
        nom: professeur.nom,
        statistiques: professeur.statistiques
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout du retard' });
  }
});

// ✅ Ajouter une absence à un professeur
app.post('/api/professeurs/:id/absence', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { date, cours, justifiee, raisonJustification, remarque } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date est requise' });
    }

    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const absenceData = {
      date: new Date(date),
      cours: cours || '',
      justifiee: justifiee || false,
      raisonJustification: justifiee ? raisonJustification || '' : '',
      remarque: remarque || '',
      signalePar: req.user.id,
      signaleParModel: 'Admin'
    };

    await professeur.ajouterAbsence(absenceData);
    
    res.json({ 
      message: 'Absence ajoutée avec succès', 
      professeur: {
        id: professeur._id,
        nom: professeur.nom,
        statistiques: professeur.statistiques
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'absence' });
  }
});

// ✅ Supprimer un retard spécifique
app.delete('/api/professeurs/:id/retard/:retardId', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    professeur.retards = professeur.retards.filter(
      retard => retard._id.toString() !== req.params.retardId
    );

    await professeur.calculerStatistiques();
    
    res.json({ message: 'Retard supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression du retard' });
  }
});

// ✅ Supprimer une absence spécifique
app.delete('/api/professeurs/:id/absence/:absenceId', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    professeur.absences = professeur.absences.filter(
      absence => absence._id.toString() !== req.params.absenceId
    );

    await professeur.calculerStatistiques();
    
    res.json({ message: 'Absence supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'absence' });
  }
});

// ✅ Obtenir les statistiques globales
app.get('/api/professeurs/statistiques', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const totalProfesseurs = await Professeur.countDocuments({});
    const professeursActifs = await Professeur.countDocuments({ actif: true });
    
    const professeursAvecRetards = await Professeur.countDocuments({
      'statistiques.totalRetards': { $gt: 0 }
    });
    
    const professeursAvecAbsences = await Professeur.countDocuments({
      'statistiques.totalAbsences': { $gt: 0 }
    });

    // Calculer les totaux
    const pipeline = [
      {
        $group: {
          _id: null,
          totalRetards: { $sum: '$statistiques.totalRetards' },
          totalAbsences: { $sum: '$statistiques.totalAbsences' },
          totalTempsRetard: { $sum: '$statistiques.tempsRetardTotal' },
          totalAbsencesJustifiees: { $sum: '$statistiques.absencesJustifiees' }
        }
      }
    ];

    const [statistiques] = await Professeur.aggregate(pipeline);

    res.json({
      totalProfesseurs,
      professeursActifs,
      professeursAvecRetards,
      professeursAvecAbsences,
      totalRetards: statistiques?.totalRetards || 0,
      totalAbsences: statistiques?.totalAbsences || 0,
      totalTempsRetard: statistiques?.totalTempsRetard || 0,
      totalAbsencesJustifiees: statistiques?.totalAbsencesJustifiees || 0,
      totalAbsencesNonJustifiees: (statistiques?.totalAbsences || 0) - (statistiques?.totalAbsencesJustifiees || 0)
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors du calcul des statistiques' });
  }
});

// ✅ Envoyer les statistiques par email
app.post('/api/professeurs/:id/envoyer-stats', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    // Configuration du transporteur email (à adapter selon votre service)
    const transporter = nodemailer.createTransporter({
      service: 'gmail', // ou votre service email
      auth: {
        user: process.env.EMAIL_USER, // votre email
        pass: process.env.EMAIL_PASSWORD // votre mot de passe d'application
      }
    });

    // Formatage des données pour l'email
    const statsText = `
RAPPORT STATISTIQUES - ${professeur.nom}
==========================================

📊 RÉSUMÉ GÉNÉRAL:
• Total Retards: ${professeur.statistiques.totalRetards}
• Total Absences: ${professeur.statistiques.totalAbsences}
• Temps de retard total: ${professeur.statistiques.tempsRetardTotal} minutes
• Absences justifiées: ${professeur.statistiques.absencesJustifiees}
• Absences non justifiées: ${professeur.statistiques.totalAbsences - professeur.statistiques.absencesJustifiees}

⏰ DÉTAIL DES RETARDS:
${professeur.retards.map((retard, index) => 
  `${index + 1}. ${new Date(retard.date).toLocaleDateString('fr-FR')} - ${retard.tempsRetard}min - Cours: ${retard.cours || 'N/A'} - Remarque: ${retard.remarque || 'Aucune'}`
).join('\n') || 'Aucun retard enregistré'}

❌ DÉTAIL DES ABSENCES:
${professeur.absences.map((absence, index) => 
  `${index + 1}. ${new Date(absence.date).toLocaleDateString('fr-FR')} - Cours: ${absence.cours || 'N/A'} - ${absence.justifiee ? 'JUSTIFIÉE' : 'NON JUSTIFIÉE'} - Raison: ${absence.raisonJustification || absence.remarque || 'Aucune'}`
).join('\n') || 'Aucune absence enregistrée'}

Rapport généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'teamofppt@gmail.com',
      subject: `📊 Statistiques Professeur - ${professeur.nom} - ${new Date().toLocaleDateString('fr-FR')}`,
      text: statsText,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            📊 RAPPORT STATISTIQUES - ${professeur.nom}
          </h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">📈 RÉSUMÉ GÉNÉRAL</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 5px 0;"><strong>Total Retards:</strong> <span style="color: #dc2626;">${professeur.statistiques.totalRetards}</span></li>
              <li style="padding: 5px 0;"><strong>Total Absences:</strong> <span style="color: #dc2626;">${professeur.statistiques.totalAbsences}</span></li>
              <li style="padding: 5px 0;"><strong>Temps de retard total:</strong> <span style="color: #f59e0b;">${professeur.statistiques.tempsRetardTotal} minutes</span></li>
              <li style="padding: 5px 0;"><strong>Absences justifiées:</strong> <span style="color: #10b981;">${professeur.statistiques.absencesJustifiees}</span></li>
              <li style="padding: 5px 0;"><strong>Absences non justifiées:</strong> <span style="color: #dc2626;">${professeur.statistiques.totalAbsences - professeur.statistiques.absencesJustifiees}</span></li>
            </ul>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #1e40af;">⏰ DÉTAIL DES RETARDS</h3>
            ${professeur.retards.length > 0 ? 
              `<ol style="line-height: 1.6;">
                ${professeur.retards.map(retard => 
                  `<li style="margin: 10px 0; padding: 10px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                    <strong>Date:</strong> ${new Date(retard.date).toLocaleDateString('fr-FR')}<br>
                    <strong>Temps:</strong> ${retard.tempsRetard} minutes<br>
                    <strong>Cours:</strong> ${retard.cours || 'N/A'}<br>
                    <strong>Remarque:</strong> ${retard.remarque || 'Aucune'}
                  </li>`
                ).join('')}
              </ol>` 
              : '<p style="color: #6b7280; font-style: italic;">Aucun retard enregistré</p>'
            }
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #1e40af;">❌ DÉTAIL DES ABSENCES</h3>
            ${professeur.absences.length > 0 ? 
              `<ol style="line-height: 1.6;">
                ${professeur.absences.map(absence => 
                  `<li style="margin: 10px 0; padding: 10px; background: ${absence.justifiee ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${absence.justifiee ? '#10b981' : '#dc2626'}; border-radius: 4px;">
                    <strong>Date:</strong> ${new Date(absence.date).toLocaleDateString('fr-FR')}<br>
                    <strong>Cours:</strong> ${absence.cours || 'N/A'}<br>
                    <strong>Statut:</strong> <span style="color: ${absence.justifiee ? '#10b981' : '#dc2626'}; font-weight: bold;">${absence.justifiee ? 'JUSTIFIÉE' : 'NON JUSTIFIÉE'}</span><br>
                    <strong>Raison:</strong> ${absence.raisonJustification || absence.remarque || 'Aucune'}
                  </li>`
                ).join('')}
              </ol>` 
              : '<p style="color: #6b7280; font-style: italic;">Aucune absence enregistrée</p>'
            }
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Statistiques envoyées par email avec succès' });
  } catch (err) {
    console.error('Erreur envoi email:', err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email' });
  }
});

// ✅ Filtrer les professeurs par type
app.get('/api/professeurs/filtre/:type', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    let query = {};
    
    switch (req.params.type) {
      case 'retards':
        query = { 'statistiques.totalRetards': { $gt: 0 } };
        break;
      case 'absences':
        query = { 'statistiques.totalAbsences': { $gt: 0 } };
        break;
      case 'actifs':
        query = { actif: true };
        break;
      case 'inactifs':
        query = { actif: false };
        break;
      default:
        query = {}; // tous
    }

    const professeurs = await Professeur.find(query)
      .select('nom email matiere cours actif retards absences statistiques')
      .lean();
    
    res.json(professeurs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors du filtrage' });
  }
});

// ✅ Récupérer l'historique complet d'un professeur
app.get('/api/professeurs/:id/historique', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.params.id)
      .populate('retards.signalePar', 'nom')
      .populate('absences.signalePar', 'nom')
      .lean();

    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    res.json({
      professeur: {
        nom: professeur.nom,
        email: professeur.email,
        matiere: professeur.matiere
      },
      retards: professeur.retards,
      absences: professeur.absences,
      statistiques: professeur.statistiques
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
  }
});

// ✅ Récupérer l'historique complet d'un professeur (route admin spécifique)
app.get('/api/admin/professeur/:id/historique', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.params.id)
      .populate('retards.signalePar', 'nom')
      .populate('absences.signalePar', 'nom')
      .lean();

    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    // Trier les retards et absences par date (plus récent en premier)
    const retardsTries = professeur.retards.sort((a, b) => new Date(b.date) - new Date(a.date));
    const absencesTries = professeur.absences.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      professeur: {
        nom: professeur.nom,
        email: professeur.email,
        matiere: professeur.matiere,
        telephone: professeur.telephone
      },
      retards: retardsTries,
      absences: absencesTries,
      statistiques: professeur.statistiques
    });
  } catch (err) {
    console.error('Erreur récupération historique:', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
  }
});

// ✅ Récupérer l'historique complet d'un professeur
app.get('/api/professeurs/:id/historique', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.params.id)
      .populate('retards.signalePar', 'nom')
      .populate('absences.signalePar', 'nom')
      .lean();

    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    res.json({
      professeur: {
        nom: professeur.nom,
        email: professeur.email,
        matiere: professeur.matiere
      },
      retards: professeur.retards,
      absences: professeur.absences,
      statistiques: professeur.statistiques
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
  }
});
// ✅ NOUVELLE VERSION - Soft Delete
app.delete('/api/etudiants/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id);
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // ✅ Au lieu de supprimer, on met à jour :
    etudiant.hidden = true;      // Marquer comme caché
    etudiant.cours = [];          // Vider les cours
    etudiant.actif = false;       // Désactiver aussi (optionnel)
    
    await etudiant.save();
    
    res.json({ 
      message: 'Étudiant archivé avec succès',
      etudiant: etudiant 
    });
    
  } catch (err) {
    console.error('Erreur soft delete:', err);
    res.status(500).json({ message: 'Erreur lors de l\'archivage' });
  }
});// ✅ Exclure les étudiants hidden par défaut
app.get('/api/etudiants/filtered', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const role = req.user.role;
    let query = { hidden: { $ne: true } }; // ✅ Exclure les cachés
    
    if (role === 'inscripteur') {
      query.creeParInscripteur = req.user.id;
    }
    
    const etudiants = await Etudiant.find(query)
      .populate('creeParAdmin', 'nom prenom')
      .populate('creeParInscripteur', 'nom prenom');
      
    res.json(etudiants);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});// ✅ Nouvelle route pour restaurer
app.patch('/api/etudiants/:id/restore', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id);
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    etudiant.hidden = false;  // Rendre visible à nouveau
    etudiant.actif = true;    // Réactiver
    
    await etudiant.save();
    
    res.json({ 
      message: 'Étudiant restauré avec succès',
      etudiant: etudiant 
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la restauration' });
  }
});
// ✅ Route pour obtenir les étudiants archivés
app.get('/api/etudiants/archives', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const role = req.user.role;
    let query = { hidden: true }; // Seulement les cachés
    
    if (role === 'inscripteur') {
      query.creeParInscripteur = req.user.id;
    }
    
    const etudiants = await Etudiant.find(query)
      .populate('creeParAdmin', 'nom prenom')
      .populate('creeParInscripteur', 'nom prenom')
      .sort({ updatedAt: -1 }); // Les plus récents d'abord
      
    res.json(etudiants);
  } catch (err) {
    console.error('Erreur archives:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ Route pour restaurer un étudiant
app.patch('/api/etudiants/:id/restore', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id);
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    etudiant.hidden = false;
    etudiant.actif = true;
    // NE PAS restaurer les cours automatiquement - ils sont vides
    
    await etudiant.save();
    
    res.json({ 
      message: 'Étudiant restauré avec succès',
      etudiant: etudiant 
    });
    
  } catch (err) {
    console.error('Erreur restore:', err);
    res.status(500).json({ message: 'Erreur lors de la restauration' });
  }
});

// ✅ Route pour suppression DÉFINITIVE
app.delete('/api/etudiants/:id/permanent', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id);
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Vérifier que l'étudiant est bien hidden
    if (!etudiant.hidden) {
      return res.status(400).json({ 
        message: 'Seuls les étudiants archivés peuvent être supprimés définitivement' 
      });
    }

    await Etudiant.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Étudiant supprimé définitivement' });
    
  } catch (err) {
    console.error('Erreur suppression permanente:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});
// Créer une nouvelle réclamation
app.post('/api/professeur/reclamations', authProfesseur, async (req, res) => {
  try {
    const { etudiantId, typeReclamation, cours, dateIncident, priorite, description } = req.body;
    
    // Vérifications
    if (!etudiantId || !typeReclamation || !cours || !dateIncident) {
      return res.status(400).json({ 
        message: 'Veuillez remplir tous les champs obligatoires' 
      });
    }

    // Vérifier que l'étudiant existe et est autorisé dans ce cours
    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    if (!etudiant.cours.includes(cours)) {
      return res.status(400).json({ 
        message: 'Cet étudiant n\'est pas inscrit dans ce cours' 
      });
    }

    // Vérifier que le professeur enseigne ce cours
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur.cours.includes(cours)) {
      return res.status(400).json({ 
        message: 'Vous n\'enseignez pas ce cours' 
      });
    }

    // Créer la réclamation
    const reclamation = new Reclamation({
      professeur: req.professeurId,
      etudiant: etudiantId,
      cours,
      typeReclamation,
      dateIncident: new Date(dateIncident),
      priorite: priorite || 'Moyenne',
      description: description?.trim() || ''
    });

    await reclamation.save();

    // Populer les références pour la réponse
    await reclamation.populate([
      { path: 'professeur', select: 'nomComplet email' },
      { path: 'etudiant', select: 'nomComplet email niveau' }
    ]);

    res.status(201).json({
      message: 'Réclamation créée avec succès',
      reclamation
    });

  } catch (err) {
    console.error('Erreur création réclamation:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Récupérer les réclamations d'un professeur
app.get('/api/professeur/reclamations', authProfesseur, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { statut, priorite, cours, etudiant } = req.query;
    
    // Construire le filtre
    let filter = { professeur: req.professeurId };
    
    if (statut) filter.statut = statut;
    if (priorite) filter.priorite = priorite;
    if (cours) filter.cours = cours;
    if (etudiant) {
      // Rechercher l'étudiant par nom
      const etudiants = await Etudiant.find({
        nomComplet: new RegExp(etudiant, 'i')
      }).select('_id');
      filter.etudiant = { $in: etudiants.map(e => e._id) };
    }

    const reclamations = await Reclamation.find(filter)
      .populate([
        { path: 'etudiant', select: 'nomComplet email niveau image' },
        { path: 'adminTraitant', select: 'nomComplet email' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reclamation.countDocuments(filter);
    
    // Statistiques rapides
    const stats = await Reclamation.aggregate([
      { $match: { professeur: req.professeurId } },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      reclamations,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });

  } catch (err) {
    console.error('Erreur récupération réclamations:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Récupérer une réclamation spécifique du professeur
app.get('/api/professeur/reclamations/:id', authProfesseur, async (req, res) => {
  try {
    const reclamation = await Reclamation.findOne({
      _id: req.params.id,
      professeur: req.professeurId
    }).populate([
      { path: 'etudiant', select: 'nomComplet email niveau image' },
      { path: 'adminTraitant', select: 'nomComplet email' }
    ]);

    if (!reclamation) {
      return res.status(404).json({ message: 'Réclamation non trouvée' });
    }

    res.json(reclamation);

  } catch (err) {
    console.error('Erreur récupération réclamation:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Modifier une réclamation (seulement si pas encore traitée)
app.put('/api/professeur/reclamations/:id', authProfesseur, async (req, res) => {
  try {
    const reclamation = await Reclamation.findOne({
      _id: req.params.id,
      professeur: req.professeurId
    });

    if (!reclamation) {
      return res.status(404).json({ message: 'Réclamation non trouvée' });
    }

    // Ne permettre la modification que si la réclamation n'est pas encore traitée
    if (reclamation.statut !== 'En attente') {
      return res.status(400).json({ 
        message: 'Cette réclamation ne peut plus être modifiée' 
      });
    }

    const { typeReclamation, priorite, description } = req.body;
    
    if (typeReclamation) reclamation.typeReclamation = typeReclamation;
    if (priorite) reclamation.priorite = priorite;
    if (description !== undefined) reclamation.description = description.trim();

    await reclamation.save();

    await reclamation.populate([
      { path: 'etudiant', select: 'nomComplet email niveau' }
    ]);

    res.json({
      message: 'Réclamation modifiée avec succès',
      reclamation
    });

  } catch (err) {
    console.error('Erreur modification réclamation:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// ==================== ROUTES ADMIN ====================

// Récupérer toutes les réclamations pour l'admin
app.get('/api/admin/reclamations', authAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { statut, priorite, cours, professeur, etudiant } = req.query;
    
    // Construire le filtre
    let filter = {};
    
    if (statut) filter.statut = statut;
    if (priorite) filter.priorite = priorite;
    if (cours) filter.cours = cours;
    
    if (professeur) {
      const professeurs = await Professeur.find({
        nomComplet: new RegExp(professeur, 'i')
      }).select('_id');
      filter.professeur = { $in: professeurs.map(p => p._id) };
    }
    
    if (etudiant) {
      const etudiants = await Etudiant.find({
        nomComplet: new RegExp(etudiant, 'i')
      }).select('_id');
      filter.etudiant = { $in: etudiants.map(e => e._id) };
    }

    const reclamations = await Reclamation.find(filter)
      .populate([
        { path: 'professeur', select: 'nomComplet email' },
        { path: 'etudiant', select: 'nomComplet email niveau image' },
        { path: 'adminTraitant', select: 'nomComplet email' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reclamation.countDocuments(filter);
    
    // Statistiques globales
    const stats = await Reclamation.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          enAttente: { $sum: { $cond: [{ $eq: ['$statut', 'En attente'] }, 1, 0] } },
          enCours: { $sum: { $cond: [{ $eq: ['$statut', 'En cours de traitement'] }, 1, 0] } },
          resolues: { $sum: { $cond: [{ $eq: ['$statut', 'Résolue'] }, 1, 0] } },
          fermees: { $sum: { $cond: [{ $eq: ['$statut', 'Fermée'] }, 1, 0] } },
          urgentes: { $sum: { $cond: [{ $eq: ['$priorite', 'Urgente'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      reclamations,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      stats: stats[0] || {
        total: 0, enAttente: 0, enCours: 0, 
        resolues: 0, fermees: 0, urgentes: 0
      }
    });

  } catch (err) {
    console.error('Erreur récupération réclamations admin:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Récupérer une réclamation spécifique pour l'admin
app.get('/api/admin/reclamations/:id', authAdmin, async (req, res) => {
  try {
    const reclamation = await Reclamation.findById(req.params.id)
      .populate([
        { path: 'professeur', select: 'nomComplet email telephone' },
        { path: 'etudiant', select: 'nomComplet email niveau telephone image' },
        { path: 'adminTraitant', select: 'nomComplet email' }
      ]);

    if (!reclamation) {
      return res.status(404).json({ message: 'Réclamation non trouvée' });
    }

    res.json(reclamation);

  } catch (err) {
    console.error('Erreur récupération réclamation admin:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Traiter une réclamation (changer le statut)
app.put('/api/admin/reclamations/:id/traiter', authAdmin, async (req, res) => {
  try {
    const { statut, commentaireAdmin } = req.body;
    
    if (!statut) {
      return res.status(400).json({ message: 'Le statut est requis' });
    }

    const reclamation = await Reclamation.findById(req.params.id);
    if (!reclamation) {
      return res.status(404).json({ message: 'Réclamation non trouvée' });
    }

    reclamation.statut = statut;
    reclamation.commentaireAdmin = commentaireAdmin?.trim() || '';
    reclamation.adminTraitant = req.adminId;
    
    // La date de traitement sera mise automatiquement par le middleware pre-save
    await reclamation.save();

    await reclamation.populate([
      { path: 'professeur', select: 'nomComplet email' },
      { path: 'etudiant', select: 'nomComplet email niveau' },
      { path: 'adminTraitant', select: 'nomComplet email' }
    ]);

    res.json({
      message: 'Réclamation traitée avec succès',
      reclamation
    });

  } catch (err) {
    console.error('Erreur traitement réclamation:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Supprimer une réclamation (seulement admin)
app.delete('/api/admin/reclamations/:id', authAdmin, async (req, res) => {
  try {
    const reclamation = await Reclamation.findById(req.params.id);
    if (!reclamation) {
      return res.status(404).json({ message: 'Réclamation non trouvée' });
    }

    await Reclamation.findByIdAndDelete(req.params.id);

    res.json({ message: 'Réclamation supprimée avec succès' });

  } catch (err) {
    console.error('Erreur suppression réclamation:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Statistiques détaillées pour l'admin
app.get('/api/admin/reclamations/stats/detailed', authAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      // Stats par statut
      Reclamation.aggregate([
        { $group: { _id: '$statut', count: { $sum: 1 } } }
      ]),
      
      // Stats par priorité
      Reclamation.aggregate([
        { $group: { _id: '$priorite', count: { $sum: 1 } } }
      ]),
      
      // Stats par type de réclamation
      Reclamation.aggregate([
        { $group: { _id: '$typeReclamation', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Stats par cours
      Reclamation.aggregate([
        { $group: { _id: '$cours', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Réclamations récentes (7 derniers jours)
      Reclamation.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      parStatut: stats[0],
      parPriorite: stats[1],
      parType: stats[2],
      parCours: stats[3],
      reclamationsRecentes: stats[4]
    });

  } catch (err) {
    console.error('Erreur stats réclamations:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

app.get('/api/professeur/etudiants', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    // Récupérer les étudiants qui ont au moins un cours en commun avec ce professeur
    const etudiants = await Etudiant.find({ 
      cours: { $in: professeur.cours }, 
      actif: true 
    }).select('-motDePasse'); // Exclure le mot de passe

    res.json(etudiants);
  } catch (err) {
    console.error('Erreur lors de la récupération des étudiants:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});
// Route pour mettre à jour l'autorisation d'un étudiant
app.put('/api/etudiants/:id/autorisation', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { autorise } = req.body;

    if (typeof autorise !== 'boolean') {
      return res.status(400).json({ 
        message: 'Le champ autorise doit être un booléen' 
      });
    }

    const etudiant = await Etudiant.findByIdAndUpdate(
      id,
      { autorise },
      { new: true }
    ).select('-motDePasse');

    if (!etudiant) {
      return res.status(404).json({ 
        message: 'Étudiant non trouvé' 
      });
    }

    res.json({
      message: `Étudiant ${autorise ? 'autorisé' : 'non autorisé'} avec succès`,
      etudiant
    });

  } catch (err) {
    console.error('Erreur lors de la mise à jour de l\'autorisation:', err);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});










// ✅ Obtenir un seul étudiant
// Lister tous les étudiants (Admin OU Inscripteur)
app.get('/api/etudiants', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiants = await Etudiant.find()
      .select('-motDePasse') // Masquer le mot de passe
      .populate('creeParAdmin', 'nom email')
      .populate('creeParInscripteur', 'nom email')
      .sort({ createdAt: -1 });
    
    res.json(etudiants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour que les professeurs récupèrent leurs étudiants
app.get('/api/professeur/etudiants', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    // Récupérer les étudiants qui ont au moins un cours en commun avec ce professeur
    const etudiants = await Etudiant.find({
      cours: { $in: professeur.cours },
      actif: true
    }).select('-motDePasse'); // Exclure le mot de passe

    res.json(etudiants);
  } catch (err) {
    console.error('Erreur lors de la récupération des étudiants:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});// Route pour que les professeurs récupèrent leurs étudiants

// Obtenir un étudiant spécifique (Admin OU Inscripteur)
app.get('/api/etudiants/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id)
      .populate('creeParAdmin', 'nom email')
      .populate('creeParInscripteur', 'nom email');
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    res.json(etudiant);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.post('/api/evenements', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { titre, description, dateDebut, dateFin, type } = req.body;

    const evenement = new Evenement({
      titre,
      description,
      dateDebut: new Date(dateDebut),
      dateFin: dateFin ? new Date(dateFin) : new Date(dateDebut),
      type,
      creePar: req.adminId
    });

    await evenement.save();
    res.status(201).json(evenement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/evenements', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const evenements = await Evenement.find().sort({ dateDebut: 1 });
    res.json(evenements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Route pour modifier un événement
app.put('/api/evenements/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { titre, description, dateDebut, dateFin, type } = req.body;
    
    // Vérifier que l'événement existe
    const evenement = await Evenement.findById(req.params.id);
    if (!evenement) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Préparer les données de mise à jour
    const updateData = {
      titre,
      description,
      dateDebut: new Date(dateDebut),
      dateFin: dateFin ? new Date(dateFin) : new Date(dateDebut),
      type
    };

    // Mettre à jour l'événement
    const evenementModifie = await Evenement.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );

    console.log('✅ Événement modifié:', evenementModifie);
    res.json(evenementModifie);
    
  } catch (err) {
    console.error('❌ Erreur lors de la modification:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la modification de l\'événement',
      error: err.message 
    });
  }
});

// ✅ Route pour supprimer un événement
app.delete('/api/evenements/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    // Vérifier que l'événement existe
    const evenement = await Evenement.findById(req.params.id);
    if (!evenement) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Supprimer l'événement
    await Evenement.findByIdAndDelete(req.params.id);
    
    console.log('✅ Événement supprimé avec l\'ID:', req.params.id);
    res.json({ 
      message: 'Événement supprimé avec succès',
      evenementSupprime: {
        id: evenement._id,
        titre: evenement.titre
      }
    });
    
  } catch (err) {
    console.error('❌ Erreur lors de la suppression:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression de l\'événement',
      error: err.message 
    });
  }
});

// ✅ Route pour obtenir un seul événement (optionnel - pour les détails)
app.get('/api/evenements/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const evenement = await Evenement.findById(req.params.id).populate('creePar', 'nom email');
    
    if (!evenement) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    res.json(evenement);
    
  } catch (err) {
    console.error('❌ Erreur lors de la récupération:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de l\'événement',
      error: err.message 
    });
  }
});


app.get('/api/professeur/presences', authProfesseur, async (req, res) => {
  const data = await Presence.find({ creePar: req.professeurId }).populate('etudiant', 'nomComplet');
  res.json(data);
});
// ===== DANS VOTRE app.js =====
// Remplacez votre route GET /api/presences existante par celle-ci :

app.get('/api/presences', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const data = await Presence.find()
      .populate({
        path: 'etudiant',
        select: 'nomComplet telephoneMere telephonePere email codeMassar'
      })
      .lean(); // Utiliser lean() pour de meilleures performances

    res.json(data);
  } catch (err) {
    console.error('Erreur récupération présences:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== NOUVELLE ROUTE POUR STATISTIQUES ÉTUDIANT =====
// Ajoutez cette nouvelle route dans app.js :

app.get('/api/presences/stats/:etudiantId', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { etudiantId } = req.params;
    
    const allPresences = await Presence.find({ etudiant: etudiantId });
    
    const stats = {
      totalSessions: allPresences.length,
      nbAbsences: allPresences.filter(p => !p.present).length,
      nbRetards: allPresences.filter(p => p.present && p.retardMinutes > 0).length,
      nbPresences: allPresences.filter(p => p.present && p.retardMinutes === 0).length,
      tauxPresence: allPresences.length > 0 
        ? Math.round((allPresences.filter(p => p.present).length / allPresences.length) * 100) 
        : 0
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Erreur calcul stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== NOUVELLE ROUTE POUR EXPORT OPTIMISÉ =====
// Ajoutez cette nouvelle route dans app.js :

app.get('/api/presences/export-data', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { date, professeur, periode } = req.query;
    
    // Construire le filtre
    const filter = {};
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.dateSession = { $gte: startDate, $lte: endDate };
    }
    if (professeur) filter.nomProfesseur = professeur;
    if (periode && periode !== 'all') filter.periode = periode;
    
    // Récupérer les données avec statistiques
    const presences = await Presence.find(filter)
      .populate({
        path: 'etudiant',
        select: 'nomComplet telephoneMere telephonePere email codeMassar'
      })
      .lean();
    
    // Calculer les statistiques pour chaque étudiant unique
    const etudiantsIds = [...new Set(presences.map(p => p.etudiant?._id?.toString()))];
    const statsMap = {};
    
    for (const etudiantId of etudiantsIds) {
      const etudiantPresences = await Presence.find({ etudiant: etudiantId });
      statsMap[etudiantId] = {
        nbAbsences: etudiantPresences.filter(p => !p.present).length,
        nbRetards: etudiantPresences.filter(p => p.present && p.retardMinutes > 0).length
      };
    }
    
    // Enrichir les données
    const enrichedData = presences.map(p => ({
      ...p,
      stats: statsMap[p.etudiant?._id?.toString()] || { nbAbsences: 0, nbRetards: 0 }
    }));
    
    res.json(enrichedData);
  } catch (err) {
    console.error('Erreur export data:', err);
    res.status(500).json({ error: err.message });
  }
});
// middleware: authProfesseur يجب أن تتأكد أنك تستعمل
app.get('/api/professeur/etudiants', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Pas de professeur' });
    }

    const etudiants = await Etudiant.find({
      cours: { $in: professeur.cours },
      actif: true
    }).select('-email -motDePasse'); // ✅ exclure les champs sensibles

    res.json(etudiants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
// ==================== ROUTES INSCRIPTEURS (Admin seulement) ====================

// CREATE - Créer un inscripteur
app.post('/api/admin/inscripteurs', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { nom, email, motDePasse, telephone } = req.body;

    // Validation des champs requis
    if (!nom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Format d\'email invalide' });
    }

    // Validation mot de passe
    if (motDePasse.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier si l'email existe déjà (tous modèles confondus)
    const [inscripteurExiste, adminExiste] = await Promise.all([
      Inscripteur.findOne({ email: email.toLowerCase().trim() }),
      Admin.findOne({ email: email.toLowerCase().trim() })
    ]);

    if (inscripteurExiste || adminExiste) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashed = await bcrypt.hash(motDePasse, 12);
    
    const inscripteur = new Inscripteur({
      nom: nom.trim(),
      email: email.toLowerCase().trim(),
      telephone: telephone?.trim() || '',
      motDePasse: hashed,
      creeParAdmin: req.adminId
    });

    await inscripteur.save();
    
    // Retourner sans le mot de passe
    const inscripteurResponse = inscripteur.toObject();
    delete inscripteurResponse.motDePasse;

    res.status(201).json({ 
      message: 'Inscripteur créé avec succès', 
      inscripteur: inscripteurResponse 
    });
  } catch (err) {
    console.error('Erreur création inscripteur:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }
    
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// READ - Lister tous les inscripteurs avec pagination
app.get('/api/admin/inscripteurs', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, actif } = req.query;
    
    // Construire le filtre de recherche
    let filter = {};
    
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (actif !== undefined) {
      filter.actif = actif === 'true';
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [inscripteurs, total] = await Promise.all([
      Inscripteur.find(filter)
        .select('-motDePasse')
        .populate('creeParAdmin', 'nom email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Inscripteur.countDocuments(filter)
    ]);
    
    res.json({
      inscripteurs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Erreur liste inscripteurs:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// READ - Obtenir un inscripteur spécifique
app.get('/api/admin/inscripteurs/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID d\'inscripteur invalide' });
    }
    
    const inscripteur = await Inscripteur.findById(id)
      .select('-motDePasse')
      .populate('creeParAdmin', 'nom email');
    
    if (!inscripteur) {
      return res.status(404).json({ message: 'Inscripteur introuvable' });
    }
    
    res.json(inscripteur);
  } catch (err) {
    console.error('Erreur récupération inscripteur:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// UPDATE - Modifier un inscripteur
app.put('/api/admin/inscripteurs/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, motDePasse, telephone, actif } = req.body;
    
    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID d\'inscripteur invalide' });
    }
    
    // Vérifier que l'inscripteur existe
    const inscripteurExistant = await Inscripteur.findById(id);
    if (!inscripteurExistant) {
      return res.status(404).json({ message: 'Inscripteur introuvable' });
    }
    
    // Préparer les mises à jour
    const updates = {};
    
    if (nom && nom.trim() !== inscripteurExistant.nom) {
      updates.nom = nom.trim();
    }
    
    if (email && email.trim() !== inscripteurExistant.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: 'Format d\'email invalide' });
      }
      
      // Vérifier unicité de l'email
      const [inscripteurEmail, adminEmail] = await Promise.all([
        Inscripteur.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } }),
        Admin.findOne({ email: email.toLowerCase().trim() })
      ]);
      
      if (inscripteurEmail || adminEmail) {
        return res.status(400).json({ message: 'Email déjà utilisé' });
      }
      
      updates.email = email.toLowerCase().trim();
    }
    
    if (telephone !== undefined) {
      updates.telephone = telephone?.trim() || '';
    }
    
    if (typeof actif !== 'undefined') {
      updates.actif = Boolean(actif);
    }
    
    // Gestion du mot de passe
    if (motDePasse && motDePasse.trim() !== '') {
      if (motDePasse.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
      }
      
      updates.motDePasse = await bcrypt.hash(motDePasse, 12);
    }
    
    // Vérifier qu'il y a des modifications
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Aucune modification détectée' });
    }
    
    // Mettre à jour
    const inscripteurModifie = await Inscripteur.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-motDePasse').populate('creeParAdmin', 'nom email');
    
    res.json({
      message: 'Inscripteur modifié avec succès',
      inscripteur: inscripteurModifie,
      champsModifies: Object.keys(updates)
    });
    
  } catch (err) {
    console.error('Erreur modification inscripteur:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }
    
    res.status(500).json({ 
      message: 'Erreur serveur lors de la modification',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PATCH - Activer/Désactiver un inscripteur
app.patch('/api/admin/inscripteurs/:id/toggle', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID d\'inscripteur invalide' });
    }
    
    const inscripteur = await Inscripteur.findById(id);
    if (!inscripteur) {
      return res.status(404).json({ message: 'Inscripteur introuvable' });
    }
    
    // Inverser le statut actif
    inscripteur.actif = !inscripteur.actif;
    inscripteur.updatedAt = new Date();
    await inscripteur.save();
    
    const response = inscripteur.toObject();
    delete response.motDePasse;
    
    res.json({
      message: `Inscripteur ${inscripteur.actif ? 'activé' : 'désactivé'} avec succès`,
      inscripteur: response
    });
  } catch (err) {
    console.error('Erreur toggle inscripteur:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors du changement de statut',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// DELETE - Supprimer un inscripteur
app.delete('/api/admin/inscripteurs/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID d\'inscripteur invalide' });
    }
    
    const inscripteur = await Inscripteur.findById(id);
    if (!inscripteur) {
      return res.status(404).json({ message: 'Inscripteur introuvable' });
    }
    
    // Vérifier s'il a créé des étudiants ou professeurs
    const [etudiantsCount, professeursCount] = await Promise.all([
      Etudiant.countDocuments({ creeParInscripteur: id }),
      Professeur.countDocuments({ creeParInscripteur: id })
    ]);
    
    // Optionnel : empêcher la suppression s'il a des créations
    if (etudiantsCount > 0 || professeursCount > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer: cet inscripteur a créé ${etudiantsCount} étudiant(s) et ${professeursCount} professeur(s)`,
        details: {
          etudiants: etudiantsCount,
          professeurs: professeursCount
        }
      });
    }
    
    // Supprimer l'inscripteur
    await Inscripteur.findByIdAndDelete(id);
    
    res.json({
      message: 'Inscripteur supprimé avec succès',
      inscripteurSupprime: {
        id: inscripteur._id,
        nom: inscripteur.nom,
        email: inscripteur.email
      }
    });
    
  } catch (err) {
    console.error('Erreur suppression inscripteur:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PATCH - Réinitialiser le mot de passe d'un inscripteur
app.patch('/api/admin/inscripteurs/:id/reset-password', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { nouveauMotDePasse } = req.body;
    
    // Validation
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }
    
    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID d\'inscripteur invalide' });
    }
    
    const inscripteur = await Inscripteur.findById(id);
    if (!inscripteur) {
      return res.status(404).json({ message: 'Inscripteur introuvable' });
    }
    
    // Hasher le nouveau mot de passe
    const hashed = await bcrypt.hash(nouveauMotDePasse, 12);
    
    inscripteur.motDePasse = hashed;
    inscripteur.updatedAt = new Date();
    await inscripteur.save();
    
    res.json({
      message: 'Mot de passe réinitialisé avec succès',
      inscripteurId: inscripteur._id,
      nom: inscripteur.nom
    });
    
  } catch (err) {
    console.error('Erreur reset password:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la réinitialisation',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET - Statistiques des inscripteurs (optionnel)
app.get('/api/admin/inscripteurs-stats', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const [
      totalInscripteurs,
      inscripteursActifs,
      inscripteursInactifs,
      etudiantsParInscripteur,
      professeursParInscripteur
    ] = await Promise.all([
      Inscripteur.countDocuments(),
      Inscripteur.countDocuments({ actif: true }),
      Inscripteur.countDocuments({ actif: false }),
      Etudiant.aggregate([
        { $match: { creeParInscripteur: { $exists: true, $ne: null } } },
        { $group: { _id: '$creeParInscripteur', count: { $sum: 1 } } }
      ]),
      Professeur.aggregate([
        { $match: { creeParInscripteur: { $exists: true, $ne: null } } },
        { $group: { _id: '$creeParInscripteur', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      totalInscripteurs,
      inscripteursActifs,
      inscripteursInactifs,
      activite: {
        etudiantsParInscripteur: etudiantsParInscripteur.length,
        professeursParInscripteur: professeursParInscripteur.length,
        totalCreations: etudiantsParInscripteur.reduce((sum, item) => sum + item.count, 0) +
                       professeursParInscripteur.reduce((sum, item) => sum + item.count, 0)
      }
    });
  } catch (err) {
    console.error('Erreur stats inscripteurs:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors du calcul des statistiques',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 📁 routes/professeur.js أو ضمن app.js إذا كل شيء في ملف واحد
app.get('/api/professeur/presences', authProfesseur, async (req, res) => {
  try {
    const data = await Presence.find({ creePar: req.professeurId })
      .populate('etudiant', 'nomComplet telephone')
      .sort({ dateSession: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/professeur/absences', authProfesseur, async (req, res) => {
  try {
    const absences = await Presence.find({
      creePar: req.professeurId,
      present: false
    }).populate('etudiant', 'nomComplet telephone');

    res.json(absences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ==================== BULLETINS ====================








// 📌 Récupérer un bulletin spécifique
app.get('/api/bulletins/:id', authProfesseur, async (req, res) => {
  try {
    const bulletin = await Bulletin.findById(req.params.id)
      .populate('etudiant', 'nomDeFamille prenom nomComplet email')
      .populate('professeur', 'nom prenom email');

    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    // Vérifier que le professeur est bien celui qui a créé le bulletin
    if (bulletin.professeur._id.toString() !== req.professeurId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json(bulletin);
  } catch (err) {
    console.error('Erreur récupération bulletin:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Mettre à jour un bulletin
app.put('/api/bulletins/:id', authProfesseur, async (req, res) => {
  try {
    const { noteFinale, remarque, semestre } = req.body;

    const bulletin = await Bulletin.findById(req.params.id);

    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    // Vérifier que le professeur est bien celui qui a créé le bulletin
    if (bulletin.professeur.toString() !== req.professeurId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Mettre à jour les champs
    if (noteFinale !== undefined) {
      if (noteFinale < 0 || noteFinale > 20) {
        return res.status(400).json({ message: 'La note doit être entre 0 et 20' });
      }
      bulletin.noteFinale = noteFinale;
    }
    
    if (remarque !== undefined) bulletin.remarque = remarque;
    if (semestre) bulletin.semestre = semestre;

    await bulletin.save();

    const bulletinUpdated = await Bulletin.findById(bulletin._id)
      .populate('etudiant', 'nomDeFamille prenom nomComplet email')
      .populate('professeur', 'nom prenom email');

    res.json(bulletinUpdated);
  } catch (err) {
    console.error('Erreur mise à jour bulletin:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Supprimer un bulletin
app.delete('/api/bulletins/:id', authProfesseur, async (req, res) => {
  try {
    const bulletin = await Bulletin.findById(req.params.id);

    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin non trouvé' });
    }

    // Vérifier que le professeur est bien celui qui a créé le bulletin
    if (bulletin.professeur.toString() !== req.professeurId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await Bulletin.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bulletin supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression bulletin:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer les cours d'un professeur
app.get('/api/professeur/mes-cours', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    // Chercher les cours où ce professeur enseigne
    const cours = await Cours.find({ 
      professeur: { $in: [professeur.nom, professeur._id] }
    });

    res.json(cours);
  } catch (err) {
    console.error('Erreur récupération cours:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer les étudiants d'un professeur
app.get('/api/professeur/etudiants', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    // Récupérer les cours du professeur
    const cours = await Cours.find({ 
      professeur: { $in: [professeur.nom, professeur._id] }
    });

    const nomsDesCours = cours.map(c => c.nom);

    // Récupérer les étudiants inscrits à ces cours
    const etudiants = await Etudiant.find({
      cours: { $in: nomsDesCours }
    }).select('nomDeFamille prenom nomComplet email cours');

    res.json(etudiants);
  } catch (err) {
    console.error('Erreur récupération étudiants:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer tous les bulletins (Admin)
app.get('/api/bulletins', authAdmin, async (req, res) => {
  try {
    const bulletins = await Bulletin.find()
      .populate('etudiant', 'nomDeFamille prenom nomComplet email cours')
      .populate('professeur', 'nom nomComplet email matiere')  // ✅ Ajout de 'matiere'
      .sort({ createdAt: -1 });

    res.json(bulletins);
  } catch (err) {
    console.error('Erreur récupération bulletins admin:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Récupérer les statistiques des bulletins (Admin)
app.get('/api/bulletins/stats', authAdmin, async (req, res) => {
  try {
    const totalBulletins = await Bulletin.countDocuments();
    const bulletinsParSemestre = await Bulletin.aggregate([
      {
        $group: {
          _id: '$semestre',
          count: { $sum: 1 },
          moyenneGenerale: { $avg: '$noteFinale' }
        }
      }
    ]);

    res.json({
      total: totalBulletins,
      parSemestre: bulletinsParSemestre
    });
  } catch (err) {
    console.error('Erreur statistiques:', err);
    res.status(500).json({ error: err.message });
  }
});
// ✅ فقط الكورسات التي يدرسها هذا الأستاذ
app.get('/api/professeur/mes-cours', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) return res.status(404).json({ message: 'Professeur non trouvé' });

    // جلب الكورسات التي عنده فقط
    const cours = await Cours.find({ professeur: professeur.nom }); // أو _id إذا كنت تستخدم ObjectId
    res.json(cours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.get('/api/debug/notifications', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const aujourdHui = new Date();
    const debutMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1);
    const finMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth() + 1, 0);

    // Étudiant spécifique
    const etudiantId = "685dd93cdb5dd547333fe5bb";
    const etudiant = await Etudiant.findById(etudiantId);
    
    // Ses présences ce mois
    const presences = await Presence.find({
      etudiant: etudiantId,
      dateSession: { $gte: debutMois, $lte: finMois }
    });

    // Ses absences ce mois
    const absences = presences.filter(p => !p.present);

    res.json({
      etudiant: {
        nom: etudiant.nomComplet,
        actif: etudiant.actif,
        cours: etudiant.cours
      },
      periode: {
        debut: debutMois,
        fin: finMois
      },
      presences: {
        total: presences.length,
        presents: presences.filter(p => p.present).length,
        absents: absences.length,
        details: absences.map(p => ({
          date: p.dateSession,
          cours: p.cours,
          present: p.present
        }))
      },
      shouldTriggerNotification: absences.length >= 3
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route pour les statistiques du dashboard
app.get('/api/dashboard/stats', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const aujourdHui = new Date();
    
    // Compter les étudiants actifs
    const etudiantsActifs = await Etudiant.countDocuments({ actif: true });
    
    // Compter les cours
    const totalCours = await Cours.countDocuments();
    
    // Paiements expirés ce mois
    const debutMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1);
    const paiementsExpiresCount = await Paiement.aggregate([
      {
        $addFields: {
          dateFin: {
            $dateAdd: {
              startDate: "$moisDebut",
              unit: "month",
              amount: "$nombreMois"
            }
          }
        }
      },
      {
        $match: {
          dateFin: { $lt: aujourdHui }
        }
      },
      {
        $count: "total"
      }
    ]);
    
    // Événements cette semaine
    const finSemaine = new Date();
    finSemaine.setDate(finSemaine.getDate() + 7);
    const evenementsSemaine = await Evenement.countDocuments({
      dateDebut: { $gte: aujourdHui, $lte: finSemaine }
    });

    // Absences cette semaine
    const debutSemaine = new Date();
    debutSemaine.setDate(debutSemaine.getDate() - 7);
    const absencesSemaine = await Presence.countDocuments({
      dateSession: { $gte: debutSemaine, $lte: aujourdHui },
      present: false
    });

    res.json({
      etudiantsActifs,
      totalCours,
      paiementsExpires: paiementsExpiresCount[0]?.total || 0,
      evenementsSemaine,
      absencesSemaine,
      timestamp: new Date()
    });

  } catch (err) {
    console.error('❌ Erreur stats dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

const fonts = {
  Amiri: {
    normal: path.join(__dirname, 'fonts', 'Amiri-Regular.ttf'),
    bold: path.join(__dirname, 'fonts', 'Amiri-Bold.ttf'),
    italics: path.join(__dirname, 'fonts', 'Amiri-Regular.ttf'),
    bolditalics: path.join(__dirname, 'fonts', 'Amiri-Bold.ttf')
  }
};

const printer = new pdfMake(fonts);

// ============================================
// ROUTE PROFESSEUR - Générer PDF
// ============================================


// ============================================
// ROUTE PROFESSEUR - PDF UNE SEULE PAGE
// ============================================
app.get('/api/rapports/professeur/rapports/:id/pdf', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    const rapport = await Rapport.findById(req.params.id)
      .populate('professeur', 'nom prenom email')
      .populate('etudiant', 'nomComplet email niveau anneeScolaire image');

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    if (rapport.professeur._id.toString() !== req.professeurId.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    let logoBase64 = null;
    let photoBase64 = null;

    const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'images', 'logo-ecole.jpg');
    if (fs.existsSync(logoPath)) {
      logoBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(logoPath).toString('base64');
    }

    if (rapport.etudiant && rapport.etudiant.image) {
      const photoPath = path.join(__dirname, '..', 'frontend', 'public', rapport.etudiant.image);
      if (fs.existsSync(photoPath)) {
        const ext = path.extname(photoPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        photoBase64 = `data:${mime};base64,` + fs.readFileSync(photoPath).toString('base64');
      }
    }

    // ✅ SYMBOLES UNIVERSELS - Compatible avec toutes les polices
    const natureProbleme = rapport.natureProbleme || [];
    const mesurePrise = rapport.mesurePrise || [];

    // Problèmes - Vérification exacte avec symboles [X] et [ ]
    const prob1 = natureProbleme.includes('Devoirs non faits') ? '[X]' : '[ ]';
    const prob2 = natureProbleme.includes('Indiscipline en classe') ? '[X]' : '[ ]';
    const prob3 = natureProbleme.includes('Bavardage excessif') ? '[X]' : '[ ]';
    const prob4 = natureProbleme.includes("Refus d'obéir") || natureProbleme.includes("Refus d'obeir") ? '[X]' : '[ ]';
    const prob5 = natureProbleme.includes('Violence verbale / physique') || natureProbleme.includes('Violence verbale/physique') ? '[X]' : '[ ]';
    const prob6 = natureProbleme.includes('Retard ou absence répétée') || natureProbleme.includes('Retard ou absence repetee') ? '[X]' : '[ ]';
    const prob7 = natureProbleme.includes('Autre') ? '[X]' : '[ ]';

    // Mesures - Vérification exacte avec symboles [X] et [ ]
    const mes1 = mesurePrise.includes('Observation / remarque orale') || mesurePrise.includes('Observation/remarque orale') ? '[X]' : '[ ]';
    const mes2 = mesurePrise.includes('Avertissement écrit') || mesurePrise.includes('Avertissement ecrit') ? '[X]' : '[ ]';
    const mes3 = mesurePrise.includes('Élève exclu temporairement du cours') || mesurePrise.includes('Eleve exclu temporairement du cours') || mesurePrise.includes('Élève exclu temporairement') ? '[X]' : '[ ]';
    const mes4 = mesurePrise.includes('Communication avec les parents') || mesurePrise.includes('Communication avec parents') ? '[X]' : '[ ]';
    const mes5 = mesurePrise.includes('Autre') ? '[X]' : '[ ]';

    console.log('=== VÉRIFICATION CHECKBOXES (Professeur) ===');
    console.log('prob1 (Devoirs):', prob1);
    console.log('prob7 (Autre):', prob7);
    console.log('mes2 (Avertissement):', mes2);
    console.log('==========================================');

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [30, 25, 30, 25],
      defaultStyle: { font: 'Amiri', fontSize: 10 },
      content: [
        // EN-TÊTE
        {
          columns: [
            logoBase64 ? { image: logoBase64, width: 75, height: 75 } : { text: '', width: 75 },
            {
              stack: [
                { text: 'Rapport d\'observation', fontSize: 16, bold: true, alignment: 'center', margin: [0, 12, 0, 3] },
                { text: 'Comportement des élèves', fontSize: 11, alignment: 'center' }
              ],
              width: '*'
            },
            photoBase64 ? { image: photoBase64, width: 55, height: 70 } : { text: '', width: 55 }
          ],
          margin: [0, 0, 0, 15]
        },

        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, lineColor: '#666' }], margin: [0, 0, 0, 12] },

        {
          columns: [
            { text: [{ text: 'Année scolaire : ', bold: true }, rapport.anneeScolaire || '2025/2026'], width: '50%' },
            { text: [{ text: 'Niveau/Classe : ', bold: true }, rapport.niveau || '...........'], width: '50%' }
          ], margin: [0, 0, 0, 8]
        },
        {
          columns: [
            { text: [{ text: 'Élève : ', bold: true }, rapport.etudiant?.nomComplet || ''], width: '50%' },
            { text: [{ text: 'Date : ', bold: true }, new Date(rapport.date).toLocaleDateString('fr-FR')], width: '50%' }
          ], margin: [0, 0, 0, 8]
        },
        { text: [{ text: 'Professeur : ', bold: true }, `${rapport.professeur?.prenom || ''} ${rapport.professeur?.nom || ''}`], margin: [0, 0, 0, 15] },

        // NATURE PROBLÈME
        { text: 'Nature du problème observé :', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
        {
          columns: [
            { stack: [
              { text: prob1 + ' Devoirs non faits', margin: [8, 0, 0, 4] },
              { text: prob2 + ' Indiscipline en classe', margin: [8, 0, 0, 4] },
              { text: prob3 + ' Bavardage excessif', margin: [8, 0, 0, 4] },
              { text: prob4 + ' Refus d\'obéir', margin: [8, 0, 0, 4] }
            ], width: '50%' },
            { stack: [
              { text: prob5 + ' Violence verbale/physique', margin: [8, 0, 0, 4] },
              { text: prob6 + ' Retard/absence répétée', margin: [8, 0, 0, 4] },
              { text: prob7 + ' Autre' + (rapport.autreProbleme ? ': ' + rapport.autreProbleme : ''), margin: [8, 0, 0, 4] }
            ], width: '50%' }
          ], margin: [0, 0, 0, 12]
        },

        // DESCRIPTION
        { text: "Description de l'incident :", bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          table: { widths: ['*'], heights: [55], body: [[{ text: rapport.descriptionIncident || '', fontSize: 9, margin: [5, 5, 5, 5] }]] },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000', vLineColor: () => '#000' },
          margin: [0, 0, 0, 12]
        },

        // MESURES
        { text: 'Mesure prise par le professeur :', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
        {
          columns: [
            { stack: [
              { text: mes1 + ' Observation/remarque orale', margin: [8, 0, 0, 4] },
              { text: mes2 + ' Avertissement écrit', margin: [8, 0, 0, 4] },
              { text: mes3 + ' Élève exclu temporairement', margin: [8, 0, 0, 4] }
            ], width: '50%' },
            { stack: [
              { text: mes4 + ' Communication avec parents', margin: [8, 0, 0, 4] },
              { text: mes5 + ' Autre' + (rapport.autreMesure ? ': ' + rapport.autreMesure : ''), margin: [8, 0, 0, 4] }
            ], width: '50%' }
          ], margin: [0, 0, 0, 12]
        },

        // OBSERVATIONS
        { text: 'Observation du professeur :', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          table: { widths: ['*'], heights: [45], body: [[{ text: rapport.observationProfesseur || '', fontSize: 9, margin: [5, 5, 5, 5] }]] },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000', vLineColor: () => '#000' },
          margin: [0, 0, 0, 20]
        },

        // SIGNATURES
        {
          columns: [
            { stack: [{ text: 'Signature du professeur :', bold: true }, { text: '\n.....................................' }], width: '50%' },
            { stack: [
              { text: 'Visa de la direction :', bold: true, alignment: 'right' },
              { text: rapport.visaDirection ? '\nApposé le ' + new Date(rapport.dateVisa).toLocaleDateString('fr-FR') : '\n.....................................', alignment: 'right' }
            ], width: '50%' }
          ]
        }
      ]
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_' + rapport._id + '.pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (err) {
    console.error('Erreur PDF:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ============================================
// ROUTE ADMIN - PDF UNE SEULE PAGE
// ============================================
app.post('/api/rapports/admin/rapports/:id/generate-pdf', authAdmin, async (req, res) => {
  try {
    const rapport = await Rapport.findById(req.params.id)
      .populate('professeur', 'nom prenom email')
      .populate('etudiant', 'nomComplet email niveau anneeScolaire image');

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    let logoBase64 = null;
    let photoBase64 = null;

    const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'images', 'logo-ecole.jpg');
    if (fs.existsSync(logoPath)) {
      logoBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(logoPath).toString('base64');
    }

    if (rapport.etudiant && rapport.etudiant.image) {
      const photoPath = path.join(__dirname, '..', 'frontend', 'public', rapport.etudiant.image);
      if (fs.existsSync(photoPath)) {
        const ext = path.extname(photoPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        photoBase64 = `data:${mime};base64,` + fs.readFileSync(photoPath).toString('base64');
      }
    }

    const nomProf = rapport.professeur ? (rapport.professeur.prenom || '') + ' ' + (rapport.professeur.nom || '') : 'Non renseigné';

    // ✅ SYMBOLES UNIVERSELS - Compatible avec toutes les polices
    const natureProbleme = rapport.natureProbleme || [];
    const mesurePrise = rapport.mesurePrise || [];

    // Problèmes - Vérification exacte avec symboles [X] et [ ]
    const prob1 = natureProbleme.includes('Devoirs non faits') ? '[X]' : '[ ]';
    const prob2 = natureProbleme.includes('Indiscipline en classe') ? '[X]' : '[ ]';
    const prob3 = natureProbleme.includes('Bavardage excessif') ? '[X]' : '[ ]';
    const prob4 = natureProbleme.includes("Refus d'obéir") || natureProbleme.includes("Refus d'obeir") ? '[X]' : '[ ]';
    const prob5 = natureProbleme.includes('Violence verbale / physique') || natureProbleme.includes('Violence verbale/physique') ? '[X]' : '[ ]';
    const prob6 = natureProbleme.includes('Retard ou absence répétée') || natureProbleme.includes('Retard ou absence repetee') ? '[X]' : '[ ]';
    const prob7 = natureProbleme.includes('Autre') ? '[X]' : '[ ]';

    // Mesures - Vérification exacte avec symboles [X] et [ ]
    const mes1 = mesurePrise.includes('Observation / remarque orale') || mesurePrise.includes('Observation/remarque orale') ? '[X]' : '[ ]';
    const mes2 = mesurePrise.includes('Avertissement écrit') || mesurePrise.includes('Avertissement ecrit') ? '[X]' : '[ ]';
    const mes3 = mesurePrise.includes('Élève exclu temporairement du cours') || mesurePrise.includes('Eleve exclu temporairement du cours') || mesurePrise.includes('Élève exclu temporairement') ? '[X]' : '[ ]';
    const mes4 = mesurePrise.includes('Communication avec les parents') || mesurePrise.includes('Communication avec parents') ? '[X]' : '[ ]';
    const mes5 = mesurePrise.includes('Autre') ? '[X]' : '[ ]';

    console.log('=== VÉRIFICATION CHECKBOXES (Admin) ===');
    console.log('prob1 (Devoirs non faits):', prob1);
    console.log('prob7 (Autre):', prob7);
    console.log('mes2 (Avertissement écrit):', mes2);
    console.log('=======================================');

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [30, 25, 30, 25],
      defaultStyle: { font: 'Amiri', fontSize: 10 },
      content: [
        // EN-TÊTE
        {
          columns: [
            logoBase64 ? { image: logoBase64, width: 75, height: 75 } : { text: '', width: 75 },
            {
              stack: [
                { text: 'Rapport d\'observation', fontSize: 16, bold: true, alignment: 'center', margin: [0, 12, 0, 3] },
                { text: 'Comportement des élèves', fontSize: 11, alignment: 'center' }
              ],
              width: '*'
            },
            photoBase64 ? { image: photoBase64, width: 55, height: 70 } : { text: '', width: 55 }
          ],
          margin: [0, 0, 0, 15]
        },

        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, lineColor: '#666' }], margin: [0, 0, 0, 12] },

        {
          columns: [
            { text: [{ text: 'Année scolaire : ', bold: true }, rapport.anneeScolaire || '2025/2026'], width: '50%' },
            { text: [{ text: 'Niveau/Classe : ', bold: true }, rapport.niveau || '...........'], width: '50%' }
          ], margin: [0, 0, 0, 8]
        },
        {
          columns: [
            { text: [{ text: 'Élève : ', bold: true }, rapport.etudiant?.nomComplet || ''], width: '50%' },
            { text: [{ text: 'Date : ', bold: true }, new Date(rapport.date).toLocaleDateString('fr-FR')], width: '50%' }
          ], margin: [0, 0, 0, 8]
        },
        { text: [{ text: 'Professeur : ', bold: true }, nomProf.trim()], margin: [0, 0, 0, 15] },

        // NATURE PROBLÈME
        { text: 'Nature du problème observé :', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
        {
          columns: [
            { stack: [
              { text: prob1 + ' Devoirs non faits', margin: [8, 0, 0, 4] },
              { text: prob2 + ' Indiscipline en classe', margin: [8, 0, 0, 4] },
              { text: prob3 + ' Bavardage excessif', margin: [8, 0, 0, 4] },
              { text: prob4 + ' Refus d\'obéir', margin: [8, 0, 0, 4] }
            ], width: '50%' },
            { stack: [
              { text: prob5 + ' Violence verbale/physique', margin: [8, 0, 0, 4] },
              { text: prob6 + ' Retard/absence répétée', margin: [8, 0, 0, 4] },
              { text: prob7 + ' Autre' + (rapport.autreProbleme ? ': ' + rapport.autreProbleme : ''), margin: [8, 0, 0, 4] }
            ], width: '50%' }
          ], margin: [0, 0, 0, 12]
        },

        // DESCRIPTION
        { text: "Description de l'incident :", bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          table: { widths: ['*'], heights: [55], body: [[{ text: rapport.descriptionIncident || '', fontSize: 9, margin: [5, 5, 5, 5] }]] },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000', vLineColor: () => '#000' },
          margin: [0, 0, 0, 12]
        },

        // MESURES
        { text: 'Mesure prise par le professeur :', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
        {
          columns: [
            { stack: [
              { text: mes1 + ' Observation/remarque orale', margin: [8, 0, 0, 4] },
              { text: mes2 + ' Avertissement écrit', margin: [8, 0, 0, 4] },
              { text: mes3 + ' Élève exclu temporairement', margin: [8, 0, 0, 4] }
            ], width: '50%' },
            { stack: [
              { text: mes4 + ' Communication avec parents', margin: [8, 0, 0, 4] },
              { text: mes5 + ' Autre' + (rapport.autreMesure ? ': ' + rapport.autreMesure : ''), margin: [8, 0, 0, 4] }
            ], width: '50%' }
          ], margin: [0, 0, 0, 12]
        },

        // OBSERVATIONS
        { text: 'Observation du professeur :', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          table: { widths: ['*'], heights: [45], body: [[{ text: rapport.observationProfesseur || '', fontSize: 9, margin: [5, 5, 5, 5] }]] },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000', vLineColor: () => '#000' },
          margin: [0, 0, 0, 20]
        },

        // SIGNATURES
        {
          columns: [
            { stack: [{ text: 'Signature du professeur :', bold: true }, { text: '\n.....................................' }], width: '50%' },
            { stack: [
              { text: 'Visa de la direction :', bold: true, alignment: 'right' },
              { text: rapport.visaDirection ? '\nApposé le ' + new Date(rapport.dateVisa).toLocaleDateString('fr-FR') : '\n.....................................', alignment: 'right' }
            ], width: '50%' }
          ]
        }
      ]
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_' + rapport._id + '.pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (err) {
    console.error('Erreur PDF:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});
// ✅ Route pour marquer une notification comme lue (optionnel)
app.post('/api/notifications/:id/mark-read', authAdminOrInscripteurOrPaiementManager, (req, res) => {
  // Dans une vraie application, vous stockeriez l'état "lu" en base
  // Pour l'instant, on retourne juste un succès
  res.json({ message: 'Notification marquée comme lue', id: req.params.id });
});
// 📄 Route: GET /api/documents
// مرئية للجميع
app.get('/api/documents', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId);
    const documents = await Document.find({
      cours: { $in: etudiant.cours }
    }).sort({ dateAjout: -1 });

    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET - Récupérer les cours du professeur
app.get('/api/rapports/professeur/mes-cours', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    const cours = await Cours.find({ professeur: professeur.nom });
    res.json(cours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Récupérer les étudiants d'un cours spécifique
app.get('/api/rapports/professeur/etudiants/:cours', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    const coursNom = req.params.cours;
    
    // Vérifier que le professeur enseigne ce cours
    if (!professeur.cours.includes(coursNom)) {
      return res.status(403).json({ message: 'Accès non autorisé à ce cours' });
    }

    const etudiants = await Etudiant.find({ 
      cours: coursNom,
      actif: true 
    }).select('nomComplet email niveau anneeScolaire');

    res.json(etudiants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un nouveau rapport
app.post('/api/rapports/professeur/rapports', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    const {
      etudiant,
      cours,
      natureProbleme,
      autreProbleme,
      descriptionIncident,
      mesurePrise,
      autreMesure,
      observationProfesseur
    } = req.body;

    // Vérifier que l'étudiant existe
    const etudiantDoc = await Etudiant.findById(etudiant);
    if (!etudiantDoc) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Vérifier que le professeur enseigne ce cours
    if (!professeur.cours.includes(cours)) {
      return res.status(403).json({ message: 'Vous n\'enseignez pas ce cours' });
    }

    // Créer le rapport
    const nouveauRapport = new Rapport({
      professeur: professeur._id,
      etudiant: etudiantDoc._id,
      cours,
      anneeScolaire: etudiantDoc.anneeScolaire,
      niveau: etudiantDoc.niveau,
      natureProbleme,
      autreProbleme: natureProbleme.includes('Autre') ? autreProbleme : '',
      descriptionIncident,
      mesurePrise,
      autreMesure: mesurePrise.includes('Autre') ? autreMesure : '',
      observationProfesseur
    });

    await nouveauRapport.save();

    res.status(201).json({ 
      message: 'Rapport créé avec succès',
      rapport: nouveauRapport
    });
  } catch (err) {
    console.error('Erreur création rapport:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Récupérer tous les rapports du professeur
app.get('/api/rapports/professeur/mes-rapports', authProfesseur, async (req, res) => {
  try {
    const rapports = await Rapport.find({ professeur: req.professeurId })
      .populate('etudiant', 'nomComplet email')
      .sort({ date: -1 });

    res.json(rapports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ROUTES ADMIN - RAPPORTS =====

// GET - Récupérer tous les rapports
app.get('/api/rapports/admin/rapports', authAdmin, async (req, res) => {
  try {
    const { statut, cours, dateDebut, dateFin } = req.query;
    
    let query = {};
    
    if (statut) {
      query.statut = statut;
    }
    
    if (cours) {
      query.cours = cours;
    }
    
    if (dateDebut || dateFin) {
      query.date = {};
      if (dateDebut) query.date.$gte = new Date(dateDebut);
      if (dateFin) query.date.$lte = new Date(dateFin);
    }

    const rapports = await Rapport.find(query)
      .populate('professeur', 'nom prenom email')
      .populate('etudiant', 'nomComplet email niveau anneeScolaire telephonePere telephoneMere') // ✅ Ajout ici
      .sort({ date: -1 });

    res.json(rapports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Récupérer un rapport spécifique
app.get('/api/rapports/admin/rapports/:id', authAdmin, async (req, res) => {
  try {
    const rapport = await Rapport.findById(req.params.id)
      .populate('professeur', 'nom prenom email')
      .populate('etudiant', 'nomComplet email niveau anneeScolaire');

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    res.json(rapport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT - Mettre à jour le visa de direction
app.put('/api/rapports/admin/rapports/:id/visa', authAdmin, async (req, res) => {
  try {
    const { visaDirection } = req.body;

    const rapport = await Rapport.findByIdAndUpdate(
      req.params.id,
      {
        visaDirection,
        dateVisa: visaDirection ? new Date() : null,
        statut: visaDirection ? 'traite' : 'en_attente'
      },
      { new: true }
    ).populate('professeur', 'nom prenom email')
     .populate('etudiant', 'nomComplet email niveau anneeScolaire');

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    res.json({ 
      message: 'Visa mis à jour avec succès',
      rapport
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT - Changer le statut d'un rapport
app.put('/api/rapports/admin/rapports/:id/statut', authAdmin, async (req, res) => {
  try {
    const { statut } = req.body;

    if (!['en_attente', 'traite', 'archive'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const rapport = await Rapport.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    ).populate('professeur', 'nom prenom email')
     .populate('etudiant', 'nomComplet email niveau anneeScolaire');

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    res.json({ 
      message: 'Statut mis à jour avec succès',
      rapport
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Supprimer un rapport
app.delete('/api/rapports/admin/rapports/:id', authAdmin, async (req, res) => {
  try {
    const rapport = await Rapport.findByIdAndDelete(req.params.id);

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    res.json({ message: 'Rapport supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Statistiques des rapports
app.get('/api/rapports/admin/rapports/stats/general', authAdmin, async (req, res) => {
  try {
    const total = await Rapport.countDocuments();
    const enAttente = await Rapport.countDocuments({ statut: 'en_attente' });
    const traites = await Rapport.countDocuments({ statut: 'traite' });
    const archives = await Rapport.countDocuments({ statut: 'archive' });

    // Rapports par nature de problème
    const parNature = await Rapport.aggregate([
      { $unwind: '$natureProbleme' },
      { $group: { _id: '$natureProbleme', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Rapports par cours
    const parCours = await Rapport.aggregate([
      { $group: { _id: '$cours', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      total,
      parStatut: { enAttente, traites, archives },
      parNature,
      parCours
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/professeur/documents', authProfesseur, async (req, res) => {
  try {
    const docs = await Document.find({ creePar: req.professeurId }).sort({ dateUpload: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
app.delete('/api/documents/:id', authProfesseur, async (req, res) => {
  try {
    const documentId = req.params.id;
    const professeurId = req.professeurId; // ✅ depuis le middleware authProfesseur

    // Vérifier que le document appartient à ce professeur
    const document = await Document.findOne({ 
      _id: documentId, 
      creePar: professeurId   // ✅ champ correct
    });

    if (!document) {
      return res.status(404).json({ 
        message: 'Document non trouvé ou accès refusé' 
      });
    }

    // ✅ Optionnel: supprimer le fichier du dossier local (si nécessaire)
    // const fs = require('fs');
    // const filePath = path.join(__dirname, 'documents', path.basename(document.fichier));
    // if (fs.existsSync(filePath)) {
    //   fs.unlinkSync(filePath);
    // }

    // Supprimer le document de la base
    await Document.findByIdAndDelete(documentId);

    res.json({ message: '✅ Document supprimé avec succès' });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la suppression', 
      error: error.message 
    });
  }
});



// ✅ BACKEND: Retourne les cours de l'étudiant + leurs professeurs
app.get('/api/etudiant/mes-cours', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId);
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    const coursAvecProfs = await Promise.all(
      etudiant.cours.map(async (nomCours) => {
        const professeurs = await Professeur.find({ cours: nomCours })
          .select('_id nom matiere');
        return { nomCours, professeurs };
      })
    );

    res.status(200).json(coursAvecProfs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// ✅ BACKEND: Envoi d'un exercice à un prof spécifique
app.post(
  '/api/etudiant/exercices',
  authEtudiant,
  exerciceUpload.single('fichier'),
  async (req, res) => {
    try {
      const { titre, cours, type, numero, professeurId } = req.body;

      // ✅ التحقق من الحقول المطلوبة
      if (!titre || !cours || !type || !numero || !professeurId || !req.file) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
      }

      // ✅ التأكد أن الأستاذ يدرّس هذا الكورس
      const professeur = await Professeur.findById(professeurId);
      if (!professeur || !professeur.cours.includes(cours)) {
        return res.status(400).json({
          message: '❌ Le professeur sélectionné n\'enseigne pas ce cours.'
        });
      }

      // ✅ إنشاء التمرين
      const fichier = `/uploads/${req.file.filename}`;
      const exercice = new Exercice({
        titre,
        cours,
        type,
        numero,
        fichier,
        etudiant: req.etudiantId,
        professeur: professeurId
      });

      await exercice.save();
      res.status(201).json({
        message: '✅ Exercice envoyé avec succès',
        exercice
      });
    } catch (err) {
      console.error('❌ Erreur envoi exercice:', err);
      res.status(500).json({
        message: '❌ Erreur lors de l\'envoi du devoir',
        error: err.message
      });
    }
  }
);


// DELETE - Supprimer un exercice (par l'étudiant sous 24h)
app.delete('/api/etudiant/exercices/:id', authEtudiant, async (req, res) => {
  try {
    const exercice = await Exercice.findOne({ _id: req.params.id, etudiant: req.etudiantId });

    if (!exercice) {
      return res.status(404).json({ message: 'Exercice introuvable' });
    }

    const maintenant = new Date();
    const diffHeures = (maintenant - exercice.dateEnvoi) / (1000 * 60 * 60);

    if (diffHeures > 24) {
      return res.status(403).json({ message: '⛔ Impossible de supprimer après 24h' });
    }

    // Optionnel : supprimer fichier physique
    const fs = require('fs');
    if (fs.existsSync(`.${exercice.fichier}`)) {
      fs.unlinkSync(`.${exercice.fichier}`);
    }

    await exercice.deleteOne();
    res.json({ message: '✅ Exercice supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
});

// ✅ Route pour obtenir le nombre de notifications non lues
app.get('/api/notifications/unread-count', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    // Cette route utilise la même logique que /api/notifications
    // mais retourne seulement le nombre
    const notifications = [];
    const aujourdHui = new Date();
    
    // Paiements expirés et expirant
    const paiements = await Paiement.find()
      .populate('etudiant', 'nomComplet actif')
      .sort({ moisDebut: -1 });

    const latestPaiementMap = new Map();
    for (const p of paiements) {
      const key = `${p.etudiant?._id}_${p.cours}`;
      if (!latestPaiementMap.has(key)) {
        latestPaiementMap.set(key, p);
      }
    }

    for (const paiement of latestPaiementMap.values()) {
      if (!paiement.etudiant?.actif) continue;
      const debut = new Date(paiement.moisDebut);
      const fin = new Date(debut);
      fin.setMonth(fin.getMonth() + Number(paiement.nombreMois));
      const joursRestants = Math.ceil((fin - aujourdHui) / (1000 * 60 * 60 * 24));

      if (joursRestants < 0 || joursRestants <= 7) {
        notifications.push({ type: 'payment' });
      }
    }

    // Absences répétées
    const debutMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1);
    const presences = await Presence.find({
      dateSession: { $gte: debutMois, $lte: aujourdHui },
      present: false
    }).populate('etudiant', 'nomComplet actif');

    const absencesParEtudiant = {};
    for (const presence of presences) {
      if (!presence.etudiant?.actif) continue;
      const etudiantId = presence.etudiant._id.toString();
      absencesParEtudiant[etudiantId] = (absencesParEtudiant[etudiantId] || 0) + 1;
    }

    for (const count of Object.values(absencesParEtudiant)) {
      if (count >= 3) {
        notifications.push({ type: 'absence' });
      }
    }

    // Événements à venir
    const dans7jours = new Date();
    dans7jours.setDate(dans7jours.getDate() + 7);
    const evenements = await Evenement.find({
      dateDebut: { $gte: aujourdHui, $lte: dans7jours }
    });

    notifications.push(...evenements.map(() => ({ type: 'event' })));

    res.json({ count: notifications.length });

  } catch (err) {
    console.error('❌ Erreur unread count:', err);
    res.status(500).json({ error: err.message });
  }
});
// ✅ Route pour supprimer une notification
app.delete('/api/notifications/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    console.log("🗑️ Tentative de suppression notification:", notificationId);
    
    // Étant donné que les notifications sont générées dynamiquement,
    // nous devons les stocker temporairement ou utiliser une autre approche
    
    // OPTION 1: Stockage temporaire en mémoire (simple mais limité)
    if (!global.deletedNotifications) {
      global.deletedNotifications = new Set();
    }
    
    // Ajouter l'ID à la liste des notifications supprimées
    global.deletedNotifications.add(notificationId);
    
    console.log("✅ Notification marquée comme supprimée:", notificationId);
    console.log("📋 Total notifications supprimées:", global.deletedNotifications.size);
    
    res.json({ 
      message: 'Notification supprimée avec succès',
      id: notificationId,
      success: true
    });

  } catch (err) {
    console.error('❌ Erreur suppression notification:', err);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la notification',
      details: err.message 
    });
  }
});

// ✅ Modifier la route GET notifications pour exclure les notifications supprimées

// 🔒 GET /api/professeur/exercices/:cours
app.get('/api/professeur/exercices/:cours', authProfesseur, async (req, res) => {
  try {
    const { cours } = req.params;

    // ✅ جلب التمارين فقط التي أُرسلت لهذا الأستاذ
    const exercices = await Exercice.find({ 
      cours, 
      professeur: req.professeurId // ✅ هذا هو الفرق
    }).populate('etudiant', 'nomComplet email');

    res.json(exercices);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route GET – Etudiant voir ses propres exercices
app.get('/api/etudiant/mes-exercices', authEtudiant, async (req, res) => {
  try {
    const exercices = await Exercice.find({ etudiant: req.etudiantId })
      .populate('professeur', 'nom matiere') // ✅ إظهار اسم ومادة الأستاذ
      .sort({ dateUpload: -1 });

    res.json(exercices);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});


// 🔒 PUT /api/professeur/exercices/:id/remarque
app.put('/api/professeur/exercices/:id/remarque', authProfesseur, async (req, res) => {
  try {
    const { remarque } = req.body;
    const { id } = req.params;

    const exercice = await Exercice.findByIdAndUpdate(
      id,
      { remarque },
      { new: true }
    );

    if (!exercice) return res.status(404).json({ message: 'Exercice non trouvé' });

    res.json({ message: '✅ Remarque ajoutée', exercice });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


app.delete('/api/cours/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const coursId = req.params.id;

    const cours = await Cours.findById(coursId);
    if (!cours) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    // ✅ Supprimer le cours de la base
    await Cours.findByIdAndDelete(coursId);

    // ✅ Supprimer le nom du cours chez tous les étudiants
    await Etudiant.updateMany(
      { cours: cours.nom },
      { $pull: { cours: cours.nom } }
    );

    // ✅ Supprimer le nom du cours chez tous les professeurs
    await Professeur.updateMany(
      { cours: cours.nom },
      { $pull: { cours: cours.nom } }
    );

    res.json({ message: `✅ Cours "${cours.nom}" supprimé avec succès` });
  } catch (err) {
    res.status(500).json({ message: '❌ Erreur lors de la suppression', error: err.message });
  }
});



// ✅ Route pour vider la liste des notifications supprimées (optionnel - pour admin)

app.post('/api/contact/send', async (req, res) => {
  try {
    const newMessage = new ContactMessage(req.body);
    await newMessage.save();
    res.status(201).json({ message: '✅ Message envoyé avec succès' });
  } catch (err) {
    console.error('❌ Erreur enregistrement message:', err);
    res.status(500).json({ message: '❌ Erreur serveur' });
  }
});

// 🔐 Route protégée - vue admin
app.get('/api/admin/contact-messages', authAdminOrPaiementManager, async (req, res) => {
  try {
    console.log('User making request:', req.userRole, req.user._id);
    const messages = await ContactMessage.find().sort({ date: -1 });
    console.log('Messages found:', messages.length);
    res.status(200).json(messages);
  } catch (err) {
    console.error('❌ Erreur récupération messages:', err);
    res.status(500).json({ 
      message: '❌ Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
app.delete('/api/admin/contact-messages/:id', authAdminOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ContactMessage.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: '❌ Message non trouvé' });
    }

    res.status(200).json({ message: '✅ Message supprimé avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression message:', error);
    res.status(500).json({ message: '❌ Erreur serveur' });
  }
});

// backend/app.js ou routes/admin.js



// 🔔 إشعارات الأستاذ - الأحداث القادمة فقط
app.get('/api/professeur/notifications', authProfesseur, async (req, res) => {
  try {
    const notifications = [];

    const aujourdHui = new Date();
    const dans7jours = new Date();
    dans7jours.setDate(aujourdHui.getDate() + 7);

    const evenements = await Evenement.find({
      dateDebut: { $gte: aujourdHui, $lte: dans7jours }
    }).sort({ dateDebut: 1 });

    for (const e of evenements) {
      const joursRestants = Math.ceil((new Date(e.dateDebut) - aujourdHui) / (1000 * 60 * 60 * 24));

      notifications.push({
        id: `event_${e._id}`,
        title: `📅 ${e.titre}`,
        message:
          joursRestants === 0
            ? `📌 Aujourd'hui: ${e.titre}`
            : `⏳ Dans ${joursRestants} jour(s): ${e.titre}`,
        date: e.dateDebut
      });
    }

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// ============================================
// ROUTES PARENTS - CRUD ADMIN
// ============================================

// 📋 Récupérer tous les parents (Admin)
app.get('/api/admin/parents', authAdmin, async (req, res) => {
  try {
    const parents = await Parent.find()
      .populate('enfants', 'nomComplet email niveau anneeScolaire')
      .populate('creeParAdmin', 'nom prenom email')
      .select('-motDePasse')
      .sort({ createdAt: -1 });

    res.json(parents);
  } catch (err) {
    console.error('Erreur récupération parents:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔍 Récupérer un parent par ID (Admin)
app.get('/api/admin/parents/:id', authAdmin, async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id)
      .populate('enfants', 'nomComplet email niveau anneeScolaire telephoneEtudiant')
      .populate('creeParAdmin', 'nom prenom email')
      .select('-motDePasse');

    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé' });
    }

    res.json(parent);
  } catch (err) {
    console.error('Erreur récupération parent:', err);
    res.status(500).json({ error: err.message });
  }
});

// ➕ Créer un nouveau parent (Admin)
app.post('/api/admin/parents', authAdmin, async (req, res) => {
  try {
    const { nomComplet, email, motDePasse, telephone, enfants } = req.body;

    // Validation
    if (!nomComplet || !email || !motDePasse) {
      return res.status(400).json({ 
        message: 'Nom complet, email et mot de passe sont requis' 
      });
    }

    // Vérifier si l'email existe déjà
    const existingParent = await Parent.findOne({ email: email.toLowerCase() });
    if (existingParent) {
      return res.status(400).json({ 
        message: 'Un parent avec cet email existe déjà' 
      });
    }

    // Vérifier que les enfants existent
    if (enfants && enfants.length > 0) {
      const etudiants = await Etudiant.find({ _id: { $in: enfants } });
      if (etudiants.length !== enfants.length) {
        return res.status(400).json({ 
          message: 'Un ou plusieurs étudiants sélectionnés n\'existent pas' 
        });
      }
    }

    // Créer le parent
    const parent = new Parent({
      nomComplet,
      email: email.toLowerCase(),
      motDePasse,
      telephone,
      enfants: enfants || [],
      creeParAdmin: req.userId,
      actif: true
    });

    await parent.save();

    // Retourner le parent sans le mot de passe
    const parentSafe = await Parent.findById(parent._id)
      .populate('enfants', 'nomComplet email niveau')
      .select('-motDePasse');

    res.status(201).json(parentSafe);
  } catch (err) {
    console.error('Erreur création parent:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Modifier un parent (Admin)
app.put('/api/admin/parents/:id', authAdmin, async (req, res) => {
  try {
    const { nomComplet, email, telephone, enfants, actif, motDePasse } = req.body;

    const parent = await Parent.findById(req.params.id);
    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé' });
    }

    // Vérifier l'unicité de l'email si modifié
    if (email && email.toLowerCase() !== parent.email) {
      const existingParent = await Parent.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingParent) {
        return res.status(400).json({ 
          message: 'Un parent avec cet email existe déjà' 
        });
      }
      parent.email = email.toLowerCase();
    }

    // Vérifier les enfants si modifiés
    if (enfants && enfants.length > 0) {
      const etudiants = await Etudiant.find({ _id: { $in: enfants } });
      if (etudiants.length !== enfants.length) {
        return res.status(400).json({ 
          message: 'Un ou plusieurs étudiants sélectionnés n\'existent pas' 
        });
      }
      parent.enfants = enfants;
    }

    // Mettre à jour les champs
    if (nomComplet) parent.nomComplet = nomComplet;
    if (telephone !== undefined) parent.telephone = telephone;
    if (actif !== undefined) parent.actif = actif;
    
    // Changer le mot de passe si fourni
    if (motDePasse && motDePasse.trim() !== '') {
      parent.motDePasse = motDePasse;
    }

    await parent.save();

    // Retourner le parent mis à jour
    const parentUpdated = await Parent.findById(parent._id)
      .populate('enfants', 'nomComplet email niveau anneeScolaire')
      .select('-motDePasse');

    res.json(parentUpdated);
  } catch (err) {
    console.error('Erreur modification parent:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ Supprimer un parent (Admin)
app.delete('/api/admin/parents/:id', authAdmin, async (req, res) => {
  try {
    const parent = await Parent.findByIdAndDelete(req.params.id);
    
    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé' });
    }

    res.json({ message: 'Parent supprimé avec succès', parent });
  } catch (err) {
    console.error('Erreur suppression parent:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔄 Activer/Désactiver un parent (Admin)
app.patch('/api/admin/parents/:id/toggle-actif', authAdmin, async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id);
    
    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé' });
    }

    parent.actif = !parent.actif;
    await parent.save();

    const parentUpdated = await Parent.findById(parent._id)
      .populate('enfants', 'nomComplet email')
      .select('-motDePasse');

    res.json(parentUpdated);
  } catch (err) {
    console.error('Erreur toggle actif parent:', err);
    res.status(500).json({ error: err.message });
  }
});// ============================================
// ROUTES ESPACE PARENT - CONSULTATION
// ============================================

// 👤 Profil du parent connecté
// Route pour récupérer le profil parent avec TOUTES les informations des enfants
app.get('/api/parents/me', authParent, async (req, res) => {
  try {
    const parent = await Parent.findById(req.userId)
      .populate({
        path: 'enfants',
        select: 'nomComplet email niveau anneeScolaire telephoneEtudiant image genre dateNaissance lieuNaissance nationalite codeMassar cours actif adresse transport nomCompletPere nomCompletMere travailPere travailMere telephonePere telephoneMere'
      })
      .select('-motDePasse');

    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé' });
    }

    res.json(parent);
  } catch (err) {
    console.error('Erreur récupération profil parent:', err);
    res.status(500).json({ error: err.message });
  }
});
// Route pour récupérer l'emploi du temps d'un enfant spécifique
app.get('/api/parents/enfants/:enfantId/seances', authParent, async (req, res) => {
  try {
    const { enfantId } = req.params;
    
    // Vérifier que cet enfant appartient bien au parent connecté
    const parent = await Parent.findById(req.userId);
    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé' });
    }

    const isParentOfChild = parent.enfants.some(
      e => e.toString() === enfantId
    );

    if (!isParentOfChild) {
      return res.status(403).json({ message: 'Accès non autorisé à cet enfant' });
    }

    // Récupérer l'enfant avec son cours
    const enfant = await Etudiant.findById(enfantId);
    if (!enfant) {
      return res.status(404).json({ message: 'Enfant non trouvé' });
    }

    // Récupérer toutes les séances correspondant au cours de l'enfant
    const seances = await Seance.find({ cours: enfant.cours })
      .populate('professeur', 'nom prenom email')
      .sort({ jour: 1, heureDebut: 1 })
      .lean();

    res.json(seances);
  } catch (err) {
    console.error('Erreur récupération séances enfant:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route pour récupérer les séances de tous les enfants (optionnel)
app.get('/api/parents/enfants/seances/tous', authParent, async (req, res) => {
  try {
    const parent = await Parent.findById(req.userId).populate('enfants');
    
    if (!parent || !parent.enfants || parent.enfants.length === 0) {
      return res.json([]);
    }

    const seancesParEnfant = {};

    for (const enfant of parent.enfants) {
      const seances = await Seance.find({ cours: enfant.cours })
        .populate('professeur', 'nom prenom email')
        .sort({ jour: 1, heureDebut: 1 })
        .lean();

      seancesParEnfant[enfant._id] = {
        enfant: {
          _id: enfant._id,
          nomComplet: enfant.nomComplet,
          niveau: enfant.niveau,
          cours: enfant.cours
        },
        seances: seances
      };
    }

    res.json(seancesParEnfant);
  } catch (err) {
    console.error('Erreur récupération séances:', err);
    res.status(500).json({ error: err.message });
  }
});
// 📊 Absences de tous les enfants du parent
app.get('/api/parents/enfants/absences', authParent, async (req, res) => {
  try {
    const parent = await Parent.findById(req.userId).populate('enfants');
    
    if (!parent || !parent.enfants || parent.enfants.length === 0) {
      return res.json([]);
    }

    const enfantsIds = parent.enfants.map(e => e._id);

    // Récupérer toutes les absences des enfants
    const absences = await Presence.find({
      etudiant: { $in: enfantsIds },
      present: false
    })
    .populate('etudiant', 'nomComplet email niveau anneeScolaire')
    .sort({ dateSession: -1 })
    .lean();

    // Grouper par enfant
    const absencesParEnfant = {};
    absences.forEach(abs => {
      const etudiantId = abs.etudiant._id.toString();
      if (!absencesParEnfant[etudiantId]) {
        absencesParEnfant[etudiantId] = {
          etudiant: abs.etudiant,
          absences: [],
          total: 0
        };
      }
      absencesParEnfant[etudiantId].absences.push(abs);
      absencesParEnfant[etudiantId].total++;
    });

    res.json(Object.values(absencesParEnfant));
  } catch (err) {
    console.error('Erreur récupération absences:', err);
    res.status(500).json({ error: err.message });
  }
});
// Route pour récupérer les présences d'un enfant spécifique
app.get('/api/parents/enfants/:enfantId/presences', authParent, async (req, res) => {
  try {
    const { enfantId } = req.params;
    const { date } = req.query;

    // Vérifier que cet enfant appartient bien au parent connecté
    const parent = await Parent.findById(req.userId);
    if (!parent || !parent.enfants.includes(enfantId)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Construire la requête
    let query = { etudiant: enfantId };

    // Filtrer par date si spécifié
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.dateSession = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Récupérer les présences
    const presences = await Presence.find(query)
      .sort({ dateSession: -1, heure: -1 })
      .lean();

    res.json(presences);
  } catch (err) {
    console.error('Erreur récupération présences:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route pour récupérer les présences d'aujourd'hui
app.get('/api/parents/enfants/:enfantId/presences/today', authParent, async (req, res) => {
  try {
    const { enfantId } = req.params;

    // Vérifier que cet enfant appartient bien au parent connecté
    const parent = await Parent.findById(req.userId);
    if (!parent || !parent.enfants.includes(enfantId)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Date d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Récupérer les présences d'aujourd'hui
    const presences = await Presence.find({
      etudiant: enfantId,
      dateSession: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .sort({ heure: -1 })
    .lean();

    res.json(presences);
  } catch (err) {
    console.error('Erreur récupération présences du jour:', err);
    res.status(500).json({ error: err.message });
  }
});
// 📋 Rapports de tous les enfants du parent
app.get('/api/parents/enfants/rapports', authParent, async (req, res) => {
  try {
    const parent = await Parent.findById(req.userId).populate('enfants');
    
    if (!parent || !parent.enfants || parent.enfants.length === 0) {
      return res.json([]);
    }

    const enfantsIds = parent.enfants.map(e => e._id);

    // Récupérer tous les rapports des enfants
    const rapports = await Rapport.find({
      etudiant: { $in: enfantsIds }
    })
    .populate('etudiant', 'nomComplet email niveau anneeScolaire')
    .populate('professeur', 'nom prenom email')
    .sort({ date: -1 })
    .lean();

    // Grouper par enfant
    const rapportsParEnfant = {};
    rapports.forEach(rapport => {
      const etudiantId = rapport.etudiant._id.toString();
      if (!rapportsParEnfant[etudiantId]) {
        rapportsParEnfant[etudiantId] = {
          etudiant: rapport.etudiant,
          rapports: [],
          total: 0
        };
      }
      rapportsParEnfant[etudiantId].rapports.push(rapport);
      rapportsParEnfant[etudiantId].total++;
    });

    res.json(Object.values(rapportsParEnfant));
  } catch (err) {
    console.error('Erreur récupération rapports:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📊 Statistiques d'un enfant spécifique
app.get('/api/parents/enfants/:enfantId/stats', authParent, async (req, res) => {
  try {
    const { enfantId } = req.params;
    
    // Vérifier que l'enfant appartient bien au parent
    const parent = await Parent.findById(req.userId);
    if (!parent.enfants.includes(enfantId)) {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas accès aux données de cet étudiant' 
      });
    }

    // Statistiques de présence
    const totalPresences = await Presence.countDocuments({ etudiant: enfantId });
    const absences = await Presence.countDocuments({ 
      etudiant: enfantId, 
      present: false 
    });
    const presences = await Presence.countDocuments({ 
      etudiant: enfantId, 
      present: true 
    });
    const retards = await Presence.countDocuments({ 
      etudiant: enfantId, 
      present: true,
      retardMinutes: { $gt: 0 }
    });

    // Statistiques de rapports
    const totalRapports = await Rapport.countDocuments({ etudiant: enfantId });
    const rapportsEnAttente = await Rapport.countDocuments({ 
      etudiant: enfantId, 
      statut: 'en_attente' 
    });

    // Taux de présence
    const tauxPresence = totalPresences > 0 
      ? Math.round((presences / totalPresences) * 100) 
      : 0;

    res.json({
      presences: {
        total: totalPresences,
        present: presences,
        absent: absences,
        retards: retards,
        tauxPresence
      },
      rapports: {
        total: totalRapports,
        enAttente: rapportsEnAttente
      }
    });
  } catch (err) {
    console.error('Erreur récupération stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📅 Absences d'un enfant spécifique avec filtres
app.get('/api/parents/enfants/:enfantId/absences', authParent, async (req, res) => {
  try {
    const { enfantId } = req.params;
    const { dateDebut, dateFin } = req.query;
    
    // Vérifier que l'enfant appartient bien au parent
    const parent = await Parent.findById(req.userId);
    if (!parent.enfants.includes(enfantId)) {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas accès aux données de cet étudiant' 
      });
    }

    let query = { 
      etudiant: enfantId, 
      present: false 
    };

    // Filtres de date
    if (dateDebut || dateFin) {
      query.dateSession = {};
      if (dateDebut) query.dateSession.$gte = new Date(dateDebut);
      if (dateFin) query.dateSession.$lte = new Date(dateFin);
    }

    const absences = await Presence.find(query)
      .sort({ dateSession: -1 })
      .lean();

    res.json(absences);
  } catch (err) {
    console.error('Erreur récupération absences enfant:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📋 Rapports d'un enfant spécifique avec filtres
app.get('/api/parents/enfants/:enfantId/rapports', authParent, async (req, res) => {
  try {
    const { enfantId } = req.params;
    const { dateDebut, dateFin, statut } = req.query;
    
    // Vérifier que l'enfant appartient bien au parent
    const parent = await Parent.findById(req.userId);
    if (!parent.enfants.includes(enfantId)) {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas accès aux données de cet étudiant' 
      });
    }

    let query = { etudiant: enfantId };

    // Filtres
    if (statut) {
      query.statut = statut;
    }
    
    if (dateDebut || dateFin) {
      query.date = {};
      if (dateDebut) query.date.$gte = new Date(dateDebut);
      if (dateFin) query.date.$lte = new Date(dateFin);
    }

    const rapports = await Rapport.find(query)
      .populate('professeur', 'nom prenom email')
      .sort({ date: -1 });

    res.json(rapports);
  } catch (err) {
    console.error('Erreur récupération rapports enfant:', err);
    res.status(500).json({ error: err.message });
  }
});
// ✅ Route pour obtenir la liste des notifications supprimées (debug)
app.get('/api/notifications/deleted', authAdminOrInscripteurOrPaiementManager, (req, res) => {
  try {
    if (!global.deletedNotifications) {
      global.deletedNotifications = new Set();
    }
    
    res.json({
      deletedNotifications: Array.from(global.deletedNotifications),
      count: global.deletedNotifications.size
    });

  } catch (err) {
    console.error('❌ Erreur get deleted notifications:', err);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération',
      details: err.message 
    });
  }
});
// route: POST /api/professeurs
// accessible uniquement par Admin
// Route POST - Créer un professeur
app.post('/api/professeurs', authAdminOrInscripteurOrPaiementManager, upload.single('image'), async (req, res) => {
  try {
    const {
      nom,
      email,
      cin,
      motDePasse,
      cours,
      telephone,
      dateNaissance,
      actif,
      genre,
      matiere
    } = req.body;

    // 🔐 Vérification email unique
    const existe = await Professeur.findOne({ email });
    if (existe) return res.status(400).json({ message: '📧 Cet email est déjà utilisé' });

    // 🆔 Vérification CIN unique
    const existeCin = await Professeur.findOne({ cin });
    if (existeCin) return res.status(400).json({ message: '🆔 Ce CIN est déjà utilisé' });

    // ✅ Vérification genre
    if (!['Homme', 'Femme'].includes(genre)) {
      return res.status(400).json({ message: '🚫 Genre invalide. Doit être Homme ou Femme' });
    }

    // ✅ Matière obligatoire
    if (!matiere || matiere.trim() === '') {
      return res.status(400).json({ message: '🚫 La matière est requise' });
    }

    // ✅ CIN obligatoire
    if (!cin || cin.trim() === '') {
      return res.status(400).json({ message: '🚫 Le CIN est requis' });
    }

    // 🖼️ Image
    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

    // 📅 Date de naissance
    const date = dateNaissance ? new Date(dateNaissance) : null;

    // 🔐 Hash mot de passe
    const hashed = await bcrypt.hash(motDePasse, 10);

    // ✅ Convertir actif en booléen
    const actifBool = actif === 'true' || actif === true;

    // 📦 Créer le professeur
    const professeur = new Professeur({
      nom,
      email,
      cin,
      motDePasse: hashed,
      genre,
      telephone,
      dateNaissance: date,
      image: imagePath,
      actif: actifBool,
      cours,
      matiere
    });

    await professeur.save();

    // ✅ Utiliser le nom réellement sauvegardé (au cas où il a été formaté par mongoose)
    const nomProf = professeur.nom;

    // 🔁 Mettre à jour chaque Cours pour y inclure ce professeur
    if (Array.isArray(cours)) {
      for (const coursNom of cours) {
        const coursDoc = await Cours.findOne({ nom: coursNom });
        if (coursDoc && !coursDoc.professeur.includes(nomProf)) {
          coursDoc.professeur.push(nomProf);
          await coursDoc.save();
        }
      }
    }

    res.status(201).json({
      message: '✅ Professeur créé avec succès',
      professeur
    });

  } catch (err) {
    console.error('❌ Erreur lors de la création du professeur:', err);
    res.status(500).json({ message: '❌ Erreur serveur', error: err.message });
  }
});

// Route PUT - Modifier un professeur
app.put('/api/professeurs/:id', authAdminOrInscripteurOrPaiementManager, upload.single('image'), async (req, res) => {
  try {
    const professeurId = req.params.id;
    const {
      nom,
      genre,
      cin,
      dateNaissance,
      telephone,
      email,
      motDePasse,
      actif,
      matiere
    } = req.body;

    let cours = req.body.cours;

    // 🧠 S'assurer que cours est un tableau
    if (!cours) cours = [];
    if (typeof cours === 'string') cours = [cours];

    // 🔍 Récupérer les anciens cours du professeur
    const ancienProf = await Professeur.findById(professeurId);
    if (!ancienProf) return res.status(404).json({ message: "Professeur introuvable" });

    // 🆔 Vérification CIN unique (sauf pour le professeur actuel)
    if (cin && cin !== ancienProf.cin) {
      const existeCin = await Professeur.findOne({ cin, _id: { $ne: professeurId } });
      if (existeCin) return res.status(400).json({ message: '🆔 Ce CIN est déjà utilisé par un autre professeur' });
    }

    // 📧 Vérification email unique (sauf pour le professeur actuel)
    if (email && email !== ancienProf.email) {
      const existeEmail = await Professeur.findOne({ email, _id: { $ne: professeurId } });
      if (existeEmail) return res.status(400).json({ message: '📧 Cet email est déjà utilisé par un autre professeur' });
    }

    const ancienCours = ancienProf.cours || [];

    // ➖ Cours supprimés
    const coursSupprimes = ancienCours.filter(c => !cours.includes(c));
    // ➕ Cours ajoutés
    const coursAjoutes = cours.filter(c => !ancienCours.includes(c));

    // 🧼 Retirer le prof des cours supprimés
    for (const coursNom of coursSupprimes) {
      await Cours.updateOne(
        { nom: coursNom },
        { $pull: { professeur: ancienProf.nom } }
      );
    }

    // 🧩 Ajouter le prof dans les cours ajoutés
    for (const coursNom of coursAjoutes) {
      await Cours.updateOne(
        { nom: coursNom },
        { $addToSet: { professeur: nom } }
      );
    }

    // 🛠️ Données à mettre à jour
    const updateData = {
      nom,
      genre,
      cin,
      dateNaissance: new Date(dateNaissance),
      telephone,
      email,
      cours,
      matiere,
      actif: actif === 'true' || actif === true
    };

    // 📷 Gestion de l'image
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    // 🔐 Mot de passe s'il est modifié
    if (motDePasse && motDePasse.trim() !== '') {
      updateData.motDePasse = await bcrypt.hash(motDePasse, 10);
    }

    // ✅ Mise à jour du professeur
    const updatedProf = await Professeur.findByIdAndUpdate(
      professeurId,
      updateData,
      { new: true, runValidators: true }
    ).select('');

    res.json({ message: "✅ Professeur modifié avec succès", professeur: updatedProf });

  } catch (err) {
    console.error('❌ Erreur lors de la modification:', err);
    res.status(500).json({ message: "Erreur lors de la modification", error: err.message });
  }
});

app.post('/api/seances', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    // ✅ AJOUT: Inclure matiere et salle dans la destructuration
    const { jour, heureDebut, heureFin, cours, professeur, matiere, salle } = req.body;

    // Validation rapide
    if (!jour || !heureDebut || !heureFin || !cours || !professeur) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    // ✅ Récupérer le nom du cours à partir de l'ID
    const coursDoc = await Cours.findById(cours);
    if (!coursDoc) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    const seance = new Seance({
      jour,
      heureDebut,
      heureFin,
      cours: coursDoc.nom, // ✅ Utiliser le nom du cours au lieu de l'ID
      professeur,
      matiere: matiere || '', // ✅ IMPORTANT: Inclure la matière
      salle: salle || '' // ✅ IMPORTANT: Inclure la salle
    });

    await seance.save();

    res.status(201).json({ message: 'Séance ajoutée avec succès', seance });
  } catch (err) {
    console.error('Erreur ajout séance:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Route pour modifier une séance - CORRIGÉE
app.put('/api/seances/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    // ✅ AJOUT: Inclure matiere et salle dans la destructuration
    const { jour, heureDebut, heureFin, cours, professeur, matiere, salle } = req.body;

    // ✅ Récupérer le nom du cours à partir de l'ID
    const coursDoc = await Cours.findById(cours);
    if (!coursDoc) {
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    const seance = await Seance.findByIdAndUpdate(
      req.params.id,
      {
        jour,
        heureDebut,
        heureFin,
        cours: coursDoc.nom, // ✅ Utiliser le nom du cours
        professeur,
        matiere: matiere || '', // ✅ IMPORTANT: Inclure la matière
        salle: salle || '' // ✅ IMPORTANT: Inclure la salle
      },
      { new: true }
    );

    if (!seance) {
      return res.status(404).json({ message: 'Séance non trouvée' });
    }

    res.json({ message: 'Séance modifiée avec succès', seance });
  } catch (err) {
    console.error('Erreur modification séance:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


// Route pour récupérer toutes les séances (pour admin) - INCHANGÉE
app.get('/api/seances', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const seances = await Seance.find()
      .populate('professeur', 'nom')
      .sort({ jour: 1, heureDebut: 1 });

    res.json(seances);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Route pour récupérer les séances pour les étudiants - MODIFIÉE
app.get('/api/seances/etudiant', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId);
    const coursNoms = etudiant.cours; // Array de strings comme ['france', 'ji']

    // ✅ Chercher les séances par nom de cours au lieu d'ID
    const seances = await Seance.find({ cours: { $in: coursNoms } })
      .populate('professeur', 'nom')
      .sort({ jour: 1, heureDebut: 1 });

    res.json(seances);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


// 📋 1. RÉCUPÉRER TOUS LES CAS DE LISTE NOIRE
app.get('/api/liste-noire', authAdmin, async (req, res) => {
  try {
    const { statut, gravite, niveau, cours, anneeScolaire } = req.query;
    
    let filter = {};
    
    if (statut) filter.statut = statut;
    if (gravite) filter.gravite = gravite;
    if (niveau) filter.niveau = niveau;
    if (cours) filter.cours = cours;
    if (anneeScolaire) filter.anneeScolaire = anneeScolaire;
    
    const cas = await ListeNoire.find(filter)
      .populate('etudiant', 'nomComplet email telephoneEtudiant image niveau cours')
      .populate('ajoutePar', 'nom prenom')
      .populate('resoluPar', 'nom prenom')
      .sort({ dateAjout: -1 });
    
    res.json(cas);
  } catch (err) {
    console.error('Erreur récupération liste noire:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 📌 2. RÉCUPÉRER UN CAS SPÉCIFIQUE
app.get('/api/liste-noire/:id', authAdmin, async (req, res) => {
  try {
    const cas = await ListeNoire.findById(req.params.id)
      .populate('etudiant')
      .populate('ajoutePar', 'nom prenom')
      .populate('resoluPar', 'nom prenom')
      .populate('observations.ajoutePar', 'nom prenom');
    
    if (!cas) {
      return res.status(404).json({ message: 'Cas non trouvé' });
    }
    
    res.json(cas);
  } catch (err) {
    console.error('Erreur récupération cas:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ➕ 3. AJOUTER UN ÉTUDIANT À LA LISTE NOIRE
app.post('/api/liste-noire', authAdmin, async (req, res) => {
  try {
    const {
      etudiantId,
      motif,
      description,
      gravite,
      sanction,
      nombreAbsences,
      nombreRetards,
      nombreRapports,
      dateInfraction,
      anneeScolaire
    } = req.body;
    
    // Validation
    if (!etudiantId || !motif || !description) {
      return res.status(400).json({ 
        message: 'Étudiant, motif et description sont obligatoires' 
      });
    }
    
    // Vérifier si l'étudiant existe
    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    // Vérifier si déjà en liste noire active
    const dejaDansListeNoire = await ListeNoire.findOne({
      etudiant: etudiantId,
      statut: { $in: ['actif', 'en_cours'] }
    });
    
    if (dejaDansListeNoire) {
      return res.status(400).json({ 
        message: 'Cet étudiant est déjà dans la liste noire active' 
      });
    }
    
    // Créer le cas
    const nouveauCas = new ListeNoire({
      etudiant: etudiantId,
      nomComplet: etudiant.nomComplet,
      niveau: etudiant.niveau,
      cours: etudiant.cours,
      email: etudiant.email,
      telephoneEtudiant: etudiant.telephoneEtudiant,
      motif,
      description,
      gravite: gravite || 'moyen',
      sanction: sanction || 'avertissement',
      nombreAbsences: nombreAbsences || 0,
      nombreRetards: nombreRetards || 0,
      nombreRapports: nombreRapports || 0,
      dateInfraction: dateInfraction || new Date(),
      ajoutePar: req.adminId,
      anneeScolaire: anneeScolaire || '2025/2026'
    });
    
    await nouveauCas.save();
    
    // Peupler les références
    await nouveauCas.populate('etudiant', 'nomComplet email telephoneEtudiant image');
    await nouveauCas.populate('ajoutePar', 'nom prenom');
    
    res.status(201).json({
      message: 'Étudiant ajouté à la liste noire avec succès',
      cas: nouveauCas
    });
    
  } catch (err) {
    console.error('Erreur ajout liste noire:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✏️ 4. MODIFIER UN CAS
app.put('/api/liste-noire/:id', authAdmin, async (req, res) => {
  try {
    const {
      motif,
      description,
      gravite,
      sanction,
      nombreAbsences,
      nombreRetards,
      nombreRapports,
      statut,
      parentsInformes
    } = req.body;
    
    const cas = await ListeNoire.findById(req.params.id);
    
    if (!cas) {
      return res.status(404).json({ message: 'Cas non trouvé' });
    }
    
    // Mise à jour des champs
    if (motif) cas.motif = motif;
    if (description) cas.description = description;
    if (gravite) cas.gravite = gravite;
    if (sanction) cas.sanction = sanction;
    if (nombreAbsences !== undefined) cas.nombreAbsences = nombreAbsences;
    if (nombreRetards !== undefined) cas.nombreRetards = nombreRetards;
    if (nombreRapports !== undefined) cas.nombreRapports = nombreRapports;
    if (statut) cas.statut = statut;
    if (parentsInformes !== undefined) {
      cas.parentsInformes = parentsInformes;
      if (parentsInformes) cas.dateInformationParents = new Date();
    }
    
    await cas.save();
    
    await cas.populate('etudiant', 'nomComplet email telephoneEtudiant image');
    await cas.populate('ajoutePar', 'nom prenom');
    
    res.json({
      message: 'Cas modifié avec succès',
      cas
    });
    
  } catch (err) {
    console.error('Erreur modification cas:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


// ✅ 5. RÉSOUDRE UN CAS
app.patch('/api/liste-noire/:id/resoudre', authAdmin, async (req, res) => {
  try {
    const { noteResolution } = req.body;
    
    const cas = await ListeNoire.findById(req.params.id);
    
    if (!cas) {
      return res.status(404).json({ message: 'Cas non trouvé' });
    }
    
    await cas.resoudre(noteResolution, req.adminId);
    
    await cas.populate('etudiant', 'nomComplet email telephoneEtudiant image');
    await cas.populate('resoluPar', 'nom prenom');
    
    res.json({
      message: 'Cas résolu avec succès',
      cas
    });
    
  } catch (err) {
    console.error('Erreur résolution cas:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 📝 6. AJOUTER UNE OBSERVATION
app.post('/api/liste-noire/:id/observation', authAdmin, async (req, res) => {
  try {
    const { texte } = req.body;
    
    if (!texte || texte.trim() === '') {
      return res.status(400).json({ message: 'Le texte de l\'observation est obligatoire' });
    }
    
    const cas = await ListeNoire.findById(req.params.id);
    
    if (!cas) {
      return res.status(404).json({ message: 'Cas non trouvé' });
    }
    
    await cas.ajouterObservation(texte, req.adminId);
    
    await cas.populate('observations.ajoutePar', 'nom prenom');
    
    res.json({
      message: 'Observation ajoutée avec succès',
      cas
    });
    
  } catch (err) {
    console.error('Erreur ajout observation:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🗑️ 7. SUPPRIMER UN CAS (ARCHIVER)
app.delete('/api/liste-noire/:id', authAdmin, async (req, res) => {
  try {
    const cas = await ListeNoire.findById(req.params.id);
    
    if (!cas) {
      return res.status(404).json({ message: 'Cas non trouvé' });
    }
    
    // Au lieu de supprimer, on archive
    cas.statut = 'archive';
    await cas.save();
    
    res.json({
      message: 'Cas archivé avec succès'
    });
    
  } catch (err) {
    console.error('Erreur suppression cas:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 📊 8. STATISTIQUES LISTE NOIRE
app.get('/api/liste-noire/stats/general', authAdmin, async (req, res) => {
  try {
    const { anneeScolaire } = req.query;
    
    let filter = {};
    if (anneeScolaire) filter.anneeScolaire = anneeScolaire;
    
    const stats = await ListeNoire.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCas: { $sum: 1 },
          casActifs: { 
            $sum: { $cond: [{ $eq: ['$statut', 'actif'] }, 1, 0] } 
          },
          casResolus: { 
            $sum: { $cond: [{ $eq: ['$statut', 'resolu'] }, 1, 0] } 
          },
          casGraves: { 
            $sum: { $cond: [{ $eq: ['$gravite', 'grave'] }, 1, 0] } 
          },
          casTresGraves: { 
            $sum: { $cond: [{ $eq: ['$gravite', 'tres_grave'] }, 1, 0] } 
          },
          totalAbsences: { $sum: '$nombreAbsences' },
          totalRetards: { $sum: '$nombreRetards' },
          totalRapports: { $sum: '$nombreRapports' }
        }
      }
    ]);
    
    // Stats par motif
    const statsParMotif = await ListeNoire.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$motif',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Stats par niveau
    const statsParNiveau = await ListeNoire.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$niveau',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      general: stats[0] || {
        totalCas: 0,
        casActifs: 0,
        casResolus: 0,
        casGraves: 0,
        casTresGraves: 0,
        totalAbsences: 0,
        totalRetards: 0,
        totalRapports: 0
      },
      parMotif: statsParMotif,
      parNiveau: statsParNiveau
    });
    
  } catch (err) {
    console.error('Erreur stats liste noire:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 🔍 9. VÉRIFIER SI UN ÉTUDIANT EST EN LISTE NOIRE
app.get('/api/liste-noire/etudiant/:etudiantId/check', authAdmin, async (req, res) => {
  try {
    const cas = await ListeNoire.findOne({
      etudiant: req.params.etudiantId,
      statut: { $in: ['actif', 'en_cours'] }
    }).populate('etudiant', 'nomComplet');
    
    res.json({
      estListeNoire: !!cas,
      cas: cas || null
    });
    
  } catch (err) {
    console.error('Erreur vérification liste noire:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

console.log('✅ Routes Liste Noire ajoutées');


app.get('/api/seances/professeur', authProfesseur, async (req, res) => {
  try {
    const seances = await Seance.find({ professeur: req.professeurId })
      .populate('professeur', 'nom') // Populate le professeur pour avoir le nom
      .sort({ jour: 1, heureDebut: 1 });

    res.json(seances);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// route: POST /api/professeurs/login
app.post('/api/professeurs/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const professeur = await Professeur.findOne({ email });
    if (!professeur) return res.status(404).json({ message: 'Professeur non trouvé' });

    const isValid = await professeur.comparePassword(motDePasse);
    if (!isValid) return res.status(401).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign({ id: professeur._id, role: 'prof' }, 'jwt_secret_key', { expiresIn: '7d' });

    res.json({ professeur, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// routes/professeurs.js
app.patch('/api/professeurs/:id/actif',authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const prof = await Professeur.findById(req.params.id);
    if (!prof) return res.status(404).json({ message: 'Professeur introuvable' });

    prof.actif = !prof.actif;
    await prof.save();

    res.json(prof); // ✅ نرجع بيانات الأستاذ المحدثة
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
app.get('/api/etudiant/profile', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId).select('-motDePasse'); // ✅ هنا التعديل
    if (!etudiant) return res.status(404).json({ message: 'Étudiant introuvable' });
    res.json(etudiant);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب الملف الشخصي', error: err.message });
  }
});
// Route pour mettre à jour le statut d'une présence
app.put('/api/presences/:id', authProfesseur, async (req, res) => {
  try {
    const { id } = req.params;
    const { present, retardMinutes, remarque } = req.body;

    // Vérifier que la présence existe et appartient à ce professeur
    const presence = await Presence.findOne({ _id: id, creePar: req.professeurId });
    
    if (!presence) {
      return res.status(404).json({ message: 'Présence non trouvée ou non autorisée.' });
    }

    // Mettre à jour les champs
    if (present !== undefined) {
      presence.present = present;
    }
    
    if (retardMinutes !== undefined) {
      presence.retardMinutes = Math.min(Math.max(retardMinutes, 0), 60);
      if (retardMinutes > 0) {
        presence.present = true; // Si retard, alors présent
      }
    }
    
    if (remarque !== undefined) {
      presence.remarque = remarque;
    }

    await presence.save();
    
    // Repopuler l'étudiant avant de renvoyer
    await presence.populate('etudiant', 'nomComplet');
    
    res.json(presence);
  } catch (err) {
    console.error('Erreur mise à jour présence:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ API pour créer/modifier une présence avec NOTIFICATIONS WHATSAPP

 // ✅ API PRESENCES - النسخة الصحيحة

app.post('/api/presences', authProfesseur, async (req, res) => {
  try {
    const { 
      etudiant, 
      cours, 
      dateSession, 
      present,
      retardMinutes,
      remarque, 
      heure, 
      periode 
    } = req.body;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 REQUÊTE PRÉSENCE REÇUE`);
    console.log(`   Étudiant: ${etudiant}`);
    console.log(`   Cours: ${cours}`);
    console.log(`   Date: ${dateSession}`);
    console.log(`   Heure: ${heure}`);
    console.log(`   Période: ${periode}`);
    console.log(`${'='.repeat(60)}\n`);

    // Vérifier que ce professeur enseigne ce cours
    const prof = await Professeur.findById(req.professeurId);
    if (!prof.cours.includes(cours)) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez pas marquer la présence pour ce cours.' 
      });
    }

    // Récupérer les données de l'étudiant
    const etudiantData = await Etudiant.findById(etudiant);
    if (!etudiantData) {
      return res.status(404).json({ message: 'Étudiant non trouvé.' });
    }

    console.log(`✅ Étudiant trouvé: ${etudiantData.nomComplet}`);
    console.log(`   Père: ${etudiantData.telephonePere || '❌ N/A'}`);
    console.log(`   Mère: ${etudiantData.telephoneMere || '❌ N/A'}`);
    console.log(`   Tél: ${etudiantData.telephoneEtudiant || '❌ N/A'}\n`);

    // ✅ CHERCHER UNE PRÉSENCE EXISTANTE (MÊME DATE/HEURE/PÉRIODE)
    const existingPresence = await Presence.findOne({
      etudiant: etudiant,
      cours: cours,
      dateSession: new Date(dateSession),
      heure: heure,
      periode: periode,
      creePar: req.professeurId
    });

    let finalPresent = present || false;
    let finalRetardMinutes = 0;
    let notificationQueued = false;
    let queueInfo = null;
    let isUpdate = false;

    // ========================================
    // 🟡 CAS 1 : RETARD
    // ========================================
    if (retardMinutes && retardMinutes > 0) {
      finalPresent = true;
      finalRetardMinutes = Math.min(retardMinutes, 60);
      
      console.log(`🟡 CAS RETARD: ${finalRetardMinutes} min | Période: ${periode}`);
      
      // ✅ SEULEMENT SI NOUVELLE PRÉSENCE
      if (!existingPresence) {
        console.log(`   ➜ NOUVELLE présence: Ajout à la queue`);
        queueInfo = await notificationQueue.ajouterNotification(
          'retard',
          etudiantData,
          cours,
          dateSession,
          {
            retardMinutes: finalRetardMinutes,
            remarque: remarque || '',
            periode: periode || '',        // ✅ AJOUTÉ
            creePar: req.professeurId
          }
        );
        notificationQueued = true;
      } else {
        console.log(`   ➜ PRÉSENCE EXISTANTE: Mise à jour seulement`);
        isUpdate = true;
      }
    } 
    // ========================================
    // 🔴 CAS 2 : ABSENCE
    // ========================================
    else if (!present) {
      finalPresent = false;
      finalRetardMinutes = 0;
      
      console.log(`🔴 CAS ABSENCE | Période: ${periode}`);
      
      // ✅ SEULEMENT SI NOUVELLE PRÉSENCE
      if (!existingPresence) {
        console.log(`   ➜ NOUVELLE présence: Ajout à la queue`);
        queueInfo = await notificationQueue.ajouterNotification(
          'absence',
          etudiantData,
          cours,
          dateSession,
          {
            remarque: remarque || '',
            periode: periode || '',        // ✅ AJOUTÉ
            creePar: req.professeurId
          }
        );
        notificationQueued = true;
        console.log(`   ✅ Notification ajoutée à la queue [${periode}]\n`);
      } else {
        console.log(`   ➜ PRÉSENCE EXISTANTE: Mise à jour seulement\n`);
        isUpdate = true;
      }
    }
    // ========================================
    // ✅ CAS 3 : PRÉSENT
    // ========================================
    else if (present) {
      finalPresent = true;
      finalRetardMinutes = 0;
      console.log(`✅ CAS PRÉSENT - Pas de notification\n`);
    }

    let presence;

    // ✅ SI PRÉSENCE EXISTE : METTRE À JOUR
    if (existingPresence) {
      console.log(`🔄 MISE À JOUR présence existante`);
      existingPresence.present = finalPresent;
      existingPresence.retardMinutes = finalRetardMinutes;
      existingPresence.remarque = remarque;
      existingPresence.matiere = prof.matiere;
      existingPresence.nomProfesseur = prof.nom;
      
      presence = await existingPresence.save();
      console.log(`   ✅ Mise à jour réussie\n`);
    } 
    // ✅ SI NOUVELLE : CRÉER
    else {
      console.log(`➕ CRÉATION nouvelle présence`);
      presence = new Presence({
        etudiant,
        cours,
        dateSession: new Date(dateSession),
        present: finalPresent,
        retardMinutes: finalRetardMinutes,
        remarque,
        heure,
        periode,
        creePar: req.professeurId,
        matiere: prof.matiere,
        nomProfesseur: prof.nom   
      });

      await presence.save();
      console.log(`   ✅ Création réussie\n`);
    }

    // ✅ RÉPONSE IMMÉDIATE
    const response = {
      success: true,
      presence,
      action: isUpdate ? 'updated' : 'created',
      notification: notificationQueued ? {
        statut: 'en_file',
        message: 'Notification ajoutée à la file d\'attente',
        positionQueue: queueInfo.positionQueue,
        estimationEnvoi: `${Math.round(queueInfo.positionQueue * 5)} secondes`,
        periode: periode   // ✅ info dans la réponse aussi
      } : {
        statut: isUpdate ? 'mise_a_jour' : 'aucune',
        message: isUpdate ? 'Présence mise à jour (pas de notification pour mise à jour)' : 'Étudiant présent à l\'heure'
      }
    };

    console.log(`📤 RÉPONSE:`);
    console.log(`   Action: ${response.action}`);
    console.log(`   Notification: ${response.notification.statut}`);
    console.log(`   Période: ${periode}`);
    console.log(`${'='.repeat(60)}\n`);

    res.status(201).json(response);

  } catch (err) {
    console.error('\n❌ ERREUR:');
    console.error(err);
    console.error(`${'='.repeat(60)}\n`);
    
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});
// ========================================
// 📊 ROUTE POUR DÉBOGUER LA QUEUE
// ========================================
app.get('/api/notifications/queue/debug', authProfesseur, (req, res) => {
  const stats = notificationQueue.getStats();
  res.json({
    success: true,
    stats,
    queue: notificationQueue.queue.map(n => ({
      id: n.id,
      type: n.type,
      etudiant: n.etudiantData.nomComplet,
      telephone_pere: n.etudiantData.telephonePere || '❌',
      telephone_mere: n.etudiantData.telephoneMere || '❌',
      timestamp: n.timestamp
    }))
  });
});

// ========================================
// 🗑️ ROUTE POUR NETTOYER LES ANCIENNES PRESENCES
// ========================================
app.delete('/api/presences/cleanup', authProfesseur, async (req, res) => {
  try {
    const result = await Presence.deleteMany({
      creePar: req.professeurId,
      createdAt: {
        $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Plus de 24h
      }
    });

    res.json({
      success: true,
      message: `${result.deletedCount} presences supprimées`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
// Historique des notifications
app.get('/api/notifications', authProfesseur, async (req, res) => {
  const { etudiant, type, dateDebut, dateFin } = req.query;
  
  const filter = { creePar: req.professeurId };
  if (etudiant) filter.etudiant = etudiant;
  if (type) filter.type = type;
  if (dateDebut || dateFin) {
    filter.dateSession = {};
    if (dateDebut) filter.dateSession.$gte = new Date(dateDebut);
    if (dateFin) filter.dateSession.$lte = new Date(dateFin);
  }
  
  const notifications = await Notification.find(filter)
    .populate('etudiant', 'nomComplet niveau')
    .sort({ createdAt: -1 })
    .limit(100);
  
  res.json({ success: true, notifications });
});

// Statistiques
app.get('/api/notifications/statistiques', authProfesseur, async (req, res) => {
  const stats = await Notification.getStatistiques(req.professeurId);
  res.json({ success: true, stats });
});

// Réessayer les échecs
app.post('/api/notifications/:id/retry', authProfesseur, async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return res.status(404).json({ message: 'Notification non trouvée' });
  }
  
  await notification.reessayerEchecs();
  
  // Rajouter à la queue
  await notificationQueue.ajouterNotification(
    notification.type,
    await Etudiant.findById(notification.etudiant),
    notification.cours,
    notification.dateSession,
    {
      retardMinutes: notification.retardMinutes,
      remarque: notification.remarque,
      creePar: notification.creePar
    }
  );
  
  res.json({ success: true, message: 'Notification ajoutée à la queue' });
});


// ========================================
// 📊 ROUTE POUR VOIR L'ÉTAT DE LA QUEUE
// ========================================
app.get('/api/notifications/queue/stats', authProfesseur, (req, res) => {
  const stats = notificationQueue.getStats();
  res.json({
    success: true,
    stats
  });
});

// ✅ 1️⃣ API pour récupérer SEULEMENT les PRÉSENCES (sans retards)
app.get('/api/etudiant/presences', authEtudiant, async (req, res) => {
  try {
    const presences = await Presence.find({ 
      etudiant: req.etudiantId, 
      present: true,
      retardMinutes: 0  // Présent ET sans retard
    });
    res.json(presences);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب بيانات الحضور', error: err.message });
  }
});

// ✅ 2️⃣ API pour récupérer SEULEMENT les ABSENCES
app.get('/api/etudiant/absences', authEtudiant, async (req, res) => {
  try {
    const absences = await Presence.find({ 
      etudiant: req.etudiantId, 
      present: false  // Absent
    });
    res.json(absences);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب بيانات الغيابات', error: err.message });
  }
});

// ✅ 3️⃣ API pour récupérer SEULEMENT les RETARDS
app.get('/api/etudiant/retards', authEtudiant, async (req, res) => {
  try {
    const retards = await Presence.find({ 
      etudiant: req.etudiantId, 
      present: true,           // Présent
      retardMinutes: { $gt: 0 } // MAIS avec retard > 0 minutes
    });
    res.json(retards);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب بيانات التأخير', error: err.message });
  }
});

// 🆕 API complète avec statistiques détaillées
app.get('/api/etudiant/presences/stats', authEtudiant, async (req, res) => {
  try {
    const presences = await Presence.find({ etudiant: req.etudiantId })
      .sort({ dateSession: -1 });
    
    // 📊 Calcul des statistiques
    const stats = {
      total: presences.length,
      presents: presences.filter(p => p.present && p.retardMinutes === 0).length,
      absents: presences.filter(p => !p.present).length,
      retards: presences.filter(p => p.present && p.retardMinutes > 0).length,
      totalRetardMinutes: presences
        .filter(p => p.retardMinutes > 0)
        .reduce((sum, p) => sum + p.retardMinutes, 0)
    };

    // 📈 Calcul du pourcentage
    if (stats.total > 0) {
      stats.pourcentagePresence = Math.round(
        ((stats.presents + stats.retards) / stats.total) * 100
      );
      stats.pourcentageRetard = Math.round(
        (stats.retards / stats.total) * 100
      );
    }

    res.json({
      presences,
      stats
    });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب الإحصائيات', error: err.message });
  }
});

// 🆕 API pour les professeurs - voir les retards par cours
app.get('/api/professeur/retards/:cours', authProfesseur, async (req, res) => {
  try {
    const { cours } = req.params;
    const { date } = req.query; // Filtrer par date si fournie
    
    // ✅ تحقق أن الأستاذ يدرّس هذا الكورس
    const prof = await Professeur.findById(req.professeurId);
    if (!prof.cours.includes(cours)) {
      return res.status(403).json({ message: '❌ Accès non autorisé à ce cours.' });
    }

    let query = { 
      cours, 
      present: true,
      retardMinutes: { $gt: 0 }
    };

    // Filtrer par date si spécifiée
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.dateSession = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const retards = await Presence.find(query)
      .populate('etudiant', 'nom prenom')
      .sort({ dateSession: -1, retardMinutes: -1 });

    res.json(retards);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب بيانات التأخير', error: err.message });
  }
});

// 🆕 API pour modifier une présence existante
app.put('/api/presences/:id', authProfesseur, async (req, res) => {
  try {
    const { id } = req.params;
    const { present, retardMinutes, remarque } = req.body;

    const presence = await Presence.findById(id);
    if (!presence) {
      return res.status(404).json({ message: '❌ Présence non trouvée.' });
    }

    // ✅ تحقق أن الأستاذ يملك الصلاحية
    const prof = await Professeur.findById(req.professeurId);
    if (!prof.cours.includes(presence.cours)) {
      return res.status(403).json({ message: '❌ Accès non autorisé.' });
    }

    // 🆕 Logique de mise à jour
    if (retardMinutes && retardMinutes > 0) {
      presence.present = true; // En retard = présent
      presence.retardMinutes = Math.min(retardMinutes, 60);
    } else if (present) {
      presence.present = true;
      presence.retardMinutes = 0; // Pas de retard
    } else {
      presence.present = false;
      presence.retardMinutes = 0; // Absent = pas de retard
    }

    if (remarque !== undefined) {
      presence.remarque = remarque;
    }

    await presence.save();
    res.json(presence);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Route DELETE pour supprimer une présence (Admin seulement)
app.delete('/api/presences/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    const presence = await Presence.findById(id);
    if (!presence) {
      return res.status(404).json({ message: 'Présence non trouvée.' });
    }

    await Presence.findByIdAndDelete(id);
    res.json({ message: 'Présence supprimée avec succès.' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





app.put('/api/admin/presences/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { present, retardMinutes, remarque } = req.body;

    // ✅ Convertir present en boolean (peut arriver comme string "true"/"false")
    const presentBool = present === true || present === 'true';

    // Trouver la présence + données étudiant
    const presence = await Presence.findById(id).populate('etudiant');
    if (!presence) {
      return res.status(404).json({ message: 'Présence non trouvée.' });
    }

    const etudiantData = presence.etudiant;
    const periode = presence.periode || '';

    // ── Sauvegarder l'ancien statut pour comparer ──
    const ancienStatut = {
      present: presence.present,
      retardMinutes: presence.retardMinutes
    };

    // ========================================
    // Mise à jour de la présence
    // ========================================
    if (retardMinutes && retardMinutes > 0) {
      // CAS RETARD avec minutes
      presence.present       = true;
      presence.retardMinutes = Math.max(15, Math.min(Number(retardMinutes), 60));

    } else if (presentBool) {
      // ✅ CAS ABSENT → PRÉSENT (sans retard spécifié)
      presence.present       = true;
      presence.retardMinutes = 15; // ✅ auto 15 min en BDD

    } else {
      // CAS ABSENT
      presence.present       = false;
      presence.retardMinutes = 0;
    }

    if (remarque !== undefined) {
      presence.remarque = remarque;
    }

    // ✅ UN SEUL save - tout est déjà correct ici
    await presence.save();

    // ── Nouveau statut après sauvegarde ──
    const nouveauStatut = {
      present:       presence.present,
      retardMinutes: presence.retardMinutes
    };

    const statutChange =
      ancienStatut.present       !== nouveauStatut.present ||
      ancienStatut.retardMinutes !== nouveauStatut.retardMinutes;

    // ========================================
    // LOGIQUE NOTIFICATIONS
    //
    //  absent  → présent (15min auto) : message RETARD 15 min
    //  absent  → retard X min         : message RETARD X min
    //  présent → absent               : message ABSENCE
    //  présent → retard               : message RETARD
    //  inchangé                       : rien
    // ========================================
    let typeNotif   = null;
    let retardFinal = nouveauStatut.retardMinutes;

    if (statutChange) {
      if (nouveauStatut.retardMinutes > 0) {
        // → Retard (avec minutes)
        typeNotif = 'retard';

      } else if (!nouveauStatut.present) {
        // → Absent
        typeNotif = 'absence';
      }
      // présent + retard=0 ne devrait plus arriver avec la logique ci-dessus
    }

    // ── Envoyer notification si nécessaire ──
    if (typeNotif) {
      setImmediate(async () => {
        try {
          if (typeNotif === 'retard') {
            console.log(`📤 [Admin] RETARD [${periode}] → ${etudiantData.nomComplet} (${retardFinal} min)`);
            await notificationQueue.ajouterNotification(
              'retard',
              etudiantData,
              presence.cours,
              presence.dateSession,
              {
                retardMinutes: retardFinal,
                remarque:      presence.remarque || '',
                periode:       periode,
                creePar:       req.adminId || null
              }
            );
          } else {
            console.log(`📤 [Admin] ABSENCE [${periode}] → ${etudiantData.nomComplet}`);
            await notificationQueue.ajouterNotification(
              'absence',
              etudiantData,
              presence.cours,
              presence.dateSession,
              {
                remarque: presence.remarque || '',
                periode:  periode,
                creePar:  req.adminId || null
              }
            );
          }
        } catch (notifErr) {
          console.error(`❌ [Admin] Erreur notification:`, notifErr.message);
        }
      });

      // ✅ Recharger depuis BDD → données fraîches (present=true, retardMinutes=15)
      const presenceFraiche = await Presence.findById(id);

      return res.json({
        success: true,
        presence: presenceFraiche,
        notification: {
          statut:  'envoi_en_cours',
          type:    typeNotif,
          periode: periode,
          message: typeNotif === 'retard'
            ? `Message retard (${retardFinal} min) [${periode}] envoyé aux parents`
            : `Message absence [${periode}] envoyé aux parents`
        }
      });
    }

    // Pas de notification
    const presenceFraiche = await Presence.findById(id);
    res.json({
      success:  true,
      presence: presenceFraiche,
      notification: {
        statut:  'aucune',
        message: 'Statut inchangé - pas de notification'
      }
    });

  } catch (err) {
    console.error('❌ Erreur PUT /api/admin/presences:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// 🆕 API pour obtenir un résumé des présences par cours
app.get('/api/professeur/resume/:cours', authProfesseur, async (req, res) => {
  try {
    const { cours } = req.params;
    
    const prof = await Professeur.findById(req.professeurId);
    if (!prof.cours.includes(cours)) {
      return res.status(403).json({ message: '❌ Accès non autorisé.' });
    }

    const presences = await Presence.find({ cours })
      .populate('etudiant', 'nom prenom');

    // 📊 Grouper par étudiant
    const resumeParEtudiant = {};
    
    presences.forEach(p => {
      const etudiantId = p.etudiant._id.toString();
      
      if (!resumeParEtudiant[etudiantId]) {
        resumeParEtudiant[etudiantId] = {
          etudiant: p.etudiant,
          total: 0,
          presents: 0,
          absents: 0,
          retards: 0,
          totalRetardMinutes: 0
        };
      }
      
      const stats = resumeParEtudiant[etudiantId];
      stats.total++;
      
      if (p.present) {
        if (p.retardMinutes > 0) {
          stats.retards++;
          stats.totalRetardMinutes += p.retardMinutes;
        } else {
          stats.presents++;
        }
      } else {
        stats.absents++;
      }
    });

    // 📈 Convertir en array et ajouter pourcentages
    const resume = Object.values(resumeParEtudiant).map(stats => ({
      ...stats,
      pourcentagePresence: stats.total > 0 ? 
        Math.round(((stats.presents + stats.retards) / stats.total) * 100) : 0,
      pourcentageRetard: stats.total > 0 ? 
        Math.round((stats.retards / stats.total) * 100) : 0
    }));

    res.json(resume);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🆕 API pour marquer plusieurs présences en même temps
app.post('/api/presences/batch', authProfesseur, async (req, res) => {
  try {
    const { cours, dateSession, periode, presences } = req.body;
    // presences = [{ etudiant: "id", present: true, retardMinutes: 5 }, ...]

    const prof = await Professeur.findById(req.professeurId);
    if (!prof.cours.includes(cours)) {
      return res.status(403).json({ message: '❌ Accès non autorisé à ce cours.' });
    }

    const resultats = [];

    for (const data of presences) {
      let finalPresent = data.present || false;
      let finalRetardMinutes = 0;

      if (data.retardMinutes && data.retardMinutes > 0) {
        finalPresent = true;
        finalRetardMinutes = Math.min(data.retardMinutes, 60);
      } else if (data.present) {
        finalRetardMinutes = 0;
      }

      const presence = new Presence({
        etudiant: data.etudiant,
        cours,
        dateSession: new Date(dateSession),
        present: finalPresent,
        retardMinutes: finalRetardMinutes,
        remarque: data.remarque,
        periode,
        creePar: req.professeurId,
        matiere: prof.matiere,
        nomProfesseur: prof.nom
      });

      await presence.save();
      resultats.push(presence);
    }

    res.status(201).json({
      message: `✅ ${resultats.length} présences enregistrées`,
      presences: resultats
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 💰 الدفعات
app.get('/api/etudiant/paiements', authEtudiant, async (req, res) => {
  try {
    const paiements = await Paiement.find({ etudiant: req.etudiantId });
    res.json(paiements);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب بيانات الدفعات', error: err.message });
  }
});



app.delete('/api/professeurs/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    await Professeur.findByIdAndDelete(req.params.id);
    res.json({ message: 'Professeur supprimé avec succès' });
  } catch (err) {
    console.error('❌ Erreur suppression:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression', error: err.message });
  }
});

app.get('/api/presences/:etudiantId', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const result = await Presence.find({ etudiant: req.params.etudiantId }).sort({ dateSession: -1 });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Route publique pour afficher les infos d'un étudiant via QR code
app.get('/etudiant/:id', async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id)
      .select('-motDePasse -__v'); // Exclure le mot de passe

    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Retourner les informations de l'étudiant
    res.json(etudiant);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'étudiant:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.get('/api/presences/etudiant/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const presences = await Presence.find({ etudiant: req.params.id }).sort({ dateSession: -1 });
    res.json(presences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Routes minimales pour SuiviAssiduiteEtudiants.jsx
// À ajouter directement dans app.js

// ============================================
// ROUTES SUIVI ASSIDUITÉS
// ============================================

// GET tous les étudiants
app.get('/api/suivi-assiduites/etudiants', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiants = await Etudiant.find({ hidden: { $ne: true } })
      .select('_id nomComplet email niveau cours anneeScolaire')
      .sort({ nomComplet: 1 });
    
    res.json(etudiants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET toutes les présences
app.get('/api/suivi-assiduites/presences', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const presences = await Presence.find()
      .select('etudiant cours dateSession present retardMinutes periode')
      .lean();
    
    res.json(presences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tous les rapports
app.get('/api/suivi-assiduites/rapports', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const rapports = await Rapport.find()
      .select('etudiant cours date descriptionIncident natureProbleme')
      .lean();
    
    res.json(rapports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET présences d'un étudiant
app.get('/api/suivi-assiduites/presences/etudiant/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const presences = await Presence.find({ etudiant: req.params.id }).sort({ dateSession: -1 });
    res.json(presences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET rapports d'un étudiant
app.get('/api/suivi-assiduites/rapports/etudiant/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const rapports = await Rapport.find({ etudiant: req.params.id })
      .populate('professeur', 'nomComplet')
      .sort({ date: -1 });
    
    res.json(rapports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Modifier un étudiant

// Route pour rechercher des étudiants
// Nouvelle route de recherche utilisant la logique existante
// Route de recherche simple qui évite les erreurs MongoDB
app.get('/api/etudiants/search', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Recherche pour:', q); // Debug
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Version simple sans regex qui peut causer des erreurs
    const students = await Etudiant.find({})
      .select('nomComplet nom email cours _id')
      .limit(50);

    console.log('Étudiants trouvés:', students.length); // Debug

    // Filtrer en JavaScript plutôt qu'avec MongoDB regex
    const filtered = students.filter(student => {
      const nomComplet = (student.nomComplet || '').toLowerCase();
      const nom = (student.nom || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      const queryLower = q.toLowerCase();
      
      return nomComplet.includes(queryLower) ||
             nom.includes(queryLower) ||
             email.includes(queryLower);
    }).slice(0, 20);

    res.json(filtered);
  } catch (err) {
    console.error('ERREUR COMPLÈTE:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Route pour l'historique d'un étudiant
app.get('/api/presences/student/:studentId', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const presences = await Presence.find({ etudiant: studentId })
      .populate('etudiant', 'nomComplet nom email cours')
      .sort({ dateSession: -1 });

    res.json(presences);
  } catch (err) {
    console.error('Erreur historique étudiant:', err);
    res.status(500).json({ error: err.message });
  }
});
// Route pour obtenir tous les professeurs (pour la sélection)
app.get('/api/professeurs/tous', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeurs = await Professeur.find({ actif: true })
      .select('nom matiere cours email')
      .sort({ nom: 1 });
    res.json(professeurs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour obtenir les étudiants d'un cours spécifique
app.get('/api/etudiants/par-cours/:coursNom', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const coursNom = req.params.coursNom;
    const etudiants = await Etudiant.find({ 
      cours: coursNom,
      actif: true 
    }).select('nomComplet email cours');
    
    res.json(etudiants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Route pour créer présence en tant qu'admin/inscripteur

app.post('/api/presences/manuel', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { 
      professeurId,
      etudiant, 
      cours, 
      dateSession, 
      present,
      retardMinutes,
      remarque, 
      heure, 
      periode 
    } = req.body;

    // Vérifier que le professeur existe et enseigne ce cours
    const prof = await Professeur.findById(professeurId);
    if (!prof) {
      return res.status(404).json({ message: 'Professeur introuvable.' });
    }
    
    if (!prof.cours.includes(cours)) {
      return res.status(403).json({ message: 'Ce professeur n\'enseigne pas ce cours.' });
    }

    // Vérifier si déjà enregistré
    const existingPresence = await Presence.findOne({
      etudiant: etudiant,
      cours: cours,
      dateSession: new Date(dateSession),
      heure: heure,
      periode: periode
    });

    if (existingPresence) {
      return res.status(409).json({ 
        message: 'Cet étudiant est déjà enregistré pour cette séance.' 
      });
    }

    // Logique retard
    let finalPresent = present || false;
    let finalRetardMinutes = 0;

    if (retardMinutes && retardMinutes > 0) {
      finalPresent = true;
      finalRetardMinutes = Math.min(retardMinutes, 60);
    } else if (present) {
      finalRetardMinutes = 0;
    }

    // Créer présence avec creePar = admin/inscripteur actuel
    const presence = new Presence({
      etudiant,
      cours,
      dateSession: new Date(dateSession),
      present: finalPresent,
      retardMinutes: finalRetardMinutes,
      remarque,
      heure,
      periode,
      creePar: req.userId, // ID de l'admin/inscripteur
      matiere: prof.matiere,
      nomProfesseur: prof.nom   
    });

    await presence.save();
    res.status(201).json(presence);

  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: err.message });
  }
});
// Lister les cours
// Récupérer un seul cours avec détails
// 📌 Route: GET /api/cours/:id
// ✅ Lister tous les cours (IMPORTANT!)
app.get('/api/cours', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const cours = await Cours.find();
    res.json(cours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// routes/professeur.js أو في ملف Express المناسب
app.get('/api/admin/professeurs-par-cours/:coursNom', async (req, res) => {
  try {
    const coursNom = req.params.coursNom;

    const profs = await Professeur.find({ cours: coursNom }).select('_id nom matiere');
    res.json(profs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/professeur/profile', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId).select('-motDePasse');
    if (!professeur) return res.status(404).json({ message: 'Professeur introuvable' });
    res.json(professeur);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ROUTE: Statut aujourd'hui - ÉGALEMENT ADAPTÉE
app.get('/api/professeur/statut-aujourd-hui', authProfesseur, async (req, res) => {
  try {
    console.log('=== ROUTE STATUT AUJOURD\'HUI ===');
    
    // ✅ Le professeur est déjà récupéré par le middleware
    const professeur = req.professeur;
    
    console.log('Professeur récupéré:', professeur.nom);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const pointageAujourdhui = await Pointage.findOne({
      professeur: professeur._id,
      date: { $gte: today, $lt: tomorrow }
    });
    
    res.json({
      success: true,
      professeur: {
        nom: professeur.nom,
        email: professeur.email,
        matiere: professeur.matiere
      },
      pointageAujourdhui: pointageAujourdhui ? {
        heure: pointageAujourdhui.heure,
        statut: pointageAujourdhui.statut,
        date: pointageAujourdhui.date.toLocaleDateString('fr-FR')
      } : null,
      aPointe: !!pointageAujourdhui
    });
    
  } catch (error) {
    console.error('❌ ERREUR ROUTE STATUT:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: error.message
    });
  }
});




// 3. ADMIN - Voir tous les pointages du jour
app.get('/api/admin/pointages', authAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    
    // Date par défaut = aujourd'hui
    let dateRecherche = date ? new Date(date) : new Date();
    dateRecherche.setHours(0, 0, 0, 0);
    
    const finJour = new Date(dateRecherche);
    finJour.setHours(23, 59, 59, 999);
    
    // Récupérer tous les pointages du jour
    const pointages = await Pointage.find({
      date: {
        $gte: dateRecherche,
        $lte: finJour
      }
    }).populate('professeur', 'nom email matiere').sort({ createdAt: -1 });
    
    // Récupérer tous les professeurs pour voir qui n'a pas pointé
    const tousProfesseurs = await Professeur.find({ actif: true });
    const professeursPointes = pointages.map(p => p.professeur._id.toString());
    const professeursAbsents = tousProfesseurs.filter(p => 
      !professeursPointes.includes(p._id.toString())
    );
    
    // Statistiques
    const stats = {
      date: dateRecherche.toLocaleDateString('fr-FR'),
      totalProfesseurs: tousProfesseurs.length,
      presents: pointages.filter(p => p.statut === 'présent').length,
      retards: pointages.filter(p => p.statut === 'retard').length,
      absents: professeursAbsents.length,
      tauxPresence: tousProfesseurs.length > 0 ? 
        Math.round((pointages.length / tousProfesseurs.length) * 100) : 0
    };
    
    res.json({
      success: true,
      stats: stats,
      pointages: pointages,
      professeursAbsents: professeursAbsents.map(p => ({
        nom: p.nom,
        email: p.email,
        matiere: p.matiere
      }))
    });
    
  } catch (error) {
    console.error('Erreur récupération pointages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des pointages'
    });
  }
});

// 4. ADMIN - Voir les QR codes actifs
app.get('/api/admin/qr-codes-actifs', authAdmin, async (req, res) => {
  try {
    const qrCodesActifs = await QRCode.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    const qrCodesFormates = qrCodesActifs.map(qr => ({
      id: qr.qrId,
      description: qr.description,
      createdAt: qr.createdAt,
      expiresAt: qr.expiresAt,
      scansCount: qr.scansCount,
      tempsRestant: qr.getTimeRemaining(),
      dataURL: qr.dataURL
    }));
    
    res.json({
      success: true,
      qrCodesActifs: qrCodesFormates,
      total: qrCodesFormates.length
    });
    
  } catch (error) {
    console.error('Erreur récupération QR codes actifs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des QR codes'
    });
  }
});

// 5. ADMIN - Supprimer un QR code
app.delete('/api/admin/qr-code/:qrId', authAdmin, async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const qrCode = await QRCode.findOneAndUpdate(
      { qrId: qrId },
      { isActive: false },
      { new: true }
    );
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'QR code désactivé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur suppression QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du QR code'
    });
  }
});



app.get('/api/cours/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const cours = await Cours.findById(req.params.id).populate('creePar', 'nom email');
    if (!cours) return res.status(404).json({ message: 'Cours introuvable' });
    res.json(cours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Lister tous les professeurs (Admin OU Inscripteur)
app.get('/api/professeurs', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeurs = await Professeur.find()
      .select('-motDePasse')
      .populate('creeParAdmin', 'nom email')
      .populate('creeParInscripteur', 'nom email')
      .sort({ createdAt: -1 });
    
    res.json(professeurs);
  } catch (err) {
    console.error('Erreur lors de l\'affichage des professeurs:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Obtenir un professeur spécifique (Admin OU Inscripteur)
app.get('/api/professeurs/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.params.id)
      .select('-motDePasse')
      .populate('creeParAdmin', 'nom email')
      .populate('creeParInscripteur', 'nom email');
    
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }
    
    res.json(professeur);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// Dashboard inscripteur avec statistiques complètes
app.get('/api/inscripteur/dashboard', authInscripteur, async (req, res) => {
  try {
    const inscripteur = await Inscripteur.findById(req.inscripteurId).select('-motDePasse');
    
    // Statistiques complètes (pas seulement ce qu'il a créé)
    const [
      totalEtudiants,
      etudiantsActifs,
      totalProfesseurs,
      professeursActifs,
      totalCours,
      etudiantsCreesParInscripteur,
      professeursCreesParInscripteur
    ] = await Promise.all([
      Etudiant.countDocuments(),
      Etudiant.countDocuments({ actif: true }),
      Professeur.countDocuments(),
      Professeur.countDocuments({ actif: true }),
      Cours.countDocuments(),
      Etudiant.countDocuments({ creeParInscripteur: req.inscripteurId }),
      Professeur.countDocuments({ creeParInscripteur: req.inscripteurId })
    ]);
    
    res.json({ 
      message: 'Dashboard inscripteur',
      inscripteur,
      statistiques: {
        // Stats globales
        totalEtudiants,
        etudiantsActifs,
        totalProfesseurs,
        professeursActifs,
        totalCours,
        // Stats personnelles
        mesCreations: {
          etudiants: etudiantsCreesParInscripteur,
          professeurs: professeursCreesParInscripteur
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Enhanced API route with pagination
app.get('/api/actualites', async (req, res) => {
  try {
    const { category, search, sortBy, page = 1, limit = 5 } = req.query;

    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { excerpt: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const total = await Actualite.countDocuments(query);
    
    // Fetch actualités with pagination
    const actualites = await Actualite.find(query)
      .sort({ isPinned: -1, date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      actualites,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + actualites.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// Route pour modifier uniquement les infos financières
app.patch('/api/etudiants/:id/finance', authAdminOrPaiementManager, async (req, res) => {
  try {
    const { prixTotal, paye, pourcentageBourse, typePaiement } = req.body;
    
    const updateData = {};
    if (prixTotal !== undefined) updateData.prixTotal = parseFloat(prixTotal);
    if (paye !== undefined) updateData.paye = Boolean(paye);
    if (pourcentageBourse !== undefined) updateData.pourcentageBourse = parseFloat(pourcentageBourse);
    if (typePaiement) updateData.typePaiement = typePaiement;
    
    const etudiant = await Etudiant.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    
    res.json({
      message: 'Informations financières mises à jour',
      etudiant: etudiant
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// Route pour récupérer étudiants avec filtrage selon le rôle
app.get('/api/etudiants/filtered', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const userRole = req.userRole;
    
    let selectFields = '-motDePasse';
    
    if (userRole === 'inscripteur') {
      selectFields = '-motDePasse -prixTotal -paye -pourcentageBourse -typePaiement -dateReglement';
    }
    
    const etudiants = await Etudiant.find()
      .select(selectFields)
      .populate('creeParAdmin', 'nom email')
      .populate('creeParInscripteur', 'nom email')
      .sort({ createdAt: -1 });
    
    res.json(etudiants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/actualites', authAdminOrPaiementManager, upload.single('image'), async (req, res) => {
  try {
    const { title, excerpt, content, category, author, date, tags, type, isPinned } = req.body;

    const nouvelleActualite = new Actualite({
      title,
      excerpt,
      content,
      category,
      author,
      date: date || new Date(),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      type,
      isPinned: isPinned === 'true',
      image: req.file ? `/uploads/${req.file.filename}` : ''
    });

    await nouvelleActualite.save();
    res.status(201).json(nouvelleActualite);
  } catch (err) {
    res.status(400).json({ message: 'Erreur ajout actualité', error: err.message });
  }
});
app.delete('/api/actualites/:id', authAdminOrPaiementManager, async (req, res) => {
  try {
    const deleted = await Actualite.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Actualité non trouvée' });
    }
    res.json({ message: 'Actualité supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
});
// ✏️ تعديل actualité
app.put('/api/actualites/:id', authAdminOrPaiementManager, upload.single('image'), async (req, res) => {
  try {
    const { title, excerpt, content, category, author, date, tags, type, isPinned } = req.body;

    const actualisation = {
      title,
      excerpt,
      content,
      category,
      author,
      date: date || new Date(),
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      type,
      isPinned: isPinned === 'true'
    };

    if (req.file) {
      actualisation.image = `/uploads/${req.file.filename}`;
    }

    const updated = await Actualite.findByIdAndUpdate(req.params.id, actualisation, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Actualité non trouvée' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erreur mise à jour', error: err.message });
  }
});

const mettreAJourStatutPaiement = async (etudiantId) => {
  const etudiant = await Etudiant.findById(etudiantId);
  if (!etudiant) return;

  const paiements = await Paiement.find({ etudiant: etudiantId });
  const totalPaye = paiements.reduce((acc, p) => acc + p.montant, 0);
  
  // Calculer montant après bourse
  const reduction = (etudiant.prixTotal * etudiant.pourcentageBourse) / 100;
  const montantAPayer = etudiant.prixTotal - reduction;
  
  // Auto marquer comme payé si complet
  if (totalPaye >= montantAPayer && montantAPayer > 0) {
    await Etudiant.findByIdAndUpdate(etudiantId, { paye: true });
  } else {
    await Etudiant.findByIdAndUpdate(etudiantId, { paye: false });
  }
};

// 2️⃣ REMPLACER votre route POST /api/paiements par ça :
app.post('/api/paiements', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    // 🔍 DEBUG - Afficher ce qu'on reçoit
    console.log('🔍 Données reçues:', req.body);
    console.log('🔍 Admin ID:', req.admin?.id);
    
    // ✅ VALIDATION des champs requis
    const { etudiant, cours, moisDebut, nombreMois, montant } = req.body;
    
    if (!etudiant) {
      return res.status(400).json({ error: 'etudiant est requis' });
    }
    if (!cours) {
      return res.status(400).json({ error: 'cours est requis' });
    }
    if (!moisDebut) {
      return res.status(400).json({ error: 'moisDebut est requis' });
    }
    if (!nombreMois || nombreMois <= 0) {
      return res.status(400).json({ error: 'nombreMois doit être > 0' });
    }
    if (!montant || montant <= 0) {
      return res.status(400).json({ error: 'montant doit être > 0' });
    }

    // ✅ Créer le paiement
    const nouveauPaiement = new Paiement({
      etudiant,
      cours,
      moisDebut: new Date(moisDebut), // S'assurer que c'est une date
      nombreMois: parseInt(nombreMois), // S'assurer que c'est un nombre
      montant: parseFloat(montant), // S'assurer que c'est un nombre
      note: req.body.note || '',
      creePar: req.admin?.id
    });

    console.log('💾 Paiement à sauvegarder:', nouveauPaiement);
    
    const paiementSauvegarde = await nouveauPaiement.save();
    console.log('✅ Paiement sauvegardé:', paiementSauvegarde._id);
    
    // 🎯 AUTO UPDATE PAYÉ STATUS
    await mettreAJourStatutPaiement(etudiant);
    console.log('✅ Statut mis à jour pour étudiant:', etudiant);

    res.status(201).json({
      success: true,
      message: 'Paiement ajouté et statut mis à jour',
      paiement: paiementSauvegarde
    });

  } catch (err) {
    // 🚨 AFFICHER L'ERREUR COMPLÈTE
    console.error('❌ Erreur complète:', err);
    console.error('❌ Message:', err.message);
    console.error('❌ Stack:', err.stack);
    
    res.status(400).json({ 
      error: err.message,
      details: err.errors ? Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      })) : null
    });
  }
});
app.get('/public/:id', async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.params.id)
      .select('-motDePasse -__v'); // Exclure le mot de passe

    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Retourner les informations de l'étudiant
    res.json(etudiant);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'étudiant:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.put('/api/etudiant/profil', authEtudiant, async (req, res) => {
  try {
    const { email, motDePasse, motDePasseActuel } = req.body;

    // Récupérer l'étudiant actuel
    const etudiant = await Etudiant.findById(req.etudiantId);
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    // Vérification du mot de passe actuel (obligatoire pour toute modification)
    if (!motDePasseActuel || motDePasseActuel.trim() === '') {
      return res.status(400).json({ message: 'Mot de passe actuel requis' });
    }

    const motDePasseValide = await bcrypt.compare(motDePasseActuel, etudiant.motDePasse);
    if (!motDePasseValide) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    const modifications = {};

    // Mise à jour de l'email
    if (email && email.trim() !== '') {
      const emailTrimmed = email.toLowerCase().trim();
      
      // Validation du format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        return res.status(400).json({ message: 'Format d\'email invalide' });
      }

      // Vérifier que l'email n'est pas déjà utilisé par un autre étudiant
      const emailExiste = await Etudiant.findOne({ 
        email: emailTrimmed, 
        _id: { $ne: req.etudiantId } 
      });
      
      if (emailExiste) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

      modifications.email = emailTrimmed;
    }

    // Mise à jour du mot de passe
    if (motDePasse && motDePasse.trim() !== '') {
      if (motDePasse.length < 6) {
        return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      }

      const hashedPassword = await bcrypt.hash(motDePasse.trim(), 10);
      modifications.motDePasse = hashedPassword;
    }

    // Vérifier qu'au moins une modification est demandée
    if (Object.keys(modifications).length === 0) {
      return res.status(400).json({ message: 'Aucune modification à effectuer' });
    }

    // Appliquer les modifications
    modifications.updatedAt = new Date();

    const etudiantMiseAJour = await Etudiant.findByIdAndUpdate(
      req.etudiantId,
      modifications,
      { new: true, runValidators: true }
    );

    // Retourner la réponse sans le mot de passe
    const response = {
      _id: etudiantMiseAJour._id,
      email: etudiantMiseAJour.email,
      prenom: etudiantMiseAJour.prenom,
      nomDeFamille: etudiantMiseAJour.nomDeFamille,
      updatedAt: etudiantMiseAJour.updatedAt
    };

    res.status(200).json({
      message: 'Profil mis à jour avec succès',
      etudiant: response
    });

  } catch (err) {
    console.error('Erreur mise à jour profil étudiant:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }

    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: err.message
    });
  }
});
app.post('/api/commerciaux', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { nom, telephone, email } = req.body;
    const nouveau = new Commercial({ nom, telephone, email });
    await nouveau.save();
    res.status(201).json(nouveau);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/professeur/profil', authProfesseur, async (req, res) => {
  try {
    const { email, motDePasse, motDePasseActuel } = req.body;

    // Récupérer le professeur actuel
    const professeur = await Professeur.findById(req.professeurId);
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }

    // Vérification du mot de passe actuel (obligatoire pour toute modification)
    if (!motDePasseActuel || motDePasseActuel.trim() === '') {
      return res.status(400).json({ message: 'Mot de passe actuel requis' });
    }

    const motDePasseValide = await bcrypt.compare(motDePasseActuel, professeur.motDePasse);
    if (!motDePasseValide) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    const modifications = {};

    // Mise à jour de l'email
    if (email && email.trim() !== '') {
      const emailTrimmed = email.toLowerCase().trim();
      
      // Validation du format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        return res.status(400).json({ message: 'Format d\'email invalide' });
      }

      // Vérifier que l'email n'est pas déjà utilisé par un autre professeur
      const emailExiste = await Professeur.findOne({ 
        email: emailTrimmed, 
        _id: { $ne: req.professeurId } 
      });
      
      if (emailExiste) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

      modifications.email = emailTrimmed;
    }

    // Mise à jour du mot de passe
    if (motDePasse && motDePasse.trim() !== '') {
      if (motDePasse.length < 6) {
        return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      }

      const hashedPassword = await bcrypt.hash(motDePasse.trim(), 10);
      modifications.motDePasse = hashedPassword;
    }

    // Vérifier qu'au moins une modification est demandée
    if (Object.keys(modifications).length === 0) {
      return res.status(400).json({ message: 'Aucune modification à effectuer' });
    }

    // Appliquer les modifications
    modifications.updatedAt = new Date();

    const professeurMiseAJour = await Professeur.findByIdAndUpdate(
      req.professeurId,
      modifications,
      { new: true, runValidators: true }
    );

    // Retourner la réponse sans le mot de passe
    const response = {
      _id: professeurMiseAJour._id,
      email: professeurMiseAJour.email,
      nom: professeurMiseAJour.nom,
      genre: professeurMiseAJour.genre,
      telephone: professeurMiseAJour.telephone,
      matiere: professeurMiseAJour.matiere,
      updatedAt: professeurMiseAJour.updatedAt
    };

    res.status(200).json({
      message: 'Profil mis à jour avec succès',
      professeur: response
    });

  } catch (err) {
    console.error('Erreur mise à jour profil professeur:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }

    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    res.status(500).json({
      message: 'Erreur interne du serveur',
      error: err.message
    });
  }
});
// ✅ Lister tous les commerciaux
app.get('/api/commerciaux', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const commerciaux = await Commercial.find().sort({ nom: 1 });
    res.json(commerciaux);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/messages/upload', authEtudiant, uploadMessageFile.single('fichier'), async (req, res) => {
  try {
    const { contenu, destinataireId, roleDestinataire } = req.body;

    const hasContenu = contenu && contenu.trim() !== '';
    const hasFile = !!req.file;

    if (!hasContenu && !hasFile) {
      return res.status(400).json({ message: 'Le contenu du message ou le fichier est requis.' });
    }

    const messageData = {
      expediteur: req.etudiantId,
      roleExpediteur: 'Etudiant',
      destinataire: destinataireId,
      roleDestinataire: 'Professeur',
      etudiant: req.etudiantId,
      professeur: destinataireId,
    };

    if (hasContenu) messageData.contenu = contenu.trim();
    if (hasFile) messageData.fichier = `/uploads/messages/${req.file.filename}`;

    const newMessage = new Message(messageData);
    await newMessage.save();

    res.status(201).json({
      message: 'Message envoyé avec succès.',
      data: newMessage,
    });
  } catch (err) {
    console.error('Erreur lors de l’envoi du message avec fichier:', err);
    res.status(500).json({ message: 'Une erreur est survenue sur le serveur.' });
  }
});app.get('/api/etudiant/me', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId).select('-motDePasse');
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    res.json(etudiant);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});app.get('/api/etudiant/mes-professeurs-messages', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId);
    const coursEtudiant = etudiant.cours;

    const professeurs = await Professeur.find({
      cours: { $in: coursEtudiant },
      actif: true
    }).select('_id nom cours image genre lastSeen');

    // Pour chaque professeur, obtenir le dernier message
    const professeursAvecMessages = await Promise.all(
      professeurs.map(async (prof) => {
        const dernierMessage = await Message.findOne({
          $or: [
            { expediteur: prof._id, destinataire: req.etudiantId },
            { expediteur: req.etudiantId, destinataire: prof._id }
          ]
        })
        .sort({ date: -1 })
        .select('contenu date roleExpediteur');

        return {
          ...prof.toObject(),
          dernierMessage
        };
      })
    );

    res.json(professeursAvecMessages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
app.get('/api/paiements/etudiant/:etudiantId', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const paiements = await Paiement.find({ etudiant: req.params.etudiantId });
    res.json(paiements);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des paiements", error: err.message });
  }
});
// Keep this version - it's more comprehensive
app.get('/api/paiement-manager/stats', authAdminOrPaiementManager, async (req, res) => {
  try {
    console.log('🔍 Route stats paiement-manager appelée');
    
    // Récupérer tous les étudiants actifs
    const etudiants = await Etudiant.find({ actif: true });
    console.log('📊 Étudiants actifs trouvés:', etudiants.length);
    
    // Récupérer tous les paiements
    const paiements = await Paiement.find();
    console.log('💰 Paiements trouvés:', paiements.length);
    
    // Calculs
    const totalEtudiants = etudiants.length;
    const etudiantsPayes = etudiants.filter(e => e.paye === true).length;
    const montantTotal = etudiants.reduce((acc, e) => acc + (e.prixTotal || 0), 0);
    const montantCollecte = paiements.reduce((acc, p) => acc + (p.montant || 0), 0);
    
    // Simple calcul d'expirés (étudiants non payés)
    const paiementsExpires = totalEtudiants - etudiantsPayes;
    
    const statsData = {
      totalEtudiants,
      etudiantsPayes,
      montantTotal,
      montantCollecte,
      paiementsExpires,
      tauxCollection: montantTotal > 0 ? ((montantCollecte / montantTotal) * 100).toFixed(1) : 0
    };
    
    console.log('📈 Stats calculées:', statsData);
    res.json(statsData);
    
  } catch (err) {
    console.error('❌ Erreur route stats:', err);
    res.status(500).json({ 
      error: err.message,
      totalEtudiants: 0,
      etudiantsPayes: 0,
      montantTotal: 0,
      montantCollecte: 0,
      paiementsExpires: 0,
      tauxCollection: 0
    });
  }
});

// ✅ Lister les paiements
app.get('/api/paiements', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const paiements = await Paiement.find()
      .populate('etudiant', 'prenom nomDeFamille nomComplet telephoneEtudiant') // ✅ telephoneEtudiant
      .populate('creePar', 'nom');

    res.json(paiements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/paiements/exp', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiants = await Etudiant.find({ actif: true });
    const paiements = await Paiement.find({}).lean();

    const expires = [];

    for (const etudiant of etudiants) {
      if (!etudiant.cours || etudiant.cours.length === 0) continue;

      for (const nomCours of etudiant.cours) {
        const paiementsCours = paiements.filter(p =>
          p.etudiant?.toString() === etudiant._id.toString() &&
          p.cours.includes(nomCours)
        );

        const prixTotal = etudiant.prixTotal || 0;
        const montantPaye = paiementsCours.reduce((acc, p) => acc + (p.montant || 0), 0);
        const reste = Math.max(0, prixTotal - montantPaye);

        // ✅ Si l'étudiant a payé le prix complet, ne pas l'afficher dans les expirés
        if (reste <= 0) {
          continue; // Paiement complet, pas d'expiration
        }

        // ✅ Si aucun paiement, utiliser la date d'inscription comme référence
        if (paiementsCours.length === 0) {
          expires.push({
            etudiant: {
              _id: etudiant._id,
              prenom: etudiant.prenom,
              nomDeFamille: etudiant.nomDeFamille,
              nomComplet: etudiant.nomComplet,
              telephone: etudiant.telephone,
              email: etudiant.email,
              image: etudiant.image,
              actif: etudiant.actif
            },
            cours: nomCours,
            derniereFin: etudiant.dateInscription || etudiant.createdAt || new Date(), // ✅ Date d'inscription
            prixTotal,
            montantPaye: 0,
            reste: prixTotal,
            type: 'nouveau' // ✅ Pour identifier les nouveaux étudiants
          });
          continue;
        }

        // ✅ Si il y a des paiements mais pas complets
        paiementsCours.sort((a, b) => new Date(a.moisDebut) - new Date(b.moisDebut));

        const fusionnees = [];
        for (const paiement of paiementsCours) {
          const debut = new Date(paiement.moisDebut);
          const fin = new Date(paiement.moisDebut);
          fin.setMonth(fin.getMonth() + (paiement.nombreMois || 1));

          if (fusionnees.length === 0) {
            fusionnees.push({ debut, fin });
          } else {
            const derniere = fusionnees[fusionnees.length - 1];
            const unJourApres = new Date(derniere.fin);
            unJourApres.setDate(unJourApres.getDate() + 1);

            if (debut <= unJourApres) {
              derniere.fin = fin > derniere.fin ? fin : derniere.fin;
            } else {
              fusionnees.push({ debut, fin });
            }
          }
        }

        const dernierePeriode = fusionnees[fusionnees.length - 1];
        const maintenant = new Date();

        // ✅ Seulement si la période est expirée ET qu'il reste à payer
        if (reste > 0 && dernierePeriode.fin < maintenant) {
          expires.push({
            etudiant: {
              _id: etudiant._id,
              prenom: etudiant.prenom,
              nomDeFamille: etudiant.nomDeFamille,
              nomComplet: etudiant.nomComplet,
              telephone: etudiant.telephone,
              email: etudiant.email,
              image: etudiant.image,
              actif: etudiant.actif
            },
            cours: nomCours,
            derniereFin: dernierePeriode.fin,
            prixTotal,
            montantPaye,
            reste,
            type: 'expire' // ✅ Pour identifier les vrais expirés
          });
        }
      }
    }

    // Trier par nombre de jours expirés (les plus urgents en premier)
    expires.sort((a, b) => {
      const aJours = Math.ceil((new Date() - new Date(a.derniereFin)) / (1000 * 60 * 60 * 24));
      const bJours = Math.ceil((new Date() - new Date(b.derniereFin)) / (1000 * 60 * 60 * 24));
      return bJours - aJours;
    });

    res.json(expires);
  } catch (error) {
    console.error('Erreur paiements expirés:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des paiements expirés',
      error: error.message
    });
  }
});
// ✅ Route pour supprimer un message
app.delete('/api/messages/:messageId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    const decoded = jwt.verify(token, 'jwt_secret_key');
    const messageId = req.params.messageId;

    // Vérifier si le message existe
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    // Vérifier que l'utilisateur est l'expéditeur du message
    if (message.expediteur.toString() !== decoded.id) {
      return res.status(403).json({ message: 'Non autorisé à supprimer ce message' });
    }

    // Supprimer le message
    await Message.findByIdAndDelete(messageId);
    
    res.json({ 
      message: 'Message supprimé avec succès', 
      messageId: messageId 
    });
  } catch (err) {
    console.error('Erreur lors de la suppression:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


// Route pour supprimer une notification avec sauvegarde du contexte
app.delete('/api/notifications/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Suppression notification: ${id}`);
    
    // Extraire les informations de l'ID de notification
    const [type, , etudiantId, nombreAbsences] = id.split('_');
    
    if (type === 'absence' && etudiantId) {
      // Sauvegarder la suppression avec le contexte
      const suppressionKey = `absence_${etudiantId}`;
      
      await NotificationSupprimee.findOneAndUpdate(
        { key: suppressionKey, type: 'absence_frequent' },
        {
          key: suppressionKey,
          type: 'absence_frequent',
          etudiantId: etudiantId,
          nombreAbsencesAuMomentSuppression: parseInt(nombreAbsences) || 0,
          dateSuppression: new Date(),
          supprimePar: req.user.id // ID de l'admin qui a supprimé
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Suppression sauvegardée pour étudiant ${etudiantId} avec ${nombreAbsences} absences`);
    }
    
    res.json({ 
      success: true, 
      message: 'Notification supprimée avec succès',
      context: type === 'absence' ? {
        etudiantId,
        nombreAbsences: parseInt(nombreAbsences) || 0
      } : null
    });
    
  } catch (err) {
    console.error('❌ Erreur suppression notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route pour restaurer les notifications supprimées
app.post('/api/notifications/reset-deleted', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const result = await NotificationSupprimee.deleteMany({});
    
    console.log(`🔄 ${result.deletedCount} notifications supprimées restaurées`);
    
    res.json({
      success: true,
      restoredCount: result.deletedCount,
      message: 'Toutes les notifications supprimées ont été restaurées'
    });
    
  } catch (err) {
    console.error('❌ Erreur restauration notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route pour configurer les seuils d'absence
app.post('/api/notifications/seuils-absence', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { normal, urgent, critique } = req.body;
    
    // Valider les seuils
    if (!normal || !urgent || !critique || normal >= urgent || urgent >= critique) {
      return res.status(400).json({
        error: 'Les seuils doivent être: normal < urgent < critique'
      });
    }
    
    // Sauvegarder en base (vous pouvez créer un modèle Configuration)
    await Configuration.findOneAndUpdate(
      { key: 'seuils_absence' },
      {
        key: 'seuils_absence',
        value: { normal, urgent, critique },
        modifiePar: req.user.id,
        dateModification: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log(`⚙️ Seuils d'absence mis à jour: ${normal}/${urgent}/${critique}`);
    
    res.json({
      success: true,
      seuils: { normal, urgent, critique },
      message: 'Seuils d\'absence mis à jour avec succès'
    });
    
  } catch (err) {
    console.error('❌ Erreur mise à jour seuils:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route de statistiques détaillées pour les absences
app.get('/api/notifications/stats-absences', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiantsActifs = await Etudiant.find({ actif: true });
    const stats = {
      totalEtudiants: etudiantsActifs.length,
      parSeuil: {
        normal: 0,    // 10-14 absences
        urgent: 0,    // 15-19 absences
        critique: 0   // 20+ absences
      },
      repartition: [],
      moyenneAbsences: 0
    };
    
    let totalAbsences = 0;
    
    for (const etudiant of etudiantsActifs) {
      const absences = await Presence.countDocuments({
        etudiant: etudiant._id,
        present: false
      });
      
      totalAbsences += absences;
      
      stats.repartition.push({
        etudiantId: etudiant._id,
        nom: etudiant.nomComplet,
        absences: absences,
        niveau: absences >= 20 ? 'critique' : 
                absences >= 15 ? 'urgent' : 
                absences >= 10 ? 'normal' : 'ok'
      });
      
      if (absences >= 20) stats.parSeuil.critique++;
      else if (absences >= 15) stats.parSeuil.urgent++;
      else if (absences >= 10) stats.parSeuil.normal++;
    }
    
    stats.moyenneAbsences = Math.round(totalAbsences / etudiantsActifs.length * 100) / 100;
    
    // Trier par nombre d'absences décroissant
    stats.repartition.sort((a, b) => b.absences - a.absences);
    
    res.json(stats);
    
  } catch (err) {
    console.error('❌ Erreur stats absences:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route pour marquer un message comme lu
app.patch('/api/messages/:messageId/read', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    const decoded = jwt.verify(token, 'jwt_secret_key');
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    // Vérifier que l'utilisateur est le destinataire
    if (message.destinataire.toString() !== decoded.id) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Marquer comme lu
    message.lu = true;
    message.dateLecture = new Date();
    await message.save();

    res.json({ message: 'Message marqué comme lu' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir le nombre de messages non lus
app.get('/api/messages/unread-count', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    const decoded = jwt.verify(token, 'jwt_secret_key');
    const userId = decoded.id;
    const role = decoded.role === 'etudiant' ? 'Etudiant' : 'Professeur';

    const unreadCount = await Message.countDocuments({
      destinataire: userId,
      roleDestinataire: role,
      lu: { $ne: true }
    });

    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir les messages non lus par expéditeur
app.get('/api/messages/unread-by-sender', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    const decoded = jwt.verify(token, 'jwt_secret_key');
    const userId = decoded.id;
    const role = decoded.role === 'etudiant' ? 'Etudiant' : 'Professeur';

    const unreadMessages = await Message.aggregate([
      {
        $match: {
          destinataire: new mongoose.Types.ObjectId(userId),
          roleDestinataire: role,
          lu: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$expediteur',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convertir en objet pour faciliter l'utilisation côté frontend
    const unreadCounts = {};
    unreadMessages.forEach(item => {
      unreadCounts[item._id.toString()] = item.count;
    });

    res.json(unreadCounts);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// Route pour récupérer les nouveaux étudiants (à ajouter dans votre app.js)
app.get('/api/paiement-manager/etudiants-nouveaux', authAdminOrPaiementManager, async (req, res) => {
  try {
    const etudiants = await Etudiant.find({ 
      actif: true,
      $or: [
        { prixTotal: { $exists: false } },
        { prixTotal: 0 },
        { prixTotal: null }
      ]
    })
    .select('-motDePasse')
    .sort({ createdAt: -1 })
    .limit(10); // Limiter aux 10 plus récents
    
    res.json(etudiants);
  } catch (err) {
    console.error('Erreur récupération nouveaux étudiants:', err);
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/rappels/:id', async (req, res) => {
  try {
    const { dateRappel, note } = req.body;
    const updated = await Rappel.findByIdAndUpdate(
      req.params.id,
      { dateRappel, note },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rappels', async (req, res) => {
  try {
    console.log('📥 Body reçu:', req.body); // <= هذا مهم
    const { etudiant, cours, montantRestant, note, dateRappel } = req.body;

    if (!etudiant || !cours || !montantRestant || !dateRappel) {
      return res.status(400).json({ message: 'Champs manquants' });
    }

    const rappel = new Rappel({ etudiant, cours, montantRestant, note, dateRappel });
    await rappel.save();
    res.status(201).json(rappel);
  } catch (err) {
    console.error('❌ Erreur POST /rappels:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
app.get('/api/vie-scolaire', async (req, res) => {
  try {
    const { cycle, year, category, search, limit = 10, page = 1 } = req.query;
    
    // Construction du filtre
    const filter = {};
    if (cycle) filter.cycle = cycle;
    if (year) filter.year = year;
    if (category && category !== 'all') filter.category = category;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { fullDescription: { $regex: search, $options: 'i' } },
        { lieu: { $regex: search, $options: 'i' } },
        { organisateur: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageSize = parseInt(limit);
    const currentPage = parseInt(page);
    const skip = (currentPage - 1) * pageSize;
    
    // Compter le total des documents
    const total = await Activity.countDocuments(filter);
    
    // Récupérer les activités avec pagination
    const activities = await Activity.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('-__v');
    
    res.json({
      data: activities,
      currentPage,
      totalPages: Math.ceil(total / pageSize),
      totalItems: total,
      success: true
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des activités',
      success: false
    });
  }
});

// GET une activité par ID
app.get('/api/vie-scolaire/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'ID d\'activité invalide',
        success: false
      });
    }
    
    const activity = await Activity.findById(req.params.id).select('-__v');
    
    if (!activity) {
      return res.status(404).json({ 
        error: 'Activité non trouvée',
        success: false
      });
    }
    
    res.json(activity);
    
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'activité:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération de l\'activité',
      success: false
    });
  }
});

// POST créer une nouvelle activité (admin uniquement)
app.post('/api/vie-scolaire', authAdminOrPaiementManager, uploadVieScolaire.array('images', 10), async (req, res) => {
  try {
    const {
      title,
      date,
      time,
      category,
      description,
      fullDescription,
      participants,
      lieu,
      organisateur,
      materiel,
      year,
      cycle
    } = req.body;
    
    // Validation des champs requis
    if (!title || !date || !category || !description || !year || !cycle) {
      return res.status(400).json({
        error: 'Les champs title, date, category, description, year et cycle sont requis',
        success: false
      });
    }
    
    // Traitement des images uploadées
    const images = req.files ? req.files.map(file => `/uploads/vieScolaire/${file.filename}`) : [];
    
    // Création de l'activité
    const activity = new Activity({
      title: title.trim(),
      date: new Date(date),
      time: time?.trim(),
      category,
      description: description.trim(),
      fullDescription: fullDescription?.trim(),
      participants: participants ? parseInt(participants) : undefined,
      lieu: lieu?.trim(),
      organisateur: organisateur?.trim(),
      materiel: materiel?.trim(),
      images,
      year,
      cycle
    });
    
    await activity.save();
    
    res.status(201).json({
      data: activity,
      message: 'Activité créée avec succès',
      success: true
    });
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'activité:', error);
    
    // Supprimer les fichiers uploadés en cas d'erreur
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Erreur lors de la suppression du fichier:', err);
        });
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Erreur de validation des données',
        details: error.message,
        success: false
      });
    }
    
    res.status(500).json({
      error: 'Erreur serveur lors de la création de l\'activité',
      success: false
    });
  }
});

app.put('/api/vie-scolaire/:id', authAdminOrPaiementManager, uploadVieScolaire.array('images', 10), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'ID d\'activité invalide',
        success: false
      });
    }
    
    const {
      title,
      date,
      time,
      category,
      description,
      fullDescription,
      participants,
      lieu,
      organisateur,
      materiel,
      year,
      cycle,
      keepExistingImages
    } = req.body;
    
    const existingActivity = await Activity.findById(req.params.id);
    if (!existingActivity) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        success: false
      });
    }
    
    // Traitement des nouvelles images
    const newImages = req.files ? req.files.map(file => `/uploads/vieScolaire/${file.filename}`) : [];
    
    // Gestion des images existantes
    let finalImages = [];
    if (keepExistingImages === 'true') {
      finalImages = [...existingActivity.images, ...newImages];
    } else {
      finalImages = newImages.length > 0 ? newImages : existingActivity.images;
    }
    
    // Données à mettre à jour
    const updateData = {
      title: title?.trim() || existingActivity.title,
      date: date ? new Date(date) : existingActivity.date,
      time: time?.trim() || existingActivity.time,
      category: category || existingActivity.category,
      description: description?.trim() || existingActivity.description,
      fullDescription: fullDescription?.trim() || existingActivity.fullDescription,
      participants: participants ? parseInt(participants) : existingActivity.participants,
      lieu: lieu?.trim() || existingActivity.lieu,
      organisateur: organisateur?.trim() || existingActivity.organisateur,
      materiel: materiel?.trim() || existingActivity.materiel,
      images: finalImages,
      year: year || existingActivity.year,
      cycle: cycle || existingActivity.cycle
    };
    
    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      data: updatedActivity,
      message: 'Activité mise à jour avec succès',
      success: true
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'activité:', error);
    
    // Supprimer les nouveaux fichiers uploadés en cas d'erreur
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Erreur lors de la suppression du fichier:', err);
        });
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Erreur de validation des données',
        details: error.message,
        success: false
      });
    }
    
    res.status(500).json({
      error: 'Erreur serveur lors de la mise à jour de l\'activité',
      success: false
    });
  }
});

app.delete('/api/vie-scolaire/:id', authAdminOrPaiementManager, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'ID d\'activité invalide',
        success: false
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        success: false
      });
    }
    
    // Supprimer les images associées
    if (activity.images && activity.images.length > 0) {
      activity.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, 'public', imagePath);
        fs.unlink(fullPath, (err) => {
          if (err) console.error('Erreur lors de la suppression de l\'image:', err);
        });
      });
    }
    
    await Activity.findByIdAndDelete(req.params.id);
    
    res.json({
      message: 'Activité supprimée avec succès',
      success: true
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'activité:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la suppression de l\'activité',
      success: false
    });
  }
});
// ============================================
// 1. OBTENIR TOUS LES ÉTUDIANTS AVEC PAIEMENTS MENSUELS
// ============================================
app.get('/api/paiements-mensuels/etudiants', authInscripteur, async (req, res) => {
  try {
    const { anneeScolaire } = req.query;
    const annee = anneeScolaire || '2025/2026';

    // Récupérer tous les étudiants visibles avec leurs paiements
    const etudiants = await Etudiant.aggregate([
      { $match: { 
        hidden: { $ne: true },
        actif: true,
        anneeScolaire: annee 
      }},
      { $lookup: {
        from: 'payments',
        let: { etudiantId: '$_id' },
        pipeline: [
          { $match: { 
            $expr: { $eq: ['$etudiant', '$$etudiantId'] },
            anneeScolaire: annee,
            type: 'mensuel'
          }},
          { $unwind: '$moisConcernes' },
          { $group: {
            _id: '$moisConcernes.mois',
            nomMois: { $first: '$moisConcernes.nomMois' },
            montantDu: { $first: '$moisConcernes.montantDu' },
            montantPaye: { $sum: '$moisConcernes.montantPaye' },
            montantRestant: { $sum: '$moisConcernes.montantRestant' },
            payeComplet: { 
              $max: { 
                $cond: [{ $eq: ['$moisConcernes.montantRestant', 0] }, true, false] 
              } 
            }
          }},
          { $sort: { '_id': 1 } }
        ],
        as: 'paiementsMensuels'
      }},
      { $project: {
        nomComplet: 1,
        cours: 1,
        mensualite: 1,
        fraisInscription: 1,
        fraisInscriptionMontantPaye: 1,
        fraisInscriptionPaye: 1,
        fraisInscriptionTypePaiement: 1,
        paiementsMensuels: 1,
        telephoneEtudiant: 1,
        email: 1
      }}
    ]);

    // Organiser les données par mois (10 mois scolaires)
    const moisScolaires = [
      { mois: '2025-09', nom: 'Septembre', index: 0 },
      { mois: '2025-10', nom: 'Octobre', index: 1 },
      { mois: '2025-11', nom: 'Novembre', index: 2 },
      { mois: '2025-12', nom: 'Décembre', index: 3 },
      { mois: '2026-01', nom: 'Janvier', index: 4 },
      { mois: '2026-02', nom: 'Février', index: 5 },
      { mois: '2026-03', nom: 'Mars', index: 6 },
      { mois: '2026-04', nom: 'Avril', index: 7 },
      { mois: '2026-05', nom: 'Mai', index: 8 },
      { mois: '2026-06', nom: 'Juin', index: 9 }
    ];

    const etudiantsAvecPaiements = etudiants.map(etudiant => {
      // Créer un tableau de 10 mois avec les données
      const mois = moisScolaires.map(ms => {
        // Trouver le paiement pour ce mois
        const paiementMois = etudiant.paiementsMensuels?.find(p => p._id === ms.mois);
        
        const montantDu = etudiant.mensualite || 0;
        const montantPaye = paiementMois?.montantPaye || 0;
        const montantRestant = paiementMois?.montantRestant || montantDu;
        
        return {
          ...ms,
          montantDu,
          montantPaye,
          montantRestant,
          payeComplet: paiementMois?.payeComplet || false,
          statut: montantPaye >= montantDu ? 'Payé' : montantPaye > 0 ? 'Partiel' : 'Non payé'
        };
      });

      // Calculer les totaux
      const totalDu = mois.reduce((sum, m) => sum + m.montantDu, 0);
      const totalPaye = mois.reduce((sum, m) => sum + m.montantPaye, 0);
      const totalRestant = totalDu - totalPaye;

      // Calculer les frais d'inscription
      const fraisInscriptionRestant = Math.max(
        0, 
        (etudiant.fraisInscription || 0) - (etudiant.fraisInscriptionMontantPaye || 0)
      );

      return {
        ...etudiant,
        mois,
        totalDu,
        totalPaye,
        totalRestant,
        fraisInscription: etudiant.fraisInscription || 0,
        fraisInscriptionMontantPaye: etudiant.fraisInscriptionMontantPaye || 0,
        fraisInscriptionRestant,
        fraisInscriptionPaye: etudiant.fraisInscriptionPaye || false,
        fraisInscriptionTypePaiement: etudiant.fraisInscriptionTypePaiement || 'Cash'
      };
    });

    res.json({
      success: true,
      etudiants: etudiantsAvecPaiements,
      anneeScolaire: annee,
      moisScolaires: moisScolaires.map(ms => ms.nom)
    });

  } catch (err) {
    console.error('Erreur récupération étudiants mensuels:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur',
      error: err.message 
    });
  }
});

// ============================================
// 2. OBTENIR DÉTAILS COMPLETS D'UN ÉTUDIANT
// ============================================
app.get('/api/paiements-mensuels/etudiant/:id', authInscripteur, async (req, res) => {
  try {
    const { id } = req.params;
    const { anneeScolaire } = req.query;
    const annee = anneeScolaire || '2025/2026';

    // Récupérer l'étudiant avec tous les détails
    const etudiant = await Etudiant.findById(id).lean();
    if (!etudiant) {
      return res.status(404).json({ 
        success: false,
        message: 'Étudiant non trouvé' 
      });
    }

    // Récupérer tous les paiements de cet étudiant
    const paiementsMensuels = await Payment.getPaiementsParMois(id, annee);
    const paiementsFraisInscription = await Payment.getFraisInscription(id, annee);
    
    // Récupérer l'historique complet des paiements
    const historiqueComplet = await Payment.find({
      etudiant: id,
      anneeScolaire: annee
    })
    .sort({ createdAt: -1 })
    .populate('creeParInscripteur', 'nom prenom')
    .populate('creeParAdmin', 'nom prenom')
    .lean();

    // Organiser les mois scolaires
    const moisScolaires = [
      { mois: '2025-09', nom: 'Septembre', index: 0 },
      { mois: '2025-10', nom: 'Octobre', index: 1 },
      { mois: '2025-11', nom: 'Novembre', index: 2 },
      { mois: '2025-12', nom: 'Décembre', index: 3 },
      { mois: '2026-01', nom: 'Janvier', index: 4 },
      { mois: '2026-02', nom: 'Février', index: 5 },
      { mois: '2026-03', nom: 'Mars', index: 6 },
      { mois: '2026-04', nom: 'Avril', index: 7 },
      { mois: '2026-05', nom: 'Mai', index: 8 },
      { mois: '2026-06', nom: 'Juin', index: 9 }
    ];

    const mois = moisScolaires.map(ms => {
      const paiementMois = paiementsMensuels.find(p => p._id === ms.mois);
      
      const montantDu = etudiant.mensualite || 0;
      const montantPaye = paiementMois?.montantPaye || 0;
      const montantRestant = paiementMois?.montantRestant || montantDu;
      
      return {
        ...ms,
        montantDu,
        montantPaye,
        montantRestant,
        payeComplet: paiementMois?.payeComplet || false,
        statut: montantPaye >= montantDu ? 'Payé' : montantPaye > 0 ? 'Partiel' : 'Non payé',
        paiements: historiqueComplet.filter(p => 
          p.moisConcernes?.some(mc => mc.mois === ms.mois)
        ).map(p => ({
          _id: p._id,
          montant: p.moisConcernes.find(mc => mc.mois === ms.mois)?.montantPaye || 0,
          date: p.createdAt,
          typePaiement: p.typePaiement,
          numeroCheque: p.numeroCheque,
          statutCheque: p.statutCheque,
          note: p.note
        }))
      };
    });

    // Calculer les totaux
    const totalDu = mois.reduce((sum, m) => sum + m.montantDu, 0);
    const totalPaye = mois.reduce((sum, m) => sum + m.montantPaye, 0);
    const totalRestant = totalDu - totalPaye;

    // Statistiques des frais d'inscription
    const fraisInscriptionRestant = Math.max(
      0, 
      (etudiant.fraisInscription || 0) - (etudiant.fraisInscriptionMontantPaye || 0)
    );

    res.json({
      success: true,
      etudiant: {
        ...etudiant,
        mois,
        totalDu,
        totalPaye,
        totalRestant,
        fraisInscription: etudiant.fraisInscription || 0,
        fraisInscriptionMontantPaye: etudiant.fraisInscriptionMontantPaye || 0,
        fraisInscriptionRestant,
        fraisInscriptionPaye: etudiant.fraisInscriptionPaye || false,
        fraisInscriptionTypePaiement: etudiant.fraisInscriptionTypePaiement || 'Cash'
      },
      historiqueComplet,
      paiementsFraisInscription,
      statistiques: await Payment.getStatistiquesEtudiant(id, annee)
    });

  } catch (err) {
    console.error('Erreur détails étudiant:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur',
      error: err.message 
    });
  }
});

// ============================================
// 3. AJOUTER UN PAIEMENT MENSUEL
// ============================================
app.post('/api/paiements-mensuels/ajouter', authInscripteur, async (req, res) => {
  try {
    const {
      etudiantId,
      montantPaye,
      typePaiement,
      moisIndex,
      note,
      anneeScolaire,
      numeroCheque,
      banque,
      dateEcheance
    } = req.body;

    // Validation
    if (!etudiantId || !montantPaye || !typePaiement || moisIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants'
      });
    }

    // Vérifier que l'étudiant existe
    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: 'Étudiant non trouvé'
      });
    }

    // Mapper l'index du mois au format YYYY-MM
    const moisMap = {
      0: '2025-09', 1: '2025-10', 2: '2025-11', 3: '2025-12',
      4: '2026-01', 5: '2026-02', 6: '2026-03', 7: '2026-04',
      8: '2026-05', 9: '2026-06'
    };

    const nomMoisMap = {
      0: 'Septembre 2025', 1: 'Octobre 2025', 2: 'Novembre 2025', 3: 'Décembre 2025',
      4: 'Janvier 2026', 5: 'Février 2026', 6: 'Mars 2026', 7: 'Avril 2026',
      8: 'Mai 2026', 9: 'Juin 2026'
    };

    const moisCode = moisMap[moisIndex];
    const nomMois = nomMoisMap[moisIndex];
    
    if (!moisCode) {
      return res.status(400).json({
        success: false,
        message: 'Mois invalide'
      });
    }

    const montantDu = etudiant.mensualite || 0;
    const montantPayeNum = parseFloat(montantPaye);
    
    if (montantPayeNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant payé doit être supérieur à 0'
      });
    }

    // Vérifier si un paiement existe déjà pour ce mois
    const paiementExistant = await Payment.findOne({
      etudiant: etudiantId,
      anneeScolaire: anneeScolaire || '2025/2026',
      type: 'mensuel',
      'moisConcernes.mois': moisCode
    });

    let payment;

    if (paiementExistant) {
      // Mettre à jour le paiement existant
      await paiementExistant.ajouterPaiementMois(
        paiementExistant.moisConcernes.findIndex(mc => mc.mois === moisCode),
        montantPayeNum
      );
      payment = paiementExistant;
    } else {
      // Créer un nouveau paiement
      const moisDebut = new Date(moisCode + '-01');
      const montantRestant = Math.max(0, montantDu - montantPayeNum);

      const paymentData = {
        etudiant: etudiantId,
        montantTotal: montantDu,
        montantPaye: montantPayeNum,
        montantRestant: montantRestant,
        typePaiement,
        type: 'mensuel',
        moisConcernes: [{
          mois: moisCode,
          nomMois: nomMois,
          montantDu: montantDu,
          montantPaye: montantPayeNum,
          montantRestant: montantRestant,
          payeComplet: montantRestant === 0
        }],
        moisDebut: moisDebut,
        nombreMois: 1,
        cours: etudiant.cours,
        note: note || `Paiement mensuel pour ${nomMois}`,
        anneeScolaire: anneeScolaire || '2025/2026',
        creeParInscripteur: req.inscripteurId
      };

      // Ajouter infos chèque si nécessaire
      if (typePaiement === 'Chèque') {
        paymentData.numeroCheque = numeroCheque;
        paymentData.banque = banque || '';
        paymentData.dateEcheance = dateEcheance ? new Date(dateEcheance) : null;
        paymentData.statutCheque = 'En attente';
      }

      payment = await Payment.create(paymentData);
    }

    res.status(201).json({
      success: true,
      message: 'Paiement ajouté avec succès',
      payment
    });

  } catch (err) {
    console.error('Erreur ajout paiement:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});

// ============================================
// 4. METTRE À JOUR LA MENSUALITÉ D'UN ÉTUDIANT
// ============================================
app.put('/api/paiements-mensuels/etudiant/:id/mensualite', authInscripteur, async (req, res) => {
  try {
    const { id } = req.params;
    const { mensualite } = req.body;

    if (mensualite === undefined || mensualite < 0) {
      return res.status(400).json({
        success: false,
        message: 'Mensualité invalide'
      });
    }

    const etudiant = await Etudiant.findById(id);
    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: 'Étudiant non trouvé'
      });
    }

    // Mettre à jour la mensualité
    etudiant.mensualite = parseFloat(mensualite);
    await etudiant.save();

    // Mettre à jour les paiements existants pour les mois non payés
    const paiements = await Payment.find({
      etudiant: id,
      type: 'mensuel',
      anneeScolaire: etudiant.anneeScolaire
    });

    for (const paiement of paiements) {
      for (const mois of paiement.moisConcernes) {
        if (mois.montantRestant > 0) {
          mois.montantDu = parseFloat(mensualite);
          mois.montantRestant = Math.max(0, mois.montantDu - mois.montantPaye);
          mois.payeComplet = mois.montantRestant === 0;
        }
      }
      
      // Recalculer les totaux
      paiement.montantTotal = paiement.moisConcernes.reduce((sum, m) => sum + m.montantDu, 0);
      paiement.montantPaye = paiement.moisConcernes.reduce((sum, m) => sum + m.montantPaye, 0);
      paiement.montantRestant = paiement.moisConcernes.reduce((sum, m) => sum + m.montantRestant, 0);
      
      await paiement.save();
    }

    res.json({
      success: true,
      message: 'Mensualité mise à jour',
      etudiant,
      paiementsMisesAJour: paiements.length
    });

  } catch (err) {
    console.error('Erreur mise à jour mensualité:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});

// Dans app.js - MODIFIER CETTE ROUTE
// ============================================
// 5. GÉRER LES FRAIS D'INSCRIPTION
// ============================================
app.put('/api/etudiants/:id/frais-inscription', authInscripteur, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      montantTotal,
      montantPaye,
      paye,
      typePaiement
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID étudiant requis'
      });
    }

    const etudiant = await Etudiant.findById(id);
    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: 'Étudiant non trouvé'
      });
    }

    // Mettre à jour les frais d'inscription
    await etudiant.updateFraisInscription({
      montantTotal: parseFloat(montantTotal || etudiant.fraisInscription),
      montantPaye: parseFloat(montantPaye || etudiant.fraisInscriptionMontantPaye),
      paye: paye || etudiant.fraisInscriptionPaye,
      typePaiement: typePaiement || etudiant.fraisInscriptionTypePaiement
    });

    // Si un paiement a été fait, créer un enregistrement
    const montantPayeNum = parseFloat(montantPaye || 0);
    if (montantPayeNum > 0) {
      // Créer une date de début pour aujourd'hui
      const moisDebut = new Date();
      
      const paymentData = {
        etudiant: id,
        montantTotal: etudiant.fraisInscription,
        montantPaye: montantPayeNum,
        montantRestant: Math.max(0, etudiant.fraisInscription - montantPayeNum),
        typePaiement: typePaiement || 'Cash',
        type: 'frais_inscription',
        note: `Frais d'inscription - ${etudiant.nomComplet}`,
        anneeScolaire: etudiant.anneeScolaire,
        creeParInscripteur: req.inscripteurId,
        // Ajouter les champs requis pour le modèle Payment
        nombreMois: 1,
        moisDebut: moisDebut,
        // Créer un tableau moisConcernes vide pour les frais d'inscription
        moisConcernes: [{
          mois: moisDebut.toISOString().slice(0, 7), // Format YYYY-MM
          nomMois: `Frais inscription ${moisDebut.getFullYear()}`,
          montantDu: etudiant.fraisInscription,
          montantPaye: montantPayeNum,
          montantRestant: Math.max(0, etudiant.fraisInscription - montantPayeNum),
          payeComplet: (montantPayeNum >= etudiant.fraisInscription)
        }]
      };

      await Payment.create(paymentData);
    }

    res.json({
      success: true,
      message: 'Frais d\'inscription mis à jour',
      etudiant,
      fraisInscriptionRestant: etudiant.fraisInscriptionRestant
    });

  } catch (err) {
    console.error('Erreur frais inscription:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});
// ============================================
// 6. OBTENIR STATISTIQUES GLOBALES
// ============================================
app.get('/api/paiements-mensuels/statistiques', authInscripteur, async (req, res) => {
  try {
    const { anneeScolaire } = req.query;
    const annee = anneeScolaire || '2025/2026';

    // Utiliser la méthode statique du modèle
    const stats = await Etudiant.getStatistiquesPaiement();
    
    // Obtenir les statistiques supplémentaires
    const etudiants = await Etudiant.findVisible({ anneeScolaire: annee });
    const paiements = await Payment.find({ 
      anneeScolaire: annee,
      type: 'mensuel' 
    });

    // Calculer les totaux mensuels
    const totalMensualitesDues = etudiants.reduce((sum, e) => sum + ((e.mensualite || 0) * 10), 0);
    const totalPaye = paiements.reduce((sum, p) => sum + p.montantPaye, 0);
    const totalRestant = totalMensualitesDues - totalPaye;

    // Statistiques par mois
    const moisStats = {};
    for (let i = 0; i < 10; i++) {
      const moisPaye = paiements.reduce((sum, p) => {
        const mois = p.moisConcernes?.find(mc => {
          const moisIndex = parseInt(mc.mois.split('-')[1]) - 9;
          return moisIndex === i;
        });
        return sum + (mois?.montantPaye || 0);
      }, 0);
      
      const moisDu = etudiants.reduce((sum, e) => sum + (e.mensualite || 0), 0);
      
      moisStats[i] = {
        du: moisDu,
        paye: moisPaye,
        reste: Math.max(0, moisDu - moisPaye),
        pourcentage: moisDu > 0 ? Math.round((moisPaye / moisDu) * 100) : 0
      };
    }

    res.json({
      success: true,
      statistiques: stats[0] || {},
      totauxMensuels: {
        totalMensualitesDues,
        totalPaye,
        totalRestant,
        pourcentagePaye: totalMensualitesDues > 0 
          ? Math.round((totalPaye / totalMensualitesDues) * 100) 
          : 0
      },
      moisStats,
      nombreEtudiants: etudiants.length,
      nombrePaiements: paiements.length
    });

  } catch (err) {
    console.error('Erreur statistiques:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});

// ============================================
// 7. SUPPRIMER UN PAIEMENT
// ============================================
app.delete('/api/paiements-mensuels/:id', authInscripteur, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions (seulement créateur ou admin)
    if (payment.creeParInscripteur?.toString() !== req.inscripteurId && 
        !payment.creeParAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer ce paiement'
      });
    }

    await Payment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Paiement supprimé avec succès'
    });

  } catch (err) {
    console.error('Erreur suppression:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});

// ============================================
// 8. OBTENIR NOTIFICATIONS DE CHÈQUES
// ============================================
app.get('/api/paiements-mensuels/notifications/cheques', authInscripteur, async (req, res) => {
  try {
    const { type = 'expiring', jours = 7 } = req.query;

    let cheques;
    
    if (type === 'expired') {
      cheques = await Payment.getChequesExpires();
    } else {
      cheques = await Payment.getChequesExpiresSoon(parseInt(jours));
    }

    // Compter par statut
    const stats = {
      total: cheques.length,
      enAttente: cheques.filter(c => c.statutCheque === 'En attente').length,
      encaisses: cheques.filter(c => c.statutCheque === 'Encaissé').length,
      rejetes: cheques.filter(c => c.statutCheque === 'Rejeté').length,
      expires: cheques.filter(c => c.statutCheque === 'Expiré').length
    };

    res.json({
      success: true,
      type,
      cheques,
      stats,
      jours: type === 'expiring' ? jours : null
    });

  } catch (err) {
    console.error('Erreur notifications chèques:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});

// ============================================
// 9. METTRE À JOUR STATUT D'UN CHÈQUE
// ============================================
app.patch('/api/paiements-mensuels/cheques/:id/statut', authInscripteur, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['En attente', 'Encaissé', 'Rejeté', 'Expiré'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    if (payment.typePaiement !== 'Chèque') {
      return res.status(400).json({
        success: false,
        message: 'Ce n\'est pas un paiement par chèque'
      });
    }

    await payment.updateStatutCheque(statut);

    res.json({
      success: true,
      message: `Statut du chèque mis à jour: ${statut}`,
      payment
    });

  } catch (err) {
    console.error('Erreur mise à jour statut chèque:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});
// ⚠️ Ne pas oublier en haut de app.js (si pas deja fait) :
// const DocumentEtudiant = require('./models/DocumentEtudiant');

// ✅ Route pour récupérer la fiche de santé d'un étudiant (auto-remplie si elle n'existe pas encore)
// ✅ Route pour récupérer la fiche de santé d'un étudiant (auto-remplie si elle n'existe pas encore)
app.get('/api/etudiants/:id/fiche-sante', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiantId = req.params.id;

    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ error: 'Étudiant introuvable' });
    }

    // Infos de l'étudiant utilisées pour pré-remplir la fiche et le PDF
    // (nom, date de naissance pour l'âge, coordonnées des parents)
    const infosEtudiant = {
      nomComplet: etudiant.nomComplet,
      dateNaissance: etudiant.dateNaissance,
      telephoneEtudiant: etudiant.telephoneEtudiant,
      nomCompletPere: etudiant.nomCompletPere,
      telephonePere: etudiant.telephonePere,
      nomCompletMere: etudiant.nomCompletMere,
      telephoneMere: etudiant.telephoneMere
    };

    let doc = await DocumentEtudiant.findOne({ etudiant: etudiantId, type: 'sante' });

    if (!doc) {
      // Pas encore de fiche santé -> on renvoie un modèle pré-rempli depuis l'étudiant
      return res.json({
        existe: false,
        etudiant: infosEtudiant,
        data: {
          contactUrgenceNom: '',
          contactUrgenceLien: '',
          contactUrgenceTel: '',
          asthme: false,
          diabete: false,
          ellipse: false,
          migraine: false,
          hernie: false,
          varicelle: false,
          rougeole: false,
          troubleComportement: false,
          troubleComportementType: '',
          troubleAttention: false,
          troubleAttentionType: '',
          santeMentale: '',
          autre: '',
          hospitalise: false,
          hospitaliseDate: null,
          hospitaliseDescription: '',
          suiviProfessionnel: false,
          suiviProfessionnelDetails: ''
        },
        complet: false
      });
    }

    res.json({
      existe: true,
      _id: doc._id,
      etudiant: infosEtudiant,
      data: doc.data,
      complet: doc.complet,
      dernierModifiePar: doc.dernierModifiePar,
      dernierModifieParRole: doc.dernierModifieParRole,
      updatedAt: doc.updatedAt
    });

  } catch (err) {
    console.error('❌ Erreur récupération fiche santé:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route pour créer ou mettre à jour la fiche de santé (upsert + historique automatique)
app.put('/api/etudiants/:id/fiche-sante', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiantId = req.params.id;
    const { data, complet } = req.body;

    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ error: 'Étudiant introuvable' });
    }

    // Récupérer le nom + rôle de la personne connectée (admin ou manager)
    const modifiePar = req.user?.nom || req.user?.nomComplet || 'Inconnu';
    const modifieParRole = req.userRole || req.role || 'admin';

    let doc = await DocumentEtudiant.findOne({ etudiant: etudiantId, type: 'sante' });

    if (doc) {
      // Sauvegarder l'ancienne version dans l'historique avant d'écraser
      doc.historique.push({
        data: doc.data,
        modifiePar: doc.dernierModifiePar,
        modifieParRole: doc.dernierModifieParRole,
        dateModification: doc.updatedAt
      });

      doc.data = data;
      doc.complet = complet === true;
      doc.dernierModifiePar = modifiePar;
      doc.dernierModifieParRole = modifieParRole;

      await doc.save();
      console.log('✅ Fiche santé mise à jour pour:', etudiant.nomComplet);

    } else {
      // Première création, pas d'historique
      doc = await DocumentEtudiant.create({
        etudiant: etudiantId,
        type: 'sante',
        data: data,
        complet: complet === true,
        dernierModifiePar: modifiePar,
        dernierModifieParRole: modifieParRole,
        historique: []
      });
      console.log('✅ Fiche santé créée pour:', etudiant.nomComplet);
    }

    res.json({ message: 'Fiche santé enregistrée avec succès', doc });

  } catch (err) {
    console.error('❌ Erreur enregistrement fiche santé:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route pour consulter l'historique des versions de la fiche santé
app.get('/api/etudiants/:id/fiche-sante/historique', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiantId = req.params.id;

    const doc = await DocumentEtudiant.findOne({ etudiant: etudiantId, type: 'sante' });
    if (!doc) {
      return res.json({ historique: [] });
    }

    res.json({ historique: doc.historique });

  } catch (err) {
    console.error('❌ Erreur récupération historique fiche santé:', err);
    res.status(500).json({ error: err.message });
  }
});
// ✅ Route pour récupérer l'engagement au règlement intérieur d'un étudiant
app.get('/api/etudiants/:id/reglement', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiantId = req.params.id;

    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ error: 'Étudiant introuvable' });
    }

    const infosEtudiant = {
      nomComplet: etudiant.nomComplet,
      nomCompletPere: etudiant.nomCompletPere,
      nomCompletMere: etudiant.nomCompletMere
    };

    let doc = await DocumentEtudiant.findOne({ etudiant: etudiantId, type: 'reglement' });

    if (!doc) {
      return res.json({
        existe: false,
        etudiant: infosEtudiant,
        data: {
          nomSignataire: '',
          accepte: false,
          dateSignature: null
        },
        complet: false
      });
    }

    res.json({
      existe: true,
      _id: doc._id,
      etudiant: infosEtudiant,
      data: doc.data,
      complet: doc.complet,
      dernierModifiePar: doc.dernierModifiePar,
      dernierModifieParRole: doc.dernierModifieParRole,
      updatedAt: doc.updatedAt
    });

  } catch (err) {
    console.error('❌ Erreur récupération règlement intérieur:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route pour créer ou mettre à jour l'engagement au règlement intérieur (upsert + historique)
app.put('/api/etudiants/:id/reglement', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiantId = req.params.id;
    const { data, complet } = req.body;

    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ error: 'Étudiant introuvable' });
    }

    const modifiePar = req.user?.nom || req.user?.nomComplet || 'Inconnu';
    const modifieParRole = req.userRole || req.role || 'admin';

    let doc = await DocumentEtudiant.findOne({ etudiant: etudiantId, type: 'reglement' });

    if (doc) {
      doc.historique.push({
        data: doc.data,
        modifiePar: doc.dernierModifiePar,
        modifieParRole: doc.dernierModifieParRole,
        dateModification: doc.updatedAt
      });

      doc.data = data;
      doc.complet = complet === true;
      doc.dernierModifiePar = modifiePar;
      doc.dernierModifieParRole = modifieParRole;

      await doc.save();
      console.log('✅ Règlement intérieur mis à jour pour:', etudiant.nomComplet);

    } else {
      doc = await DocumentEtudiant.create({
        etudiant: etudiantId,
        type: 'reglement',
        data: data,
        complet: complet === true,
        dernierModifiePar: modifiePar,
        dernierModifieParRole: modifieParRole,
        historique: []
      });
      console.log('✅ Règlement intérieur créé pour:', etudiant.nomComplet);
    }

    res.json({ message: 'Règlement intérieur enregistré avec succès', doc });

  } catch (err) {
    console.error('❌ Erreur enregistrement règlement intérieur:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route pour consulter l'historique des versions du règlement intérieur
app.get('/api/etudiants/:id/reglement/historique', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const etudiantId = req.params.id;

    const doc = await DocumentEtudiant.findOne({ etudiant: etudiantId, type: 'reglement' });
    if (!doc) {
      return res.json({ historique: [] });
    }

    res.json({ historique: doc.historique });

  } catch (err) {
    console.error('❌ Erreur récupération historique règlement intérieur:', err);
    res.status(500).json({ error: err.message });
  }
});
// ============================================
// 10. GÉNÉRER RAPPORT PDF
// ============================================
app.get('/api/paiements-mensuels/rapport', authInscripteur, async (req, res) => {
  try {
    const { type, mois, anneeScolaire } = req.query;
    const annee = anneeScolaire || '2025/2026';

    const etudiants = await Etudiant.findVisible({ anneeScolaire: annee }).lean();
    
    let rapport = [];
    const moisNoms = ['Septembre', 'Octobre', 'Novembre', 'Décembre', 
                     'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'];

    if (type === 'mensuel' && mois !== undefined) {
      const moisIndex = parseInt(mois);
      
      rapport = await Promise.all(
        etudiants.map(async (etudiant) => {
          const paiements = await Payment.find({
            etudiant: etudiant._id,
            anneeScolaire: annee,
            type: 'mensuel'
          });

          let montantPayeCeMois = 0;
          
          paiements.forEach(paiement => {
            paiement.moisConcernes?.forEach(mc => {
              const mcMoisIndex = parseInt(mc.mois.split('-')[1]) - 9;
              if (mcMoisIndex === moisIndex) {
                montantPayeCeMois += mc.montantPaye;
              }
            });
          });

          return {
            nomComplet: etudiant.nomComplet,
            cours: etudiant.cours?.join(', ') || etudiant.niveau || '—',
            mensualite: etudiant.mensualite || 0,
            montantPaye: montantPayeCeMois,
            montantRestant: Math.max(0, (etudiant.mensualite || 0) - montantPayeCeMois),
            statut: montantPayeCeMois >= (etudiant.mensualite || 0) ? 'Payé' : 
                    montantPayeCeMois > 0 ? 'Partiel' : 'Non payé'
          };
        })
      );
    } else if (type === 'frais-inscription') {
      rapport = etudiants.map(etudiant => ({
        nomComplet: etudiant.nomComplet,
        cours: etudiant.cours?.join(', ') || etudiant.niveau || '—',
        fraisTotal: etudiant.fraisInscription || 0,
        fraisPaye: etudiant.fraisInscriptionMontantPaye || 0,
        fraisRestant: Math.max(0, (etudiant.fraisInscription || 0) - (etudiant.fraisInscriptionMontantPaye || 0)),
        statut: etudiant.fraisInscriptionPaye ? 'Payé' : 'Non payé'
      }));
    }

    res.json({
      success: true,
      type,
      mois: type === 'mensuel' ? moisNoms[mois] : null,
      anneeScolaire: annee,
      rapport,
      totaux: {
        totalDu: rapport.reduce((sum, r) => sum + (r.mensualite || r.fraisTotal || 0), 0),
        totalPaye: rapport.reduce((sum, r) => sum + r.montantPaye || r.fraisPaye || 0, 0),
        totalRestant: rapport.reduce((sum, r) => sum + r.montantRestant || r.fraisRestant || 0, 0),
        nombreEtudiants: rapport.length
      }
    });

  } catch (err) {
    console.error('Erreur génération rapport:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
});

// DELETE supprimer une image spécifique d'une activité (admin uniquement)
app.delete('/api/vie-scolaire/:id/images/:imageIndex', authAdminOrPaiementManager, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'ID d\'activité invalide',
        success: false
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        success: false
      });
    }
    
    const imageIndex = parseInt(req.params.imageIndex);
    if (imageIndex < 0 || imageIndex >= activity.images.length) {
      return res.status(400).json({
        error: 'Index d\'image invalide',
        success: false
      });
    }
    
    // Supprimer le fichier physique
    const imagePath = activity.images[imageIndex];
    const fullPath = path.join(__dirname, 'public', imagePath);
    fs.unlink(fullPath, (err) => {
      if (err) console.error('Erreur lors de la suppression de l\'image:', err);
    });
    
    // Retirer l'image du tableau
    activity.images.splice(imageIndex, 1);
    await activity.save();
    
    res.json({
      data: activity,
      message: 'Image supprimée avec succès',
      success: true
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la suppression de l\'image',
      success: false
    });
  }
});
app.get('/api/rappels', async (req, res) => {
  try {
    const rappels = await Rappel.find({ status: 'actif' })
      .populate('etudiant', 'nomComplet'); // نجلب فقط الاسم الكامل

    res.json(rappels); // نرسلها للـ frontend
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
app.delete('/api/rappels/:id', async (req, res) => {
  try {
    await Rappel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rappel supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route pour envoyer un message
app.post('/api/messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    const decoded = jwt.verify(token, 'jwt_secret_key');
    const { contenu, destinataireId, roleDestinataire } = req.body;

    if (!contenu || !destinataireId || !roleDestinataire) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    const message = new Message({
      contenu,
      destinataire: destinataireId,
      expediteur: decoded.id,
      roleExpediteur: decoded.role === 'etudiant' ? 'Etudiant' : 'Professeur',
      roleDestinataire,
      date: new Date(),
      lu: false
    });

    // Ajouter les champs pour la filtration
    if (decoded.role === 'etudiant') {
      message.professeur = destinataireId;
      message.etudiant = decoded.id;
    } else if (decoded.role === 'prof') {
      message.professeur = decoded.id;
      message.etudiant = destinataireId;
    }

    const savedMessage = await message.save();
    
    // Populer les données pour la réponse
    await savedMessage.populate('expediteur', 'nom nomComplet email');
    await savedMessage.populate('destinataire', 'nom nomComplet email');

    res.status(201).json({ 
      message: 'Message envoyé avec succès', 
      data: savedMessage 
    });
  } catch (err) {
    console.error('Erreur lors de l\'envoi:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour marquer tous les messages d'une conversation comme lus
app.patch('/api/messages/mark-conversation-read', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    const decoded = jwt.verify(token, 'jwt_secret_key');
    const { expediteurId } = req.body;

    if (!expediteurId) {
      return res.status(400).json({ message: 'ID de l\'expéditeur manquant' });
    }

    const role = decoded.role === 'etudiant' ? 'Etudiant' : 'Professeur';

    await Message.updateMany(
      {
        destinataire: decoded.id,
        roleDestinataire: role,
        expediteur: expediteurId,
        lu: { $ne: true }
      },
      {
        $set: {
          lu: true,
          dateLecture: new Date()
        }
      }
    );

    res.json({ message: 'Messages marqués comme lus' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir tous les messages pour un utilisateur
app.get('/api/messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    const decoded = jwt.verify(token, 'jwt_secret_key');
    const userId = decoded.id;
    const role = decoded.role === 'etudiant' ? 'Etudiant' : 'Professeur';

    const messages = await Message.find({
      $or: [
        { destinataire: userId, roleDestinataire: role },
        { expediteur: userId, roleExpediteur: role }
      ]
    })
    .sort({ date: -1 })
    .populate('expediteur', 'nom nomComplet email')
    .populate('destinataire', 'nom nomComplet email');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir les messages entre un professeur et un étudiant spécifique (pour le professeur)
app.get('/api/messages/professeur/:etudiantId', authProfesseur, async (req, res) => {
  try {
    const messages = await Message.find({
      professeur: req.professeurId,
      etudiant: req.params.etudiantId
    })
    .sort({ date: 1 })
    .populate('expediteur', 'nom nomComplet')
    .populate('destinataire', 'nom nomComplet');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir les messages entre un étudiant et un professeur spécifique (pour l'étudiant)
app.get('/api/messages/etudiant/:professeurId', authEtudiant, async (req, res) => {
  try {
    const messages = await Message.find({
      professeur: req.params.professeurId,
      etudiant: req.etudiantId
    })
    .sort({ date: 1 })
    .populate('expediteur', 'nom nomComplet')
    .populate('destinataire', 'nom nomComplet');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir les professeurs de l'étudiant
app.get('/api/etudiant/mes-professeurs', authEtudiant, async (req, res) => {
  try {
    const etudiant = await Etudiant.findById(req.etudiantId);
    const coursEtudiant = etudiant.cours;

    const professeurs = await Professeur.find({
      cours: { $in: coursEtudiant },
      actif: true
    }).select('_id nom cours image genre');

    res.json(professeurs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir les professeurs avec leurs derniers messages (pour l'étudiant)


// ✅ Route pour vérifier le statut en ligne des utilisateurs
app.get('/api/users/online-status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    // Pour une vraie application, vous devriez implémenter un système de présence
    // Ici, on simule avec des utilisateurs aléatoires en ligne
    const onlineUsers = []; // Remplacez par votre logique de présence

    res.json({ onlineUsers });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ✅ Route pour obtenir les informations de l'utilisateur actuel (étudiant)
app.get('/api/messages/notifications-etudiant', authEtudiant, async (req, res) => {
  try {
    const messages = await Message.find({
      destinataire: req.etudiantId,
      roleDestinataire: 'Etudiant',
      lu: false
    })
    .sort({ date: -1 })
    .limit(10)
    .populate({
      path: 'expediteur',
      select: 'nom nomComplet email image',
      model: 'Professeur'
    });

    res.json(messages);
  } catch (err) {
    console.error('Erreur chargement notifications messages:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
app.post('/api/admin/paiement-managers', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { nom, email, telephone, motDePasse, actif = true } = req.body;

    // Validation des champs requis
    if (!nom || !email || !motDePasse || !telephone) {
      return res.status(400).json({ 
        message: 'Nom, email, téléphone et mot de passe sont requis' 
      });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Format d\'email invalide' 
      });
    }

    // Validation mot de passe
    if (motDePasse.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Vérifier si l'email existe déjà
    const existingManager = await PaiementManager.findOne({ email: email.toLowerCase().trim() });
    if (existingManager) {
      return res.status(400).json({ 
        message: 'Cet email est déjà utilisé par un autre gestionnaire' 
      });
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(motDePasse, saltRounds);

    // Créer le nouveau gestionnaire
    const manager = new PaiementManager({
      nom: nom.trim(),
      email: email.toLowerCase().trim(),
      telephone: telephone.trim(),
      motDePasse: hashedPassword,
      actif: actif
    });

    await manager.save();

    // Retourner les données sans le mot de passe
    const managerData = manager.toObject();
    delete managerData.motDePasse;

    res.status(201).json(managerData); // ✅ Return the manager data directly

  } catch (err) {
    console.error('Erreur création gestionnaire:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création du gestionnaire',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 2. Lire tous les gestionnaires de paiement (GET)
app.get('/api/admin/paiement-managers', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { page = 1, limit = 50, actif, search } = req.query;
    
    // Construire les filtres
    let filter = {};
    
    if (typeof actif !== 'undefined') {
      filter.actif = actif === 'true';
    }
    
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { telephone: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const managers = await PaiementManager
      .find(filter, { motDePasse: 0 }) // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PaiementManager.countDocuments(filter);

    // ✅ Return managers array directly (as expected by frontend)
    res.json(managers);

  } catch (err) {
    console.error('Erreur récupération gestionnaires:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des gestionnaires',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 3. Lire un gestionnaire spécifique (GET)
app.get('/api/admin/paiement-managers/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'ID de gestionnaire invalide' 
      });
    }

    const manager = await PaiementManager.findById(id, { motDePasse: 0 });
    
    if (!manager) {
      return res.status(404).json({ 
        message: 'Gestionnaire de paiement non trouvé' 
      });
    }

    res.json(manager); // ✅ Return manager data directly

  } catch (err) {
    console.error('Erreur récupération gestionnaire:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération du gestionnaire',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 4. Mettre à jour un gestionnaire (PUT)
app.put('/api/admin/paiement-managers/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, telephone, motDePasse, actif } = req.body;

    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'ID de gestionnaire invalide' 
      });
    }

    // Vérifier si le gestionnaire existe
    const existingManager = await PaiementManager.findById(id);
    if (!existingManager) {
      return res.status(404).json({ 
        message: 'Gestionnaire de paiement non trouvé' 
      });
    }

    // Préparer les mises à jour
    const updates = {};

    if (nom) {
      updates.nom = nom.trim();
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Format d\'email invalide' 
        });
      }

      // Vérifier si l'email est déjà utilisé par un autre gestionnaire
      const emailExists = await PaiementManager.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: id }
      });

      if (emailExists) {
        return res.status(400).json({ 
          message: 'Cet email est déjà utilisé par un autre gestionnaire' 
        });
      }

      updates.email = email.toLowerCase().trim();
    }

    if (telephone) {
      updates.telephone = telephone.trim();
    }

    if (typeof actif !== 'undefined') {
      updates.actif = Boolean(actif);
    }

    // Gestion du mot de passe
    if (motDePasse) {
      if (motDePasse.length < 6) {
        return res.status(400).json({ 
          message: 'Le mot de passe doit contenir au moins 6 caractères' 
        });
      }

      const saltRounds = 12;
      updates.motDePasse = await bcrypt.hash(motDePasse, saltRounds);
    }

    // Mettre à jour la date de modification
    updates.updatedAt = new Date();

    const updatedManager = await PaiementManager.findByIdAndUpdate(
      id,
      updates,
      { 
        new: true, 
        select: '-motDePasse',
        runValidators: true 
      }
    );

    res.json(updatedManager); // ✅ Return updated manager directly

  } catch (err) {
    console.error('Erreur mise à jour gestionnaire:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la mise à jour du gestionnaire',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 5. Supprimer un gestionnaire (DELETE)
app.delete('/api/admin/paiement-managers/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'ID de gestionnaire invalide' 
      });
    }

    const manager = await PaiementManager.findById(id);
    
    if (!manager) {
      return res.status(404).json({ 
        message: 'Gestionnaire de paiement non trouvé' 
      });
    }

    // Optionnel : Vérifier s'il y a des transactions liées
    // const transactionsCount = await Transaction.countDocuments({ managerId: id });
    // if (transactionsCount > 0) {
    //   return res.status(400).json({ 
    //     message: 'Impossible de supprimer ce gestionnaire car il a des transactions associées' 
    //   });
    // }

    await PaiementManager.findByIdAndDelete(id);

    res.json({ 
      success: true,
      message: 'Gestionnaire de paiement supprimé avec succès',
      deletedManager: {
        id: manager._id,
        nom: manager.nom,
        email: manager.email
      }
    });

  } catch (err) {
    console.error('Erreur suppression gestionnaire:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la suppression du gestionnaire',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 6. Activer/Désactiver un gestionnaire (PATCH)
app.patch('/api/admin/paiement-managers/:id/toggle-active', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'ID de gestionnaire invalide' 
      });
    }

    const manager = await PaiementManager.findById(id);
    
    if (!manager) {
      return res.status(404).json({ 
        message: 'Gestionnaire de paiement non trouvé' 
      });
    }

    // Inverser le statut actif
    manager.actif = !manager.actif;
    manager.updatedAt = new Date();
    
    await manager.save();

    // Remove password before sending response
    const managerResponse = manager.toObject();
    delete managerResponse.motDePasse;

    res.json(managerResponse); // ✅ Return updated manager directly

  } catch (err) {
    console.error('Erreur changement statut gestionnaire:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors du changement de statut',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});






app.get('/api/notifications', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const notifications = [];
    const aujourdHui = new Date();

    // 1. Traitement des paiements expirés et nouveaux
    const etudiants = await Etudiant.find({ actif: true }).lean();
    const paiements = await Paiement.find().populate('etudiant', 'nomComplet actif image telephone email').lean();

    for (const etudiant of etudiants) {
      if (!etudiant.cours || etudiant.cours.length === 0) continue;

      for (const nomCours of etudiant.cours) {
        // Filtrer et trier les paiements pour cet étudiant et ce cours
        const paiementsCours = paiements
          .filter(p => 
            p.etudiant?._id.toString() === etudiant._id.toString() && 
            p.cours.includes(nomCours)
          )
          .sort((a, b) => new Date(a.moisDebut).getTime() - new Date(b.moisDebut).getTime());

        const prixTotal = etudiant.prixTotal || 0;
        const montantPaye = paiementsCours.reduce((acc, p) => acc + (p.montant || 0), 0);
        const reste = Math.max(0, prixTotal - montantPaye);

        // Ignorer si paiement complet
        if (reste <= 0) continue;

        let derniereFin;
        let typeNotification = '';

        // Cas nouveau sans paiement
        if (paiementsCours.length === 0) {
          derniereFin = etudiant.dateInscription || etudiant.createdAt;
          typeNotification = 'payment_new';
        } else {
          // Fusionner les périodes de paiement
          const fusionnees = [];
          for (const paiement of paiementsCours) {
            const debut = new Date(paiement.moisDebut);
            const fin = new Date(debut);
            fin.setMonth(fin.getMonth() + (paiement.nombreMois || 1));

            if (fusionnees.length === 0) {
              fusionnees.push({ debut, fin });
            } else {
              const derniere = fusionnees[fusionnees.length - 1];
              const unJourApres = new Date(derniere.fin);
              unJourApres.setDate(unJourApres.getDate() + 1);

              if (debut <= unJourApres) {
                derniere.fin = fin > derniere.fin ? fin : derniere.fin;
              } else {
                fusionnees.push({ debut, fin });
              }
            }
          }
          derniereFin = fusionnees[fusionnees.length - 1].fin;
          typeNotification = derniereFin < aujourdHui ? 'payment_expired' : 'payment_active';
        }

        // Créer notification si nouveau ou expiré
        if (typeNotification === 'payment_new' || (typeNotification === 'payment_expired' && reste > 0)) {
          const joursExpires = Math.ceil((aujourdHui - derniereFin) / (1000 * 60 * 60 * 24));
          
          notifications.push({
            id: `payment_${typeNotification}_${etudiant._id}_${nomCours}`,
            type: typeNotification,
            title: typeNotification === 'payment_new' 
              ? 'Nouvel étudiant non payé' 
              : 'Paiement expiré',
            message: typeNotification === 'payment_new'
              ? `🆕 ${etudiant.nomComplet} inscrit à "${nomCours}" n'a encore effectué aucun paiement`
              : `💰 Paiement de ${etudiant.nomComplet} pour "${nomCours}" a expiré il y a ${joursExpires} jour(s)`,
            priority: typeNotification === 'payment_new' ? 'high' : 'urgent',
            timestamp: derniereFin,
            data: {
              etudiantId: etudiant._id,
              etudiantNom: etudiant.nomComplet,
              etudiantInfo: {
                telephone: etudiant.telephone,
                email: etudiant.email,
                image: etudiant.image
              },
              cours: nomCours,
              joursExpires,
              prixTotal,
              montantPaye,
              reste,
              derniereFin
            }
          });
        }
      }
    }

    // 2. Traitement des paiements qui expirent bientôt (7 jours ou moins)
    for (const etudiant of etudiants) {
      if (!etudiant.cours || etudiant.cours.length === 0) continue;

      for (const nomCours of etudiant.cours) {
        const paiementsCours = paiements
          .filter(p => 
            p.etudiant?._id.toString() === etudiant._id.toString() && 
            p.cours.includes(nomCours)
          )
          .sort((a, b) => new Date(a.moisDebut).getTime() - new Date(b.moisDebut).getTime());

        if (paiementsCours.length === 0) continue;

        // Fusionner les périodes
        const fusionnees = [];
        for (const paiement of paiementsCours) {
          const debut = new Date(paiement.moisDebut);
          const fin = new Date(debut);
          fin.setMonth(fin.getMonth() + (paiement.nombreMois || 1));

          if (fusionnees.length === 0) {
            fusionnees.push({ debut, fin });
          } else {
            const derniere = fusionnees[fusionnees.length - 1];
            const unJourApres = new Date(derniere.fin);
            unJourApres.setDate(unJourApres.getDate() + 1);

            if (debut <= unJourApres) {
              derniere.fin = fin > derniere.fin ? fin : derniere.fin;
            } else {
              fusionnees.push({ debut, fin });
            }
          }
        }

        const derniereFin = fusionnees[fusionnees.length - 1].fin;
        const joursRestants = Math.ceil((derniereFin - aujourdHui) / (1000 * 60 * 60 * 24));

        // Notification pour paiement expirant bientôt (entre 1 et 7 jours)
        if (joursRestants <= 7 && joursRestants > 0) {
          notifications.push({
            id: `payment_expiring_${etudiant._id}_${nomCours}`,
            type: 'payment_expiring',
            title: 'Paiement expirant bientôt',
            message: `⏳ Paiement de ${etudiant.nomComplet} pour "${nomCours}" expire dans ${joursRestants} jour(s)`,
            priority: joursRestants <= 3 ? 'high' : 'medium',
            timestamp: derniereFin,
            data: {
              etudiantId: etudiant._id,
              etudiantNom: etudiant.nomComplet,
              etudiantInfo: {
                telephone: etudiant.telephone,
                email: etudiant.email,
                image: etudiant.image
              },
              cours: nomCours,
              joursRestants,
              dateExpiration: derniereFin
            }
          });
        }
      }
    }

    // 3. Traitement des absences
    const SEUILS_ABSENCE = { NORMAL: 10, URGENT: 15, CRITIQUE: 20 };
    for (const etudiant of etudiants) {
      const absences = await Presence.find({
        etudiant: etudiant._id,
        present: false,
      }).lean();

      const nombreAbsences = absences.length;
      const notificationSupprimee = await NotificationSupprimee.findOne({
        key: `absence_${etudiant._id}`,
        type: 'absence_frequent',
      }).lean();

      let doitCreerNotification = false;
      let priorite = 'medium';
      let titre = '';
      let message = '';

      if (nombreAbsences >= SEUILS_ABSENCE.CRITIQUE) {
        priorite = 'urgent';
        titre = 'CRITIQUE: Absences excessives';
        message = `${etudiant.nomComplet} a ${nombreAbsences} absences (seuil critique: ${SEUILS_ABSENCE.CRITIQUE})`;
        doitCreerNotification = !notificationSupprimee || notificationSupprimee.nombreAbsencesAuMomentSuppression < nombreAbsences;
      } else if (nombreAbsences >= SEUILS_ABSENCE.URGENT) {
        priorite = 'high';
        titre = 'URGENT: Absences répétées';
        message = `${etudiant.nomComplet} a ${nombreAbsences} absences (seuil urgent: ${SEUILS_ABSENCE.URGENT})`;
        doitCreerNotification = !notificationSupprimee || notificationSupprimee.nombreAbsencesAuMomentSuppression < nombreAbsences;
      } else if (nombreAbsences >= SEUILS_ABSENCE.NORMAL) {
        priorite = 'medium';
        titre = 'Attention: Absences multiples';
        message = `${etudiant.nomComplet} a ${nombreAbsences} absences (seuil normal: ${SEUILS_ABSENCE.NORMAL})`;
        doitCreerNotification = !notificationSupprimee || notificationSupprimee.nombreAbsencesAuMomentSuppression < nombreAbsences;
      }

      if (doitCreerNotification) {
        const absencesParCours = {};
        for (const absence of absences) {
          absencesParCours[absence.cours] = (absencesParCours[absence.cours] || 0) + 1;
        }

        notifications.push({
          id: `absence_frequent_${etudiant._id}_${nombreAbsences}`,
          type: 'absence_frequent',
          title: titre,
          message: message,
          priority: priorite,
          timestamp: new Date(),
          data: {
            etudiantId: etudiant._id,
            etudiantNom: etudiant.nomComplet,
            nombreAbsences,
            seuil: priorite.toLowerCase(),
            absencesParCours,
            derniereAbsence: absences.length > 0 ? absences[absences.length - 1].dateSession : null,
          },
        });
      }
    }

    // 4. Traitement des événements à venir
    const dans7jours = new Date();
    dans7jours.setDate(dans7jours.getDate() + 7);
    const evenements = await Evenement.find({
      dateDebut: { $gte: aujourdHui, $lte: dans7jours },
    }).sort({ dateDebut: 1 }).lean();

    for (const evenement of evenements) {
      const joursRestants = Math.ceil((new Date(evenement.dateDebut) - aujourdHui) / (1000 * 60 * 60 * 24));
      let priorite = 'medium';
      if (joursRestants === 0) priorite = 'urgent';
      else if (joursRestants === 1) priorite = 'high';

      notifications.push({
        id: `event_upcoming_${evenement._id}`,
        type: 'event_upcoming',
        title: `${evenement.type} programmé`,
        message: joursRestants === 0
          ? `${evenement.titre} prévu aujourd'hui`
          : `${evenement.titre} prévu dans ${joursRestants} jour(s)`,
        priority: priorite,
        timestamp: evenement.dateDebut,
        data: {
          evenementId: evenement._id,
          titre: evenement.titre,
          type: evenement.type,
          dateDebut: evenement.dateDebut,
          joursRestants,
        },
      });
    }

    // Tri final par priorité et date
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    res.json({
      notifications,
      total: notifications.length,
      urgent: notifications.filter(n => n.priority === 'urgent').length,
      high: notifications.filter(n => n.priority === 'high').length,
      medium: notifications.filter(n => n.priority === 'medium').length,
    });
  } catch (err) {
    console.error('❌ Erreur notifications:', err);
    res.status(500).json({ error: err.message });
  }
});
// Route pour voir les étudiants par cours avec leurs absences
app.get('/api/professeur/etudiants-absences/:coursNom', authProfesseur, async (req, res) => {
  try {
    const { coursNom } = req.params;
    const professeurId = req.professeurId;

    // Vérifier que le professeur enseigne ce cours
    const professeur = await Professeur.findById(professeurId);
    if (!professeur || !professeur.cours.includes(coursNom)) {
      return res.status(403).json({ 
        message: 'Vous n\'êtes pas autorisé à voir les étudiants de ce cours' 
      });
    }

    // Récupérer tous les étudiants de ce cours
    const etudiants = await Etudiant.find({
      cours: coursNom,
      actif: true
    }).select('nomComplet email telephoneEtudiant image genre');

    // Pour chaque étudiant, récupérer ses absences
    const etudiantsAvecAbsences = await Promise.all(
      etudiants.map(async (etudiant) => {
        // Toutes les absences pour ce cours
        const absences = await Presence.find({
          etudiant: etudiant._id,
          cours: coursNom,
          present: false
        }).sort({ dateSession: -1 });

        // Total des sessions pour ce cours
        const totalSessions = await Presence.countDocuments({
          etudiant: etudiant._id,
          cours: coursNom
        });

        // Absences récentes (7 derniers jours)
        const absencesRecentes = await Presence.countDocuments({
          etudiant: etudiant._id,
          cours: coursNom,
          present: false,
          dateSession: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        // Absences ce mois
        const debutMois = new Date();
        debutMois.setDate(1);
        const absencesCeMois = await Presence.countDocuments({
          etudiant: etudiant._id,
          cours: coursNom,
          present: false,
          dateSession: { $gte: debutMois }
        });

        return {
          ...etudiant.toObject(),
          absences: {
            total: absences.length,
            recentes: absencesRecentes,
            ceMois: absencesCeMois,
            details: absences.slice(0, 10) // 10 dernières absences
          },
          sessions: {
            total: totalSessions,
            tauxPresence: totalSessions > 0 ? 
              (((totalSessions - absences.length) / totalSessions) * 100).toFixed(1) : 0
          }
        };
      })
    );

    // Trier par nombre d'absences (les plus absents en premier)
    etudiantsAvecAbsences.sort((a, b) => b.absences.total - a.absences.total);

    res.json({
      cours: coursNom,
      professeur: professeur.nom,
      etudiants: etudiantsAvecAbsences,
      statistiques: {
        totalEtudiants: etudiantsAvecAbsences.length,
        etudiantsProblematiques: etudiantsAvecAbsences.filter(e => e.absences.total >= 3).length,
        etudiantsCritiques: etudiantsAvecAbsences.filter(e => e.absences.total >= 5).length
      }
    });

  } catch (err) {
    console.error('Erreur récupération absences:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// 7. Route supplémentaire : Statistiques des gestionnaires


app.get('/api/messages/notifications-professeur', authProfesseur, async (req, res) => {
  try {
    const messages = await Message.find({
      destinataire: req.professeurId,
      roleDestinataire: 'Professeur',
      lu: false
    })
    .sort({ date: -1 })
    .limit(10)
    .populate({
      path: 'expediteur',
      select: 'nom nomComplet email',
      model: 'Etudiant'
    });

    res.json(messages);
  } catch (err) {
    console.error('Erreur notifications professeur:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Route : GET /api/messages/notifications-etudiant
app.get('/notifications-etudiant', authEtudiant, async (req, res) => {
  try {
    const messages = await Message.find({
      etudiant: req.etudiantId,
      roleExpediteur: 'Professeur',
      lu: false
    })
    .populate('professeur', 'nom image')
    .sort({ date: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Exemple Express
// backend route

app.put('/update-profil', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  const { nom, email, ancienMotDePasse, nouveauMotDePasse } = req.body;

  try {
    const admin = await Admin.findById(req.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin introuvable' });

    // Mise à jour du nom si fourni
    if (nom) {
      admin.nom = nom;
    }

    // Mise à jour de l'email si fourni
    if (email) {
      admin.email = email;
    }

    // Mise à jour du mot de passe si fourni
    if (ancienMotDePasse && nouveauMotDePasse) {
      const isMatch = await bcrypt.compare(ancienMotDePasse, admin.motDePasse);
      if (!isMatch) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });

      const salt = await bcrypt.genSalt(10);
      admin.motDePasse = await bcrypt.hash(nouveauMotDePasse, salt);
    }

    await admin.save();
    res.json({ 
      message: 'Profil mis à jour avec succès',
      admin: {
        id: admin._id,
        nom: admin.nom,
        email: admin.email
      }
    });

  } catch (err) {
    console.error('Erreur update admin:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
app.get('/api/professeur/mes-etudiants-messages', authProfesseur, async (req, res) => {
  try {
    // 1. Récupérer les cours du professeur connecté
    const professeur = await Professeur.findById(req.professeurId).select('cours');
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    // 2. Trouver les étudiants qui ont au moins un cours commun
    const etudiants = await Etudiant.find({
      cours: { $in: professeur.cours }
    }).select('_id nomComplet email image genre lastSeen cours');

    // 3. Récupérer les messages de ce professeur
    const messages = await Message.find({ professeur: req.professeurId }).sort({ date: -1 });

    // 4. Mapper le dernier message par étudiant
    const lastMessagesMap = new Map();
    for (const msg of messages) {
      const etuId = msg.etudiant.toString();
      if (!lastMessagesMap.has(etuId)) {
        lastMessagesMap.set(etuId, {
          contenu: msg.contenu,
          date: msg.date,
          roleExpediteur: msg.roleExpediteur,
          fichier: msg.fichier
        });
      }
    }

    // 5. Fusionner les données des étudiants avec leur dernier message
    const result = etudiants.map(etudiant => ({
      ...etudiant.toObject(),
      dernierMessage: lastMessagesMap.get(etudiant._id.toString()) || null
    }));

    res.json(result);
  } catch (err) {
    console.error('Erreur lors de la récupération des étudiants:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.post('/api/messages/upload-prof', authProfesseur, uploadMessageFile.single('fichier'), async (req, res) => {
  try {
    const { contenu, destinataireId, roleDestinataire } = req.body;

    const hasContenu = contenu && contenu.trim() !== '';
    const hasFile = !!req.file;

    if (!hasContenu && !hasFile) {
      return res.status(400).json({ message: 'يجب أن يحتوي الرسالة على نص أو ملف مرفق' });
    }

    const messageData = {
      expediteur: req.professeurId,
      roleExpediteur: 'Professeur',
      destinataire: destinataireId,
      roleDestinataire: 'Etudiant',
      professeur: req.professeurId,
      etudiant: destinataireId,
    };

    if (hasContenu) messageData.contenu = contenu.trim();
    if (hasFile) messageData.fichier = `/uploads/messages/${req.file.filename}`;

    const newMessage = new Message(messageData);
    await newMessage.save();

    res.status(201).json({
      message: 'تم إرسال الرسالة بنجاح',
      data: newMessage,
    });
  } catch (err) {
    console.error('خطأ أثناء إرسال الرسالة من الأستاذ:', err);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ✅ Route pour obtenir les informations du professeur connecté
app.get('/api/professeur/me', authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeur.findById(req.professeurId).select('-motDePasse');
    if (!professeur) {
      return res.status(404).json({ message: 'Professeur non trouvé' });
    }
    res.json(professeur);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// ===== ROUTES PROFILE ADMIN =====
console.log('🔧 Ajout des routes profile admin...');

app.get('/api/admin/profile', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    console.log('📝 Route profile GET appelée - Admin ID:', req.adminId);
    
    const admin = await Admin.findById(req.adminId).select('-motDePasse');
    if (!admin) {
      console.log('❌ Admin non trouvé');
      return res.status(404).json({ error: 'Admin non trouvé' });
    }
    
    console.log('✅ Admin trouvé:', admin.nom);
    res.json(admin);
  } catch (err) {
    console.error('❌ Erreur route profile GET:', err);
    res.status(500).json({ error: err.message });
  }
});
// ====================================================================
// 📸 ROUTES UPLOAD PHOTO ÉTUDIANT - À COPIER DIRECTEMENT DANS APP.JS
// ====================================================================
// ⚠️ Ajouter APRÈS la ligne 80: app.use('/uploads', express.static('uploads'));
// ====================================================================

// Configuration multer pour les photos étudiants (3MB max)
const photoEtudiantStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/etudiants/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'etudiant-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPhotoEtudiant = multer({
  storage: photoEtudiantStorage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non autorisé'), false);
    }
  }
});

// ====================================================================
// 📍 ROUTE 1: GET - Récupérer les informations de l'étudiant
// ====================================================================
app.get('/api/etudiant/photo/info', authEtudiant, async (req, res) => {
  try {
    const etudiantId = req.etudiantId; // Vient de votre middleware authEtudiant
    
    const etudiant = await Etudiant.findById(etudiantId).select(
      'nomComplet email image codeMassar niveau'
    );
    
    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: {
          ar: 'الطالب غير موجود',
          fr: 'Étudiant non trouvé'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        nomComplet: etudiant.nomComplet,
        email: etudiant.email,
        image: etudiant.image,
        codeMassar: etudiant.codeMassar,
        niveau: etudiant.niveau,
        photoDejaEnvoyee: !!etudiant.image
      }
    });
  } catch (error) {
    console.error('Erreur récupération infos étudiant:', error);
    res.status(500).json({
      success: false,
      message: {
        ar: 'حدث خطأ في الخادم',
        fr: 'Erreur serveur'
      }
    });
  }
});
// ============================================
// ROUTES BACKEND POUR LE STAFF
// À ajouter dans votre fichier de routes (server.js ou rapportsRoutes.js)
// ============================================

// GET - Récupérer tous les rapports (Pour Staff: Inscripteur et Paiement Manager)
app.get('/api/rapports/staff/rapports', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const { statut, cours, dateDebut, dateFin } = req.query;
    
    let query = {};
    
    if (statut) {
      query.statut = statut;
    }
    
    if (cours) {
      query.cours = cours;
    }
    
    if (dateDebut || dateFin) {
      query.date = {};
      if (dateDebut) query.date.$gte = new Date(dateDebut);
      if (dateFin) query.date.$lte = new Date(dateFin);
    }

    const rapports = await Rapport.find(query)
      .populate('professeur', 'nom prenom email')
      .populate('etudiant', 'nomComplet email niveau anneeScolaire telephonePere telephoneMere')
      .sort({ date: -1 });

    res.json(rapports);
  } catch (err) {
    console.error('Erreur récupération rapports staff:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Récupérer un rapport spécifique (Pour Staff)
app.get('/api/rapports/staff/rapports/:id', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const rapport = await Rapport.findById(req.params.id)
      .populate('professeur', 'nom prenom email')
      .populate('etudiant', 'nomComplet email niveau anneeScolaire telephonePere telephoneMere');

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    res.json(rapport);
  } catch (err) {
    console.error('Erreur récupération rapport staff:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Générer PDF d'un rapport (Pour Staff)
app.post('/api/rapports/staff/rapports/:id/generate-pdf', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    const rapport = await Rapport.findById(req.params.id)
      .populate('professeur', 'nom prenom email')
      .populate('etudiant', 'nomComplet email niveau anneeScolaire image');

    if (!rapport) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    let logoBase64 = null;
    let photoBase64 = null;

    const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'images', 'logo-ecole.jpg');
    if (fs.existsSync(logoPath)) {
      logoBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(logoPath).toString('base64');
    }

    if (rapport.etudiant && rapport.etudiant.image) {
      const photoPath = path.join(__dirname, '..', 'frontend', 'public', rapport.etudiant.image);
      if (fs.existsSync(photoPath)) {
        const ext = path.extname(photoPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        photoBase64 = `data:${mime};base64,` + fs.readFileSync(photoPath).toString('base64');
      }
    }

    const nomProf = rapport.professeur ? (rapport.professeur.prenom || '') + ' ' + (rapport.professeur.nom || '') : 'Non renseigné';

    const natureProbleme = rapport.natureProbleme || [];
    const mesurePrise = rapport.mesurePrise || [];

    // Problèmes
    const prob1 = natureProbleme.includes('Devoirs non faits') ? '[X]' : '[ ]';
    const prob2 = natureProbleme.includes('Indiscipline en classe') ? '[X]' : '[ ]';
    const prob3 = natureProbleme.includes('Bavardage excessif') ? '[X]' : '[ ]';
    const prob4 = natureProbleme.includes("Refus d'obéir") || natureProbleme.includes("Refus d'obeir") ? '[X]' : '[ ]';
    const prob5 = natureProbleme.includes('Violence verbale / physique') || natureProbleme.includes('Violence verbale/physique') ? '[X]' : '[ ]';
    const prob6 = natureProbleme.includes('Retard ou absence répétée') || natureProbleme.includes('Retard ou absence repetee') ? '[X]' : '[ ]';
    const prob7 = natureProbleme.includes('Autre') ? '[X]' : '[ ]';

    // Mesures
    const mes1 = mesurePrise.includes('Observation / remarque orale') || mesurePrise.includes('Observation/remarque orale') ? '[X]' : '[ ]';
    const mes2 = mesurePrise.includes('Avertissement écrit') || mesurePrise.includes('Avertissement ecrit') ? '[X]' : '[ ]';
    const mes3 = mesurePrise.includes('Élève exclu temporairement du cours') || mesurePrise.includes('Eleve exclu temporairement du cours') || mesurePrise.includes('Élève exclu temporairement') ? '[X]' : '[ ]';
    const mes4 = mesurePrise.includes('Communication avec les parents') || mesurePrise.includes('Communication avec parents') ? '[X]' : '[ ]';
    const mes5 = mesurePrise.includes('Autre') ? '[X]' : '[ ]';

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [30, 25, 30, 25],
      defaultStyle: { font: 'Amiri', fontSize: 10 },
      content: [
        // EN-TÊTE
        {
          columns: [
            logoBase64 ? { image: logoBase64, width: 75, height: 75 } : { text: '', width: 75 },
            {
              stack: [
                { text: 'Rapport d\'observation', fontSize: 16, bold: true, alignment: 'center', margin: [0, 12, 0, 3] },
                { text: 'Comportement des élèves', fontSize: 11, alignment: 'center' }
              ],
              width: '*'
            },
            photoBase64 ? { image: photoBase64, width: 55, height: 70 } : { text: '', width: 55 }
          ],
          margin: [0, 0, 0, 15]
        },

        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, lineColor: '#666' }], margin: [0, 0, 0, 12] },

        {
          columns: [
            { text: [{ text: 'Année scolaire : ', bold: true }, rapport.anneeScolaire || '2025/2026'], width: '50%' },
            { text: [{ text: 'Niveau/Classe : ', bold: true }, rapport.niveau || '...........'], width: '50%' }
          ], margin: [0, 0, 0, 8]
        },
        {
          columns: [
            { text: [{ text: 'Élève : ', bold: true }, rapport.etudiant?.nomComplet || ''], width: '50%' },
            { text: [{ text: 'Date : ', bold: true }, new Date(rapport.date).toLocaleDateString('fr-FR')], width: '50%' }
          ], margin: [0, 0, 0, 8]
        },
        { text: [{ text: 'Professeur : ', bold: true }, nomProf.trim()], margin: [0, 0, 0, 15] },

        // NATURE PROBLÈME
        { text: 'Nature du problème observé :', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
        {
          columns: [
            { stack: [
              { text: prob1 + ' Devoirs non faits', margin: [8, 0, 0, 4] },
              { text: prob2 + ' Indiscipline en classe', margin: [8, 0, 0, 4] },
              { text: prob3 + ' Bavardage excessif', margin: [8, 0, 0, 4] },
              { text: prob4 + ' Refus d\'obéir', margin: [8, 0, 0, 4] }
            ], width: '50%' },
            { stack: [
              { text: prob5 + ' Violence verbale/physique', margin: [8, 0, 0, 4] },
              { text: prob6 + ' Retard/absence répétée', margin: [8, 0, 0, 4] },
              { text: prob7 + ' Autre' + (rapport.autreProbleme ? ': ' + rapport.autreProbleme : ''), margin: [8, 0, 0, 4] }
            ], width: '50%' }
          ], margin: [0, 0, 0, 12]
        },

        // DESCRIPTION
        { text: "Description de l'incident :", bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          table: { widths: ['*'], heights: [55], body: [[{ text: rapport.descriptionIncident || '', fontSize: 9, margin: [5, 5, 5, 5] }]] },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000', vLineColor: () => '#000' },
          margin: [0, 0, 0, 12]
        },

        // MESURES
        { text: 'Mesure prise par le professeur :', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
        {
          columns: [
            { stack: [
              { text: mes1 + ' Observation/remarque orale', margin: [8, 0, 0, 4] },
              { text: mes2 + ' Avertissement écrit', margin: [8, 0, 0, 4] },
              { text: mes3 + ' Élève exclu temporairement', margin: [8, 0, 0, 4] }
            ], width: '50%' },
            { stack: [
              { text: mes4 + ' Communication avec parents', margin: [8, 0, 0, 4] },
              { text: mes5 + ' Autre' + (rapport.autreMesure ? ': ' + rapport.autreMesure : ''), margin: [8, 0, 0, 4] }
            ], width: '50%' }
          ], margin: [0, 0, 0, 12]
        },

        // OBSERVATIONS
        { text: 'Observation du professeur :', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          table: { widths: ['*'], heights: [45], body: [[{ text: rapport.observationProfesseur || '', fontSize: 9, margin: [5, 5, 5, 5] }]] },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#000', vLineColor: () => '#000' },
          margin: [0, 0, 0, 20]
        },

        // SIGNATURES
        {
          columns: [
            { stack: [{ text: 'Signature du professeur :', bold: true }, { text: '\n.....................................' }], width: '50%' },
            { stack: [
              { text: 'Visa de la direction :', bold: true, alignment: 'right' },
              { text: rapport.visaDirection ? '\nApposé le ' + new Date(rapport.dateVisa).toLocaleDateString('fr-FR') : '\n.....................................', alignment: 'right' }
            ], width: '50%' }
          ]
        }
      ]
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_' + rapport._id + '.pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (err) {
    console.error('Erreur PDF staff:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});
// ====================================================================
// 📍 ROUTE 2: POST - Upload photo (UNE SEULE FOIS)
// ====================================================================
app.post('/api/etudiant/photo/upload-photo', authEtudiant, uploadPhotoEtudiant.single('photo'), async (req, res) => {
  try {
    const etudiantId = req.etudiantId;
    
    // Vérifier si l'étudiant existe
    const etudiant = await Etudiant.findById(etudiantId);
    
    if (!etudiant) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: {
          ar: 'الطالب غير موجود',
          fr: 'Étudiant non trouvé'
        }
      });
    }
    
    // ✅ VÉRIFIER SI PHOTO DÉJÀ ENVOYÉE (BLOQUAGE)
    if (etudiant.image) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        photoDejaEnvoyee: true,
        message: {
          ar: 'لقد قمت بإرسال صورتك بالفعل. إذا كنت بحاجة إلى تعديلها، يرجى التواصل مع الإدارة المدرسية',
          fr: 'Vous avez déjà envoyé votre photo. Si vous devez la modifier, veuillez contacter la scolarité'
        }
      });
    }
    
    // Vérifier si un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: {
          ar: 'الرجاء اختيار صورة',
          fr: 'Veuillez sélectionner une photo'
        }
      });
    }
    
    // ✅ SAUVEGARDER LE CHEMIN DE LA PHOTO
    etudiant.image = req.file.path;
    await etudiant.save();
    
    res.status(200).json({
      success: true,
      message: {
        ar: 'تم إرسال الصورة بنجاح!',
        fr: 'Photo envoyée avec succès !'
      },
      data: {
        imagePath: etudiant.image
      }
    });
  } catch (error) {
    console.error('Erreur upload photo:', error);
    
    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    // Gestion erreur taille fichier
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: {
          ar: 'حجم الملف كبير جداً. الحد الأقصى هو 3 ميغابايت',
          fr: 'Fichier trop volumineux. Taille maximale : 3MB'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: {
        ar: 'حدث خطأ أثناء رفع الصورة',
        fr: 'Erreur lors de l\'envoi de la photo'
      }
    });
  }
});

// ====================================================================
// ✅ TERMINÉ! Les routes sont prêtes:
// GET  http://localhost:5004/api/etudiant/photo/info
// POST http://localhost:5004/api/etudiant/photo/upload-photo
// ====================================================================
app.put('/api/admin/profile', authAdminOrInscripteurOrPaiementManager, async (req, res) => {
  try {
    console.log('📝 Route profile PUT appelée - Admin ID:', req.adminId);
    console.log('📝 Body reçu:', req.body);
    
    const { nom, email, ancienMotDePasse, nouveauMotDePasse } = req.body;
    const admin = await Admin.findById(req.adminId);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin non trouvé' });
    }
    
    const updates = {};
    
    if (nom && nom.trim() !== admin.nom) {
      updates.nom = nom.trim();
    }
    
    if (email && email.trim() !== admin.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Format d\'email invalide' });
      }
      
      const existingAdmin = await Admin.findOne({ 
        email: email.trim(),
        _id: { $ne: req.adminId } 
      });
      if (existingAdmin) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      
      updates.email = email.trim();
    }
    
    if (ancienMotDePasse && nouveauMotDePasse) {
      const isValidPassword = await admin.comparePassword(ancienMotDePasse);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
      }
      
      if (nouveauMotDePasse.length < 6) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      }
      
      const salt = await bcrypt.genSalt(10);
      updates.motDePasse = await bcrypt.hash(nouveauMotDePasse, salt);
    } else if (ancienMotDePasse && !nouveauMotDePasse) {
      return res.status(400).json({ error: 'Le nouveau mot de passe est requis' });
    } else if (!ancienMotDePasse && nouveauMotDePasse) {
      return res.status(400).json({ error: 'L\'ancien mot de passe est requis' });
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune modification détectée' });
    }
    
    console.log('📝 Mises à jour à appliquer:', Object.keys(updates));
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.adminId,
      updates,
      { new: true, runValidators: true }
    ).select('-motDePasse');
    
    console.log('✅ Admin mis à jour avec succès');
    
    res.json({
      message: 'Profil mis à jour avec succès',
      admin: updatedAdmin,
      modifiedFields: Object.keys(updates)
    });
    
  } catch (err) {
    console.error('❌ Erreur route profile PUT:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

console.log('✅ Routes profile admin ajoutées');

// Lancer le serveur
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
