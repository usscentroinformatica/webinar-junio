// api/webinar.js
export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzB-OSuWr_In4R2Ei6VCwx0AQwcv77s3XU5RefGsCge6Oj4n-e-hckrlkJrObVPCZYY/exec";

  try {
    // GET para verificar
    if (req.method === 'GET') {
      let url = GOOGLE_SCRIPT_URL;
      if (req.query.email) {
        url += `?email=${encodeURIComponent(req.query.email)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      return res.status(200).json(data);
    }

    // POST para guardar
    if (req.method === 'POST') {
      // 🔴 IMPORTANTE: Obtener el body correctamente
      let bodyData = req.body;
      
      // Si viene como string, parsearlo
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch (e) {
          bodyData = req.body;
        }
      }
      
      // Construir parámetros
      const params = new URLSearchParams();
      params.append('nombreCompleto', bodyData.nombreCompleto || '');
      params.append('email', bodyData.email || '');
      params.append('planEstudio', bodyData.planEstudio || '');
      params.append('tipoUsuario', bodyData.tipoUsuario || '');
      params.append('solicitaCertificado', bodyData.solicitaCertificado || 'no');
      params.append('comentarios', bodyData.comentarios || '');
      params.append('curso', bodyData.curso || '');
      params.append('pead', bodyData.pead || '');

      console.log('📤 Parámetros enviados:', params.toString());

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const text = await response.text();
      console.log('📥 Respuesta:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { success: true, raw: text };
      }
      
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
