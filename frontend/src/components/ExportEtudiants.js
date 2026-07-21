import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { Download, FileSpreadsheet, Filter, X, Loader2 } from 'lucide-react';
import './ExportEtudiants.css';

// Définition centralisée de toutes les colonnes exportables (ordre + libellé + largeur)
const COLONNES = [
  { key: 'image', header: 'Photo', width: 14, isImage: true },
  { key: 'nomComplet', header: 'Nom Complet', width: 25 },
  { key: 'genre', header: 'Genre', width: 12 },
  { key: 'dateNaissance', header: 'Date de Naissance', width: 18 },
  { key: 'age', header: 'Âge', width: 8 },
  { key: 'lieuNaissance', header: 'Lieu de Naissance', width: 20 },
  { key: 'nationalite', header: 'Nationalité', width: 18 },
  { key: 'niveau', header: 'Niveau', width: 15 },
  { key: 'cours', header: 'Classes', width: 25 },
  { key: 'codeMassar', header: 'Code Massar', width: 15 },
  { key: 'cin', header: 'CIN', width: 15 },
  { key: 'anneeScolaire', header: 'Année Scolaire', width: 15 },
  { key: 'telephoneEtudiant', header: 'Téléphone Étudiant', width: 18 },
  { key: 'email', header: 'Email', width: 25 },
  { key: 'adresse', header: 'Adresse', width: 30 },
  { key: 'nomCompletPere', header: 'Nom du Père', width: 22 },
  { key: 'nomCompletMere', header: 'Nom de la Mère', width: 22 },
  { key: 'travailPere', header: 'Travail du Père', width: 20 },
  { key: 'travailMere', header: 'Travail de la Mère', width: 20 },
  { key: 'telephonePere', header: 'Téléphone Père', width: 18 },
  { key: 'telephoneMere', header: 'Téléphone Mère', width: 18 },
  { key: 'prixTotal', header: 'Prix Total', width: 12 },
  { key: 'paye', header: 'Payé', width: 10 },
  { key: 'pourcentageBourse', header: 'Bourse (%)', width: 12 },
  { key: 'typePaiement', header: 'Type Paiement', width: 15 },
  { key: 'transport', header: 'Transport', width: 12 },
  { key: 'actif', header: 'Statut', width: 12 },
];

