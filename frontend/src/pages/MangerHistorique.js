import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, User, Calendar, Check, X, AlertCircle,
  Download, Filter, ChevronDown, ChevronUp, BarChart2,
  BookOpen, GraduationCap, RefreshCw, Users,
  ChevronLeft, ChevronRight, Eye, LayoutList, Layers,
  SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx-js-style';
import Sidebar from '../components/Sidebarmanager';

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const fmt = (d) => new Date(d).toLocaleDateString('fr-FR');

const getStatus = (p) => {
  if (!p.present) return 'absent';
  if (p.retardMinutes > 0) return 'retard';
  return 'present';
};

const STATUS = {
  present: { label: 'Présent',   bg: '#dcfce7', color: '#166534', border: '#86efac', Icon: Check },
  retard:  { label: 'En retard', bg: '#fef9c3', color: '#854d0e', border: '#fde047', Icon: AlertCircle },
  absent:  { label: 'Absent',    bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', Icon: X },
};

const taux = (presents, total) => total > 0 ? Math.round((presents / total) * 100) : 0;
const tauxColor = (t) => t >= 80 ? '#16a34a' : t >= 60 ? '#ca8a04' : '#dc2626';
const tauxBg    = (t) => t >= 80 ? '#dcfce7' : t >= 60 ? '#fef9c3' : '#fee2e2';

/* ═══════════════════════════════════════════════
   SMALL COMPONENTS
═══════════════════════════════════════════════ */
const Badge = ({ status, retardMinutes }) => {
  const cfg = STATUS[status]; const Icon = cfg.Icon;
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,whiteSpace:'nowrap' }}>
      <Icon size={11}/>{cfg.label}{status==='retard'?` (${retardMinutes}min)`:''}
    </span>
  );
};

const TauxBar = ({ value, width=80 }) => (
  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
    <div style={{ width,height:6,background:'#f1f5f9',borderRadius:999,overflow:'hidden',flexShrink:0 }}>
      <div style={{ width:`${value}%`,height:'100%',borderRadius:999,background:tauxColor(value),transition:'width .5s' }}/>
    </div>
    <span style={{ fontSize:12,fontWeight:700,color:tauxColor(value),minWidth:34 }}>{value}%</span>
  </div>
);

const Avatar = ({ name, size=38 }) => (
  <div style={{ width:size,height:size,borderRadius:size*0.3,background:'linear-gradient(135deg,#3b82f6,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:size*0.38,flexShrink:0,boxShadow:'0 2px 8px rgba(99,102,241,.25)' }}>
    {(name||'?').charAt(0).toUpperCase()}
  </div>
);

const Chip = ({ label, onRemove, color='#3b82f6' }) => (
  <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:`${color}18`,color,border:`1px solid ${color}40`,whiteSpace:'nowrap' }}>
    {label}{onRemove&&<X size={10} style={{cursor:'pointer',opacity:.7}} onClick={onRemove}/>}
  </span>
);

const Sel = ({ label, value, onChange, children }) => (
  <div>
    <div style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5 }}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:'100%',padding:'9px 30px 9px 12px',fontSize:13,fontWeight:500,border:'1.5px solid #e2e8f0',borderRadius:9,background:'white',color:'#374151',outline:'none',cursor:'pointer',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center' }}>
      {children}
    </select>
  </div>
);

const Inp = ({ label, type='text', value, onChange, placeholder, icon }) => (
  <div>
    <div style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5 }}>{label}</div>
    <div style={{ position:'relative' }}>
      {icon&&<span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',display:'flex' }}>{icon}</span>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:'100%',padding:`9px 12px 9px ${icon?'32px':'12px'}`,fontSize:13,border:'1.5px solid #e2e8f0',borderRadius:9,background:'white',color:'#374151',outline:'none',boxSizing:'border-box' }}/>
    </div>
  </div>
);

const SortBtn = ({ field, current, dir }) => {
  if(current!==field) return <ArrowUpDown size={11} color="#cbd5e1"/>;
  return dir==='asc'?<ArrowUp size={11} color="#3b82f6"/>:<ArrowDown size={11} color="#3b82f6"/>;
};

/* ═══════════════════════════════════════════════
   VIEWS
═══════════════════════════════════════════════ */
const VIEW = { LIST:'list', STUDENT:'student', CLASS:'class' };

