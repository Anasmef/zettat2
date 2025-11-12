import React, { useState } from 'react';
import { X, FileText, Plus, Eye, Download } from 'lucide-react';

const ModalMessageRapport = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState('fr');

  if (!isOpen) return null;

  const text = {
    fr: {
      title: "Guide des Rapports Disciplinaires",
      p1: "Bonjour cher professeur,",
      p2: "Nous avons ajouté un nouveau système de rapports disciplinaires pour mieux gérer les incidents en classe.",
      p2b: "📍 Le bouton 'Mes Rapports' se trouve dans le menu à gauche, juste après 'Mes Réclamations' et avant 'Mes Séances'.",
      p3: "Comment créer un rapport ?",
      p4: "1. Cliquez sur 'Mes Rapports' dans le menu de gauche",
      p5: "2. Cliquez sur le bouton 'Nouveau Rapport' en haut de la page",
      p6: "3. Sélectionnez d'abord le cours concerné",
      p7: "4. Puis choisissez l'étudiant dans la liste qui s'affiche",
      p8: "5. Cochez la nature du problème observé (Devoirs non faits, Indiscipline, Bavardage, etc.)",
      p9: "6. Décrivez l'incident en détail dans la zone de texte",
      p10: "7. Sélectionnez les mesures que vous avez prises",
      p11: "8. Ajoutez vos observations personnelles (facultatif)",
      p12: "9. Cliquez sur 'Envoyer le Rapport' pour le soumettre à la direction",
      p13: "Où voir mes rapports ?",
      p14: "• Allez dans 'Mes Rapports' depuis le menu de gauche",
      p15: "• Vous pouvez rechercher un rapport par étudiant, cours ou niveau",
      p16: "• Cliquez sur 'Détails' pour voir toutes les informations d'un rapport",
      p17: "• Cliquez sur 'PDF' pour télécharger le rapport au format PDF",
      p18: "Statuts des rapports :",
      p19: "• En attente : Le rapport est envoyé et attend la validation de la direction",
      p20: "• Traité : La direction a pris connaissance et traité le rapport",
      p21: "• Visa Direction : Le rapport a reçu le visa officiel de la direction",
      p22: "Important : Une fois envoyé, vous ne pouvez plus modifier le rapport. Vérifiez bien toutes les informations avant d'envoyer !",
      p23: "Ce système permet un suivi efficace des incidents et une meilleure communication avec l'administration.",
      btn: "J'ai compris",
      lang: "عربي"
    },
    ar: {
      title: "دليل التقارير التأديبية",
      p1: "مرحبا أستاذنا الكريم،",
      p2: "لقد أضفنا نظام جديد للتقارير التأديبية لإدارة أفضل للحوادث في القسم.",
      p2b: "📍 زر 'تقاريري' موجود في القائمة اليسرى، مباشرة بعد 'شكاياتي' وقبل 'حصصي'.",
      p3: "كيف تنشئ تقريراً ؟",
      p4: "1. اضغط على 'تقاريري' في القائمة اليسرى",
      p5: "2. اضغط على زر 'تقرير جديد' في أعلى الصفحة",
      p6: "3. اختر أولاً المادة المعنية",
      p7: "4. ثم اختر الطالب من القائمة التي تظهر",
      p8: "5. حدد طبيعة المشكلة الملاحظة (واجبات غير محضرة، عدم انضباط، ثرثرة، إلخ)",
      p9: "6. صف الحادثة بالتفصيل في منطقة النص",
      p10: "7. حدد الإجراءات التي اتخذتها",
      p11: "8. أضف ملاحظاتك الشخصية (اختياري)",
      p12: "9. اضغط على 'إرسال التقرير' لإرساله إلى الإدارة",
      p13: "أين أرى تقاريري ؟",
      p14: "• اذهب إلى 'تقاريري' من القائمة اليسرى",
      p15: "• يمكنك البحث عن تقرير بالطالب أو المادة أو المستوى",
      p16: "• اضغط على 'التفاصيل' لرؤية كل معلومات التقرير",
      p17: "• اضغط على 'PDF' لتحميل التقرير بصيغة PDF",
      p18: "حالات التقارير :",
      p19: "• قيد الانتظار : التقرير مُرسل وينتظر موافقة الإدارة",
      p20: "• معالج : الإدارة اطلعت على التقرير وعالجته",
      p21: "• تأشيرة الإدارة : التقرير حصل على التأشيرة الرسمية من الإدارة",
      p22: "مهم : بمجرد الإرسال، لا يمكنك تعديل التقرير. تحقق جيداً من كل المعلومات قبل الإرسال !",
      p23: "هذا النظام يسمح بمتابعة فعالة للحوادث وتواصل أفضل مع الإدارة.",
      btn: "فهمت",
      lang: "Français"
    }
  };

  const t = text[lang];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div 
        style={{...s.modal, direction: lang === 'ar' ? 'rtl' : 'ltr'}} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>
            <FileText size={24} />
            {t.title}
          </h2>
          <div style={s.topBtns}>
            <button onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')} style={s.langBtn}>
              {t.lang}
            </button>
            <button onClick={onClose} style={s.closeBtn}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={s.body}>
          <p style={s.text}>{t.p1}</p>
          <p style={s.text}>{t.p2}</p>
          
          {/* Localisation du bouton */}
          <div style={s.locationBox}>
            <p style={s.locationText}>{t.p2b}</p>
          </div>
          
          <div style={s.divider}></div>
          
          {/* Section Création */}
          <div style={s.iconSection}>
            <div style={s.iconWrapper}>
              <Plus size={20} style={{color: '#10b981'}} />
            </div>
            <p style={{...s.text, fontWeight: '600', fontSize: '16px', color: '#1f2937'}}>{t.p3}</p>
          </div>
          
          <p style={s.stepText}>{t.p4}</p>
          <p style={s.stepText}>{t.p5}</p>
          <p style={s.stepText}>{t.p6}</p>
          <p style={s.stepText}>{t.p7}</p>
          <p style={s.stepText}>{t.p8}</p>
          <p style={s.stepText}>{t.p9}</p>
          <p style={s.stepText}>{t.p10}</p>
          <p style={s.stepText}>{t.p12}</p>
          
          <div style={s.divider}></div>
          
          {/* Section Consultation */}
          <div style={s.iconSection}>
            <div style={{...s.iconWrapper, backgroundColor: '#dbeafe'}}>
              <Eye size={20} style={{color: '#1e40af'}} />
            </div>
            <p style={{...s.text, fontWeight: '600', fontSize: '16px', color: '#1f2937'}}>{t.p13}</p>
          </div>
          
          <p style={s.stepText}>{t.p14}</p>
          <p style={s.stepText}>{t.p15}</p>
          <p style={s.stepText}>{t.p16}</p>
          <p style={s.stepText}>{t.p17}</p>
          
          <div style={s.divider}></div>
          
          {/* Section Statuts */}
          <div style={s.iconSection}>
            <div style={{...s.iconWrapper, backgroundColor: '#fef3c7'}}>
              <FileText size={20} style={{color: '#92400e'}} />
            </div>
            <p style={{...s.text, fontWeight: '600', fontSize: '16px', color: '#1f2937'}}>{t.p18}</p>
          </div>
          
          <div style={s.statusCard}>
            <div style={{...s.statusDot, backgroundColor: '#fbbf24'}}></div>
            <p style={s.statusText}>{t.p19}</p>
          </div>
          
          <div style={s.statusCard}>
            <div style={{...s.statusDot, backgroundColor: '#10b981'}}></div>
            <p style={s.statusText}>{t.p20}</p>
          </div>
          
          <div style={s.statusCard}>
            <div style={{...s.statusDot, backgroundColor: '#3b82f6'}}></div>
            <p style={s.statusText}>{t.p21}</p>
          </div>
          
          <div style={s.divider}></div>
          
          {/* Avertissement Important */}
          <div style={s.warningBox}>
            <p style={s.warningText}>{t.p22}</p>
          </div>
          
          {/* Message de conclusion */}
          <p style={{...s.text, fontWeight: '600', fontSize: '15px', color: '#059669', textAlign: 'center', marginTop: '16px', padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px'}}>
            {t.p23}
          </p>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onClose} style={s.okBtn}>
            {t.btn}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 600px) {
          .modal-content { max-width: 95% !important; padding: 16px !important; }
          .modal-text { font-size: 14px !important; }
        }
      `}</style>
    </div>
  );
};

const s = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    animation: 'fadeIn 0.2s'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '650px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    animation: 'slideUp 0.3s',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '12px 12px 0 0'
  },
  title: {
    color: 'white',
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  topBtns: {
    display: 'flex',
    gap: '8px'
  },
  langBtn: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.25)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  closeBtn: {
    width: '30px',
    height: '30px',
    background: 'rgba(255,255,255,0.25)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.8',
    color: '#4b5563',
    marginBottom: '12px'
  },
  stepText: {
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#6b7280',
    marginBottom: '10px',
    paddingLeft: '20px',
    position: 'relative'
  },
  iconSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    marginTop: '16px'
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    backgroundColor: '#d1fae5',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statusCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    background: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb'
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginTop: '4px',
    flexShrink: 0
  },
  statusText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    margin: 0
  },
  warningBox: {
    padding: '16px',
    background: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    marginTop: '16px'
  },
  warningText: {
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#991b1b',
    fontWeight: '600',
    margin: 0
  },
  locationBox: {
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #e0e7ff, #dbeafe)',
    border: '2px solid #6366f1',
    borderRadius: '10px',
    marginTop: '16px',
    marginBottom: '8px'
  },
  locationText: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#1e40af',
    fontWeight: '600',
    margin: 0,
    textAlign: 'center'
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '20px 0'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    background: '#f9fafb'
  },
  okBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  }
};

export default ModalMessageRapport;