import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ScanLine, Clock, CheckCircle, XCircle, Users, Calendar, Camera, CameraOff, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import './ScanPointageProf.css';

const READER_ELEMENT_ID = 'camera-reader';
const COOLDOWN_MS = 3000; // évite de re-scanner le même badge en boucle

const ScanPointageProf = () => {
  const [tableauJour, setTableauJour] = useState([]);
  const [loadingTableau, setLoadingTableau] = useState(true);
  const [dateSelectionnee, setDateSelectionnee] = useState(new Date().toISOString().slice(0, 10));
  const [dernierScan, setDernierScan] = useState(null); // { nom, heure, dejaScanne, erreur }
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraErreur, setCameraErreur] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = arriere, 'user' = avant

  const html5QrCodeRef = useRef(null);
  const dernierCodeRef = useRef({ code: null, ts: 0 });
  const traitementEnCoursRef = useRef(false);
  const startPromiseRef = useRef(null); // pour synchroniser start() et stop() et eviter le "double camera"
  const enTrainDeDemarrer = useRef(false);

  const estAujourdhui = dateSelectionnee === new Date().toISOString().slice(0, 10);

  // Empeche l'erreur benigne "play() request was interrupted..." de s'afficher
  // comme une erreur bloquante dans l'overlay de developpement (elle vient du
  // <video> interne de html5-qrcode et n'affecte pas le fonctionnement du scan).
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

  // ✅ Rafraichissement automatique du tableau (polling), comme du Ajax :
  // permet a un PC (qui affiche juste le tableau) de voir en direct les
  // pointages faits depuis un telephone (ou un autre appareil), sans
  // avoir besoin de rafraichir la page manuellement.
  useEffect(() => {
    if (!estAujourdhui) return; // pas la peine de rafraichir un jour passe

    const intervalId = setInterval(() => {
      chargerTableau(true); // silencieux = pas de spinner "Chargement..."
    }, 3000); // toutes les 3 secondes

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estAujourdhui, dateSelectionnee]);

  // Démarre / arrête la caméra selon qu'on regarde le jour courant ou non,
  // et redémarre si on change de caméra (avant/arrière)
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
    // demarrerCamera() sera relance automatiquement par le useEffect ci-dessus
    // grace au changement de `facingMode`
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
    // Empeche tout double-demarrage (React StrictMode appelle les effets 2 fois en dev)
    if (html5QrCodeRef.current || enTrainDeDemarrer.current) return;
    enTrainDeDemarrer.current = true;

    try {
      // On active TOUS les formats (QR code + différents types de codes-barres)
      // pour ne pas dépendre du type exact du badge.
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

      // On garde une reference vers la promesse de start() : arreterCamera()
      // devra l'attendre avant d'appeler stop(), sinon les deux se chevauchent
      // et on obtient l'effet "camera dedoublee".
      const startPromise = html5QrCode.start(
        {
          facingMode, // 'environment' (arriere) ou 'user' (avant), selon le choix de l'utilisateur
        },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          // Force une résolution vidéo élevée pour bien résoudre les petits QR codes
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
          // callback d'échec de lecture par frame — appelé en continu tant que
          // rien n'est détecté, c'est normal, on ignore silencieusement
        }
      );
      startPromiseRef.current = startPromise;

      await startPromise.catch((err) => {
        // Absorbe les erreurs benignes de type "play() interrupted" qui
        // peuvent survenir si le composant est demonte/remonte tres vite
        // (React StrictMode en dev, changement rapide de date, etc.)
        console.warn('Camera start interrompu:', err?.message || err);
        throw err; // on relance quand meme pour que le catch() plus bas gere l'UI
      });

      // Si entre-temps un stop a ete demande (StrictMode), on arrete tout de suite
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

    // On retire la reference tout de suite : ca signale a demarrerCamera()
    // (si son start() est encore en cours) qu'il doit s'arreter juste apres.
    html5QrCodeRef.current = null;

    try {
      // Attendre que le start() en cours (s'il y en a un) soit termine
      // avant d'appeler stop() — sinon on stoppe un flux qui n'a pas fini
      // de s'initialiser, ce qui cree le bug visuel de double camera.
      if (startPromiseRef.current) {
        await startPromiseRef.current.catch(() => {});
      }
      await instance.stop();
      await instance.clear();
    } catch (err) {
      // déjà arrêtée ou en train de s'arrêter, on ignore
    } finally {
      setCameraActive(false);
    }
  };

  const onCodeDetecte = (codeDetecte) => {
    const maintenant = Date.now();

    // Anti-doublon : ignore si c'est le même code lu il y a moins de COOLDOWN_MS
    if (
      dernierCodeRef.current.code === codeDetecte &&
      maintenant - dernierCodeRef.current.ts < COOLDOWN_MS
    ) {
      return;
    }
    if (traitementEnCoursRef.current) return; // un scan est déjà en cours de traitement

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
        erreur: false
      });

      if (estAujourdhui) {
        chargerTableau(true); // silencieux, l'interval s'en charge deja mais on rafraichit immediatement apres un scan reussi
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

  const nbPresents = tableauJour.filter(p => p.present).length;
  const nbTotal = tableauJour.length;

  return (
    <div className="scan-page">
      <Sidebar />

      <div className="scan-container">
        <h1 className="scan-titre">
          <ScanLine size={28} /> Pointage des Professeurs
        </h1>

        {/* Zone de scan caméra */}
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

          {/* Le div de la camera reste TOUJOURS dans le DOM (on le cache juste
              visuellement avec du CSS quand ce n'est pas aujourd'hui).
              Le retirer conditionnellement du DOM pendant que la video est
              en train de demarrer/s'arreter provoque l'erreur navigateur :
              "The play() request was interrupted because the media was removed
              from the document." */}
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

          {/* Confirmation du dernier scan */}
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
                        ? `Déjà pointé aujourd'hui à ${dernierScan.heure}`
                        : `Pointé avec succès à ${dernierScan.heure}`}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats rapides */}
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

        {/* Tableau du jour */}
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
                  <th>Heure d'arrivée</th>
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
                        {prof.heureArrivee ? (
                          <span className="heure-arrivee">
                            <Clock size={14} /> {new Date(prof.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
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

export default ScanPointageProf;