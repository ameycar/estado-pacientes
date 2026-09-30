// script.js (module - Firebase v9)
import { db } from "./firebase-config.js";
import {
  ref, onValue, push, update, remove, set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ---------- constantes y DOM ----------
const ADMIN_PASS = '1234'; // Contraseña de administrador
const formulario = document.getElementById('formulario');
const tablaPacientes = document.getElementById('tabla-pacientes');
const contador = document.getElementById('contador');
const estudiosSelect = document.getElementById('estudios');
const cantidadEcoPbDiv = document.getElementById('cantidad-eco-pb');
const ecoPbCantidad = document.getElementById('ecoPbCantidad');
const filtroSede = document.getElementById('filtroSede');
const filtroNombre = document.getElementById('filtroNombre');
const filtroEstudio = document.getElementById('filtroEstudio');
const filtroFecha = document.getElementById('filtroFecha');

// Filtro Rápido por Estado
let estadoFiltroRapido = '';

// Buscador PLN para Estadísticas
const inputBuscarEstadisticaNL = document.getElementById('nl-query-input');
const btnBuscarEstadisticaNL = document.getElementById('btn-nl-search');

// Instancia de Gráfico Dinámico Chart.js
let nlDynamicChartInstance = null;

// ---------- Función Helper: Fecha/Hora Perú (UTC-5) ----------
function getFechaHoraPeru() {
  const ahora = new Date();
  const opciones = {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };

  const formateador = new Intl.DateTimeFormat("sv-SE", opciones);
  return formateador.format(ahora).replace(" ", "T"); // Formato: YYYY-MM-DDTHH:mm
}

// Variables para Paginación de Tabla Principal
let paginaActual = 1;
const pacientesPorPagina = 50;

let datosPacientes = [];
let firmaActualPaciente = null;
let pendingSelectForEntrega = null;

// Escáner QR variable global
let html5QrcodeScanner = null;

// Prioridad de estados para el ordenamiento
const ordenEstados = {
  'En espera': 1,
  'En atención': 2,
  'Atendido': 3,
  'Programado': 4,
  'Entregado': 5
};

// Usuario logueado (object) guardado en localStorage como 'user'
const currentUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch (e) { return null; }
})();

// Utilidad para normalizar clave de sede
function keyify(s) {
  if (!s) return 'sin_sede';
  return String(s).replace(/[^\w]/g, '_').toLowerCase();
}

// ---------- Navegación en la misma página (SPA) ----------
function mostrarSeccion(idSeccion) {
  document.querySelectorAll('.seccion-modulo').forEach(sec => {
    sec.style.display = 'none';
  });
  const activa = document.getElementById(idSeccion);
  if (activa) activa.style.display = 'block';

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  }
}

// ---------- Control Sub-Pestañas en Reportes ----------
function mostrarSubPestana(idSubSeccion) {
  document.querySelectorAll('.sub-seccion').forEach(sub => {
    sub.style.display = 'none';
  });

  const subActiva = document.getElementById(idSubSeccion);
  if (subActiva) subActiva.style.display = 'block';

  document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  }

  // Carga inicial o actualización del Asistente en "Estadísticas"
  if (idSubSeccion === 'sub-estadisticas') {
    if (inputBuscarEstadisticaNL && inputBuscarEstadisticaNL.value.trim() !== '') {
      ejecutarConsultaNL(inputBuscarEstadisticaNL.value);
    } else {
      ejecutarConsultaNL('Resumen general');
    }
  }
}

// ---------- Escuchadores del Asistente Inteligente (PLN) ----------
if (btnBuscarEstadisticaNL && inputBuscarEstadisticaNL) {
  btnBuscarEstadisticaNL.addEventListener('click', () => {
    ejecutarConsultaNL(inputBuscarEstadisticaNL.value);
  });

  inputBuscarEstadisticaNL.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      ejecutarConsultaNL(inputBuscarEstadisticaNL.value);
    }
  });
}

document.querySelectorAll('.quick-query-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const text = e.target.innerText.replace(/^¿|^\?/g, '');
    if (inputBuscarEstadisticaNL) inputBuscarEstadisticaNL.value = text;
    ejecutarConsultaNL(text);
  });
});

// ---------- Motor de Procesamiento de Lenguaje Natural (PLN) ----------
function ejecutarConsultaNL(queryText) {
  if (!queryText || queryText.trim() === '') {
    queryText = 'Resumen general';
  }

  const q = queryText.toLowerCase().trim();
  const hoyStr = getFechaHoraPeru().split('T')[0];

  // 1. Extracción de Filtros mediante análisis léxico
  let filtroFecha = null;
  if (q.includes('hoy')) {
    filtroFecha = 'hoy';
  } else if (q.includes('ayer')) {
    filtroFecha = 'ayer';
  } else if (q.includes('este mes') || q.includes('del mes') || q.includes('mes')) {
    filtroFecha = 'mes';
  }

  let filtroEstado = null;
  if (q.includes('atendieron') || q.includes('atendido') || q.includes('atendidos')) {
    filtroEstado = ['Atendido', 'Entregado'];
  } else if (q.includes('entregado') || q.includes('entregados') || q.includes('entrega')) {
    filtroEstado = ['Entregado'];
  } else if (q.includes('espera') || q.includes('esperando')) {
    filtroEstado = ['En espera'];
  } else if (q.includes('programado') || q.includes('programados')) {
    filtroEstado = ['Programado'];
  }

  let filtroSede = null;
  if (q.includes('grau')) filtroSede = 'grau';
  else if (q.includes('san isidro')) filtroSede = 'san isidro';
  else if (q.includes('miraflores')) filtroSede = 'miraflores';
  else if (q.includes('central')) filtroSede = 'central';

  let filtroServicio = null;
  if (q.includes('ecografia') || q.includes('ecografía') || q.includes('eco')) filtroServicio = 'eco';
  else if (q.includes('tomografia') || q.includes('tomografía') || q.includes('tem')) filtroServicio = 'tem';
  else if (q.includes('resonancia') || q.includes('rm')) filtroServicio = 'rm';
  else if (q.includes('rayos x') || q.includes('rx') || q.includes('radiografia')) filtroServicio = 'rx';
  else if (q.includes('mamografia') || q.includes('mamografía')) filtroServicio = 'mamografia';
  else if (q.includes('consulta')) filtroServicio = 'consulta';

  // 2. Filtrado de registros desde datosPacientes
  let resultados = datosPacientes.filter(p => {
    let cumple = true;

    // Filtro por Fecha
    if (p.fechaModificacion || p.fecha) {
      const pFecha = (p.fechaModificacion || p.fecha).split('T')[0];
      if (filtroFecha === 'hoy' && pFecha !== hoyStr) cumple = false;
      if (filtroFecha === 'ayer') {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const ayerStr = ayer.toISOString().split('T')[0];
        if (pFecha !== ayerStr) cumple = false;
      }
      if (filtroFecha === 'mes') {
        const mesActual = hoyStr.substring(0, 7);
        if (!pFecha.startsWith(mesActual)) cumple = false;
      }
    }

    // Filtro por Estado
    if (cumple && filtroEstado) {
      cumple = filtroEstado.includes(p.estado);
    }

    // Filtro por Sede
    if (cumple && filtroSede) {
      const sedeNorm = (p.sede || '').toLowerCase();
      cumple = sedeNorm.includes(filtroSede);
    }

    // Filtro por Estudio/Servicio
    if (cumple && filtroServicio) {
      const estNorm = (p.estudios || '').toLowerCase();
      cumple = estNorm.includes(filtroServicio);
    }

    return cumple;
  });

  // 3. Renderizar vista de resultados
  mostrarResultadosNL(q, resultados, { filtroSede, filtroServicio, filtroFecha, filtroEstado });
}

function mostrarResultadosNL(query, lista, filtros) {
  const container = document.getElementById('nl-results-container');
  const textResp = document.getElementById('nl-response-text');
  const statTotal = document.getElementById('stat-nl-total');
  const statRecaudacion = document.getElementById('stat-nl-recaudacion');
  const statFiltros = document.getElementById('stat-nl-filtros');
  const tableBody = document.querySelector('#nl-result-table tbody');
  const chartTitle = document.getElementById('nl-chart-title');

  if (!container) return;
  container.style.display = 'block';

  const totalRecaudado = lista.reduce((acc, curr) => acc + (parseFloat(curr.precio) || 0), 0);

  textResp.innerHTML = `Se encontraron <span style="color: var(--accent); font-size: 22px;">${lista.length}</span> paciente(s) en la búsqueda.`;
  if (statTotal) statTotal.textContent = lista.length;
  if (statRecaudacion) statRecaudacion.textContent = `S/ ${totalRecaudado.toFixed(2)}`;
  
  if (statFiltros) {
    const fFecha = filtros.filtroFecha ? `Fecha: ${filtros.filtroFecha}` : 'Cualquier fecha';
    const fSede = filtros.filtroSede ? `Sede: ${filtros.filtroSede}` : 'Todas las sedes';
    statFiltros.innerHTML = `<strong>${fFecha}</strong> | <strong>${fSede}</strong>`;
  }

  // Renderizar Tabla
  tableBody.innerHTML = '';
  if (lista.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--muted);">No hay registros que coincidan con la búsqueda.</td></tr>`;
  } else {
    lista.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="padding: 6px 8px;"><strong>${p.apellidos || ''} ${p.nombres || ''}</strong></td>
        <td style="padding: 6px 8px;">${p.sede || '-'}</td>
        <td style="padding: 6px 8px;">${p.estudios || '-'}</td>
        <td style="padding: 6px 8px;">${p.estado || '-'}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Determinar Agrupación para el Gráfico
  let agrupacion = {};
  let tipoGrafico = 'bar';
  let tituloGrafico = 'Distribución de Pacientes';

  if (!filtros.filtroSede && query.includes('sede')) {
    tituloGrafico = 'Pacientes agrupados por Sede';
    lista.forEach(p => {
      const key = p.sede || 'Sin Sede';
      agrupacion[key] = (agrupacion[key] || 0) + 1;
    });
  } else if (!filtros.filtroServicio && (query.includes('servicio') || query.includes('estudio') || query.includes('eco') || query.includes('tem'))) {
    tituloGrafico = 'Pacientes agrupados por Estudio/Servicio';
    lista.forEach(p => {
      const key = p.estudios || 'Sin Especificar';
      agrupacion[key] = (agrupacion[key] || 0) + 1;
    });
  } else {
    tituloGrafico = 'Pacientes agrupados por Estado';
    tipoGrafico = 'doughnut';
    lista.forEach(p => {
      const key = p.estado || 'Desconocido';
      agrupacion[key] = (agrupacion[key] || 0) + 1;
    });
  }

  if (chartTitle) chartTitle.innerText = tituloGrafico;

  renderizarGraficoNL(Object.keys(agrupacion), Object.values(agrupacion), tipoGrafico, tituloGrafico);
}

function renderizarGraficoNL(labels, data, type = 'bar', labelLegend = 'Pacientes') {
  const canvas = document.getElementById('nlDynamicChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');

  if (nlDynamicChartInstance) {
    nlDynamicChartInstance.destroy();
  }

  const backgroundColors = [
    '#0284c7',
    '#22c55e',
    '#f59e0b',
    '#3b82f6',
    '#64748b',
    '#a855f7',
    '#ef4444'
  ];

  nlDynamicChartInstance = new Chart(ctx, {
    type: type,
    data: {
      labels: labels.length > 0 ? labels : ['Sin Datos'],
      datasets: [{
        label: labelLegend,
        data: data.length > 0 ? data : [0],
        backgroundColor: backgroundColors.slice(0, labels.length || 1),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type === 'doughnut' || type === 'pie'
        }
      },
      scales: type === 'bar' ? {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      } : {}
    }
  });
}

// ---------- Escáner QR ----------
const btnEscaneoQR = document.getElementById('btn-escaneo-qr');
const readerDiv = document.getElementById('reader');

if (btnEscaneoQR) {
  btnEscaneoQR.addEventListener('click', () => {
    if (!readerDiv) return;
    
    if (readerDiv.style.display === 'block') {
      readerDiv.style.display = 'none';
      if (html5QrcodeScanner) html5QrcodeScanner.clear();
      return;
    }

    readerDiv.style.display = 'block';

    if (typeof Html5QrcodeScanner !== 'undefined') {
      html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      
      html5QrcodeScanner.render((qrCodeMessage) => {
        try {
          const datos = JSON.parse(qrCodeMessage);
          
          if (datos.apellidos) document.getElementById('apellidos').value = datos.apellidos;
          if (datos.nombres) document.getElementById('nombres').value = datos.nombres;
          if (datos.precio) document.getElementById('precio').value = datos.precio;
          if (datos.pf) document.getElementById('pf').value = datos.pf;
          
          if (datos.estudios && estudiosSelect) {
            Array.from(estudiosSelect.options).forEach(opt => {
              opt.selected = String(datos.estudios).includes(opt.value);
            });
            estudiosSelect.dispatchEvent(new Event('change'));
          }

          alert("¡Datos del paciente cargados desde el QR exitosamente!");
          html5QrcodeScanner.clear();
          readerDiv.style.display = 'none';

        } catch (e) {
          alert("El código QR escaneado no tiene un formato válido (JSON).");
        }
      }, (error) => {
        // Ignorar errores de escaneo
      });
    } else {
      alert('La librería de escaneo QR no está cargada.');
    }
  });
}

// ---------- Cargar sedes y popular select ----------
function loadSedesToSelect() {
  const select = document.getElementById('sede');
  if (!select) return;
  onValue(ref(db, 'sedes'), snapshot => {
    select.innerHTML = '';
    const arr = [];
    snapshot.forEach(child => {
      const s = child.val();
      s.key = child.key;
      if (s && s.active !== false) arr.push(s);
    });
    arr.sort((a, b) => (a.name || a.nombre || '').localeCompare(b.name || b.nombre || ''));
    arr.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name || s.nombre || s.key;
      opt.textContent = s.name || s.nombre || s.key;
      select.appendChild(opt);
    });

    if (currentUser && currentUser.role && currentUser.role !== 'admin') {
      select.value = currentUser.sede || select.value;
      select.disabled = true;
    } else {
      select.disabled = false;
    }
  });
}

// ---------- Mostrar cantidad Eco pb ----------
if (estudiosSelect) {
  estudiosSelect.addEventListener('change', () => {
    const seleccionados = Array.from(estudiosSelect.selectedOptions).map(o => o.value);
    if (cantidadEcoPbDiv) {
      cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
    }
  });
}

