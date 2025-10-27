// classeColors.js
// Configuration des couleurs pour chaque classe

export const classeColors = {
  // Collège - 1ère année
  '1AC A': '#FF6B6B',      // Rouge corail
  '1AC B': '#4ECDC4',      // Turquoise
  
  // Collège - 2ème année
  '2AC A': '#45B7D1',      // Bleu ciel
  '2AC B': '#96CEB4',      // Vert menthe
  
  // Collège - 3ème année
  '3AC A': '#FFEAA7',      // Jaune doux
  '3AC B': '#DFE6E9',      // Gris clair
  
  // Tronc Commun
  'Tronc Commun A': '#74B9FF',   // Bleu
  'Tronc Commun B': '#A29BFE',   // Violet
  'Tronc Commun C': '#FD79A8',   // Rose
  
  // 1ère Bac Sciences
  '1BAC SC A': '#FDCB6E',   // Orange
  '1BAC SC B': '#6C5CE7',   // Violet foncé
  
  // 1ère Bac Économie
  '1BAC Économie A': '#00B894',  // Vert émeraude
  '1BAC Économie B': '#00CEC9',  // Cyan
  
  // 2ème Bac PC (Physique-Chimie)
  '2BAC PC A': '#E17055',   // Orange terre
  '2BAC PC B': '#0984E3',   // Bleu royal
  '2BAC PC C': '#B2BEC3',   // Gris bleu
  '2BAC PC D': '#FF7675',   // Rouge saumon
  
  // 2ème Bac Économie
  '2BAC Économie A': '#55EFC4',  // Vert menthe clair
  '2BAC Économie B': '#FAB1A0',  // Pêche
  
  // Couleur par défaut
  'default': '#2D3436'
};

// Fonction pour obtenir la couleur d'une classe
export const getClasseColor = (niveau) => {
  return classeColors[niveau] || classeColors['default'];
};

// Fonction pour obtenir toutes les classes disponibles
export const getAllClasses = () => {
  return Object.keys(classeColors).filter(key => key !== 'default');
};

// Fonction pour grouper les classes par niveau
export const getClassesByLevel = () => {
  return {
    'Collège': [
      '1AC A', '1AC B',
      '2AC A', '2AC B',
      '3AC A', '3AC B'
    ],
    'Tronc Commun': [
      'Tronc Commun A',
      'Tronc Commun B',
      'Tronc Commun C'
    ],
    '1ère Bac': [
      '1BAC SC A', '1BAC SC B',
      '1BAC Économie A', '1BAC Économie B'
    ],
    '2ème Bac': [
      '2BAC PC A', '2BAC PC B', '2BAC PC C', '2BAC PC D',
      '2BAC Économie A', '2BAC Économie B'
    ]
  };
};

export default classeColors;