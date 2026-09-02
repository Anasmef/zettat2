import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import Sidebar from '../components/Sidebar';
import SidebarManager from '../components/Sidebarmanager';
import logoKastler from '../assets/logo-kastler.png';
import logoMaroc from '../assets/logo-maroc.png';
import {
  Heart, Phone, User, AlertTriangle, CheckCircle,
  Save, ArrowLeft, Clock, FileWarning, Download
} from 'lucide-react';
import './FicheSante.css';

const FicheSante = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role');
  const SidebarComponent = userRole === 'manager' || userRole === 'paiement_manager' ? SidebarManager : Sidebar;
  const pdfRef = useRef(null); // template caché, exactement comme la feuille papier

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [etudiantIntrouvable, setEtudiantIntrouvable] = useState(false);
  const [etudiantInfo, setEtudiantInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [dernierModifiePar, setDernierModifiePar] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const [data, setData] = useState({
    contactUrgenceNom: '',
    contactUrgenceLien: '',
    contactUrgenceTel: '',
    asthme: false,
    diabete: false,
    ellipse: false,
    migraine: false,
    hernie: false,
    varicelle: false,
    rougeole: false,
    troubleComportement: false,
    troubleComportementType: '',
    troubleAttention: false,
    troubleAttentionType: '',
    santeMentale: '',
    autre: '',
    hospitalise: false,
    hospitaliseDate: '',
    hospitaliseDescription: '',
    suiviProfessionnel: false,
    suiviProfessionnelDetails: ''
  });

  useEffect(() => {
    chargerFiche();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const chargerFiche = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/etudiants/${id}/fiche-sante`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEtudiantInfo(res.data.etudiant || null);
      setData(prev => ({ ...prev, ...res.data.data }));
      setDernierModifiePar(res.data.dernierModifiePar || '');
      setUpdatedAt(res.data.updatedAt || null);
      setEtudiantIntrouvable(false);

    } catch (err) {
      if (err.response?.status === 404) {
        setEtudiantIntrouvable(true);
      } else {
        console.error('Erreur chargement fiche santé:', err);
        setMessage('❌ Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (champ, valeur) => {
    setData(prev => ({ ...prev, [champ]: valeur }));
  };

  const handleEnregistrer = async (marquerComplet) => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/etudiants/${id}/fiche-sante`,
        { data, complet: marquerComplet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('✅ Fiche santé enregistrée avec succès');
      chargerFiche();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      setMessage('❌ Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const calculerAge = (dateNaissance) => {
    if (!dateNaissance) return '';
    const dob = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const handleTelechargerPDF = () => {
    const element = pdfRef.current;
    const options = {
      margin: 0,
      filename: `fiche_sante_${etudiantInfo?.nomComplet || 'etudiant'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(options).from(element).save();
  };

  // ---------- Case a cocher style papier (pour le formulaire visible) ----------
  const ChampOuiNon = ({ label, valeur, onChange }) => (
    <div className="fs-champ-ouinon">
      <span className="fs-champ-label">{label}</span>
      <div className="fs-toggle-group">
        <button type="button" className={`fs-toggle-btn ${valeur ? 'active' : ''}`} onClick={() => onChange(true)}>OUI</button>
        <button type="button" className={`fs-toggle-btn ${!valeur ? 'active' : ''}`} onClick={() => onChange(false)}>NON</button>
      </div>
    </div>
  );

  // ---------- Case a cocher style papier (pour le template PDF) ----------
  const CasePDF = ({ coche }) => (
    <span className="pdf-case">{coche ? '☑' : '☐'}</span>
  );

  if (loading) {
    return (
      <div className="fs-page">
        <SidebarComponent />
        <div className="fs-loading">
          <div className="fs-spinner"></div>
          <p>Chargement de la fiche santé...</p>
        </div>
      </div>
    );
  }

  if (etudiantIntrouvable) {
    return (
      <div className="fs-page">
        <SidebarComponent />
        <div className="fs-container">
          <div className="fs-empty-state">
            <FileWarning size={40} />
            <h2>Étudiant non trouvé</h2>
            <p>Il faut d'abord inscrire l'étudiant dans le système avant de pouvoir remplir sa fiche de santé.</p>
            <button className="fs-btn fs-btn-primary" onClick={() => navigate('/manager/etudiants')}>
              Aller à la liste des étudiants
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fs-page">
      <SidebarComponent />

      <div className="fs-container">
        {/* En-tête compact : tout sur une seule barre */}
        <div className="fs-header">
          <div className="fs-header-left">
            <button className="fs-btn-retour" onClick={() => navigate('/manager/etudiants')}>
              <ArrowLeft size={16} /> Retour
            </button>
            <div className="fs-header-title">
              <Heart size={20} />
              <div>
                <h1>Fiche de Santé</h1>
                {etudiantInfo && <p>{etudiantInfo.nomComplet}</p>}
              </div>
            </div>
          </div>
          <div className="fs-header-logos">
            <img src={logoKastler} alt="Alfred Kastler" className="fs-logo" />
            <img src={logoMaroc} alt="Royaume du Maroc" className="fs-logo" />
          </div>
        </div>

        {message && (
          <div className={`fs-message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>
        )}

        {dernierModifiePar && (
          <div className="fs-info-derniere-modif">
            <Clock size={14} />
            Dernière modification par <strong>{dernierModifiePar}</strong>
            {updatedAt && <> le {new Date(updatedAt).toLocaleDateString('fr-FR')}</>}
          </div>
        )}

        {/* Sections en grille 2 colonnes pour tenir sur un seul écran */}
        <div className="fs-sections-grid">

          {/* Contact d'urgence */}
          <div className="fs-section">
            <div className="fs-section-header"><Phone size={16} /><h2>Contact d'urgence</h2></div>
            <div className="fs-grid-3">
              <div className="fs-field">
                <label>Nom complet</label>
                <input type="text" value={data.contactUrgenceNom} onChange={e => handleChange('contactUrgenceNom', e.target.value)} placeholder="Nom et prénom" />
              </div>
              <div className="fs-field">
                <label>Lien avec l'enfant</label>
                <input type="text" value={data.contactUrgenceLien} onChange={e => handleChange('contactUrgenceLien', e.target.value)} placeholder="Père, mère, oncle..." />
              </div>
              <div className="fs-field">
                <label>Téléphone</label>
                <input type="text" value={data.contactUrgenceTel} onChange={e => handleChange('contactUrgenceTel', e.target.value)} placeholder="06XXXXXXXX" />
              </div>
            </div>
          </div>

          {/* Situation de santé */}
          <div className="fs-section">
            <div className="fs-section-header"><AlertTriangle size={16} /><h2>Situation de santé</h2></div>
            <div className="fs-conditions-list">
              <ChampOuiNon label="Asthme" valeur={data.asthme} onChange={v => handleChange('asthme', v)} />
              <ChampOuiNon label="Diabète" valeur={data.diabete} onChange={v => handleChange('diabete', v)} />
              <ChampOuiNon label="Ellipse (épilepsie)" valeur={data.ellipse} onChange={v => handleChange('ellipse', v)} />
              <ChampOuiNon label="Migraine" valeur={data.migraine} onChange={v => handleChange('migraine', v)} />
              <ChampOuiNon label="Hernie" valeur={data.hernie} onChange={v => handleChange('hernie', v)} />
              <ChampOuiNon label="Varicelle" valeur={data.varicelle} onChange={v => handleChange('varicelle', v)} />
              <ChampOuiNon label="Rougeole" valeur={data.rougeole} onChange={v => handleChange('rougeole', v)} />
            </div>
          </div>

          {/* Comportement */}
          <div className="fs-section">
            <div className="fs-section-header"><User size={16} /><h2>Comportement et attention</h2></div>
            <ChampOuiNon label="Trouble de comportement" valeur={data.troubleComportement} onChange={v => handleChange('troubleComportement', v)} />
            {data.troubleComportement && (
              <div className="fs-sous-choix">
                <button type="button" className={`fs-chip ${data.troubleComportementType === 'opposition' ? 'active' : ''}`} onClick={() => handleChange('troubleComportementType', 'opposition')}>Opposition</button>
                <button type="button" className={`fs-chip ${data.troubleComportementType === 'agressivite' ? 'active' : ''}`} onClick={() => handleChange('troubleComportementType', 'agressivite')}>Agressivité</button>
              </div>
            )}
            <ChampOuiNon label="Trouble déficitaire de l'attention" valeur={data.troubleAttention} onChange={v => handleChange('troubleAttention', v)} />
            {data.troubleAttention && (
              <div className="fs-sous-choix">
                <button type="button" className={`fs-chip ${data.troubleAttentionType === 'avec' ? 'active' : ''}`} onClick={() => handleChange('troubleAttentionType', 'avec')}>Avec hyperactivité</button>
                <button type="button" className={`fs-chip ${data.troubleAttentionType === 'sans' ? 'active' : ''}`} onClick={() => handleChange('troubleAttentionType', 'sans')}>Sans hyperactivité</button>
              </div>
            )}
            <div className="fs-spacer" />
            <div className="fs-field fs-field-full">
              <label>Santé mentale (précisions)</label>
              <textarea rows={2} value={data.santeMentale} onChange={e => handleChange('santeMentale', e.target.value)} placeholder="Précisions si nécessaire..." />
            </div>
            <div className="fs-spacer" />
            <div className="fs-field fs-field-full">
              <label>Autre</label>
              <textarea rows={2} value={data.autre} onChange={e => handleChange('autre', e.target.value)} placeholder="Toute autre information pertinente..." />
            </div>
          </div>

          {/* Antécédents */}
          <div className="fs-section">
            <div className="fs-section-header"><CheckCircle size={16} /><h2>Antécédents médicaux</h2></div>
            <ChampOuiNon label="A-t-il été hospitalisé ou eu un accident ?" valeur={data.hospitalise} onChange={v => handleChange('hospitalise', v)} />
            {data.hospitalise && (
              <>
                <div className="fs-spacer" />
                <div className="fs-grid-2">
                  <div className="fs-field">
                    <label>Date</label>
                    <input type="date" value={data.hospitaliseDate ? data.hospitaliseDate.slice(0, 10) : ''} onChange={e => handleChange('hospitaliseDate', e.target.value)} />
                  </div>
                  <div className="fs-field">
                    <label>Description</label>
                    <input type="text" value={data.hospitaliseDescription} onChange={e => handleChange('hospitaliseDescription', e.target.value)} placeholder="Description brève" />
                  </div>
                </div>
              </>
            )}
            <div className="fs-spacer" />
            <ChampOuiNon label="Suivi régulièrement par un professionnel de santé ?" valeur={data.suiviProfessionnel} onChange={v => handleChange('suiviProfessionnel', v)} />
            {data.suiviProfessionnel && (
              <>
                <div className="fs-spacer" />
                <div className="fs-field fs-field-full">
                  <label>Précisions</label>
                  <input type="text" value={data.suiviProfessionnelDetails} onChange={e => handleChange('suiviProfessionnelDetails', e.target.value)} placeholder="Psychologue, orthophoniste..." />
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Actions */}
      <div className="fs-actions-bar">
        <button className="fs-btn fs-btn-secondary" onClick={handleTelechargerPDF}>
          <Download size={16} /> Télécharger PDF
        </button>
        <button className="fs-btn fs-btn-secondary" disabled={saving} onClick={() => handleEnregistrer(false)}>
          <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer (brouillon)'}
        </button>
        <button className="fs-btn fs-btn-primary" disabled={saving} onClick={() => handleEnregistrer(true)}>
          <CheckCircle size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer et marquer complète'}
        </button>
      </div>

      {/* ============================================================
          TEMPLATE CACHÉ - reproduction exacte de la feuille papier
          Utilisé UNIQUEMENT pour générer le PDF (jamais affiché à l'écran)
          ============================================================ */}
      <div className="pdf-hidden-wrapper">
        <div className="pdf-page" ref={pdfRef}>
          {/* En-tête avec les 2 logos */}
          <div className="pdf-header">
            <img src={logoMaroc} alt="Royaume du Maroc" className="pdf-logo-maroc" />
            <h1 className="pdf-titre">Fiche de santé</h1>
            <img src={logoKastler} alt="Alfred Kastler" className="pdf-logo-kastler" />
          </div>

          {/* Nom / prénom / âge */}
          <div className="pdf-ligne-info">
            <span>Nom <span className="pdf-pointilles">{etudiantInfo?.nomComplet || ''}</span></span>
            <span>âge <span className="pdf-pointilles pdf-pointilles-court">{calculerAge(etudiantInfo?.dateNaissance)}</span></span>
          </div>
          <div className="pdf-ligne-info">
            <span>Père <span className="pdf-pointilles">{etudiantInfo?.nomCompletPere || ''}</span></span>
            <span>téléphone <span className="pdf-pointilles pdf-pointilles-court">{etudiantInfo?.telephonePere || ''}</span></span>
          </div>
          <div className="pdf-ligne-info">
            <span>Mère <span className="pdf-pointilles">{etudiantInfo?.nomCompletMere || ''}</span></span>
            <span>téléphone <span className="pdf-pointilles pdf-pointilles-court">{etudiantInfo?.telephoneMere || ''}</span></span>
          </div>

          <h2 className="pdf-soustitre pdf-centre">Contacts d'urgence.</h2>
          <div className="pdf-ligne-info">
            <span>Nom : <span className="pdf-pointilles pdf-pointilles-court">{data.contactUrgenceNom}</span></span>
            <span>Lien avec l'enfant : <span className="pdf-pointilles pdf-pointilles-court">{data.contactUrgenceLien}</span></span>
            <span>tél <span className="pdf-pointilles pdf-pointilles-court">{data.contactUrgenceTel}</span></span>
          </div>

          <h2 className="pdf-soustitre">Situation de santé (antécédents médicaux /besoin particuliers)</h2>

          {/* Tableau maladies */}
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-th-gauche">Souffre-t-il ?</th>
                <th>OUI</th>
                <th>NON</th>
                <th className="pdf-th-gauche">&nbsp;</th>
                <th>OUI</th>
                <th>NON</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Asthme</td>
                <td className="pdf-td-case"><CasePDF coche={data.asthme} /></td>
                <td className="pdf-td-case"><CasePDF coche={!data.asthme} /></td>
                <td>Hernie</td>
                <td className="pdf-td-case"><CasePDF coche={data.hernie} /></td>
                <td className="pdf-td-case"><CasePDF coche={!data.hernie} /></td>
              </tr>
              <tr>
                <td>Diabète</td>
                <td className="pdf-td-case"><CasePDF coche={data.diabete} /></td>
                <td className="pdf-td-case"><CasePDF coche={!data.diabete} /></td>
                <td>Varicelle</td>
                <td className="pdf-td-case"><CasePDF coche={data.varicelle} /></td>
                <td className="pdf-td-case"><CasePDF coche={!data.varicelle} /></td>
              </tr>
              <tr>
                <td>Ellipse</td>
                <td className="pdf-td-case"><CasePDF coche={data.ellipse} /></td>
                <td className="pdf-td-case"><CasePDF coche={!data.ellipse} /></td>
                <td>Rougeole</td>
                <td className="pdf-td-case"><CasePDF coche={data.rougeole} /></td>
                <td className="pdf-td-case"><CasePDF coche={!data.rougeole} /></td>
              </tr>
              <tr>
                <td>Migraine</td>
                <td className="pdf-td-case"><CasePDF coche={data.migraine} /></td>
                <td className="pdf-td-case"><CasePDF coche={!data.migraine} /></td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>

          {/* Trouble de comportement */}
          <div className="pdf-ligne-check">
            <span>Trouble de comportement <CasePDF coche={data.troubleComportement} /></span>
            <span><CasePDF coche={data.troubleComportementType === 'opposition'} /> Opposition</span>
            <span><CasePDF coche={data.troubleComportementType === 'agressivite'} /> Agressivité</span>
          </div>
          <div className="pdf-ligne-precisez">Précisez : {data.troubleComportementType ? '' : '-'.repeat(60)}</div>

          <div className="pdf-ligne-check">
            <span>Trouble déficitaire de l'attention</span>
            <span><CasePDF coche={data.troubleAttentionType === 'avec'} /> avec hyperactivité</span>
            <span><CasePDF coche={data.troubleAttentionType === 'sans'} /> sans hyperactivité</span>
          </div>
          <div className="pdf-ligne-precisez">Précisez :{'-'.repeat(60)}</div>

          <div className="pdf-ligne-simple">Santé mentale</div>
          <div className="pdf-ligne-precisez">Précisez : {data.santeMentale || '-'.repeat(60)}</div>

          <div className="pdf-ligne-precisez">Autre : {data.autre || '-'.repeat(70)}</div>

          <div className="pdf-texte-italique">
            Précisez la sévérité de l'atteinte, fréquence des symptômes, traitement ou toutes
            informations pertinentes :(s'il est en attente d'un diagnostic, l'indiquer ici svp) :
          </div>

          <div className="pdf-ligne-check">
            <span>A-t-il été hospitalisé ou eu un accident ou subit une intervention chirurgicale ?</span>
          </div>
          <div className="pdf-ligne-check">
            <span><CasePDF coche={data.hospitalise} /> OUI</span>
            <span><CasePDF coche={!data.hospitalise} /> NON</span>
          </div>
          <div className="pdf-ligne-precisez">
            SI oui, date {data.hospitaliseDate ? new Date(data.hospitaliseDate).toLocaleDateString('fr-FR') : '-'.repeat(15)}
            &nbsp;&nbsp;Description {data.hospitaliseDescription || '-'.repeat(20)}
          </div>

          <div className="pdf-ligne-check">
            <span>Est-il suivi régulièrement par un professionnel de la santé ?</span>
            <span><CasePDF coche={data.suiviProfessionnel} /> OUI</span>
            <span><CasePDF coche={!data.suiviProfessionnel} /> NON</span>
          </div>
          <div className="pdf-ligne-precisez">
            SI oui, précisez : {data.suiviProfessionnelDetails || '-'.repeat(50)}
          </div>

          <div className="pdf-note-bas">
            (Dans professionnel de la santé est inclut : psychologue, chiropraticien, ostéopathe, etc.)
          </div>

          <div className="pdf-footer">
            WWW.KASTLER.MA - TEL : 05 22 600 700 - GSM :06 61 07 90 60 / EMAIL : Info@kastler.ma
          </div>
        </div>
      </div>
    </div>
  );
};

export default FicheSante;