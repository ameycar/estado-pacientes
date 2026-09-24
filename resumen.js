// resumen.js (Firebase v9)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const tablaResumen = document.getElementById('tabla-resumen');
const filtroSede = document.getElementById('filtroSede');
const filtroFecha = document.getElementById('filtroFecha');
const paginacionDiv = document.getElementById('paginacion');

let pacientesOriginal = [];
let paginaActual = 1;
const pacientesPorPagina = 50;
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

    aplicarFiltros(true); // Reinicia a la página 1 al recibir datos nuevos
  }, error => {
    console.error("Error al cargar pacientes en resumen:", error);
  });
}

// ---------- Aplicar Filtros y Ordenamiento ----------
function aplicarFiltros(reiniciarPagina = false) {
  if (!filtroSede || !filtroFecha) return;

  const sedeFiltro = filtroSede.value.trim().toLowerCase();
  const fechaFiltro = filtroFecha.value;

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

    const fechaA = new Date(a.fechaModificacion || '2000-01-01T00:00:00');
    const fechaB = new Date(b.fechaModificacion || '2000-01-01T00:00:00');

    return fechaB - fechaA; // Los más recientes primero
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
    tr.innerHTML = `
      <td><strong>${p.sede || ''}</strong></td>
      <td>${p.apellidos || ''}</td>
      <td>${p.nombres || ''}</td>
      <td>${p.estudios || ''}</td>
      <td style="text-align:center;">${p.cant || ''}</td>
      <td><strong>${p.estado || ''}</strong></td>
      <td style="font-size: 12px;">${p.fechaModificacion ? p.fechaModificacion.replace('T', ' ') : ''}</td>
    `;

    // Asignación de colores según estado
    tr.style.backgroundColor =
      p.estado === 'En espera' ? '#ffe5e5' :
      p.estado === 'En atención' ? '#fff5cc' :
      p.estado === 'Programado' ? '#cce5ff' :
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

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.style.margin = '0 2px';
    btn.style.padding = '5px 10px';
    btn.disabled = i === paginaActual;
    
    if (i === paginaActual) {
      btn.style.fontWeight = 'bold';
      btn.style.backgroundColor = '#008080';
      btn.style.color = '#fff';
    }

    btn.addEventListener('click', () => {
      paginaActual = i;
      mostrarPacientesPaginados();
    });
    paginacionDiv.appendChild(btn);
  }
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