// ---------- Registrar paciente ----------
if (formulario) {
  formulario.addEventListener('submit', e => {
    e.preventDefault();

    const sedeEl = document.getElementById('sede');
    const sede = (currentUser && currentUser.role !== 'admin') ? (currentUser.sede || sedeEl.value) : (sedeEl.value || '').trim();

    const apellidos = document.getElementById('apellidos').value.trim();
    const nombres = document.getElementById('nombres').value.trim();
    let estudios = Array.from(estudiosSelect.selectedOptions).map(option => option.value);
    let cant = estudios.length;
    const precio = document.getElementById('precio').value.trim();
    const pf = document.getElementById('pf').value.trim();
    const estado = 'En espera';
    const fechaModificacion = getFechaHoraPeru();

    if (estudios.includes('Eco pb')) {
      const ecoCantidad = parseInt(ecoPbCantidad.value) || 1;
      cant = estudios.length - 1 + ecoCantidad;
    }

    const nuevoPaciente = {
      sede,
      apellidos,
      nombres,
      estudios: estudios.join(', '),
      cant,
      precio,
      pf,
      estado,
      placas: '',
      cd: 'NO',
      informe: 'NO',
      entregado: '',
      firma: '',
      fechaModificacion
    };

    push(ref(db, 'pacientes'), nuevoPaciente);
    formulario.reset();
    if (cantidadEcoPbDiv) cantidadEcoPbDiv.style.display = 'none';
  });
}

// ---------- Cargar pacientes (real-time) ----------
function cargarPacientes() {
  onValue(ref(db, 'pacientes'), snapshot => {
    const pacientes = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      
      if (currentUser && currentUser.role === 'sede') {
        if (paciente.sede === currentUser.sede) pacientes.push(paciente);
      } else {
        pacientes.push(paciente);
      }
    });
    datosPacientes = pacientes;
    actualizarKPIsProcesamiento();
    aplicarFiltros();
  });
}

// ---------- Métricas KPIs de Recepción en Tiempo Real ----------
function actualizarKPIsProcesamiento() {
  const hoyStr = getFechaHoraPeru().split('T')[0];
  
  const pacientesHoy = datosPacientes.filter(p => (p.fechaModificacion || p.fecha || '').startsWith(hoyStr));
  
  const enEspera = pacientesHoy.filter(p => p.estado === 'En espera').length;
  const enAtencion = pacientesHoy.filter(p => p.estado === 'En atención').length;
  const entregados = pacientesHoy.filter(p => p.estado === 'Entregado').length;
  
  const recaudacionTotal = pacientesHoy.reduce((acc, p) => acc + (parseFloat(p.precio) || 0), 0);

  const kpiEspera = document.getElementById('kpi-espera');
  const kpiAtencion = document.getElementById('kpi-atencion');
  const kpiEntregados = document.getElementById('kpi-entregados');
  const kpiRecaudacion = document.getElementById('kpi-recaudacion');

  if (kpiEspera) kpiEspera.textContent = enEspera;
  if (kpiAtencion) kpiAtencion.textContent = enAtencion;
  if (kpiEntregados) kpiEntregados.textContent = entregados;
  if (kpiRecaudacion) kpiRecaudacion.textContent = `S/ ${recaudacionTotal.toFixed(2)}`;
}

// ---------- Filtro Rápido de Estado ----------
function filtrarPorEstadoRapido(estado) {
  estadoFiltroRapido = estado;
  aplicarFiltros();
}

// ---------- Filtros Tabla Pacientes ----------
function aplicarFiltros() {
  let pacientes = (datosPacientes || []).slice();

  const sedeFiltro = (filtroSede && filtroSede.value || '').trim().toLowerCase();
  const nombreFiltro = (filtroNombre && filtroNombre.value || '').trim().toLowerCase();
  const estudioFiltro = (filtroEstudio && filtroEstudio.value || '').trim().toLowerCase();
  const fechaFiltro = (filtroFecha && filtroFecha.value) || '';

  if (sedeFiltro) pacientes = pacientes.filter(p => (p.sede || '').toLowerCase().includes(sedeFiltro));
  if (nombreFiltro) pacientes = pacientes.filter(p => (p.nombres || '').toLowerCase().includes(nombreFiltro) || (p.apellidos || '').toLowerCase().includes(nombreFiltro));
  if (estudioFiltro) pacientes = pacientes.filter(p => (p.estudios || '').toLowerCase().includes(estudioFiltro));
  if (fechaFiltro) pacientes = pacientes.filter(p => (p.fechaModificacion || '').startsWith(fechaFiltro));

  if (estadoFiltroRapido) {
    pacientes = pacientes.filter(p => p.estado === estadoFiltroRapido);
  }

  paginaActual = 1;
  mostrarPacientes(pacientes);
}

// ---------- Mostrar pacientes ----------
function mostrarPacientes(pacientes) {
  pacientes.sort((a, b) => {
    const ordenA = ordenEstados[a.estado] || 99;
    const ordenB = ordenEstados[b.estado] || 99;

    if (ordenA !== ordenB) {
      return ordenA - ordenB;
    }

    const fechaA = String(a.fechaModificacion || a.fecha || '');
    const fechaB = String(b.fechaModificacion || b.fecha || '');
    return fechaB.localeCompare(fechaA);
  });

  if (tablaPacientes) tablaPacientes.innerHTML = '';
  
  const enEspera = pacientes.filter(p => p.estado === 'En espera').length;
  if (contador) contador.textContent = `Pacientes en espera: ${enEspera}`;

  const totalPaginas = Math.ceil(pacientes.length / pacientesPorPagina) || 1;
  if (paginaActual > totalPaginas) paginaActual = 1;

  const inicio = (paginaActual - 1) * pacientesPorPagina;
  const pacientesPagina = pacientes.slice(inicio, inicio + pacientesPorPagina);

  pacientesPagina.forEach(p => {
    const tr = document.createElement('tr');
    tr.classList.add("fila-paciente");

    if (p.estado === 'En espera') tr.classList.add("estado-espera");
    else if (p.estado === 'En atención') tr.classList.add("estado-atencion");
    else if (p.estado === 'Programado') tr.classList.add("estado-programado");
    else if (p.estado === 'Atendido') tr.classList.add("estado-atendido");
    else if (p.estado === 'Entregado') tr.classList.add("estado-entregado");

    const requierePlacas = /TEM|RM|RX|Mamografia/i.test(p.estudios || '');

    let firmaHTML = '';
    if (p.firma) {
      firmaHTML = `<img src="${p.firma}" alt="Firma" class="firma-img">`;
    } else if (p.estado === 'Entregado') {
      firmaHTML = `<button class="btn small" onclick="abrirModal('${p.key}')" title="Firmar">✍️</button>`;
    }

    const placasHTML = (requierePlacas && p.estado === 'Entregado')
      ? `<input type="number" min="0" value="${p.placas || ''}" onclick="editarConClave(event,'${p.key}','placas', this)" readonly style="width:60px; text-align:center;"/>`
      : (p.placas ? `<div style="width:60px; text-align:center;">${p.placas}</div>` : '');

    const cdChecked = p.cd === 'SI' ? 'checked' : '';
    const cdHTML = (p.estado === 'Entregado')
      ? `<input type="checkbox" ${cdChecked} onclick="editarConClaveCheckbox(event,'${p.key}','cd', this)">`
      : `<div style="width:60px; text-align:center;">${p.cd === 'SI' ? 'SI' : ''}</div>`;

    const informeHTML = (p.estado === 'Entregado')
      ? `<input type="checkbox" ${p.informe === 'SI' ? 'checked' : ''} onclick="editarConClaveCheckbox(event,'${p.key}','informe', this)">`
      : `<div style="width:60px; text-align:center;">${p.informe === 'SI' ? 'SI' : ''}</div>`;

    const estadoSelect = `
      <select onchange="cambiarEstado('${p.key}', this.value)" ${ (p.estado === 'Entregado') ? 'disabled' : '' } >
        <option ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
        <option ${p.estado === 'En atención' ? 'selected' : ''}>En atención</option>
        <option ${p.estado === 'Programado' ? 'selected' : ''}>Programado</option>
        <option ${p.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        <option ${p.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
      </select>
      <div style="font-size:10px; margin-top:2px; color:var(--muted);">${p.fechaModificacion || ''}</div>
    `;

    const accionEliminar = `<button class="btn small danger" onclick="confirmarEliminar('${p.key}')" title="Eliminar">🗑️</button>`;
    const llamarOtraVez = (p.estado === 'En atención')
      ? `<button class="btn small primary" onclick="llamarOtraVez('${p.key}')" title="Llamar">🔔</button>` : '';
    
    // Botón para Ficha Histórica del Paciente
    const verFicha = `<button class="btn small" onclick="verFichaPaciente('${p.key}')" title="Ver Historial Clínico">🔍 Ficha</button>`;

    tr.innerHTML = `
      <td>${p.sede || ''}</td>
      <td><strong>${p.apellidos || ''}</strong></td>
      <td>${p.nombres || ''}</td>
      <td>${p.estudios || ''}</td>
      <td style="text-align:center; width:60px;">${p.cant || ''}</td>
      <td style="text-align:center;">${p.precio || ''}</td>
      <td style="text-align:center;">${p.pf || ''}</td>
      <td style="text-align:center;">${estadoSelect}</td>
      <td style="text-align:center; width:70px;">${placasHTML}</td>
      <td style="text-align:center; width:70px;">${cdHTML}</td>
      <td style="text-align:center; width:70px;">${informeHTML}</td>
      <td style="text-align:center; width:90px;">${p.estado === 'Entregado' ? 'Sí' : ''}</td>
      <td style="text-align:center; width:110px;">${firmaHTML}</td>
      <td style="text-align:center; display:flex; gap:4px; justify-content:center;">${verFicha} ${llamarOtraVez} ${accionEliminar}</td>
    `;

    if (tablaPacientes) tablaPacientes.appendChild(tr);
  });

  renderizarPaginacion(pacientes.length, totalPaginas, pacientes);
}

// ---------- Ficha e Historial del Paciente ----------
function verFichaPaciente(key) {
  const pActual = datosPacientes.find(x => x.key === key);
  if (!pActual) return;

  const nomComp = `${pActual.nombres || ''} ${pActual.apellidos || ''}`.trim().toLowerCase();

  // Buscar todas las atenciones históricas del paciente en la BD
  const historial = datosPacientes.filter(p => {
    const nom = `${p.nombres || ''} ${p.apellidos || ''}`.trim().toLowerCase();
    return nom === nomComp && nomComp !== '';
  });

  const datosPersonalesDiv = document.getElementById('ficha-datos-personales');
  const tablaHistorial = document.getElementById('ficha-tabla-historial');

  if (datosPersonalesDiv) {
    datosPersonalesDiv.innerHTML = `
      <p style="margin: 4px 0;"><strong>Paciente:</strong> ${pActual.apellidos || ''}, ${pActual.nombres || ''}</p>
      <p style="margin: 4px 0;"><strong>Sede de Registro:</strong> ${pActual.sede || 'N/A'}</p>
      <p style="margin: 4px 0;"><strong>Total Atenciones Registradas:</strong> <span style="color: var(--accent); font-weight: bold;">${historial.length}</span></p>
    `;
  }

  if (tablaHistorial) {
    tablaHistorial.innerHTML = '';
    historial.forEach(h => {
      const tr = document.createElement('tr');
      
      let imgFirma = h.firma ? `<img src="${h.firma}" style="max-height: 25px;">` : 'Sin firma';

      tr.innerHTML = `
        <td style="padding: 6px;"><small>${h.fechaModificacion || h.fecha || '-'}</small></td>
        <td style="padding: 6px;">${h.sede || '-'}</td>
        <td style="padding: 6px;">${h.estudios || '-'}</td>
        <td style="padding: 6px;"><strong>${h.estado || '-'}</strong></td>
        <td style="padding: 6px; text-align: center;">${imgFirma}</td>
      `;
      tablaHistorial.appendChild(tr);
    });
  }

  const modalFicha = document.getElementById('modalFichaPaciente');
  if (modalFicha) modalFicha.style.display = 'flex';
}

function cerrarModalFicha() {
  const modalFicha = document.getElementById('modalFichaPaciente');
  if (modalFicha) modalFicha.style.display = 'none';
}

// ---------- Renderizar Paginación ----------
function renderizarPaginacion(totalRegistros, totalPaginas, pacientes) {
  let pagContainer = document.getElementById('paginacion-tabla');
  
  if (!pagContainer) {
    pagContainer = document.createElement('div');
    pagContainer.id = 'paginacion-tabla';
    pagContainer.style.cssText = 'display:flex; gap:5px; justify-content:center; margin:15px 0;';
    if (tablaPacientes && tablaPacientes.parentNode) {
      tablaPacientes.parentNode.insertBefore(pagContainer, tablaPacientes.nextSibling);
    }
  }

  pagContainer.innerHTML = '';

  if (totalRegistros <= pacientesPorPagina) return;

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `btn small ${i === paginaActual ? 'primary' : ''}`;
    btn.onclick = () => {
      paginaActual = i;
      mostrarPacientes(pacientes);
    };
    pagContainer.appendChild(btn);
  }
}

// ---------- Editar con clave (placas) ----------
function editarConClave(evt, key, campo, inputEl) {
  evt.preventDefault();
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  if (pass === ADMIN_PASS) {
    inputEl.removeAttribute('readonly');
    inputEl.focus();
    const blurHandler = () => {
      const nuevoValor = inputEl.value;
      const fechaModificacion = getFechaHoraPeru();
      update(ref(db, 'pacientes/' + key), { [campo]: nuevoValor, fechaModificacion });
      inputEl.setAttribute('readonly', 'true');
      inputEl.removeEventListener('blur', blurHandler);
    };
    inputEl.addEventListener('blur', blurHandler);
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
  }
}

// ---------- Editar checkbox con clave (CD/Informe) ----------
function editarConClaveCheckbox(evt, key, campo, checkboxEl) {
  evt.preventDefault();
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  if (pass === ADMIN_PASS) {
    const nuevoVal = (!checkboxEl.checked) ? 'SI' : 'NO';
    checkboxEl.checked = (nuevoVal === 'SI');
    const fechaModificacion = getFechaHoraPeru();
    update(ref(db, 'pacientes/' + key), { [campo]: nuevoVal, fechaModificacion });
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
    checkboxEl.checked = (pacienteActual[campo] === 'SI');
  }
}

// ---------- Cambiar estado ----------
function cambiarEstado(key, nuevoEstado) {
  const actual = datosPacientes.find(x => x.key === key);
  if (!actual) return;

  if (actual.estado === 'Entregado') {
    alert('No se puede modificar: ya está ENTREGADO.');
    aplicarFiltros();
    return;
  }
  if (actual.estado === 'Atendido' && nuevoEstado !== 'Entregado') {
    alert('Una vez ATENDIDO solo puede avanzar a ENTREGADO.');
    aplicarFiltros();
    return;
  }

  const fechaModificacion = getFechaHoraPeru();

  if (nuevoEstado === 'En atención') {
    const turno = {
      nombre: actual.nombres + ' ' + actual.apellidos,
      sede: actual.sede,
      estudio: actual.estudios,
      hora: new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })
    };
    set(ref(db, `turnoActual/${keyify(actual.sede)}`), turno);
    set(ref(db, 'turnoActual_global'), turno);
  }

  if (nuevoEstado === 'Entregado') {
    pendingSelectForEntrega = { key, prev: actual.estado };
    abrirModalParaEntrega(key);
    return;
  }

  update(ref(db, 'pacientes/' + key), { estado: nuevoEstado, fechaModificacion });
}

// ---------- Llamar otra vez ----------
function llamarOtraVez(key) {
  const actual = datosPacientes.find(x => x.key === key);
  if (!actual) return;

  const turno = {
    nombre: actual.nombres + ' ' + actual.apellidos,
    sede: actual.sede,
    estudio: actual.estudios,
    hora: new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })
  };
  set(ref(db, `turnoActual/${keyify(actual.sede)}`), turno);
  set(ref(db, 'turnoActual_global'), turno);
}

// ---------- Confirmar eliminar ----------
function confirmarEliminar(key) {
  const pass = prompt('Ingrese contraseña de administrador:');
  if (pass === ADMIN_PASS) {
    remove(ref(db, 'pacientes/' + key));
  } else {
    alert('Contraseña incorrecta. No se eliminó.');
  }
}

// ---------- Modal de entrega (obligatorio) ----------
const modalFirma = document.getElementById('modalFirma');
const canvas = document.getElementById('canvasFirma');
const ctx = canvas ? canvas.getContext('2d') : null;

function resizeCanvasForDisplay() {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000';
}

function abrirModalParaEntrega(key) {
  firmaActualPaciente = key;
  const paciente = datosPacientes.find(x => x.key === key) || {};
  const placasInput = document.getElementById('modal_placas');
  const cdSelect = document.getElementById('modal_cd');
  const informeSelect = document.getElementById('modal_informe');

  if (!placasInput || !cdSelect || !informeSelect || !modalFirma || !canvas) {
    alert('Faltan elementos del modal en index.html.');
    if (pendingSelectForEntrega) {
      update(ref(db, 'pacientes/' + key), { estado: paciente.estado || 'En espera' });
      pendingSelectForEntrega = null;
    }
    return;
  }

  placasInput.value = paciente.placas || '';
  cdSelect.value = paciente.cd || '';
  informeSelect.value = paciente.informe || '';

  modalFirma.style.display = 'flex';
  modalFirma.setAttribute('aria-hidden', 'false');
  setTimeout(() => { resizeCanvasForDisplay(); limpiarFirma(); }, 50);
}

// ---------- Canvas Helpers ----------
function isCanvasBlank(c) {
  try {
    const blank = document.createElement('canvas');
    blank.width = c.width;
    blank.height = c.height;
    return c.toDataURL() === blank.toDataURL();
  } catch (e) {
    return true;
  }
}

let dibujando = false;
function getPosicion(evt) {
  const rect = canvas.getBoundingClientRect();
  if (evt.touches && evt.touches[0]) {
    return { x: evt.touches[0].clientX - rect.left, y: evt.touches[0].clientY - rect.top };
  } else if (evt.changedTouches && evt.changedTouches[0]) {
    return { x: evt.changedTouches[0].clientX - rect.left, y: evt.changedTouches[0].clientY - rect.top };
  } else {
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }
}

if (canvas && ctx) {
  canvas.addEventListener('mousedown', e => {
    dibujando = true;
    const pos = getPosicion(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });
  canvas.addEventListener('mousemove', e => {
    if (!dibujando) return;
    const pos = getPosicion(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });
  canvas.addEventListener('mouseup', () => { dibujando = false; ctx.beginPath(); });
  canvas.addEventListener('mouseout', () => { dibujando = false; ctx.beginPath(); });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    dibujando = true;
    const pos = getPosicion(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!dibujando) return;
    const pos = getPosicion(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });
  canvas.addEventListener('touchend', () => { dibujando = false; ctx.beginPath(); });
}

// ---------- Guardar entrega desde modal ----------
function guardarEntregaDesdeModal() {
  if (!firmaActualPaciente) return alert('Paciente no seleccionado.');

  const placasInput = document.getElementById('modal_placas');
  const cdSelect = document.getElementById('modal_cd');
  const informeSelect = document.getElementById('modal_informe');

  const paciente = datosPacientes.find(x => x.key === firmaActualPaciente) || {};
  const requierePlacas = /TEM|RM|RX|Mamografia/i.test(paciente.estudios || '');

  const placasVal = placasInput ? placasInput.value.trim() : '';
  const cdVal = cdSelect ? cdSelect.value : '';
  const informeVal = informeSelect ? informeSelect.value : '';

  if (requierePlacas && (placasVal === '' || isNaN(Number(placasVal)))) {
    alert('Debe indicar el número de placas (obligatorio para este estudio).');
    return;
  }
  if (!cdVal) { alert('Debe seleccionar CD (SI/NO).'); return; }
  if (!informeVal) { alert('Debe seleccionar Informe (SI/NO).'); return; }

  if (!ctx || isCanvasBlank(canvas)) {
    alert('Debe firmar antes de guardar la entrega.');
    return;
  }

  const dataURL = canvas.toDataURL('image/png');
  const fechaModificacion = getFechaHoraPeru();

  update(ref(db, 'pacientes/' + firmaActualPaciente), {
    estado: 'Entregado',
    placas: placasVal || '',
    cd: cdVal,
    informe: informeVal,
    firma: dataURL,
    fechaModificacion
  });

  pendingSelectForEntrega = null;
  cerrarModal();
}

// ---------- Modal util ----------
function abrirModal(key) {
  firmaActualPaciente = key;
  resizeCanvasForDisplay();
  limpiarFirma();
  if (modalFirma) {
    modalFirma.style.display = 'flex';
    modalFirma.setAttribute('aria-hidden', 'false');
  }
}

function limpiarFirma() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function cerrarModal() {
  if (modalFirma) {
    modalFirma.style.display = 'none';
    modalFirma.setAttribute('aria-hidden', 'true');
  }
  if (pendingSelectForEntrega) {
    aplicarFiltros();
    pendingSelectForEntrega = null;
  }
  firmaActualPaciente = null;
}

// ---------- Guardar firma ----------
function guardarFirma() {
  if (!firmaActualPaciente) return;
  if (!ctx || isCanvasBlank(canvas)) { alert('Firma vacía.'); return; }
  const dataURL = canvas.toDataURL('image/png');
  const fechaModificacion = getFechaHoraPeru();
  update(ref(db, 'pacientes/' + firmaActualPaciente), { firma: dataURL, fechaModificacion });
  cerrarModal();
}

// ---------- Exportar Excel ----------
function exportarExcel() {
  if (typeof XLSX === 'undefined') {
    alert('La librería XLSX no está cargada.');
    return;
  }
  const datos = (datosPacientes || []).map(p => ({
    Sede: p.sede,
    Apellidos: p.apellidos,
    Nombres: p.nombres,
    Estudios: p.estudios,
    Cant: p.cant,
    Precio: p.precio,
    PF: p.pf,
    Estado: p.estado,
    Placas: p.placas,
    CD: p.cd,
    Informe: p.informe,
    Entregado: p.estado === 'Entregado' ? 'Sí' : 'No',
    Fecha: p.fechaModificacion
  }));
  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');
  XLSX.writeFile(workbook, 'Pacientes.xlsx');
}

// ---------- Listeners modal buttons ----------
const btnSaveEntrega = document.getElementById('modal_save_entrega');
const btnCancelEntrega = document.getElementById('modal_cancel_entrega');
const btnClearFirma = document.getElementById('modal_limpiar_firma');

if (btnSaveEntrega) btnSaveEntrega.addEventListener('click', guardarEntregaDesdeModal);
if (btnCancelEntrega) btnCancelEntrega.addEventListener('click', cerrarModal);
if (btnClearFirma) btnClearFirma.addEventListener('click', limpiarFirma);

// ---------- Listeners filtros ----------
[filtroSede, filtroNombre, filtroEstudio, filtroFecha].forEach(i => i && i.addEventListener('input', aplicarFiltros));

// ---------- Exponer funciones globales ----------
window.cambiarEstado = cambiarEstado;
window.abrirModal = abrirModal;
window.confirmarEliminar = confirmarEliminar;
window.llamarOtraVez = llamarOtraVez;
window.editarConClave = editarConClave;
window.editarConClaveCheckbox = editarConClaveCheckbox;
window.guardarFirma = guardarFirma;
window.limpiarFirma = limpiarFirma;
window.guardarEntregaDesdeModal = guardarEntregaDesdeModal;
window.exportarExcel = exportarExcel;
window.mostrarSeccion = mostrarSeccion;
window.mostrarSubPestana = mostrarSubPestana;
window.verFichaPaciente = verFichaPaciente;
window.cerrarModalFicha = cerrarModalFicha;
window.filtrarPorEstadoRapido = filtrarPorEstadoRapido;

// ---------- Iniciar ----------
loadSedesToSelect();
cargarPacientes();
