import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import Sidebar from '../components/Sidebar';
import logoKastler from '../assets/logo-kastler.png';
import logoMaroc from '../assets/logo-maroc.png';
import {
  FileText, CheckCircle, Save, ArrowLeft, Clock, FileWarning, Download,
  BookOpen, UserCheck
} from 'lucide-react';
import './FicheSante.css';
import './Reglement.css';

// ⚠️ Texte retranscrit fidèlement à partir des photos du document papier fourni.
const REGLEMENT_INTRO = "يستند القانون الداخلي للمؤسسة في مرجعياته على مقتضيات المادة 7 من القانون رقم 00.06 بمثابة النظام الأساسي للتعليم المدرسي الخصوصي ويتضمن القواعد العامة لسير المؤسسة بمختلف مرافقها، كما يستند إلى المقتضيات التي جاءت بها المذكرة الوزارية رقم 78 الصادرة في 24 يونيو 2003 بشأن النظام الداخلي بمؤسسات التعليم المدرسي الخصوصي، وهي المقتضيات التي أكدها دفتر التحملات الخاص بفتح أو توسيع أو إدخال أي تغيير على مؤسسات التعليم المدرسي الخصوصي في بابه الثالث البند الخامس عشر. ويندرج وضعه في إطار إرساء علاقة واضحة بين المؤسسة والتلميذ والأسرة وذلك بغية تحقيق الأهداف المسطرة خدمة للتلميذ.";

const REGLEMENT_INTRO_2 = "تخبر إدارة المؤسسة عموم الآباء والأمهات والتلاميذ أن الخضوع للقانون الداخلي إجباري، وكل من خالفه يتعرض لإجراءات تأديبية قد تصل في بعض الأحيان إلى الفصل عن المؤسسة.";

const REGLEMENT_INTRO_3 = "وفيما يلي أهم البنود الواجب اتباعها والالتزام بتطبيقها:";

const REGLEMENT_POINTS = [
  "التواجد بالمؤسسة 10 دقائق على الأقل قبل انطلاق الحصص والخروج والدخول يكون في الوقت المحدد لذلك.",
  "الغياب والتأخير غير مسموح بهما إلا في حالات جد خاصة ويبررا من طرف الأب أو الأم أو ولي الأمر بحجج مقبولة.",
  "يرتدي التلاميذ ملابس تراعي الحشمة والوقار ولا تتعارض مع أعرافنا وأصالتنا وعلى التلميذات ارتداء وزرة.",
  "تفادي الأقمصة ذات الإشارات الرياضية، مهما كان نوعها وكذا رموز الالترات الخاصة بالفرق الرياضية.",
  "تفادي إحضار الهواتف النقالة بصفة نهائية وكذا سماعات الأذن وكل ما يقوم مقامها من أجهزة إلكترونية وكل من ضبط بحوزته، فسيتم سلبها وإيداعها بالإدارة إلى متم السنة الدراسية.",
  "ضرورة احترام الطاقم الإداري والتربوي وجميع مستخدمي وأطر المؤسسة وكل إخلال بضوابط الأدب والاحترام يعرض صاحبه للمسائلة.",
  "يمنع كليا إحضار الآلات الحادة والسجائر والمخدرات وكل ما يدخل في حيز الممنوعات، ومن ضبط بها سيتعرض للطرد مباشرة.",
  "يمنع كليا الخروج من المؤسسة خلال أوقات الاستراحة إلا برخصة مكتوبة من طرف ولي الأمر.",
  "يحق للمؤسسة استدعاء التلاميذ لحصص الدعم والتقوية خارج الجدول الزمني الرسمي.",
  "يمنع كليا الكتابة على الجدران والطاولات وتخريب ممتلكات المؤسسة وكل من ضبط متلبسا يؤدي ثمن ما أفسده.",
  "ضرورة تتبع أبنائكم وبناتكم في المنزل وإعلام الإدارة بكل ملاحظة في حينها، قصد التدخل لتصحيح الوضع في الوقت المناسب. كما أن التلميذ ملزم بإحضار كافة المستلزمات المدرسية.",
  "عدم التجمع أمام أبواب المؤسسة وقت الخروج والانصراف مباشرة إلى البيت حال انتهاء آخر حصة دراسية.",
  "تعتمد المؤسسة نظام التوقيت المستمر وأنماط تعلم مختلفة وفقا للتوجيهات الرسمية والتنظيم التربوي للمؤسسة."
];

const REGLEMENT_PARAGRAPHE = "إن هذا القانون الداخلي يخلي مسؤولية المؤسسة من كل تقصير كما أن قبول تسجيل ابنكم بالمؤسسة رهين بتوقيعه والمصادقة عليه لدى السلطات المحلية، وأن القرارات المتخذة في حق المخالفين نهائية ولا رجعة فيها. ويصب هذا في حفظ مصلحة التلميذ وسلامته البدنية والنفسية وتمكينه من متابعة دراسته في ظروف مواتية وآمنة.";

const REGLEMENT_ENGAGEMENT = "أقر أنني اطلعت على النظام الداخلي للمؤسسة، والتزم مع ابني (ابنتي) على التقيد به واحترامه، كما يحق للمؤسسة في حالة عدم الامتثال له توقيف ابني (ابنتي) عن الدراسة ومنحنا شهادة المغادرة وتغيير المؤسسة فورا.";

const Reglement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [etudiantIntrouvable, setEtudiantIntrouvable] = useState(false);
  const [etudiantInfo, setEtudiantInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [dernierModifiePar, setDernierModifiePar] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const [data, setData] = useState({
    nomSignataire: '',
    accepte: false,
    dateSignature: ''
  });

  useEffect(() => {
    chargerDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const chargerDocument = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/etudiants/${id}/reglement`, {
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
        console.error('Erreur chargement règlement intérieur:', err);
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
      const dataAEnvoyer = { ...data };
      if (marquerComplet && !dataAEnvoyer.dateSignature) {
        dataAEnvoyer.dateSignature = new Date().toISOString().slice(0, 10);
      }
      await axios.put(
        `/api/etudiants/${id}/reglement`,
        { data: dataAEnvoyer, complet: marquerComplet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('✅ Engagement enregistré avec succès');
      chargerDocument();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      setMessage('❌ Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleTelechargerPDF = () => {
    const element = pdfRef.current;
    const options = {
      margin: 0,
      filename: `reglement_interieur_${etudiantInfo?.nomComplet || 'etudiant'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(options).from(element).save();
  };

  if (loading) {
    return (
      <div className="fs-page">
        <Sidebar />
        <div className="fs-loading">
          <div className="fs-spinner"></div>
          <p>Chargement...</p>
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
            <FileWarning size={48} />
            <h2>Étudiant non trouvé</h2>
            <p>Il faut d'abord inscrire l'étudiant dans le système avant de remplir ce document.</p>
            <button className="fs-btn fs-btn-primary" onClick={() => navigate('/liste-etudiants')}>
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
        {/* ============== EN-TÊTE — même structure que FicheSante ============== */}
        <div className="fs-header">
          <div className="fs-header-left">
            <button className="fs-btn-retour" onClick={() => navigate('/liste-etudiants')}>
              <ArrowLeft size={20} /> Retour
            </button>

            <div className="fs-header-title">
              <FileText size={20} />
              <div>
                <h1>Engagement au règlement intérieur</h1>
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
            <Clock size={16} />
            Dernière modification par <strong>{dernierModifiePar}</strong>
            {updatedAt && <> le {new Date(updatedAt).toLocaleDateString('fr-FR')}</>}
          </div>
        )}

        {/* ============== SECTION 1 : Texte du règlement (lecture seule, RTL) ============== */}
        <div className="fs-section reg-texte-arabe" dir="rtl">
          <div className="fs-section-header">
            <BookOpen size={16} />
            <h2>النظام الداخلي — Règlement intérieur</h2>
          </div>

          <div className="reg-titre-boite">
            <h2 className="reg-titre-arabe">الالتزام بالقواعد العامة لسير المؤسسة</h2>
          </div>

          <p className="reg-intro">{REGLEMENT_INTRO}</p>
          <p className="reg-intro">{REGLEMENT_INTRO_2}</p>
          <p className="reg-intro reg-gras">{REGLEMENT_INTRO_3}</p>

          <ol className="reg-liste">
            {REGLEMENT_POINTS.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ol>

          <p className="reg-paragraphe">{REGLEMENT_PARAGRAPHE}</p>
          <p className="reg-paragraphe reg-gras reg-engagement-final">{REGLEMENT_ENGAGEMENT}</p>
        </div>

        {/* ============== SECTION 2 : Signature (formulaire) ============== */}
        <div className="fs-section">
          <div className="fs-section-header">
            <UserCheck size={16} />
            <h2>Signature du parent / tuteur</h2>
          </div>

          <div className="fs-grid-2">
            <div className="fs-field">
              <label>Nom du parent / tuteur signataire</label>
              <input
                type="text"
                value={data.nomSignataire}
                onChange={e => handleChange('nomSignataire', e.target.value)}
                placeholder="Nom et prénom"
              />
            </div>
            <div className="fs-field">
              <label>Date de signature</label>
              <input
                type="date"
                value={data.dateSignature ? String(data.dateSignature).slice(0, 10) : ''}
                onChange={e => handleChange('dateSignature', e.target.value)}
              />
            </div>
          </div>

          <div className="fs-spacer" />

          <div className="fs-champ-ouinon">
            <span className="fs-champ-label">Le parent a pris connaissance et accepte le règlement</span>
            <div className="fs-toggle-group">
              <button
                type="button"
                className={`fs-toggle-btn ${data.accepte ? 'active' : ''}`}
                onClick={() => handleChange('accepte', true)}
              >OUI</button>
              <button
                type="button"
                className={`fs-toggle-btn ${!data.accepte ? 'active' : ''}`}
                onClick={() => handleChange('accepte', false)}
              >NON</button>
            </div>
          </div>
        </div>
      </div>

      {/* ============== BARRE D'ACTIONS — identique à FicheSante ============== */}
      <div className="fs-actions-bar">
        <button className="fs-btn fs-btn-secondary" onClick={handleTelechargerPDF}>
          <Download size={18} /> Télécharger PDF
        </button>
        <button
          className="fs-btn fs-btn-secondary"
          disabled={saving}
          onClick={() => handleEnregistrer(false)}
        >
          <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer (brouillon)'}
        </button>
        <button
          className="fs-btn fs-btn-primary"
          disabled={saving}
          onClick={() => handleEnregistrer(true)}
        >
          <CheckCircle size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer et marquer complète'}
        </button>
      </div>

      {/* ============================================================
          TEMPLATE CACHÉ — reproduction exacte de la feuille papier (RTL)
          (utilisé uniquement par html2pdf)
          ============================================================ */}
      <div className="pdf-hidden-wrapper">
        <div className="pdf-page reg-pdf-page" ref={pdfRef} dir="rtl">
          <div className="pdf-header reg-pdf-header">
            <img src={logoKastler} alt="Alfred Kastler" className="pdf-logo-kastler reg-pdf-logo" />
            <img src={logoMaroc} alt="Royaume du Maroc" className="pdf-logo-maroc reg-pdf-logo" />
          </div>

          <div className="reg-pdf-titre-boite">
            <h1 className="reg-pdf-titre">الالتزام بالقواعد العامة لسير المؤسسة</h1>
          </div>

          <p className="reg-pdf-intro">{REGLEMENT_INTRO}</p>
          <p className="reg-pdf-intro">{REGLEMENT_INTRO_2}</p>
          <p className="reg-pdf-intro reg-pdf-gras">{REGLEMENT_INTRO_3}</p>

          <ol className="reg-pdf-liste">
            {REGLEMENT_POINTS.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ol>

          <p className="reg-pdf-paragraphe">{REGLEMENT_PARAGRAPHE}</p>

          <div className="reg-pdf-signature-bloc">
            <p>أنا الموقع (ة) أسفله : <span className="pdf-pointilles">{data.nomSignataire || ''}</span></p>
            <p>أب أو ولي التلميذ(ة) : <span className="pdf-pointilles">{etudiantInfo?.nomComplet || ''}</span></p>
            <p className="reg-pdf-engagement">{REGLEMENT_ENGAGEMENT}</p>
          </div>

          <div className="reg-pdf-toqia">
            <p className="reg-pdf-toqia-titre">توقيع الأب أو ولي الأمر مصادق عليه</p>
            <p className="reg-pdf-date">
              التاريخ : {data.dateSignature ? new Date(data.dateSignature).toLocaleDateString('fr-FR') : '.........................'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reglement;
