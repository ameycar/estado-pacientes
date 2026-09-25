// resumen.js (Firebase v9)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const tablaResumen = document.getElementById('tabla-resumen');
const filtroSede = document.getElementById('filtroSede');
const filtroFecha = document.getElementById('filtroFecha');
const paginacionDiv = document.getElementById('paginacion');
const contadorEl = document.getElementById('contadorResumenEnEspera');

let pacientesOriginal = [];
let paginaActual = 1;
const pacientesPorPagina = 15;
let pacientesFiltrados = [];

// ---------- Cargar Pacientes en Tiempo Real ----------
function cargarPacientes() {
  onValue(ref(db, 'pacientes'), snapshot => {
    pacientesOriginal = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      pacientesOriginal.push(paciente);
    });

    actualizarContadorGlobal();
    aplicarFiltros(true);
  }, error => {
    console.error("Error al cargar pacientes en resumen:", error);
  });
}

// Actualizar contador total de pacientes en espera
function actualizarContadorGlobal() {
  if (contadorEl) {
    const totalEnEspera = pacientesOriginal.filter(p => p.estado === 'En espera').length;
    contadorEl.textContent = totalEnEspera;
  }
}

// ---------- Aplicar Filtros y Ordenamiento ----------
function aplicarFiltros(reiniciarPagina = false) {
  const sedeFiltro = filtroSede ? filtroSede.value.trim().toLowerCase() : '';
  const fechaFiltro = filtroFecha ? filtroFecha.value : '';

  pacientesFiltrados = pacientesOriginal.slice();

  if (sedeFiltro) {
    pacientesFiltrados = pacientesFiltrados.filter(p => (p.sede || '').toLowerCase().includes(sedeFiltro));
  }

  if (fechaFiltro) {
    pacientesFiltrados = pacientesFiltrados.filter(p => (p.fechaModificacion || '').startsWith(fechaFiltro));
  }

  // Orden personalizado por estado y fecha descendente
  const ordenEstado = {
    'En espera': 1,
    'En atención': 2,
    'Programado': 3,
    'Atendido': 4,
    'Entregado': 5
  };

  pacientesFiltrados.sort((a, b) => {
    const estadoA = ordenEstado[a.estado] || 99;
    const estadoB = ordenEstado[b.estado] || 99;

    if (estadoA !== estadoB) return estadoA - estadoB;

    const fechaA = String(a.fechaModificacion || '');
    const fechaB = String(b.fechaModificacion || '');

    return fechaB.localeCompare(fechaA);
  });

  if (reiniciarPagina) paginaActual = 1;
  mostrarPacientesPaginados();
}

// ---------- Renderizado de la Tabla ----------
function mostrarPacientesPaginados() {
  if (!tablaResumen) return;

  const totalPaginas = Math.ceil(pacientesFiltrados.length / pacientesPorPagina) || 1;
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * pacientesPorPagina;
  const fin = inicio + pacientesPorPagina;
  const pacientesPagina = pacientesFiltrados.slice(inicio, fin);

  tablaResumen.innerHTML = '';

  if (pacientesPagina.length === 0) {
    tablaResumen.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #777;">No hay registros disponibles.</td></tr>';
    renderizarPaginacion(0);
    return;
  }

  pacientesPagina.forEach(p => {
    const tr = document.createElement('tr');
    
    // Formatear fecha para la vista (DD/MM/YYYY HH:mm)
    let fechaTexto = p.fechaModificacion || p.fecha || '-';
    if (fechaTexto.includes('T')) {
      const [fecha, hora] = fechaTexto.split('T');
      const [yyyy, mm, dd] = fecha.split('-');
      fechaTexto = `${dd}/${mm}/${yyyy} ${hora.substring(0, 5)}`;
    }

    tr.innerHTML = `
      <td><strong>${p.sede || ''}</strong></td>
      <td>${p.apellidos || ''}</td>
      <td>${p.nombres || ''}</td>
      <td>${p.estudios || ''}</td>
      <td style="text-align:center;">${p.cant || 1}</td>
      <td><strong>${p.estado || 'En espera'}</strong></td>
      <td style="font-size: 12px;">${fechaTexto}</td>
    `;

    // Asignación de colores según estado
    tr.style.backgroundColor =
      p.estado === 'En espera' ? '#ffe5e5' :
      p.estado === 'En atención' ? '#fff5cc' :
      p.estado === 'Programado' ? '#e1bee7' :
      p.estado === 'Atendido' ? '#d5f5d5' : '#f0f0f0';

    tablaResumen.appendChild(tr);
  });

  renderizarPaginacion(totalPaginas);
}

// ---------- Controles de Paginación ----------
function renderizarPaginacion(totalPaginas) {
  if (!paginacionDiv) return;
  paginacionDiv.innerHTML = '';

  if (totalPaginas <= 1) return;

  // Botón Anterior
  const btnAnt = document.createElement("button");
  btnAnt.className = "pag-quad";
  btnAnt.innerText = "‹";
  btnAnt.disabled = paginaActual === 1;
  btnAnt.onclick = () => { paginaActual--; mostrarPacientesPaginados(); };
  paginacionDiv.appendChild(btnAnt);

  // Cuadritos Numerados
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `pag-quad ${i === paginaActual ? 'activa' : ''}`;
    btn.addEventListener('click', () => {
      paginaActual = i;
      mostrarPacientesPaginados();
    });
    paginacionDiv.appendChild(btn);
  }

  // Botón Siguiente
  const btnSig = document.createElement("button");
  btnSig.className = "pag-quad";
  btnSig.innerText = "›";
  btnSig.disabled = paginaActual === totalPaginas;
  btnSig.onclick = () => { paginaActual++; mostrarPacientesPaginados(); };
  paginacionDiv.appendChild(btnSig);
}

// ---------- Event Listeners de Filtros ----------
if (filtroSede) {
  filtroSede.addEventListener('input', () => aplicarFiltros(true));
}

if (filtroFecha) {
  filtroFecha.addEventListener('input', () => aplicarFiltros(true));
}

// ---------- Inicialización ----------
cargarPacientes();
