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
      <div className="card-container-pvc">
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
          <div className="decorative-circles-pvc">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="circle-pvc"></div>
            ))}
          </div>

          <div className="content-wrapper-pvc">
            <div className="photo-section-pvc">
              <div className="student-photo-pvc photo-rouge">
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
                <span className="info-label-pvc">Nom Complet</span>
                <span className="info-value-pvc">: {professeur.nom || 'N/A'}</span>
              </div>

              <div className="info-with-qr-pvc">
                <div className="info-left-pvc">
                  {professeur.cin && (
                    <div className="info-row-pvc">
                      <span className="info-label-pvc">CIN</span>
                      <span className="info-value-pvc">: {professeur.cin}</span>
                    </div>
                  )}
                  <div className="info-row-pvc">
                    <span className="info-label-pvc">Matière</span>
                    <span className="info-value-pvc">: {professeur.matiere || 'N/A'}</span>
                  </div>
                  <div className="info-row-pvc">
                    <span className="info-label-pvc">Téléphone</span>
                    <span className="info-value-pvc">: {professeur.telephone || 'N/A'}</span>
                  </div>
                </div>

                <div className="qr-side-pvc">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="qrcode-small-pvc" />
                  ) : (
                    <div className="qr-placeholder-small-pvc">QR</div>
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