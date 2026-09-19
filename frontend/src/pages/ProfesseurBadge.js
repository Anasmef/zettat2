import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import './ProfesseurBadge.css'; // ✅ design dédié UNIQUEMENT au badge professeur

const ProfesseurBadge = ({ professeur }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Le QR code contient directement l'ID (pas une URL) pour un scan rapide
  const qrData = professeur._id;

  useEffect(() => {
    if (qrData) {
      QRCode.toDataURL(qrData, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M'
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Erreur QR code:', err));
    }
  }, [qrData]);

  return (
    <div className="prof-card-wrapper">
      <div className="prof-card-container">

        {/* HEADER (rouge, sans logo ni nom d'école) */}
        <div className="prof-card-header">
          <div className="prof-header-slash"></div>
          <div className="prof-header-title">Carte Professeur</div>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="prof-card-content">

          {/* PHOTO */}
          <div className="prof-photo-section">
            <div className="prof-photo-frame">
              {professeur.image ? (
                <img
                  src={professeur.image.startsWith('http') ? professeur.image : `${window.location.origin}${professeur.image}`}
                  alt={professeur.nom}
                  className="prof-photo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="prof-photo-placeholder">👤</div>';
                  }}
                />
              ) : (
                <div className="prof-photo-placeholder">👤</div>
              )}
            </div>
          </div>

          <div className="prof-vertical-line"></div>

          {/* INFORMATIONS */}
          <div className="prof-info-section">

            {/* Ligne Nom Complet : pleine largeur */}
            <div className="prof-info-block">
              <div className="prof-info-label">Nom Complet</div>
              <div className="prof-info-value prof-nom-value">{professeur.nom || 'N/A'}</div>
            </div>

            <div className="prof-horizontal-line"></div>

            {/* Ligne Matière + QR code sur la même ligne */}
            <div className="prof-bottom-row">
              <div className="prof-info-block prof-matiere-block">
                <div className="prof-info-label">Matière</div>
                <div className="prof-info-value prof-arabic">{professeur.matiere || 'N/A'}</div>
              </div>

              <div className="prof-mini-vline"></div>

              <div className="prof-qr-frame-mini">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="prof-qr-code"
                  />
                ) : (
                  <div className="prof-qr-placeholder">QR</div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER décoratif */}
        <div className="prof-card-footer">
          <div className="prof-footer-line"></div>
          <div className="prof-footer-diamonds">
            <span></span>
            <span className="large"></span>
            <span></span>
          </div>
          <div className="prof-footer-line"></div>
        </div>

      </div>
    </div>
  );
};

export default ProfesseurBadge;