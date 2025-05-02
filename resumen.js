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

let pacientesOriginal = [];
let paginaActual = 1;
const pacientesPorPagina = 50;
let pacientesFiltrados = [];

function cargarPacientes() {
  db.ref('pacientes').on('value', snapshot => {
    pacientesOriginal = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      pacientesOriginal.push(paciente);
    });

    aplicarFiltros(true); // Se reinicia a página 1 al cargar
  });
}

function aplicarFiltros(reiniciarPagina = false) {
  const sedeFiltro = filtroSede.value.trim().toLowerCase();
  const fechaFiltro = filtroFecha.value;

  pacientesFiltrados = pacientesOriginal;

  if (sedeFiltro) {
    pacientesFiltrados = pacientesFiltrados.filter(p => p.sede.toLowerCase().includes(sedeFiltro));
  }

  if (fechaFiltro) {
    pacientesFiltrados = pacientesFiltrados.filter(p => (p.fechaModificacion || '').startsWith(fechaFiltro));
  }

  // Orden personalizado
  const ordenEstado = {
    'En espera': 1,
    'En atención': 2,
    'Programado': 3,
    'Atendido': 4
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

function mostrarPacientesPaginados() {
  const totalPaginas = Math.ceil(pacientesFiltrados.length / pacientesPorPagina);
  if (paginaActual > totalPaginas) paginaActual = 1;

  const inicio = (paginaActual - 1) * pacientesPorPagina;
  const fin = inicio + pacientesPorPagina;
  const pacientesPagina = pacientesFiltrados.slice(inicio, fin);

  tablaResumen.innerHTML = '';
  pacientesPagina.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${p.estudios}</td>
      <td>${p.cant}</td>
      <td>${p.estado}</td>
      <td style="font-size: 12px;">${p.fechaModificacion || ''}</td>
    `;
    tr.style.backgroundColor =
      p.estado === 'En espera' ? '#ffe5e5' :
      p.estado === 'En atención' ? '#fff5cc' :
      p.estado === 'Programado' ? '#cce5ff' :
      '#d5f5d5';

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
    btn.style.margin = '0 2px';
    btn.disabled = i === paginaActual;
    btn.addEventListener('click', () => {
      paginaActual = i;
      mostrarPacientesPaginados(); // Ya no reaplica filtros
    });
    paginacionDiv.appendChild(btn);
  }
}

filtroSede.addEventListener('input', () => aplicarFiltros(true));
filtroFecha.addEventListener('input', () => aplicarFiltros(true));

cargarPacientes();
