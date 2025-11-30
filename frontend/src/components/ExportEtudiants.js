import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Filter, X } from 'lucide-react';
import './ExportEtudiants.css';

const ExportEtudiants = ({ etudiants, onClose }) => {
  const [filtreExport, setFiltreExport] = useState({
    niveau: '',
    genre: '',
    actif: '',
    classe: ''
  });

  const [champsSelectionnes, setChampsSelectionnes] = useState({
    nomComplet: true,
    genre: true,
    dateNaissance: true,
    age: true,
    niveau: true,
    telephoneEtudiant: true,
    codeMassar: true,
    cin: true,
    email: true,
    cours: true,
    lieuNaissance: false,
    nationalite: false,
    nomCompletPere: false,
    nomCompletMere: false,
    travailPere: false,
    travailMere: false,
    telephonePere: false,
    telephoneMere: false,
    adresse: false,
    transport: false,
    actif: true,
    prixTotal: false,
    paye: false,
    pourcentageBourse: false,
    typePaiement: false,
    anneeScolaire: true
  });

  const calculerAge = (dateNaissance) => {
    const dob = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const annee = date.getFullYear();
    return `${jour}-${mois}-${annee}`;
  };

  const filtrerEtudiants = () => {
    let resultats = [...etudiants];

    if (filtreExport.niveau) {
      resultats = resultats.filter(e => e.niveau === filtreExport.niveau);
    }
    if (filtreExport.genre) {
      resultats = resultats.filter(e => e.genre === filtreExport.genre);
    }
    if (filtreExport.actif !== '') {
      resultats = resultats.filter(e => e.actif === (filtreExport.actif === 'true'));
    }
    if (filtreExport.classe) {
      resultats = resultats.filter(e => 
        e.cours && e.cours.some(c => c.toLowerCase().includes(filtreExport.classe.toLowerCase()))
      );
    }

    return resultats;
  };

  const handleToggleChamp = (champ) => {
    setChampsSelectionnes({
      ...champsSelectionnes,
      [champ]: !champsSelectionnes[champ]
    });
  };

  const handleSelectAll = () => {
    const newState = {};
    Object.keys(champsSelectionnes).forEach(key => {
      newState[key] = true;
    });
    setChampsSelectionnes(newState);
  };

  const handleDeselectAll = () => {
    const newState = {};
    Object.keys(champsSelectionnes).forEach(key => {
      newState[key] = false;
    });
    setChampsSelectionnes(newState);
  };

  const exporterExcel = () => {
    const etudiantsFiltres = filtrerEtudiants();
    
    if (etudiantsFiltres.length === 0) {
      alert('Aucun étudiant à exporter avec les filtres sélectionnés');
      return;
    }

    // Préparer les données pour l'export
    const donnees = etudiantsFiltres.map(etudiant => {
      const ligne = {};
      
      if (champsSelectionnes.nomComplet) ligne['Nom Complet'] = etudiant.nomComplet || '';
      if (champsSelectionnes.genre) ligne['Genre'] = etudiant.genre || '';
      if (champsSelectionnes.dateNaissance) ligne['Date de Naissance'] = formatDate(etudiant.dateNaissance);
      if (champsSelectionnes.age) ligne['Âge'] = calculerAge(etudiant.dateNaissance);
      if (champsSelectionnes.lieuNaissance) ligne['Lieu de Naissance'] = etudiant.lieuNaissance || '';
      if (champsSelectionnes.nationalite) ligne['Nationalité'] = etudiant.nationalite || '';
      if (champsSelectionnes.niveau) ligne['Niveau'] = etudiant.niveau || '';
      if (champsSelectionnes.telephoneEtudiant) ligne['Téléphone Étudiant'] = etudiant.telephoneEtudiant || '';
      if (champsSelectionnes.codeMassar) ligne['Code Massar'] = etudiant.codeMassar || '';
      if (champsSelectionnes.cin) ligne['CIN'] = etudiant.cin || '';
      if (champsSelectionnes.email) ligne['Email'] = etudiant.email || '';
      if (champsSelectionnes.cours) ligne['Classes'] = (Array.isArray(etudiant.cours) ? etudiant.cours.join(', ') : '');
      if (champsSelectionnes.nomCompletPere) ligne['Nom du Père'] = etudiant.nomCompletPere || '';
      if (champsSelectionnes.nomCompletMere) ligne['Nom de la Mère'] = etudiant.nomCompletMere || '';
      if (champsSelectionnes.travailPere) ligne['Travail du Père'] = etudiant.travailPere || '';
      if (champsSelectionnes.travailMere) ligne['Travail de la Mère'] = etudiant.travailMere || '';
      if (champsSelectionnes.telephonePere) ligne['Téléphone Père'] = etudiant.telephonePere || '';
      if (champsSelectionnes.telephoneMere) ligne['Téléphone Mère'] = etudiant.telephoneMere || '';
      if (champsSelectionnes.adresse) ligne['Adresse'] = etudiant.adresse || '';
      if (champsSelectionnes.transport) ligne['Transport'] = etudiant.transport ? 'Oui' : 'Non';
      if (champsSelectionnes.actif) ligne['Statut'] = etudiant.actif ? 'Actif' : 'Inactif';
      if (champsSelectionnes.prixTotal) ligne['Prix Total'] = etudiant.prixTotal || 0;
      if (champsSelectionnes.paye) ligne['Payé'] = etudiant.paye ? 'Oui' : 'Non';
      if (champsSelectionnes.pourcentageBourse) ligne['Bourse (%)'] = etudiant.pourcentageBourse || 0;
      if (champsSelectionnes.typePaiement) ligne['Type Paiement'] = etudiant.typePaiement || '';
      if (champsSelectionnes.anneeScolaire) ligne['Année Scolaire'] = etudiant.anneeScolaire || '';

      return ligne;
    });

    // Créer le fichier Excel
    const ws = XLSX.utils.json_to_sheet(donnees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Étudiants');

    // Ajuster la largeur des colonnes
    const colWidths = Object.keys(donnees[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    // Générer le nom du fichier avec la date
    const date = new Date();
    const nomFichier = `Etudiants_${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.xlsx`;

    // Télécharger le fichier
    XLSX.writeFile(wb, nomFichier);

    alert(`✅ ${etudiantsFiltres.length} étudiant(s) exporté(s) avec succès!`);
  };

  const niveauxDisponibles = [...new Set(etudiants.map(e => e.niveau))].filter(Boolean);
  const classesDisponibles = [...new Set(etudiants.flatMap(e => e.cours || []))];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FileSpreadsheet size={24} className="inline mr-2" />
            Exporter les étudiants vers Excel
          </h3>
          <button className="btn-fermer-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="export-content">
          {/* Section Filtres */}
          <div className="export-section">
            <h4>
              <Filter size={18} className="inline mr-2" />
              Filtres d'export
            </h4>
            <div className="filtres-export-grid">
              <div className="filtre-item">
                <label>Niveau:</label>
                <select
                  value={filtreExport.niveau}
                  onChange={(e) => setFiltreExport({ ...filtreExport, niveau: e.target.value })}
                >
                  <option value="">Tous les niveaux</option>
                  {niveauxDisponibles.map(niveau => (
                    <option key={niveau} value={niveau}>{niveau}</option>
                  ))}
                </select>
              </div>

              <div className="filtre-item">
                <label>Genre:</label>
                <select
                  value={filtreExport.genre}
                  onChange={(e) => setFiltreExport({ ...filtreExport, genre: e.target.value })}
                >
                  <option value="">Tous</option>
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                </select>
              </div>

              <div className="filtre-item">
                <label>Statut:</label>
                <select
                  value={filtreExport.actif}
                  onChange={(e) => setFiltreExport({ ...filtreExport, actif: e.target.value })}
                >
                  <option value="">Tous</option>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>

              <div className="filtre-item">
                <label>Classe:</label>
                <select
                  value={filtreExport.classe}
                  onChange={(e) => setFiltreExport({ ...filtreExport, classe: e.target.value })}
                >
                  <option value="">Toutes les classes</option>
                  {classesDisponibles.map(classe => (
                    <option key={classe} value={classe}>{classe}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="info-filtres">
              {filtrerEtudiants().length} étudiant(s) seront exporté(s)
            </div>
          </div>

          {/* Section Sélection des champs */}
          <div className="export-section">
            <div className="section-header">
              <h4>Champs à exporter</h4>
              <div className="selection-buttons">
                <button onClick={handleSelectAll} className="btn-selection">
                  Tout sélectionner
                </button>
                <button onClick={handleDeselectAll} className="btn-selection">
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="champs-grid">
              <h5>📋 Informations de base</h5>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.nomComplet}
                  onChange={() => handleToggleChamp('nomComplet')}
                />
                <span>Nom Complet</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.genre}
                  onChange={() => handleToggleChamp('genre')}
                />
                <span>Genre</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.dateNaissance}
                  onChange={() => handleToggleChamp('dateNaissance')}
                />
                <span>Date de Naissance</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.age}
                  onChange={() => handleToggleChamp('age')}
                />
                <span>Âge</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.lieuNaissance}
                  onChange={() => handleToggleChamp('lieuNaissance')}
                />
                <span>Lieu de Naissance</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.nationalite}
                  onChange={() => handleToggleChamp('nationalite')}
                />
                <span>Nationalité</span>
              </label>

              <h5>🎓 Informations académiques</h5>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.niveau}
                  onChange={() => handleToggleChamp('niveau')}
                />
                <span>Niveau</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.cours}
                  onChange={() => handleToggleChamp('cours')}
                />
                <span>Classes</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.codeMassar}
                  onChange={() => handleToggleChamp('codeMassar')}
                />
                <span>Code Massar</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.cin}
                  onChange={() => handleToggleChamp('cin')}
                />
                <span>CIN</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.anneeScolaire}
                  onChange={() => handleToggleChamp('anneeScolaire')}
                />
                <span>Année Scolaire</span>
              </label>

              <h5>📞 Contact</h5>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.telephoneEtudiant}
                  onChange={() => handleToggleChamp('telephoneEtudiant')}
                />
                <span>Téléphone Étudiant</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.email}
                  onChange={() => handleToggleChamp('email')}
                />
                <span>Email</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.adresse}
                  onChange={() => handleToggleChamp('adresse')}
                />
                <span>Adresse</span>
              </label>

              <h5>👨‍👩‍👧‍👦 Informations parents</h5>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.nomCompletPere}
                  onChange={() => handleToggleChamp('nomCompletPere')}
                />
                <span>Nom du Père</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.nomCompletMere}
                  onChange={() => handleToggleChamp('nomCompletMere')}
                />
                <span>Nom de la Mère</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.travailPere}
                  onChange={() => handleToggleChamp('travailPere')}
                />
                <span>Travail du Père</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.travailMere}
                  onChange={() => handleToggleChamp('travailMere')}
                />
                <span>Travail de la Mère</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.telephonePere}
                  onChange={() => handleToggleChamp('telephonePere')}
                />
                <span>Téléphone Père</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.telephoneMere}
                  onChange={() => handleToggleChamp('telephoneMere')}
                />
                <span>Téléphone Mère</span>
              </label>

              <h5>💰 Informations financières</h5>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.prixTotal}
                  onChange={() => handleToggleChamp('prixTotal')}
                />
                <span>Prix Total</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.paye}
                  onChange={() => handleToggleChamp('paye')}
                />
                <span>Statut Paiement</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.pourcentageBourse}
                  onChange={() => handleToggleChamp('pourcentageBourse')}
                />
                <span>Pourcentage Bourse</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.typePaiement}
                  onChange={() => handleToggleChamp('typePaiement')}
                />
                <span>Type Paiement</span>
              </label>

              <h5>⚙️ Autres</h5>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.transport}
                  onChange={() => handleToggleChamp('transport')}
                />
                <span>Transport Scolaire</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.actif}
                  onChange={() => handleToggleChamp('actif')}
                />
                <span>Statut (Actif/Inactif)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-annuler">
            Annuler
          </button>
          <button onClick={exporterExcel} className="btn-exporter">
            <Download size={18} className="inline mr-2" />
            Exporter vers Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportEtudiants;