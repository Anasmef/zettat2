import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StudentBadge from './StudentBadgeModern';
import './PrintSingleBadge.css';

const PrintSingleBadge = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const badgeRef = useRef(null);
  const [etudiant, setEtudiant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAutorisation, setShowAutorisation] = useState(false);

  const logoUrl = localStorage.getItem('schoolLogo') || '/images/logo-ecole.jpg';
  const anneeScolaire = localStorage.getItem('anneeScolaire') || '2024-2025';

  useEffect(() => {
    fetchEtudiant();
  }, [id]);

  const fetchEtudiant = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/etudiants/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Étudiant non trouvé');
      
      const data = await response.json();
      setEtudiant(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!badgeRef.current) return;
    
    try {
      const exportBtn = document.querySelector('.btn-export-pdf');
      const originalText = exportBtn.textContent;
      exportBtn.textContent = '⏳ Export en cours...';
      exportBtn.disabled = true;

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const CR80_WIDTH_PX = 1011;
      const CR80_HEIGHT_PX = 638;
      const CR80_WIDTH_MM = 85.6;
      const CR80_HEIGHT_MM = 53.98;

      const canvas = await html2canvas(badgeRef.current, {
        scale: 5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: CR80_WIDTH_PX,
        height: CR80_HEIGHT_PX,
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        windowWidth: CR80_WIDTH_PX,
        windowHeight: CR80_HEIGHT_PX
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [CR80_WIDTH_MM, CR80_HEIGHT_MM],
        compress: false,
        precision: 16,
        putOnlyUsedFonts: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      pdf.addImage(
        imgData, 
        'JPEG', 
        0,
        0,
        CR80_WIDTH_MM,
        CR80_HEIGHT_MM,
        '', 
        'FAST'
      );
      
      const nomFichier = etudiant.nomComplet
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      
      pdf.save(`Carte_PVC_${nomFichier}.pdf`);
      
      exportBtn.textContent = originalText;
      exportBtn.disabled = false;
      
      alert('✅ PDF exporté avec succès!\n\nFormat: CR80 (85.6mm × 53.98mm)\nQualité: Optimale pour impression PVC\n\nVous pouvez maintenant imprimer ce PDF sur votre imprimante PVC.');
      
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('❌ Erreur lors de l\'export PDF: ' + err.message);
      
      const exportBtn = document.querySelector('.btn-export-pdf');
      if (exportBtn) {
        exportBtn.textContent = '📄 Export PDF (PVC)';
        exportBtn.disabled = false;
      }
    }
  };

  if (loading) {
    return (
      <div className="print-single-loading">
        <div className="spinner"></div>
        <p>Chargement de la carte...</p>
      </div>
    );
  }

  if (error || !etudiant) {
    return (
      <div className="print-single-error">
        <p>❌ {error || 'Étudiant non trouvé'}</p>
        <button onClick={() => navigate('/badges')}>Retour</button>
      </div>
    );
  }

  return (
    <div className="print-single-container">
      <div className="print-single-toolbar no-print">
        <button onClick={() => navigate('/badges')} className="btn-back">
          ← Retour
        </button>
        
        <div className="toolbar-info">
          <h2>{etudiant.nomComplet}</h2>
          <span>{etudiant.niveau}</span>
        </div>

        <div className="toolbar-actions">
          <label className="autorisation-toggle">
            <input
              type="checkbox"
              checked={showAutorisation}
              onChange={(e) => setShowAutorisation(e.target.checked)}
            />
            <span>Autorisation de sortie</span>
          </label>
          
          <button onClick={handleExportPDF} className="btn-export-pdf">
            📄 Export PDF CR80
          </button>
          
          <button onClick={handlePrint} className="btn-print">
            🖨️ Imprimer
          </button>
        </div>
      </div>

      <div className="print-single-badge">
        {/* 🆕 INDICATEUR DE TAILLE PVC */}
        <div className="pvc-size-indicator no-print">
          <h3>📏 Format Carte PVC Standard</h3>
          <p>
            Taille réelle: 
            <span className="size-highlight">85.6mm × 53.98mm</span>
          </p>
          <p style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>
            Format ISO/IEC 7810 ID-1 (CR80) • Identique aux cartes bancaires
          </p>
        </div>

        <div ref={badgeRef} className="badge-wrapper">
          <StudentBadge 
            etudiant={etudiant}
            logoUrl={logoUrl}
            anneeScolaire={anneeScolaire}
            showAutorisation={showAutorisation}
          />
        </div>
      </div>
    </div>
  );
};

export default PrintSingleBadge;