/* ═══════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════ */
const MangerHistorique = () => {
  const [view,setView]                   = useState(VIEW.LIST);
  const [allStudents,setAllStudents]     = useState([]);
  const [loadingStudents,setLS]          = useState(false);

  // ── List filters
  const [searchName,setSearchName]       = useState('');
  const [filterCours,setFilterCours]     = useState('');
  const [filterAnnee,setFilterAnnee]     = useState('');
  const [sortF,setSortF]                 = useState('nomComplet');
  const [sortD,setSortD]                 = useState('asc');
  const [page,setPage]                   = useState(1);
  const PER = 12;

  // ── Student view
  const [selStudent,setSelStudent]       = useState(null);
  const [history,setHistory]             = useState([]);
  const [loadingH,setLoadingH]           = useState(false);
  const [stats,setStats]                 = useState(null);

  // ── History filters
  const [hDateFrom,setHDateFrom]         = useState('');
  const [hDateTo,setHDateTo]             = useState('');
  const [hStatus,setHStatus]             = useState('all');
  const [hCours,setHCours]               = useState('');
  const [hMatiere,setHMatiere]           = useState('');
  const [hProf,setHProf]                 = useState('');
  const [hSort,setHSort]                 = useState('desc');
  const [showHF,setShowHF]               = useState(false);

  // ── Class view
  const [classData,setClassData]         = useState([]);
  const [loadingC,setLoadingC]           = useState(false);
  const [classSortF,setCSF]              = useState('tauxPresence');
  const [classSortD,setCSD]              = useState('desc');
  const [selectedClass,setSelectedClass] = useState('');

  /* ── derived options */
  const allCours  = [...new Set(allStudents.flatMap(s=>Array.isArray(s.cours)?s.cours:[s.cours]).filter(Boolean))].sort();
  const allAnnees = [...new Set(allStudents.map(s=>s.anneeScolaire).filter(Boolean))].sort().reverse();

  /* ── fetch students */
  const fetchStudents = useCallback(async () => {
    try { setLS(true);
      const {data} = await axios.get('/api/etudiants',{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      setAllStudents(data.filter(s=>!s.hidden));
    } catch(e){console.error(e);} finally{setLS(false);}
  },[]);
  useEffect(()=>{fetchStudents();},[fetchStudents]);

  /* ── filtered list */
  const filteredList = allStudents.filter(s=>{
    const q=searchName.toLowerCase();
    if(q&&!(s.nomComplet||'').toLowerCase().includes(q)&&!(s.email||'').toLowerCase().includes(q)) return false;
    if(filterCours){const sc=Array.isArray(s.cours)?s.cours:[s.cours];if(!sc.includes(filterCours))return false;}
    if(filterAnnee&&s.anneeScolaire!==filterAnnee) return false;
    return true;
  }).sort((a,b)=>{
    let av=a[sortF]||'',bv=b[sortF]||'';
    if(typeof av==='string'){av=av.toLowerCase();bv=bv.toLowerCase();}
    return sortD==='asc'?(av>bv?1:-1):(av<bv?1:-1);
  });
  const totalPages = Math.ceil(filteredList.length/PER);
  const paged = filteredList.slice((page-1)*PER,page*PER);

  const toggleSort=(f)=>{ if(sortF===f)setSortD(d=>d==='asc'?'desc':'asc'); else{setSortF(f);setSortD('asc');} };

  /* ── fetch history */
  const fetchHistory = async (student) => {
    try { setLoadingH(true); setSelStudent(student); setView(VIEW.STUDENT);
      const {data} = await axios.get(`/api/presences/student/${student._id}`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      setHistory(data); calcStats(data);
      setHDateFrom('');setHDateTo('');setHStatus('all');setHCours('');setHMatiere('');setHProf('');
    } catch(e){console.error(e);setHistory([]);setStats(null);} finally{setLoadingH(false);}
  };

  /* ── calc stats */
  const calcStats = (h) => {
    const total=h.length, presents=h.filter(p=>p.present).length;
    const absents=total-presents, retards=h.filter(p=>p.present&&p.retardMinutes>0).length;
    const now=new Date();
    const monthly=Array.from({length:6},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
      const s=new Date(d.getFullYear(),d.getMonth(),1), e=new Date(d.getFullYear(),d.getMonth()+1,0);
      const sl=h.filter(p=>{const pd=new Date(p.dateSession);return pd>=s&&pd<=e;});
      const mp=sl.filter(p=>p.present).length;
      return{month:d.toLocaleString('fr-FR',{month:'short',year:'2-digit'}),total:sl.length,presents:mp,taux:taux(mp,sl.length)};
    });
    setStats({total,presents,absents,retards,tauxPresence:taux(presents,total),monthly});
  };

  /* ── filtered history */
  const hOpts = {
    cours:   [...new Set(history.map(p=>p.cours).filter(Boolean))],
    matiere: [...new Set(history.map(p=>p.matiere).filter(Boolean))],
    prof:    [...new Set(history.map(p=>p.nomProfesseur).filter(Boolean))],
  };
  const filteredH = history.filter(p=>{
    if(hDateFrom&&new Date(p.dateSession)<new Date(hDateFrom)) return false;
    if(hDateTo  &&new Date(p.dateSession)>new Date(hDateTo))   return false;
    if(hStatus!=='all'&&getStatus(p)!==hStatus) return false;
    if(hCours  &&p.cours!==hCours)              return false;
    if(hMatiere&&p.matiere!==hMatiere)          return false;
    if(hProf   &&p.nomProfesseur!==hProf)       return false;
    return true;
  }).sort((a,b)=>{const d=new Date(a.dateSession)-new Date(b.dateSession);return hSort==='desc'?-d:d;});
  const activeHF=[hDateFrom,hDateTo,hStatus!=='all',hCours,hMatiere,hProf].filter(Boolean).length;
  const resetHF=()=>{setHDateFrom('');setHDateTo('');setHStatus('all');setHCours('');setHMatiere('');setHProf('');};

  /* ── fetch class */
  const fetchClass = async (cours) => {
    try { setLoadingC(true); setSelectedClass(cours); setView(VIEW.CLASS);
      const studentsInClass=allStudents.filter(s=>(Array.isArray(s.cours)?s.cours:[s.cours]).includes(cours));
      const token=localStorage.getItem('token');
      const results=await Promise.all(studentsInClass.map(async s=>{
        try{
          const {data}=await axios.get(`/api/presences/student/${s._id}`,{headers:{Authorization:`Bearer ${token}`}});
          const total=data.length,presents=data.filter(p=>p.present).length;
          return{...s,total,presents,absents:total-presents,retards:data.filter(p=>p.present&&p.retardMinutes>0).length,tauxPresence:taux(presents,total)};
        }catch{return{...s,total:0,presents:0,absents:0,retards:0,tauxPresence:0};}
      }));
      setClassData(results);
    }catch(e){console.error(e);} finally{setLoadingC(false);}
  };

  const toggleClassSort=(f)=>{if(classSortF===f)setCSD(d=>d==='asc'?'desc':'asc');else{setCSF(f);setCSD('desc');}};
  const sortedClass=[...classData].sort((a,b)=>{
    const av=a[classSortF]??0,bv=b[classSortF]??0;
    const a2=typeof av==='string'?av.toLowerCase():av, b2=typeof bv==='string'?bv.toLowerCase():bv;
    return classSortD==='asc'?(a2>b2?1:-1):(a2<b2?1:-1);
  });

  /* ── exports */
  const exportHistory=()=>{
    if(!selStudent||filteredH.length===0) return;
    const data=filteredH.map(p=>({'Date':fmt(p.dateSession),'Cours':p.cours,'Matière':p.matiere||'','Professeur':p.nomProfesseur||'','Statut':p.present?(p.retardMinutes>0?'En retard':'Présent'):'Absent','Retard (min)':p.retardMinutes||0,'Remarque':p.remarque||''}));
    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Historique');
    XLSX.writeFile(wb,`historique_${selStudent.nomComplet.replace(/\s+/g,'_')}.xlsx`);
  };
  const exportClass=()=>{
    if(!classData.length) return;
    const data=sortedClass.map(s=>({'Étudiant':s.nomComplet,'Email':s.email||'','Total':s.total,'Présences':s.presents,'Absences':s.absents,'Retards':s.retards,'Taux (%)':s.tauxPresence}));
    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Classe');
    XLSX.writeFile(wb,`classe_${selectedClass}_${Date.now()}.xlsx`);
  };

  const handleLogout=()=>{localStorage.removeItem('token');window.location.href='/login';};

  /* ═══════════ SHARED STYLES ═══════════ */
  const card={background:'white',borderRadius:14,border:'1px solid #f1f5f9',boxShadow:'0 1px 4px rgba(0,0,0,.07)',marginBottom:20,overflow:'hidden'};
  const TH=({children,field,cur,dir,onClick,style={}})=>(
    <th onClick={onClick} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:cur===field?'#7c3aed':'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',cursor:onClick?'pointer':'default',userSelect:'none',whiteSpace:'nowrap',...style}}>
      <span style={{display:'flex',alignItems:'center',gap:4}}>{children}{field&&(cur===field?(dir==='asc'?<ArrowUp size={11} color="#7c3aed"/>:<ArrowDown size={11} color="#7c3aed"/>):<ArrowUpDown size={11} color="#cbd5e1"/>)}</span>
    </th>
  );

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div style={{minHeight:'100vh',background:'#f1f5f9',fontFamily:'"DM Sans",system-ui,sans-serif'}}>
      <Sidebar onLogout={handleLogout}/>
      <div style={{maxWidth:1240,margin:'0 auto',padding:'28px 20px'}}>

        {/* ── HEADER ── */}
       <div style={{background:'#2563eb',borderRadius:18,padding:'26px 32px',marginBottom:24,display:'flex',alignItems:'center',gap:18,flexWrap:'wrap',boxShadow:'0 4px 20px rgba(37,99,235,.25)'}}>
  <div style={{width:50,height:50,borderRadius:14,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <BarChart2 size={24} color="white"/>
  </div>
  <div style={{flex:1}}>
    <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'white',letterSpacing:'-.02em'}}>Historique des Présences</h1>
    <p style={{margin:'4px 0 0',opacity:.65,fontSize:12,color:'white'}}>{allStudents.length} étudiants · Vue liste, individuelle ou par classe</p>
  </div>
  {/* Tabs */}
  <div style={{display:'flex',gap:5,background:'rgba(255,255,255,.15)',padding:4,borderRadius:11}}>
    {[{v:VIEW.LIST,Icon:LayoutList,l:'Liste'},{v:VIEW.STUDENT,Icon:User,l:'Étudiant'},{v:VIEW.CLASS,Icon:Layers,l:'Classe'}].map(({v,Icon,l})=>(
      <button key={v} onClick={()=>setView(v)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .2s',background:view===v?'white':'transparent',color:view===v?'#2563eb':'rgba(255,255,255,.8)'}}>
        <Icon size={13}/>{l}
      </button>
    ))}
  </div>
</div>

        {/* ══════════════════════════════════
            VIEW: LIST
        ══════════════════════════════════ */}
        {view===VIEW.LIST&&<>
          {/* Filtres */}
          <div style={card}>
            <div style={{padding:'18px 22px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <SlidersHorizontal size={15} color="#64748b"/>
                <span style={{fontWeight:700,fontSize:14,color:'#374151'}}>Filtres &amp; Recherche</span>
                {(searchName||filterCours||filterAnnee)&&(
                  <button onClick={()=>{setSearchName('');setFilterCours('');setFilterAnnee('');setPage(1);}} style={{marginLeft:'auto',fontSize:11,color:'#ef4444',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:7,padding:'4px 10px',cursor:'pointer',fontWeight:700}}>
                    <X size={10} style={{display:'inline',marginRight:3}}/>Réinitialiser
                  </button>
                )}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13}}>
                <Inp label="Rechercher" value={searchName} onChange={v=>{setSearchName(v);setPage(1);}} placeholder="Nom ou email…" icon={<Search size={13}/>}/>
                <Sel label="Cours / Classe" value={filterCours} onChange={v=>{setFilterCours(v);setPage(1);}}>
                  <option value="">Tous les cours ({allCours.length})</option>
                  {allCours.map(c=><option key={c} value={c}>{c}</option>)}
                </Sel>
                <Sel label="Année scolaire" value={filterAnnee} onChange={v=>{setFilterAnnee(v);setPage(1);}}>
                  <option value="">Toutes les années</option>
                  {allAnnees.map(a=><option key={a} value={a}>{a}</option>)}
                </Sel>
                <Sel label="Trier par" value={sortF} onChange={v=>setSortF(v)}>
                  <option value="nomComplet">Nom</option>
                  <option value="email">Email</option>
                  <option value="createdAt">Date inscription</option>
                </Sel>
              </div>
              {(searchName||filterCours||filterAnnee)&&(
                <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:11}}>
                  {searchName&&<Chip label={`Nom: ${searchName}`} onRemove={()=>setSearchName('')}/>}
                  {filterCours&&<Chip label={`Cours: ${filterCours}`} onRemove={()=>setFilterCours('')} color="#7c3aed"/>}
                  {filterAnnee&&<Chip label={`Année: ${filterAnnee}`} onRemove={()=>setFilterAnnee('')} color="#0891b2"/>}
                </div>
              )}
            </div>
          </div>

          {/* Quick class buttons */}
          {allCours.length>0&&(
            <div style={{...card,padding:'15px 22px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>Vue rapide par classe</div>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {allCours.map(c=>{
                  const count=allStudents.filter(s=>(Array.isArray(s.cours)?s.cours:[s.cours]).includes(c)).length;
                  return(
                    <button key={c} onClick={()=>fetchClass(c)} style={{padding:'7px 13px',borderRadius:9,border:'1.5px solid #e2e8f0',background:'white',fontSize:12,fontWeight:700,cursor:'pointer',color:'#374151',display:'flex',alignItems:'center',gap:6,transition:'all .2s'}}
                      onMouseOver={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.color='#7c3aed';e.currentTarget.style.background='#f5f3ff';}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151';e.currentTarget.style.background='white';}}>
                      <GraduationCap size={12}/>{c}
                      <span style={{background:'#f1f5f9',borderRadius:20,padding:'1px 7px',fontSize:10,color:'#64748b'}}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table */}
          <div style={card}>
            <div style={{padding:'14px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10}}>
              <Users size={15} color="#64748b"/>
              <span style={{fontWeight:700,fontSize:14,color:'#0f172a',flex:1}}>Étudiants</span>
              <span style={{fontSize:12,color:'#64748b',background:'#f8fafc',padding:'3px 10px',borderRadius:20,border:'1px solid #e2e8f0'}}>{filteredList.length} résultat{filteredList.length!==1?'s':''}</span>
            </div>
            {loadingStudents?(
              <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}><RefreshCw size={26} style={{animation:'spin 1s linear infinite',marginBottom:10}}/><div style={{fontSize:13}}>Chargement…</div></div>
            ):paged.length===0?(
              <div style={{padding:50,textAlign:'center',color:'#94a3b8'}}><Users size={30} style={{marginBottom:10,opacity:.3}}/><div style={{fontSize:13,fontWeight:600}}>Aucun étudiant trouvé</div></div>
            ):<>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    <TH field="nomComplet" cur={sortF} dir={sortD} onClick={()=>toggleSort('nomComplet')}>Étudiant</TH>
                    <TH field="email" cur={sortF} dir={sortD} onClick={()=>toggleSort('email')}>Email</TH>
                    <TH cur={sortF}>Cours</TH>
                    <TH field="anneeScolaire" cur={sortF} dir={sortD} onClick={()=>toggleSort('anneeScolaire')}>Année</TH>
                    <TH cur={sortF}>Actions</TH>
                  </tr></thead>
                  <tbody>
                    {paged.map(s=>(
                      <tr key={s._id} style={{borderBottom:'1px solid #f8fafc',transition:'background .15s'}}
                        onMouseOver={e=>e.currentTarget.style.background='#f8fafc'}
                        onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <Avatar name={s.nomComplet} size={35}/>
                            <div>
                              <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{s.nomComplet}</div>
                              {s.niveau&&<div style={{fontSize:11,color:'#94a3b8'}}>{s.niveau}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'11px 14px',fontSize:12,color:'#64748b'}}>{s.email||'—'}</td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {(Array.isArray(s.cours)?s.cours:[s.cours]).filter(Boolean).map(c=>(
                              <span key={c} style={{fontSize:11,fontWeight:600,color:'#7c3aed',background:'#f5f3ff',padding:'2px 7px',borderRadius:6,border:'1px solid #ddd6fe'}}>{c}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{padding:'11px 14px',fontSize:12,color:'#64748b'}}>{s.anneeScolaire||'—'}</td>
                        <td style={{padding:'11px 14px'}}>
                          <button onClick={()=>fetchHistory(s)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .2s'}}
                            onMouseOver={e=>{e.currentTarget.style.background='#2563eb';e.currentTarget.style.color='white';}}
                            onMouseOut={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#2563eb';}}>
                            <Eye size={12}/>Historique
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages>1&&(
                <div style={{padding:'13px 22px',borderTop:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:7,justifyContent:'center',flexWrap:'wrap'}}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{width:33,height:33,borderRadius:8,border:'1.5px solid #e2e8f0',background:'white',cursor:page===1?'not-allowed':'pointer',opacity:page===1?.4:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <ChevronLeft size={15} color="#64748b"/>
                  </button>
                  {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1).reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push('…');acc.push(p);return acc;},[]).map((p,i)=>
                    p==='…'?<span key={`e${i}`} style={{width:33,textAlign:'center',color:'#94a3b8',fontSize:13}}>…</span>:(
                    <button key={p} onClick={()=>setPage(p)} style={{width:33,height:33,borderRadius:8,fontSize:13,fontWeight:700,border:page===p?'1.5px solid #3b82f6':'1.5px solid #e2e8f0',background:page===p?'#3b82f6':'white',color:page===p?'white':'#374151',cursor:'pointer'}}>{p}</button>)
                  )}
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{width:33,height:33,borderRadius:8,border:'1.5px solid #e2e8f0',background:'white',cursor:page===totalPages?'not-allowed':'pointer',opacity:page===totalPages?.4:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <ChevronRight size={15} color="#64748b"/>
                  </button>
                  <span style={{fontSize:11,color:'#94a3b8'}}>Page {page}/{totalPages} · {filteredList.length} étudiants</span>
                </div>
              )}
            </>}
          </div>
        </>}

        {/* ══════════════════════════════════
            VIEW: STUDENT
        ══════════════════════════════════ */}
        {view===VIEW.STUDENT&&<>
          <button onClick={()=>setView(VIEW.LIST)} style={{display:'inline-flex',alignItems:'center',gap:6,marginBottom:16,padding:'8px 14px',background:'white',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontWeight:700,color:'#64748b',cursor:'pointer'}}>
            <ChevronLeft size={14}/>Retour à la liste
          </button>

          {!selStudent?(
            <div style={{...card,padding:60,textAlign:'center',color:'#94a3b8'}}><User size={30} style={{marginBottom:10,opacity:.3}}/><div style={{fontSize:13,fontWeight:600}}>Sélectionnez un étudiant depuis la liste</div></div>
          ):<>
            {/* Profil + stats */}
            <div style={card}>
              <div style={{padding:'22px 26px'}}>
                <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                  <Avatar name={selStudent.nomComplet} size={58}/>
                  <div style={{flex:1}}>
                    <h2 style={{margin:0,fontSize:19,fontWeight:800,color:'#0f172a'}}>{selStudent.nomComplet}</h2>
                    <div style={{display:'flex',gap:7,marginTop:6,flexWrap:'wrap'}}>
                      {selStudent.email&&<Chip label={selStudent.email} color="#64748b"/>}
                      {(Array.isArray(selStudent.cours)?selStudent.cours:[selStudent.cours]).filter(Boolean).map(c=><Chip key={c} label={c} color="#7c3aed"/>)}
                      {selStudent.anneeScolaire&&<Chip label={selStudent.anneeScolaire} color="#0891b2"/>}
                    </div>
                  </div>
                  <button onClick={exportHistory} disabled={filteredH.length===0} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',background:'#10b981',color:'white',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:filteredH.length===0?'not-allowed':'pointer',opacity:filteredH.length===0?.5:1}}>
                    <Download size={14}/>Exporter Excel
                  </button>
                </div>
                {stats&&<>
                  <div style={{display:'flex',gap:11,marginTop:20,flexWrap:'wrap'}}>
                    {[{v:stats.total,l:'Sessions',c:'#1d4ed8',bg:'#eff6ff',b:'#bfdbfe'},{v:stats.presents,l:'Présences',c:'#166534',bg:'#dcfce7',b:'#86efac'},{v:stats.absents,l:'Absences',c:'#991b1b',bg:'#fee2e2',b:'#fca5a5'},{v:stats.retards,l:'Retards',c:'#854d0e',bg:'#fef9c3',b:'#fde047'},{v:`${stats.tauxPresence}%`,l:'Taux',c:tauxColor(stats.tauxPresence),bg:tauxBg(stats.tauxPresence),b:'#e2e8f0'}].map(({v,l,c,bg,b})=>(
                      <div key={l} style={{flex:1,minWidth:100,background:bg,border:`1.5px solid ${b}`,borderRadius:11,padding:'13px 16px'}}>
                        <div style={{fontSize:24,fontWeight:800,color:c,lineHeight:1}}>{v}</div>
                        <div style={{fontSize:11,color:'#6b7280',marginTop:3,fontWeight:600}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Monthly bars */}
                  <div style={{marginTop:18,background:'#f8fafc',borderRadius:10,padding:'13px 16px',border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>Évolution 6 mois</div>
                    <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                      {stats.monthly.map((m,i)=>(
                        <div key={i} style={{flex:1,textAlign:'center'}}>
                          <div style={{fontSize:11,fontWeight:700,color:tauxColor(m.taux),marginBottom:3}}>{m.total>0?`${m.taux}%`:'—'}</div>
                          <div style={{height:44,background:'#e2e8f0',borderRadius:'3px 3px 0 0',display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
                            <div style={{width:'100%',height:`${m.taux}%`,background:tauxColor(m.taux),transition:'height .5s'}}/>
                          </div>
                          <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{m.month}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>}
              </div>
            </div>

            {/* History filters */}
            <div style={card}>
              <div onClick={()=>setShowHF(!showHF)} style={{padding:'13px 22px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none',borderBottom:showHF?'1px solid #f1f5f9':'none'}}>
                <Filter size={14} color="#64748b"/>
                <span style={{fontWeight:700,fontSize:13,color:'#374151',flex:1}}>Filtres des présences</span>
                {activeHF>0&&<span style={{background:'#3b82f6',color:'white',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{activeHF}</span>}
                {showHF?<ChevronUp size={14} color="#94a3b8"/>:<ChevronDown size={14} color="#94a3b8"/>}
              </div>
              {showHF&&<div style={{padding:'16px 22px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:13}}>
                  <Inp label="Date début" type="date" value={hDateFrom} onChange={setHDateFrom}/>
                  <Inp label="Date fin"   type="date" value={hDateTo}   onChange={setHDateTo}/>
                  <Sel label="Statut" value={hStatus} onChange={setHStatus}>
                    <option value="all">Tous les statuts</option>
                    <option value="present">✅ Présent</option>
                    <option value="absent">❌ Absent</option>
                    <option value="retard">⚠️ En retard</option>
                  </Sel>
                  <Sel label="Cours" value={hCours} onChange={setHCours}>
                    <option value="">Tous ({hOpts.cours.length})</option>
                    {hOpts.cours.map(c=><option key={c} value={c}>{c}</option>)}
                  </Sel>
                  <Sel label="Matière" value={hMatiere} onChange={setHMatiere}>
                    <option value="">Toutes ({hOpts.matiere.length})</option>
                    {hOpts.matiere.map(m=><option key={m} value={m}>{m}</option>)}
                  </Sel>
                  <Sel label="Professeur" value={hProf} onChange={setHProf}>
                    <option value="">Tous ({hOpts.prof.length})</option>
                    {hOpts.prof.map(p=><option key={p} value={p}>{p}</option>)}
                  </Sel>
                  <Sel label="Tri" value={hSort} onChange={setHSort}>
                    <option value="desc">↓ Plus récent</option>
                    <option value="asc">↑ Plus ancien</option>
                  </Sel>
                </div>
                {activeHF>0&&<button onClick={resetHF} style={{marginTop:13,padding:'6px 13px',background:'#fef2f2',color:'#991b1b',border:'1px solid #fecaca',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5}}>
                  <X size={11}/>Réinitialiser
                </button>}
              </div>}
            </div>

            {/* History table */}
            <div style={card}>
              <div style={{padding:'13px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10}}>
                <BookOpen size={14} color="#64748b"/>
                <span style={{fontWeight:700,fontSize:13,color:'#0f172a',flex:1}}>Historique</span>
                <span style={{fontSize:11,color:'#64748b',background:'#f8fafc',padding:'3px 10px',borderRadius:20,border:'1px solid #e2e8f0'}}>{filteredH.length} / {history.length}</span>
              </div>
              {loadingH?<div style={{padding:50,textAlign:'center',color:'#94a3b8'}}><RefreshCw size={24} style={{animation:'spin 1s linear infinite'}}/></div>
              :filteredH.length===0?<div style={{padding:45,textAlign:'center',color:'#94a3b8'}}><Calendar size={26} style={{marginBottom:8,opacity:.3}}/><div style={{fontSize:12,fontWeight:600}}>Aucune entrée</div></div>
              :<div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    {['Date','Cours','Matière','Professeur','Période','Statut','Remarque'].map(h=>(
                      <th key={h} style={{padding:'9px 13px',textAlign:'left',fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredH.map((p,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #f8fafc',transition:'background .15s'}} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'11px 13px',fontWeight:700,fontSize:12,color:'#0f172a',whiteSpace:'nowrap'}}>{fmt(p.dateSession)}</td>
                        <td style={{padding:'11px 13px'}}><span style={{fontSize:11,fontWeight:700,color:'#7c3aed',background:'#f5f3ff',padding:'2px 7px',borderRadius:5,border:'1px solid #ddd6fe'}}>{p.cours||'—'}</span></td>
                        <td style={{padding:'11px 13px',fontSize:12,color:'#64748b'}}>{p.matiere||'—'}</td>
                        <td style={{padding:'11px 13px',fontSize:12,color:'#64748b'}}>{p.nomProfesseur||'—'}</td>
                        <td style={{padding:'11px 13px',fontSize:11,color:'#94a3b8',whiteSpace:'nowrap'}}>{[p.heure,p.periode].filter(Boolean).join(' · ')||'—'}</td>
                        <td style={{padding:'11px 13px'}}><Badge status={getStatus(p)} retardMinutes={p.retardMinutes}/></td>
                        <td style={{padding:'11px 13px',fontSize:11,color:'#94a3b8',maxWidth:150}}><span style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.remarque||'—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </div>
          </>}
        </>}

        {/* ══════════════════════════════════
            VIEW: CLASS
        ══════════════════════════════════ */}
        {view===VIEW.CLASS&&<>
          <button onClick={()=>setView(VIEW.LIST)} style={{display:'inline-flex',alignItems:'center',gap:6,marginBottom:16,padding:'8px 14px',background:'white',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontWeight:700,color:'#64748b',cursor:'pointer'}}>
            <ChevronLeft size={14}/>Retour à la liste
          </button>

          {/* Class selector */}
          <div style={{...card,padding:'16px 22px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:11}}>Sélectionner une classe</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {allCours.map(c=>(
                <button key={c} onClick={()=>fetchClass(c)} style={{padding:'8px 15px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',border:`1.5px solid ${selectedClass===c?'#7c3aed':'#e2e8f0'}`,background:selectedClass===c?'#7c3aed':'white',color:selectedClass===c?'white':'#374151',transition:'all .2s'}}
                  onMouseOver={e=>{if(selectedClass!==c){e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.color='#7c3aed';}}}
                  onMouseOut={e=>{if(selectedClass!==c){e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151';}}}>
                  <GraduationCap size={12} style={{display:'inline',marginRight:5,verticalAlign:'middle'}}/>{c}
                </button>
              ))}
            </div>
          </div>

          {loadingC?<div style={{...card,padding:60,textAlign:'center',color:'#94a3b8'}}><RefreshCw size={26} style={{animation:'spin 1s linear infinite',marginBottom:10}}/><div style={{fontSize:13}}>Chargement des données de la classe…</div></div>
          :classData.length===0?<div style={{...card,padding:55,textAlign:'center',color:'#94a3b8'}}><Layers size={30} style={{marginBottom:10,opacity:.3}}/><div style={{fontSize:13,fontWeight:600}}>Sélectionnez une classe ci-dessus</div></div>
          :<>
            {/* Summary */}
            <div style={{...card,padding:'18px 22px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:13}}>Résumé — {selectedClass} · {classData.length} étudiants</div>
              <div style={{display:'flex',gap:11,flexWrap:'wrap'}}>
                {[{v:classData.reduce((a,s)=>a+s.total,0),l:'Total sessions',c:'#1d4ed8',bg:'#eff6ff',b:'#bfdbfe'},{v:classData.reduce((a,s)=>a+s.presents,0),l:'Présences',c:'#166534',bg:'#dcfce7',b:'#86efac'},{v:classData.reduce((a,s)=>a+s.absents,0),l:'Absences',c:'#991b1b',bg:'#fee2e2',b:'#fca5a5'},{v:classData.reduce((a,s)=>a+s.retards,0),l:'Retards',c:'#854d0e',bg:'#fef9c3',b:'#fde047'},{v:`${Math.round(classData.reduce((a,s)=>a+s.tauxPresence,0)/classData.length)}%`,l:'Taux moyen',c:'#0891b2',bg:'#ecfeff',b:'#a5f3fc'}].map(({v,l,c,bg,b})=>(
                  <div key={l} style={{flex:1,minWidth:110,background:bg,border:`1.5px solid ${b}`,borderRadius:11,padding:'13px 15px'}}>
                    <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
                    <div style={{fontSize:11,color:'#6b7280',marginTop:3,fontWeight:600}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Class table */}
            <div style={card}>
              <div style={{padding:'13px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10}}>
                <Layers size={14} color="#7c3aed"/>
                <span style={{fontWeight:700,fontSize:13,color:'#0f172a',flex:1}}>Statistiques par étudiant</span>
                <button onClick={exportClass} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#10b981',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  <Download size={12}/>Exporter
                </button>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    <th style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>#</th>
                    {[{l:'Étudiant',f:'nomComplet'},{l:'Sessions',f:'total'},{l:'Présences',f:'presents'},{l:'Absences',f:'absents'},{l:'Retards',f:'retards'},{l:'Taux',f:'tauxPresence'}].map(({l,f})=>(
                      <th key={f} onClick={()=>toggleClassSort(f)} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:classSortF===f?'#7c3aed':'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
                        <span style={{display:'flex',alignItems:'center',gap:4}}>{l}{classSortF===f?(classSortD==='asc'?<ArrowUp size={11} color="#7c3aed"/>:<ArrowDown size={11} color="#7c3aed"/>):<ArrowUpDown size={11} color="#cbd5e1"/>}</span>
                      </th>
                    ))}
                    <th style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {sortedClass.map((s,i)=>(
                      <tr key={s._id} style={{borderBottom:'1px solid #f8fafc',transition:'background .15s'}} onMouseOver={e=>e.currentTarget.style.background='#faf5ff'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'11px 14px',fontSize:12,color:'#94a3b8',fontWeight:700}}>{i+1}</td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:9}}>
                            <Avatar name={s.nomComplet} size={33}/>
                            <div>
                              <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{s.nomComplet}</div>
                              <div style={{fontSize:11,color:'#94a3b8'}}>{s.email||''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'11px 14px',fontWeight:700,fontSize:13,color:'#1d4ed8'}}>{s.total}</td>
                        <td style={{padding:'11px 14px',fontWeight:700,fontSize:13,color:'#166534'}}>{s.presents}</td>
                        <td style={{padding:'11px 14px',fontWeight:700,fontSize:13,color:'#991b1b'}}>{s.absents}</td>
                        <td style={{padding:'11px 14px',fontWeight:700,fontSize:13,color:'#854d0e'}}>{s.retards}</td>
                        <td style={{padding:'11px 14px',minWidth:130}}><TauxBar value={s.tauxPresence}/></td>
                        <td style={{padding:'11px 14px'}}>
                          <button onClick={()=>fetchHistory(s)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 11px',background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .2s'}}
                            onMouseOver={e=>{e.currentTarget.style.background='#2563eb';e.currentTarget.style.color='white';}}
                            onMouseOut={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#2563eb';}}>
                            <Eye size={11}/>Détail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>}
        </>}

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}*{box-sizing:border-box;}select:focus,input:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.1);}`}</style>
    </div>
  );
};

export default MangerHistorique;