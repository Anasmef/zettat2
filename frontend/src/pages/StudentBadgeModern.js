import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { User, ImageIcon } from 'lucide-react';
import './StudentBadgeModern.css';

const StudentBadge = ({ etudiant, logoUrl, showAutorisation = false }) => {
  const qrRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Générer l'URL pour le QR code
  const baseUrl = window.location.origin;
  const qrData = `${baseUrl}/etudiant/${etudiant._id}`;

  // Générer le QR code
  useEffect(() => {
    if (qrData) {
      QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      })
        .then(url => {
          setQrDataUrl(url);
        })
        .catch(err => {
          console.error('Erreur lors de la génération du QR code:', err);
        });
    }
  }, [qrData]);

  return (
    <div className="badge-modern-wrapper">
      <div className="badge-modern-card print-card">
        {/* En-tête avec dégradé rose-violet-indigo */}
        <div className="badge-modern-header print-header">
          {/* Logo */}
          <div className="badge-modern-logo-container">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="badge-modern-logo" />
            ) : (
              <div className="badge-modern-logo-placeholder">
                <ImageIcon size={44} color="#ffffff" />
              </div>
            )}
          </div>

          {/* Titre */}
          <div className="badge-modern-header-text">
            <p className="badge-modern-card-type-main">CARTE ÉTUDIANT</p>
            <p className="badge-modern-card-subtype-year">ANNÉE SCOLAIRE</p>
            <p className="badge-modern-card-year">2025/2026</p>
          </div>

        {/* Photo étudiant */}
<div className="badge-modern-photo-container print-photo">
  {etudiant.image ? (
    <img 
      src={etudiant.image.startsWith('http') 
        ? etudiant.image 
        : etudiant.image.startsWith('/') 
          ? etudiant.image 
          : `/${etudiant.image}`
      }
      alt={etudiant.nomComplet}
      className="badge-modern-photo"
      onError={(e) => {
        console.error('❌ Image non trouvée:', etudiant.image);
        console.error('❌ URL complète:', e.target.src);
      }}
    />
  ) : (
    <div className="badge-modern-photo-placeholder">
      <User size={34} color="#ffffff" strokeWidth={1.5} />
    </div>
  )}
</div>
        </div>

        {/* Corps de la carte */}
        <div className="badge-modern-body">
          <div className="badge-modern-content-grid">
            {/* Colonne gauche - Informations */}
            <div className="badge-modern-info-section">
              <div className="badge-modern-info-row-name">
                <span className="badge-modern-label">NOM COMPLET:</span>
                <span className={`badge-modern-value-name ${etudiant.nomComplet?.length > 20 ? 'long-name' : ''}`}>
                  {etudiant.nomComplet?.toUpperCase()}
                </span>
              </div>
              
              <div className="badge-modern-info-row">
                <span className="badge-modern-label">NIVEAU:</span>
                <span className="badge-modern-value-highlight print-gradient">
                  {etudiant.niveau || 'N/A'}
                </span>
              </div>

              {etudiant.codeMassar && (
                <div className="badge-modern-info-row-massar">
                  <span className="badge-modern-label">CODE MASSAR:</span>
                  <span className="badge-modern-value-massar">
                    {etudiant.codeMassar}
                  </span>
                </div>
              )}
            </div>

            {/* Colonne droite - QR Code (toujours présent) */}
            <div className="badge-modern-qr-compact">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code" 
                  className="badge-modern-qr-small"
                />
              ) : (
                <div className="badge-modern-qr-placeholder-small">...</div>
              )}
              
              {/* Texte sous le QR : soit "Scanner" soit "AUTORISATION DE SORTIE" en rouge */}
              {showAutorisation ? (
                <p className="badge-modern-autorisation-text">
                  AUTORISATION<br/>DE SORTIE
                </p>
              ) : (
                <p className="badge-modern-qr-label-small"></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentBadge;