import React, { useState, useEffect } from 'react';
import logoUss from '../assets/uss.png';

// Iconos SVG (mantenemos los que usas en tu diseño)
const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a2290" strokeWidth="2.5">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#63ed12" strokeWidth="2.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a2290" strokeWidth="2.5">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const SuccessIcon = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="45" fill="#63ed12" />
    <path d="M30 50 L43 63 L70 37" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EncuestaWebinar = () => {
  // ✅ SOLO CAMBIÉ ESTAS URLs - NUEVO APPS SCRIPT DEL WEBINAR
  // api/webinar.js
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzB-OSuWr_In4R2Ei6VCwx0AQwcv77s3XU5RefGsCge6Oj4n-e-hckrlkJrObVPCZYY/exec";

  // Detectar si estamos en local o producción
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // URL de la API (en local usamos directo Google Script, en producción usamos Vercel)
  const API_URL = isLocal ? GOOGLE_SCRIPT_URL : '/api/webinar';

  // Estados principales
  const [tipoUsuario, setTipoUsuario] = useState(''); // 'uss' o 'externo'
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [correoExterno, setCorreoExterno] = useState('');
  const [estudiantesEncontrados, setEstudiantesEncontrados] = useState([]);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    curso: '',
    pead: '',
    docente: '',
    turno: '',
    dias: '',
    horaInicio: '',
    horaFin: '',
    solicitaCertificado: 'no',
    comentarios: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exitoModal, setExitoModal] = useState(false);
  const [baseEstudiantes, setBaseEstudiantes] = useState([]);
  const [paso, setPaso] = useState('seleccion');
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });

  // Cargar base de datos al iniciar
  useEffect(() => {
    const cargarBaseEstudiantes = async () => {
      try {
        // Misma hoja que la encuesta (BaseUnificada)
        const SHEET_ID = '11ZaEQz5_Yxo7lmk0cyKYPWJWwKC2HHRi2iRJkjRUtOI';
        const response = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/BaseUnificada`);

        if (response.ok) {
          const data = await response.json();
          console.log('Base cargada:', data.length, 'estudiantes');
          setBaseEstudiantes(data);
        } else {
          console.warn('No se pudo cargar la base');
        }
      } catch (error) {
        console.error('Error cargando base:', error);
      }
    };

    cargarBaseEstudiantes();
  }, []);

  // Manejar selección de tipo de usuario
  const handleSeleccionTipo = (tipo) => {
    setTipoUsuario(tipo);
    setError('');

    if (tipo === 'uss') {
      setPaso('login');
    } else {
      // Usuario externo - limpiar formulario
      setCorreoExterno('');
      setEstudiantesEncontrados([]);
      setFormData({
        nombreCompleto: '',
        curso: '',
        pead: '',
        docente: '',
        turno: '',
        dias: '',
        horaInicio: '',
        horaFin: '',
        solicitaCertificado: 'no',
        comentarios: ''
      });
      setPaso('formulario');
    }
  };

  // Verificar correo USS
  // Normaliza y limpia agresivamente un email/string
  function normalizarEmail(raw) {
    if (raw == null) return '';
    let s = String(raw);
    try { s = s.normalize('NFKC'); } catch (e) {}
    s = s.trim().toLowerCase();
    // eliminar espacios internos, tabs y saltos
    s = s.replace(/\s+/g, '');
    // eliminar caracteres invisibles y BOM
    s = s.replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, '');
    // eliminar control chars sin usar regex (evita advertencias de ESLint sobre regex de control)
    s = Array.from(s).filter(ch => {
      const code = ch.charCodeAt(0);
      return !((code >= 0 && code <= 31) || (code >= 127 && code <= 159));
    }).join('');
    // reemplazos sencillos de comillas tipográficas
    s = s.replace(/[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F]/g, "'");
    return s;
  }

  // Score simple: contar posiciones diferentes
  function simpleCharDiffScore(a, b) {
    const la = a.length, lb = b.length;
    let diff = Math.abs(la - lb);
    for (let i = 0; i < Math.min(la, lb); i++) if (a[i] !== b[i]) diff++;
    return diff;
  }

  function mostrarComparacionChar(a, b) {
    const max = Math.max(a.length, b.length);
    const rows = [];
    for (let i = 0; i < max; i++) {
      const ca = a[i] === undefined ? '(none)' : a[i];
      const cb = b[i] === undefined ? '(none)' : b[i];
      const mark = ca === cb ? ' ' : '<-- diff';
      rows.push({ pos: i, expected: ca, candidate: cb, mark });
    }
    console.log('[verificarCorreoUSS] Comparación carácter por carácter (expected vs candidate):');
    console.table(rows);
  }

  const verificarCorreoUSS = async () => {
    if (!nombreUsuario.trim()) {
      setError('Por favor, ingresa tu nombre de usuario');
      return;
    }

    setLoading(true);
    setError('');

    // Preparar email esperado
    let nombreLimpio = nombreUsuario.trim().toLowerCase();
    if (nombreLimpio.includes('@')) nombreLimpio = nombreLimpio.split('@')[0];
    const expectedEmail = `${nombreLimpio}@uss.edu.pe`;
    const expectedNorm = normalizarEmail(expectedEmail);

    console.groupCollapsed('[verificarCorreoUSS] Inicio de verificación para', nombreUsuario);
    console.log('[verificarCorreoUSS] Email esperado (normalized):', expectedNorm);
    console.log('[verificarCorreoUSS] Base tamaño:', Array.isArray(baseEstudiantes) ? baseEstudiantes.length : 0);

    if (!Array.isArray(baseEstudiantes) || baseEstudiantes.length === 0) {
      console.warn('[verificarCorreoUSS] BaseUnificada vacía o no cargada');
      setError('Base de datos no disponible. Intenta más tarde.');
      setLoading(false);
      console.groupEnd();
      return;
    }

    // detectar keys candidatas
    const sampleKeys = Object.keys(baseEstudiantes[0] || {});
    const posibleKeys = sampleKeys.filter(k => {
      const kl = String(k).toLowerCase();
      return kl.includes('correo') || kl.includes('email') || kl.includes('e-mail') || kl.includes('mail');
    });
    console.log('[verificarCorreoUSS] Keys detectadas:', sampleKeys);
    console.log('[verificarCorreoUSS] Keys candidatas:', posibleKeys.length ? posibleKeys : '(ninguna)');

    // mostrar primeros 5 emails detectados para diagnostico
    const primerosEmails = [];
    for (let i = 0; i < Math.min(baseEstudiantes.length, 50) && primerosEmails.length < 5; i++) {
      const row = baseEstudiantes[i];
      for (const key of Object.keys(row)) {
        const raw = row[key];
        if (raw == null) continue;
        const norm = normalizarEmail(raw);
        if (norm.includes('@')) {
          primerosEmails.push({ idx: i, key, raw, norm });
          if (primerosEmails.length >= 5) break;
        }
      }
    }
    console.log('[verificarCorreoUSS] Primeros 5 emails detectados (limpios):', primerosEmails);

    const obtenerEmailsDeFila = (row) => {
      const emails = [];
      const keysOrdered = [...new Set([...posibleKeys, ...Object.keys(row)])];
      for (const key of keysOrdered) {
        const raw = row[key];
        if (raw == null) continue;
        const norm = normalizarEmail(raw);
        emails.push({ key, raw, norm });
      }
      return emails;
    };

    // Strategy 1: match exact after cleaning
    for (let i = 0; i < baseEstudiantes.length; i++) {
      const row = baseEstudiantes[i];
      const emails = obtenerEmailsDeFila(row);
      for (const e of emails) {
        if (!e.norm) continue;
        if (e.norm === expectedNorm) {
          console.log('[verificarCorreoUSS] Estrategia 1: Coincidencia exacta en fila', i, 'key:', e.key);
          console.log('[verificarCorreoUSS] Email encontrado (raw):', e.raw);
          // reunir todas las filas que coinciden en esa columna
          const matching = baseEstudiantes.filter(r => normalizarEmail(r[e.key]) === expectedNorm);
          setEstudiantesEncontrados(matching);
          const primerCurso = matching[0];
          const findKey = (prefix) => Object.keys(primerCurso).find(k => k.toLowerCase().includes(prefix.toLowerCase()));
          const keys = {
            nombre: findKey('Nombre') || 'Nombre completo',
            curso: findKey('Curso') || 'Curso',
            pead: findKey('Secc') || 'Sección (PEAD)',
            docente: findKey('Docen') || 'Docente',
            turno: findKey('Turno') || 'Turno',
            dias: findKey('Día') || 'Días',
            hInicio: findKey('Inicio') || 'Hora inicio',
            hFin: findKey('Fin') || 'Hora fin'
          };
          setFormData({
            nombreCompleto: primerCurso[keys.nombre] || '',
            curso: matching.length === 1 ? (primerCurso[keys.curso] || '') : '',
            pead: matching.length === 1 ? (primerCurso[keys.pead] || '') : '',
            docente: matching.length === 1 ? (primerCurso[keys.docente] || '') : '',
            turno: matching.length === 1 ? (primerCurso[keys.turno] || '') : '',
            dias: matching.length === 1 ? (primerCurso[keys.dias] || '') : '',
            horaInicio: matching.length === 1 ? (primerCurso[keys.hInicio] || '') : '',
            horaFin: matching.length === 1 ? (primerCurso[keys.hFin] || '') : '',
            solicitaCertificado: 'no',
            comentarios: ''
          });
          setPaso('formulario');
          setLoading(false);
          console.groupEnd();
          return;
        }
      }
    }

    // Strategy 2: comparar eliminando caracteres no alfanuméricos (excepto @ y .)
    const sanitizeForCompare = s => normalizarEmail(s).replace(/[^a-z0-9@.]/g, '');
    const expectedSan = sanitizeForCompare(expectedNorm);
    for (let i = 0; i < baseEstudiantes.length; i++) {
      const row = baseEstudiantes[i];
      const emails = obtenerEmailsDeFila(row);
      for (const e of emails) {
        const candSan = sanitizeForCompare(e.norm);
        if (!candSan) continue;
        if (candSan === expectedSan) {
          console.log('[verificarCorreoUSS] Estrategia 2: Coincidencia alfanumérica en fila', i, 'key:', e.key);
          console.log('[verificarCorreoUSS] Email encontrado (raw):', e.raw, '-> sanitized:', candSan);
          const matching = baseEstudiantes.filter(r => sanitizeForCompare(r[e.key]) === expectedSan);
          setEstudiantesEncontrados(matching);
          const primerCurso = matching[0];
          const findKey = (prefix) => Object.keys(primerCurso).find(k => k.toLowerCase().includes(prefix.toLowerCase()));
          const keys = {
            nombre: findKey('Nombre') || 'Nombre completo',
            curso: findKey('Curso') || 'Curso',
            pead: findKey('Secc') || 'Sección (PEAD)',
            docente: findKey('Docen') || 'Docente',
            turno: findKey('Turno') || 'Turno',
            dias: findKey('Día') || 'Días',
            hInicio: findKey('Inicio') || 'Hora inicio',
            hFin: findKey('Fin') || 'Hora fin'
          };
          setFormData({
            nombreCompleto: primerCurso[keys.nombre] || '',
            curso: matching.length === 1 ? (primerCurso[keys.curso] || '') : '',
            pead: matching.length === 1 ? (primerCurso[keys.pead] || '') : '',
            docente: matching.length === 1 ? (primerCurso[keys.docente] || '') : '',
            turno: matching.length === 1 ? (primerCurso[keys.turno] || '') : '',
            dias: matching.length === 1 ? (primerCurso[keys.dias] || '') : '',
            horaInicio: matching.length === 1 ? (primerCurso[keys.hInicio] || '') : '',
            horaFin: matching.length === 1 ? (primerCurso[keys.hFin] || '') : '',
            solicitaCertificado: 'no',
            comentarios: ''
          });
          setPaso('formulario');
          setLoading(false);
          console.groupEnd();
          return;
        }
      }
    }

    // Strategy 3: búsqueda por nombre (respaldo)
    const nombreCandidate = nombreLimpio.replace(/[^a-z0-9]/g, '');
    if (nombreCandidate) {
      for (let i = 0; i < baseEstudiantes.length; i++) {
        const row = baseEstudiantes[i];
        for (const key of Object.keys(row)) {
          const v = row[key];
          if (!v) continue;
          const vNorm = normalizarEmail(v).replace(/[^a-z0-9]/g, '');
          if (vNorm.includes(nombreCandidate) || nombreCandidate.includes(vNorm)) {
            const emails = obtenerEmailsDeFila(row).filter(x => x.norm && x.norm.includes('@'));
            console.log('[verificarCorreoUSS] Estrategia 3: Coincidencia por nombre en fila', i, 'campo:', key);
            console.log('[verificarCorreoUSS] Campo que coincidió (raw):', v, 'Emails en fila:', emails);
            if (emails.length > 0) {
              const e = emails[0];
              const matching = baseEstudiantes.filter(r => normalizarEmail(r[e.key]) === e.norm);
              setEstudiantesEncontrados(matching);
              const primerCurso = matching[0];
              const findKey = (prefix) => Object.keys(primerCurso).find(k => k.toLowerCase().includes(prefix.toLowerCase()));
              const keys = {
                nombre: findKey('Nombre') || 'Nombre completo',
                curso: findKey('Curso') || 'Curso',
                pead: findKey('Secc') || 'Sección (PEAD)',
                docente: findKey('Docen') || 'Docente',
                turno: findKey('Turno') || 'Turno',
                dias: findKey('Día') || 'Días',
                hInicio: findKey('Inicio') || 'Hora inicio',
                hFin: findKey('Fin') || 'Hora fin'
              };
              setFormData({
                nombreCompleto: primerCurso[keys.nombre] || '',
                curso: matching.length === 1 ? (primerCurso[keys.curso] || '') : '',
                pead: matching.length === 1 ? (primerCurso[keys.pead] || '') : '',
                docente: matching.length === 1 ? (primerCurso[keys.docente] || '') : '',
                turno: matching.length === 1 ? (primerCurso[keys.turno] || '') : '',
                dias: matching.length === 1 ? (primerCurso[keys.dias] || '') : '',
                horaInicio: matching.length === 1 ? (primerCurso[keys.hInicio] || '') : '',
                horaFin: matching.length === 1 ? (primerCurso[keys.hFin] || '') : '',
                solicitaCertificado: 'no',
                comentarios: ''
              });
              setPaso('formulario');
              setLoading(false);
              console.groupEnd();
              return;
            }
          }
        }
      }
    }

    // Strategy 4: búsqueda parcial por local-part del email
    const localPart = expectedNorm.split('@')[0];
    if (localPart) {
      for (let i = 0; i < baseEstudiantes.length; i++) {
        const row = baseEstudiantes[i];
        const emails = obtenerEmailsDeFila(row);
        for (const e of emails) {
          if (!e.norm) continue;
          if (e.norm.includes(localPart) || (e.norm.split('@')[0] || '').includes(localPart)) {
            console.log('[verificarCorreoUSS] Estrategia 4: Coincidencia parcial en fila', i, 'key:', e.key);
            console.log('[verificarCorreoUSS] Email candidato (raw):', e.raw, 'normalized:', e.norm);
            mostrarComparacionChar(expectedNorm, e.norm);
            const matching = baseEstudiantes.filter(r => normalizarEmail(r[e.key]) === e.norm);
            setEstudiantesEncontrados(matching);
            const primerCurso = matching[0];
            const findKey = (prefix) => Object.keys(primerCurso).find(k => k.toLowerCase().includes(prefix.toLowerCase()));
            const keys = {
              nombre: findKey('Nombre') || 'Nombre completo',
              curso: findKey('Curso') || 'Curso',
              pead: findKey('Secc') || 'Sección (PEAD)',
              docente: findKey('Docen') || 'Docente',
              turno: findKey('Turno') || 'Turno',
              dias: findKey('Día') || 'Días',
              hInicio: findKey('Inicio') || 'Hora inicio',
              hFin: findKey('Fin') || 'Hora fin'
            };
            setFormData({
              nombreCompleto: primerCurso[keys.nombre] || '',
              curso: matching.length === 1 ? (primerCurso[keys.curso] || '') : '',
              pead: matching.length === 1 ? (primerCurso[keys.pead] || '') : '',
              docente: matching.length === 1 ? (primerCurso[keys.docente] || '') : '',
              turno: matching.length === 1 ? (primerCurso[keys.turno] || '') : '',
              dias: matching.length === 1 ? (primerCurso[keys.dias] || '') : '',
              horaInicio: matching.length === 1 ? (primerCurso[keys.hInicio] || '') : '',
              horaFin: matching.length === 1 ? (primerCurso[keys.hFin] || '') : '',
              solicitaCertificado: 'no',
              comentarios: ''
            });
            setPaso('formulario');
            setLoading(false);
            console.groupEnd();
            return;
          }
        }
      }
    }

    // No encontrado: mostrar mejor candidata para diagnóstico
    let best = null;
    for (let i = 0; i < baseEstudiantes.length; i++) {
      const row = baseEstudiantes[i];
      const emails = obtenerEmailsDeFila(row);
      for (const e of emails) {
        if (!e.norm) continue;
        const dist = simpleCharDiffScore(expectedNorm, e.norm);
        if (!best || dist < best.dist) best = { dist, idx: i, key: e.key, raw: e.raw, norm: e.norm };
      }
    }
    console.warn('[verificarCorreoUSS] No se encontró coincidencia. Mejor candidata:', best);
    if (best) mostrarComparacionChar(expectedNorm, best.norm);
    setError('❌ Correo no encontrado. Verifica tu usuario o contacta al administrador.');
    setLoading(false);
    console.groupEnd();
    return;
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (type === 'radio') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'correoExterno') {
      setCorreoExterno(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const enviarEncuesta = async () => {
    // Validar nombre completo (obligatorio para todos)
    if (!formData.nombreCompleto.trim()) {
      setError('El nombre completo es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const esEstudianteUSS = tipoUsuario === 'uss' && estudiantesEncontrados.length > 0;
      const tipoUsuarioTexto = esEstudianteUSS ? 'Estudiante USS' : 'Externo';
      let correoParaEnviar = '';

      if (esEstudianteUSS) {
        correoParaEnviar = `${nombreUsuario}@uss.edu.pe`.toLowerCase();
      } else if (tipoUsuario === 'externo') {
        correoParaEnviar = correoExterno.trim();
      }

      // Enviar siempre un solo registro para optimizar velocidad.
      // Code.gs en el backend se encarga de guardar al estudiante y buscar su primer curso.
      const registros = [{
        nombreCompleto: formData.nombreCompleto.trim(),
        curso: formData.curso || '',
        pead: formData.pead || '',
        comentarios: formData.comentarios || '',
        solicitaCertificado: formData.solicitaCertificado,
        tipoUsuario: tipoUsuarioTexto,
        email: correoParaEnviar
      }];

      console.log(`📤 Preparando ${registros.length} registro(s):`, registros);

      if (registros.length === 0) {
        throw new Error('No hay cursos válidos para registrar');
      }

      setProgreso({ actual: 1, total: registros.length });

      // Enviar uno por uno
      for (let i = 0; i < registros.length; i++) {
        const registro = registros[i];
        console.log(`📝 Enviando registro ${i + 1}/${registros.length}...`);

        setProgreso({ actual: i + 1, total: registros.length });

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(registro)
        });

        const result = await response.json();

        // Validar éxito de la respuesta tanto si viene de Vercel como directo de Google Apps Script
        const isExito = result.data ? result.data.success : result.success;
        
        if (!isExito) {
          throw new Error(result.data?.error || result.error || 'Error al registrar');
        }

        if (registros.length > 1 && i < registros.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`✅ Proceso de envío completado.`);
      setExitoModal(true);
      setTimeout(() => {
        resetearTodo();
        setExitoModal(false);
        setPaso('seleccion');
      }, 3000);

    } catch (error) {
      console.error('❌ Error general:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para resetear todo
  const resetearTodo = () => {
    setTipoUsuario('');
    setNombreUsuario('');
    setCorreoExterno('');
    setEstudiantesEncontrados([]);
    setFormData({
      nombreCompleto: '',
      curso: '',
      pead: '',
      docente: '',
      turno: '',
      dias: '',
      horaInicio: '',
      horaFin: '',
      solicitaCertificado: 'no',
      comentarios: ''
    });
  };

  // Modal de progreso
  if (loading && progreso.total > 0) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '60px 50px',
          borderRadius: '20px',
          textAlign: 'center',
          maxWidth: '520px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '30px',
            animation: 'spin 2s linear infinite'
          }}>
            📤
          </div>
          <h1 style={{
            color: '#5a2290',
            fontSize: '32px',
            margin: '0 0 30px',
            fontWeight: '700'
          }}>
            Registrando Asistencia
          </h1>
          <div style={{
            fontSize: '24px',
            color: '#63ed12',
            fontWeight: 'bold',
            marginBottom: '30px'
          }}>
            {progreso.actual}/{progreso.total}
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#63ed12',
              width: `${(progreso.actual / progreso.total) * 100}%`,
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          <p style={{
            fontSize: '16px',
            color: '#5f6368',
            margin: '0'
          }}>
            Por favor espera, procesando tu solicitud...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Modal de éxito
  if (exitoModal) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '60px 50px',
          borderRadius: '20px',
          textAlign: 'center',
          maxWidth: '520px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <SuccessIcon />
          <h1 style={{
            color: '#5a2290',
            fontSize: '36px',
            margin: '30px 0 16px',
            fontWeight: '700'
          }}>
            Registro Exitoso
          </h1>
          <p style={{
            fontSize: '20px',
            color: '#555',
            marginBottom: '30px'
          }}>
            ¡Te esperamos en el webinar!
          </p>
          <div style={{
            backgroundColor: '#e8f5e1',
            padding: '20px',
            borderRadius: '12px',
            color: '#1a5e20',
            fontWeight: '600'
          }}>
            Tu asistencia ha sido registrada exitosamente
          </div>
          <p style={{
            marginTop: '30px',
            color: '#888',
            fontSize: '15px'
          }}>
            Redirigiendo en 3 segundos...
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de selección de tipo de usuario
  if (paso === 'seleccion') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Roboto, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '6px solid #63ed12',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: '30px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <img
              src={logoUss}
              alt="Universidad Señor de Sipán"
              style={{
                width: '200px',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
        </header>

        <main style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '680px'
          }}>
            <div className="card-header" style={{
              backgroundColor: '#5a2290',
              color: 'white',
              textAlign: 'center',
              border: 'none'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '400'
              }}>
                REGISTRO WEBINAR
              </h2>
              <div style={{
                marginTop: '12px',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                2026 MAYO
              </div>
            </div>

            <div className="card-body" style={{ padding: '40px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{
                  fontSize: '22px',
                  color: '#202124',
                  marginBottom: '16px'
                }}>
                  Antes de comenzar...
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: '#5f6368',
                  marginBottom: '32px',
                  lineHeight: '1.6'
                }}>
                  Selecciona tu tipo de usuario para continuar con el registro
                </p>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                maxWidth: '500px',
                margin: '0 auto'
              }}>
                <button
                  onClick={() => handleSeleccionTipo('uss')}
                  className="btn btn-outline-primary"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '30px 20px',
                    border: '2px solid #5a2290',
                    borderRadius: '12px',
                    textAlign: 'center',
                    width: '100%',
                    background: 'transparent',
                    color: '#5a2290',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px'
                  }}>
                    🎓
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    Estudiante USS
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#5f6368',
                    lineHeight: '1.5'
                  }}>
                    Ingresa con tu usuario institucional
                  </div>
                </button>

                <button
                  onClick={() => handleSeleccionTipo('externo')}
                  className="btn btn-outline-success"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '30px 20px',
                    border: '2px solid #63ed12',
                    borderRadius: '12px',
                    textAlign: 'center',
                    width: '100%',
                    background: 'transparent',
                    color: '#63ed12',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px'
                  }}>
                    👨‍💼
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    Usuario Externo
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#5f6368',
                    lineHeight: '1.5'
                  }}>
                    Si no eres estudiante USS
                  </div>
                </button>
              </div>

              <div className="mt-4 p-3 bg-light rounded text-center" style={{
                fontSize: '14px',
                color: '#5f6368'
              }}>
                El formulario se creó en el Centro de Informática de la Universidad Señor de Sipán
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Pantalla de login (solo para estudiantes USS)
  if (paso === 'login') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Roboto, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '6px solid #63ed12',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: '30px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <img
              src={logoUss}
              alt="Universidad Señor de Sipán"
              style={{
                width: '200px',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
        </header>

        <main style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: '40px 20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '680px'
          }}>
            <div className="card-header" style={{
              backgroundColor: '#5a2290',
              color: 'white',
              textAlign: 'center',
              border: 'none'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '400'
              }}>
                INGRESO ESTUDIANTE USS
              </h2>
              <div style={{
                marginTop: '12px',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                Ingresa tu usuario institucional
              </div>
            </div>

            <div className="card-body" style={{ padding: '32px' }}>
              <button
                onClick={() => {
                  setPaso('seleccion');
                  setTipoUsuario('');
                }}
                className="btn btn-outline-secondary mb-4"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#5a2290',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Cambiar tipo de usuario
              </button>

              <div className="mb-4">
                <label className="form-label fw-bold">
                  Usuario institucional <span className="text-danger">*</span>
                </label>
                <div className="input-group" style={{ display: 'flex' }}>
                  <input
                    type="text"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value.toLowerCase().trim())}
                    onKeyDown={(e) => e.key === 'Enter' && verificarCorreoUSS()}
                    placeholder="tuusuario"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: '1px solid #dadce0',
                      borderRight: 'none',
                      outline: 'none',
                      fontSize: '16px'
                    }}
                  />
                  <span style={{
                    padding: '14px',
                    backgroundColor: 'white',
                    border: '1px solid #dadce0',
                    borderLeft: 'none',
                    color: '#5f6368',
                    fontWeight: '500'
                  }}>
                    @uss.edu.pe
                  </span>
                </div>
                <div className="form-text" style={{
                  fontSize: '12px',
                  color: '#5f6368',
                  marginTop: '8px'
                }}>
                  Ingresa solo tu nombre de usuario sin el @uss.edu.pe<br />
                  Ejemplo: Si tu correo es <strong>estudiante@uss.edu.pe</strong>, ingresa: <strong>estudiante</strong>
                </div>
              </div>

              <div className="d-flex justify-content-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => {
                    setPaso('seleccion');
                    setTipoUsuario('');
                    setNombreUsuario('');
                  }}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #dadce0',
                    background: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  onClick={verificarCorreoUSS}
                  disabled={loading || !nombreUsuario.trim()}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: loading || !nombreUsuario.trim() ? '#f1f3f4' : '#5a2290',
                    color: loading || !nombreUsuario.trim() ? '#9aa0a6' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading || !nombreUsuario.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Verificando...' : 'Continuar'}
                </button>
              </div>

              {error && (
                <div className="alert alert-danger mt-4 d-flex align-items-center" style={{
                  marginTop: '24px',
                  padding: '12px',
                  backgroundColor: '#fce8e6',
                  color: '#c5221f',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span className="me-2">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Pantalla del formulario (MANTENGO TU DISEÑO ORIGINAL)
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Roboto, Arial, sans-serif'
    }}>
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '6px solid #63ed12',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '30px 20px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <img src={logoUss} alt="Universidad Señor de Sipán" style={{ height: '80px' }} />
        </div>
      </header>

      <main style={{ padding: '40px 20px' }}>
        <div className="card mx-auto" style={{
          maxWidth: '680px'
        }}>
          <div className="card-header" style={{
            backgroundColor: '#5a2290',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            border: 'none'
          }}>
            <h1 className="mb-2" style={{ fontSize: '28px', fontWeight: '400' }}>
              REGISTRO WEBINAR
            </h1>
            <div style={{ fontSize: '16px' }}>
              2026 MAYO
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px' }}>
              {estudiantesEncontrados.length > 0 ? 'Datos autocompletados de BaseUnificada' : 'Usuario Externo - Completa tus datos'}
            </div>
          </div>

          <div className="card-body" style={{ padding: '32px' }}>
            {error && (
              <div className="alert alert-danger d-flex align-items-center mb-4" style={{
                marginBottom: '24px',
                padding: '12px',
                backgroundColor: '#fce8e6',
                color: '#c5221f',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span className="me-2">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="card mb-4 border-0" style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <div className="card-body">
                <h5 className="card-title d-flex align-items-center mb-3" style={{
                  color: '#5a2290',
                  fontWeight: '600'
                }}>
                  Información del {estudiantesEncontrados.length > 0 ? 'estudiante USS' : 'usuario'}
                </h5>

                <div className="row g-3">
                  {/* NOMBRE COMPLETO */}
                  <div className="col-12">
                    <div className="d-flex align-items-center p-3 rounded" style={{
                      backgroundColor: '#e8f5e1'
                    }}>
                      <UserIcon />
                      <div className="ms-3 flex-grow-1">
                        <label className="form-label fw-bold" style={{ color: '#63ed12' }}>
                          Nombre completo *
                        </label>
                        <input
                          type="text"
                          name="nombreCompleto"
                          value={formData.nombreCompleto}
                          onChange={handleChange}
                          className="form-control"
                          readOnly={estudiantesEncontrados.length > 0}
                          required
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #dadce0',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CORREO ELECTRÓNICO - Solo para usuarios externos */}
                  {tipoUsuario === 'externo' && (
                    <div className="col-12">
                      <div className="d-flex align-items-center p-3 rounded" style={{
                        backgroundColor: '#f0f7ff'
                      }}>
                        <EmailIcon />
                        <div className="ms-3 flex-grow-1">
                          <label className="form-label fw-bold" style={{ color: '#5a2290' }}>
                            Correo electrónico *
                          </label>
                          <input
                            type="email"
                            name="correoExterno"
                            value={correoExterno}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="ejemplo@email.com"
                            required
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #dadce0',
                              borderRadius: '4px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INFO: Se registrará en todos sus cursos */}
                  {estudiantesEncontrados.length > 1 && (
                    <div className="col-12">
                      <div className="d-flex align-items-start p-3 rounded" style={{
                        backgroundColor: '#e8f5e1'
                      }}>
                        <BookIcon />
                        <div className="ms-3 flex-grow-1">
                          <div className="fw-bold" style={{ color: '#63ed12' }}>
                            Te registrarás en todos tus cursos ({estudiantesEncontrados.length})
                          </div>
                          <ul className="mb-0 mt-2 ps-3" style={{ fontSize: '14px', color: '#1a5e20' }}>
                            {estudiantesEncontrados.map((c, i) => {
                              const cursoK = Object.keys(c).find(k => k.toLowerCase().includes('curso')) || "Curso";
                              const peadK = Object.keys(c).find(k => k.toLowerCase().includes('secc')) || "Sección (PEAD)";
                              return <li key={i}>{c[cursoK]} – {c[peadK]}</li>;
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INFO DE CURSO AUTOMÁTICA */}
                  {estudiantesEncontrados.length === 1 && formData.curso && (
                    <>
                      <div className="col-md-6">
                        <div className="p-3 rounded" style={{ backgroundColor: '#e8f5e1' }}>
                          <div className="fw-bold" style={{ color: '#63ed12' }}>Curso:</div>
                          <div>{formData.curso}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="p-3 rounded" style={{ backgroundColor: '#f0f7ff' }}>
                          <div className="fw-bold" style={{ color: '#5a2290' }}>Sección:</div>
                          <div>{formData.pead}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="p-3 rounded" style={{ backgroundColor: '#e8f5e1' }}>
                          <div className="fw-bold" style={{ color: '#63ed12' }}>Docente:</div>
                          <div>{formData.docente}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="p-3 rounded" style={{ backgroundColor: '#f0f7ff' }}>
                          <div className="fw-bold" style={{ color: '#5a2290' }}>Turno:</div>
                          <div>{formData.turno}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="p-3 rounded" style={{ backgroundColor: '#e8f5e1' }}>
                          <div className="fw-bold" style={{ color: '#63ed12' }}>Días:</div>
                          <div>{formData.dias}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="p-3 rounded" style={{ backgroundColor: '#f0f7ff' }}>
                          <div className="fw-bold" style={{ color: '#5a2290' }}>Horario:</div>
                          <div>{formData.horaInicio} - {formData.horaFin}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CERTIFICADO */}
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <span style={{ color: '#5a2290' }}>🏆 SOLICITAR CERTIFICADO WEBINAR - S/ 10.00</span>
                </h6>
                <p className="text-muted mb-3">
                  ¿Deseas solicitar certificado digital del webinar?
                </p>

                <div className="d-flex flex-column gap-2">
                  {['si', 'no'].map(opt => (
                    <label key={opt} className="d-flex align-items-center p-3 rounded" style={{
                      cursor: 'pointer',
                      backgroundColor: formData.solicitaCertificado === opt ? '#63ed12' : 'transparent',
                      color: formData.solicitaCertificado === opt ? 'white' : '#202124',
                      border: '1px solid #dee2e6',
                      transition: 'all 0.25s ease'
                    }}>
                      <input
                        type="radio"
                        name="solicitaCertificado"
                        value={opt}
                        checked={formData.solicitaCertificado === opt}
                        onChange={handleChange}
                        disabled={loading}
                        className="me-3"
                        style={{
                          transform: 'scale(1.5)',
                          accentColor: '#63ed12',
                          cursor: 'pointer'
                        }}
                      />
                      <span className={formData.solicitaCertificado === opt ? 'fw-bold' : ''}>
                        {opt === 'si' ? 'Sí, solicito certificado (S/ 10.00)' : 'No, solo registro de asistencia'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* COMENTARIOS */}
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <span style={{ color: '#5a2290' }}>💬 Déjanos tu opinión (opcional)</span>
                </h6>
                <textarea
                  name="comentarios"
                  value={formData.comentarios}
                  onChange={handleChange}
                  rows={4}
                  placeholder="¿Qué te pareció el webinar? ¿Alguna sugerencia para próximos eventos?"
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* BOTONES */}
            <div className="d-flex justify-content-between flex-wrap gap-3 mt-5">
              <button
                onClick={() => {
                  if (tipoUsuario === 'uss') {
                    setPaso('login');
                  } else {
                    setPaso('seleccion');
                    setTipoUsuario('');
                  }
                }}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #dadce0',
                  background: 'white',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Volver
              </button>

              <button
                onClick={enviarEncuesta}
                disabled={loading || !formData.nombreCompleto ||
                  (tipoUsuario === 'externo' && !correoExterno)}
                style={{
                  padding: '12px 32px',
                  backgroundColor: (loading || !formData.nombreCompleto) ? '#f1f3f4' : '#5a2290',
                  color: (loading || !formData.nombreCompleto) ? '#9aa0a6' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (loading || !formData.nombreCompleto) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Registrando...' : 'Registrar Asistencia'}
              </button>
            </div>

            {!formData.nombreCompleto && (
              <div className="alert alert-warning text-center mt-4" style={{
                marginTop: '24px',
                padding: '12px',
                backgroundColor: '#fff8e1',
                color: '#ff6d00',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                Completa el nombre completo para poder registrar tu asistencia
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EncuestaWebinar;
