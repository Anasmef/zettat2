import React, { useEffect, useState } from 'react';
import { DollarSign, Users, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';

const DashboardPaiementManager = () => {
  const [stats, setStats] = useState({
    totalEtudiants: 0,
    etudiantsPayes: 0,
    montantTotal: 0,
    montantCollecte: 0,
    paiementsExpires: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatsFinancieres();
  }, []);

  const fetchStatsFinancieres = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Présent' : 'Absent');
      console.log('URL appelée:', '/api/paiement-manager/stats');
      
      const res = await axios.get('/api/paiement-manager/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Réponse reçue:', res.data);
      setStats(res.data);
      
    } catch (err) {
      console.error('Erreur complète:', err);
      console.error('Status:', err.response?.status);
      console.error('Message:', err.response?.data);
      
      setError(`Erreur ${err.response?.status || 'réseau'}: ${err.response?.data?.message || err.message}`);
      
      // Garder stats à 0 si erreur
      setStats({
        totalEtudiants: 0,
        etudiantsPayes: 0,
        montantTotal: 0,
        montantCollecte: 0,
        paiementsExpires: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-MA').format(montant || 0);
  };

  if (loading) {
    return (
      <div className="dashboard-paiement">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-paiement">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2>Tableau de Bord - Gestionnaire de Paiement</h2>
        <button 
          onClick={fetchStatsFinancieres}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          <strong>Erreur:</strong> {error}
          <br />
          <small>Vérifiez que votre serveur backend tourne sur le port 5000 et que la route existe.</small>
        </div>
      )}
      
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div className="stat-icon" style={{ marginBottom: '16px' }}>
            <Users size={32} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Étudiants Inscrits
            </h3>
            <p className="stat-value" style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: 0, 
              color: '#1f2937' 
            }}>
              {stats.totalEtudiants}
            </p>
            <small style={{ color: '#10b981' }}>
              {stats.etudiantsPayes} payés
            </small>
          </div>
        </div>
        
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div className="stat-icon" style={{ marginBottom: '16px' }}>
            <DollarSign size={32} color="#f59e0b" />
          </div>
          <div className="stat-content">
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Montant Total Attendu
            </h3>
            <p className="stat-value" style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: 0, 
              color: '#1f2937' 
            }}>
              {formatMontant(stats.montantTotal)} DH
            </p>
          </div>
        </div>
        
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div className="stat-icon" style={{ marginBottom: '16px' }}>
            <TrendingUp size={32} color="#10b981" />
          </div>
          <div className="stat-content">
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Montant Collecté
            </h3>
            <p className="stat-value" style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: 0, 
              color: '#1f2937' 
            }}>
              {formatMontant(stats.montantCollecte)} DH
            </p>
            <small style={{ color: '#6b7280' }}>
              {stats.montantTotal > 0 ? 
                Math.round((stats.montantCollecte / stats.montantTotal) * 100) : 0}% collecté
            </small>
          </div>
        </div>
        
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div className="stat-icon" style={{ marginBottom: '16px' }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <div className="stat-content">
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Paiements Expirés
            </h3>
            <p className="stat-value" style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: 0, 
              color: '#1f2937' 
            }}>
              {stats.paiementsExpires}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPaiementManager;