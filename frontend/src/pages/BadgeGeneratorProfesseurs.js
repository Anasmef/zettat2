import React, { useState, useEffect } from 'react';
import { User, Download, X, CheckSquare, Square } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ProfesseurBadge from './ProfesseurBadge';
import './BadgeGeneratorModern.css';
import html2canvas from 'html2canvas';

const BadgeGeneratorProfesseurs = () => {
  const [professeurs, setProfesseurs] = useState([]);
  const [professeursFiltres, setProfesseursFiltres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const [recherche, setRecherche] = useState('');
  const [filtreMatiere, setFiltreMatiere] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [exportFormat, setExportFormat] = useState(() => localStorage.getItem('exportFormat') || 'png');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('schoolLogo') || '/images/logo-ecole.jpg');
  const [anneeScolaire, setAnneeScolaire] = useState(() => localStorage.getItem('anneeScolaire') || '2026/2027');

  useEffect(() => { fetchProfesseurs(); }, []);
  useEffect(() => { filtrerProfesseurs(); }, [professeurs, recherche, filtreMatiere]);

  const fetchProfesseurs = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Vous devez être connecté');

      const response = await fetch('/api/professeurs', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) throw new Error('Session expirée. Veuillez vous reconnecter.');
      if (!response.ok) throw new Error('Erreur lors du chargement des professeurs');

      const data = await response.json();
      setProfesseurs(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtrerProfesseurs = () => {
    let resultats = professeurs;
    if (recherche) {
      resultats = resultats.filter(p =>
        (p.nom && p.nom.toLowerCase().includes(recherche.toLowerCase())) ||
        (p.matiere && p.matiere.toLowerCase().includes(recherche.toLowerCase()))
      );
    }
    if (filtreMatiere) resultats = resultats.filter(p => p.matiere === filtreMatiere);
    setProfesseursFiltres(resultats);
  };

  const matieresUniques = [...new Set(professeurs.map(p => p.matiere).filter(Boolean))].sort();

  const handleDownloadImage = async (professeur) => {
    try {
      setDownloadingId(professeur._id);
      await new Promise(resolve => setTimeout(resolve, 300));
      const cardElement = document.querySelector(`[data-prof-id="${professeur._id}"] .card-container-pvc`);
      if (!cardElement) { alert('❌ Impossible de trouver la carte'); return; }

      const canvas = await html2canvas(cardElement, {
        scale: 3,
        backgroundColor: exportFormat === 'png' ? null : '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        removeContainer: false,
        imageTimeout: 0,
        width: 324,
        height: 204
      });

      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = exportFormat === 'jpeg' ? 0.95 : 1.0;
      const imgData = canvas.toDataURL(mimeType, quality);
      const link = document.createElement('a');
      const extension = exportFormat === 'png' ? 'png' : 'jpg';
      link.href = imgData;
      link.download = `Carte_Prof_${professeur.nom?.replace(/\s+/g, '_') || professeur._id}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erreur export:', err);
      alert('❌ Erreur lors de la génération de l\'image');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.length === 0) { alert('Veuillez sélectionner au moins une carte'); return; }
    for (const id of selectedIds) {
      const professeur = professeurs.find(p => p._id === id);
      if (professeur) {
        await handleDownloadImage(professeur);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    alert(`✅ ${selectedIds.length} carte(s) téléchargée(s) en ${exportFormat.toUpperCase()}`);
  };

  const handleSelectAll = () => setSelectedIds(professeursFiltres.map(p => p._id));
  const handleDeselectAll = () => setSelectedIds([]);
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const handleLogout = () => { localStorage.removeItem('token'); window.location.href = '/login'; };

  if (loading) {
    return (
      <div className="badge-container">
        <Sidebar />
        <div className="badge-main-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Chargement des professeurs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="badge-container">
        <Sidebar />
        <div className="badge-main-content">
          <div className="loading-container">
            <p className="error-text">❌ {error}</p>
            {error.includes('connecté') || error.includes('Session') ? (
              <button onClick={handleLogout} className="btn-retry">Se reconnecter</button>
            ) : (
              <button onClick={fetchProfesseurs} className="btn-retry">Réessayer</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="badge-container">
      <Sidebar />
      <div className="badge-main-content">
        <div className="badge-header no-print">
          <div className="header-content">
            <h1 className="badge-title">Cartes Professeurs PVC</h1>
            <p className="badge-subtitle">
              {selectedIds.length} carte(s) sélectionnée(s) sur {professeursFiltres.length}
            </p>
          </div>
        </div>

        <div className="badge-toolbar no-print">
          <div className="toolbar-content">
            <div className="filtres-row">
              <div className="filtre-groupe">
                <input
                  type="text"
                  placeholder="Rechercher par nom ou matiere..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="input-recherche"
                />
              </div>
              <div className="filtre-groupe">
                <select value={filtreMatiere} onChange={(e) => setFiltreMatiere(e.target.value)} className="select-filtre">
                  <option value="">Toutes les matieres</option>
                  {matieresUniques.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                </select>
              </div>
              <div className="filtre-groupe">
                <select value={exportFormat} onChange={(e) => { setExportFormat(e.target.value); localStorage.setItem('exportFormat', e.target.value); }} className="select-filtre">
                  <option value="png">PNG (transparence)</option>
                  <option value="jpeg">JPEG (plus leger)</option>
                </select>
              </div>
            </div>
            <div className="actions">
              <button onClick={handleSelectAll} className="btn-select" disabled={professeursFiltres.length === 0}>
                Tout selectionner
              </button>
              {selectedIds.length > 0 && (
                <>
                  <button onClick={handleDeselectAll} className="btn-deselect">
                    <X size={18} />
                    Deselectionner ({selectedIds.length})
                  </button>
                  <button onClick={handleDownloadSelected} className="btn-print" disabled={downloadingId !== null}>
                    <Download size={18} />
                    {downloadingId ? 'Telechargement...' : `Telecharger ${exportFormat.toUpperCase()} (${selectedIds.length})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="content-area">
          <div className="screen-grid no-print">
            {professeursFiltres.map(professeur => (
              <div key={professeur._id} className="card-wrapper" data-prof-id={professeur._id}>
                <div className="checkbox-container">
                  <button
                    className="btn-download-single"
                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(professeur); }}
                    disabled={downloadingId === professeur._id}
                    title={`Telecharger cette carte en ${exportFormat.toUpperCase()}`}
                  >
                    {downloadingId === professeur._id ? <div className="mini-spinner"></div> : <Download size={20} />}
                  </button>
                  <div className="checkbox" onClick={(e) => { e.stopPropagation(); handleToggleSelect(professeur._id); }}>
                    {selectedIds.includes(professeur._id) ? <CheckSquare size={24} color="#6366f1" /> : <Square size={24} color="#9ca3af" />}
                  </div>
                </div>
                <ProfesseurBadge
                  professeur={professeur}
                  logoUrl={logoUrl}
                  anneeScolaire={anneeScolaire}
                />
              </div>
            ))}
          </div>
          {professeursFiltres.length === 0 && (
            <div className="empty-state">
              <User size={64} color="#cbd5e1" />
              <p className="empty-text">Aucun professeur trouve</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeGeneratorProfesseurs;