import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  GraduationCap,
  Lock,
  School,
  Clock,
  Users,
  BookOpen,
  CreditCard,
  Plus,
  AlertTriangle,
  Wallet,
  FileText,
  Calendar,
  ClipboardList,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Home,
  User,
  Shield,
  QrCode,
  Newspaper,
  UserPlus,
  DollarSign,
  Settings
} from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Get user role from localStorage
  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role || '');
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      if (!mobile) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      closeSidebar();
    }
  };

  // Navigation items for Admin
  const adminNavigationItems = [
    {
      path: '/admin',
      label: 'Dashboard',
      icon: Home
    },
    {
      path: '/update-profil',
      label: 'Profil',
      icon: Shield,
    },
    {
      path: '/liste-classe',
      label: 'Classes',
      icon: BookOpen
    },
    {
      path: '/liste-etudiants',
      label: 'Étudiants',
      icon: Users
    },
    {
      path: '/liste-professeurs',
      label: 'Professeurs',
      icon: User
    },
    {
      path: '/admin/qr-generator',
      label: 'QR Code Generator',
      icon: QrCode
    },
    {
      path: '/admin/pointages',
      label: 'Gestion Professeurs',
      icon: Users
    },
    


    {
      path: '/admin/historique-etudiant',
      label: 'Historique Étudiant',
      icon: BookOpen
    },
    {
      path: '/admin/reclamations',
      label: 'Réclamations',
      icon: MessageCircle
    },
    {
      path: '/ajouter-paiement',
      label: 'Nouveau Paiement',
      icon: Plus
    },
    {
      path: '/liste-paiements',
      label: 'Paiements',
      icon: CreditCard
    },
    {
      path: '/paiements-exp',
      label: 'Paiements Expirés',
      icon: AlertTriangle
    },
    {
      path: '/admin/seances',
      label: 'Séances',
      icon: Clock
    },
    {
      path: '/admin/messages',
      label: 'Messages',
      icon: MessageCircle
    },
    {
      path: '/calendrier',
      label: 'Calendrier',
      icon: Calendar
    },
    {
      path: '/liste-presences',
      label: 'Liste Présences',
      icon: ClipboardList
    },
    {
      path: '/admin/autorisations',
      label: 'Autorisations',
      icon: Lock
    },
    {
      path: '/admin/rapports',
      label: 'Rapports',
      icon: FileText
    },
    {
      path: '/admin/Bulletin',
      label: 'Bulletin',
      icon: FileText
    },
    {
      path: '/badge-generator',
      label: 'Badge Generator',
      icon: QrCode
    },
    {
      path: '/admin/gestionnaire-paiement',
      label: 'Manager',
      icon: Wallet
    },
    {
      path: '/admin/inscripteur',
      label: 'Inscripteurs',
      icon: UserPlus
    }
  ];

  // Navigation items for Inscripteur (extended permissions)
  const inscripteurNavigationItems = [
    {
      path: '/admin/inscripteurs',
      label: 'Dashboard',
      icon: Home
    },
    {
      path: '/liste-classe',
      label: 'Classes',
      icon: BookOpen
    },
    {
      path: '/liste-etudiants',
      label: 'Étudiants',
      icon: Users
    },
    {
      path: '/liste-professeurs',
      label: 'Professeurs',
      icon: User
    },
    {
      path: '/admin/seances',
      label: 'Séances',
      icon: Clock
    },
    {
      path: '/calendrier',
      label: 'Calendrier',
      icon: Calendar
    },
    {
      path: '/liste-presences',
      label: 'Liste Présences',
      icon: ClipboardList
    }
  ];

  // Navigation items for Paiement Manager
  const paiementManagerNavigationItems = [
    {
      path: '/manager',
      label: 'Dashboard',
      icon: Home
    },
    {
      path: '/admin/Manager',
      label: 'Gestion Prix',
      icon: Settings
    },
    {
      path: '/ajouter-paiement',
      label: 'Nouveau Paiement',
      icon: Plus
    },
    {
      path: '/liste-paiements',
      label: 'Liste Paiements',
      icon: CreditCard
    },
    {
      path: '/paiements-exp',
      label: 'Paiements Expirés',
      icon: AlertTriangle
    }
  ];

  // Get navigation items based on role
  const getNavigationItems = () => {
    switch (userRole) {
      case 'admin':
        return adminNavigationItems;
      case 'inscripteur':
        return inscripteurNavigationItems;
      case 'paiement_manager':
        return paiementManagerNavigationItems;
      default:
        return adminNavigationItems; // Default fallback
    }
  };

  const navigationItems = getNavigationItems();

  // Get sidebar title based on role
  const getSidebarTitle = () => {
    switch (userRole) {
      case 'admin':
        return 'Alfred Kastler - Admin';
      case 'inscripteur':
        return 'Alfred Kastler - Inscripteur';
      case 'prof':
        return 'Alfred Kastler - Professeur';
      case 'etudiant':
        return 'Alfred Kastler - Étudiant';
      case 'paiement_manager':
        return 'Alfred Kastler - Manager';
      default:
        return 'Alfred Kastler';
    }
  };

  // Get header color based on role
  const getHeaderGradient = () => {
    switch (userRole) {
      case 'admin':
        return 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
      case 'inscripteur':
        return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      case 'prof':
        return 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
      case 'etudiant':
        return 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
      case 'paiement_manager':
        return 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'; // Même bleu que admin
      default:
        return 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
    }
  };

  // Get role display name
  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'admin':
        return 'Administrateur';
      case 'inscripteur':
        return 'Inscripteur';
      case 'prof':
        return 'Professeur';
      case 'etudiant':
        return 'Étudiant';
      case 'paiement_manager':
        return 'Gestionnaire';
      default:
        return 'Utilisateur';
    }
  };

  // Get role icon
  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin':
        return GraduationCap;
      case 'inscripteur':
        return UserPlus;
      case 'prof':
        return User;
      case 'etudiant':
        return GraduationCap;
      case 'paiement_manager':
        return DollarSign;
      default:
        return GraduationCap;
    }
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    closeSidebar();
  };

  const RoleIcon = getRoleIcon();

  return (
    <div>
      <style jsx>{`
        /* Variables CSS */
        :root {
          --sidebar-width: 280px;
          --sidebar-bg: #ffffff;
          --sidebar-border: #e5e7eb;
          --sidebar-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          --primary-color: #4f46e5; /* Couleur bleue pour tous les rôles */
          --primary-hover: #4338ca;
          --primary-light: #eef2ff;
          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --text-muted: #9ca3af;
          --hover-bg: #f9fafb;
          --active-bg: #eef2ff; /* Couleur bleue pour tous les rôles */
          --border-radius: 12px;
          --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          --header-gradient: ${getHeaderGradient()};
          --logout-color: #dc2626;
          --logout-hover: #b91c1c;
          --logout-bg: #fef2f2;
        }

        /* Reset and base styles */
        * {
          box-sizing: border-box;
        }

        /* Toggle Button */
        .sidebar-toggle {
          position: fixed;
          top: 20px;
          left: ${isOpen ? 'calc(var(--sidebar-width) + 20px)' : '20px'};
          z-index: 1001;
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 12px;
          border-radius: var(--border-radius);
          box-shadow: var(--sidebar-shadow);
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
        }

        @media (max-width: 768px) {
          .sidebar-toggle {
            left: 20px !important;
          }
        }

        .sidebar-toggle:hover {
          background: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        /* Overlay pour mobile */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
          opacity: 0;
          visibility: hidden;
          transition: var(--transition);
        }

        .sidebar-overlay.show {
          opacity: 1;
          visibility: visible;
        }

        /* Sidebar principal */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--sidebar-border);
          box-shadow: var(--sidebar-shadow);
          z-index: 999;
          display: flex;
          flex-direction: column;
          transition: var(--transition);
          overflow: hidden;
          transform: translateX(-100%);
        }

        .sidebar.show {
          transform: translateX(0);
        }

        /* Header de la sidebar */
        .sidebar-header {
          padding: 24px 20px;
          background: var(--header-gradient);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }

        .sidebar-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100px;
          height: 100px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          transform: translate(50%, 50%);
        }

        .sidebar-header::after {
          content: '';
          position: absolute;
          bottom: -25%;
          left: -25%;
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: ${userRole === 'inscripteur' ? '18px' : '20px'};
          font-weight: 700;
          color: white;
          margin: 0;
          position: relative;
          z-index: 1;
          flex-direction: column;
          text-align: center;
        }

        .sidebar-title .header-icon {
          width: 32px;
          height: 32px;
          padding: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
          backdrop-filter: blur(10px);
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 20px 16px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--sidebar-border) transparent;
        }

        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--sidebar-border);
          border-radius: 2px;
        }

        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Items de navigation */
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          border-radius: 12px;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }

        .nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--primary-color);
          transform: scaleY(0);
          transition: var(--transition);
          border-radius: 0 4px 4px 0;
        }

        .nav-item:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
          transform: translateX(4px);
        }

        .nav-item:hover::before {
          transform: scaleY(0.6);
        }

        .nav-item:hover .nav-icon-wrapper {
          background: #e5e7eb;
          transform: scale(1.05);
        }

        .nav-item:hover .nav-icon {
          transform: scale(1.1);
        }

        .nav-item.active {
          background: var(--active-bg);
          color: var(--primary-color);
          font-weight: 600;
          border-right: 4px solid var(--primary-color);
        }

        .nav-item.active::before {
          transform: scaleY(1);
        }

        .nav-item.active .nav-icon-wrapper {
          background: #c7d2fe; /* Couleur bleue pour tous les rôles */
        }

        .nav-item.active .nav-icon {
          color: var(--primary-color);
        }

        .nav-item.active::after {
          content: '';
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: var(--primary-color);
          border-radius: 50%;
        }

        .nav-icon-wrapper {
          width: 32px;
          height: 32px;
          background: #f3f4f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          flex-shrink: 0;
        }

        .nav-icon {
          width: 18px;
          height: 18px;
          transition: var(--transition);
        }

        /* Section déconnexion */
        .logout-section {
          padding: 16px;
          border-top: 1px solid var(--sidebar-border);
          background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.02));
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          color: var(--logout-color);
          font-size: 14px;
          font-weight: 500;
          border-radius: 12px;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
          font-family: inherit;
        }

        .logout-btn:hover {
          background: var(--logout-bg);
          transform: translateY(-1px);
        }

        .logout-btn:hover .logout-icon-wrapper {
          background: #fecaca;
          transform: scale(1.05);
        }

        .logout-btn:hover .logout-icon {
          transform: scale(1.1) rotate(-5deg);
        }

        .logout-icon-wrapper {
          width: 32px;
          height: 32px;
          background: #fee2e2;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          flex-shrink: 0;
        }

        .logout-icon {
          width: 18px;
          height: 18px;
          transition: var(--transition);
        }

        /* Responsive Design */
        @media (min-width: 769px) {
          .sidebar.show {
            transform: translateX(0);
          }
          
          .sidebar-overlay {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .sidebar-overlay.show {
            display: block;
          }
        }

        /* États de focus pour l'accessibilité */
        .nav-item:focus,
        .logout-btn:focus,
        .sidebar-toggle:focus {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }

        /* Animations d'entrée */
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .sidebar.show {
          animation: slideInLeft 0.3s ease-out;
        }

        .sidebar-overlay.show {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* Toggle Button */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isMobile && (
        <div
          className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'show' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">
          
            Alfred Kastler
            <span className="role-badge">
              {getRoleDisplayName()}
            </span>
          </h3>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                >
                  <div className="nav-icon-wrapper">
                    <IconComponent className="nav-icon" />
                  </div>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="logout-section">
          <button onClick={handleLogout} className="logout-btn">
            <div className="logout-icon-wrapper">
              <LogOut className="logout-icon" />
            </div>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;