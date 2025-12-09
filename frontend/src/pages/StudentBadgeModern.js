import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import './StudentBadgeModern.css';

const StudentBadge = ({ etudiant, logoUrl, anneeScolaire = '2025/2026', showAutorisation = false }) => {
  const qrRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const baseUrl = window.location.origin;
  const qrData = `${baseUrl}/etudiant/${etudiant._id}`;

  useEffect(() => {
    if (qrData) {
      QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
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
    <div className="card-wrapper-pvc">
      <div className="card-container-pvc">
        <div className="header-pvc">
          <div className="logo-section-pvc">
            <div className="logo-pvc">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="logo-img-pvc" />
              ) : (
                'AK'
              )}
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
              <div className="student-photo-pvc">
                {etudiant.image ? (
                  <img 
                    src={etudiant.image.startsWith('http') ? etudiant.image : `${window.location.origin}${etudiant.image}`}
                    alt={etudiant.nomComplet}
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
              <h2 className={`card-title-pvc ${etudiant.cin && showAutorisation ? 'compact' : ''}`}>CARTE D'ÉLÈVE</h2>
              
              <div className="info-row-pvc">
                <span className="info-label-pvc">Nom Complet</span>
                <span className="info-value-pvc">: {etudiant.nomComplet || 'N/A'}</span>
              </div>
              
              {/* Section avec QR Code à côté */}
              <div className="info-with-qr-pvc">
                <div className={`info-left-pvc ${etudiant.cin && showAutorisation ? 'compact' : ''}`}>
                  {/* Afficher CIN si disponible */}
                  {etudiant.cin && (
                    <div className="info-row-pvc">
                      <span className="info-label-pvc">CIN</span>
                      <span className="info-value-pvc">: {etudiant.cin}</span>
                    </div>
                  )}
                  
                  {/* Toujours afficher Code Massar */}
                  <div className="info-row-pvc">
                    <span className="info-label-pvc">Code Massar</span>
                    <span className="info-value-pvc">: {etudiant.codeMassar || 'N/A'}</span>
                  </div>
                  
                  {/* Toujours afficher Niveau */}
                  <div className="info-row-pvc">
                    <span className="info-label-pvc">Niveau</span>
                    <span className="info-value-pvc">: {etudiant.niveau || 'N/A'}</span>
                  </div>
                  
                  {showAutorisation && (
                    <div className="info-row-pvc">
                      <p className="non-autorisation-text-pvc">NON AUTORISÉ </p>
                    </div>
                  )}
                </div>

                {/* QR Code à droite */}
                <div className="qr-side-pvc">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt="QR Code" 
                      className="qrcode-small-pvc"
                    />
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

export default StudentBadge;