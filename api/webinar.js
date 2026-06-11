// api/webinar.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxXshTKXGBM3S9lxEii_ZmoVNd8sza_BEz1SmYPCpSs2Vm1e4yhj4aTl9vkxA-yb0o_/exec';

  try {
    // ==================== GET ====================
    if (req.method === 'GET') {
      let url = GOOGLE_SCRIPT_URL;

      if (req.query.email) {
        url += `?email=${encodeURIComponent(req.query.email)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      return res.status(200).json(data);
    }

    // ==================== POST ====================
    if (req.method === 'POST') {
      console.log('📤 Datos recibidos del frontend:', req.body);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const text = await response.text();

      console.log('📥 Respuesta Apps Script:', text);

      let data;

      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('❌ Error parseando respuesta:', error);

        data = {
          success: false,
          error: 'La respuesta del Apps Script no es un JSON válido',
          raw: text
        };
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({
      success: false,
      error: 'Método no permitido'
    });

  } catch (error) {
    console.error('❌ Error API:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