const ExportEtudiants = ({ etudiants, onClose }) => {
  const [filtreExport, setFiltreExport] = useState({
    niveau: '',
    genre: '',
    actif: '',
    classe: ''
  });

  const [champsSelectionnes, setChampsSelectionnes] = useState({
    image: true,
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

  const [isExporting, setIsExporting] = useState(false);
  const [progression, setProgression] = useState('');

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

  // Retourne la valeur texte pour une colonne donnée (tout sauf 'image')
  const getValeur = (etudiant, key) => {
    switch (key) {
      case 'nomComplet': return etudiant.nomComplet || '';
      case 'genre': return etudiant.genre || '';
      case 'dateNaissance': return formatDate(etudiant.dateNaissance);
      case 'age': return calculerAge(etudiant.dateNaissance);
      case 'lieuNaissance': return etudiant.lieuNaissance || '';
      case 'nationalite': return etudiant.nationalite || '';
      case 'niveau': return etudiant.niveau || '';
      case 'cours': return Array.isArray(etudiant.cours) ? etudiant.cours.join(', ') : '';
      case 'codeMassar': return etudiant.codeMassar || '';
      case 'cin': return etudiant.cin || '';
      case 'anneeScolaire': return etudiant.anneeScolaire || '';
      case 'telephoneEtudiant': return etudiant.telephoneEtudiant || '';
      case 'email': return etudiant.email || '';
      case 'adresse': return etudiant.adresse || '';
      case 'nomCompletPere': return etudiant.nomCompletPere || '';
      case 'nomCompletMere': return etudiant.nomCompletMere || '';
      case 'travailPere': return etudiant.travailPere || '';
      case 'travailMere': return etudiant.travailMere || '';
      case 'telephonePere': return etudiant.telephonePere || '';
      case 'telephoneMere': return etudiant.telephoneMere || '';
      case 'prixTotal': return etudiant.prixTotal || 0;
      case 'paye': return etudiant.paye ? 'Oui' : 'Non';
      case 'pourcentageBourse': return etudiant.pourcentageBourse || 0;
      case 'typePaiement': return etudiant.typePaiement || '';
      case 'transport': return etudiant.transport ? 'Oui' : 'Non';
      case 'actif': return etudiant.actif ? 'Actif' : 'Inactif';
      default: return '';
    }
  };

  // ⚠️ IMPORTANT — configuration de l'origine du backend :
  //
  // Si ton backend est exposé sur un domaine/IP:port DIFFÉRENT du frontend en prod
  // (ex: le frontend est sur https://tondomaine.com mais l'API sur http://164.90.x.x:5000),
  // décommente la ligne ci-dessous et mets la vraie valeur (trouvée via l'onglet Network) :
  //
  // const API_BASE_URL_OVERRIDE = 'http://164.90.x.x:5000';
  const API_BASE_URL_OVERRIDE = null;

  // Transforme n'importe quel format de chemin stocké en base (URL absolue,
  // chemin relatif "/uploads/x.jpg", ou même chemin Windows brut "uploads\x.jpg")
  // en une URL absolue exploitable par fetch().
  const resoudreUrlImage = (cheminImage) => {
    if (!cheminImage) return null;

    // Déjà une URL absolue (http:// ou https://) -> on ne touche à rien
    if (/^https?:\/\//i.test(cheminImage)) return cheminImage;

    // Normaliser les antislashs Windows (ex: "uploads\etudiants\x.jpg") en slashs
    let chemin = cheminImage.replace(/\\/g, '/');

    // S'assurer qu'il commence par un seul "/"
    if (!chemin.startsWith('/')) chemin = '/' + chemin;

    if (API_BASE_URL_OVERRIDE) {
      return `${API_BASE_URL_OVERRIDE}${chemin}`;
    }

    // Détection automatique :
    // - En dev (localhost:3000), le backend Express tourne sur le port 5000 du même hôte.
    // - En production, on suppose que le reverse proxy (nginx) sert le frontend ET
    //   redirige /uploads vers le backend sur le MÊME domaine (pas besoin de port).
    const { protocol, hostname } = window.location;
    const estEnDev = hostname === 'localhost' || hostname === '127.0.0.1';
    const origineBackend = estEnDev ? `${protocol}//${hostname}:5000` : `${protocol}//${hostname}`;

    return `${origineBackend}${chemin}`;
  };

  // Convertit un Blob (ex: webp) en PNG via canvas, car Excel ne supporte que png/jpeg/gif
  const convertirBlobEnPng = (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) resolve(pngBlob);
          else reject(new Error('Conversion PNG échouée'));
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image illisible par le navigateur (format non supporté)'));
      };
      img.src = objectUrl;
    });
  };

  // Récupère le buffer + extension utilisables par ExcelJS pour une URL d'image donnée.
  // Lève une erreur explicite si l'URL ne renvoie pas réellement une image.
  const recupererImagePourExcel = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} pour ${url}`);
    }

    let blob = await response.blob();

    // Vérification cruciale : si le serveur ne renvoie pas une image (ex: du HTML
    // parce que l'URL est relative et tape sur le frontend au lieu du backend),
    // on le détecte ici au lieu de laisser Excel afficher une cellule vide.
    if (!blob.type || !blob.type.startsWith('image/')) {
      throw new Error(
        `Le contenu récupéré n'est pas une image (content-type: "${blob.type || 'inconnu'}"). ` +
        `Vérifie que l'URL "${url}" est bien absolue (http://localhost:5000/...) et accessible directement dans un nouvel onglet.`
      );
    }

    // Excel/ExcelJS ne supportent que png, jpeg, gif — on convertit le reste (webp, etc.)
    let extension;
    if (blob.type === 'image/png') extension = 'png';
    else if (blob.type === 'image/gif') extension = 'gif';
    else if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') extension = 'jpeg';
    else {
      // Format non supporté nativement (ex: webp) -> conversion en PNG
      blob = await convertirBlobEnPng(blob);
      extension = 'png';
    }

    const buffer = await blob.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Image vide après téléchargement');
    }

    return { buffer, extension };
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

  const exporterExcel = async () => {
    const etudiantsFiltres = filtrerEtudiants();

    if (etudiantsFiltres.length === 0) {
      alert('Aucun étudiant à exporter avec les filtres sélectionnés');
      return;
    }

    setIsExporting(true);
    setProgression('Préparation du fichier...');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'École';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('Étudiants');

      const colonnesActives = COLONNES.filter(c => champsSelectionnes[c.key]);
      worksheet.columns = colonnesActives.map(c => ({ header: c.header, key: c.key, width: c.width }));

      // Style de l'en-tête
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 22;

      const includeImage = !!champsSelectionnes.image;
      const imageColIndex = includeImage
        ? colonnesActives.findIndex(c => c.key === 'image')
        : -1;

      // 1) Ajouter toutes les lignes de données texte
      etudiantsFiltres.forEach(etudiant => {
        const rowData = {};
        colonnesActives.forEach(col => {
          if (col.key !== 'image') {
            rowData[col.key] = getValeur(etudiant, col.key);
          }
        });
        worksheet.addRow(rowData);
      });

      // 2) Ajouter les images (asynchrone, une par une pour éviter de saturer le navigateur)
      if (includeImage) {
        for (let i = 0; i < etudiantsFiltres.length; i++) {
          const etudiant = etudiantsFiltres[i];
          const rowNumber = i + 2; // ligne 1 = en-tête
          const row = worksheet.getRow(rowNumber);
          row.height = 55;

          const urlImage = resoudreUrlImage(etudiant.image);

          if (urlImage) {
            setProgression(`Traitement image ${i + 1}/${etudiantsFiltres.length}...`);
            try {
              const { buffer, extension } = await recupererImagePourExcel(urlImage);

              const imageId = workbook.addImage({ buffer, extension });
              worksheet.addImage(imageId, {
                tl: { col: imageColIndex, row: rowNumber - 1 },
                ext: { width: 45, height: 45 },
                editAs: 'oneCell'
              });
            } catch (err) {
              // Log détaillé pour diagnostiquer précisément (URL, statut, content-type...)
              console.error(`❌ Image non intégrée pour "${etudiant.nomComplet}" (URL résolue: ${urlImage}):`, err.message);
              row.getCell(imageColIndex + 1).value = 'Photo indisponible';
            }
          } else {
            row.getCell(imageColIndex + 1).value = 'Aucune photo';
          }
        }
      }

      setProgression('Génération du fichier Excel...');

      const buffer = await workbook.xlsx.writeBuffer();
      const blobFile = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blobFile);

      const date = new Date();
      const nomFichier = `Etudiants_${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}.xlsx`;

      const link = document.createElement('a');
      link.href = url;
      link.download = nomFichier;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`✅ ${etudiantsFiltres.length} étudiant(s) exporté(s) avec succès!`);
    } catch (err) {
      console.error('Erreur export Excel:', err);
      alert("❌ Une erreur est survenue lors de l'export. Vérifiez la console pour plus de détails.");
    } finally {
      setIsExporting(false);
      setProgression('');
    }
  };

  const niveauxDisponibles = [...new Set(etudiants.map(e => e.niveau))].filter(Boolean);
  const classesDisponibles = [...new Set(etudiants.flatMap(e => e.cours || []))];

  return (
    <div className="modal-overlay" onClick={isExporting ? undefined : onClose}>
      <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FileSpreadsheet size={24} className="inline mr-2" />
            Exporter les étudiants vers Excel
          </h3>
          <button className="btn-fermer-modal" onClick={onClose} disabled={isExporting}>
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
              <h5>🖼️ Photo</h5>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={champsSelectionnes.image}
                  onChange={() => handleToggleChamp('image')}
                />
                <span>Photo de l'étudiant (insérée dans la cellule)</span>
              </label>

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
          <button onClick={onClose} className="btn-annuler" disabled={isExporting}>
            Annuler
          </button>
          <button onClick={exporterExcel} className="btn-exporter" disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 size={18} className="inline mr-2 animate-spin" />
                {progression || 'Génération...'}
              </>
            ) : (
              <>
                <Download size={18} className="inline mr-2" />
                Exporter vers Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportEtudiants;