import React from 'react';

const BlankStudentCardVerso = () => {
  const downloadPNG = async () => {
    const cardElement = document.querySelector('.card-container-verso');
    
    // Utiliser html2canvas pour capturer l'élément
    const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm')).default;
    
    const canvas = await html2canvas(cardElement, {
      scale: 3,
      backgroundColor: '#ffffff',
      logging: false,
      width: 324,
      height: 204
    });
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'carte-etudiant-verso-pvc.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f3f4f6',
      padding: '20px',
      gap: '20px'
    }}>
      <style>{`
        .card-wrapper-verso {
          display: flex;
          justify-content: 'center',
          alignItems: 'center',
          margin: 10px;
          padding: 0;
        }

        .card-container-verso {
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%),
                      url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><filter id="noise"><feTurbulence baseFrequency="0.9" numOctaves="4"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.03"/></svg>');
          width: 324px;
          height: 204px;
          overflow: hidden;
          position: relative;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          margin: 0;
          padding: 0;
        }

        .header-verso {
          background: #dc2626;
          height: 6px;
          position: relative;
        }

        .header-verso::before {
          content: '';
          position: absolute;
          left: 20px;
          right: 20px;
          top: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 20px
          );
        }

        .card-body-verso {
          padding: 20px 15px;
          position: relative;
          background: transparent;
          height: calc(100% - 12px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .decorative-circles-verso {
          position: absolute;
          left: 15px;
          top: 20px;
          opacity: 0.1;
          display: flex;
          gap: 4px;
        }

        .circle-verso {
          width: 8px;
          height: 8px;
          background: #dc2626;
          border-radius: 50%;
        }

        .logo-watermark-verso {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 120px;
          height: 120px;
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 80px;
          font-weight: 900;
          background: linear-gradient(to bottom, #dc2626 0%, #991b1b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .instructions-section-verso {
          z-index: 1;
        }

        .instructions-title-verso {
          color: #dc2626;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 2px solid #dc2626;
        }

        .instruction-item-verso {
          display: flex;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 8px;
          color: #1f2937;
          align-items: flex-start;
        }

        .instruction-bullet-verso {
          width: 5px;
          height: 5px;
          background: #dc2626;
          border-radius: 50%;
          margin-top: 3px;
          flex-shrink: 0;
        }

        .instruction-text-verso {
          flex: 1;
          line-height: 1.4;
          font-weight: 600;
        }

        .footer-section-verso {
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .footer-contact-verso {
          font-size: 6px;
          color: #dc2626;
          font-weight: 700;
          text-align: center;
          line-height: 1.4;
        }

        .footer-accent-verso {
          height: 6px;
          background: #dc2626;
          position: relative;
        }

        .footer-accent-verso::before {
          content: '';
          position: absolute;
          left: 20px;
          right: 20px;
          top: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 20px
          );
        }

        @media screen and (max-width: 768px) {
          .card-container-verso {
            transform: scale(1.5);
            margin: 50px;
          }
        }

        @media screen and (max-width: 480px) {
          .card-container-verso {
            transform: scale(1);
            margin: 10px;
          }
        }

        @media print {
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }

          .card-wrapper-verso {
            margin: 0;
            page-break-inside: avoid;
          }

          .card-container-verso {
            width: 85.6mm;
            height: 54mm;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .header-verso,
          .footer-accent-verso {
            background: #dc2626 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="card-wrapper-verso">
        <div className="card-container-verso">
          <div className="header-verso"></div>

          <div className="card-body-verso">
            <div className="decorative-circles-verso">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="circle-verso"></div>
              ))}
            </div>

            <div className="logo-watermark-verso">AK</div>

            <div className="instructions-section-verso">
              <h3 className="instructions-title-verso">Instructions importantes</h3>
              
              <div className="instruction-item-verso">
                <div className="instruction-bullet-verso"></div>
                <div className="instruction-text-verso">
                  Cette carte est strictement personnelle et ne peut être prêtée
                </div>
              </div>

              <div className="instruction-item-verso">
                <div className="instruction-bullet-verso"></div>
                <div className="instruction-text-verso">
                  Doit être présentée à chaque entrée dans l'établissement
                </div>
              </div>

              <div className="instruction-item-verso">
                <div className="instruction-bullet-verso"></div>
                <div className="instruction-text-verso">
                  En cas de perte ou de vol, prévenir immédiatement l'administration
                </div>
              </div>

              <div className="instruction-item-verso">
                <div className="instruction-bullet-verso"></div>
                <div className="instruction-text-verso">
                  Toute dégradation entraînera le remplacement aux frais de l'étudiant
                </div>
              </div>
            </div>

            <div className="footer-section-verso">
              <div className="footer-contact-verso">
                Téléphone : 05 22 62 81 82 • 05 20 46 94 69 • 05 22 60 07 00 | Email : contact@kastler.ma
              </div>
            </div>
          </div>

          <div className="footer-accent-verso"></div>
        </div>
      </div>

      <button
        onClick={downloadPNG}
        style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(220, 38, 38, 0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#b91c1c';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 12px rgba(220, 38, 38, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#dc2626';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
        }}
      >
        📥 Télécharger PNG pour PVC
      </button>
    </div>
  );
};

export default BlankStudentCardVerso;