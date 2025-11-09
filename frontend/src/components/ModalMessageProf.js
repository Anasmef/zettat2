import React, { useState } from 'react';
import { X } from 'lucide-react';

const ModalMessageProf = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState('fr');

  if (!isOpen) return null;

  const text = {
    fr: {
      title: "Information Importante",
      p1: "Bonjour cher professeur,",
      p2: "Nous avons ajouté une nouvelle option pour vous faciliter le travail.",
      p3: "Maintenant, vous pouvez modifier les présences que vous avez déjà enregistrées.",
      p4: "Comment faire ?",
      p5: "1. Allez dans la page Liste des Présences (juste en dessous de Enregistrement de Présence)",
      p6: "2. Cherchez la session que vous voulez modifier (regardez la date et le classe)",
      p7: "3. Cliquez sur le bouton Détails de cette session",
      p8: "4. Vous verrez un bouton Modifier à côté de chaque étudiant",
      p9: "5. Cliquez sur Modifier pour changer le statut, le retard ou ajouter une remarque",
      p10: "6. Cliquez sur Enregistrer pour sauvegarder vos modifications",
      p11: "Important : Vérifiez toujours la date et le classe avant de modifier !",
      p12: "C'est simple et rapide !",
      btn: "J'ai compris",
      lang: "عربي"
    },
    ar: {
      title: "معلومة مهمة",
      p1: "مرحبا أستاذنا الكريم،",
      p2: "لقد أضفنا خاصية جديدة لتسهيل عملك.",
      p3: "الآن، يمكنك تعديل الحضور الذي سجلته من قبل.",
      p4: "كيف تستعمل هذه الخاصية ؟",
      p5: "1. اذهب إلى صفحة قائمة الحضور (تحت مباشرة من تسجيل الحضور)",
      p6: "2. ابحث عن الجلسة التي تريد تعديلها (انظر إلى التاريخ والفصل)",
      p7: "3. اضغط على زر التفاصيل لهذه الجلسة",
      p8: "4. ستجد زر تعديل بجانب كل طالب",
      p9: "5. اضغط على تعديل لتغيير الحالة أو التأخير أو إضافة ملاحظة",
      p10: "6. اضغط على حفظ لتسجيل التعديلات",
      p11: "مهم : تحقق دائماً من التاريخ والفصل قبل التعديل !",
      p12: "الأمر بسيط وسريع !",
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
          <h2 style={s.title}>{t.title}</h2>
          <div style={s.topBtns}>
            <button onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')} style={s.langBtn}>
              {t.lang}
            </button>
            <button onClick={onClose} style={s.closeBtn}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body - Texte simple */}
        <div style={s.body}>
          <p style={s.text}>{t.p1}</p>
          <p style={s.text}>{t.p2}</p>
          <p style={{...s.text, fontWeight: '600', color: '#1f2937'}}>{t.p3}</p>
          
          <div style={s.divider}></div>
          
          <p style={{...s.text, fontWeight: '600', fontSize: '16px', marginTop: '20px'}}>{t.p4}</p>
          <p style={s.text}>{t.p5}</p>
          <p style={s.text}>{t.p6}</p>
          <p style={s.text}>{t.p7}</p>
          <p style={s.text}>{t.p8}</p>
          <p style={s.text}>{t.p9}</p>
          <p style={s.text}>{t.p10}</p>
          
          <div style={s.divider}></div>
          
          <p style={{...s.text, fontWeight: '700', fontSize: '15px', color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca'}}>
            {t.p11}
          </p>
          
          <p style={{...s.text, fontWeight: '600', fontSize: '16px', color: '#059669', textAlign: 'center', marginTop: '16px'}}>
            {t.p12}
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
    background: 'rgba(0,0,0,0.5)',
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
    maxWidth: '550px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    animation: 'slideUp 0.3s',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    background: '#3b82f6',
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
    margin: 0
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
    cursor: 'pointer'
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
    justifyContent: 'center'
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
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default ModalMessageProf;