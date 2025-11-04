import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, CheckCircle, XCircle, AlertTriangle, Image } from 'lucide-react';
import './UploadPhotoFinal.css';

const UploadPhotoFinal = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('ar'); // 'ar' ou 'fr'
  const [etudiant, setEtudiant] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [photoDejaEnvoyee, setPhotoDejaEnvoyee] = useState(false);

  // Traductions
  const t = {
    ar: {
      title: 'رفع الصورة الشخصية',
      subtitle: 'يرجى اختيار صورة واضحة لملفك الشخصي',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      codeMassar: 'كود مسار',
      level: 'المستوى',
      selectPhoto: 'اختر صورة',
      changePhoto: 'تغيير الصورة',
      uploadButton: 'إرسال الصورة',
      loading: 'جاري التحميل...',
      uploading: 'جاري الإرسال...',
      maxSize: 'الحد الأقصى: 3 ميغابايت',
      formats: 'الصيغ: JPG, PNG, GIF, WEBP',
      photoAlreadySent: 'لقد قمت بإرسال صورتك',
      contactScolarite: 'للتعديل، اتصل بالإدارة المدرسية',
      currentPhoto: 'الصورة الحالية',
      success: 'تم إرسال الصورة بنجاح!',
      error: 'حدث خطأ',
      fileTooLarge: 'الملف كبير جداً. الحد الأقصى 3MB',
      selectFileFirst: 'الرجاء اختيار صورة أولاً',
      invalidFormat: 'صيغة غير مقبولة'
    },
    fr: {
      title: 'Upload de Photo',
      subtitle: 'Veuillez sélectionner une photo claire pour votre profil',
      fullName: 'Nom complet',
      email: 'Email',
      codeMassar: 'Code Massar',
      level: 'Niveau',
      selectPhoto: 'Sélectionner',
      changePhoto: 'Changer',
      uploadButton: 'Envoyer la photo',
      loading: 'Chargement...',
      uploading: 'Envoi en cours...',
      maxSize: 'Maximum: 3MB',
      formats: 'Formats: JPG, PNG, GIF, WEBP',
      photoAlreadySent: 'Photo déjà envoyée',
      contactScolarite: 'Pour modifier, contactez la scolarité',
      currentPhoto: 'Photo actuelle',
      success: 'Photo envoyée avec succès!',
      error: 'Erreur',
      fileTooLarge: 'Fichier trop grand. Max 3MB',
      selectFileFirst: 'Veuillez sélectionner une photo',
      invalidFormat: 'Format non accepté'
    }
  };

  const currentLang = t[language];

  useEffect(() => {
    fetchEtudiantInfo();
  }, []);

  const fetchEtudiantInfo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/etudiant/photo/info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setEtudiant(data.data);
        setPhotoDejaEnvoyee(data.data.photoDejaEnvoyee);
        
        if (data.data.image) {
          setPreview(`/${data.data.image}`);
        }
      } else {
        setMessage({
          type: 'error',
          text: data.message[language] || currentLang.error
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({
        type: 'error',
        text: currentLang.error
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({
        type: 'error',
        text: currentLang.invalidFormat
      });
      return;
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({
        type: 'error',
        text: currentLang.fileTooLarge
      });
      return;
    }

    setSelectedFile(file);
    setMessage(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({
        type: 'error',
        text: currentLang.selectFileFirst
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await fetch('http://localhost:5000/api/etudiant/photo/upload-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: currentLang.success
        });
        setPhotoDejaEnvoyee(true);
        
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: data.message[language] || currentLang.error
        });
        
        if (data.photoDejaEnvoyee) {
          setPhotoDejaEnvoyee(true);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({
        type: 'error',
        text: currentLang.error
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  if (loading) {
    return (
      <div className="final-container">
        <div className="final-loading">
          <div className="loader-spin"></div>
          <p>{currentLang.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`final-container ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="final-card">
        
        {/* Header avec bouton langue */}
        <div className="final-header">
          <div className="header-left">
            <Camera size={30} className="header-icon" />
            <h1 className="header-title">{currentLang.title}</h1>
          </div>
          <button className="lang-toggle" onClick={toggleLanguage}>
            {language === 'ar' ? 'FR' : 'ع'}
          </button>
        </div>

        <p className="header-subtitle">{currentLang.subtitle}</p>

        {/* Infos étudiant */}
        {etudiant && (
          <div className="final-info">
            <div className="info-line">
              <span className="info-label">{currentLang.fullName}:</span>
              <span className="info-val">{etudiant.nomComplet}</span>
            </div>
            <div className="info-line">
              <span className="info-label">{currentLang.email}:</span>
              <span className="info-val">{etudiant.email}</span>
            </div>
            {etudiant.codeMassar && (
              <div className="info-line">
                <span className="info-label">{currentLang.codeMassar}:</span>
                <span className="info-val">{etudiant.codeMassar}</span>
              </div>
            )}
            {etudiant.niveau && (
              <div className="info-line">
                <span className="info-label">{currentLang.level}:</span>
                <span className="info-val">{etudiant.niveau}</span>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className={`final-message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Photo déjà envoyée */}
        {photoDejaEnvoyee ? (
          <div className="final-blocked">
            <CheckCircle size={56} color="#10B981" className="check-icon" />
            
            {preview && (
              <div className="blocked-photo">
                <p className="photo-label">{currentLang.currentPhoto}</p>
                <img src={preview} alt="Photo" />
              </div>
            )}
            
            <div className="blocked-msg">
              <p className="msg-title">{currentLang.photoAlreadySent}</p>
              <div className="msg-warning">
                <AlertTriangle size={18} />
                <p>{currentLang.contactScolarite}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Aperçu photo */}
            <div className="final-preview">
              {preview ? (
                <img src={preview} alt="Aperçu" />
              ) : (
                <div className="preview-empty">
                  <Image size={48} />
                  <p>{currentLang.selectPhoto}</p>
                </div>
              )}
            </div>

            {/* Sélection fichier */}
            <input
              type="file"
              id="file-input"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            
            <label htmlFor="file-input" className="btn-select">
              <Upload size={20} />
              <span>{selectedFile ? currentLang.changePhoto : currentLang.selectPhoto}</span>
            </label>

            {/* Infos limites */}
            <div className="final-limits">
              <p>{currentLang.maxSize}</p>
              <p>{currentLang.formats}</p>
            </div>

            {/* Bouton envoi */}
            <button
              className="btn-submit"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <div className="btn-loader"></div>
                  <span>{currentLang.uploading}</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>{currentLang.uploadButton}</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadPhotoFinal;