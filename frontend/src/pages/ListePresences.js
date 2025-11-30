import React, { useEffect, useState } from 'react';
import { Calendar, Book, Eye, X, Users, Check, AlertCircle, FileText, Search, Filter, ChevronDown, User, Clock, Download, Edit, Trash2, Save } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx-js-style';
import Sidebar from '../components/Sidebar'; // ✅ استيراد صحيح

const ListePresences = () => {
  const [presences, setPresences] = useState([]);
  const [groupedSessions, setGroupedSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [sessionActive, setSessionActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moisScolaireFilter, setMoisScolaireFilter] = useState('');
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');

  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [coursFilter, setCoursFilter] = useState('');
  const [presenceRateFilter, setPresenceRateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [availableCours, setAvailableCours] = useState([]);
  const [matiereFilter, setMatiereFilter] = useState(''); // 🆕 Nouveau filtre
  const [periodeFilter, setPeriodeFilter] = useState(''); // 🆕 Nouveau filtre
  const [availableMatieres, setAvailableMatieres] = useState([]); // 🆕
  const [availablePeriodes, setAvailablePeriodes] = useState([]); // 🆕
  const [professeurFilter, setProfesseurFilter] = useState(''); // 🆕 Nouveau filtre
  const [availableProfesseurs, setAvailableProfesseurs] = useState([]); // 🆕
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingPresence, setEditingPresence] = useState(null);
  const [editForm, setEditForm] = useState({
    present: true,
    retardMinutes: 0,
    remarque: ''
  });
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const fetchPresences = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/presences', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = res.data;

        // Groupement par date + cours + matiere + nomProfesseur
        const grouped = {};
        for (let p of data) {
const key = `${new Date(p.dateSession).toDateString()}_${p.cours}_${p.matiere || ''}_${p.nomProfesseur || ''}_${p.heure || ''}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(p);
        }

        // Conversion en array avec statistiques
        const sessions = Object.entries(grouped).map(([key, values]) => {
          const [date, cours, matiere, nomProfesseur] = key.split('_');
          const presentCount = values.filter(p => p.present).length;
          const retardCount = values.filter(p => p.present && p.retardMinutes > 0).length; // 🆕
          const totalCount = values.length;
          return { 
            date, 
            cours, 
            matiere,
            nomProfesseur,
            presences: values,
            presentCount,
            retardCount, // 🆕
            totalCount,
            attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
          };
        }).sort((a, b) => new Date(b.date) - new Date(a.date)); // ✅ ترتيب تنازلي حسب التاريخ

        // Extraire les cours, matières, périodes et professeurs uniques pour les filtres
        const uniqueCours = [...new Set(sessions.map(s => s.cours))];
        const uniqueMatieres = [...new Set(data.filter(p => p.matiere).map(p => p.matiere))];
        const uniquePeriodes = [...new Set(data.filter(p => p.periode).map(p => p.periode))];
        const uniqueProfesseurs = [...new Set(data.filter(p => p.nomProfesseur).map(p => p.nomProfesseur))];

        setAvailableCours(uniqueCours);
        setAvailableMatieres(uniqueMatieres);
        setAvailablePeriodes(uniquePeriodes);
        setAvailableProfesseurs(uniqueProfesseurs);

        setGroupedSessions(sessions);
        setFilteredSessions(sessions);
      } catch (err) {
        console.error('Erreur chargement présences:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPresences();
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role);
  }, []);

  // Fonction de filtrage
  useEffect(() => {
    let filtered = [...groupedSessions];

    // Filtre par recherche textuelle
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.cours.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(session.date).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
if (moisScolaireFilter) {
  filtered = filtered.filter(session => {
    const sessionDate = new Date(session.date);
    const [filterYear, filterMonth] = moisScolaireFilter.split('-');
    return (
      sessionDate.getFullYear() === parseInt(filterYear) &&
      sessionDate.getMonth() + 1 === parseInt(filterMonth)
    );
  });
}
if (dateFrom) {
  const from = new Date(dateFrom);
  filtered = filtered.filter(session => new Date(session.date) >= from);
}

if (dateTo) {
  const to = new Date(dateTo);
  filtered = filtered.filter(session => new Date(session.date) <= to);
}

    // Filtre par date
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      filtered = filtered.filter(session => session.date === filterDate);
    }

    // Filtre par cours
    if (coursFilter && coursFilter !== 'all') {
      filtered = filtered.filter(session => session.cours === coursFilter);
    }

    // Filtre par taux de présence
    if (presenceRateFilter && presenceRateFilter !== 'all') {
      filtered = filtered.filter(session => {
        switch (presenceRateFilter) {
          case 'high':
            return session.attendanceRate >= 80;
          case 'medium':
            return session.attendanceRate >= 50 && session.attendanceRate < 80;
          case 'low':
            return session.attendanceRate < 50;
          default:
            return true;
        }
      });
    }

    // Filtre par matière
    if (matiereFilter && matiereFilter !== 'all') {
      filtered = filtered.filter(session => 
        session.presences.some(p => p.matiere === matiereFilter)
      );
    }

    // Filtre par période
    if (periodeFilter && periodeFilter !== 'all') {
      filtered = filtered.filter(session => 
        session.presences.some(p => p.periode === periodeFilter)
      );
    }

    // Filtre par professeur
    if (professeurFilter && professeurFilter !== 'all') {
      filtered = filtered.filter(session => 
        session.presences.some(p => p.nomProfesseur === professeurFilter)
      );
    }

    setFilteredSessions(filtered.sort((a, b) => new Date(b.date) - new Date(a.date))); // ✅ ترتيب النتائج المفلترة أيضًا
  }, [
  searchTerm,
  dateFilter,
  coursFilter,
  presenceRateFilter,
  matiereFilter,
  periodeFilter,
  professeurFilter,
  moisScolaireFilter, // ✅ ضروري لتفعيل التصفية عند تغييره
  dateFrom,            // ✅ مهم
  dateTo,              // ✅ مهم
  groupedSessions
]);
  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR');
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
// Fonctions pour gérer l'édition et suppression
const handleDeletePresence = async (presenceId, sessionIndex, presenceIndex) => {
  if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette présence ?')) {
    return;
  }
  try {
    const token = localStorage.getItem('token');
    await axios.delete(`/api/presences/${presenceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updatedSessions = [...filteredSessions];
    updatedSessions[sessionIndex].presences.splice(presenceIndex, 1);
    updatedSessions[sessionIndex].totalCount--;
    const presentCount = updatedSessions[sessionIndex].presences.filter(p => p.present).length;
    const retardCount = updatedSessions[sessionIndex].presences.filter(p => p.present && p.retardMinutes > 0).length;
    updatedSessions[sessionIndex].presentCount = presentCount;
    updatedSessions[sessionIndex].retardCount = retardCount;
    updatedSessions[sessionIndex].attendanceRate = 
      updatedSessions[sessionIndex].totalCount > 0 ? 
      Math.round((presentCount / updatedSessions[sessionIndex].totalCount) * 100) : 0;
    setFilteredSessions(updatedSessions);
    setGroupedSessions(updatedSessions);
    if (sessionActive) {
      setSessionActive(updatedSessions[sessionIndex]);
    }
    alert('Présence supprimée avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    alert('Erreur lors de la suppression');
  }
};
const handleEditPresence = (presence) => {
  setEditingPresence(presence._id);
  setEditForm({
    present: presence.present,
    retardMinutes: presence.retardMinutes || 0,
    remarque: presence.remarque || ''
  });
};
const handleSaveEdit = async (presenceId, sessionIndex, presenceIndex) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `/api/admin/presences/${presenceId}`,
      editForm,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const updatedSessions = [...filteredSessions];
    
    // ❌ PROBLÈME : Cette ligne écrase tout l'objet, y compris les données de l'étudiant
    // updatedSessions[sessionIndex].presences[presenceIndex] = {
    //   ...updatedSessions[sessionIndex].presences[presenceIndex],
    //   ...response.data
    // };

    // ✅ SOLUTION : Mettre à jour seulement les champs modifiés
    updatedSessions[sessionIndex].presences[presenceIndex] = {
      ...updatedSessions[sessionIndex].presences[presenceIndex],
      present: response.data.present,
      retardMinutes: response.data.retardMinutes,
      remarque: response.data.remarque
      // Garder les autres propriétés intactes (etudiant, _id, etc.)
    };

    // Recalculer les statistiques
    const presentCount = updatedSessions[sessionIndex].presences.filter(p => p.present).length;
    const retardCount = updatedSessions[sessionIndex].presences.filter(p => p.present && p.retardMinutes > 0).length;
    
    updatedSessions[sessionIndex].presentCount = presentCount;
    updatedSessions[sessionIndex].retardCount = retardCount;
    updatedSessions[sessionIndex].attendanceRate = 
      updatedSessions[sessionIndex].totalCount > 0 ? 
      Math.round((presentCount / updatedSessions[sessionIndex].totalCount) * 100) : 0;

    setFilteredSessions(updatedSessions);
    setGroupedSessions(updatedSessions);
    
    if (sessionActive) {
      setSessionActive(updatedSessions[sessionIndex]);
    }

    setEditingPresence(null);
    alert('Présence modifiée avec succès');
  } catch (error) {
    console.error('Erreur lors de la modification:', error);
    alert('Erreur lors de la modification');
  }
};
const handleCancelEdit = () => {
  setEditingPresence(null);
  setEditForm({
    present: true,
    retardMinutes: 0,
    remarque: ''
  });
};
 const clearFilters = () => {
  setSearchTerm('');
  setDateFilter('');
  setCoursFilter('');
  setPresenceRateFilter('');
  setMatiereFilter('');
  setPeriodeFilter('');
  setProfesseurFilter('');
  setMoisScolaireFilter('');
  setDateFrom('');
  setDateTo('');
};
const formatHoraire = (heure, periode) => {
  if (!heure && !periode) return 'Non spécifié';
  if (!heure) return periode ? periode.charAt(0).toUpperCase() + periode.slice(1) : 'Non spécifié';
  if (!periode) return heure;
  return `${heure} (${periode.charAt(0).toUpperCase() + periode.slice(1)})`;
};

const getMoisOptions = () => {
  const options = [];
  const today = new Date();
  const currentYear = today.getFullYear();

  // نولد الشهور من أغسطس العام الماضي إلى يوليو العام القادم
  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    for (let m = 0; m < 12; m++) {
      const date = new Date(y, m);
      const label = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      const value = `${y}-${String(m + 1).padStart(2, '0')}`;
      options.push({ value, label });
    }
  }

  return options;
};

// Fonction générale d'export Excel
const exportToExcel = (data, filename, sheetName = 'Présences') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
// 🆕 دالة للتصدير اليومي بجدول واضح
// ✅ تصدير يوم واحد: كل "classe" في جدول مستقل داخل نفس الورقة
// ✅ تصدير يوم واحد: داخل كل Classe كنقسم لجداول فرعية حسب (Prof + Période + Matière + Heure)
// Fonction corrigée pour l'export avec styles
const exportDailyPresences = async (date, professorName = null, statusFilter = 'all', periodeFilter = '') => {
  const isAllPeriode = !periodeFilter || periodeFilter === 'all';

  const sessionsOfDay = filteredSessions.filter(session => {
    const sessionDate = new Date(session.date).toDateString();
    const filterDate  = new Date(date).toDateString();
    const periodeMatch = isAllPeriode || (session.presences[0]?.periode === periodeFilter);
    const profMatch    = !professorName || session.nomProfesseur === professorName;
    return sessionDate === filterDate && profMatch && periodeMatch;
  });

  if (sessionsOfDay.length === 0) {
    alert('Aucune donnée trouvée pour cette date');
    return;
  }

  // 🆕 Déterminer le titre selon le filtre
  const getMainTitle = () => {
    if (statusFilter === 'absent') return 'ABSENCES';
    if (statusFilter === 'retard') return 'RETARDS';
    if (statusFilter === 'absent_retard') return 'ABSENCES ET RETARDS';
    return 'PRÉSENCES';
  };

  // 🆕 Message pour les classes vides
  const getEmptyMessage = () => {
    if (statusFilter === 'absent') return 'Aucune absence';
    if (statusFilter === 'retard') return 'Aucun retard';
    if (statusFilter === 'absent_retard') return 'Aucune absence ni retard';
    return 'Aucune donnée';
  };

  const classes = {};
  sessionsOfDay.forEach(s => {
    if (!classes[s.cours]) classes[s.cours] = [];
    classes[s.cours].push(s);
  });

  // ===== TRI PERSONNALISÉ PAR NIVEAU, FILIÈRE ET SUFFIXE =====
  const levelOrder = {
    "2BAC": 1,
    "1BAC": 2,
    "Tronc Commun": 3,
    "3AC": 4,
    "2AC": 5,
    "1AC": 6
  };

  const filiereOrder = {
    "PC": 1,
    "Économie": 2,
    "SC": 1,
    "Lettres": 3
  };

  const getClassSortKey = (className) => {
    let level = "";
    let filiere = "";
    let suffix = "";
    
    if (className.startsWith("2BAC")) {
      level = "2BAC";
      if (className.includes("PC")) {
        filiere = "PC";
        suffix = className.replace(/^2BAC\s*PC\s*/, "").trim();
      } else if (className.includes("Économie")) {
        filiere = "Économie";
        suffix = className.replace(/^2BAC\s*Économie\s*/, "").trim();
      } else {
        filiere = "";
        suffix = className.replace(/^2BAC\s*/, "").trim();
      }
    } else if (className.startsWith("1BAC")) {
      level = "1BAC";
      if (className.includes("SC")) {
        filiere = "SC";
        suffix = className.replace(/^1BAC\s*SC\s*/, "").trim();
      } else if (className.includes("Économie")) {
        filiere = "Économie";
        suffix = className.replace(/^1BAC\s*Économie\s*/, "").trim();
      } else if (className.includes("Lettres")) {
        filiere = "Lettres";
        suffix = className.replace(/^1BAC\s*Lettres\s*/, "").trim();
      } else {
        filiere = "";
        suffix = className.replace(/^1BAC\s*/, "").trim();
      }
    } else if (className.startsWith("Tronc Commun")) {
      level = "Tronc Commun";
      filiere = "";
      suffix = className.replace(/^Tronc Commun\s*/, "").trim();
    } else if (className.startsWith("3AC")) {
      level = "3AC";
      filiere = "";
      suffix = className.replace(/^3AC\s*/, "").trim();
    } else if (className.startsWith("2AC")) {
      level = "2AC";
      filiere = "";
      suffix = className.replace(/^2AC\s*/, "").trim();
    } else if (className.startsWith("1AC")) {
      level = "1AC";
      filiere = "";
      suffix = className.replace(/^1AC\s*/, "").trim();
    } else {
      level = className;
      filiere = "";
      suffix = "ZZZ";
    }
    
    const levelPriority = levelOrder[level] || 999;
    const filierePriority = filiereOrder[filiere] || 999;
    
    return { 
      levelPriority, 
      filierePriority,
      filiere,
      suffix: suffix || "A" 
    };
  };

  // ===== NOUVEAU HEADER SANS DOUBLONS =====
  const header = [
    'Étudiant', 
    'Statut', 
    'Retard (min)', 
    'Nb Absences', 
    'Nb Retards',
    'Tél Mère', 
    'Tél Père', 
    'Remarque'
  ];
  
  const colWidths = [
    { wch: 28 }, // Étudiant
    { wch: 12 }, // Statut
    { wch: 12 }, // Retard
    { wch: 12 }, // Nb Absences
    { wch: 12 }, // Nb Retards
    { wch: 15 }, // Tél Mère
    { wch: 15 }, // Tél Père
    { wch: 40 }  // Remarque
  ];

  const aoa = [];
  const merges = [];
  const colsCount = header.length;

  const bigTitle = `${getMainTitle()} — ${formatDate(date)}${professorName ? ' — ' + professorName : ''}${!isAllPeriode ? ' — ' + periodeFilter : ''}`;
  aoa.push([bigTitle, ...Array(colsCount - 1).fill('')]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colsCount - 1 } });
  aoa.push(Array(colsCount).fill(''));

  let currentRow = aoa.length;
  const headerRows = [];
  const titleRows = [0];
  const classRows = [];
  const subTitleRows = [];
  const emptyMessageRows = []; // 🆕 Pour tracker les lignes "Aucune absence"

  // ===== FONCTION POUR RÉCUPÉRER LES STATISTIQUES D'UN ÉTUDIANT =====
  const calculateStudentStats = async (etudiantId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/presences/stats/${etudiantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return {
        nbAbsences: response.data.nbAbsences,
        nbRetards: response.data.nbRetards
      };
    } catch (error) {
      console.error('Erreur calcul stats:', error);
      return { nbAbsences: 0, nbRetards: 0 };
    }
  };

  // ===== TRI: D'ABORD PAR NIVEAU, PUIS PAR FILIÈRE, PUIS PAR SUFFIXE =====
  const sortedClasses = Object.entries(classes).sort(([a], [b]) => {
    const aKey = getClassSortKey(a);
    const bKey = getClassSortKey(b);
    
    // 1. Comparer d'abord par niveau (2BAC, 1BAC, etc.)
    if (aKey.levelPriority !== bKey.levelPriority) {
      return aKey.levelPriority - bKey.levelPriority;
    }
    
    // 2. Si même niveau, comparer par filière (PC avant Économie)
    if (aKey.filierePriority !== bKey.filierePriority) {
      return aKey.filierePriority - bKey.filierePriority;
    }
    
    // 3. Si même niveau ET même filière, comparer par suffixe (A, B, C, D...)
    return aKey.suffix.localeCompare(bKey.suffix, 'fr');
  });

  // ===== TRAITEMENT ASYNCHRONE =====
  try {
    for (const [className, sessions] of sortedClasses) {
      aoa.push([`CLASSE: ${className}`, ...Array(colsCount - 1).fill('')]);
      classRows.push(currentRow);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colsCount - 1 } });
      currentRow++;

      // Grouper par (Prof + Période + Matière + Heure)
      const subGroups = {};
      sessions.forEach(s => {
        const prof   = s.nomProfesseur || 'N/A';
        const periode= s.presences[0]?.periode || 'N/A';
        const mat    = s.matiere || 'N/A';
        const heure  = s.presences[0]?.heure || 'N/A';
        const key = `${prof}||${periode}||${mat}||${heure}`;
        if (!subGroups[key]) subGroups[key] = [];
        subGroups[key].push(s);
      });

      for (const [key, groupSessions] of Object.entries(subGroups).sort(([ka],[kb]) => ka.localeCompare(kb,'fr'))) {
        const [prof, periode, mat, heure] = key.split('||');

        // ===== SOUS-TITRE AVEC INFOS UNIQUES =====
        aoa.push([`Prof: ${prof} — Période: ${periode} — Matière: ${mat} — Heure: ${heure} — Date: ${formatDate(date)}`, ...Array(colsCount - 1).fill('')]);
        subTitleRows.push(currentRow);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colsCount - 1 } });
        currentRow++;

        // 🆕 Compter les étudiants qui correspondent au filtre
        let studentsAddedCount = 0;
        const headerRowIndex = currentRow; // Sauvegarder l'index du header

        // ===== HEADER DES COLONNES (ajouté provisoirement) =====
        aoa.push([...header]);
        headerRows.push(currentRow);
        currentRow++;

        // ===== TRAITEMENT DES ÉTUDIANTS =====
        for (const session of groupSessions.sort((a,b) => new Date(a.date) - new Date(b.date))) {
          for (const p of session.presences) {
            // Filtrer selon le statut
            if (statusFilter === 'absent' && p.present) continue;
            if (statusFilter === 'retard' && (!p.present || (p.retardMinutes || 0) === 0)) continue;
            if (statusFilter === 'absent_retard' && (p.present && (p.retardMinutes || 0) === 0)) continue;

            studentsAddedCount++; // 🆕 Incrémenter le compteur

            // ===== RÉCUPÉRER LES STATISTIQUES =====
            const stats = await calculateStudentStats(p.etudiant?._id);
            
            // ===== RÉCUPÉRER LES INFOS COMPLÈTES DE L'ÉTUDIANT =====
            const token = localStorage.getItem('token');
            let telMere = '—';
            let telPere = '—';
            
            try {
              const etudiantResponse = await axios.get(`/api/etudiants/${p.etudiant?._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              telMere = etudiantResponse.data.telephoneMere || '—';
              telPere = etudiantResponse.data.telephonePere || '—';
            } catch (error) {
              console.error('Erreur récupération étudiant:', error);
            }

            aoa.push([
              p.etudiant?.nomComplet || 'N/A',
              p.present ? ((p.retardMinutes || 0) > 0 ? 'En retard' : 'Présent') : 'Absent',
              p.retardMinutes || 0,
              stats.nbAbsences,
              stats.nbRetards,
              telMere,
              telPere,
              p.remarque || ''
            ]);
            currentRow++;
          }
        }

        // 🆕 Si aucun étudiant n'a été ajouté, remplacer le header par le message
        if (studentsAddedCount === 0) {
          // Supprimer le header
          aoa.splice(headerRowIndex, 1);
          headerRows.pop(); // Retirer de la liste des headers
          currentRow--;

          // Ajouter le message "Aucune absence"
          aoa.splice(headerRowIndex, 0, [getEmptyMessage(), ...Array(colsCount - 1).fill('')]);
          emptyMessageRows.push(headerRowIndex);
          merges.push({ s: { r: headerRowIndex, c: 0 }, e: { r: headerRowIndex, c: colsCount - 1 } });
          currentRow++;
        }

        aoa.push(Array(colsCount).fill(''));
        currentRow++;
      }
    }

    // ===== CRÉATION DU FICHIER EXCEL =====
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    
    // ===== STYLES OPTIMISÉS =====
    const titleStyle = {
      font: { bold: true, sz: 14, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { bottom: { style: "medium", color: { rgb: "000000" } } }
    };

    const classStyle = {
      font: { bold: true, sz: 12, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "F5F5F5" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "000000" } } }
    };

    const subTitleStyle = {
      font: { bold: true, sz: 10, color: { rgb: "000000" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const headerStyle = {
      font: { bold: true, sz: 10, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    };

    const dataStyle = {
      font: { sz: 9 },
      alignment: { vertical: "center" },
      border: {
        top: { style: "hair", color: { rgb: "DDDDDD" } },
        bottom: { style: "hair", color: { rgb: "DDDDDD" } },
        left: { style: "hair", color: { rgb: "DDDDDD" } },
        right: { style: "hair", color: { rgb: "DDDDDD" } }
      }
    };

    // 🆕 Style pour les messages "Aucune absence"
    const emptyMessageStyle = {
      font: { italic: true, sz: 10, color: { rgb: "666666" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "F9F9F9" } }
    };

    // ===== APPLICATION DES STYLES =====
    for (let rowIndex = 0; rowIndex < aoa.length; rowIndex++) {
      for (let colIndex = 0; colIndex < colsCount; colIndex++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: '' };
        }
        
        if (titleRows.includes(rowIndex)) {
          ws[cellAddress].s = titleStyle;
        } else if (classRows.includes(rowIndex)) {
          ws[cellAddress].s = classStyle;
        } else if (subTitleRows.includes(rowIndex)) {
          ws[cellAddress].s = subTitleStyle;
        } else if (emptyMessageRows.includes(rowIndex)) { // 🆕 Style pour "Aucune absence"
          ws[cellAddress].s = emptyMessageStyle;
        } else if (headerRows.includes(rowIndex)) {
          ws[cellAddress].s = headerStyle;
        } else if (aoa[rowIndex][0] && aoa[rowIndex][0] !== '') {
          ws[cellAddress].s = dataStyle;
        }
      }
    }

    ws['!merges'] = merges;
    ws['!cols'] = colWidths;
    ws['!rows'] = [{ hpx: 24 }];
    ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
    ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Présences Jour');

    const statusSuffix = statusFilter !== 'all' ? `_${statusFilter}` : '';
    const filename = `presences_${formatDate(date).replace(/\//g, '-')}_optimise${statusSuffix}`;
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    alert('Erreur lors de l\'export. Voir la console pour plus de détails.');
  }
};
// Export présences par mois avec toutes les classes dans une seule page
// Export présences par mois avec toutes les classes dans une seule page - VERSION STYLÉE
const exportMonthlyPresences = (month, year, statusFilter = 'all') => {
  const monthSessions = filteredSessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate.getMonth() + 1 === parseInt(month) && 
           sessionDate.getFullYear() === parseInt(year);
  });

  if (monthSessions.length === 0) {
    alert('Aucune donnée trouvée pour ce mois');
    return;
  }

  // Grouper par classe
  const sessionsByClass = {};
  monthSessions.forEach(session => {
    if (!sessionsByClass[session.cours]) {
      sessionsByClass[session.cours] = [];
    }
    sessionsByClass[session.cours].push(session);
  });

  const header = [
    'Date', 'Matière', 'Professeur', 'Période', 'Heure', 
    'Étudiant', 'Statut', 'Retard (min)', 'Remarque', 
    'Total Étudiants', 'Taux Présence'
  ];
  const colWidths = [
    { wch: 11 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
    { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 40 },
    { wch: 15 }, { wch: 15 }
  ];

  const aoa = [];
  const merges = [];
  const colsCount = header.length;

  // Titre principal
  const monthName = new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long' });
  const statusSuffix = statusFilter === 'absent' ? ' - ABSENTS SEULEMENT' : 
                      statusFilter === 'retard' ? ' - RETARDS SEULEMENT' : '';
  const bigTitle = `PRÉSENCES MENSUELLES - ${monthName.toUpperCase()} ${year}${statusSuffix}`;
  
  aoa.push([bigTitle, ...Array(colsCount - 1).fill('')]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colsCount - 1 } });
  aoa.push(Array(colsCount).fill(''));

  let currentRow = aoa.length;
  const titleRows = [0];
  const classRows = [];
  const headerRows = [];

  Object.entries(sessionsByClass)
    .sort(([a],[b]) => a.localeCompare(b,'fr'))
    .forEach(([className, sessions], classIdx, classArr) => {
      // Ajouter un séparateur de classe (sauf pour la première)
      if (classIdx > 0) {
        aoa.push(Array(colsCount).fill(''));
        currentRow++;
      }

      // Ajouter l'en-tête de classe
      aoa.push([`CLASSE: ${className}`, ...Array(colsCount - 1).fill('')]);
      classRows.push(currentRow);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colsCount - 1 } });
      currentRow++;

      // Ajouter l'en-tête des colonnes
      aoa.push([...header]);
      headerRows.push(currentRow);
      currentRow++;

      // Trier les sessions par date
      sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Ajouter les données de la classe avec filtre de statut
      sessions.forEach(session => {
        session.presences.forEach(p => {
          let includeStudent = true;
          if (statusFilter === 'absent' && p.present) {
            includeStudent = false;
          } else if (statusFilter === 'retard' && (!p.present || p.retardMinutes === 0)) {
            includeStudent = false;
          }
          if (includeStudent) {
            aoa.push([
              formatDate(session.date),
              session.matiere || 'N/A',
              session.nomProfesseur || 'N/A',
              session.presences[0]?.periode || 'N/A',
              session.presences[0]?.heure || 'N/A',
              p.etudiant?.nomComplet || 'N/A',
              p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent',
              p.retardMinutes || 0,
              p.remarque || '',
              session.totalCount,
              `${session.attendanceRate}%`
            ]);
            currentRow++;
          }
        });
      });
    });

  // Création de la feuille avec styles
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Styles
  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const classStyle = {
    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "333333" } },
    alignment: { horizontal: "left", vertical: "center" }
  };

  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "FFFFFF" } },
      bottom: { style: "thin", color: { rgb: "FFFFFF" } },
      left: { style: "thin", color: { rgb: "FFFFFF" } },
      right: { style: "thin", color: { rgb: "FFFFFF" } }
    }
  };

  const dataStyle = {
    font: { sz: 10 },
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } }
    }
  };

  // Application des styles
  for (let rowIndex = 0; rowIndex < aoa.length; rowIndex++) {
    for (let colIndex = 0; colIndex < colsCount; colIndex++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      
      if (!ws[cellAddress]) {
        ws[cellAddress] = { t: 's', v: '' };
      }
      
      if (titleRows.includes(rowIndex)) {
        ws[cellAddress].s = titleStyle;
      } else if (classRows.includes(rowIndex)) {
        ws[cellAddress].s = classStyle;
      } else if (headerRows.includes(rowIndex)) {
        ws[cellAddress].s = headerStyle;
      } else if (aoa[rowIndex][0] && aoa[rowIndex][0] !== '') {
        ws[cellAddress].s = dataStyle;
      }
    }
  }

  ws['!merges'] = merges;
  ws['!cols'] = colWidths;
  ws['!rows'] = [{ hpx: 28 }];
  ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Présences par Classe');

  const statusSuffixFile = statusFilter === 'absent' ? '_absents' : 
                        statusFilter === 'retard' ? '_retards' : 
                        statusFilter === 'absent_retard' ? '_absents_retards' : '';  // ← AJOUTER CETTE PARTIE
const filename = `presences_${monthName}_${year}${statusSuffixFile}`;
XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Export présences par mois avec résumé général et détails - VERSION STYLÉE
const exportMonthlyPresencesWithSummary = (month, year) => {
  const monthSessions = filteredSessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate.getMonth() + 1 === parseInt(month) && 
           sessionDate.getFullYear() === parseInt(year);
  });

  if (monthSessions.length === 0) {
    alert('Aucune donnée trouvée pour ce mois');
    return;
  }

  // Grouper par classe
  const sessionsByClass = {};
  monthSessions.forEach(session => {
    if (!sessionsByClass[session.cours]) {
      sessionsByClass[session.cours] = [];
    }
    sessionsByClass[session.cours].push(session);
  });

  const colsCount = 9;
  const colWidths = [
    { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 40 }
  ];

  const aoa = [];
  const merges = [];
  
  // Titre principal
  const monthName = new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long' });
  aoa.push([`RAPPORT MENSUEL - ${monthName.toUpperCase()} ${year}`, ...Array(colsCount - 1).fill('')]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colsCount - 1 } });
  aoa.push(Array(colsCount).fill(''));

  let currentRow = aoa.length;
  const titleRows = [0];
  const sectionRows = [];
  const headerRows = [];
  const classRows = [];

  // Section RÉSUMÉ GÉNÉRAL
  aoa.push(['RÉSUMÉ GÉNÉRAL', ...Array(colsCount - 1).fill('')]);
  sectionRows.push(currentRow);
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colsCount - 1 } });
  currentRow++;

  // En-tête du résumé
  const summaryHeaders = ['Classe', 'Nb Sessions', 'Moy. Étudiants', 'Total Présences', 'Total Absences', 'Total Retards', 'Taux Moyen Présence', '', ''];
  aoa.push(summaryHeaders);
  headerRows.push(currentRow);
  currentRow++;

  // Données du résumé
  Object.entries(sessionsByClass).forEach(([className, sessions]) => {
    const totalSessions = sessions.length;
    const totalStudents = sessions.reduce((sum, s) => sum + s.totalCount, 0);
    const totalPresents = sessions.reduce((sum, s) => sum + s.presentCount, 0);
    const totalRetards = sessions.reduce((sum, s) => sum + s.retardCount, 0);
    const avgAttendance = totalStudents > 0 ? Math.round((totalPresents / totalStudents) * 100) : 0;

    aoa.push([
      className,
      totalSessions,
      Math.round(totalStudents / totalSessions),
      totalPresents,
      totalStudents - totalPresents,
      totalRetards,
      `${avgAttendance}%`,
      '',
      ''
    ]);
    currentRow++;
  });

  // Espaces entre résumé et détails
  aoa.push(Array(colsCount).fill(''));
  currentRow++;

  // Section DÉTAILS PAR CLASSE
  aoa.push(['DÉTAILS PAR CLASSE', ...Array(colsCount - 1).fill('')]);
  sectionRows.push(currentRow);
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colsCount - 1 } });
  currentRow++;

  const detailHeaders = ['Date', 'Matière', 'Professeur', 'Période', 'Heure', 'Étudiant', 'Statut', 'Retard (min)', 'Remarque'];

  Object.entries(sessionsByClass)
    .sort(([a],[b]) => a.localeCompare(b,'fr'))
    .forEach(([className, sessions], classIdx) => {
      // Espacement بين classes
      if (classIdx > 0) {
        aoa.push(Array(colsCount).fill(''));
        currentRow++;
      }

      // En-tête de classe
      aoa.push([`CLASSE: ${className}`, ...Array(colsCount - 1).fill('')]);
      classRows.push(currentRow);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colsCount - 1 } });
      currentRow++;

      // En-tête des colonnes pour les détails
      aoa.push([...detailHeaders]);
      headerRows.push(currentRow);
      currentRow++;

      // Trier par date
      sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Données détaillées de la classe
      sessions.forEach(session => {
        session.presences.forEach(p => {
          aoa.push([
            formatDate(session.date),
            session.matiere || 'N/A',
            session.nomProfesseur || 'N/A',
            session.presences[0]?.periode || 'N/A',
            session.presences[0]?.heure || 'N/A',
            p.etudiant?.nomComplet || 'N/A',
            p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent',
            p.retardMinutes || 0,
            p.remarque || ''
          ]);
          currentRow++;
        });
      });
    });

  // Création de la feuille avec styles
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Styles
  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const classStyle = {
    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "333333" } },
    alignment: { horizontal: "left", vertical: "center" }
  };

  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "FFFFFF" } },
      bottom: { style: "thin", color: { rgb: "FFFFFF" } },
      left: { style: "thin", color: { rgb: "FFFFFF" } },
      right: { style: "thin", color: { rgb: "FFFFFF" } }
    }
  };

  const dataStyle = {
    font: { sz: 10 },
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } }
    }
  };

  // Application des styles
  for (let rowIndex = 0; rowIndex < aoa.length; rowIndex++) {
    for (let colIndex = 0; colIndex < colsCount; colIndex++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      
      if (!ws[cellAddress]) {
        ws[cellAddress] = { t: 's', v: '' };
      }
      
      if (titleRows.includes(rowIndex)) {
        ws[cellAddress].s = titleStyle;
      } else if (classRows.includes(rowIndex)) {
        ws[cellAddress].s = classStyle;
      } else if (headerRows.includes(rowIndex)) {
        ws[cellAddress].s = headerStyle;
      } else if (aoa[rowIndex][0] && aoa[rowIndex][0] !== '') {
        ws[cellAddress].s = dataStyle;
      }
    }
  }

  ws['!merges'] = merges;
  ws['!cols'] = colWidths;
  ws['!rows'] = [{ hpx: 28 }];
  ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rapport Mensuel');

  const filename = `presences_${monthName}_${year}_rapport_complet`;
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Export par professeur - VERSION STYLÉE
const exportByProfessor = (professorName) => {
  const professorSessions = filteredSessions.filter(session => 
    session.nomProfesseur === professorName
  );

  if (professorSessions.length === 0) {
    alert('Aucune donnée trouvée pour ce professeur');
    return;
  }

  const header = ['Date', 'Classe', 'Matière', 'Étudiant', 'Statut', 'Retard (min)', 'Remarque'];
  const colWidths = [
    { wch: 11 }, { wch: 18 }, { wch: 16 }, { wch: 28 }, 
    { wch: 12 }, { wch: 12 }, { wch: 40 }
  ];
  const colsCount = header.length;

  const aoa = [];
  const merges = [];

  // Titre
  aoa.push([`PRÉSENCES DE ${professorName}`, ...Array(colsCount - 1).fill('')]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colsCount - 1 } });
  aoa.push(Array(colsCount).fill(''));

  // Header
  aoa.push([...header]);

  let currentRow = aoa.length;

  // Données
  professorSessions.forEach(session => {
    session.presences.forEach(p => {
      aoa.push([
        formatDate(session.date),
        session.cours,
        session.matiere || 'N/A',
        p.etudiant?.nomComplet || 'N/A',
        p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent',
        p.retardMinutes || 0,
        p.remarque || ''
      ]);
      currentRow++;
    });
  });

  // Création de la feuille avec styles
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "FFFFFF" } },
      bottom: { style: "thin", color: { rgb: "FFFFFF" } },
      left: { style: "thin", color: { rgb: "FFFFFF" } },
      right: { style: "thin", color: { rgb: "FFFFFF" } }
    }
  };

  const dataStyle = {
    font: { sz: 10 },
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } }
    }
  };

  // Application des styles
  for (let rowIndex = 0; rowIndex < aoa.length; rowIndex++) {
    for (let colIndex = 0; colIndex < colsCount; colIndex++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      
      if (!ws[cellAddress]) {
        ws[cellAddress] = { t: 's', v: '' };
      }
      
      if (rowIndex === 0) { // Titre
        ws[cellAddress].s = titleStyle;
      } else if (rowIndex === 2) { // Header
        ws[cellAddress].s = headerStyle;
      } else if (aoa[rowIndex][0] && aoa[rowIndex][0] !== '') {
        ws[cellAddress].s = dataStyle;
      }
    }
  }

  ws['!merges'] = merges;
  ws['!cols'] = colWidths;
  ws['!rows'] = [{ hpx: 28 }];
  ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Présences ${professorName}`);

  const filename = `presences_${professorName.replace(/\s+/g, '_')}`;
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
          padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      marginBottom: '24px'
    },
    header: {
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
  
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#111827',
      margin: 0
    },
    subtitle: {
      color: '#6b7280',
      margin: '4px 0 0 0',
      fontSize: '14px'
    },
    searchContainer: {
      padding: '24px',
      borderBottom: '1px solid #e5e7eb'
    },
    searchBar: {
      position: 'relative',
      marginBottom: '16px'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 44px',
      fontSize: '14px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af'
    },
    filtersToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: '#f3f4f6',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      transition: 'all 0.2s'
    },
    advancedFilters: {
      marginTop: '16px',
      padding: '20px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    },
    filtersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '16px'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    filterLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    filterInput: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      transition: 'border-color 0.2s'
    },
    filterSelect: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
      backgroundPosition: 'right 8px center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '16px',
      paddingRight: '32px'
    },
    clearButton: {
      padding: '8px 16px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      backgroundColor: 'transparent',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    resultsCount: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '16px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    },
    tableHeader: {
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb'
    },
    th: {
      padding: '12px 24px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    td: {
      padding: '16px 24px',
      borderBottom: '1px solid #f3f4f6',
      verticalAlign: 'middle'
    },
    tableRow: {
      transition: 'background-color 0.2s',
      cursor: 'pointer'
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#2563eb',
      backgroundColor: '#eff6ff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    progressContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    progressBar: {
      width: '100px',
      height: '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'hidden'
    },
    modalHeader: {
      padding: '24px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    modalBody: {
      padding: '24px',
      overflowY: 'auto',
      maxHeight: 'calc(90vh - 120px)'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid'
    },
    statCardGreen: {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      color: '#166534'
    },
    statCardRed: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      color: '#991b1b'
    },
    statCardBlue: {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      color: '#1e40af'
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      border: '1px solid'
    },
    badgeGreen: {
      backgroundColor: '#f0fdf4',
      color: '#166534',
      borderColor: '#bbf7d0'
    },
    badgeRed: {
      backgroundColor: '#fef2f2',
      color: '#991b1b',
      borderColor: '#fecaca'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      gap: '16px'
    },
    spinner: {
      width: '48px',
      height: '48px',
      border: '4px solid #e5e7eb',
      borderTop: '4px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: '#6b7280'
    },
    closeButton: {
      padding: '8px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      color: '#6b7280',
      transition: 'background-color 0.2s'
    },
    mobileCard: {
      padding: '16px',
      borderBottom: '1px solid #f3f4f6'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Chargement des présences...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .table-row:hover {
            background-color: #f9fafb;
          }
          
          .button:hover {
            background-color: #dbeafe;
          }
          
          .close-button:hover {
            background-color: #f3f4f6;
          }
          
          .search-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          
          .filters-toggle:hover {
            background-color: #e5e7eb;
          }
          
          .filter-input:focus, .filter-select:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }
          
          .clear-button:hover {
            background-color: #f3f4f6;
            border-color: #9ca3af;
            color: #374151;
          }
          
          @media (max-width: 768px) {
            .desktop-table {
              display: none;
            }
            .filters-grid {
              grid-template-columns: 1fr;
            }
          }
          
          @media (min-width: 769px) {
            .mobile-cards {
              display: none;
            }
          }
        `}
      </style>

      <div style={styles.maxWidth}>
            <Sidebar onLogout={handleLogout} />
        
        {/* Header */}
      
<div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '12px', textAlign: 'center' }}>
            <div style={styles.iconContainer}>
            </div>
            <div>
              <h1 style={{ ...styles.title, textAlign: 'center', width: '100%' }}>Liste des Présences</h1>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div style={styles.searchContainer}>
            {/* Barre de recherche principale */}
            <div style={styles.searchBar}>
              <Search size={20} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Rechercher par classe, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
                className="search-input"
              />
            </div>

            {/* Toggle filtres avancés */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                style={styles.filtersToggle}
                className="filters-toggle"
              >
                <Filter size={16} />
                Filtres avancés
                <ChevronDown 
                  size={16} 
                  style={{ 
                    transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} 
                />
              </button>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {(searchTerm || dateFilter || coursFilter || presenceRateFilter || moisScolaireFilter || dateFrom || dateTo || matiereFilter || periodeFilter || professeurFilter) && (
                  <button
                    onClick={clearFilters}
                    style={styles.clearButton}
                    className="clear-button"
                  >
                    Effacer les filtres
                  </button>
                )}
                
                <button
                  onClick={() => setShowExportModal(true)}
                  style={{
                    ...styles.button,
                    backgroundColor: '#059669',
                    color: 'white',
                    gap: '8px'
                  }}
                >
                  <Download size={16} />
                  Exporter Excel
                </button>
              </div>
            </div>

            {/* Filtres avancés */}
            {showAdvancedFilters && (
              <div style={styles.advancedFilters}>
                <div style={styles.filtersGrid} className="filters-grid">
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>📅 Mois scolaire</label>
                    <select
                      value={moisScolaireFilter}
                      onChange={(e) => setMoisScolaireFilter(e.target.value)}
                      style={styles.filterSelect}
                      className="filter-select"
                    >
                      <option value="">Tous les mois</option>
                      {getMoisOptions().map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>📅 Date de début</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={styles.filterInput}
                      className="filter-input"
                    />
                  </div>

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>📅 Date de fin</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={styles.filterInput}
                      className="filter-input"
                    />
                  </div>
                  
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Date</label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      style={styles.filterInput}
                      className="filter-input"
                    />
                  </div>
                  
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Classe</label>
                    <select
                      value={coursFilter}
                      onChange={(e) => setCoursFilter(e.target.value)}
                      style={styles.filterSelect}
                      className="filter-select"
                    >
                      <option value="">Tous les classe</option>
                      {availableCours.map(cours => (
                        <option key={cours} value={cours}>{cours}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Taux de présence</label>
                    <select
                      value={presenceRateFilter}
                      onChange={(e) => setPresenceRateFilter(e.target.value)}
                      style={styles.filterSelect}
                      className="filter-select"
                    >
                      <option value="">Tous</option>
                      <option value="high">Élevé (≥80%)</option>
                      <option value="medium">Moyen (50-79%)</option>
                      <option value="low">Faible (&lt;50%)</option>
                    </select>
                  </div>

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Matière</label>
                    <select
                      value={matiereFilter}
                      onChange={(e) => setMatiereFilter(e.target.value)}
                      style={styles.filterSelect}
                      className="filter-select"
                    >
                      <option value="">Toutes les matières</option>
                      {availableMatieres.map(matiere => (
                        <option key={matiere} value={matiere}>{matiere}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Période</label>
                    <select
                      value={periodeFilter}
                      onChange={(e) => setPeriodeFilter(e.target.value)}
                      style={styles.filterSelect}
                      className="filter-select"
                    >
                      <option value="">Toutes les périodes</option>
                      {availablePeriodes.map(periode => (
                        <option key={periode} value={periode}>
                          {periode === 'matin' ? 'Matin' : periode === 'soir' ? 'Soir' : periode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Professeur</label>
                    <select
                      value={professeurFilter}
                      onChange={(e) => setProfesseurFilter(e.target.value)}
                      style={styles.filterSelect}
                      className="filter-select"
                    >
                      <option value="">Tous les professeurs</option>
                      {availableProfesseurs.map(prof => (
                        <option key={prof} value={prof}>{prof}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Compteur de résultats */}
            <div style={styles.resultsCount}>
              {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} trouvée{filteredSessions.length !== 1 ? 's' : ''}
              {filteredSessions.length !== groupedSessions.length && (
                <span> sur {groupedSessions.length} au total</span>
              )}
            </div>
          </div>
        </div>




        {/* Sessions Table */}
        {filteredSessions.length === 0 ? (
          <div style={styles.card}>
            <div style={styles.emptyState}>
              <FileText size={48} color="#9ca3af" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
                {groupedSessions.length === 0 ? 'Aucune présence trouvée' : 'Aucun résultat'}
              </h3>
              <p>
                {groupedSessions.length === 0 
                  ? 'Les données de présence apparaîtront ici une fois disponibles.'
                  : 'Essayez de modifier vos critères de recherche.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={{ padding: '24px 24px 0 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                Sessions de classe
              </h2>
            </div>
            
            {/* Desktop Table */}
            <div className="desktop-table">
              <table style={styles.table}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.th}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} />
                        Date
                      </div>
                    </th>
                    <th style={styles.th}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Book size={16} />
                        Classe
                      </div>
                    </th>
                    <th style={styles.th}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} />
                        Matière
                      </div>
                    </th>
                    <th style={styles.th}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} />
                        Période
                      </div>
                    </th>
                    <th style={styles.th}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} />
                        Professeur
                      </div>
                    </th>
                    <th style={styles.th}>Taux de présence</th>
                    <th style={styles.th}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        Retards
                      </div>
                    </th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session, idx) => (
                    <tr key={idx} className="table-row" style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {formatDate(session.date)}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>{session.cours}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ color: '#6b7280' }}>
                          {session.matiere || '—'}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} color="#6b7280" />
                  <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>
  {formatHoraire(session.presences[0]?.heure, session.presences[0]?.periode)}
</span>

                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {session.nomProfesseur || '—'}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.progressContainer}>
                          <div style={styles.progressBar}>
                            <div 
                              style={{
                                ...styles.progressFill,
                                width: `${session.attendanceRate}%`,
                                backgroundColor: session.attendanceRate >= 80 ? '#10b981' : 
                                               session.attendanceRate >= 50 ? '#f59e0b' : '#ef4444'
                              }}
                            ></div>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', minWidth: 'fit-content' }}>
                            {session.presentCount}/{session.totalCount}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: '500', 
                            color: session.retardCount > 0 ? '#f59e0b' : '#6b7280' 
                          }}>
                            {session.retardCount}
                          </span>
                          {session.retardCount > 0 && (
                            <AlertCircle size={14} color="#f59e0b" />
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <button
                          className="button"
                          style={styles.button}
                          onClick={() => setSessionActive(session)}
                        >
                          <Eye size={16} />
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="mobile-cards">
              {filteredSessions.map((session, idx) => (
                <div key={idx} style={styles.mobileCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: '0 0 4px 0' }}>
                        {session.cours}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {formatDate(session.date)}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        {session.nomProfesseur || 'Professeur non spécifié'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        {session.retardCount} retard{session.retardCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      style={{
                        ...styles.button,
                        fontSize: '12px',
                        padding: '4px 8px'
                      }}
                      onClick={() => setSessionActive(session)}
                    >
                      <Eye size={12} />
                      Voir
                    </button>
                  </div>
                  <div style={styles.progressContainer}>
                    <div style={{ ...styles.progressBar, flex: 1 }}>
                      <div 
                        style={{
                          ...styles.progressFill,
                          width: `${session.attendanceRate}%`,
                          backgroundColor: session.attendanceRate >= 80 ? '#10b981' : 
                                         session.attendanceRate >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      ></div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                      {session.presentCount}/{session.totalCount} ({session.attendanceRate}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Détails */}
        {sessionActive && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, overflowY: 'auto', maxHeight: '90vh' }}>
              {/* Modal Header */}
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} color="#2563eb" />
                    {formatDate(sessionActive.date)}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Book size={16} />
                    {sessionActive.cours}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
  <Clock size={14} />
  {formatHoraire(sessionActive.presences[0]?.heure, sessionActive.presences[0]?.periode)}
</p>

                </div>
                <button
                  className="close-button"
                  style={styles.closeButton}
                  onClick={() => setSessionActive(null)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={styles.modalBody}>
                {/* Statistics Cards */}
                <div style={styles.statsGrid}>
                  <div style={{ ...styles.statCard, ...styles.statCardGreen }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Check size={20} />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Présents</span>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{sessionActive.presentCount}</p>
                  </div>
                  <div style={{ ...styles.statCard, ...styles.statCardRed }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <X size={20} />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Absents</span>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{sessionActive.totalCount - sessionActive.presentCount}</p>
                  </div>
                  <div style={{ ...styles.statCard, backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#92400e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertCircle size={20} />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Retards</span>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                      {sessionActive.presences.filter(p => p.present && p.retardMinutes > 0).length}
                    </p>
                  </div>
                  <div style={{ ...styles.statCard, ...styles.statCardBlue }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Users size={20} />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Taux de présence</span>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{sessionActive.attendanceRate}%</p>
                  </div>
                </div>

                {/* Students Table */}
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f3f4f6' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>Liste des étudiants</h4>
                  </div>
                  
                  {/* Desktop Students Table */}
                  <div className="desktop-table">
                    <table style={styles.table}>
                      <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                          <th style={{ ...styles.th, padding: '12px 16px' }}>Étudiant</th>
                          <th style={{ ...styles.th, padding: '12px 16px' }}>Statut</th>
                          <th style={{ ...styles.th, padding: '12px 16px' }}>Retard</th>
                          <th style={{ ...styles.th, padding: '12px 16px' }}>Remarque</th>
                          {userRole === 'admin' && <th style={{ ...styles.th, padding: '12px 16px' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody style={{ backgroundColor: 'white' }}>
                        {sessionActive.presences.map((p, presenceIndex) => (
                          <tr key={p._id} className="table-row">
                            <td style={{ ...styles.td, padding: '12px 16px' }}>
                              <span style={{ fontWeight: '500', color: '#111827' }}>
                                {p.etudiant?.nomComplet || '—'}
                              </span>
                            </td>
                            <td style={{ ...styles.td, padding: '12px 16px' }}>
                              {editingPresence === p._id ? (
                                <select
                                  value={editForm.present}
                                  onChange={(e) => setEditForm({...editForm, present: e.target.value === 'true'})}
                                  style={{
                                    padding: '4px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                >
                                  <option value="true">Présent</option>
                                  <option value="false">Absent</option>
                                </select>
                              ) : (
                                <span style={p.present ? { ...styles.badge, ...styles.badgeGreen } : { ...styles.badge, ...styles.badgeRed }}>
                                  {p.present ? <Check size={12} /> : <X size={12} />}
                                  {p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent'}
                                </span>
                              )}
                            </td>
                            <td style={{ ...styles.td, padding: '12px 16px' }}>
                              {editingPresence === p._id ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  value={editForm.retardMinutes}
                                  onChange={(e) => setEditForm({...editForm, retardMinutes: parseInt(e.target.value) || 0})}
                                  style={{
                                    width: '80px',
                                    padding: '4px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                />
                              ) : (
                                <span style={{ color: '#6b7280' }}>
                                  {p.retardMinutes || 0} min
                                </span>
                              )}
                            </td>
                            <td style={{ ...styles.td, padding: '12px 16px' }}>
                              {editingPresence === p._id ? (
                                <input
                                  type="text"
                                  value={editForm.remarque}
                                  onChange={(e) => setEditForm({...editForm, remarque: e.target.value})}
                                  style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                  placeholder="Remarque..."
                                />
                              ) : (
                                <span style={{ color: '#6b7280' }}>{p.remarque || '—'}</span>
                              )}
                            </td>
                            {userRole === 'admin' && (
                              <td style={{ ...styles.td, padding: '12px 16px' }}>
                                {editingPresence === p._id ? (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => handleSaveEdit(p._id, filteredSessions.findIndex(s => s === sessionActive), presenceIndex)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                    >
                                      <Save size={12} />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => handleEditPresence(p)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePresence(p._id, filteredSessions.findIndex(s => s === sessionActive), presenceIndex)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile Students Cards */}
                  <div className="mobile-cards">
                    {sessionActive.presences.map(p => (
                      <div key={p._id} style={{ padding: '16px', backgroundColor: 'white', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h5 style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0, flex: 1 }}>
                            {p.etudiant?.nomComplet || '—'}
                          </h5>
                          <span style={p.present ? { ...styles.badge, ...styles.badgeGreen } : { ...styles.badge, ...styles.badgeRed }}>
                            {p.present ? <Check size={12} /> : <X size={12} />}
                            {p.present ? 'Présent' : 'Absent'}
                          </span>
                        </div>
                        {p.remarque && (
                          <div style={{ padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#6b7280' }}>
                            <strong>Remarque:</strong> {p.remarque}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <button
                  onClick={() => setSessionActive(null)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#4b5563',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#4b5563'}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Export Excel */}
        {showExportModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  Exporter vers Excel
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={styles.closeButton}
                  className="close-button"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Export journalier */}
                  <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
                      Export par jour
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={styles.filterLabel}>Date</label>
                        <input
                          type="date"
                          id="exportDate"
                          style={styles.filterInput}
                        />
                      </div>
                      <div>
                        <label style={styles.filterLabel}>Professeur (optionnel)</label>
                        <select id="exportProfessor" style={styles.filterSelect}>
                          <option value="">Tous les professeurs</option>
                          {availableProfesseurs.map(prof => (
                            <option key={prof} value={prof}>{prof}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={styles.filterLabel}>Période</label>
                        <select id="exportPeriode" style={styles.filterSelect}>
                          <option value="all">Toutes les périodes</option>
                          <option value="matin">Matin</option>
                          <option value="soir">Soir</option>
                        </select>
                      </div>
                     <div>
  <label style={styles.filterLabel}>Étudiants à inclure</label>
  <select id="exportDailyStatus" style={styles.filterSelect}>
    <option value="all">Tous les étudiants</option>
    <option value="absent">Seulement les absents</option>
    <option value="retard">Seulement les retards</option>
    <option value="absent_retard">Absents et retards</option>  {/* ← AJOUTER CETTE LIGNE */}
  </select>
</div>
                    </div>
                    <button
                      onClick={() => {
                        const date = document.getElementById('exportDate').value;
                        const prof = document.getElementById('exportProfessor').value;
                        const status = document.getElementById('exportDailyStatus').value;
                        const periode = document.getElementById('exportPeriode').value;
                        if (date) {
                          exportDailyPresences(date, prof || null, status, periode);
                          setShowExportModal(false);
                        }
                      }}
                      style={styles.button}
                    >
                      Exporter
                    </button>
                  </div>

                  {/* Export mensuel */}
                  <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
                      Export par mois
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.filterLabel}>Mois</label>
                        <select id="exportMonth" style={styles.filterSelect}>
                          {Array.from({length: 12}, (_, i) => (
                            <option key={i+1} value={i+1}>
                              {new Date(0, i).toLocaleString('fr-FR', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.filterLabel}>Année</label>
                        <select id="exportYear" style={styles.filterSelect}>
                          {Array.from({length: 3}, (_, i) => {
                            const year = new Date().getFullYear() - 1 + i;
                            return <option key={year} value={year}>{year}</option>;
                          })}
                        </select>
                      </div>
               <div style={{ flex: 1 }}>
  <label style={styles.filterLabel}>Étudiants à inclure</label>
  <select id="exportMonthlyStatus" style={styles.filterSelect}>
    <option value="all">Tous les étudiants</option>
    <option value="absent">Seulement les absents</option>
    <option value="retard">Seulement les retards</option>
    <option value="absent_retard">Absents et retards</option>  {/* ← AJOUTER CETTE LIGNE */}
  </select>
</div>

                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => {
                          const month = document.getElementById('exportMonth').value;
                          const year = document.getElementById('exportYear').value;
                          const status = document.getElementById('exportMonthlyStatus').value;
                          exportMonthlyPresences(month, year, status);
                          setShowExportModal(false);
                        }}
                        style={styles.button}
                      >
                        Export détaillé
                      </button>
                      <button
                        onClick={() => {
                          const month = document.getElementById('exportMonth').value;
                          const year = document.getElementById('exportYear').value;
                          exportMonthlyPresencesWithSummary(month, year);
                          setShowExportModal(false);
                        }}
                        style={{
                          ...styles.button,
                          backgroundColor: '#7c3aed',
                          color: 'white'
                        }}
                      >
                        Export avec résumé
                      </button>
                    </div>
                  </div>

                  {/* Export par professeur */}
                  <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
                      Export par professeur
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.filterLabel}>Professeur</label>
                        <select id="exportProfOnly" style={styles.filterSelect}>
                          <option value="">Sélectionner un professeur</option>
                          {availableProfesseurs.map(prof => (
                            <option key={prof} value={prof}>{prof}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          const prof = document.getElementById('exportProfOnly').value;
                          if (prof) {
                            exportByProfessor(prof);
                            setShowExportModal(false);
                          }
                        }}
                        style={styles.button}
                      >
                        Exporter
                      </button>
                    </div>
                  </div>

                  {/* Export complet */}
                  <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
                      Export complet (données actuellement filtrées)
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          // Export traditionnel en une seule feuille
                          const data = [];
                          filteredSessions.forEach(session => {
                            session.presences.forEach(p => {
                              data.push({
                                'Date': formatDate(session.date),
                                'Classe': session.cours,
                                'Matière': session.matiere || 'N/A',
                                'Professeur': session.nomProfesseur || 'N/A',
                                'Étudiant': p.etudiant?.nomComplet || 'N/A',
                                'Statut': p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent',
                                'Retard (min)': p.retardMinutes || 0,
                                'Remarque': p.remarque || ''
                              });
                            });
                          });
                          exportToExcel(data, 'presences_complet');
                          setShowExportModal(false);
                        }}
                        style={{
                          ...styles.button,
                          backgroundColor: '#dc2626',
                          color: 'white'
                        }}
                      >
                        Export simple
                      </button>
                      <button
                        onClick={() => {
                          // Export avec toutes les classes organisées dans une seule page
                          const sessionsByClass = {};
                          filteredSessions.forEach(session => {
                            if (!sessionsByClass[session.cours]) {
                              sessionsByClass[session.cours] = [];
                            }
                            sessionsByClass[session.cours].push(session);
                          });

                          const allData = [];
                          let isFirstClass = true;

                          Object.entries(sessionsByClass).forEach(([className, sessions]) => {
                            // Espacement بين classes
                            if (!isFirstClass) {
                              allData.push({
                                '': '',
                                ' ': '',
                                '  ': '',
                                '   ': '',
                                '    ': '',
                                '     ': '',
                                '      ': '',
                                '       ': ''
                              });
                            }
                            // En-tête de classe
                            allData.push({
                              '': `=== CLASSE: ${className} ===`,
                              ' ': '',
                              '  ': '',
                              '   ': '',
                              '    ': '',
                              '     ': '',
                              '      ': '',
                              '       ': ''
                            });
                            // En-tête des colonnes
                            allData.push({
                              '': 'Date',
                              ' ': 'Matière',
                              '  ': 'Professeur',
                              '   ': 'Période',
                              '    ': 'Heure',
                              '     ': 'Étudiant',
                              '      ': 'Statut',
                              '       ': 'Retard (min)',
                              '        ': 'Remarque'
                            });
                            // Trier par date
                            sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
                            // Données de la classe
                            sessions.forEach(session => {
                              session.presences.forEach(p => {
                                allData.push({
                                  '': formatDate(session.date),
                                  ' ': session.matiere || 'N/A',
                                  '  ': session.nomProfesseur || 'N/A',
                                  '   ': session.presences[0]?.periode || 'N/A',
                                  '    ': session.presences[0]?.heure || 'N/A',
                                  '     ': p.etudiant?.nomComplet || 'N/A',
                                  '      ': p.present ? (p.retardMinutes > 0 ? 'En retard' : 'Présent') : 'Absent',
                                  '       ': p.retardMinutes || 0,
                                  '        ': p.remarque || ''
                                });
                              });
                            });
                            isFirstClass = false;
                          });

                          exportToExcel(allData, 'presences_complet_par_classe', 'Présences par Classe');
                          setShowExportModal(false);
                        }}
                        style={{
                          ...styles.button,
                          backgroundColor: '#7c3aed',
                          color: 'white'
                        }}
                      >
                        Export par classe
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



export default ListePresences;