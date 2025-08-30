import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { 
  Users, GraduationCap, UserCheck, UserX, TrendingUp, AlertTriangle,
  UserPlus, BookOpen, Shield
} from 'lucide-react';
import './AdminDashboard.css'; // Réutilise les mêmes styles
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

const InscripteurDashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'inscripteur') {
      navigate('/');
    }
  }, [navigate]);
  
  const [inscripteur, setInscripteur] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalEtudiants: 0,
    etudiantsActifs: 0,
    etudiantsInactifs: 0,
    totalCours: 0,
    totalProfesseurs: 0,
    professeursActifs: 0,
    nouveauxCeMois: 0,
    tauxActivite: 0
  });
  const [chartData, setChartData] = useState({
    coursStats: [],
    genreStats: [],
    niveauStats: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token manquant - veuillez vous reconnecter');
        setLoading(false);
        return;
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('Début de récupération des données inscripteur...');

      // Récupération des données avec les permissions inscripteur
      const [etudiantsRes, coursRes, professeursRes] = await Promise.all([
        fetch('/api/etudiants', { headers }),
        fetch('/api/cours', { headers }),
        fetch('/api/professeurs', { headers })
      ]);

      // Vérification des statuts
      if (!etudiantsRes.ok) throw new Error(`Erreur étudiants: ${etudiantsRes.status}`);
      if (!coursRes.ok) throw new Error(`Erreur cours: ${coursRes.status}`);
      if (!professeursRes.ok) throw new Error(`Erreur professeurs: ${professeursRes.status}`);

      // Conversion en JSON
      const etudiants = await etudiantsRes.json();
      const cours = await coursRes.json();
      const professeurs = await professeursRes.json();

      console.log('Données récupérées:', {
        etudiants: etudiants.length,
        cours: cours.length,
        professeurs: professeurs.length
      });

      // Validation des données
      const etudiantsValid = Array.isArray(etudiants) ? etudiants : [];
      const coursValid = Array.isArray(cours) ? cours : [];
      const professeursValid = Array.isArray(professeurs) ? professeurs : [];

      // Calcul des statistiques
      const etudiantsActifs = etudiantsValid.filter(e => e.actif === true).length;
      const etudiantsInactifs = etudiantsValid.length - etudiantsActifs;
      const professeursActifs = professeursValid.filter(p => p.actif === true).length;

      // Calculer les nouveaux ce mois
      const debutMois = new Date();
      debutMois.setDate(1);
      debutMois.setHours(0, 0, 0, 0);
      
      const nouveauxCeMois = etudiantsValid.filter(e => {
        if (!e.createdAt) return false;
        const dateCreation = new Date(e.createdAt);
        return dateCreation >= debutMois;
      }).length;

      // Calculer le taux d'activité
      const tauxActivite = etudiantsValid.length > 0 ? 
        Math.round((etudiantsActifs / etudiantsValid.length) * 100) : 0;

      const dashboardStats = {
        totalEtudiants: etudiantsValid.length,
        etudiantsActifs,
        etudiantsInactifs,
        totalCours: coursValid.length,
        totalProfesseurs: professeursValid.length,
        professeursActifs,
        nouveauxCeMois,
        tauxActivite
      };

      setDashboardData(dashboardStats);
      console.log('Statistiques calculées:', dashboardStats);

      // Préparation des données pour les graphiques
      prepareChartData(etudiantsValid, coursValid);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError(`Erreur de connexion: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (etudiants, cours) => {
    console.log('Préparation des graphiques inscripteur...');

    // 1. Statistiques par cours (étudiants inscrits)
    const coursStats = cours.map(c => {
      const etudiantsInscrit = etudiants.filter(e => 
        Array.isArray(e.cours) && e.cours.includes(c.nom)
      ).length;
      
      return {
        nom: c.nom.length > 15 ? c.nom.substring(0, 15) + '...' : c.nom,
        nomComplet: c.nom,
        etudiants: etudiantsInscrit
      };
    }).filter(c => c.etudiants > 0);

    // 2. Statistiques par genre
    const hommes = etudiants.filter(e => e.genre === 'Homme').length;
    const femmes = etudiants.filter(e => e.genre === 'Femme').length;
    const genreStats = [
      { name: 'Hommes', value: hommes },
      { name: 'Femmes', value: femmes }
    ].filter(g => g.value > 0);

    // 3. Statistiques par niveau scolaire
    const niveauxCount = {};
    etudiants.forEach(e => {
      if (e.niveau) {
        niveauxCount[e.niveau] = (niveauxCount[e.niveau] || 0) + 1;
      }
    });

    const niveauStats = Object.entries(niveauxCount).map(([niveau, count]) => ({
      name: niveau,
      value: count
    }));

    const chartDataResult = {
      coursStats,
      genreStats,
      niveauStats
    };

    console.log('Données graphiques préparées:', chartDataResult);
    setChartData(chartDataResult);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Chargement du tableau de bord...</p>
          <p className="loading-subtext">Récupération des données</p>
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
              onClick={fetchDashboardData}
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

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle, isPersonal = false }) => (
    <div className={`stat-card ${colorClass} ${isPersonal ? 'personal-stat' : ''}`}>
      <div className="stat-card-content">
        <div className="stat-card-info">
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value">{value || 0}</p>
          {subtitle && (
            <p className="stat-card-subtitle">{subtitle}</p>
          )}
          {isPersonal && (
            <div className="personal-badge">
              <Shield size={12} />
              Vos créations
            </div>
          )}
        </div>
        <div className="stat-card-icon">
          <Icon />
        </div>
      </div>
    </div>
  );

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  return (
    <div className="admin-dashboard" style={{
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #f3e8ff 100%)'
    }}>
      <Sidebar onLogout={handleLogout} />
      <Header />

      <div className="dashboard-container">
        <div className="dashboard-content">
          
          {/* En-tête spécial inscripteur */}
          <div className="inscripteur-header">
            <div className="inscripteur-welcome">
              <UserPlus size={32} />
              <div>
                <h1>Tableau de bord Inscripteur</h1>
                <p>Gérez les inscriptions d'étudiants et professeurs</p>
              </div>
            </div>
          </div>

          {/* Cartes de statistiques principales */}
          <div className="stats-grid">
            <StatCard
              title="Nouveaux ce mois"
              value={dashboardData.nouveauxCeMois}
              icon={UserPlus}
              colorClass="green"
              subtitle="Inscriptions récentes"
            />
            <StatCard
              title="Taux d'Activité"
              value={`${dashboardData.tauxActivite}%`}
              icon={TrendingUp}
              colorClass="purple"
              subtitle="Étudiants actifs/total"
            />
            <StatCard
              title="Total Étudiants"
              value={dashboardData.totalEtudiants}
              icon={Users}
              colorClass="blue"
              subtitle="Dans tout le système"
            />
            <StatCard
              title="Total Professeurs"
              value={dashboardData.totalProfesseurs}
              icon={GraduationCap}
              colorClass="indigo"
              subtitle="Enseignants enregistrés"
            />
          </div>

          {/* Cartes de statistiques générales */}
          <div className="stats-grid">
            <StatCard
              title="Étudiants Actifs"
              value={dashboardData.etudiantsActifs}
              icon={UserCheck}
              colorClass="green"
              subtitle="En cours de formation"
            />
            <StatCard
              title="Professeurs Actifs"
              value={dashboardData.professeursActifs}
              icon={UserCheck}
              colorClass="green"
              subtitle="Enseignants actifs"
            />
            <StatCard
              title="Total Classes"
              value={dashboardData.totalCours}
              icon={BookOpen}
              colorClass="yellow"
              subtitle="Classes disponibles"
            />
            <StatCard
              title="Étudiants Inactifs"
              value={dashboardData.etudiantsInactifs}
              icon={UserX}
              colorClass="gray"
              subtitle="Comptes suspendus"
            />
          </div>

          {/* Actions rapides */}
          <div className="quick-actions-card">
            <h3>Actions Rapides</h3>
            <div className="quick-actions-grid">
              <button 
                className="quick-action-btn blue"
                onClick={() => navigate('/liste-etudiants')}
              >
                <UserPlus size={20} />
                Nouveau Étudiant
              </button>
              <button 
                className="quick-action-btn purple"
                onClick={() => navigate('/liste-professeurs')}
              >
                <GraduationCap size={20} />
                Nouveau Professeur
              </button>
              <button 
                className="quick-action-btn green"
                onClick={() => navigate('/liste-etudiants')}
              >
                <Users size={20} />
                Voir Étudiants
              </button>
              <button 
                className="quick-action-btn indigo"
                onClick={() => navigate('/liste-professeurs')}
              >
                <Users size={20} />
                Voir Professeurs
              </button>
            </div>
          </div>

          {/* Graphiques */}
          <div className="charts-grid">
            {/* Graphique des étudiants par cours */}
            <div className="chart-card">
              <div className="chart-header">
                <BookOpen />
                <h3>Étudiants par Classe</h3>
              </div>
              {chartData.coursStats && chartData.coursStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.coursStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nom" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, 'Étudiants inscrits']}
                      labelFormatter={(label) => {
                        const cours = chartData.coursStats.find(c => c.nom === label);
                        return cours ? cours.nomComplet : label;
                      }}
                    />
                    <Bar dataKey="etudiants" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <BookOpen />
                  <div>
                    <h4>Aucune classe avec étudiants</h4>
                    <p>Commencez par inscrire des étudiants</p>
                  </div>
                </div>
              )}
            </div>

            {/* Graphique niveau scolaire */}
            <div className="chart-card">
              <div className="chart-header">
                <GraduationCap />
                <h3>Répartition par Niveau</h3>
              </div>
              {chartData.niveauStats && chartData.niveauStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.niveauStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.niveauStats.map((entry, index) => (
                        <Cell key={`cell-niveau-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <GraduationCap />
                  <div>
                    <h4>Aucune donnée de niveau</h4>
                    <p>Les niveaux apparaîtront après inscription</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Graphique genre */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <Users />
                <h3>Répartition par Genre</h3>
              </div>
              {chartData.genreStats && chartData.genreStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.genreStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.genreStats.map((entry, index) => (
                        <Cell key={`cell-gender-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <Users />
                  <div>
                    <h4>Aucun étudiant enregistré</h4>
                    <p>Commencez par ajouter des étudiants</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Résumé performance */}
          <div className="summary-card inscripteur-summary">
            <h3 className="summary-header">
              <Shield size={24} />
              Résumé Global du Système
            </h3>
            <div className="summary-grid">
              <div className="summary-item green">
                <p className="summary-item-label">Taux d'Occupation</p>
                <p className="summary-item-value">
                  {dashboardData.totalCours ? Math.round((dashboardData.totalEtudiants / (dashboardData.totalCours * 25)) * 100) : 0}%
                </p>
                <p className="summary-item-detail">
                  Classes occupées (base 25/classe)
                </p>
              </div>
              <div className="summary-item purple">
                <p className="summary-item-label">Ratio Prof/Étudiant</p>
                <p className="summary-item-value">
                  {dashboardData.totalProfesseurs ? Math.round(dashboardData.totalEtudiants / dashboardData.totalProfesseurs) : 0}
                </p>
                <p className="summary-item-detail">
                  Étudiants par professeur
                </p>
              </div>
              <div className="summary-item blue">
                <p className="summary-item-label">Croissance Mensuelle</p>
                <p className="summary-item-value">
                  +{dashboardData.nouveauxCeMois}
                </p>
                <p className="summary-item-detail">
                  Nouvelles inscriptions ce mois
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .inscripteur-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          color: white;
        }

        .inscripteur-welcome {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .inscripteur-welcome h1 {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 700;
        }

        .inscripteur-welcome p {
          margin: 0.5rem 0 0 0;
          opacity: 0.9;
        }

        .personal-stat {
          border-left: 4px solid #10B981;
        }

        .personal-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #10B981;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 0.5rem;
        }

        .quick-actions-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .quick-actions-card h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          color: white;
        }

        .quick-action-btn.blue { background: #3B82F6; }
        .quick-action-btn.purple { background: #8B5CF6; }
        .quick-action-btn.green { background: #10B981; }
        .quick-action-btn.indigo { background: #6366F1; }

        .quick-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .inscripteur-summary {
          border-top: 4px solid #667eea;
        }

        .inscripteur-summary .summary-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #667eea;
        }
      `}</style>
    </div>
  );
};

export default InscripteurDashboard;