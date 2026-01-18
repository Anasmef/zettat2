import { useState, useEffect } from 'react';

export default function MaintenancePage() {
  const [status, setStatus] = useState('ON');
  const [remainingTime, setRemainingTime] = useState(null);
  const [selectedMinutes, setSelectedMinutes] = useState(1);
  const [customMinutes, setCustomMinutes] = useState('');
  const [loading, setLoading] = useState(false);

  // Adapter l'URL selon l'environnement
  const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://kastler.ma/api'  // Production
    : '/api'; // Développement
  const durations = [1, 2, 3, 4, 5, 6, 10, 30];

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status === 'OFF' && remainingTime) {
      const interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            checkStatus();
            return null;
          }
          return prev - 1;
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [status, remainingTime]);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/maintenance`);
      const data = await res.json();
      setStatus(data.status ? 'OFF' : 'ON');
      setRemainingTime(data.remainingTime);
    } catch (err) {
      console.error('Erreur vérification statut:', err);
    }
  };

  const handleStop = async () => {
    const durationToUse = customMinutes ? parseInt(customMinutes) : selectedMinutes;
    
    if (!durationToUse || durationToUse < 1 || durationToUse > 1440) {
      alert('⚠️ Veuillez entrer une durée entre 1 et 1440 minutes (24h)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/maintenance/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: durationToUse })
      });

      if (res.ok) {
        const data = await res.json();
        const durationUsed = customMinutes ? parseInt(customMinutes) : selectedMinutes;
        setStatus('OFF');
        setRemainingTime(durationUsed);
        setCustomMinutes('');
        console.log('✅', data.message);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/maintenance/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('ON');
        setRemainingTime(null);
        console.log('✅', data.message);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'OFF') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-500 to-orange-500 p-4">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-4">🔧</h1>
          <h2 className="text-4xl font-bold mb-2">Maintenance en cours</h2>
          <p className="text-xl mb-6">Le projet sera de retour dans</p>
          <div className="text-7xl font-bold mb-4">{remainingTime} min</div>
          <p className="text-lg opacity-90 mb-8">Merci de votre patience</p>

          <button
            onClick={handleResume}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition transform hover:scale-105 text-lg"
          >
            {loading ? '⏳...' : '▶️ RELANCER'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          🎛️ Contrôle du Projet
        </h1>

        <div className="text-center mb-8">
          <div className="inline-block">
            <div className="bg-green-500 text-white rounded-full w-24 h-24 flex items-center justify-center">
              <span className="text-2xl font-bold">ON</span>
            </div>
          </div>
          <p className="text-green-600 font-semibold mt-2">Projet actif</p>
        </div>

        <div className="mb-8">
          <label className="block text-gray-700 font-semibold mb-3">
            Durée de maintenance
          </label>
          
          <div className="grid grid-cols-4 gap-2 mb-4">
            {durations.map(min => (
              <button
                key={min}
                onClick={() => {
                  setSelectedMinutes(min);
                  setCustomMinutes('');
                }}
                disabled={loading}
                className={`py-2 rounded-lg font-semibold transition text-sm ${
                  selectedMinutes === min && !customMinutes
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="1440"
              placeholder="Ou entrez une durée..."
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value);
                setSelectedMinutes(0);
              }}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <span className="flex items-center text-gray-600 font-semibold">min</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
          >
            {loading ? '⏳...' : '🛑 STOP'}
          </button>
          <button
            onClick={handleResume}
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
          >
            {loading ? '⏳...' : '▶️ ON'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Sélectionne une durée, clique STOP, puis le projet affichera une page vide pour tous
        </p>
      </div>
    </div>
  );
}