// FRONTEND CORRIGÉ - Version avec boutons par mois, frais d'inscription et design chèque
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Search, Bell, User, FileText, Trash2, 
  History, Edit, Check, AlertCircle, FileDown, Calendar,
  CreditCard, DollarSign, Receipt
} from 'lucide-react';

const PaymentManagementSystem = () => {
  // États principaux
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showFraisModal, setShowFraisModal] = useState(false);
  const [showMensualiteModal, setShowMensualiteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPaymentHistory, setSelectedPaymentHistory] = useState([]);
  const [selectedEtudiantForHistory, setSelectedEtudiantForHistory] = useState(null);
  const [chequeNotifications, setChequeNotifications] = useState([]);
  
  // Filtres
  const [filters, setFilters] = useState({
    cours: '',
    mois: ''
  });
  
  const [coursOptions, setCoursOptions] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsMensuels, setEtudiantsMensuels] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2025/2026');
  const [selectedMonthForPayment, setSelectedMonthForPayment] = useState(null);
  const [paymentType, setPaymentType] = useState('mensuel'); // 'mensuel' ou 'frais'

  // Mois scolaires
  const moisScolaires = [
    { nom: 'Septembre', index: 0, mois: '2025-09' },
    { nom: 'Octobre', index: 1, mois: '2025-10' },
    { nom: 'Novembre', index: 2, mois: '2025-11' },
    { nom: 'Décembre', index: 3, mois: '2025-12' },
    { nom: 'Janvier', index: 4, mois: '2026-01' },
    { nom: 'Février', index: 5, mois: '2026-02' },
    { nom: 'Mars', index: 6, mois: '2026-03' },
    { nom: 'Avril', index: 7, mois: '2026-04' },
    { nom: 'Mai', index: 8, mois: '2026-05' },
    { nom: 'Juin', index: 9, mois: '2026-06' }
  ];

  // Form data pour paiement mensuel
  const [formData, setFormData] = useState({
    etudiant: '',
    montantPaye: '',
    typePaiement: 'Cash',
    moisIndex: '',
    note: '',
    numeroCheque: '',
    banque: '',
    dateEcheance: ''
  });

  // Form data pour paiement frais d'inscription
  const [fraisPaymentForm, setFraisPaymentForm] = useState({
    montantPaye: '',
    typePaiement: 'Cash',
    note: '',
    numeroCheque: '',
    banque: '',
    dateEcheance: ''
  });

  // Form data pour frais d'inscription (configuration)
  const [fraisForm, setFraisForm] = useState({
    montantTotal: 0,
    montantPaye: 0,
    paye: false,
    typePaiement: 'Cash'
  });

  // Form data pour mensualité
  const [mensualiteForm, setMensualiteForm] = useState({
    montant: 0
  });

  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [selectedEtudiantForFrais, setSelectedEtudiantForFrais] = useState(null);
  const [selectedEtudiantForMensualite, setSelectedEtudiantForMensualite] = useState(null);
  const [selectedEtudiantForFraisPayment, setSelectedEtudiantForFraisPayment] = useState(null);

  // Chargement initial
  useEffect(() => {
    fetchEtudiants();
    fetchChequeNotifications();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchEtudiantsMensuels();
    }
  }, [selectedYear]);

  useEffect(() => {
    // Extraire les cours uniques des étudiants
    const coursSet = new Set();
    
    etudiants.forEach(etudiant => {
      const cours = etudiant.cours || etudiant.niveau;
      if (cours) {
        if (Array.isArray(cours)) {
          cours.forEach(c => coursSet.add(c));
        } else {
          coursSet.add(cours);
        }
      }
    });
    
    setCoursOptions(Array.from(coursSet).sort());
  }, [etudiants]);

  // ============================================
  // FONCTIONS D'API
  // ============================================

  const fetchEtudiantsMensuels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/paiements-mensuels/etudiants?anneeScolaire=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setEtudiantsMensuels(data.etudiants || []);
      }
    } catch (err) {
      console.error('Erreur chargement étudiants mensuels:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEtudiants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/etudiants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const filteredEtudiants = data
        .filter(e => !e.hidden && e.actif)
        .map(e => ({
          ...e,
          prixTotal: e.prixTotal || 0,
          mensualite: e.mensualite || 0,
          fraisInscription: e.fraisInscription || 0,
          fraisInscriptionMontantPaye: e.fraisInscriptionMontantPaye || 0,
          fraisInscriptionPaye: e.fraisInscriptionPaye || false,
          fraisInscriptionTypePaiement: e.fraisInscriptionTypePaiement || 'Cash'
        }));
      
      setEtudiants(filteredEtudiants);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const fetchChequeNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/paiements-mensuels/notifications/cheques?type=expiring&jours=7', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setChequeNotifications(data.cheques || []);
      }
    } catch (err) {
      console.error('Erreur notifications cheques:', err);
      setChequeNotifications([]);
    }
  };

  // ============================================
  // GESTION DES FRAIS D'INSCRIPTION
  // ============================================

  const openFraisModal = (etudiant) => {
    setSelectedEtudiantForFrais(etudiant);
    setFraisForm({
      montantTotal: etudiant.fraisInscription || 0,
      montantPaye: etudiant.fraisInscriptionMontantPaye || 0,
      paye: etudiant.fraisInscriptionPaye || false,
      typePaiement: etudiant.fraisInscriptionTypePaiement || 'Cash'
    });
    setShowFraisModal(true);
  };

  const openFraisPaymentModal = (etudiant) => {
    setSelectedEtudiantForFraisPayment(etudiant);
    const montantRestant = Math.max(0, (etudiant.fraisInscription || 0) - (etudiant.fraisInscriptionMontantPaye || 0));
    
    setFraisPaymentForm({
      montantPaye: montantRestant > 0 ? montantRestant : '',
      typePaiement: 'Cash',
      note: '',
      numeroCheque: '',
      banque: '',
      dateEcheance: ''
    });
    setPaymentType('frais');
    setShowModal(true);
  };

  const handleFraisPaymentChange = (e) => {
    const { name, value } = e.target;
    setFraisPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const saveFraisInscription = async () => {
    if (!selectedEtudiantForFrais) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/etudiants/${selectedEtudiantForFrais._id}/frais-inscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          montantTotal: fraisForm.montantTotal,
          montantPaye: fraisForm.montantPaye,
          paye: fraisForm.paye,
          typePaiement: fraisForm.typePaiement
        })
      });

      if (res.ok) {
        await fetchEtudiants();
        await fetchEtudiantsMensuels();
        setShowFraisModal(false);
        alert('Frais d\'inscription mis à jour avec succès!');
      } else {
        const error = await res.json();
        alert(error.message || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFraisPayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const montantPaye = parseFloat(fraisPaymentForm.montantPaye) || 0;
      
      if (montantPaye <= 0) {
        alert('Le montant payé doit être supérieur à 0');
        setLoading(false);
        return;
      }

      const fraisData = {
        etudiantId: selectedEtudiantForFraisPayment._id,
        montantPaye: montantPaye,
        typePaiement: fraisPaymentForm.typePaiement,
        note: fraisPaymentForm.note,
        isFraisInscription: true
      };

      // Ajouter infos chèque si nécessaire
      if (fraisPaymentForm.typePaiement === 'Chèque') {
        fraisData.numeroCheque = fraisPaymentForm.numeroCheque;
        fraisData.banque = fraisPaymentForm.banque;
        fraisData.dateEcheance = fraisPaymentForm.dateEcheance;
      }

      const res = await fetch('/api/paiements/frais-inscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fraisData)
      });

      if (res.ok) {
        const payment = await res.json();
        await fetchEtudiants();
        await fetchEtudiantsMensuels();
        setShowModal(false);
        resetFraisPaymentForm();
        
        // Générer automatiquement le PDF
        setTimeout(() => {
          generateFraisPDF({
            ...payment,
            etudiant: selectedEtudiantForFraisPayment,
            montant: montantPaye,
            type: 'frais'
          });
        }, 500);
      } else {
        const error = await res.json();
        alert(error.message || 'Erreur lors de l\'ajout du paiement');
      }
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de l\'ajout du paiement');
    } finally {
      setLoading(false);
    }
  };

  const resetFraisPaymentForm = () => {
    setFraisPaymentForm({
      montantPaye: '',
      typePaiement: 'Cash',
      note: '',
      numeroCheque: '',
      banque: '',
      dateEcheance: ''
    });
    setSelectedEtudiantForFraisPayment(null);
    setPaymentType('mensuel');
  };

  // ============================================
  // GESTION DES MENSUALITÉS
  // ============================================

  const openMensualiteModal = (etudiant) => {
    setSelectedEtudiantForMensualite(etudiant);
    setMensualiteForm({
      montant: etudiant.mensualite || 0
    });
    setShowMensualiteModal(true);
  };

  const updateMensualite = async () => {
    if (!selectedEtudiantForMensualite) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/paiements-mensuels/etudiant/${selectedEtudiantForMensualite._id}/mensualite`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mensualite: mensualiteForm.montant
        })
      });

      if (res.ok) {
        await fetchEtudiants();
        await fetchEtudiantsMensuels();
        setShowMensualiteModal(false);
        alert('Mensualité mise à jour avec succès!');
      } else {
        alert('Erreur lors de la mise à jour de la mensualité');
      }
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la mise à jour de la mensualité');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // GESTION DES PAIEMENTS MENSUELS
  // ============================================

  const openAddPaymentModal = (etudiant, moisIndex = null) => {
    setSelectedEtudiant(etudiant);
    
    // Calculer le montant restant pour ce mois
    let montantRestant = etudiant.mensualite || 0;
    if (moisIndex !== null) {
      const moisData = etudiant.mois?.[moisIndex];
      const montantDu = etudiant.mensualite || 0;
      const montantPaye = moisData?.montantPaye || 0;
      montantRestant = Math.max(0, montantDu - montantPaye);
    }
    
    setFormData({
      etudiant: etudiant._id,
      montantPaye: montantRestant > 0 ? montantRestant : '',
      typePaiement: 'Cash',
      moisIndex: moisIndex !== null ? moisIndex.toString() : '',
      note: '',
      numeroCheque: '',
      banque: '',
      dateEcheance: ''
    });
    setSelectedMonthForPayment(moisIndex);
    setPaymentType('mensuel');
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFraisChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFraisForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleMensualiteChange = (e) => {
    const { name, value } = e.target;
    setMensualiteForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const montantPaye = parseFloat(formData.montantPaye) || 0;
      
      if (montantPaye <= 0) {
        alert('Le montant payé doit être supérieur à 0');
        setLoading(false);
        return;
      }

      if (formData.moisIndex === '') {
        alert('Veuillez sélectionner un mois');
        setLoading(false);
        return;
      }

      const paymentData = {
        etudiantId: formData.etudiant,
        montantPaye: montantPaye,
        typePaiement: formData.typePaiement,
        moisIndex: parseInt(formData.moisIndex),
        note: formData.note,
        anneeScolaire: selectedYear
      };

      // Ajouter infos chèque si nécessaire
      if (formData.typePaiement === 'Chèque') {
        paymentData.numeroCheque = formData.numeroCheque;
        paymentData.banque = formData.banque;
        paymentData.dateEcheance = formData.dateEcheance;
      }

      const res = await fetch('/api/paiements-mensuels/ajouter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      if (res.ok) {
        const payment = await res.json();
        await fetchEtudiantsMensuels();
        setShowModal(false);
        resetForm();
        
        // Générer automatiquement le PDF si le paiement est Cash ou Chèque
        if (['Cash', 'Chèque'].includes(formData.typePaiement)) {
          setTimeout(() => {
            generateChequePDF({
              ...payment,
              etudiant: selectedEtudiant,
              montant: montantPaye,
              type: 'mensuel'
            });
          }, 500);
        } else {
          alert('Paiement ajouté avec succès!');
        }
      } else {
        const error = await res.json();
        alert(error.message || 'Erreur lors de l\'ajout du paiement');
      }
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de l\'ajout du paiement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      etudiant: '',
      montantPaye: '',
      typePaiement: 'Cash',
      moisIndex: '',
      note: '',
      numeroCheque: '',
      banque: '',
      dateEcheance: ''
    });
    setSelectedEtudiant(null);
    setSelectedMonthForPayment(null);
    setPaymentType('mensuel');
  };

  // ============================================
  // GÉNÉRATION DE PDF PROFESSIONNEL (CHÈQUE STYLE)
  // ============================================

// ============================================
// FONCTION 1: Génération du reçu PDF principal
// ============================================

// ============================================
// REÇU PROFESSIONNEL - VERSION FINALE CORRIGÉE
// ============================================
// REÇU SIMPLE - GARANTI DE FONCTIONNER
const generateChequePDF = async (payment) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('landscape', 'mm', [210, 100]);

  /* ==========================
     LOAD LOGO
  ========================== */
  const logoImg = new Image();
  logoImg.src = '/logo-ak-removebg-preview.png';
  await new Promise(resolve => (logoImg.onload = resolve));

  /* ==========================
     OUTER BORDER
  ========================== */
  doc.setDrawColor(160);
  doc.setLineWidth(0.8);
  doc.rect(4, 4, 202, 92);

  /* ==========================
     HEADER BACKGROUND
  ========================== */
  doc.setFillColor(240, 240, 240);
  doc.rect(4, 4, 202, 26, 'F');

  /* ==========================
     HEADER CONTENT
  ========================== */
  doc.addImage(logoImg, 'PNG', 10, 10, 22, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('REÇU DE PAIEMENT', 105, 16, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'GROUPE SCOLAIRE ALFRED KASTLER – Casablanca',
    105,
    22,
    { align: 'center' }
  );

  /* ==========================
     NUMBER & DATE
  ========================== */
  const numero = 'REC-' + Date.now().toString().slice(-6);
  const dateStr = new Date().toLocaleDateString('fr-FR');

  doc.text(`N° : ${numero}`, 10, 34);
  doc.text(`Date : ${dateStr}`, 200, 34, { align: 'right' });

  /* ==========================
     BODY CARD
  ========================== */
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.rect(8, 38, 120, 38);

  let y = 46;
  const gap = 8;

  const nom = payment.etudiant?.nomComplet || '-';
  const classe = Array.isArray(payment.etudiant?.cours)
    ? payment.etudiant.cours.join(', ')
    : payment.etudiant?.cours || '-';

  let objet = '-';
  if (payment.type === 'frais') objet = "Frais d'inscription";
if (payment.type === 'mensuel') {
  // Ajouter le nom du mois si disponible
  if (payment.moisNom) {
    objet = `Paiement mensuel - ${payment.moisNom}`;
  } else {
    objet = 'Paiement mensuel';
  }
}
  const field = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, 12, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 48, y);
    y += gap;
  };

  field('Reçu de :', nom);
  field('Classe :', classe);
  field('Objet :', objet);
  field('Type :', payment.typePaiement || 'Cash');

  /* ==========================
     AMOUNT BOX (PREMIUM)
  ========================== */
  const montantNum = parseFloat(payment.montant) || 0;
  const montantStr = montantNum.toFixed(2).replace('.', ',') + ' DH';

  doc.setFillColor(245, 245, 245);
  doc.rect(135, 38, 65, 30, 'F');

  doc.setDrawColor(120);
  doc.setLineWidth(1);
  doc.rect(135, 38, 65, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MONTANT', 167.5, 46, { align: 'center' });

  doc.setFontSize(22);
  doc.text(montantStr, 167.5, 60, { align: 'center' });

  /* ==========================
     AMOUNT IN WORDS
  ========================== */
  const lettres = convertirEnLettres(montantNum);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`En lettres : ${lettres}`, 10, 80, { maxWidth: 190 });

  /* ==========================
     FOOTER (FIXED & PREMIUM)
  ========================== */

  // Date (فوق)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Casablanca, le ${dateStr}`, 10, 86);

  // Signature & Cachet lines
  doc.setDrawColor(180);
  doc.line(10, 90, 70, 90);     // Signature line
  doc.line(140, 90, 200, 90);   // Cachet line

  // Labels (تحت الخطوط بمسافة)
  doc.setFont('helvetica', 'normal');
  doc.text('Signature', 40, 95, { align: 'center' });
  doc.text('Cachet', 170, 95, { align: 'center' });

  /* ==========================
     SAVE PDF
  ========================== */
  const fileName =
    'Recu_' + (nom || 'Etudiant').replace(/\s+/g, '_') + '.pdf';

  doc.save(fileName);
};

