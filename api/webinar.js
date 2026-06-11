// api/webinar.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ NUEVA URL VERSIÓN 2
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXshTKXGBM3S9lxEii_ZmoVNd8sza_BEz1SmYPCpSs2Vm1e4yhj4aTl9vkxA-yb0o_/exec";

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
      // Construir parámetros incluyendo planEstudio
      const params = new URLSearchParams();
      params.append('nombreCompleto', req.body.nombreCompleto || '');
      params.append('email', req.body.email || '');
      params.append('planEstudio', req.body.planEstudio || ''); // ← NUEVO CAMPO
      params.append('tipoUsuario', req.body.tipoUsuario || '');
      params.append('solicitaCertificado', req.body.solicitaCertificado || 'no');
      params.append('comentarios', req.body.comentarios || '');
      params.append('curso', req.body.curso || '');
      params.append('pead', req.body.pead || '');

      console.log('📤 Enviando a Google Script:', params.toString());

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { success: true, raw: text };
      }
      return res.status(200).json(data);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
