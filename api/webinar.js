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
    if (req.method === 'GET') {
      let url = GOOGLE_SCRIPT_URL;
      if (req.query.email) {
        url += `?email=${encodeURIComponent(req.query.email)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // Obtener el body como string
      let bodyString;
      
      if (typeof req.body === 'string') {
        bodyString = req.body;
      } else {
        bodyString = new URLSearchParams(req.body).toString();
      }

      console.log('📤 Body a enviar a Google Script:', bodyString);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyString
      });

      const text = await response.text();
      console.log('📥 Respuesta CRUDA de Google Script:', text);

      // Intentar parsear como JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Si no es JSON, devolver un objeto de error con el texto
        console.error('❌ No es JSON válido:', text.substring(0, 200));
        data = { 
          success: false, 
          error: 'El servidor respondió con un formato inválido',
          raw: text.substring(0, 200)
        };
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('❌ Error en proxy:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
