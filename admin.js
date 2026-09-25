// Variable global para controlar la paginación del resumen
let paginaResumenActual = 1;
const pacientesPorPaginaResumen = 15;

// Navegación entre pestañas
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

// Función principal para obtener datos y llenar el Resumen
async function cargarModuloResumen() {
  const tablaResumen = document.getElementById('tabla-resumen');
  const filtroSede = document.getElementById('filtroSedeResumen');
  const filtroFecha = document.getElementById('filtroFechaResumen');

  if (!tablaResumen) return;

  // Mensaje visual de carga
  tablaResumen.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center; padding:20px; color:#666;">
        Cargando pacientes...
      </td>
    </tr>`;

  let lista = [];

  // 1. Intentar obtener de variables globales existentes
  if (Array.isArray(window.pacientes) && window.pacientes.length > 0) {
    lista = window.pacientes;
  } else if (Array.isArray(window.datosPacientes) && window.datosPacientes.length > 0) {
    lista = window.datosPacientes;
  } 
  // 2. Intentar llamar a funciones de carga de Firebase/Firestore si existen en el proyecto
  else if (typeof window.obtenerPacientes === 'function') {
    try { lista = await window.obtenerPacientes(); } catch(e) {}
  } else if (typeof window.cargarPacientes === 'function') {
    try { lista = await window.cargarPacientes(); } catch(e) {}
  } 
  // 3. Consultar directamente a Firestore si el SDK está cargado
  else if (typeof db !== 'undefined' && db.collection) {
    try {
      const snapshot = await db.collection('pacientes').get();
      lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error al consultar Firestore directamente:", e);
    }
  }
  // 4. Fallback a LocalStorage si existiera copia local
  else if (localStorage.getItem('pacientes')) {
    try {
      lista = JSON.parse(localStorage.getItem('pacientes')) || [];
    } catch (e) {
      lista = [];
    }
  }

  // Guardar copia global para no re-consultar innecesariamente
  window.pacientes = lista;

  // Filtros de búsqueda
  const sedeVal = (filtroSede && filtroSede.value || '').trim().toLowerCase();
  const fechaVal = (filtroFecha && filtroFecha.value) || '';

  let filtrados = lista.filter(p => {
    const coincideSede = !sedeVal || (p.sede || '').toLowerCase().includes(sedeVal);
    const fechaPac = p.fechaModificacion || p.fecha || p.fechaIngreso || p.creadoEn || '';
    const coincideFecha = !fechaVal || fechaPac.startsWith(fechaVal);
    return coincideSede && coincideFecha;
  });

  // Ordenar por Estado
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
    const fechaA = a.fechaModificacion || a.fecha || '';
    const fechaB = b.fechaModificacion || b.fecha || '';
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

  // Dibujar filas de la tabla
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

    // Formatear fecha
    let fechaTexto = p.fechaModificacion || p.fecha || p.fechaIngreso || '-';
    if (typeof fechaTexto === 'object' && fechaTexto.toDate) {
      fechaTexto = fechaTexto.toDate().toISOString().replace('T', ' ').substring(0, 16);
    } else {
      fechaTexto = String(fechaTexto).replace('T', ' ').substring(0, 16);
    }

    tr.innerHTML = `
      <td style="padding:8px; border:1px solid #ddd;"><strong>${p.sede || '-'}</strong></td>
      <td style="padding:8px; border:1px solid #ddd;">${p.apellidos || p.apellido || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd;">${p.nombres || p.nombre || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd;">${p.estudios || p.estudio || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;">${p.cant || p.cantidad || 1}</td>
      <td style="padding:8px; border:1px solid #ddd;"><strong>${p.estado || '-'}</strong></td>
      <td style="padding:8px; border:1px solid #ddd; font-size:12px;">${fechaTexto}</td>
    `;
    tablaResumen.appendChild(tr);
  });

  renderizarPaginacionResumen(totalPaginas);
}

// Renderizar botones de paginación
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
      cargarModuloResumen();
    };
    pagContainer.appendChild(btn);
  }
}

// Escuchadores de eventos para los filtros
document.addEventListener('DOMContentLoaded', () => {
  const filtroSede = document.getElementById('filtroSedeResumen');
  const filtroFecha = document.getElementById('filtroFechaResumen');

  if (filtroSede) {
    filtroSede.addEventListener('input', () => {
      paginaResumenActual = 1;
      cargarModuloResumen();
    });
  }

  if (filtroFecha) {
    filtroFecha.addEventListener('change', () => {
      paginaResumenActual = 1;
      cargarModuloResumen();
    });
  }
});