const generateFraisPDF = (payment) => {
  generateChequePDF(payment);
};

const convertirEnLettres = (n) => {
  const u = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const d = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const s = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  
  const ent = Math.floor(n);
  const dec = Math.round((n - ent) * 100);
  
  if (ent === 0) return 'zéro dirham';
  
  const c = (x) => {
    if (x === 0) return '';
    if (x < 10) return u[x];
    if (x < 20) return s[x - 10];
    const dz = Math.floor(x / 10);
    const un = x % 10;
    let r = d[dz];
    if (un > 0) {
      if (dz === 7 || dz === 9) r += '-' + s[un];
      else if (dz === 8) r += '-' + u[un];
      else if (un === 1) r += ' et un';
      else r += '-' + u[un];
    } else if (dz === 8) r += 's';
    return r;
  };
  
  let t = '';
  let r = ent;
  
  if (r >= 1000) {
    const m = Math.floor(r / 1000);
    t += (m === 1 ? 'mille ' : c(m) + ' mille ');
    r %= 1000;
  }
  
  if (r >= 100) {
    const ce = Math.floor(r / 100);
    t += (ce === 1 ? 'cent ' : u[ce] + ' cent ');
    r %= 100;
  }
  
  if (r > 0) t += c(r);
  
  t = t.trim() + (ent > 1 ? ' dirhams' : ' dirham');
  if (dec > 0) t += ' et ' + c(dec) + (dec > 1 ? ' centimes' : ' centime');
  
  return t.charAt(0).toUpperCase() + t.slice(1);
};





