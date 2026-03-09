import React, { useState, useEffect } from 'react';
import { QrCode, Users, Clock, Trash2, CheckCircle, AlertTriangle, Download, Plus, BarChart3, Eye } from 'lucide-react';
import SidebarProf from '../components/Sidebarmanager';

const AdminQRPage = () => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pointages, setPointages] = useState(null);
  const [qrCodesActifs, setQrCodesActifs] = useState([]);

  useEffect(() => {
    fetchPointages();
    fetchQRCodesActifs();
    const interval = setInterval(() => {
      fetchPointages();
      fetchQRCodesActifs();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPointages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/pointages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPointages(await res.json());
    } catch (error) { console.error('Erreur pointages:', error); }
  };

  const fetchQRCodesActifs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/qr-codes-actifs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrCodesActifs(data.qrCodesActifs);
      }
    } catch (error) { console.error('Erreur QR codes:', error); }
  };

  const genererQR = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: description || `Pointage du ${new Date().toLocaleDateString('fr-FR')}` })
      });
      const data = await res.json();
      if (data.success) {
        setQrCode(data.qrCode);
        setMessage({ type: 'success', text: data.message || 'QR Code généré avec succès!' });
        fetchQRCodesActifs();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setLoading(false);
    }
  };

  const supprimerQR = async (qrId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/qr-code/${qrId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'QR Code supprimé' });
        fetchQRCodesActifs();
        if (qrCode && qrCode.id === qrId) setQrCode(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur suppression' });
    }
  };

  const telechargerQR = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.download = `qr-pointage-${new Date().toISOString().split('T')[0]}.png`;
    link.href = qrCode.dataURL;
    link.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f3e8ff 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .qr-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 16px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
          animation: fadeIn 0.4s ease;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102,126,234,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          font-size: 15px;
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .btn-danger {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: background 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .btn-danger:hover { background: #dc2626; }

        .btn-download {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          margin-top: 12px;
        }
        .btn-download:hover { transform: translateY(-1px); }

        .qr-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background: white;
          transition: border-color 0.2s;
          outline: none;
          box-sizing: border-box;
        }
        .qr-input:focus { border-color: #667eea; }

        .stat-card {
          text-align: center;
          padding: 16px 12px;
          border-radius: 14px;
          color: white;
        }
        .stat-value { font-size: 26px; font-weight: 700; margin-bottom: 2px; }
        .stat-label { font-size: 12px; font-weight: 500; opacity: 0.9; }

        .pointage-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 8px;
          transition: background 0.2s;
        }
        .pointage-row:hover { background: rgba(248,250,252,0.9) !important; }

        /* ===== RESPONSIVE ===== */
        .page-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px 16px;
        }

        .page-header {
          text-align: center;
          padding: 28px 20px;
          margin-bottom: 24px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .qr-active-item {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.3);
          border-left: 4px solid #10b981;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 14px;
        }

        .qr-active-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .qr-active-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .qr-image-wrapper {
          margin-top: 24px;
          padding: 20px;
          text-align: center;
          background: rgba(255,255,255,0.6);
          border-radius: 14px;
          border: 2px dashed rgba(102,126,234,0.3);
        }

        .pointage-info { flex: 1; min-width: 0; }
        .pointage-name { font-weight: 600; color: #1a202c; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pointage-email { font-size: 13px; color: #64748b; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pointage-times { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
        .time-block { text-align: right; }
        .time-label { font-size: 11px; color: #64748b; margin-bottom: 2px; }
        .time-value { font-size: 14px; font-weight: 600; }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .section-title h2, .section-title h3 {
          margin: 0;
          color: #1a202c;
          font-size: 20px;
          font-weight: 700;
        }

        .badge {
          background: #667eea;
          color: white;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        /* Tablet */
        @media (max-width: 900px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
          .page-header h1 { font-size: 24px; }
        }

        /* Mobile */
        @media (max-width: 600px) {
          .page-wrapper { padding: 12px; }
          .page-header { padding: 20px 16px; margin-bottom: 16px; }
          .page-header h1 { font-size: 20px; }
          .page-header p { font-size: 13px; }
          .qr-card { border-radius: 12px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-value { font-size: 22px; }
          .stat-card { padding: 12px 8px; }
          .pointage-row { padding: 12px; }
          .pointage-times { gap: 10px; }
          .time-value { font-size: 13px; }
          .main-grid { gap: 16px; }
          .qr-active-header { flex-direction: column; }
          .btn-danger { width: 100%; justify-content: center; }
          .qr-image-wrapper img { width: 160px !important; height: 160px !important; }
          .section-title h2, .section-title h3 { font-size: 17px; }
        }

        @media (max-width: 380px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .stat-value { font-size: 20px; }
        }
      `}</style>

      <SidebarProf onLogout={handleLogout} />

      <div className="page-wrapper">

        {/* ── HEADER ── */}
        <div className="qr-card page-header">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            marginBottom: '16px'
          }}>
            <QrCode size={32} color="white" />
          </div>
          <h1 style={{
            margin: '0 0 8px 0', fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Générateur QR Code
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
            Système de pointage — UN QR par jour (20 heures)
          </p>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="main-grid">

          {/* ── COLONNE GAUCHE : Génération ── */}
          <div className="qr-card" style={{ padding: '24px' }}>
            <div className="section-title">
              <Plus size={22} color="#667eea" />
              <h2>QR Code du Jour</h2>
            </div>

            {/* Message */}
            {message.text && (
              <div style={{
                padding: '14px 16px', borderRadius: '10px', marginBottom: '20px',
                backgroundColor: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: message.type === 'success' ? '#15803d' : '#dc2626',
                border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500'
              }}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                {message.text}
              </div>
            )}

            {/* Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>
                Description (Optionnel)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ex: Pointage matinée"
                className="qr-input"
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                ⚠️ Un seul QR code par jour, valable 20 heures
              </p>
            </div>

            {/* Bouton */}
            <button onClick={genererQR} disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  Génération...
                </>
              ) : (
                <><QrCode size={18} /> Générer / Récupérer QR du Jour</>
              )}
            </button>

            {/* QR Code affiché */}
            {qrCode && (
              <div className="qr-image-wrapper">
                <img src={qrCode.dataURL} alt="QR Code" style={{ width: '190px', height: '190px', borderRadius: '12px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }} />
                <div style={{ marginTop: '14px' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0' }}>
                    <strong>Description :</strong> {qrCode.description}
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0' }}>
                    <strong>Expire le :</strong> {new Date(qrCode.expiresAt).toLocaleString('fr-FR')}
                  </p>
                  <button onClick={telechargerQR} className="btn-download">
                    <Download size={15} /> Télécharger
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── COLONNE DROITE : Stats + QR actifs ── */}
          <div>

            {/* Stats */}
            {pointages && (
              <div className="qr-card" style={{ padding: '24px', marginBottom: '20px' }}>
                <div className="section-title">
                  <BarChart3 size={22} color="#667eea" />
                  <h3>Statistiques du Jour</h3>
                </div>

                <div className="stats-grid">
                  <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                    <div className="stat-value">{pointages.stats.presents}</div>
                    <div className="stat-label">Présents</div>
                  </div>
                  <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}>
                    <div className="stat-value">{pointages.stats.absents}</div>
                    <div className="stat-label">Absents</div>
                  </div>
                  <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}>
                    <div className="stat-value">{pointages.stats.sansSortie || 0}</div>
                    <div className="stat-label">Sans Sortie</div>
                  </div>
                  <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
                    <div className="stat-value">{pointages.stats.tauxPresence}%</div>
                    <div className="stat-label">Taux Présence</div>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginTop: '12px', marginBottom: 0, fontWeight: '500' }}>
                  Total : {pointages.stats.totalProfesseurs} professeurs
                </p>
              </div>
            )}

            {/* QR Codes Actifs */}
            <div className="qr-card" style={{ padding: '24px' }}>
              <div className="section-title">
                <Clock size={22} color="#667eea" />
                <h3>QR Code Actif</h3>
                <span className="badge">{qrCodesActifs.length}</span>
              </div>

              {qrCodesActifs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '32px 16px', background: 'rgba(248,250,252,0.8)', borderRadius: '12px' }}>
                  <QrCode size={44} style={{ marginBottom: '12px', opacity: 0.4 }} />
                  <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '500' }}>Aucun QR code actif</p>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>Générez le QR code du jour</p>
                </div>
              ) : (
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {qrCodesActifs.map((qr) => (
                    <div key={qr.id} className="qr-active-item">
                      <div className="qr-active-header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '600', color: '#1a202c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {qr.description}
                          </h4>
                          <div className="qr-active-meta">
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} /> {qr.tempsRestant} min restantes
                            </span>
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Eye size={13} /> {qr.scansCount} scans
                            </span>
                          </div>
                        </div>
                        <button onClick={() => supprimerQR(qr.id)} className="btn-danger">
                          <Trash2 size={13} /> Supprimer
                        </button>
                      </div>

                      {/* Barre de progression */}
                      <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(226,232,240,0.8)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.max(0, Math.min(100, (qr.tempsRestant / 1200) * 100))}%`,
                          height: '100%',
                          background: qr.tempsRestant < 120 ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                                       qr.tempsRestant < 300 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                       'linear-gradient(90deg, #10b981, #059669)',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── POINTAGES RÉCENTS ── */}
        {pointages && pointages.pointages.length > 0 && (
          <div className="qr-card" style={{ padding: '24px' }}>
            <div className="section-title">
              <Users size={22} color="#667eea" />
              <h3>Pointages Récents</h3>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {pointages.pointages.slice(0, 10).map((pointage, index) => (
                <div
                  key={index}
                  className="pointage-row"
                  style={{ backgroundColor: index % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'rgba(255,255,255,0.8)' }}
                >
                  <div className="pointage-info">
                    <div className="pointage-name">{pointage.nomProfesseur}</div>
                    <div className="pointage-email">{pointage.emailProfesseur}</div>
                  </div>

                  <div className="pointage-times">
                    <div className="time-block">
                      <div className="time-label">Entrée</div>
                      <div className="time-value" style={{ color: '#10b981' }}>{pointage.heureEntree}</div>
                    </div>
                    <div className="time-block">
                      <div className="time-label">Sortie</div>
                      <div className="time-value" style={{ color: pointage.heureSortie ? '#ef4444' : '#9ca3af' }}>
                        {pointage.heureSortie || '--:--'}
                      </div>
                    </div>
                    {pointage.tempsPresence > 0 && (
                      <div style={{
                        fontSize: '12px', padding: '5px 10px', borderRadius: '20px', fontWeight: '600',
                        backgroundColor: 'rgba(59,130,246,0.1)', color: '#2563eb', whiteSpace: 'nowrap'
                      }}>
                        {Math.floor(pointage.tempsPresence / 60)}h {pointage.tempsPresence % 60}min
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQRPage;