import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  User, Phone, Mail, MapPin, Calendar, CreditCard, 
  Book, Users, CheckCircle, XCircle, Truck, School, 
  Award, Home, Briefcase, Loader
} from 'lucide-react';

const EtudiantPublic = () => {
  const { id } = useParams();
  const [etudiant, setEtudiant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEtudiant();
  }, [id]);

  const fetchEtudiant = async () => {
    try {
      setLoading(true);
      setError('');

      // ⚠️ ROUTE PUBLIQUE - Sans authentification
      const response = await fetch(`http://localhost:5000/api/etudiants/public/${id}`);

      if (!response.ok) {
        throw new Error('Étudiant non trouvé');
      }

      const data = await response.json();
      setEtudiant(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const InfoItem = ({ icon: Icon, label, value, highlight }) => (
    <div style={styles.infoItem}>
      <div style={styles.infoItemHeader}>
        <Icon size={16} color="#6b7280" />
        <span style={styles.infoLabel}>{label}</span>
      </div>
      <span style={highlight ? styles.infoValueHighlight : styles.infoValue}>
        {value || 'Non renseigné'}
      </span>
    </div>
  );

  const StatusBadge = ({ active, label }) => (
    <div style={{
      ...styles.statusBadge,
      backgroundColor: active ? '#dcfce7' : '#fee2e2',
      color: active ? '#166534' : '#991b1b',
      border: `2px solid ${active ? '#86efac' : '#fecaca'}`
    }}>
      {active ? <CheckCircle size={16} /> : <XCircle size={16} />}
      <span>{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <Loader size={48} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
          <h2 style={styles.loadingTitle}>Chargement...</h2>
          <p style={styles.loadingText}>Récupération des informations de l'étudiant</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <XCircle size={60} color="#dc2626" />
          <h2 style={styles.errorTitle}>Erreur</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (!etudiant) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <User size={60} color="#9ca3af" />
          <h2 style={styles.errorTitle}>Étudiant non trouvé</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* En-tête avec logo de l'école */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.schoolLogo}>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Alfred_Kastler.jpg/220px-Alfred_Kastler.jpg" 
              alt="Alfred Kastler" 
              style={styles.logoImage}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div style={styles.logoFallback}>
              <School size={32} color="white" />
            </div>
          </div>
          <div style={styles.headerText}>
            <h1 style={styles.headerTitle}>École Alfred Kastler</h1>
            <p style={styles.headerSubtitle}>Fiche Étudiant</p>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          {/* En-tête étudiant */}
          <div style={styles.studentHeader}>
            <div style={styles.studentAvatar}>
              {etudiant.image ? (
                <img src={etudiant.image} alt={etudiant.nomComplet} style={styles.avatarImage} />
              ) : (
                <User size={50} color="white" strokeWidth={2} />
              )}
            </div>
            <div style={styles.studentInfo}>
              <h2 style={styles.studentName}>{etudiant.nomComplet}</h2>
              <div style={styles.badgeRow}>
                {etudiant.niveau && (
                  <span style={styles.levelBadge}>{etudiant.niveau}</span>
                )}
                {etudiant.codeMassar && (
                  <span style={styles.massarBadge}>{etudiant.codeMassar}</span>
                )}
              </div>
            </div>
          </div>

          {/* Statuts */}
          <div style={styles.statusSection}>
            <StatusBadge active={etudiant.autorise} label="Autorisé" />
            <StatusBadge active={etudiant.actif} label="Actif" />
            {etudiant.transport && (
              <div style={styles.transportBadge}>
                <Truck size={16} />
                <span>Transport</span>
              </div>
            )}
          </div>

          {/* Identité */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <User size={20} /> Identité
            </h3>
            <div style={styles.infoGrid}>
              <InfoItem icon={User} label="Genre" value={etudiant.genre} />
              <InfoItem icon={Calendar} label="Date de naissance" value={formatDate(etudiant.dateNaissance)} />
              <InfoItem icon={MapPin} label="Lieu de naissance" value={etudiant.lieuNaissance} />
              <InfoItem icon={Award} label="Nationalité" value={etudiant.nationalite} />
            </div>
          </div>

          {/* Scolarité */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <School size={20} /> Scolarité
            </h3>
            <div style={styles.infoGrid}>
              <InfoItem icon={Book} label="Niveau" value={etudiant.niveau} highlight />
              <InfoItem icon={Calendar} label="Année scolaire" value={etudiant.anneeScolaire || '2025/2026'} />
              <InfoItem icon={CreditCard} label="Code Massar" value={etudiant.codeMassar} highlight />
            </div>
            {etudiant.cours && etudiant.cours.length > 0 && (
              <div style={styles.coursSection}>
                <span style={styles.coursLabel}>Cours inscrits:</span>
                <div style={styles.coursGrid}>
                  {etudiant.cours.map((cours, index) => (
                    <span key={index} style={styles.coursTag}>{cours}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact Étudiant */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Phone size={20} /> Contact Étudiant
            </h3>
            <div style={styles.infoGrid}>
              <InfoItem icon={Phone} label="Téléphone" value={etudiant.telephoneEtudiant} />
              <InfoItem icon={Mail} label="Email" value={etudiant.email} />
              <InfoItem icon={Home} label="Adresse" value={etudiant.adresse} />
            </div>
          </div>

          {/* Contact Père */}
          {(etudiant.nomCompletPere || etudiant.telephonePere) && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                👨 Contact du Père
              </h3>
              <div style={styles.parentCard}>
                <div style={styles.infoGrid}>
                  <InfoItem icon={User} label="Nom complet" value={etudiant.nomCompletPere} />
                  <InfoItem icon={Phone} label="Téléphone" value={etudiant.telephonePere} />
                  <InfoItem icon={Briefcase} label="Profession" value={etudiant.travailPere} />
                </div>
              </div>
            </div>
          )}

          {/* Contact Mère */}
          {(etudiant.nomCompletMere || etudiant.telephoneMere) && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                👩 Contact de la Mère
              </h3>
              <div style={styles.parentCard}>
                <div style={styles.infoGrid}>
                  <InfoItem icon={User} label="Nom complet" value={etudiant.nomCompletMere} />
                  <InfoItem icon={Phone} label="Téléphone" value={etudiant.telephoneMere} />
                  <InfoItem icon={Briefcase} label="Profession" value={etudiant.travailMere} />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={styles.footer}>
            <School size={14} />
            <span>École Alfred Kastler - Informations à jour le {formatDate(new Date())}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },

  header: {
    background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)',
    padding: '24px 20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  headerContent: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  schoolLogo: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: '3px solid rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
  },

  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  logoFallback: {
    display: 'none',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
  },

  headerSubtitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
  },

  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },

  studentHeader: {
    background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  studentAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid rgba(255, 255, 255, 0.5)',
    flexShrink: 0,
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  studentInfo: {
    flex: 1,
  },

  studentName: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
    wordBreak: 'break-word',
  },

  badgeRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  levelBadge: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
  },

  massarBadge: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
  },

  statusSection: {
    display: 'flex',
    gap: '10px',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap',
  },

  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '600',
  },

  transportBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '600',
    border: '2px solid #93c5fd',
  },

  section: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },

  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 16px 0',
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
  },

  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  infoItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  infoLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    wordBreak: 'break-word',
  },

  infoValueHighlight: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#6366f1',
  },

  parentCard: {
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '12px',
  },

  coursSection: {
    marginTop: '16px',
  },

  coursLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block',
  },

  coursGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },

  coursTag: {
    padding: '6px 12px',
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 24px',
    backgroundColor: '#f8fafc',
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
  },

  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },

  loadingCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },

  loadingTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '16px 0 8px 0',
  },

  loadingText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },

  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },

  errorCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },

  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '16px 0 8px 0',
  },

  errorText: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },
};

export default EtudiantPublic;