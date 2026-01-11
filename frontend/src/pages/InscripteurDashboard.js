import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Bell, User, Calendar, CreditCard, FileText, Trash2, History, Filter, Edit, DollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Select from 'react-select';

const PaymentManagementSystem = () => {
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEditPrixModal, setShowEditPrixModal] = useState(false);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPaymentHistory, setSelectedPaymentHistory] = useState([]);
  const [selectedEtudiantForHistory, setSelectedEtudiantForHistory] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editPrix, setEditPrix] = useState('');
  const [filters, setFilters] = useState({
    cours: '',
    anneeScolaire: ''
  });
  const [coursOptions, setCoursOptions] = useState([]);
  const [anneesScolaires, setAnneesScolaires] = useState([]);
  
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsOptions, setEtudiantsOptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [chequeNotifications, setChequeNotifications] = useState([]);
  
  const [formData, setFormData] = useState({
    etudiant: '',
    montantTotal: '',
    montantPaye: '',
    typePaiement: 'Cash',
    numeroCheque: '',
    banque: '',
    dateEcheance: '',
    moisDebut: new Date().toISOString().split('T')[0],
    nombreMois: 1,
    cours: '',
    note: '',
    anneeScolaire: ''
  });

  const [currentStudentInfo, setCurrentStudentInfo] = useState({
    nomComplet: '',
    prixTotal: 0,
    totalPaye: 0,
    resteAPayer: 0,
    pourcentagePaye: 0
  });

  // Styles pour react-select
  const selectStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '44px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      '&:hover': {
        borderColor: '#3b82f6'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9ca3af'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f0f9ff' : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      '&:hover': {
        backgroundColor: '#f0f9ff'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1f2937'
    })
  };

  useEffect(() => {
    fetchEtudiants();
    fetchPayments();
    fetchChequeNotifications();
  }, []);

  useEffect(() => {
    // Extraire les cours uniques des étudiants
    const coursSet = new Set();
    const anneeSet = new Set();
    
    etudiants.forEach(etudiant => {
      const cours = etudiant.cours || etudiant.niveau;
      if (cours) {
        if (Array.isArray(cours)) {
          cours.forEach(c => coursSet.add(c));
        } else {
          coursSet.add(cours);
        }
      }
      
      // Ajouter l'année scolaire de l'étudiant s'il en a une
      if (etudiant.anneeScolaire) {
        anneeSet.add(etudiant.anneeScolaire);
      }
    });
    
    // Ajouter les années scolaires des paiements
    payments.forEach(payment => {
      if (payment.anneeScolaire) {
        anneeSet.add(payment.anneeScolaire);
      }
    });
    
    setCoursOptions(Array.from(coursSet).sort());
    setAnneesScolaires(Array.from(anneeSet).sort());
    
    // Mettre à jour les options des étudiants
    const options = etudiants.map(e => {
      const cours = e.cours || e.niveau;
      const coursText = Array.isArray(cours) ? cours.join(', ') : cours || '';
      const anneeText = e.anneeScolaire ? ` - ${e.anneeScolaire}` : '';
      
      return {
        value: e._id,
        label: `${e.nomComplet} - ${coursText}${anneeText} - ${e.prixTotal || 0} DH`,
        cours: cours,
        prixTotal: e.prixTotal || 0,
        anneeScolaire: e.anneeScolaire,
        etudiantData: e
      };
    });
    setEtudiantsOptions(options);
  }, [etudiants, payments]);

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
          prixTotal: e.prixTotal || 0
        }));
      
      setEtudiants(filteredEtudiants);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        console.error('Erreur API payments:', res.status);
        setPayments([]);
        return;
      }
      
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
      setPayments([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
  const fetchChequeNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payments/cheques/expiring?jours=7', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        console.error('Erreur API cheques:', res.status);
        setChequeNotifications([]);
        return;
      }
      
      const data = await res.json();
      setChequeNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur notifications cheques:', err);
      setChequeNotifications([]);
    }
  };

  useEffect(() => {
    // Ouvrir automatiquement le modal des chèques s'il y en a
    if (chequeNotifications.length > 0) {
      setShowChequeModal(true);
    }
  }, [chequeNotifications]);

  const handleEtudiantSelect = (selectedOption) => {
    if (selectedOption) {
      const etudiant = selectedOption.etudiantData;
      const cours = etudiant.cours || etudiant.niveau;
      const coursText = Array.isArray(cours) ? cours.join(', ') : cours || '';
      const prixTotal = etudiant.prixTotal || 0;
      
      // Récupérer les paiements de cet étudiant
      const studentPayments = payments.filter(p => 
        p.etudiant?._id === etudiant._id || p.etudiant === etudiant._id
      );
      const totalPaye = studentPayments.reduce((sum, p) => sum + (p.montantPaye || 0), 0);
      const resteAPayer = Math.max(0, prixTotal - totalPaye);
      const pourcentagePaye = prixTotal > 0 ? Math.round((totalPaye / prixTotal) * 100) : 0;
      
      setCurrentStudentInfo({
        nomComplet: etudiant.nomComplet,
        prixTotal,
        totalPaye,
        resteAPayer,
        pourcentagePaye
      });
      
      setFormData(prev => ({
        ...prev,
        etudiant: selectedOption.value,
        cours: coursText,
        montantTotal: prixTotal.toString(),
        montantPaye: '0', // Toujours 0 par défaut
        anneeScolaire: etudiant.anneeScolaire || '2025/2026'
      }));
    } else {
      setCurrentStudentInfo({
        nomComplet: '',
        prixTotal: 0,
        totalPaye: 0,
        resteAPayer: 0,
        pourcentagePaye: 0
      });
      
      setFormData(prev => ({
        ...prev,
        etudiant: '',
        cours: '',
        montantTotal: '',
        montantPaye: '0',
        anneeScolaire: ''
      }));
    }
  };

  const openEditPrixModal = (student) => {
    setEditingStudent(student);
    setEditPrix(student.prixTotal?.toString() || '0');
    setShowEditPrixModal(true);
  };

  const savePrix = async () => {
    if (!editingStudent) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/etudiants/${editingStudent._id}/prix`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prixTotal: parseFloat(editPrix) })
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        
        // Mettre à jour la liste locale
        setEtudiants(prev => prev.map(e => 
          e._id === editingStudent._id 
            ? { ...e, prixTotal: parseFloat(editPrix) } 
            : e
        ));
        
        // Rafraîchir les options
        await fetchEtudiants();
        setShowEditPrixModal(false);
        setEditingStudent(null);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const generatePDF = (payment, etudiant) => {
  try {
    if (!payment || !etudiant) {
      console.error('Données manquantes pour le PDF');
      alert('Erreur: Données manquantes pour la génération du reçu');
      return;
    }

    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    const montantPaye = parseFloat(payment.montantPaye || 0);
    const montantTotal = parseFloat(payment.montantTotal || 0);
    const montantRestant = parseFloat(payment.montantRestant || 0);

    // Charger le logo depuis public
    const img = new Image();
    img.src = '/logo-ak-removebg-preview.png';
    
    img.onload = function() {
      // Ajouter le logo (ajusté pour bien s'afficher)
      doc.addImage(img, 'PNG', 15, 10, 30, 30);
    
    // Nom de l'école
    doc.setTextColor(13, 34, 61);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ALFRED KASTLER', 50, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Groupe Scolaire d\'Excellence', 50, 28);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('130 Boulevard Ali Yaata, Casablanca', 50, 33);
    doc.text('Tel: +212 5 22 62 81 82 | Email: contact@kastler.ma', 50, 37);

    // Ligne de séparation
    doc.setDrawColor(230, 0, 57);
    doc.setLineWidth(0.5);
    doc.line(15, 45, 195, 45);

    // Titre "REÇU DE PAIEMENT"
    doc.setFillColor(230, 0, 57);
    doc.rect(15, 55, 180, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECU DE PAIEMENT', 105, 63, { align: 'center' });

    // Informations du reçu
    let y = 80;
    
    doc.setTextColor(13, 34, 61);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const receiptNum = payment._id ? payment._id.toString().slice(-8).toUpperCase() : Date.now().toString().slice(-8);
    doc.text('N° de Reçu:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptNum, 60, y);
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }), 60, y);
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Année Scolaire:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(payment.anneeScolaire || '—', 60, y);

    // Cadre informations étudiant
    y = 110;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(15, y, 180, 35);
    
    doc.setFillColor(245, 245, 247);
    doc.rect(15, y, 180, 8, 'F');
    
    doc.setTextColor(13, 34, 61);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DE L\'ÉLÈVE', 20, y + 6);
    
    y += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Nom complet:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(etudiant.nomComplet || '—', 55, y);
    
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Classe:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(payment.cours || '—', 55, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Téléphone:', 110, y);
    doc.setFont('helvetica', 'normal');
    doc.text(etudiant.telephoneEtudiant || '—', 145, y);

    // Détails du paiement
    y = 160;
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, y, 180, 55);
    
    doc.setFillColor(245, 245, 247);
    doc.rect(15, y, 180, 8, 'F');
    
    doc.setTextColor(13, 34, 61);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DU PAIEMENT', 20, y + 6);
    
    y += 16;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Frais de scolarité - ' + (payment.cours || 'Cours'), 55, y);
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Période:', 20, y);
    doc.setFont('helvetica', 'normal');
    
    let dateDebut = new Date();
    let dateFin = new Date();
    try {
      if (payment.moisDebut) {
        dateDebut = new Date(payment.moisDebut);
        dateFin = new Date(dateDebut);
        dateFin.setMonth(dateFin.getMonth() + (Number(payment.nombreMois) || 1));
      }
    } catch (err) {
      console.error('Erreur conversion date:', err);
    }
    
    doc.text(dateDebut.toLocaleDateString('fr-FR') + ' au ' + dateFin.toLocaleDateString('fr-FR'), 55, y);
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre de mois:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(payment.nombreMois || 1) + ' mois', 55, y);
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Mode de paiement:', 20, y);
    doc.setFont('helvetica', 'normal');
    let modePaiement = payment.typePaiement || 'Espèces';
    if (payment.typePaiement === 'Cheque' && payment.numeroCheque) {
      modePaiement += ' (N° ' + payment.numeroCheque + ')';
      if (payment.banque) {
        modePaiement += ' - ' + payment.banque;
      }
    }
    doc.text(modePaiement, 55, y);

    // Montants
    y = 230;
    doc.setFillColor(230, 0, 57);
    doc.rect(15, y, 180, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTANT PAYE', 20, y + 10);
    
    doc.setFontSize(24);
    doc.text(montantPaye.toFixed(2) + ' DH', 20, y + 25);

    // Pied de page
    y = 275;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Ce recu atteste du paiement effectue. Merci de le conserver.', 105, y, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text('Document genere le ' + new Date().toLocaleDateString('fr-FR') + ' a ' + new Date().toLocaleTimeString('fr-FR'), 105, y + 5, { align: 'center' });

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    };
    
    img.onerror = function() {
      console.error('Erreur chargement logo');
      alert('Erreur: Logo introuvable. Verifiez que logo-ak-removebg-preview.png est dans le dossier public/');
    };
  } catch (err) {
    console.error('Erreur génération PDF:', err);
    alert('Erreur lors de la génération du reçu. Veuillez réessayer.');
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const montantTotal = parseFloat(formData.montantTotal) || 0;
      const montantPaye = parseFloat(formData.montantPaye) || 0;
      
      if (montantPaye <= 0) {
        alert('Le montant payé doit être supérieur à 0');
        setLoading(false);
        return;
      }

      // Calculer le nouveau reste après ce paiement
      const stats = getStudentStats(formData.etudiant);
      const totalPayeActuel = stats.totalPaye;
      const montantRestant = Math.max(0, montantTotal - (totalPayeActuel + montantPaye));

      const paymentData = {
        etudiant: formData.etudiant,
        montantTotal,
        montantPaye,
        montantRestant,
        typePaiement: formData.typePaiement,
        numeroCheque: formData.numeroCheque,
        banque: formData.banque,
        dateEcheance: formData.dateEcheance,
        moisDebut: formData.moisDebut,
        nombreMois: formData.nombreMois,
        cours: formData.cours,
        note: formData.note,
        anneeScolaire: formData.anneeScolaire
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      if (res.ok) {
        const savedPayment = await res.json();
        const etudiant = etudiants.find(e => e._id === formData.etudiant);
        
        // Générer automatiquement le PDF
        setTimeout(() => {
          generatePDF(savedPayment.payment, etudiant);
        }, 500);
        
        await fetchPayments();
        await fetchEtudiants(); // Rafraîchir pour mettre à jour les stats
        setShowModal(false);
        resetForm();
        alert('Paiement ajouté avec succès! PDF généré automatiquement.');
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
      montantTotal: '',
      montantPaye: '0',
      typePaiement: 'Cash',
      numeroCheque: '',
      banque: '',
      dateEcheance: '',
      moisDebut: new Date().toISOString().split('T')[0],
      nombreMois: 1,
      cours: '',
      note: '',
      anneeScolaire: ''
    });
    setCurrentStudentInfo({
      nomComplet: '',
      prixTotal: 0,
      totalPaye: 0,
      resteAPayer: 0,
      pourcentagePaye: 0
    });
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce paiement?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchPayments();
        await fetchEtudiants();
        alert('Paiement supprimé avec succès');
      }
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const updateChequeStatus = async (paymentId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/payments/${paymentId}/cheque-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ statutCheque: newStatus })
      });

      if (res.ok) {
        await fetchPayments();
        await fetchChequeNotifications();
        alert('Statut mis à jour avec succès');
      }
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

const viewPaymentHistory = async (etudiant) => {
  try {
    const token = localStorage.getItem('token');
    console.log('Fetching history for student:', etudiant._id);
    
    const res = await fetch(`/api/payments/etudiant/${etudiant._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('Historique reçu:', data);
      
      // Vérifier si les paiements existent
      if (!data.payments || data.payments.length === 0) {
        // Essayer de filtrer manuellement depuis tous les paiements
        const allPayments = payments.filter(p => 
          (p.etudiant?._id === etudiant._id || p.etudiant === etudiant._id)
        );
        console.log('Paiements filtrés manuellement:', allPayments);
        setSelectedPaymentHistory(allPayments);
      } else {
        setSelectedPaymentHistory(data.payments);
      }
      
      setSelectedEtudiantForHistory(etudiant);
      setShowHistoryModal(true);
    } else {
      const errorText = await res.text();
      console.error('Erreur API:', res.status, errorText);
      alert('Erreur lors du chargement de l\'historique');
    }
  } catch (err) {
    console.error('Erreur chargement historique:', err);
    alert('Erreur lors du chargement de l\'historique');
  }
};



  const getStudentPayments = (studentId) => {
    return payments.filter(p => p.etudiant?._id === studentId || p.etudiant === studentId);
  };

  const getStudentStats = (studentId) => {
    const etudiant = etudiants.find(e => e._id === studentId);
    if (!etudiant) {
      return { totalAPayer: 0, totalPaye: 0, totalRestant: 0, pourcentagePaye: 0 };
    }
    
    const totalAPayer = etudiant.prixTotal || 0;
    const studentPayments = getStudentPayments(studentId);
    const totalPaye = studentPayments.reduce((sum, p) => sum + (p.montantPaye || 0), 0);
    const totalRestant = Math.max(0, totalAPayer - totalPaye);
    const pourcentagePaye = totalAPayer > 0 ? Math.round((totalPaye / totalAPayer) * 100) : 0;
    
    return {
      totalAPayer,
      totalPaye,
      totalRestant,
      pourcentagePaye
    };
  };

  const getAllStudentsWithStats = () => {
    return etudiants.map(etudiant => {
      const stats = getStudentStats(etudiant._id);
      const paymentsCount = getStudentPayments(etudiant._id).length;
      
      return {
        ...etudiant,
        stats,
        paymentsCount,
        isPaidCompletely: stats.totalRestant === 0,
        coursDisplay: getCoursDisplay(etudiant.cours || etudiant.niveau)
      };
    });
  };

  const getCoursDisplay = (cours) => {
    if (!cours) return '—';
    if (Array.isArray(cours)) return cours.join(', ');
    return cours;
  };

  const filteredStudents = getAllStudentsWithStats().filter(student => {
    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!student.nomComplet?.toLowerCase().includes(searchLower) &&
          !student.coursDisplay?.toLowerCase().includes(searchLower) &&
          !student.telephoneEtudiant?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Filtre par cours
    if (filters.cours) {
      const studentCours = student.cours || student.niveau;
      if (Array.isArray(studentCours)) {
        if (!studentCours.includes(filters.cours)) return false;
      } else {
        if (studentCours !== filters.cours) return false;
      }
    }
    
    // Filtre par année scolaire
    if (filters.anneeScolaire) {
      const studentAnnee = student.anneeScolaire;
      if (!studentAnnee || studentAnnee !== filters.anneeScolaire) {
        // Vérifier aussi dans les paiements
        const studentPayments = getStudentPayments(student._id);
        const hasPaymentInYear = studentPayments.some(p => p.anneeScolaire === filters.anneeScolaire);
        if (!hasPaymentInYear) return false;
      }
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

  const getRowColor = (student) => {
    if (student.isPaidCompletely) return '#d1fae5';
    return 'white';
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
          <button onClick={() => setShowModal(true)} style={styles.addButton}>
            <Plus size={18} />
            Ajouter Paiement
          </button>
             <button onClick={handleLogout} style={styles.logoutButton} title="Déconnexion">
      <User size={18} />
      Déconnexion
    </button>
        </div>
      </div>

      {/* Filtres en haut du tableau */}
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            placeholder="Rechercher étudiant, classe, téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
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
            <label style={styles.filterLabel}>Année scolaire:</label>
            <select
              value={filters.anneeScolaire}
              onChange={(e) => setFilters({...filters, anneeScolaire: e.target.value})}
              style={styles.filterSelect}
            >
              <option value="">Toutes les années</option>
              {anneesScolaires.map(annee => (
                <option key={annee} value={annee}>{annee}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setFilters({ cours: '', anneeScolaire: '' })}
            style={styles.resetFilterButton}
          >
            Réinitialiser
          </button>
          
          <div style={styles.resultsCount}>
            {filteredStudents.length} étudiant(s)
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Étudiant</th>
                <th style={styles.th}>Classe</th>
                <th style={styles.th}>Année scolaire</th>
                <th style={styles.th}>Téléphone</th>
                <th style={styles.th}>Prix Total (DH)</th>
                <th style={styles.th}>Déjà Payé (DH)</th>
                <th style={styles.th}>Reste à Payer (DH)</th>
                <th style={styles.th}>% Payé</th>
                <th style={styles.th}>Paiements</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const stats = student.stats;
                const pourcentageStyle = stats.pourcentagePaye === 100 
                  ? { color: '#059669', fontWeight: '600' }
                  : stats.pourcentagePaye >= 50 
                  ? { color: '#d97706', fontWeight: '600' }
                  : { color: '#dc2626', fontWeight: '600' };

                return (
                  <tr key={student._id} style={{...styles.tableRow, backgroundColor: getRowColor(student)}}>
                    <td style={styles.td}>
                      <div style={styles.studentNameCell}>
                        <User size={16} color="#6b7280" style={{marginRight: '8px'}} />
                        {student.nomComplet || '—'}
                      </div>
                    </td>
                    <td style={styles.td}>{student.coursDisplay || '—'}</td>
                    <td style={styles.td}>{student.anneeScolaire || '—'}</td>
                    <td style={styles.td}>{student.telephoneEtudiant || '—'}</td>
                    <td style={styles.tdAmount}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{stats.totalAPayer.toLocaleString()} DH</strong>
                        <button
                          onClick={() => openEditPrixModal(student)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            backgroundColor: '#f0f9ff',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="Modifier le prix total"
                        >
                          <Edit size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal' }}>
                        (Prix total)
                      </div>
                    </td>
                    <td style={styles.tdAmount}>
                      <strong>{stats.totalPaye.toLocaleString()} DH</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal' }}>
                        (Payé)
                      </div>
                    </td>
                    <td style={{
                      ...styles.tdAmount,
                      color: stats.totalRestant > 0 ? '#dc2626' : '#059669',
                      fontWeight: '600'
                    }}>
                      <strong>{stats.totalRestant.toLocaleString()} DH</strong>
                      {stats.totalRestant > 0 ? (
                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'normal' }}>
                          ⚠️ Reste à payer
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: 'normal' }}>
                          ✓ Tout payé
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{...styles.progressBarContainer, ...pourcentageStyle}}>
                        <div style={{
                          ...styles.progressBar,
                          width: `${Math.min(stats.pourcentagePaye, 100)}%`,
                          backgroundColor: stats.pourcentagePaye === 100 ? '#059669' : 
                                         stats.pourcentagePaye >= 50 ? '#d97706' : '#dc2626'
                        }} />
                        <span style={styles.progressText}>
                          {stats.pourcentagePaye}%
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => viewPaymentHistory(student)}
                        style={{
                          backgroundColor: student.paymentsCount > 0 ? '#dbeafe' : '#f3f4f6',
                          color: student.paymentsCount > 0 ? '#1d4ed8' : '#6b7280',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <History size={14} />
                        {student.paymentsCount}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => {
                            const stats = getStudentStats(student._id);
                            setFormData({
                              etudiant: student._id,
                              montantTotal: student.prixTotal?.toString() || '0',
                              montantPaye: '0', // Toujours 0 par défaut
                              typePaiement: 'Cash',
                              numeroCheque: '',
                              banque: '',
                              dateEcheance: '',
                              moisDebut: new Date().toISOString().split('T')[0],
                              nombreMois: 1,
                              cours: student.coursDisplay || '',
                              note: '',
                              anneeScolaire: student.anneeScolaire || '2025/2026'
                            });
                            
                            // Mettre à jour les infos étudiant
                            const studentPayments = getStudentPayments(student._id);
                            const totalPaye = studentPayments.reduce((sum, p) => sum + (p.montantPaye || 0), 0);
                            setCurrentStudentInfo({
                              nomComplet: student.nomComplet,
                              prixTotal: student.prixTotal || 0,
                              totalPaye,
                              resteAPayer: stats.totalRestant,
                              pourcentagePaye: stats.pourcentagePaye
                            });
                            
                            setShowModal(true);
                          }}
                          style={{
                            ...styles.payBtnSmall,
                            backgroundColor: student.isPaidCompletely ? '#d1d5db' : '#d1fae5',
                            color: student.isPaidCompletely ? '#6b7280' : '#059669',
                            borderColor: student.isPaidCompletely ? '#9ca3af' : '#a7f3d0',
                            cursor: student.isPaidCompletely ? 'not-allowed' : 'pointer'
                          }}
                          title={student.isPaidCompletely ? "Étudiant a déjà tout payé" : "Ajouter un paiement"}
                          disabled={student.isPaidCompletely}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredStudents.length === 0 && (
            <div style={styles.emptyState}>
              Aucun étudiant trouvé
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout de paiement */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Ajouter un Paiement</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              {/* SECTION RÉSUMÉ ÉTUDIANT */}
              {currentStudentInfo.nomComplet && (
                <div style={styles.studentSummary}>
                  <h3 style={styles.summaryTitle}>📋 RÉSUMÉ DE L'ÉTUDIANT</h3>
                  <div style={styles.summaryGrid}>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Étudiant:</span>
                      <span style={styles.summaryValue}>{currentStudentInfo.nomComplet}</span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Prix Total:</span>
                      <span style={{...styles.summaryValue, color: '#059669', fontWeight: '700'}}>
                        {currentStudentInfo.prixTotal.toLocaleString()} DH
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Déjà Payé:</span>
                      <span style={{...styles.summaryValue, color: '#3b82f6'}}>
                        {currentStudentInfo.totalPaye.toLocaleString()} DH
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Reste à Payer:</span>
                      <span style={{
                        ...styles.summaryValue, 
                        color: currentStudentInfo.resteAPayer > 0 ? '#dc2626' : '#059669',
                        fontWeight: '700'
                      }}>
                        {currentStudentInfo.resteAPayer.toLocaleString()} DH
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>% Payé:</span>
                      <span style={{
                        ...styles.summaryValue,
                        color: currentStudentInfo.pourcentagePaye === 100 ? '#059669' : 
                               currentStudentInfo.pourcentagePaye >= 50 ? '#d97706' : '#dc2626'
                      }}>
                        {currentStudentInfo.pourcentagePaye}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Étudiant *</label>
                  <Select
                    options={etudiantsOptions}
                    value={etudiantsOptions.find(opt => opt.value === formData.etudiant)}
                    onChange={handleEtudiantSelect}
                    placeholder="Sélectionner un étudiant"
                    isSearchable
                    styles={selectStyles}
                    required
                  />
                  <div style={styles.formHint}>
                    ⚠️ Le prix total de l'étudiant sera utilisé automatiquement
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Classe/Cours</label>
                  <input
                    type="text"
                    name="cours"
                    value={formData.cours}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Sera rempli automatiquement"
                    readOnly
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Année Scolaire *</label>
                  <input
                    type="text"
                    name="anneeScolaire"
                    value={formData.anneeScolaire}
                    onChange={handleChange}
                    required
                    style={styles.input}
                    placeholder="2025/2026"
                  />
                  <div style={styles.formHint}>
                    Format: YYYY/YYYY
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Prix Total de l'Étudiant (DH)</label>
                  <div style={styles.readOnlyInput}>
                    {currentStudentInfo.prixTotal ? currentStudentInfo.prixTotal.toLocaleString() : '0'} DH
                  </div>
                  <div style={styles.formHint}>
                    Ce montant vient de la fiche de l'étudiant
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Montant à Payer (DH) *</label>
                  <input
                    type="number"
                    name="montantPaye"
                    value={formData.montantPaye}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    style={styles.input}
                    placeholder="Entrez le montant à payer"
                  />
                  <div style={styles.formHint}>
                    💡 Suggestion: {currentStudentInfo.resteAPayer.toLocaleString()} DH (reste à payer)
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Reste après ce paiement</label>
                  <div style={currentStudentInfo.resteAPayer - (parseFloat(formData.montantPaye) || 0) > 0 ? styles.restantDisplayWarning : styles.restantDisplay}>
                    <div style={{ fontSize: '18px', fontWeight: '800' }}>
                      {Math.max(0, currentStudentInfo.resteAPayer - (parseFloat(formData.montantPaye) || 0)).toFixed(2)} DH
                    </div>
                    {currentStudentInfo.resteAPayer - (parseFloat(formData.montantPaye) || 0) > 0 ? (
                      <div style={{ fontSize: '13px', color: '#dc2626', marginTop: '6px' }}>
                        ⚠️ Il restera {Math.max(0, currentStudentInfo.resteAPayer - (parseFloat(formData.montantPaye) || 0)).toFixed(2)} DH à payer
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#059669', marginTop: '6px' }}>
                        ✅ L'étudiant sera entièrement payé
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Type de Paiement *</label>
                  <select
                    name="typePaiement"
                    value={formData.typePaiement}
                    onChange={handleChange}
                    required
                    style={styles.select}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement</option>
                    <option value="En ligne">En ligne</option>
                  </select>
                </div>

                {formData.typePaiement === 'Chèque' && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Numéro de Chèque *</label>
                      <input
                        type="text"
                        name="numeroCheque"
                        value={formData.numeroCheque}
                        onChange={handleChange}
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Banque</label>
                      <input
                        type="text"
                        name="banque"
                        value={formData.banque}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Date d'Échéance *</label>
                      <input
                        type="date"
                        name="dateEcheance"
                        value={formData.dateEcheance}
                        onChange={handleChange}
                        required
                        style={styles.input}
                      />
                    </div>
                  </>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Date de Début *</label>
                  <input
                    type="date"
                    name="moisDebut"
                    value={formData.moisDebut}
                    onChange={handleChange}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre de Mois *</label>
                  <input
                    type="number"
                    name="nombreMois"
                    value={formData.nombreMois}
                    onChange={handleChange}
                    required
                    min="1"
                    style={styles.input}
                  />
                </div>

                <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                  <label style={styles.label}>Note</label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    style={styles.textarea}
                    rows="3"
                    placeholder="Remarques ou observations sur ce paiement..."
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  style={styles.cancelButton}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.montantPaye || parseFloat(formData.montantPaye) <= 0}
                  style={styles.submitButton}
                >
                  {loading ? (
                    <>Enregistrement...</>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Enregistrer et Générer PDF
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'édition du prix total */}
      {showEditPrixModal && editingStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.smallModal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Modifier le Prix Total</h2>
              <button onClick={() => setShowEditPrixModal(false)} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Étudiant</label>
                <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '16px' }}>
                  <strong>{editingStudent.nomComplet}</strong>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {editingStudent.niveau || '—'}
                  </div>
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Nouveau Prix Total (DH)</label>
                <input
                  type="number"
                  value={editPrix}
                  onChange={(e) => setEditPrix(e.target.value)}
                  min="0"
                  step="100"
                  style={styles.input}
                  placeholder="Entrez le nouveau prix"
                  autoFocus
                />
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowEditPrixModal(false)}
                style={styles.cancelButton}
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={savePrix}
                style={styles.submitButton}
                disabled={loading || !editPrix || parseFloat(editPrix) < 0}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
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
                Historique des paiements - {selectedEtudiantForHistory.nomComplet}
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
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Prix Total:</span>
                      <span style={styles.summaryValue}>{selectedEtudiantForHistory.prixTotal || 0} DH</span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Total Payé:</span>
                      <span style={styles.summaryValue}>
                        {selectedPaymentHistory.reduce((sum, p) => sum + (p.montantPaye || 0), 0)} DH
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Reste à Payer:</span>
                      <span style={styles.summaryValue}>
                        {Math.max(0, (selectedEtudiantForHistory.prixTotal || 0) - 
                         selectedPaymentHistory.reduce((sum, p) => sum + (p.montantPaye || 0), 0))} DH
                      </span>
                    </div>
                  </div>
                  
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Classe</th>
                        <th style={styles.th}>Année scolaire</th>
                        <th style={styles.th}>Période</th>
                        <th style={styles.th}>Montant Total</th>
                        <th style={styles.th}>Montant Payé</th>
                        <th style={styles.th}>Restant</th>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>Statut</th>
                        <th style={styles.th}>Note</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPaymentHistory.map((payment) => {
                        const dateFin = new Date(payment.moisDebut);
                        dateFin.setMonth(dateFin.getMonth() + payment.nombreMois);
                        
                        return (
                          <tr key={payment._id} style={styles.tableRow}>
                            <td style={styles.td}>{formatDate(payment.createdAt)}</td>
                            <td style={styles.td}>{payment.cours || '—'}</td>
                            <td style={styles.td}>{payment.anneeScolaire || '—'}</td>
                            <td style={styles.td}>
                              {formatDate(payment.moisDebut)} - {formatDate(dateFin)}
                            </td>
                            <td style={styles.tdAmount}>{payment.montantTotal} DH</td>
                            <td style={styles.tdAmount}>{payment.montantPaye} DH</td>
                            <td style={{
                              ...styles.tdAmount,
                              color: payment.montantRestant > 0 ? '#dc2626' : '#059669'
                            }}>
                              {payment.montantRestant} DH
                            </td>
                            <td style={styles.td}>
                              {payment.typePaiement}
                              {payment.typePaiement === 'Chèque' && payment.numeroCheque && (
                                <div style={styles.subText}>
                                  N° {payment.numeroCheque}
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>
                              {payment.typePaiement === 'Chèque' ? (
                                <span style={styles.statusPaid}>
                                  {payment.statutCheque || 'Payé'}
                                </span>
                              ) : (
                                <span style={styles.statusPaid}>Payé</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              {payment.note || '—'}
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => deletePayment(payment._id)}
                                style={styles.deleteBtn}
                                title="Supprimer ce paiement"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notification des Chèques */}
      {showChequeModal && chequeNotifications.length > 0 && (
        <div style={styles.modalOverlay}>
          <div style={styles.chequeModal}>
            <div style={styles.chequeModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bell size={24} color="#dc2626" />
                <h2 style={styles.modalTitle}>⚠️ Chèques à Vérifier</h2>
              </div>
              <button onClick={() => setShowChequeModal(false)} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <div style={styles.chequeModalContent}>
              <div style={styles.chequeWarning}>
                ⚠️ Vous avez {chequeNotifications.length} chèque(s) qui nécessite(nt) votre attention
              </div>
              
              {chequeNotifications.map(cheque => {
                const dateEcheance = new Date(cheque.dateEcheance);
                const joursRestants = Math.ceil((dateEcheance - new Date()) / (1000 * 60 * 60 * 24));
                const isExpired = joursRestants < 0;
                
                return (
                  <div key={cheque._id} style={isExpired ? styles.chequeItemExpired : styles.chequeItem}>
                    <div style={styles.chequeInfo}>
                      <div style={styles.chequeStudent}>
                        <User size={18} />
                        <strong>{cheque.etudiant?.nomComplet}</strong>
                      </div>
                      
                      <div style={styles.chequeDetails}>
                        <div style={styles.chequeDetailRow}>
                          <span style={styles.chequeLabel}>Chèque N°:</span>
                          <span style={styles.chequeValue}>{cheque.numeroCheque}</span>
                        </div>
                        <div style={styles.chequeDetailRow}>
                          <span style={styles.chequeLabel}>Banque:</span>
                          <span style={styles.chequeValue}>{cheque.banque}</span>
                        </div>
                        <div style={styles.chequeDetailRow}>
                          <span style={styles.chequeLabel}>Montant:</span>
                          <span style={styles.chequeValue}>{cheque.montantPaye} DH</span>
                        </div>
                        <div style={styles.chequeDetailRow}>
                          <span style={styles.chequeLabel}>Date d'échéance:</span>
                          <span style={styles.chequeValue}>{formatDate(cheque.dateEcheance)}</span>
                        </div>
                      </div>
                      
                      <div style={isExpired ? styles.expiryWarning : styles.expiryInfo}>
                        {isExpired 
                          ? `🚨 EXPIRÉ depuis ${Math.abs(joursRestants)} jour(s)`
                          : `⏰ Expire dans ${joursRestants} jour(s)`
                        }
                      </div>
                    </div>
                    
                    <div style={styles.chequeActions}>
                      <button 
                        onClick={() => {
                          updateChequeStatus(cheque._id, 'Encaissé');
                          setShowChequeModal(false);
                        }} 
                        style={styles.chequeAcceptBtn}
                      >
                        ✓ Encaisser
                      </button>
                      <button 
                        onClick={() => {
                          updateChequeStatus(cheque._id, 'Rejeté');
                          setShowChequeModal(false);
                        }} 
                        style={styles.chequeRejectBtn}
                      >
                        ✗ Rejeter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={styles.chequeModalFooter}>
              <button onClick={() => setShowChequeModal(false)} style={styles.closeChequeModalBtn}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
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
    alignItems: 'center'
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
    transition: 'all 0.2s'
  },
  notificationPanel: {
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    margin: '16px 24px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  notifTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  notifSection: {
    padding: '12px'
  },
  closeNotif: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px'
  },
  notifItem: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px'
  },
  notifActions: {
    display: 'flex',
    gap: '8px'
  },
  acceptBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#d1fae5',
    color: '#059669'
  },
  rejectBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  filtersBar: {
    backgroundColor: 'white',
    padding: '16px 24px',
    margin: '16px 24px 0 24px',
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
  content: {
    padding: '0 24px 24px 24px'
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
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '12px 16px',
    color: '#1f2937',
    borderRight: '1px solid #e5e7eb',
    verticalAlign: 'middle'
  },
  tdAmount: {
    padding: '12px 16px',
    color: '#1f2937',
    textAlign: 'right',
    fontWeight: '600',
    borderRight: '1px solid #e5e7eb'
  },
  studentNameCell: {
    display: 'flex',
    alignItems: 'center'
  },
  progressBarContainer: {
    position: 'relative',
    height: '24px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '11px',
    fontWeight: '600',
    zIndex: 1
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  payBtnSmall: {
    padding: '6px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    border: '1px solid #a7f3d0',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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
    justifyContent: 'center'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
    fontSize: '14px'
  },
  subText: {
    fontSize: '11px',
    color: '#6b7280'
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
    maxWidth: '1400px',
    maxHeight: '95vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  smallModal: {
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
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
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  textarea: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  },
  studentSummary: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #bae6fd',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px'
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500'
  },
  summaryValue: {
    fontSize: '15px',
    fontWeight: '600'
  },
  formHint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    fontStyle: 'italic'
  },
  readOnlyInput: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#f9fafb',
    color: '#374151'
  },
  restantDisplay: {
    padding: '10px 12px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '700',
    border: '2px solid #059669'
  },
  restantDisplayWarning: {
    padding: '10px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '700',
    border: '2px solid #dc2626'
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
    transition: 'all 0.2s'
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
    transition: 'all 0.2s'
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
  statusPaid: {
    padding: '4px 10px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block'
  },
  chequeModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column'
  },
  chequeModalHeader: {
    padding: '24px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef2f2'
  },
  chequeModalContent: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  chequeWarning: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    color: '#991b1b',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  chequeItem: {
    backgroundColor: '#fffbeb',
    border: '2px solid #fcd34d',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px'
  },
  chequeItemExpired: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fca5a5',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px'
  },
  chequeInfo: {
    marginBottom: '16px'
  },
  chequeStudent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },
  chequeDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '12px'
  },
  chequeDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px'
  },
  chequeLabel: {
    color: '#6b7280',
    fontWeight: '500'
  },
  chequeValue: {
    color: '#1f2937',
    fontWeight: '600'
  },
  expiryInfo: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center'
  },
  expiryWarning: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center'
  },
  chequeActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  chequeAcceptBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#d1fae5',
    color: '#059669',
    transition: 'all 0.2s'
  },
  chequeRejectBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    transition: 'all 0.2s'
  },
  chequeModalFooter: {
    padding: '16px 24px',
    borderTop: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#f9fafb'
  },
  closeChequeModalBtn: {
    padding: '10px 32px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

export default PaymentManagementSystem;