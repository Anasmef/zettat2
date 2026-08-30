import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import {
  Heart, Phone, User, AlertTriangle, CheckCircle,
  Save, ArrowLeft, Clock, FileWarning
} from 'lucide-react';
import './FicheSante.css';

const FicheSante = () => {
  const { id } = useParams(); // id de l'etudiant
  const navigate = useNavigate();

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

  // ---------- Petits composants réutilisables (gros boutons OUI/NON) ----------
  const ChampOuiNon = ({ label, valeur, onChange }) => (
    <div className="fs-champ-ouinon">
      <span className="fs-champ-label">{label}</span>
      <div className="fs-toggle-group">
        <button
          type="button"
          className={`fs-toggle-btn fs-toggle-oui ${valeur ? 'active' : ''}`}
          onClick={() => onChange(true)}
        >
          OUI
        </button>
        <button
          type="button"
          className={`fs-toggle-btn fs-toggle-non ${!valeur ? 'active' : ''}`}
          onClick={() => onChange(false)}
        >
          NON
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fs-page">
        <Sidebar />
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
        <Sidebar />
        <div className="fs-container">
          <div className="fs-empty-state">
            <FileWarning size={64} />
            <h2>Étudiant non trouvé</h2>
            <p>
              Il faut d'abord inscrire l'étudiant dans le système avant de pouvoir
              remplir sa fiche de santé.
            </p>
            <button className="fs-btn fs-btn-primary" onClick={() => navigate('/etudiants')}>
              Aller à la liste des étudiants
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fs-page">
      <Sidebar />

      <div className="fs-container">
        {/* En-tête */}
        <div className="fs-header">
          <button className="fs-btn-retour" onClick={() => navigate('/etudiants')}>
            <ArrowLeft size={22} /> Retour
          </button>
          <div className="fs-header-title">
            <Heart size={32} />
            <div>
              <h1>Fiche de Santé</h1>
              {etudiantInfo && <p>{etudiantInfo.nomComplet}</p>}
            </div>
          </div>
        </div>

        {message && (
          <div className={`fs-message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {dernierModifiePar && (
          <div className="fs-info-derniere-modif">
            <Clock size={18} />
            Dernière modification par <strong>{dernierModifiePar}</strong>
            {updatedAt && <> le {new Date(updatedAt).toLocaleDateString('fr-FR')}</>}
          </div>
        )}

        {/* Contact d'urgence */}
        <div className="fs-section">
          <div className="fs-section-header">
            <Phone size={26} />
            <h2>Contact d'urgence</h2>
          </div>
          <div className="fs-grid-3">
            <div className="fs-field">
              <label>Nom complet</label>
              <input
                type="text"
                value={data.contactUrgenceNom}
                onChange={e => handleChange('contactUrgenceNom', e.target.value)}
                placeholder="Nom et prénom"
              />
            </div>
            <div className="fs-field">
              <label>Lien avec l'enfant</label>
              <input
                type="text"
                value={data.contactUrgenceLien}
                onChange={e => handleChange('contactUrgenceLien', e.target.value)}
                placeholder="Père, mère, oncle..."
              />
            </div>
            <div className="fs-field">
              <label>Téléphone</label>
              <input
                type="text"
                value={data.contactUrgenceTel}
                onChange={e => handleChange('contactUrgenceTel', e.target.value)}
                placeholder="06XXXXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Situation de santé */}
        <div className="fs-section">
          <div className="fs-section-header">
            <AlertTriangle size={26} />
            <h2>Situation de santé</h2>
          </div>

          <div className="fs-grid-2">
            <ChampOuiNon label="Asthme" valeur={data.asthme} onChange={v => handleChange('asthme', v)} />
            <ChampOuiNon label="Diabète" valeur={data.diabete} onChange={v => handleChange('diabete', v)} />
            <ChampOuiNon label="Ellipse (épilepsie)" valeur={data.ellipse} onChange={v => handleChange('ellipse', v)} />
            <ChampOuiNon label="Migraine" valeur={data.migraine} onChange={v => handleChange('migraine', v)} />
            <ChampOuiNon label="Hernie" valeur={data.hernie} onChange={v => handleChange('hernie', v)} />
            <ChampOuiNon label="Varicelle" valeur={data.varicelle} onChange={v => handleChange('varicelle', v)} />
            <ChampOuiNon label="Rougeole" valeur={data.rougeole} onChange={v => handleChange('rougeole', v)} />
          </div>
        </div>

        {/* Trouble du comportement */}
        <div className="fs-section">
          <div className="fs-section-header">
            <User size={26} />
            <h2>Comportement et attention</h2>
          </div>

          <ChampOuiNon
            label="Trouble de comportement"
            valeur={data.troubleComportement}
            onChange={v => handleChange('troubleComportement', v)}
          />
          {data.troubleComportement && (
            <div className="fs-sous-choix">
              <button
                type="button"
                className={`fs-chip ${data.troubleComportementType === 'opposition' ? 'active' : ''}`}
                onClick={() => handleChange('troubleComportementType', 'opposition')}
              >
                Opposition
              </button>
              <button
                type="button"
                className={`fs-chip ${data.troubleComportementType === 'agressivite' ? 'active' : ''}`}
                onClick={() => handleChange('troubleComportementType', 'agressivite')}
              >
                Agressivité
              </button>
            </div>
          )}

          <div className="fs-spacer" />

          <ChampOuiNon
            label="Trouble déficitaire de l'attention"
            valeur={data.troubleAttention}
            onChange={v => handleChange('troubleAttention', v)}
          />
          {data.troubleAttention && (
            <div className="fs-sous-choix">
              <button
                type="button"
                className={`fs-chip ${data.troubleAttentionType === 'avec' ? 'active' : ''}`}
                onClick={() => handleChange('troubleAttentionType', 'avec')}
              >
                Avec hyperactivité
              </button>
              <button
                type="button"
                className={`fs-chip ${data.troubleAttentionType === 'sans' ? 'active' : ''}`}
                onClick={() => handleChange('troubleAttentionType', 'sans')}
              >
                Sans hyperactivité
              </button>
            </div>
          )}

          <div className="fs-field fs-field-full fs-spacer">
            <label>Santé mentale (précisions)</label>
            <textarea
              rows={2}
              value={data.santeMentale}
              onChange={e => handleChange('santeMentale', e.target.value)}
              placeholder="Précisions si nécessaire..."
            />
          </div>

          <div className="fs-field fs-field-full">
            <label>Autre</label>
            <textarea
              rows={2}
              value={data.autre}
              onChange={e => handleChange('autre', e.target.value)}
              placeholder="Toute autre information pertinente..."
            />
          </div>
        </div>

        {/* Hospitalisation */}
        <div className="fs-section">
          <div className="fs-section-header">
            <CheckCircle size={26} />
            <h2>Antécédents médicaux</h2>
          </div>

          <ChampOuiNon
            label="A-t-il été hospitalisé ou eu un accident ?"
            valeur={data.hospitalise}
            onChange={v => handleChange('hospitalise', v)}
          />
          {data.hospitalise && (
            <div className="fs-grid-2 fs-spacer">
              <div className="fs-field">
                <label>Date</label>
                <input
                  type="date"
                  value={data.hospitaliseDate ? data.hospitaliseDate.slice(0, 10) : ''}
                  onChange={e => handleChange('hospitaliseDate', e.target.value)}
                />
              </div>
              <div className="fs-field">
                <label>Description</label>
                <input
                  type="text"
                  value={data.hospitaliseDescription}
                  onChange={e => handleChange('hospitaliseDescription', e.target.value)}
                  placeholder="Description brève"
                />
              </div>
            </div>
          )}

          <div className="fs-spacer" />

          <ChampOuiNon
            label="Suivi régulièrement par un professionnel de santé ?"
            valeur={data.suiviProfessionnel}
            onChange={v => handleChange('suiviProfessionnel', v)}
          />
          {data.suiviProfessionnel && (
            <div className="fs-field fs-field-full fs-spacer">
              <label>Précisions</label>
              <input
                type="text"
                value={data.suiviProfessionnelDetails}
                onChange={e => handleChange('suiviProfessionnelDetails', e.target.value)}
                placeholder="Psychologue, orthophoniste..."
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="fs-actions-bar">
          <button
            className="fs-btn fs-btn-secondary"
            disabled={saving}
            onClick={() => handleEnregistrer(false)}
          >
            <Save size={22} /> {saving ? 'Enregistrement...' : 'Enregistrer (brouillon)'}
          </button>
          <button
            className="fs-btn fs-btn-primary"
            disabled={saving}
            onClick={() => handleEnregistrer(true)}
          >
            <CheckCircle size={22} /> {saving ? 'Enregistrement...' : 'Enregistrer et marquer complète'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FicheSante;