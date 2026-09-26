// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.appspot.com",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e",
  measurementId: "G-C9STJV4J6K"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const tablaResumen = document.getElementById('tabla-resumen');
const filtroSede = document.getElementById('filtroSede');
const filtroFecha = document.getElementById('filtroFecha');
const paginacionDiv = document.getElementById('paginacion');
const contadorEspera = document.getElementById('contadorEspera');

let pacientesOriginal = [];
let paginaActual = 1;
const pacientesPorPagina = 15; // Ajustado a 15 para mejor usabilidad visual
let pacientesFiltrados = [];

function cargarPacientes() {
  db.ref('pacientes').on('value', snapshot => {
    pacientesOriginal = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      pacientesOriginal.push(paciente);
    });

    actualizarContadorEspera();
    aplicarFiltros(true);
  });
}

function actualizarContadorEspera() {
  if (contadorEspera) {
    const enEspera = pacientesOriginal.filter(p => p.estado === 'En espera').length;
    contadorEspera.textContent = enEspera;
  }
}

function aplicarFiltros(reiniciarPagina = false) {
  const sedeFiltro = filtroSede.value.trim().toLowerCase();
  const fechaFiltro = filtroFecha.value;

  pacientesFiltrados = pacientesOriginal;

  if (sedeFiltro) {
    pacientesFiltrados = pacientesFiltrados.filter(p => (p.sede || '').toLowerCase().includes(sedeFiltro));
  }

  if (fechaFiltro) {
    pacientesFiltrados = pacientesFiltrados.filter(p => (p.fechaModificacion || '').startsWith(fechaFiltro));
  }

  // Orden por estado
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

    return fechaB - fechaA;
  });

  if (reiniciarPagina) paginaActual = 1;
  mostrarPacientesPaginados();
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '-';
  if (fechaStr.includes('T')) {
    const [f, h] = fechaStr.split('T');
    const [yyyy, mm, dd] = f.split('-');
    return `${dd}/${mm}/${yyyy} ${h.substring(0, 5)}`;
  }
  return fechaStr;
}

function mostrarPacientesPaginados() {
  const totalPaginas = Math.ceil(pacientesFiltrados.length / pacientesPorPagina) || 1;
  if (paginaActual > totalPaginas) paginaActual = 1;

  const inicio = (paginaActual - 1) * pacientesPorPagina;
  const fin = inicio + pacientesPorPagina;
  const pacientesPagina = pacientesFiltrados.slice(inicio, fin);

  tablaResumen.innerHTML = '';

  if (pacientesPagina.length === 0) {
    tablaResumen.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#64748b;">No hay registros disponibles.</td></tr>`;
    renderizarPaginacion(0);
    return;
  }

  pacientesPagina.forEach(p => {
    const tr = document.createElement('tr');
    
    // Clase CSS según estado
    if (p.estado === 'En espera') tr.className = 'estado-espera';
    else if (p.estado === 'En atención') tr.className = 'estado-atencion';
    else if (p.estado === 'Programado') tr.className = 'estado-programado';
    else if (p.estado === 'Atendido') tr.className = 'estado-atendido';

    tr.innerHTML = `
      <td><strong>${p.sede || '-'}</strong></td>
      <td>${p.apellidos || '-'}</td>
      <td>${p.nombres || '-'}</td>
      <td>${p.estudios || '-'}</td>
      <td style="text-align: center;">${p.cant || 1}</td>
      <td><strong>${p.estado || '-'}</strong></td>
      <td style="font-size: 12px; color: #475569;">${formatearFecha(p.fechaModificacion)}</td>
    `;

    tablaResumen.appendChild(tr);
  });

  renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
  paginacionDiv.innerHTML = '';
  if (totalPaginas <= 1) return;

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === paginaActual) btn.classList.add('active');
    
    btn.addEventListener('click', () => {
      paginaActual = i;
      mostrarPacientesPaginados();
    });
    paginacionDiv.appendChild(btn);
  }
}

filtroSede.addEventListener('input', () => aplicarFiltros(true));
filtroFecha.addEventListener('change', () => aplicarFiltros(true));

cargarPacientes();
