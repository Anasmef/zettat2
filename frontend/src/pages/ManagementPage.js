import React, { useState, useEffect, useCallback } from 'react';

const API = '/api/public';

const headers = (pwd) => ({
  'Content-Type': 'application/json',
  'x-public-password': pwd,
});

const timeAgo = (date) => {
  if (!date) return 'Jamais';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
};

// ─── Calcul temps restant ────────────────────────────────────
const getTempsRestant = (account) => {
  if (!account.minutesAcces || account.minutesAcces <= 0 || !account.lastSeen) return null;
  const minutesDepuis = (Date.now() - new Date(account.lastSeen).getTime()) / 60000;
  const restant = account.minutesAcces - minutesDepuis;
  if (restant <= 0) return { bloque: false };
  const mins = Math.floor(restant);
  const secs = Math.floor((restant - mins) * 60);
  return { bloque: true, texte: `${mins}m ${String(secs).padStart(2, '0')}s` };
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f5f6fa;
    --surface: #ffffff;
    --surface2: #f0f2f8;
    --border: #e4e6ef;
    --border2: #d0d3e8;
    --text: #1a1d2e;
    --muted: #8b8fa8;
    --accent: #5b52e8;
    --accent-light: #ece9fd;
    --green: #16a34a;
    --green-light: #dcfce7;
    --red: #dc2626;
    --red-light: #fee2e2;
    --admin: #5b52e8;
    --admin-light: #ece9fd;
    --manager: #059669;
    --manager-light: #d1fae5;
    --prof: #ea580c;
    --prof-light: #ffedd5;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);
  }

  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; }

  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #eef2ff 0%, #f5f6fa 60%, #fdf4ff 100%);
  }
  .login-box {
    width: 380px; background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 48px 40px; display: flex; flex-direction: column;
    gap: 20px; box-shadow: var(--shadow);
  }
  .login-logo { font-size: 40px; text-align: center; }
  .login-title { font-size: 22px; font-weight: 700; text-align: center; color: var(--text); letter-spacing: -0.3px; }
  .login-sub { font-size: 13px; color: var(--muted); text-align: center; }
  .inp {
    width: 100%; background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 12px 16px; color: var(--text);
    font-family: 'DM Mono', monospace; font-size: 14px; outline: none;
    transition: border .2s, box-shadow .2s;
  }
  .inp:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(91,82,232,0.1); }
  .inp::placeholder { color: var(--muted); }
  .btn {
    width: 100%; padding: 13px; background: var(--accent); color: #fff; border: none;
    border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;
    cursor: pointer; transition: opacity .2s, transform .1s; box-shadow: 0 2px 8px rgba(91,82,232,0.3);
  }
  .btn:hover { opacity: .9; }
  .btn:active { transform: scale(.98); }
  .btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
  .btn-sm {
    padding: 6px 14px; font-size: 12px; font-weight: 500; border-radius: 7px; cursor: pointer;
    border: 1.5px solid var(--border2); background: var(--surface); color: var(--text);
    font-family: 'Inter', sans-serif; transition: all .15s; white-space: nowrap;
  }
  .btn-sm:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
  .btn-sm.primary { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 6px rgba(91,82,232,0.25); }
  .btn-sm.primary:hover { opacity: .88; }
  .btn-sm.unlock {
    background: var(--green-light); border-color: #86efac; color: var(--green);
    font-weight: 600; width: 100%; padding: 9px 14px; font-size: 12px;
    border-radius: 8px; cursor: pointer; border: 1.5px solid #86efac;
    font-family: 'Inter', sans-serif; transition: all .15s;
  }
  .btn-sm.unlock:hover { background: #bbf7d0; border-color: var(--green); }
  .btn-sm.unlock:disabled { opacity: .5; cursor: not-allowed; }
  .err { color: var(--red); font-size: 12px; text-align: center; background: var(--red-light); padding: 8px 12px; border-radius: 8px; }

  .dash { max-width: 1300px; margin: 0 auto; padding: 32px 24px 80px; }
  .dash-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
  .dash-title { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: var(--text); }
  .dash-title span { color: var(--accent); }
  .logout-btn {
    padding: 8px 18px; background: var(--surface); border: 1.5px solid var(--border2);
    border-radius: 8px; color: var(--muted); font-family: 'Inter', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s;
  }
  .logout-btn:hover { border-color: var(--red); color: var(--red); background: var(--red-light); }

  .tabs {
    display: flex; gap: 4px; background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 12px; padding: 4px; margin-bottom: 28px; width: fit-content; box-shadow: var(--shadow-sm);
  }
  .tab {
    padding: 8px 22px; border-radius: 9px; font-size: 13px; font-weight: 500; cursor: pointer;
    border: none; background: transparent; color: var(--muted); font-family: 'Inter', sans-serif; transition: all .2s;
  }
  .tab.active { background: var(--accent); color: #fff; box-shadow: 0 2px 6px rgba(91,82,232,0.25); }
  .tab:not(.active):hover { background: var(--surface2); color: var(--text); }

  .section-title {
    font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--muted); margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1.5px solid var(--border);
  }

  .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 36px; }

  .account-card {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px;
    padding: 20px; display: flex; flex-direction: column; gap: 14px;
    box-shadow: var(--shadow-sm); transition: box-shadow .2s, border-color .2s;
  }
  .account-card:hover { box-shadow: var(--shadow); border-color: var(--border2); }
  .account-card.bloque { border-color: #fca5a5 !important; }

  .card-top { display: flex; align-items: center; gap: 12px; }
  .avatar {
    width: 44px; height: 44px; border-radius: 12px; display: flex;
    align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0;
  }
  .avatar.admin { background: var(--admin-light); color: var(--admin); }
  .avatar.manager { background: var(--manager-light); color: var(--manager); }
  .avatar.prof { background: var(--prof-light); color: var(--prof); }
  .card-info { flex: 1; min-width: 0; }
  .card-name { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-email { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .badge {
    font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 20px;
    letter-spacing: .3px; text-transform: uppercase; flex-shrink: 0;
  }
  .badge.admin { background: var(--admin-light); color: var(--admin); }
  .badge.manager { background: var(--manager-light); color: var(--manager); }
  .badge.prof { background: var(--prof-light); color: var(--prof); }
  .badge.actif { background: var(--green-light); color: var(--green); }
  .badge.inactif { background: var(--red-light); color: var(--red); }
  .badge.bloque-badge { background: var(--red-light); color: var(--red); }
  .card-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--muted); }
  .last-seen { font-family: 'DM Mono', monospace; }

  /* ── COUNTDOWN ── */
  .countdown-box {
    border-radius: 10px; padding: 12px 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    background: #fff5f5; border: 1.5px solid #fca5a5;
  }
  .countdown-box.libre { background: #f0fdf4; border-color: #86efac; }
  .countdown-info { display: flex; flex-direction: column; gap: 3px; }
  .countdown-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--red); }
  .countdown-label.libre { color: var(--green); }
  .countdown-timer { font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 700; color: var(--red); }
  .countdown-timer.libre { color: var(--green); font-size: 15px; }

  /* ── MINUTES CONTROL ── */
  .minutes-row {
    display: flex; align-items: center; gap: 8px; background: var(--surface2);
    border: 1.5px solid var(--border); border-radius: 10px; padding: 10px 14px;
  }
  .minutes-label { font-size: 11px; color: var(--muted); font-weight: 500; flex: 1; }
  .minutes-val {
    font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 600; color: var(--accent);
    min-width: 40px; text-align: center; background: var(--accent-light); padding: 2px 8px; border-radius: 6px;
  }
  .minutes-inp {
    width: 64px; background: var(--surface); border: 1.5px solid var(--border2);
    border-radius: 6px; padding: 4px 8px; color: var(--text);
    font-family: 'DM Mono', monospace; font-size: 13px; text-align: center; outline: none;
  }
  .minutes-inp:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(91,82,232,0.1); }

  .prof-stats { display: flex; gap: 6px; flex-wrap: wrap; }
  .stat-pill {
    font-size: 11px; padding: 3px 10px; border-radius: 20px;
    background: var(--surface2); color: var(--muted);
    font-family: 'DM Mono', monospace; border: 1px solid var(--border); font-weight: 500;
  }

  .search-row { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
  .search-inp {
    flex: 1; min-width: 200px; background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 10px 16px; color: var(--text); font-family: 'Inter', sans-serif;
    font-size: 13px; outline: none; box-shadow: var(--shadow-sm); transition: border .2s, box-shadow .2s;
  }
  .search-inp:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(91,82,232,0.1); }
  .search-inp::placeholder { color: var(--muted); }

  .table-wrap {
    overflow-x: auto; border-radius: 14px; border: 1.5px solid var(--border);
    box-shadow: var(--shadow-sm); background: var(--surface);
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th {
    padding: 12px 18px; text-align: left; font-size: 11px; font-weight: 600;
    letter-spacing: 1px; text-transform: uppercase; color: var(--muted);
    background: var(--surface2); border-bottom: 1.5px solid var(--border); white-space: nowrap;
  }
  td { padding: 14px 18px; border-bottom: 1px solid var(--border); background: var(--surface); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fafbff; }
  .mono { font-family: 'DM Mono', monospace; }

  .classe-editor { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .classe-select {
    background: var(--surface2); border: 1.5px solid var(--border2); border-radius: 7px;
    padding: 5px 10px; color: var(--text); font-family: 'Inter', sans-serif;
    font-size: 12px; outline: none; cursor: pointer; transition: border .15s;
  }
  .classe-select:focus { border-color: var(--accent); }
  .niveau-inp {
    background: var(--surface2); border: 1.5px solid var(--border2); border-radius: 7px;
    padding: 5px 10px; color: var(--text); font-family: 'DM Mono', monospace;
    font-size: 12px; outline: none; width: 120px; transition: border .15s;
  }
  .niveau-inp:focus { border-color: var(--accent); }
  .saved-flash { color: var(--green); font-size: 11px; font-family: 'DM Mono', monospace; font-weight: 600; }

  .empty { text-align: center; padding: 60px 20px; color: var(--muted); font-size: 14px; }
  .spinner-wrap { display: flex; justify-content: center; padding: 60px; }
  .spinner {
    width: 36px; height: 36px; border: 3px solid var(--border2);
    border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .stats-bar { display: flex; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat-box {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px;
    padding: 16px 22px; display: flex; flex-direction: column; gap: 4px;
    min-width: 120px; box-shadow: var(--shadow-sm);
  }
  .stat-box .num { font-size: 26px; font-weight: 700; font-family: 'DM Mono', monospace; }
  .stat-box .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }

  @media (max-width: 600px) {
    .dash { padding: 20px 16px 60px; }
    .dash-title { font-size: 20px; }
    .cards-grid { grid-template-columns: 1fr; }
  }
`;

// ─── CountdownDisplay ────────────────────────────────────────
const CountdownDisplay = ({ account }) => {
  const [tr, setTr] = useState(() => getTempsRestant(account));

  useEffect(() => {
    if (!account.minutesAcces || account.minutesAcces <= 0) return;
    setTr(getTempsRestant(account));
    const id = setInterval(() => setTr(getTempsRestant(account)), 1000);
    return () => clearInterval(id);
  }, [account.minutesAcces, account.lastSeen]);

  if (!tr) return null;

  if (!tr.bloque) {
    return (
      <div className="countdown-box libre">
        <div className="countdown-info">
          <span className="countdown-label libre">Accès</span>
          <span className="countdown-timer libre">✓ Libre — peut se connecter</span>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-box">
      <div className="countdown-info">
        <span className="countdown-label">⛔ Bloqué — temps restant</span>
        <span className="countdown-timer">{tr.texte}</span>
      </div>
    </div>
  );
};

// ─── MinutesControl ──────────────────────────────────────────
const MinutesControl = ({ account, password, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(account.minutesAcces ?? 0);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const roleMap = { Admin: 'admin', Manager: 'manager', Professeur: 'professeur' };

  const sendMinutes = async (mins, setLoadFn) => {
    setLoadFn(true);
    try {
      const res = await fetch(`${API}/minutes/${roleMap[account.role]}/${account._id}`, {
        method: 'PATCH',
        headers: headers(password),
        body: JSON.stringify({ minutes: mins }),
      });
      if (res.ok) {
        onUpdated(account._id, account.role, mins);
        setVal(mins);
        setEditing(false);
      }
    } finally {
      setLoadFn(false);
    }
  };

  const save = () => {
    const mins = parseInt(val);
    if (isNaN(mins) || mins < 0) return;
    sendMinutes(mins, setLoading);
  };

  const unlock = () => sendMinutes(0, setUnlocking);

  const tr = getTempsRestant(account);
  const estBloque = tr?.bloque === true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Modifier les minutes */}
      <div className="minutes-row">
        <span className="minutes-label">⏱ Minutes d'accès</span>
        {editing ? (
          <>
            <input
              className="minutes-inp"
              type="number"
              min="0"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              autoFocus
            />
            <button className="btn-sm primary" onClick={save} disabled={loading}>
              {loading ? '...' : '✓'}
            </button>
            <button className="btn-sm" onClick={() => setEditing(false)}>✕</button>
          </>
        ) : (
          <>
            <span className="minutes-val">{account.minutesAcces ?? 0} min</span>
            <button className="btn-sm" onClick={() => setEditing(true)}>Modifier</button>
          </>
        )}
      </div>

      {/* Bouton débloquer — visible seulement si la personne est bloquée */}
      {estBloque && (
        <button className="btn-sm unlock" onClick={unlock} disabled={unlocking}>
          {unlocking ? 'Déblocage...' : '🔓 Débloquer maintenant — remettre à 0'}
        </button>
      )}
    </div>
  );
};

// ─── AccountCard ──────────────────────────────────────────────
const AccountCard = ({ account, password, onUpdated }) => {
  const roleClass = { Admin: 'admin', Manager: 'manager', Professeur: 'prof' }[account.role] || 'admin';
  const initials = account.nom?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  const tr = getTempsRestant(account);
  const estBloque = tr?.bloque === true;

  return (
    <div className={`account-card${estBloque ? ' bloque' : ''}`}>
      <div className="card-top">
        <div className={`avatar ${roleClass}`}>{initials}</div>
        <div className="card-info">
          <div className="card-name">{account.nom}</div>
          <div className="card-email">{account.email}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
          <span className={`badge ${roleClass}`}>{account.role}</span>
          <span className={`badge ${account.actif ? 'actif' : 'inactif'}`}>
            {account.actif ? 'Actif' : 'Inactif'}
          </span>
          {estBloque && <span className="badge bloque-badge">Bloqué</span>}
        </div>
      </div>

      {account.role === 'Professeur' && (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
            📚 {account.matiere} — {account.cours?.length || 0} cours
          </div>
          {account.statistiques && (
            <div className="prof-stats">
              <span className="stat-pill">🕐 {account.statistiques.totalRetards || 0} retards</span>
              <span className="stat-pill">❌ {account.statistiques.totalAbsences || 0} absences</span>
              <span className="stat-pill">⏱ {account.statistiques.tempsRetardTotal || 0} min</span>
            </div>
          )}
        </>
      )}

      <CountdownDisplay account={account} />
      <MinutesControl account={account} password={password} onUpdated={onUpdated} />

      <div className="card-meta">
        <span className="last-seen">🕐 {timeAgo(account.lastSeen)}</span>
      </div>
    </div>
  );
};

// ─── ClasseEditor ─────────────────────────────────────────────
const ClasseEditor = ({ etudiant, password, coursList, onUpdated }) => {
  const [editingNiveau, setEditingNiveau] = useState(false);
  const [niveau, setNiveau] = useState(etudiant.niveau || '');
  const [selectedCours, setSelectedCours] = useState(etudiant.cours || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/etudiant/${etudiant._id}/classe`, {
        method: 'PATCH',
        headers: headers(password),
        body: JSON.stringify({ niveau, cours: selectedCours }),
      });
      if (res.ok) {
        onUpdated(etudiant._id, niveau, selectedCours);
        setSaved(true);
        setEditingNiveau(false);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="classe-editor">
        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 50, fontWeight: 500 }}>Niveau :</span>
        {editingNiveau ? (
          <input
            className="niveau-inp"
            value={niveau}
            onChange={e => setNiveau(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
        ) : (
          <span
            onClick={() => setEditingNiveau(true)}
            style={{
              cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono',
              color: niveau ? 'var(--text)' : 'var(--muted)',
              background: niveau ? 'var(--surface2)' : 'transparent',
              padding: niveau ? '3px 8px' : '0',
              borderRadius: 6, fontWeight: niveau ? 500 : 400,
            }}
          >
            {niveau || '— cliquer pour éditer'}
          </span>
        )}
        {editingNiveau && (
          <button className="btn-sm" onClick={() => setEditingNiveau(false)}>✕</button>
        )}
      </div>

      <div className="classe-editor" style={{ flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 50, fontWeight: 500 }}>Cours :</span>
        {coursList.length > 0 && (
          <select
            className="classe-select"
            onChange={e => {
              if (e.target.value && !selectedCours.includes(e.target.value)) {
                setSelectedCours(prev => [...prev, e.target.value]);
              }
              e.target.value = '';
            }}
          >
            <option value="">+ Ajouter un cours</option>
            {coursList.filter(c => !selectedCours.includes(c.nom)).map(c => (
              <option key={c._id} value={c.nom}>{c.nom}</option>
            ))}
          </select>
        )}
        {selectedCours.map(c => (
          <span
            key={c}
            onClick={() => setSelectedCours(prev => prev.filter(x => x !== c))}
            style={{
              fontSize: 11, padding: '3px 10px',
              background: 'var(--accent-light)', border: '1px solid #c7c2f8',
              borderRadius: 20, cursor: 'pointer', color: 'var(--accent)',
              fontFamily: 'Inter', fontWeight: 500,
            }}
            title="Cliquer pour retirer"
          >
            {c} ✕
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn-sm primary" onClick={save} disabled={saving}>
          {saving ? '...' : '💾 Enregistrer'}
        </button>
        {saved && <span className="saved-flash">✓ Enregistré</span>}
      </div>
    </div>
  );
};

// ─── APP ──────────────────────────────────────────────────────
export default function PublicManagementPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState('comptes');
  const [data, setData] = useState(null);
  const [etudiants, setEtudiants] = useState([]);
  const [coursList, setCoursList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const savedPwd = sessionStorage.getItem('pub_pwd');
    if (savedPwd) { setPassword(savedPwd); setAuthed(true); }
  }, []);

  const login = async () => {
    setLoginLoading(true);
    setLoginErr('');
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem('pub_pwd', password);
        setAuthed(true);
      } else {
        setLoginErr('Mot de passe incorrect');
      }
    } catch {
      setLoginErr('Erreur de connexion au serveur');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/dashboard`, { headers: headers(password) });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [password]);

  const fetchEtudiants = useCallback(async () => {
    setLoading(true);
    try {
      const [etRes, coursRes] = await Promise.all([
        fetch(`${API}/etudiants`, { headers: headers(password) }),
        fetch(`${API}/cours`, { headers: headers(password) }),
      ]);
      if (etRes.ok) setEtudiants(await etRes.json());
      if (coursRes.ok) setCoursList(await coursRes.json());
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'comptes') fetchDashboard();
    else fetchEtudiants();
  }, [authed, tab]);

  const handleMinutesUpdated = (id, role, mins) => {
    if (!data) return;
    const key = { Admin: 'admins', Manager: 'inscripteurs', Professeur: 'professeurs' }[role];
    setData(prev => ({
      ...prev,
      [key]: prev[key].map(a => a._id === id ? { ...a, minutesAcces: mins } : a),
    }));
  };

  const handleClasseUpdated = (id, niveau, cours) => {
    setEtudiants(prev => prev.map(e => e._id === id ? { ...e, niveau, cours } : e));
  };

  const logout = () => {
    sessionStorage.removeItem('pub_pwd');
    setAuthed(false);
    setPassword('');
    setData(null);
  };

  const filtered = etudiants.filter(e =>
    !search ||
    e.nomComplet?.toLowerCase().includes(search.toLowerCase()) ||
    e.codeMassar?.toLowerCase().includes(search.toLowerCase()) ||
    e.niveau?.toLowerCase().includes(search.toLowerCase())
  );

  if (!authed) {
    return (
      <>
        <style>{css}</style>
        <div className="login-wrap">
          <div className="login-box">
            <div className="login-logo">🏫</div>
            <div className="login-title">Espace Administration</div>
            <div className="login-sub">Accès réservé — entrez le mot de passe</div>
            <input
              className="inp"
              type="password"
              placeholder="Mot de passe..."
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginErr(''); }}
              onKeyDown={e => e.key === 'Enter' && login()}
            />
            {loginErr && <div className="err">❌ {loginErr}</div>}
            <button className="btn" onClick={login} disabled={loginLoading || !password}>
              {loginLoading ? 'Vérification...' : 'Accéder →'}
            </button>
          </div>
        </div>
      </>
    );
  }

  const allAccounts = data ? [...data.admins, ...data.inscripteurs, ...data.professeurs] : [];

  return (
    <>
      <style>{css}</style>
      <div className="dash">
        <div className="dash-header">
          <div className="dash-title">🏫 Admin <span>Public</span></div>
          <button className="logout-btn" onClick={logout}>Déconnexion</button>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'comptes' ? 'active' : ''}`} onClick={() => setTab('comptes')}>
            👥 Comptes
          </button>
          <button className={`tab ${tab === 'etudiants' ? 'active' : ''}`} onClick={() => setTab('etudiants')}>
            🎓 Étudiants
          </button>
        </div>

        {tab === 'comptes' && (
          <>
            {loading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : data ? (
              <>
                <div className="stats-bar">
                  <div className="stat-box">
                    <span className="num" style={{ color: 'var(--admin)' }}>{data.admins.length}</span>
                    <span className="lbl">Admins</span>
                  </div>
                  <div className="stat-box">
                    <span className="num" style={{ color: 'var(--manager)' }}>{data.inscripteurs.length}</span>
                    <span className="lbl">Managers</span>
                  </div>
                  <div className="stat-box">
                    <span className="num" style={{ color: 'var(--prof)' }}>{data.professeurs.length}</span>
                    <span className="lbl">Professeurs</span>
                  </div>
                  <div className="stat-box">
                    <span className="num" style={{ color: 'var(--green)' }}>
                      {allAccounts.filter(a => a.actif).length}
                    </span>
                    <span className="lbl">Actifs</span>
                  </div>
                </div>

                {data.admins.length > 0 && (
                  <>
                    <div className="section-title">Administrateurs</div>
                    <div className="cards-grid">
                      {data.admins.map(a => (
                        <AccountCard key={a._id} account={a} password={password} onUpdated={handleMinutesUpdated} />
                      ))}
                    </div>
                  </>
                )}

                {data.inscripteurs.length > 0 && (
                  <>
                    <div className="section-title">Managers / Inscripteurs</div>
                    <div className="cards-grid">
                      {data.inscripteurs.map(a => (
                        <AccountCard key={a._id} account={a} password={password} onUpdated={handleMinutesUpdated} />
                      ))}
                    </div>
                  </>
                )}

                {data.professeurs.length > 0 && (
                  <>
                    <div className="section-title">Professeurs</div>
                    <div className="cards-grid">
                      {data.professeurs.map(a => (
                        <AccountCard key={a._id} account={a} password={password} onUpdated={handleMinutesUpdated} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="empty">Impossible de charger les données</div>
            )}
          </>
        )}

        {tab === 'etudiants' && (
          <>
            <div className="search-row">
              <input
                className="search-inp"
                placeholder="🔍 Rechercher par nom, code Massar, niveau..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="btn-sm" onClick={fetchEtudiants}>↻ Rafraîchir</button>
            </div>

            {loading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th>Code Massar</th>
                      <th>Niveau &amp; Cours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3}><div className="empty">Aucun étudiant trouvé</div></td>
                      </tr>
                    ) : filtered.map(e => (
                      <tr key={e._id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{e.nomComplet}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{e.genre || ''}</div>
                        </td>
                        <td>
                          <span className="mono" style={{ fontSize: 12, background: 'var(--surface2)', padding: '3px 8px', borderRadius: 6, color: 'var(--text)' }}>
                            {e.codeMassar || '—'}
                          </span>
                        </td>
                        <td>
                          <ClasseEditor
                            etudiant={e}
                            password={password}
                            coursList={coursList}
                            onUpdated={handleClasseUpdated}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}