// ============================================
// EXEMPLE D'UTILISATION COMPLÈTE
// ============================================

/*
// Exemple 1: Paiement mensuel
const paymentMensuel = {
  etudiant: {
    nomComplet: 'RIM HANOUNE',
    cours: ['3ème année']
  },
  type: 'mensuel',
  moisIndex: 0,
  typePaiement: 'Espèces',
  montant: 3800,
  note: '',
  date: new Date()
};

generateChequePDF(paymentMensuel);

// Exemple 2: Frais d'inscription
const paymentFrais = {
  etudiant: {
    nomComplet: 'RIM HANOUNE',
    cours: ['3ème année']
  },
  type: 'frais',
  typePaiement: 'Chèque',
  montant: 3800,
  numeroCheque: '12345678',
  banque: 'BMCE Bank',
  dateEcheance: '2026-02-15',
  note: 'Frais d\'inscription année scolaire 2025-2026',
  date: new Date()
};

generateFraisPDF(paymentFrais);
*/
  // ============================================
  // GESTION DE L'HISTORIQUE
  // ============================================

  const viewPaymentHistory = async (etudiant) => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/paiements-mensuels/etudiant/${etudiant._id}?anneeScolaire=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        setSelectedPaymentHistory(data.historiqueComplet || []);
        setSelectedEtudiantForHistory(etudiant);
        setShowHistoryModal(true);
      } else {
        alert('Erreur lors du chargement de l\'historique');
      }
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      alert('Erreur lors du chargement de l\'historique');
    }
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce paiement?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/paiements-mensuels/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchEtudiantsMensuels();
        alert('Paiement supprimé avec succès');
        
        // Si on est dans l'historique, rafraîchir
        if (showHistoryModal && selectedEtudiantForHistory) {
          viewPaymentHistory(selectedEtudiantForHistory);
        }
      }
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  // ============================================
  // AUTRES FONCTIONS
  // ============================================

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const getCoursDisplay = (cours) => {
    if (!cours) return '—';
    if (Array.isArray(cours)) return cours.join(', ');
    return cours;
  };

  const filteredEtudiantsMensuels = etudiantsMensuels.filter(etudiant => {
    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!etudiant.nomComplet?.toLowerCase().includes(searchLower) &&
          !getCoursDisplay(etudiant.cours)?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Filtre par cours
    if (filters.cours && getCoursDisplay(etudiant.cours) !== filters.cours) {
      return false;
    }
    
    // Filtre par mois
    if (filters.mois !== '') {
      const moisIndex = parseInt(filters.mois);
      const moisEtudiant = etudiant.mois?.[moisIndex];
      if (!moisEtudiant || moisEtudiant.montantRestant <= 0) return false;
    }
    
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch (err) {
      return '—';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0) + ' DH';
  };

  // ============================================
  // STYLES
  // ============================================

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    
    header: {
      backgroundColor: '#059669',
      color: 'white',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    
    logoText: {
      fontSize: '20px',
      fontWeight: '600',
      color: 'white'
    },
    
    headerRight: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    
    notifButton: {
      position: 'relative',
      padding: '8px 16px',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500'
    },
    
    badge: {
      backgroundColor: '#dc2626',
      color: 'white',
      borderRadius: '10px',
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: '600'
    },
    
    addButton: {
      padding: '8px 16px',
      backgroundColor: 'white',
      color: '#059669',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#f0fdf4'
      }
    },
    
    logoutButton: {
      padding: '8px 16px',
      backgroundColor: 'rgba(220, 38, 38, 0.9)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: 'rgba(220, 38, 38, 1)'
      }
    },
    
    filtersBar: {
      backgroundColor: 'white',
      padding: '16px 24px',
      margin: '16px 24px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    
    filterControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    },
    
    filterGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    
    filterLabel: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: '500'
    },
    
    filterSelect: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      backgroundColor: 'white',
      cursor: 'pointer',
      minWidth: '150px'
    },
    
    resetFilterButton: {
      padding: '8px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: '#f9fafb'
    },
    
    searchInput: {
      flex: 1,
      border: 'none',
      outline: 'none',
      fontSize: '14px',
      backgroundColor: 'transparent'
    },
    
    resultsCount: {
      fontSize: '13px',
      color: '#6b7280',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      marginLeft: 'auto'
    },
    
    content: {
      padding: '0 24px 24px 24px'
    },
    
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'auto',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    
    tableHeaderRow: {
      backgroundColor: '#059669',
      color: 'white'
    },
    
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderRight: '1px solid rgba(255,255,255,0.2)',
      whiteSpace: 'nowrap'
    },
    
    tableRow: {
      borderBottom: '1px solid #e5e7eb',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#f9fafb'
      }
    },
    
    td: {
      padding: '12px 16px',
      color: '#1f2937',
      borderRight: '1px solid #e5e7eb',
      verticalAlign: 'middle'
    },
    
    studentNameCell: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    
    actionButton: {
      padding: '6px 12px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#e5e7eb'
      }
    },
    
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#6b7280',
      fontSize: '14px'
    },
    
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    },
    
    modalHeader: {
      padding: '24px',
      borderBottom: '2px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#f9fafb'
    },
    
    modalTitle: {
      margin: 0,
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937'
    },
    
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '4px'
    },
    
    form: {
      padding: '24px'
    },
    
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '16px'
    },
    
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151'
    },
    
    input: {
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
      '&:focus': {
        borderColor: '#059669'
      }
    },
    
    select: {
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'border-color 0.2s',
      '&:focus': {
        borderColor: '#059669'
      }
    },
    
    textarea: {
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s',
      '&:focus': {
        borderColor: '#059669'
      }
    },
    
    modalFooter: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      paddingTop: '20px',
      borderTop: '2px solid #e5e7eb'
    },
    
    cancelButton: {
      padding: '10px 24px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#f3f4f6'
      }
    },
    
    submitButton: {
      padding: '10px 24px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      color: 'white',
      backgroundColor: '#059669',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#047857'
      },
      '&:disabled': {
        backgroundColor: '#9ca3af',
        cursor: 'not-allowed'
      }
    },
    
    historyContent: {
      maxHeight: '70vh',
      overflowY: 'auto',
      padding: '24px'
    },
    
    studentInfoSummary: {
      backgroundColor: '#f9fafb',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-around',
      border: '1px solid #e5e7eb'
    },
    
    deleteBtn: {
      padding: '6px',
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&:hover': {
        backgroundColor: '#fecaca'
      }
    },
    
    fraisCell: {
      cursor: 'pointer',
      padding: '8px',
      backgroundColor: '#f0f9ff',
      borderRadius: '6px',
      border: '1px solid #bae6fd',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#e0f2fe'
      }
    },
    
    notificationModal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    },
    
    notificationItem: {
      padding: '16px',
      borderBottom: '1px solid #e5e7eb',
      '&:last-child': {
        borderBottom: 'none'
      }
    },
    
    notificationHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    },
    
    notificationTitle: {
      fontWeight: '600',
      color: '#1f2937'
    },
    
    notificationDate: {
      fontSize: '12px',
      color: '#6b7280'
    },
    
    notificationContent: {
      fontSize: '14px',
      color: '#4b5563'
    },
    
    // Style pour le bouton small du mois
    monthButton: {
      padding: '4px 8px',
      backgroundColor: '#f0fdf4',
      color: '#059669',
      border: '1px solid #a7f3d0',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      marginTop: '4px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#a7f3d0',
        transform: 'translateY(-1px)'
      }
    },
    
    // Style pour le bouton de frais d'inscription
    fraisPaymentButton: {
      padding: '4px 8px',
      backgroundColor: '#e0f2fe',
      color: '#0369a1',
      border: '1px solid #bae6fd',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      marginTop: '4px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#bae6fd'
      }
    },
    
    // Style pour le bouton de génération PDF
    pdfButton: {
      padding: '4px 8px',
      backgroundColor: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fde68a',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      marginTop: '4px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#fde68a'
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <FileText size={28} color="#fff" />
            <span style={styles.logoText}>Gestion des Paiements</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          {chequeNotifications.length > 0 && (
            <button
              onClick={() => setShowChequeModal(true)}
              style={styles.notifButton}
            >
              <Bell size={18} />
              <span style={styles.badge}>{chequeNotifications.length}</span>
            </button>
          )}
          
          <button onClick={handleLogout} style={styles.logoutButton} title="Déconnexion">
            <User size={18} />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            placeholder="Rechercher étudiant, classe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.resultsCount}>
            {filteredEtudiantsMensuels.length} étudiant(s)
          </div>
        </div>
        
        <div style={styles.filterControls}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Classe:</label>
            <select
              value={filters.cours}
              onChange={(e) => setFilters({...filters, cours: e.target.value})}
              style={styles.filterSelect}
            >
              <option value="">Toutes les classes</option>
              {coursOptions.map(cours => (
                <option key={cours} value={cours}>{cours}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Mois:</label>
            <select
              value={filters.mois}
              onChange={(e) => setFilters({...filters, mois: e.target.value})}
              style={styles.filterSelect}
            >
              <option value="">Tous les mois</option>
              {moisScolaires.map(mois => (
                <option key={mois.index} value={mois.index}>
                  {mois.nom}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setFilters({ cours: '', mois: '' })}
            style={styles.resetFilterButton}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau des paiements mensuels */}
      <div style={styles.content}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Étudiant</th>
                <th style={styles.th}>Classe</th>
                <th style={styles.th}>Mensualité</th>
                <th style={styles.th}>Frais Inscription</th>
                {moisScolaires.map(mois => (
                  <th key={mois.index} style={styles.th}>
                    {mois.nom}
                  </th>
                ))}
                <th style={styles.th}>Total Payé</th>
                <th style={styles.th}>Reste</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEtudiantsMensuels.map((etudiant) => {
                const totalPaye = etudiant.totalPaye || 0;
                const totalDu = etudiant.totalDu || 0;
                const totalRestant = Math.max(0, totalDu - totalPaye);
                const fraisRestant = Math.max(0, (etudiant.fraisInscription || 0) - (etudiant.fraisInscriptionMontantPaye || 0));

                return (
                  <tr key={etudiant._id} style={styles.tableRow}>
                    {/* Nom de l'étudiant */}
                    <td style={styles.td}>
                      <div style={styles.studentNameCell}>
                        <User size={16} color="#6b7280" />
                        {etudiant.nomComplet || '—'}
                      </div>
                    </td>
                    
                    {/* Classe */}
                    <td style={styles.td}>{getCoursDisplay(etudiant.cours) || '—'}</td>
                    
                    {/* Mensualité */}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600', color: '#059669' }}>
                          {formatCurrency(etudiant.mensualite)}
                        </span>
                        <button
                          onClick={() => openMensualiteModal(etudiant)}
                          style={{
                            padding: '4px',
                            backgroundColor: '#d1fae5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="Modifier la mensualité"
                        >
                          <Edit size={12} />
                        </button>
                      </div>
                    </td>
                    
                    {/* Frais d'inscription */}
                    <td style={styles.td}>
                      <div style={styles.fraisCell}>
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600' }}>Total: {formatCurrency(etudiant.fraisInscription)}</span>
                            {etudiant.fraisInscriptionPaye ? (
                              <Check size={14} color="#10b981" />
                            ) : (
                              <span style={{ color: '#ef4444', fontSize: '12px' }}>✗</span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: fraisRestant > 0 ? '#dc2626' : '#059669' 
                          }}>
                            Reste: {formatCurrency(fraisRestant)}
                          </div>
                        </div>
                        
                        {/* Bouton pour payer les frais d'inscription */}
                        {fraisRestant > 0 && (
                          <button
                            onClick={() => openFraisPaymentModal(etudiant)}
                            style={styles.fraisPaymentButton}
                            title="Payer frais d'inscription"
                          >
                            <DollarSign size={10} />
                            Payer Frais
                          </button>
                        )}
                        
                     
                      </div>
                    </td>
                    
                    {/* Colonnes pour chaque mois avec bouton small */}
                    {moisScolaires.map(mois => {
                      const moisData = etudiant.mois?.[mois.index];
                      const montantDu = etudiant.mensualite || 0;
                      const montantPaye = moisData?.montantPaye || 0;
                      const montantRestant = Math.max(0, montantDu - montantPaye);
                      
                      return (
                        <td key={mois.index} style={styles.td}>
                          <div style={{ fontSize: '12px' }}>
                            <div>Dû: <strong>{formatCurrency(montantDu)}</strong></div>
                            <div>Payé: <strong style={{ color: '#059669' }}>
                              {formatCurrency(montantPaye)}
                            </strong></div>
                            <div>Reste: <strong style={{ 
                              color: montantRestant > 0 ? '#dc2626' : '#059669' 
                            }}>
                              {formatCurrency(montantRestant)}
                            </strong></div>
                            
                            {/* Bouton small pour ajouter un paiement pour ce mois */}
                            {montantRestant > 0 && (
                              <button
                                onClick={() => openAddPaymentModal(etudiant, mois.index)}
                                style={styles.monthButton}
                                title={`Ajouter paiement pour ${mois.nom}`}
                              >
                                <Plus size={10} />
                                Payer
                              </button>
                            )}
                            
                            {/* Bouton pour générer PDF si déjà payé */}
                       {montantRestant === 0 && montantPaye > 0 && (
  <button
    onClick={() => {
      generateChequePDF({
        etudiant: etudiant,
        montant: montantPaye,
        moisIndex: mois.index,
        moisNom: mois.nom,
        type: 'mensuel',
        typePaiement: moisData?.typePaiement || 'Cash',
        createdAt: moisData?.createdAt || new Date()
      });
    }}
    style={styles.pdfButton}
    title={`Générer reçu pour ${mois.nom}`}
  >
    <FileDown size={10} />
    Reçu
  </button>
)}
                          </div>
                        </td>
                      );
                    })}
                    
                    {/* Total Payé */}
                    <td style={styles.td}>
                      <strong style={{ color: '#059669' }}>
                        {formatCurrency(totalPaye + (etudiant.fraisInscriptionMontantPaye || 0))}
                      </strong>
                    </td>
                    
                    {/* Reste à Payer */}
                    <td style={styles.td}>
                      <strong style={{ color: totalRestant + fraisRestant > 0 ? '#dc2626' : '#059669' }}>
                        {formatCurrency(totalRestant + fraisRestant)}
                      </strong>
                    </td>
                    
                  {/* Actions */}
<td style={styles.td}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {/* Bouton Ajouter Paiement Mensuel */}
    <button
      onClick={() => openAddPaymentModal(etudiant)}
      style={{
        ...styles.actionButton,
        backgroundColor: '#d1fae5',
        color: '#059669',
        borderColor: '#a7f3d0',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: '600'
      }}
      title="Ajouter un paiement mensuel"
    >
      <Calendar size={14} />
      Ajouter Paiement
    </button>

    {/* Bouton Frais d'Inscription */}
    <button
      onClick={() => openFraisModal(etudiant)}
      style={{
        ...styles.actionButton,
        backgroundColor: '#e0f2fe',
        color: '#0369a1',
        borderColor: '#bae6fd',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: '600'
      }}
      title="Configurer frais d'inscription"
    >
      <CreditCard size={14} />
      Frais Inscription
    </button>

    {/* Bouton Historique */}
    <button
      onClick={() => viewPaymentHistory(etudiant)}
      style={{
        ...styles.actionButton,
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderColor: '#fde68a',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: '600'
      }}
      title="Voir l'historique des paiements"
    >
      <History size={14} />
      Historique
    </button>
  </div>
</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredEtudiantsMensuels.length === 0 && (
            <div style={styles.emptyState}>
              {loading ? 'Chargement...' : 'Aucun étudiant trouvé'}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout de paiement (mensuel ou frais) */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {paymentType === 'frais' 
                  ? 'Paiement Frais d\'Inscription' 
                  : selectedMonthForPayment !== null 
                    ? `Paiement - ${moisScolaires.find(m => m.index === selectedMonthForPayment)?.nom || ''}` 
                    : 'Ajouter un Paiement Mensuel'}
              </h2>
              <button onClick={() => { 
                setShowModal(false); 
                paymentType === 'frais' ? resetFraisPaymentForm() : resetForm(); 
              }} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={paymentType === 'frais' ? handleSubmitFraisPayment : handleSubmitPayment} style={styles.form}>
              {(selectedEtudiant || selectedEtudiantForFraisPayment) && (
                <div style={{ 
                  backgroundColor: paymentType === 'frais' ? '#e0f2fe' : '#f0f9ff', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: paymentType === 'frais' ? '1px solid #bae6fd' : '1px solid #bae6fd'
                }}>
                  <h3 style={{ margin: '0 0 8px 0', color: paymentType === 'frais' ? '#0369a1' : '#0369a1' }}>
                    {paymentType === 'frais' ? selectedEtudiantForFraisPayment?.nomComplet : selectedEtudiant?.nomComplet}
                  </h3>
                  <p style={{ margin: '0', color: '#6b7280' }}>
                    Classe: {getCoursDisplay(paymentType === 'frais' ? selectedEtudiantForFraisPayment?.cours : selectedEtudiant?.cours)}
                  </p>
                  
                  {paymentType === 'frais' ? (
                    <>
                      <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>
                        Frais Total: <strong>{formatCurrency(selectedEtudiantForFraisPayment?.fraisInscription)}</strong>
                      </p>
                      <p style={{ margin: '4px 0 0 0', color: '#dc2626' }}>
                        Déjà Payé: <strong>{formatCurrency(selectedEtudiantForFraisPayment?.fraisInscriptionMontantPaye)}</strong>
                      </p>
                      <p style={{ margin: '4px 0 0 0', color: '#059669' }}>
                        Reste: <strong>{formatCurrency(Math.max(0, (selectedEtudiantForFraisPayment?.fraisInscription || 0) - (selectedEtudiantForFraisPayment?.fraisInscriptionMontantPaye || 0)))}</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>
                        Mensualité: <strong>{formatCurrency(selectedEtudiant?.mensualite)}</strong>
                      </p>
                      {selectedMonthForPayment !== null && (
                        <p style={{ margin: '4px 0 0 0', color: '#dc2626' }}>
                          Mois: <strong>{moisScolaires.find(m => m.index === selectedMonthForPayment)?.nom}</strong>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Montant à Payer (DH) *</label>
                <input
                  type="number"
                  name="montantPaye"
                  value={paymentType === 'frais' ? fraisPaymentForm.montantPaye : formData.montantPaye}
                  onChange={paymentType === 'frais' ? handleFraisPaymentChange : handleChange}
                  required
                  min="0"
                  step="0.01"
                  style={styles.input}
                  placeholder="Entrez le montant"
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Le montant est pré-rempli avec le reste à payer
                </small>
              </div>

              {paymentType === 'mensuel' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mois *</label>
                  <select
                    name="moisIndex"
                    value={formData.moisIndex}
                    onChange={handleChange}
                    required
                    style={styles.select}
                  >
                    <option value="">Sélectionnez un mois</option>
                    {moisScolaires.map(mois => (
                      <option key={mois.index} value={mois.index}>
                        {mois.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Type de Paiement *</label>
                <select
                  name="typePaiement"
                  value={paymentType === 'frais' ? fraisPaymentForm.typePaiement : formData.typePaiement}
                  onChange={paymentType === 'frais' ? handleFraisPaymentChange : handleChange}
                  required
                  style={styles.select}
                >
                  <option value="Cash">Cash</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Virement">Virement</option>
                  <option value="En ligne">En ligne</option>
                </select>
              </div>

              {(paymentType === 'frais' ? fraisPaymentForm.typePaiement : formData.typePaiement) === 'Chèque' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Numéro du chèque</label>
                    <input
                      type="text"
                      name="numeroCheque"
                      value={paymentType === 'frais' ? fraisPaymentForm.numeroCheque : formData.numeroCheque}
                      onChange={paymentType === 'frais' ? handleFraisPaymentChange : handleChange}
                      style={styles.input}
                      placeholder="Numéro du chèque"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Banque</label>
                    <input
                      type="text"
                      name="banque"
                      value={paymentType === 'frais' ? fraisPaymentForm.banque : formData.banque}
                      onChange={paymentType === 'frais' ? handleFraisPaymentChange : handleChange}
                      style={styles.input}
                      placeholder="Nom de la banque"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date d'échéance</label>
                    <input
                      type="date"
                      name="dateEcheance"
                      value={paymentType === 'frais' ? fraisPaymentForm.dateEcheance : formData.dateEcheance}
                      onChange={paymentType === 'frais' ? handleFraisPaymentChange : handleChange}
                      style={styles.input}
                    />
                  </div>
                </>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Note</label>
                <textarea
                  name="note"
                  value={paymentType === 'frais' ? fraisPaymentForm.note : formData.note}
                  onChange={paymentType === 'frais' ? handleFraisPaymentChange : handleChange}
                  style={styles.textarea}
                  rows="3"
                  placeholder="Remarques..."
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => { 
                    setShowModal(false); 
                    paymentType === 'frais' ? resetFraisPaymentForm() : resetForm(); 
                  }}
                  style={styles.cancelButton}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || 
                    (paymentType === 'frais' 
                      ? !fraisPaymentForm.montantPaye || parseFloat(fraisPaymentForm.montantPaye) <= 0
                      : !formData.montantPaye || parseFloat(formData.montantPaye) <= 0 || !formData.moisIndex)}
                  style={styles.submitButton}
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer & Générer Reçu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pour frais d'inscription (configuration) */}
      {showFraisModal && selectedEtudiantForFrais && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Configuration Frais d'Inscription - {selectedEtudiantForFrais.nomComplet}
              </h2>
              <button onClick={() => setShowFraisModal(false)} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Montant Total des Frais (DH)</label>
                <input
                  type="number"
                  name="montantTotal"
                  value={fraisForm.montantTotal}
                  onChange={handleFraisChange}
                  style={styles.input}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Montant Déjà Payé (DH)</label>
                <input
                  type="number"
                  name="montantPaye"
                  value={fraisForm.montantPaye}
                  onChange={handleFraisChange}
                  style={styles.input}
                  min="0"
                  step="0.01"
                  max={fraisForm.montantTotal}
                />
              </div>
              
              <div style={{ 
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px'
              }}>
                <div style={{ fontWeight: '600', color: '#0369a1' }}>
                  Reste à Payer: {formatCurrency(Math.max(0, fraisForm.montantTotal - fraisForm.montantPaye))}
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="paye"
                    checked={fraisForm.paye}
                    onChange={handleFraisChange}
                  />
                  <span style={{ fontWeight: '600' }}>Frais entièrement payés</span>
                </label>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Type de Paiement</label>
                <select
                  name="typePaiement"
                  value={fraisForm.typePaiement}
                  onChange={handleFraisChange}
                  style={styles.select}
                >
                  <option value="Cash">Cash</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Virement">Virement</option>
                  <option value="En ligne">En ligne</option>
                </select>
              </div>
              
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowFraisModal(false)}
                  style={styles.cancelButton}
                >
                  Annuler
                </button>
                <button
                  onClick={saveFraisInscription}
                  disabled={loading}
                  style={styles.submitButton}
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour modifier la mensualité */}
      {showMensualiteModal && selectedEtudiantForMensualite && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Modifier la Mensualité - {selectedEtudiantForMensualite.nomComplet}
              </h2>
              <button onClick={() => setShowMensualiteModal(false)} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Montant de la Mensualité (DH)</label>
                <input
                  type="number"
                  name="montant"
                  value={mensualiteForm.montant}
                  onChange={handleMensualiteChange}
                  style={styles.input}
                  min="0"
                  step="0.01"
                  placeholder="Entrez la mensualité"
                />
              </div>
              
              <div style={{ 
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#92400e'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <AlertCircle size={16} />
                  <strong>Attention:</strong>
                </div>
                <div>La modification de la mensualité affectera les paiements futurs et les mois non encore payés.</div>
              </div>
              
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowMensualiteModal(false)}
                  style={styles.cancelButton}
                >
                  Annuler
                </button>
                <button
                  onClick={updateMensualite}
                  disabled={loading}
                  style={styles.submitButton}
                >
                  {loading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'historique des paiements */}
      {showHistoryModal && selectedEtudiantForHistory && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Historique - {selectedEtudiantForHistory.nomComplet}
              </h2>
              <button onClick={() => setShowHistoryModal(false)} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <div style={styles.historyContent}>
              {selectedPaymentHistory.length === 0 ? (
                <div style={styles.emptyState}>
                  Aucun paiement dans l'historique
                </div>
              ) : (
                <div>
                  <div style={styles.studentInfoSummary}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Total Payé</div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>
                        {formatCurrency(selectedPaymentHistory.reduce((sum, p) => sum + (p.montantPaye || 0), 0))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Nombre de paiements</div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>
                        {selectedPaymentHistory.length}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Actions</div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>
                        <button
                          onClick={() => {
                            const allPayments = selectedPaymentHistory.reduce((sum, p) => sum + (p.montantPaye || 0), 0);
                            generateChequePDF({
                              etudiant: selectedEtudiantForHistory,
                              montant: allPayments,
                              note: 'Reçu global de tous les paiements',
                              typePaiement: 'Multiple',
                              createdAt: new Date()
                            });
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <FileDown size={14} /> Reçu Global
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '20px' }}>
                    {selectedPaymentHistory.map((payment) => (
                      <div key={payment._id} style={{
                        backgroundColor: '#f9fafb',
                        padding: '12px',
                        marginBottom: '8px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                              {payment.isFraisInscription ? 'FRAIS D\'INSCRIPTION' : (moisScolaires.find(m => m.index === payment.moisIndex)?.nom || 'Mois')} - {payment.typePaiement}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                              Montant: <strong>{formatCurrency(payment.montantPaye)}</strong>
                              {' | '}
                              Date: {formatDate(payment.createdAt)}
                            </div>
                            {payment.typePaiement === 'Chèque' && (
                              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                Chèque n°: {payment.numeroCheque || '—'} - Banque: {payment.banque || '—'} - Statut: {payment.statutCheque || '—'}
                              </div>
                            )}
                            {payment.note && (
                              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', fontStyle: 'italic' }}>
                                {payment.note}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => generateChequePDF({
                                ...payment,
                                etudiant: selectedEtudiantForHistory,
                                montant: payment.montantPaye,
                                type: payment.isFraisInscription ? 'frais' : 'mensuel'
                              })}
                              style={{
                                padding: '6px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title="Générer reçu"
                            >
                              <FileDown size={14} />
                            </button>
                            <button
                              onClick={() => deletePayment(payment._id)}
                              style={styles.deleteBtn}
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal des notifications de chèques */}
      {showChequeModal && chequeNotifications.length > 0 && (
        <div style={styles.modalOverlay}>
          <div style={styles.notificationModal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Notifications de Chèques</h2>
              <button onClick={() => setShowChequeModal(false)} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <div style={styles.historyContent}>
              <div style={{ 
                backgroundColor: '#fef3c7', 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} color="#92400e" />
                  <strong style={{ color: '#92400e' }}>
                    {chequeNotifications.length} chèque(s) expirent dans les 7 jours
                  </strong>
                </div>
              </div>
              
              {chequeNotifications.map((notification) => (
                <div key={notification._id} style={styles.notificationItem}>
                  <div style={styles.notificationHeader}>
                    <div style={styles.notificationTitle}>
                      {notification.etudiant?.nomComplet || 'Étudiant inconnu'}
                    </div>
                    <div style={styles.notificationDate}>
                      Échéance: {formatDate(notification.dateEcheance)}
                    </div>
                  </div>
                  <div style={styles.notificationContent}>
                    <div>Chèque n°: {notification.numeroCheque || '—'}</div>
                    <div>Montant: {formatCurrency(notification.montantPaye)}</div>
                    <div>Banque: {notification.banque || '—'}</div>
                    <div>Statut: {notification.statutCheque || 'En attente'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagementSystem;