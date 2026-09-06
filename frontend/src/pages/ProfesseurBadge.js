import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import './StudentBadgeModern.css'; // ✅ on reutilise le meme CSS que le badge etudiant

const ProfesseurBadge = ({ professeur, logoUrl, anneeScolaire = '2025/2026' }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Le QR code contient directement l'ID (pas une URL) pour un scan rapide
  const qrData = professeur._id;

  useEffect(() => {
    if (qrData) {
      QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M'
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Erreur QR code:', err));
    }
  }, [qrData]);

  return (
    <div className="card-wrapper-pvc">
      <div className="card-container-pvc" style={{ overflow: 'hidden' }}>
        <div className="header-pvc">
          <div className="logo-section-pvc">
            <div className="logo-pvc">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="logo-img-pvc" /> : 'AK'}
            </div>
            <div className="company-name-pvc">
              <h1>ALFRED KASTLER</h1>
              <p>{anneeScolaire}</p>
            </div>
          </div>
          <div className="header-accent-pvc"></div>
        </div>

        <div className="card-body-pvc">
          <div
            className="decorative-circles-pvc"
            style={{ left: 0, right: 'auto' }}
          >
            {[...Array(9)].map((_, i) => (
              <div key={i} className="circle-pvc"></div>
            ))}
          </div>

          <div className="content-wrapper-pvc">
            <div className="photo-section-pvc">
              {/* Photo un peu moins haute qu'avant */}
              <div className="student-photo-pvc photo-rouge" style={{ height: '75%' }}>
                {professeur.image ? (
                  <img
                    src={professeur.image.startsWith('http') ? professeur.image : `${window.location.origin}${professeur.image}`}
                    alt={professeur.nom}
                    className="photo-img-pvc"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="photo-placeholder-pvc">👤</div>';
                    }}
                  />
                ) : (
                  <div className="photo-placeholder-pvc">👤</div>
                )}
              </div>
            </div>

            <div className="info-section-pvc">
              <h2 className="card-title-pvc">CARTE PROFESSEUR</h2>

              <div className="info-row-pvc">
                <span className="info-label-pvc" style={{ fontSize: '9px' }}>Nom Complet</span>
                <span className="info-value-pvc" style={{ fontSize: '9px' }}>: {professeur.nom || 'N/A'}</span>
              </div>

              <div
                className="info-with-qr-pvc"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div className="info-left-pvc" style={{ flex: 1, minWidth: 0 }}>
                  <div className="info-row-pvc">
                    <span className="info-label-pvc" style={{ fontSize: '9px' }}>Matière</span>
                    <span
                      className="info-value-pvc"
                      style={{
                        fontSize: '9px',
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        wordBreak: 'break-word',
                        display: 'block',
                        lineHeight: 1.25,
                      }}
                    >
                      : {professeur.matiere || 'N/A'}
                    </span>
                  </div>
                </div>

                <div
                  className="qr-side-pvc"
                  style={{
                    flexShrink: 0,
                    width: '58px',
                    height: '58px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="qrcode-small-pvc"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  ) : (
                    <div
                      className="qr-placeholder-small-pvc"
                      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      QR
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-accent-pvc"></div>
      </div>
    </div>
  );
};

export default ProfesseurBadge;