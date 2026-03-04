import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Eye, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import './SuiviAssiduiteEtudiants.css';
import Sidebar from '../components/Sidebar'; // ✅ استيراد صحيح

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

const SuiviAssiduiteEtudiants = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [etudiantsFiltres, setEtudiantsFiltres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presences, setPresences] = useState([]);
  const [rapports, setRapports] = useState([]);
  
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [filtreCours, setFiltreCours] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [etudiantSelectionne, setEtudiantSelectionne] = useState(null);

  const niveauxDisponibles = [
    "1AC", "2AC", "3AC", "Tronc Commun", "1BAC SC", "1BAC Économie", "2BAC PC", "2BAC Économie"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filtrerEtudiants();
  }, [etudiants, recherche, filtreNiveau, filtreCours]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [etudiantsRes, presencesRes, rapportsRes] = await Promise.all([
        axios.get('/api/suivi-assiduites/etudiants', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/suivi-assiduites/presences', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/suivi-assiduites/rapports', { headers }).catch(() => ({ data: [] }))
      ]);

      setEtudiants(etudiantsRes.data);
      setPresences(presencesRes.data || []);
      setRapports(rapportsRes.data || []);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setEtudiants([]);
      setPresences([]);
      setRapports([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les stats pour chaque étudiant
  const etudiantsAvecStats = useMemo(() => {
    return etudiants.map(etudiant => {
      const presenceEtudiant = presences.filter(p => 
        p.etudiant === etudiant._id || p.etudiant?._id === etudiant._id
      );
      
      const rapportEtudiant = rapports.filter(r =>
        r.etudiant === etudiant._id || r.etudiant?._id === etudiant._id
      );

      const absences = presenceEtudiant.filter(p => !p.present).length;
      const retards = presenceEtudiant.filter(p => p.retardMinutes > 0).length;

      return {
        ...etudiant,
        absences,
        retards,
        rapportsCount: rapportEtudiant.length,
        rapportsList: rapportEtudiant,
        presenceTotalCount: presenceEtudiant.length
      };
    });
  }, [etudiants, presences, rapports]);

  const filtrerEtudiants = () => {
    let resultats = etudiantsAvecStats;

    if (recherche) {
      resultats = resultats.filter(e =>
        (e.nomComplet && e.nomComplet.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.email && e.email.toLowerCase().includes(recherche.toLowerCase()))
      );
    }

    if (filtreNiveau) {
      resultats = resultats.filter(e => e.niveau === filtreNiveau);
    }

    if (filtreCours) {
      resultats = resultats.filter(e =>
        Array.isArray(e.cours) && e.cours.some(c => c === filtreCours)
      );
    }

    setEtudiantsFiltres(resultats);
  };

  const coursUniques = useMemo(() => {
    return [...new Set(etudiants.flatMap(e => Array.isArray(e.cours) ? e.cours : []))].filter(Boolean);
  }, [etudiants]);

  const handleExportExcel = () => {
    try {
      // Préparer les données
      const donnees = etudiantsFiltres.map(e => ({
        'Étudiant': e.nomComplet,
        'Email': e.email,
        'Niveau': e.niveau,
        'Classe': Array.isArray(e.cours) ? e.cours.join('; ') : '-',
        'Absences': e.absences,
        'Retards': e.retards,
        'Séances': e.presenceTotalCount,
        'Rapports': e.rapportsCount
      }));

      // Créer le workbook
      const ws = XLSX.utils.json_to_sheet(donnees);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assiduités');

      // Ajuster les largeurs de colonnes
      ws['!cols'] = [
        { wch: 25 }, // Étudiant
        { wch: 25 }, // Email
        { wch: 12 }, // Niveau
        { wch: 20 }, // Classe
        { wch: 12 }, // Absences
        { wch: 12 }, // Retards
        { wch: 10 }, // Séances
        { wch: 10 }  // Rapports
      ];

      // Télécharger
      XLSX.writeFile(wb, `Assiduites_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      console.error('Erreur export:', err);
      alert('Erreur lors de l\'export: ' + err.message);
    }
  };

  const openModal = (etudiant) => {
    setEtudiantSelectionne(etudiant);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEtudiantSelectionne(null);
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="page-container" style={{
      background: 'linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%)',
      minHeight: '100vh',
      padding: '30px 20px'
    }}>        <Sidebar onLogout={handleLogout} />

      <div className="main-wrapper" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div className="header-section" style={{
          background: 'white',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '25px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ 
            margin: '0 0 25px 0', 
            color: '#1e3a8a',
            fontSize: '28px',
            fontWeight: '700'
          }}>
            📊 Suivi des Absences et Retards
          </h1>

          {/* FILTRES ET BOUTON EXPORT */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            flexWrap: 'wrap', 
            alignItems: 'flex-end',
            justifyContent: 'space-between'
          }}>
            {/* FILTRES */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              flexWrap: 'wrap', 
              alignItems: 'flex-end',
              flex: 1
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Rechercher:</label>
                <input
                  type="text"
                  placeholder="Nom ou email..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Niveau:</label>
                <select
                  value={filtreNiveau}
                  onChange={(e) => setFiltreNiveau(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Tous</option>
                  {niveauxDisponibles.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Classe:</label>
                <select
                  value={filtreCours}
                  onChange={(e) => setFiltreCours(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Toutes</option>
                  {coursUniques.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setRecherche('');
                  setFiltreNiveau('');
                  setFiltreCours('');
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Réinitialiser
              </button>
            </div>

            {/* BOUTON EXPORT */}
            <button
              onClick={handleExportExcel}
              style={{
                background: '#0369a1',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Download size={18} />
              Exporter Excel
            </button>
          </div>

          <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '15px' }}>
            Total: {etudiantsFiltres.length} étudiant(s)
          </div>
        </div>

        {/* TABLEAU */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
              color: 'white',
              position: 'sticky',
              top: 0
            }}>
              <tr>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Étudiant</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Niveau</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Classe</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Absences</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Retards</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Séances</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Rapports</th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {etudiantsFiltres.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    Aucun étudiant trouvé
                  </td>
                </tr>
              ) : (
                etudiantsFiltres.map((e) => (
                  <tr key={e._id} style={{
                    borderBottom: '1px solid #e5e7eb',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(ev) => ev.currentTarget.style.background = '#f9fafb'}
                     onMouseLeave={(ev) => ev.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '15px', fontWeight: '600', color: '#111827' }}>
                      <div>{e.nomComplet}</div>
                      <small style={{ color: '#6b7280', fontSize: '12px' }}>{e.email}</small>
                    </td>
                    <td style={{ padding: '15px' }}>{e.niveau}</td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {Array.isArray(e.cours) && e.cours.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                          {e.cours.map((c, i) => (
                            <span key={i} style={{
                              background: '#dbeafe',
                              color: '#0c4a6e',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        background: '#fee2e2',
                        color: '#7f1d1d',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        minWidth: '45px'
                      }}>
                        {e.absences}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        background: '#fef3c7',
                        color: '#78350f',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        minWidth: '45px'
                      }}>
                        {e.retards}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>
                      {e.presenceTotalCount}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        background: '#ddd6fe',
                        color: '#3730a3',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        minWidth: '45px'
                      }}>
                        {e.rapportsCount}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {(e.absences > 0 || e.retards > 0 || e.rapportsCount > 0) ? (
                        <button
                          onClick={() => openModal(e)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                        >
                          <Eye size={14} />
                          Voir
                        </button>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DÉTAILS */}
      {showModal && etudiantSelectionne && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={closeModal}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
              color: 'white',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {etudiantSelectionne.nomComplet}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '28px',
                  cursor: 'pointer',
                  fontWeight: '300'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Info personnelles */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: '700' }}>
                  📌 Informations
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '15px'
                }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Email</label>
                    <div style={{ color: '#111827', marginTop: '4px', fontSize: '14px' }}>
                      {etudiantSelectionne.email}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Niveau</label>
                    <div style={{ color: '#111827', marginTop: '4px', fontSize: '14px' }}>
                      {etudiantSelectionne.niveau}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats globales */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: '700' }}>
                  📊 Statistiques
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px'
                }}>
                  <div style={{
                    background: '#fee2e2',
                    padding: '15px',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                      Absences
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#7f1d1d' }}>
                      {etudiantSelectionne.absences}
                    </div>
                  </div>
                  <div style={{
                    background: '#fef3c7',
                    padding: '15px',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                      Retards
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#78350f' }}>
                      {etudiantSelectionne.retards}
                    </div>
                  </div>
                  <div style={{
                    background: '#dbeafe',
                    padding: '15px',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                      Séances
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#0c4a6e' }}>
                      {etudiantSelectionne.presenceTotalCount}
                    </div>
                  </div>
                  <div style={{
                    background: '#ddd6fe',
                    padding: '15px',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                      Rapports
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#3730a3' }}>
                      {etudiantSelectionne.rapportsCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Classes */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: '700' }}>
                  📚 Classes
                </h4>
                {Array.isArray(etudiantSelectionne.cours) && etudiantSelectionne.cours.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {etudiantSelectionne.cours.map((c, i) => (
                      <span key={i} style={{
                        background: '#dbeafe',
                        color: '#0c4a6e',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af' }}>Aucune classe</span>
                )}
              </div>

              {/* Rapports */}
              {etudiantSelectionne.rapportsCount > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: '700' }}>
                    📋 Rapports Disciplinaires
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {etudiantSelectionne.rapportsList.slice(0, 5).map((r, i) => (
                      <div key={i} style={{
                        background: '#fef3c7',
                        padding: '12px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #f59e0b'
                      }}>
                        <div style={{ fontSize: '13px', color: '#78350f', fontWeight: '600' }}>
                          {new Date(r.date).toLocaleDateString('fr-FR')} - {r.cours}
                        </div>
                        <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                          {r.descriptionIncident}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              padding: '15px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeModal}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiviAssiduiteEtudiants;