require('dotenv').config();
const axios = require('axios');

async function test() {
  console.log('WA_API_KEY:', process.env.WA_API_KEY ? process.env.WA_API_KEY.substring(0, 15) + '...' : 'MANQUANT !');
  console.log('WA_BRIDGE_ID:', process.env.WA_BRIDGE_ID || 'MANQUANT !');

  try {
    const res = await axios.post(
      `https://wabridges.com/api/instances/${process.env.WA_BRIDGE_ID}/proxy/send/text`,
      {
        chat: '212660079060',
        body: 'Test depuis Node.js - Kastler School'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ SUCCÈS:', res.data);
  } catch (err) {
    console.log('❌ ERREUR:', err.response?.data || err.message);
  }
}

test();