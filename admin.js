// admin.js (Resumen de Pacientes)

let paginaResumenActual = 1;
const pacientesPorPaginaResumen = 15;
let listaPacientesResumen = [];

// Navegación entre pestañas del Admin
function mostrarSeccion(nombreSeccion) {
  const secciones = document.querySelectorAll('.seccion');
  secciones.forEach(sec => sec.style.display = 'none');

  const seccionActiva = document.getElementById(nombreSeccion);
  if (seccionActiva) {
    seccionActiva.style.display = 'block';
  }

  if (nombreSeccion === 'resumen') {
    cargarModuloResumen();
  }
}

// Cargar pacientes desde Firebase/Variables Globales
async function cargarModuloResumen() {
  const tablaResumen = document.getElementById('tabla-resumen');
  if (!tablaResumen) return;

  // Si ya tenemos datos precargados, aplicamos filtros de inmediato
  if (window.pacientes && window.pacientes.length > 0) {
    listaPacientesResumen = window.pacientes;
    renderizarTablaResumen();
    return;
  }

  tablaResumen.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center; padding:20px; color:#666;">
        Cargando resumen de pacientes...
      </td>
    </tr>`;

  try {
    // 1. Si db está disponible (Firebase v8 o v9 en global)
    if (typeof db !== 'undefined' && db.collection) {
      const snapshot = await db.collection('pacientes').get();
      const docs = [];
      snapshot.forEach(doc => docs.push({ key: doc.id, ...doc.data() }));
      listaPacientesResumen = docs;
    } 
    // 2. Si viene de LocalStorage
    else if (localStorage.getItem('pacientes')) {
      listaPacientesResumen = JSON.parse(localStorage.getItem('pacientes')) || [];
    }
    
    window.pacientes = listaPacientesResumen;
    renderizarTablaResumen();
  } catch (error) {
    console.error("Error al cargar resumen:", error);
    renderizarTablaResumen();
  }
}

// Renderizar filas con Filtros y Paginación
function renderizarTablaResumen() {
  const tablaResumen = document.getElementById('tabla-resumen');
  const filtroSede = document.getElementById('filtroSedeResumen');
  const filtroFecha = document.getElementById('filtroFechaResumen');

  if (!tablaResumen) return;

  const sedeVal = (filtroSede && filtroSede.value || '').trim().toLowerCase();
  const fechaVal = (filtroFecha && filtroFecha.value) || '';

  // Filtrado
  let filtrados = (listaPacientesResumen || []).filter(p => {
    const coincideSede = !sedeVal || (p.sede || '').toLowerCase().includes(sedeVal);

    // Normalizar la fecha del paciente (YYYY-MM-DD)
    let fechaPacStr = '';
    const fechaRaw = p.fechaModificacion || p.fecha || p.fechaIngreso || '';
    if (fechaRaw) {
      fechaPacStr = String(fechaRaw).substring(0, 10); // Toma "2026-09-25"
    }

    const coincideFecha = !fechaVal || fechaPacStr === fechaVal;

    return coincideSede && coincideFecha;
  });

  // Ordenamiento por Estado y luego por Fecha descendente
  const ordenEstado = {
    'En espera': 1,
    'En atención': 2,
    'Programado': 3,
    'Atendido': 4,
    'Entregado': 5
  };

  filtrados.sort((a, b) => {
    const estA = ordenEstado[a.estado] || 99;
    const estB = ordenEstado[b.estado] || 99;
    if (estA !== estB) return estA - estB;

    const fechaA = String(a.fechaModificacion || a.fecha || '');
    const fechaB = String(b.fechaModificacion || b.fecha || '');
    return fechaB.localeCompare(fechaA);
  });

  // Paginación
  const totalPaginas = Math.ceil(filtrados.length / pacientesPorPaginaResumen) || 1;
  if (paginaResumenActual > totalPaginas) paginaResumenActual = 1;

  const inicio = (paginaResumenActual - 1) * pacientesPorPaginaResumen;
  const pagina = filtrados.slice(inicio, inicio + pacientesPorPaginaResumen);

  tablaResumen.innerHTML = '';

  if (pagina.length === 0) {
    tablaResumen.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:20px; color:#888;">
          No se encontraron registros de pacientes.
        </td>
      </tr>`;
    renderizarPaginacionResumen(0);
    return;
  }

  // Generar filas
  pagina.forEach(p => {
    const tr = document.createElement('tr');

    // Colores por estado
    let bg = '#ffffff';
    if (p.estado === 'En espera') bg = '#ffe5e5';
    else if (p.estado === 'En atención') bg = '#fff5cc';
    else if (p.estado === 'Programado') bg = '#e1bee7';
    else if (p.estado === 'Atendido') bg = '#d5f5d5';
    else if (p.estado === 'Entregado') bg = '#f0f0f0';

    tr.style.backgroundColor = bg;

    // Formatear fecha para la vista (DD/MM/YYYY HH:mm)
    let fechaTexto = p.fechaModificacion || p.fecha || '-';
    if (fechaTexto.includes('T')) {
      const [f, h] = fechaTexto.split('T');
      const [yyyy, mm, dd] = f.split('-');
      fechaTexto = `${dd}/${mm}/${yyyy} ${h.substring(0, 5)}`;
    }

    tr.innerHTML = `
      <td style="padding:8px; border:1px solid #ddd;"><strong>${p.sede || '-'}</strong></td>
      <td style="padding:8px; border:1px solid #ddd;">${p.apellidos || p.apellido || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd;">${p.nombres || p.nombre || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd;">${p.estudios || p.estudio || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;">${p.cant || 1}</td>
      <td style="padding:8px; border:1px solid #ddd;"><strong>${p.estado || '-'}</strong></td>
      <td style="padding:8px; border:1px solid #ddd; font-size:12px;">${fechaTexto}</td>
    `;
    tablaResumen.appendChild(tr);
  });

  renderizarPaginacionResumen(totalPaginas);
}

// Botones de Paginación
function renderizarPaginacionResumen(totalPaginas) {
  const pagContainer = document.getElementById('paginacionResumen');
  if (!pagContainer) return;
  pagContainer.innerHTML = '';
  if (totalPaginas <= 1) return;

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.style.cssText = `
      padding: 6px 12px;
      border: 1px solid #ccc;
      background: ${i === paginaResumenActual ? '#3d0a11' : '#fff'};
      color: ${i === paginaResumenActual ? '#fff' : '#333'};
      border-radius: 4px;
      cursor: pointer;
      font-weight: ${i === paginaResumenActual ? 'bold' : 'normal'};
    `;
    btn.onclick = () => {
      paginaResumenActual = i;
      renderizarTablaResumen();
    };
    pagContainer.appendChild(btn);
  }
}

// Listeners de los filtros
document.addEventListener('DOMContentLoaded', () => {
  const filtroSede = document.getElementById('filtroSedeResumen');
  const filtroFecha = document.getElementById('filtroFechaResumen');

  // Inicializar filtro de fecha libre
  if (filtroFecha) filtroFecha.value = '';

  if (filtroSede) {
    filtroSede.addEventListener('input', () => {
      paginaResumenActual = 1;
      renderizarTablaResumen();
    });
  }

  if (filtroFecha) {
    filtroFecha.addEventListener('change', () => {
      paginaResumenActual = 1;
      renderizarTablaResumen();
    });
  }
});

// Asignar funciones globales
window.mostrarSeccion = mostrarSeccion;
window.cargarModuloResumen = cargarModuloResumen;
