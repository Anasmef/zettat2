import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as XLSX from 'xlsx-js-style';
import {
  ScanLine, Clock, CheckCircle, XCircle, Users, Calendar,
  Camera, CameraOff, RefreshCw, FileSpreadsheet, Download
} from 'lucide-react';
import Sidebar from '../components/Sidebarmanager'; // ✅ Sidebar Manager (au lieu de Sidebar Admin)
import './ScanPointageProf.css'; // ✅ on reutilise le meme CSS que la version admin

const READER_ELEMENT_ID = 'camera-reader-manager';
const COOLDOWN_MS = 3000;

// Style de bordure fine réutilisé pour toutes les cellules du tableau Excel
const BORDURE_FINE = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const ScanPointageProfManager = () => {
  const [tableauJour, setTableauJour] = useState([]);
  const [loadingTableau, setLoadingTableau] = useState(true);
  const [dateSelectionnee, setDateSelectionnee] = useState(new Date().toISOString().slice(0, 10));
  const [dernierScan, setDernierScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraErreur, setCameraErreur] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  // ✅ États pour les exports Excel
  const [moisSelectionne, setMoisSelectionne] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [periodeDebut, setPeriodeDebut] = useState(new Date().toISOString().slice(0, 10));
  const [periodeFin, setPeriodeFin] = useState(new Date().toISOString().slice(0, 10));
  const [exportEnCours, setExportEnCours] = useState(null); // 'mois' | 'periode' | null

  const html5QrCodeRef = useRef(null);
  const dernierCodeRef = useRef({ code: null, ts: 0 });
  const traitementEnCoursRef = useRef(false);
  const startPromiseRef = useRef(null);
  const enTrainDeDemarrer = useRef(false);

  const estAujourdhui = dateSelectionnee === new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const filtrerErreurPlayInterrompu = (event) => {
      const message = event?.reason?.message || event?.reason || '';
      if (typeof message === 'string' && message.includes('play() request was interrupted')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', filtrerErreurPlayInterrompu);
    return () => window.removeEventListener('unhandledrejection', filtrerErreurPlayInterrompu);
  }, []);

  useEffect(() => {
    chargerTableau();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateSelectionnee]);

  useEffect(() => {
    if (!estAujourdhui) return;

    const intervalId = setInterval(() => {
      chargerTableau(true);
    }, 3000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estAujourdhui, dateSelectionnee]);

  useEffect(() => {
    if (estAujourdhui) {
      demarrerCamera();
    } else {
      arreterCamera();
    }
    return () => {
      arreterCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estAujourdhui, facingMode]);

  const basculerCamera = async () => {
    await arreterCamera();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const chargerTableau = async (silencieux = false) => {
    try {
      if (!silencieux) setLoadingTableau(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/pointage-profs/jour/${dateSelectionnee}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTableauJour(res.data);
    } catch (err) {
      console.error('Erreur chargement tableau:', err);
    } finally {
      if (!silencieux) setLoadingTableau(false);
    }
  };

  const demarrerCamera = async () => {
    if (html5QrCodeRef.current || enTrainDeDemarrer.current) return;
    enTrainDeDemarrer.current = true;

    try {
      const html5QrCode = new Html5Qrcode(READER_ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const startPromise = html5QrCode.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        (decodedText, decodedResult) => {
          console.log('Code détecté:', decodedText, decodedResult);
          onCodeDetecte(decodedText);
        },
        (errorMessage) => {
          // ignore silencieusement
        }
      );
      startPromiseRef.current = startPromise;

      await startPromise.catch((err) => {
        console.warn('Camera start interrompu:', err?.message || err);
        throw err;
      });

      if (!html5QrCodeRef.current) {
        await html5QrCode.stop().catch(() => {});
        await html5QrCode.clear().catch(() => {});
        return;
      }

      setCameraActive(true);
      setCameraErreur(null);
    } catch (err) {
      console.error('Erreur démarrage caméra:', err);
      setCameraErreur("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur.");
      setCameraActive(false);
      html5QrCodeRef.current = null;
    } finally {
      enTrainDeDemarrer.current = false;
    }
  };

  const arreterCamera = async () => {
    const instance = html5QrCodeRef.current;
    if (!instance) return;

    html5QrCodeRef.current = null;

    try {
      if (startPromiseRef.current) {
        await startPromiseRef.current.catch(() => {});
      }
      await instance.stop();
      await instance.clear();
    } catch (err) {
      // deja arretee, on ignore
    } finally {
      setCameraActive(false);
    }
  };

  const onCodeDetecte = (codeDetecte) => {
    const maintenant = Date.now();

    if (
      dernierCodeRef.current.code === codeDetecte &&
      maintenant - dernierCodeRef.current.ts < COOLDOWN_MS
    ) {
      return;
    }
    if (traitementEnCoursRef.current) return;

    dernierCodeRef.current = { code: codeDetecte, ts: maintenant };
    envoyerScan(codeDetecte);
  };

  const envoyerScan = async (professeurId) => {
    if (!professeurId) return;

    traitementEnCoursRef.current = true;
    setScanning(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/pointage-profs/scan',
        { professeurId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDernierScan({
        nom: res.data.professeur.nomComplet,
        matiere: res.data.professeur.matiere,
        heure: new Date(res.data.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        dejaScanne: res.data.dejaScanne,
        minutesRestantes: res.data.minutesRestantes || null,
        erreur: false
      });

      if (estAujourdhui) {
        chargerTableau(true);
      }
    } catch (err) {
      console.error('Erreur scan:', err);
      setDernierScan({
        erreur: true,
        message: err.response?.data?.error || 'Badge non reconnu'
      });
    } finally {
      setScanning(false);
      setTimeout(() => {
        setDernierScan(null);
        traitementEnCoursRef.current = false;
      }, 2500);
    }
  };

  // =====================================================================
  // ✅ EXPORT EXCEL — 3 modes : jour affiché / mois / période libre
  // =====================================================================

  // Récupère les pointages d'une période via la route backend /periode
  const recupererPointagesPeriode = async (debut, fin) => {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/pointage-profs/periode', {
      params: { debut, fin },
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data; // [{ date, nomComplet, matiere, heureArrivee }, ...]
  };

  // Construit un classeur Excel stylé (xlsx-js-style) à partir de lignes
  // {date, nomComplet, matiere, heureArrivee} et l'écrit sur le disque du navigateur
  const genererEtTelechargerExcel = (lignes, titre, nomFichier) => {
    const entetes = ['Date', 'Nom du Professeur', 'Matière', "Heure d'arrivée"];

    const donnees = [
      [titre],
      [],
      entetes,
      ...lignes.map(l => ([
        new Date(l.date).toLocaleDateString('fr-FR'),
        l.nomComplet,
        l.matiere || '—',
        new Date(l.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      ]))
    ];

    const ws = XLSX.utils.aoa_to_sheet(donnees);

    // Fusionne la cellule de titre sur les 4 colonnes
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

    // Style du titre
    ws['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2563EB' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    // Style de la ligne d'en-têtes (ligne d'index 2, càd la 3e ligne de la feuille)
    const indexLigneEntetes = 2;
    entetes.forEach((_, colIdx) => {
      const ref = XLSX.utils.encode_cell({ r: indexLigneEntetes, c: colIdx });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E3A8A' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: BORDURE_FINE
        };
      }
    });

    // Style des lignes de données (bordures + alternance de couleur)
    lignes.forEach((_, i) => {
      const rowIdx = indexLigneEntetes + 1 + i;
      for (let c = 0; c < entetes.length; c++) {
        const ref = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (ws[ref]) {
          ws[ref].s = {
            border: BORDURE_FINE,
            fill: { fgColor: { rgb: i % 2 === 0 ? 'F0FDF4' : 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
    });

    // Largeur des colonnes
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 16 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pointages');
    XLSX.writeFile(wb, nomFichier);
  };

  // --- Export du jour actuellement affiché (utilise le tableau déjà chargé) ---
  const exporterJourAffiche = () => {
    const lignes = [];
    tableauJour.forEach(prof => {
      if (prof.heures && prof.heures.length > 0) {
        prof.heures.forEach(h => {
          lignes.push({
            date: dateSelectionnee,
            nomComplet: prof.nomComplet,
            matiere: prof.matiere,
            heureArrivee: h
          });
        });
      }
    });

    if (lignes.length === 0) {
      alert("Aucun pointage à exporter pour cette date.");
      return;
    }

    const dateFr = new Date(dateSelectionnee).toLocaleDateString('fr-FR');
    genererEtTelechargerExcel(
      lignes,
      `Pointages du ${dateFr}`,
      `pointages_${dateSelectionnee}.xlsx`
    );
  };

  // --- Export d'un mois complet choisi via <input type="month"> ---
  const exporterMois = async () => {
    if (!moisSelectionne) return;
    setExportEnCours('mois');
    try {
      const [annee, mois] = moisSelectionne.split('-');
      const debut = `${annee}-${mois}-01`;
      // new Date(annee, mois, 0) donne le dernier jour du mois choisi
      // (car "mois" ici est 1-indexé, donc utilisé tel quel comme mois "suivant" 0-indexé)
      const dernierJour = new Date(Number(annee), Number(mois), 0).getDate();
      const fin = `${annee}-${mois}-${String(dernierJour).padStart(2, '0')}`;

      const data = await recupererPointagesPeriode(debut, fin);
      if (!data || data.length === 0) {
        alert("Aucun pointage trouvé pour ce mois.");
        return;
      }

      const libelleMois = new Date(Number(annee), Number(mois) - 1, 1)
        .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

      genererEtTelechargerExcel(
        data,
        `Pointages — ${libelleMois}`,
        `pointages_${annee}-${mois}.xlsx`
      );
    } catch (err) {
      console.error('Erreur export mois:', err);
      alert("Erreur lors de l'export du mois.");
    } finally {
      setExportEnCours(null);
    }
  };

  // --- Export d'une période libre (deux dates choisies) ---
  const exporterPeriode = async () => {
    if (!periodeDebut || !periodeFin) return;
    if (periodeDebut > periodeFin) {
      alert("La date de début doit être avant la date de fin.");
      return;
    }

    setExportEnCours('periode');
    try {
      const data = await recupererPointagesPeriode(periodeDebut, periodeFin);
      if (!data || data.length === 0) {
        alert("Aucun pointage trouvé pour cette période.");
        return;
      }

      const debutFr = new Date(periodeDebut).toLocaleDateString('fr-FR');
      const finFr = new Date(periodeFin).toLocaleDateString('fr-FR');

      genererEtTelechargerExcel(
        data,
        `Pointages du ${debutFr} au ${finFr}`,
        `pointages_${periodeDebut}_au_${periodeFin}.xlsx`
      );
    } catch (err) {
      console.error('Erreur export période:', err);
      alert("Erreur lors de l'export de la période.");
    } finally {
      setExportEnCours(null);
    }
  };

  const nbPresents = tableauJour.filter(p => p.present).length;
  const nbTotal = tableauJour.length;

  return (
    <div className="scan-page">
      <Sidebar />

      <div className="scan-container">
        <h1 className="scan-titre">
          <ScanLine size={28} /> Pointage des Professeurs
        </h1>

        <div className="scan-zone">
          <div className="scan-zone-header">
            <label className="scan-label">
              {cameraActive ? (
                <><Camera size={16} /> Présentez le badge (QR code) devant la caméra</>
              ) : (
                <><CameraOff size={16} /> Caméra inactive</>
              )}
            </label>

            {estAujourdhui && (
              <button
                type="button"
                className="btn-switch-camera"
                onClick={basculerCamera}
                title="Changer de caméra (avant / arrière)"
              >
                <RefreshCw size={16} />
                {facingMode === 'environment' ? 'Caméra arrière' : 'Caméra avant'}
              </button>
            )}
          </div>

          <div
            className="camera-wrapper"
            style={{ display: estAujourdhui ? 'block' : 'none' }}
          >
            <div id={READER_ELEMENT_ID} className="camera-reader" />
            {cameraErreur && (
              <p className="camera-erreur">{cameraErreur}</p>
            )}
            {scanning && (
              <div className="camera-overlay-scanning">Traitement du scan...</div>
            )}
          </div>

          {!estAujourdhui && (
            <p className="camera-info">
              La caméra n'est active que pour la journée en cours. Sélectionnez la date d'aujourd'hui pour scanner.
            </p>
          )}

          {dernierScan && (
            <div className={`scan-confirmation ${dernierScan.erreur ? 'erreur' : dernierScan.dejaScanne ? 'attention' : 'succes'}`}>
              {dernierScan.erreur ? (
                <>
                  <XCircle size={32} />
                  <div>
                    <strong>Erreur</strong>
                    <p>{dernierScan.message}</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle size={32} />
                  <div>
                    <strong>{dernierScan.nom}</strong>
                    <p>
                      {dernierScan.dejaScanne
                        ? (dernierScan.minutesRestantes
                            ? `Déjà pointé, réessayez dans ${dernierScan.minutesRestantes} min`
                            : `Déjà pointé aujourd'hui à ${dernierScan.heure}`)
                        : `Pointé avec succès à ${dernierScan.heure}`}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="scan-stats">
          <div className="stat-box">
            <Users size={20} />
            <span>{nbPresents} / {nbTotal} présents</span>
          </div>
          {estAujourdhui && (
            <div className="stat-box live-indicator">
              <span className="live-dot"></span>
              <span>En direct</span>
            </div>
          )}
          <div className="stat-box date-picker">
            <Calendar size={20} />
            <input
              type="date"
              value={dateSelectionnee}
              onChange={(e) => setDateSelectionnee(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        {/* ✅ Barre d'export Excel */}
        <div className="export-bar">
          <div className="export-groupe">
            <button
              type="button"
              className="btn-export btn-export-principal"
              onClick={exporterJourAffiche}
            >
              <FileSpreadsheet size={16} />
              Exporter le jour affiché
            </button>
          </div>

          <div className="export-groupe">
            <Calendar size={16} className="export-icone" />
            <input
              type="month"
              value={moisSelectionne}
              onChange={(e) => setMoisSelectionne(e.target.value)}
              max={new Date().toISOString().slice(0, 7)}
            />
            <button
              type="button"
              className="btn-export"
              onClick={exporterMois}
              disabled={exportEnCours === 'mois'}
            >
              <Download size={16} />
              {exportEnCours === 'mois' ? 'Export en cours...' : 'Exporter le mois'}
            </button>
          </div>

          <div className="export-groupe">
            <Calendar size={16} className="export-icone" />
            <input
              type="date"
              value={periodeDebut}
              onChange={(e) => setPeriodeDebut(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
            <span className="export-separateur">→</span>
            <input
              type="date"
              value={periodeFin}
              onChange={(e) => setPeriodeFin(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
            <button
              type="button"
              className="btn-export"
              onClick={exporterPeriode}
              disabled={exportEnCours === 'periode'}
            >
              <Download size={16} />
              {exportEnCours === 'periode' ? 'Export en cours...' : 'Exporter la période'}
            </button>
          </div>
        </div>

        <div className="scan-tableau-wrapper">
          {loadingTableau ? (
            <p className="scan-chargement">Chargement...</p>
          ) : (
            <table className="scan-tableau">
              <thead>
                <tr>
                  <th>Statut</th>
                  <th>Nom du Professeur</th>
                  <th>Matière</th>
                  <th>Pointages du jour</th>
                </tr>
              </thead>
              <tbody>
                {tableauJour.length === 0 ? (
                  <tr><td colSpan={4} className="scan-aucun">Aucun professeur trouvé</td></tr>
                ) : (
                  tableauJour.map(prof => (
                    <tr key={prof._id} className={prof.present ? 'ligne-presente' : 'ligne-absente'}>
                      <td>
                        {prof.present ? (
                          <span className="badge-statut present"><CheckCircle size={14} /> Présent</span>
                        ) : (
                          <span className="badge-statut absent"><XCircle size={14} /> Non pointé</span>
                        )}
                      </td>
                      <td className="col-nom">{prof.nomComplet}</td>
                      <td>{prof.matiere || '—'}</td>
                      <td>
                        {prof.heures && prof.heures.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {prof.heures.map((h, idx) => (
                              <span key={idx} className="heure-arrivee">
                                <Clock size={14} /> {new Date(h).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanPointageProfManager;