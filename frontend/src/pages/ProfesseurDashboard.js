import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Users, BookOpen, Calendar, UserX, TrendingUp, Award, Clock, Activity, AlertTriangle, User, X } from 'lucide-react';
import './AdminDashboard.css';
import SidebarProf from '../components/SidebarProf';
import { useNavigate } from 'react-router-dom';
import HeaderProf from '../components/Headerprof';
import ModalMessageRapport from '../components/ModalMessageRapport';

const ProfesseurDashboard = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [cours, setCours] = useState([]);
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [professeur, setProfesseur] = useState(null);
  const [showRapportModal, setShowRapportModal] = useState(false);

  const navigate = useNavigate();

  // Fonction pour calculer la tendance de présence par jour
  const calculerTendancePresence = () => {
    const derniersSeptJours = [];
    const aujourdhui = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(aujourdhui);
      date.setDate(date.getDate() - i);
      
      const presencesDuJour = presences.filter(p => {
        const datePresence = new Date(p.date || p.createdAt);
        return datePresence.toDateString() === date.toDateString();
      });
      
      const totalDuJour = presencesDuJour.length;
      const presentsDuJour = presencesDuJour.filter(p => p.present).length;
      const tauxDuJour = totalDuJour > 0 ? Math.round((presentsDuJour / totalDuJour) * 100) : 0;
      
      derniersSeptJours.push({
        jour: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        presence: tauxDuJour,
        date: date.toISOString().split('T')[0]
      });
    }
    
    return derniersSeptJours;
  };

  // Calculs des statistiques en temps réel
  const tendancePresence = calculerTendancePresence();

  // Charger les données
  useEffect(() => {
    const fetchInfos = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (!token || role !== 'prof') {
        navigate('/');
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [resEt, resCours, resPre] = await Promise.all([
          fetch('/api/professeur/etudiants', { headers }),
          fetch('/api/professeur/mes-cours', { headers }),
          fetch('/api/professeur/presences', { headers })
        ]);

        if (resEt.ok) {
          const etudiantsData = await resEt.json();
          setEtudiants(etudiantsData);
        }
        if (resCours.ok) {
          const coursData = await resCours.json();
          setCours(coursData);
        }
        if (resPre.ok) {
          const presencesData = await resPre.json();
          setPresences(presencesData);
        }
      } catch (err) {
        console.error('❌ Erreur chargement:', err);
        setError(`Erreur de connexion: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchInfos();
  }, [navigate]);

  // AFFICHER LE MODAL DE RAPPORTS IMMÉDIATEMENT avant même de charger les données
  useEffect(() => {
    // Afficher le modal des rapports IMMÉDIATEMENT
    setShowRapportModal(true);
    
    const fetchProf = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/professeur/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setProfesseur(data);
        }
      } catch (err) {
        console.error("Erreur de chargement du professeur", err);
      }
    };

    fetchProf();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  const closeRapportModal = () => {
    setShowRapportModal(false);
  };

  // Calculs des statistiques
  const totalCours = cours.length;
  const totalPresences = presences.length;
  const totalEtudiants = etudiants.length;
  const absents = presences.filter(p => !p.present).length;
  const presents = totalPresences - absents;
  const tauxPresenceGlobal = totalPresences > 0 ? Math.round((presents / totalPresences) * 100) : 0;

  // Données pour les graphiques
  const presenceData = [
    { name: 'Présents', value: presents, color: '#22c55e' },
    { name: 'Absents', value: absents, color: '#ef4444' }
  ];

  const tendanceData = tendancePresence.length > 0 ? tendancePresence : Array.from({ length: 7 }, (_, i) => ({
    jour: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
    presence: Math.floor(Math.random() * 20) + 70
  }));

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-card-content">
        <div className="stat-card-info">
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value">{value || 0}</p>
          {subtitle && (
            <p className="stat-card-subtitle">{subtitle}</p>
          )}
        </div>
        <div className="stat-card-icon">
          <Icon />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Chargement des données...</p>
          <p className="loading-subtext">Récupération des informations professeur</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertTriangle className="error-icon" />
          <h2 className="error-title">Erreur de Connexion</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button 
              onClick={() => window.location.reload()}
              className="error-btn primary"
            >
              Réessayer
            </button>
            <button 
              onClick={handleLogout}
              className="error-btn secondary"
            >
              Se reconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" style={{
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)'
    }}>
      <HeaderProf />

      {/* Modal Info Rapports - S'affiche immédiatement */}
      <ModalMessageRapport 
        isOpen={showRapportModal} 
        onClose={closeRapportModal} 
      />

      <SidebarProf onLogout={handleLogout} />
      
      <div className="dashboard-header">
        <div
          className="dashboard-header-content"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="dashboard-title-section" style={{ textAlign: 'center' }}>
          </div>
        </div>
      </div>

      <div 
        className="dashboard-container"
        style={{
          background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)'
        }}
      >
        <div className="dashboard-content">
          {/* Cartes de statistiques principales */}
          <div className="stats-grid">
            <StatCard
              title="Classe Actifs"
              value={totalCours}
              icon={BookOpen}
              colorClass="green"
              subtitle="En cours"
            />
            <StatCard
              title="Séances"
              value={totalPresences}
              icon={Calendar}
              colorClass="purple"
              subtitle="Enregistrées"
            />
            <StatCard
              title="Taux de Présence"
              value={`${tauxPresenceGlobal}%`}
              icon={Activity}
              colorClass="indigo"
              subtitle="Moyenne globale"
            />
          </div>

          {/* Graphique de présence */}
          <div className="chart-card">
            <div className="chart-header">
              <Activity />
              <h3>Répartition des Présences</h3>
            </div>
            {presenceData.some(p => p.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={presenceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {presenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <Activity />
                <div>
                  <h4>Aucune présence enregistrée</h4>
                  <p>Commencez à enregistrer les présences</p>
                </div>
              </div>
            )}
          </div>

          {/* Tendance de présence */}
          <div className="chart-card">
            <div className="chart-header">
              <TrendingUp />
              <h3>Tendance de Présence (7 derniers jours)</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="presence" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Résumé avec données réelles */}
          <div className="summary-card">
            <h3 className="summary-header">
              📊 Résumé en Temps Réel
            </h3>
            <div className="summary-grid">
              <div className="summary-item blue">
                <p className="summary-item-label">Étudiants par classe</p>
                <p className="summary-item-value">
                  {totalCours ? Math.round(totalEtudiants / totalCours) : 0}
                </p>
                <p className="summary-item-detail">
                  {totalEtudiants} étudiants / {totalCours} classe
                </p>
              </div>
              <div className="summary-item green">
                <p className="summary-item-label">Présences Moyennes</p>
                <p className="summary-item-value">
                  {totalEtudiants ? Math.round(totalPresences / totalEtudiants) : 0}
                </p>
                <p className="summary-item-detail">
                  Par étudiant
                </p>
              </div>
              <div className="summary-item purple">
                <p className="summary-item-label">Taux de Réussite</p>
                <p className="summary-item-value">
                  {tauxPresenceGlobal}%
                </p>
                <p className="summary-item-detail">
                  Basé sur les présences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfesseurDashboard;