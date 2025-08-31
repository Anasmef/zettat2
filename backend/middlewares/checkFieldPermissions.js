// middlewares/checkFieldPermissions.js
const FIN_FIELDS = [
  'prixTotal', 'paye', 'pourcentageBourse', 'typePaiement', 'dateReglement', 'montantAPayer'
];

const checkFieldPermissions = (req, res, next) => {
  const role = req.user?.role || req.userRole || 'guest';
  const isFinanceRoute = /\/etudiants\/[^/]+\/finance\b/.test(req.originalUrl || '');

  // 🔒 منع الوصول الكامل على /finance لغير المصرّحين
  if (isFinanceRoute) {
    if (!(role === 'admin' || role === 'paiement_manager')) {
      return res.status(403).json({ message: 'Accès refusé: route finance réservée.' });
    }
    // اسمح فقط بالحقول المالية
    const allowed = {};
    FIN_FIELDS.forEach(f => { if (req.body[f] !== undefined) allowed[f] = req.body[f]; });
    req.body = allowed;
    return next();
  }

  // 🧹 حذف أي حقول مالية إذا كان Inscripteur
  if (role === 'inscripteur') {
    FIN_FIELDS.forEach(champ => { if (req.body[champ] !== undefined) delete req.body[champ]; });

    // قيم افتراضية فقط عند الإنشاء
    if (req.method === 'POST') {
      req.body.prixTotal = 0;
      req.body.paye = false;
      req.body.pourcentageBourse = 0;
      req.body.typePaiement = 'Cash';
    }
    console.log('🔒 Champs financiers masqués pour inscripteur');
  }

  next();
};

module.exports = { checkFieldPermissions };
