import React, { useState, useEffect } from 'react';
import { Download, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar'; // ✅ استيراد صحيح

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

// Structure des étudiants par niveau (classement important)
const STUDENTS_BY_LEVEL = {
  '2BAC PC': [
    'K135476822', 'R135736628', 'R135737457', 'R135817065', 'R137720795',
    'R139820048', 'R139889649', 'R140136986', 'R140144382', 'R140181231',
    'R142159267', 'R142188558', 'R145167976', 'R145178715', 'R147143763',
    'R147167572', 'R147200224', 'R148153782', 'R149066790', 'R149132348',
    'R149157849', 'R130015444', 'R130016922', 'R130063653', 'R130118080',
    'R130156324', 'R130816791', 'R131206344', 'R131239442', 'R134737255',
    'R134751330', 'R134760106', 'R134774200', 'R134808807', 'R136776368',
    'R136840206', 'R141098202', 'R136866367', 'R137895387', 'R139267636',
    'R142181272', 'R140014621', 'R140153327', 'R142046628', 'R140188451',
    'R141162701', 'R135456628', 'R141183490', 'R145159652', 'R141188964',
    'R141191856', 'R142152624', 'R142189607', 'R142190061', 'R142199833',
    'R143137206', 'R143165119', 'R143178480', 'R143196528', 'R143204599',
    'R144167508', 'R144183192', 'R148158229', 'R145146029', 'R145147233',
    'R145167353', 'R149159662', 'R145196642', 'R130834299', 'R147159014',
    'R140183483', 'R147170127', 'P142153786', 'R147204814', 'R148142360',
    'R148152560', 'R148152582', 'R148155780', 'R148173083', 'R148183500',
    'R148183514', 'R149155463', 'R149159962', 'R149189279', 'R130879709',
    'R139714282', 'R141185298'
  ],
  '1BAC SC': [
    'R150051955', 'R152031782', 'R152069448', 'R157072724', 'R158048957',
    'R159066020', 'G145080378', 'F157013045', 'F256008069', 'F259148553',
    'K154028404', 'R142205247', 'R130068185', 'R131935842', 'R138814595',
    'R139770881', 'R140152536', 'R142205251', 'R143164837', 'R143138152',
    'R143165020', 'R150068870', 'R152041076', 'R152044793', 'R152054752',
    'R154031821', 'R155042569', 'R155057589', 'R156048992', 'R156060737',
    'R157032919', 'R157048168', 'R157059713', 'R158034740', 'R136774159',
    'R143181873', 'R150075258', 'R151052207', 'R151077006', 'R156026695',
    'R156048990', 'R157068916'
  ],
  'Tronc Commun': [
    'F160027986', 'F160091022', 'F160094068', 'F161089351', 'F161136202',
    'F162057400', 'F162096449', 'F162144477', 'F166060097', 'F167052050',
    'F168108397', 'F168114296', 'F169058677', 'F169058822', 'F169113409',
    'R150001407', 'R151001508', 'R152065244', 'R154065930', 'R157047364',
    'R161000580', 'F167096381', 'F162013783', 'F166143455', 'F160067133',
    'F162003259', 'F160137919', 'F161014504', 'F161052048', 'F161057420',
    'F161069402', 'F161096389', 'F168131439', 'F161136205', 'F162057121',
    'F162143456', 'F163130856', 'F164088809', 'F164111888', 'F164116285',
    'F164124297', 'F164124467', 'F164128191', 'F165060063', 'F165103078',
    'F165142584', 'F166069205', 'F166088647', 'F166089626', 'F167057474',
    'F168008324', 'F168117798', 'F168126502', 'F168143571', 'F169066533',
    'F169088887', 'R137910909', 'R141154946', 'R145178098', 'R148151228',
    'R148183240', 'R149171857', 'R153001495', 'R153052635', 'R156062232',
    'R156077254', 'R157001388', 'F164075587', 'F166103804', 'F167025648',
    'R134738509', 'R152034215', 'R154053779', 'R159029787'
  ],
  '1BAC Économie': [
    'R140198815', 'R152058317', 'R152060356', 'R152062737', 'R155052188',
    'R135213216', 'R152067414', 'R158057569', 'K154028396', 'R130056678',
    'R132788334', 'R133748545', 'R136770871', 'R138727201', 'R140136939',
    'R141158698', 'R141160271', 'R141194506', 'R142205396', 'R144168203',
    'R146194541', 'R147165840', 'R151062956', 'R152070417', 'R153042668',
    'R153052414', 'R154034265', 'R154071342', 'R155004371', 'R155041408',
    'R156023637', 'R156046475', 'R156073220', 'R158004727', 'R158047895',
    'R158074001', 'F226208237', 'R130902679', 'R139618241', 'R146167546',
    'R147171659', 'R150036616', 'R150068987', 'R151048439', 'R151062588',
    'R151077005', 'R152066213', 'R152076768', 'R154050720', 'R154050965',
    'R154069510', 'R156033271', 'R156073670', 'R157064922', 'R158054405'
  ],
  '2BAC Économie': [
    'R138830781', 'R149168220', 'R131834353', 'R136774226', 'R146199996',
    'R132889660', 'R147166727', 'C131000678', 'R131808065', 'R132799060',
    'R135788179', 'R140159227', 'R142173012', 'R143152647', 'R141152474',
    'R143159072', 'R144165828', 'R144198924', 'R145136333', 'R145155833',
    'R146132698', 'R145123979', 'R146159752', 'R144177241', 'R146159801',
    'R146194547', 'R147156297', 'R147183454', 'R147200011', 'R148152954',
    'R148159259', 'R148159377', 'R148166707', 'R149159702', 'R149204810',
    'R131796435', 'R131820040', 'R135814348', 'R138760069', 'R140159542',
    'R140191187', 'R140204813', 'R141191120', 'R144180337', 'R145166515',
    'R149133850', 'R149164500'
  ],
  '1AC': [
    'F179231483', 'F183140692', 'F188179185', 'F191200515', 'F192146607',
    'F193034370', 'F194074081', 'F194187556', 'F197147014', 'F197207359',
    'G173132630', 'F183135439', 'F192081378', 'F196076169', 'F177216618',
    'F174193270', 'F189145426', 'F195201784', 'F172193195', 'F175182907',
    'F192200384', 'F174209901', 'F189079050', 'F194017912', 'F190223635',
    'F194200390', 'F191017920', 'F195014746', 'F182121868', 'F160103871',
    'F193157609', 'F197193748', 'F196223406', 'F195216879', 'E195062776'
  ],
  '2AC': [
    'F178245100', 'F180169326', 'F181136734', 'F184158349', 'F185130487',
    'F187149942', 'F187173099', 'G141092871', 'F161136201', 'F170034840',
    'F166092115', 'F173194828', 'F174034864', 'F174178637', 'F187105932',
    'F177012233', 'F177184032', 'F178034731', 'F178224247', 'F180067245',
    'F180070827', 'F180123329', 'F180149473', 'F181147476', 'F182141242',
    'F182171714', 'F185205434', 'F186149657', 'R157003288', 'F179091599'
  ],
  '3AC': [
    'F160089046', 'F161143020', 'F163102966', 'F168086197', 'F171005418',
    'F172170728', 'F174089443', 'F175101585', 'F176224139', 'F177122713',
    'F177207521', 'F179180020', 'J170010868', 'R142197104', 'F160080107',
    'F163047989', 'F167079119', 'F170015400', 'F170035011', 'F170140168',
    'F170184458', 'F170222868', 'F170224157', 'F171057613', 'F171134500',
    'F163013806', 'F171196628', 'F171197696', 'F171234275', 'F172021788',
    'F172122689', 'F172122870', 'F172164080', 'R151028185', 'F172179964',
    'F169014174', 'F172181485', 'F172202344', 'F173151546', 'F174150715',
    'F175165901', 'F175165902', 'F176015866', 'F176181929', 'R155019556',
    'F177164005', 'F177166794', 'F178056331', 'F178195769', 'F178210312',
    'F179091763', 'R157045866', 'F179180183', 'F185000621', 'R158001472',
    'F250008075', 'R146194545', 'R151034739', 'R132760116'
  ]
};

const AdminBulletinsExport = () => {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchBulletins();
  }, []);

  const fetchBulletins = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/bulletin/tous', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBulletins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur:', error);
      setBulletins([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour trier les étudiants selon l'ordre défini
  const sortStudentsByLevel = (bulletinsArray, niveau) => {
    const levelOrder = STUDENTS_BY_LEVEL[niveau] || [];
    
    // Si aucun ordre n'est défini pour ce niveau, on retourne les bulletins non triés
    if (levelOrder.length === 0) return bulletinsArray;
    
    return [...bulletinsArray].sort((a, b) => {
      const codeA = a.etudiant?.codeMassar || '';
      const codeB = b.etudiant?.codeMassar || '';
      
      const indexA = levelOrder.indexOf(codeA);
      const indexB = levelOrder.indexOf(codeB);
      
      // Si les deux codes sont dans la liste, on les trie selon l'ordre
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // Si seul A est dans la liste, il vient en premier
      if (indexA !== -1) return -1;
      
      // Si seul B est dans la liste, il vient en premier
      if (indexB !== -1) return 1;
      
      // Sinon, on garde l'ordre alphabétique par défaut
      return (a.etudiant?.nomComplet || '').localeCompare(b.etudiant?.nomComplet || '');
    });
  };

  const groupedData = bulletins.reduce((acc, b) => {
    const key = `${b.niveau}|${b.professeur?.nom || 'N/A'}|${b.matiere}`;
    if (!acc[key]) {
      acc[key] = {
        niveau: b.niveau,
        classe: b.niveau,
        professeur: b.professeur?.nom || 'N/A',
        matiere: b.matiere,
        semestre: b.semestre,
        anneeScolaire: b.anneeScolaire,
        bulletins: [],
        academie: 'Casablanca-Settat',
        prefecture: "Préfecture d'Arrond. Aïn Sebaa",
        etablissement: 'ALFRED KASTLER'
      };
    }
    acc[key].bulletins.push(b);
    return acc;
  }, {});

  // Trier les bulletins dans chaque groupe selon l'ordre défini
  Object.keys(groupedData).forEach(key => {
    const group = groupedData[key];
    group.bulletins = sortStudentsByLevel(group.bulletins, group.niveau);
  });

  const cards = Object.values(groupedData);

  const handleExportExcel = (card) => {
    try {
      const workbook = XLSX.utils.book_new();
      const wsData = [];

      // En-tête académique
      wsData.push(['أكاديمية :', card.academie, '', "م.الإقليمية :", card.prefecture, '', 'مؤسسة', '', card.etablissement]);
      wsData.push(['المستوى :', card.niveau, '', 'القسم :', card.classe, '', 'الأستاذ', '', card.professeur]);
      wsData.push(['الدورة :', card.semestre, '', 'نقط :', '', '', 'المادة', '', card.matiere]);
      wsData.push(['السنة الدراسية :', card.anneeScolaire, '', '', '', '', '', '', '']);
      wsData.push([]);

      // En-têtes du tableau - Ligne 1
      const numControles = card.bulletins[0]?.controles?.length || 2;
      const headerLine1 = ['رقم التلميذ', 'إسم التلميذ', 'تاريخ الإزدياد'];
      
      for (let i = 0; i < numControles; i++) {
        const label = i === 0 ? 'Premier contrôle' : i === 1 ? 'Deuxième contrôle' : `Contrôle ${i + 1}`;
        headerLine1.push(label);
      }
      headerLine1.push('Activités intégrées');
      wsData.push(headerLine1);

      // En-têtes du tableau - Ligne 2 (النقطة pour chaque contrôle)
      const headerLine2 = ['', '', ''];
      for (let i = 0; i < numControles; i++) {
        headerLine2.push('النقطة');
      }
      headerLine2.push('النقطة');
      wsData.push(headerLine2);

      // Ajouter les données des étudiants (DÉJÀ TRIÉES)
      card.bulletins.forEach(b => {
        const row = [
          b.etudiant?.codeMassar || '',
          b.etudiant?.nomComplet || '',
          b.etudiant?.dateNaissance ? new Date(b.etudiant.dateNaissance).toLocaleDateString('fr-FR') : ''
        ];
        
        if (b.controles && b.controles.length > 0) {
          b.controles.forEach(c => {
            row.push(c.note || '');
          });
        }
        
        row.push(b.activitesIntegrees || '');
        wsData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const range = XLSX.utils.decode_range(ws['!ref']);

      // Fusionner les cellules des 3 premières colonnes (ligne 5-6)
      ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }); // رقم التلميذ
      ws['!merges'].push({ s: { r: 5, c: 1 }, e: { r: 6, c: 1 } }); // إسم التلميذ
      ws['!merges'].push({ s: { r: 5, c: 2 }, e: { r: 6, c: 2 } }); // تاريخ الإزدياد

      // Fusionner les cellules des contrôles et activités (ligne 5-6)
      for (let i = 0; i < numControles; i++) {
        ws['!merges'].push({ s: { r: 5, c: 3 + i }, e: { r: 5, c: 3 + i } });
      }
      ws['!merges'].push({ s: { r: 5, c: 3 + numControles }, e: { r: 5, c: 3 + numControles } });

      // Style en-tête académique
      for (let R = 0; R <= 3; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true, size: 11, color: { rgb: '000000' } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: {
                left: { style: 'thin', color: { rgb: '808080' } },
                right: { style: 'thin', color: { rgb: '808080' } },
                top: { style: 'thin', color: { rgb: '808080' } },
                bottom: { style: 'thin', color: { rgb: '808080' } }
              }
            };
          }
        }
      }

      // Style en-têtes du tableau (Ligne 1 et 2)
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell1 = XLSX.utils.encode_cell({ r: 5, c: C });
        if (ws[cell1]) {
          ws[cell1].s = {
            fill: { fgColor: { rgb: '00B4D8' } },
            font: { bold: true, size: 12, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              left: { style: 'medium', color: { rgb: '000000' } },
              right: { style: 'medium', color: { rgb: '000000' } },
              top: { style: 'medium', color: { rgb: '000000' } },
              bottom: { style: 'medium', color: { rgb: '000000' } }
            }
          };
        }

        const cell2 = XLSX.utils.encode_cell({ r: 6, c: C });
        if (ws[cell2]) {
          ws[cell2].s = {
            fill: { fgColor: { rgb: '00B4D8' } },
            font: { bold: true, size: 11, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              left: { style: 'medium', color: { rgb: '000000' } },
              right: { style: 'medium', color: { rgb: '000000' } },
              top: { style: 'medium', color: { rgb: '000000' } },
              bottom: { style: 'medium', color: { rgb: '000000' } }
            }
          };
        }
      }

      // Style données (à partir de la ligne 7)
      for (let R = 7; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { size: 11, color: { rgb: '000000' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } }
              }
            };
          }
        }
      }

      ws['!cols'] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        ...Array(numControles).fill({ wch: 18 }),
        { wch: 18 }
      ];

      ws['!rows'] = [];
      for (let i = 0; i <= range.e.r; i++) {
        ws['!rows'][i] = { hpt: 25 };
      }

      XLSX.utils.book_append_sheet(workbook, ws, 'Bulletin');
      const filename = `Bulletin_${card.matiere}_${card.niveau}_${card.anneeScolaire}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  return (
    <div style={styles.container}>
       <Sidebar onLogout={handleLogout} />
      <div style={styles.header}>
        <h1 style={styles.title}>📋 Bulletins - Export avec Classement</h1>
        <p style={styles.subtitle}>{cards.length} groupes trouvés (classés par niveau)</p>
      </div>

      {loading ? (
        <p style={styles.loading}>Chargement...</p>
      ) : cards.length === 0 ? (
        <p style={styles.empty}>Aucun bulletin</p>
      ) : (
        <div style={styles.grid}>
          {cards.map((card, idx) => (
            <div key={idx} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{card.niveau}</h3>
                <span style={styles.badge}>
                  {STUDENTS_BY_LEVEL[card.niveau]?.length || 0} étudiants dans le classement
                </span>
              </div>
              <div style={styles.cardBody}>
                <p><strong>Professeur:</strong> {card.professeur}</p>
                <p><strong>Matière:</strong> {card.matiere}</p>
                <p><strong>Semestre:</strong> {card.semestre}</p>
                <p><strong>Année:</strong> {card.anneeScolaire}</p>
                <p><strong>Étudiants:</strong> {card.bulletins.length} (classés)</p>
              </div>
              <div style={styles.cardActions}>
                <button
                  onClick={() => {
                    setSelectedCard(card);
                    setShowModal(true);
                  }}
                  style={styles.btnView}
                >
                  <Eye size={16} /> Aperçu
                </button>
                <button
                  onClick={() => handleExportExcel(card)}
                  style={styles.btnDownload}
                >
                  <Download size={16} /> Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedCard && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>{selectedCard.matiere} - {selectedCard.niveau}</h2>
              <div style={styles.modalInfo}>
                <span style={styles.infoText}>
                  {selectedCard.bulletins.length} étudiants (classés selon l'ordre défini)
                </span>
              </div>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                <X size={24} />
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.bulletinHeader}>
                <table style={styles.headerTable}>
                  <tbody>
                    <tr>
                      <td><strong>أكاديمية :</strong> {selectedCard.academie}</td>
                      <td><strong>م.الإقليمية :</strong> {selectedCard.prefecture}</td>
                      <td><strong>مؤسسة</strong> : {selectedCard.etablissement}</td>
                    </tr>
                    <tr>
                      <td><strong>المستوى :</strong> {selectedCard.niveau}</td>
                      <td><strong>القسم :</strong> {selectedCard.classe}</td>
                      <td><strong>الأستاذ</strong> : {selectedCard.professeur}</td>
                    </tr>
                    <tr>
                      <td><strong>الدورة :</strong> {selectedCard.semestre}</td>
                      <td><strong>نقط :</strong> {selectedCard.matiere}</td>
                    </tr>
                    <tr>
                      <td><strong>السنة الدراسية :</strong> {selectedCard.anneeScolaire}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.th}>رقم التلميذ</th>
                    <th style={styles.th}>إسم التلميذ</th>
                    <th style={styles.th}>تاريخ الإزدياد</th>
                    {selectedCard.bulletins[0]?.controles?.map((c, idx) => {
                      const label = idx === 0 ? 'Premier contrôle' : idx === 1 ? 'Deuxième contrôle' : `Contrôle ${c.numero}`;
                      return (
                        <th key={`col-${idx}`} style={styles.th}>
                          <div style={{paddingBottom: '4px'}}>{label}</div>
                          <div style={{borderTop: '1px solid #000', paddingTop: '4px'}}>النقطة</div>
                        </th>
                      );
                    })}
                    <th style={styles.th}>
                      <div style={{paddingBottom: '4px'}}>Activités intégrées</div>
                      <div style={{borderTop: '1px solid #000', paddingTop: '4px'}}>النقطة</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCard.bulletins.map((b, idx) => {
                    const studentOrder = STUDENTS_BY_LEVEL[selectedCard.niveau] || [];
                    const orderIndex = studentOrder.indexOf(b.etudiant?.codeMassar || '');
                    const isInOrder = orderIndex !== -1;
                    
                    return (
                      <tr key={idx} style={{
                        borderBottom: '1px solid #333',
                        backgroundColor: isInOrder ? '#f0f9ff' : 'white'
                      }}>
                        <td style={styles.td}>
                          {b.etudiant?.codeMassar}
                          {isInOrder && (
                            <span style={{
                              fontSize: '10px',
                              color: '#3b82f6',
                              marginLeft: '5px'
                            }}>
                              #{orderIndex + 1}
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>{b.etudiant?.nomComplet}</td>
                        <td style={styles.td}>
                          {b.etudiant?.dateNaissance ? new Date(b.etudiant.dateNaissance).toLocaleDateString('fr-FR') : ''}
                        </td>
                        {b.controles?.map((c, cIdx) => (
                          <td key={cIdx} style={styles.td}>{c.note || ''}</td>
                        ))}
                        <td style={styles.td}>{b.activitesIntegrees || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  handleExportExcel(selectedCard);
                  setShowModal(false);
                }}
                style={styles.btnDownloadModal}
              >
                <Download size={16} /> Télécharger Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  cardHeader: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '16px',
    position: 'relative'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 5px 0'
  },
  badge: {
    fontSize: '11px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-block'
  },
  cardBody: {
    padding: '16px',
    fontSize: '14px'
  },
  cardActions: {
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '8px'
  },
  btnView: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  btnDownload: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '1100px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative'
  },
  modalInfo: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)'
  },
  infoText: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280'
  },
  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  },
  bulletinHeader: {
    marginBottom: '30px',
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '8px'
  },
  headerTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '2px solid #000',
    marginTop: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  headerRow: {
    backgroundColor: '#00B4D8'
  },
  th: {
    padding: '12px 8px',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: '#000',
    border: '1px solid #333',
    backgroundColor: '#00B4D8',
    fontFamily: 'Arial, sans-serif'
  },
  td: {
    padding: '10px 8px',
    fontSize: '13px',
    border: '1px solid #333',
    textAlign: 'center',
    height: '25px'
  },
  modalFooter: {
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  btnDownloadModal: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  }
};

export default AdminBulletinsExport;