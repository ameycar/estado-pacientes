// Configuración de Firebase
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

function cargarPacientes() {
  db.ref('pacientes').on('value', snapshot => {
    pacientesOriginal = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      pacientesOriginal.push(paciente);
    });

    aplicarFiltros();
  });
}

function aplicarFiltros() {
  const sedeFiltro = filtroSede.value.trim().toLowerCase();
  const fechaFiltro = filtroFecha.value;

  let filtrados = pacientesOriginal;

  if (sedeFiltro) {
    filtrados = filtrados.filter(p => p.sede.toLowerCase().includes(sedeFiltro));
  }

  if (fechaFiltro) {
    filtrados = filtrados.filter(p => p.fechaModificacion.startsWith(fechaFiltro));
  }

  mostrarPacientesPaginados(filtrados);
}

function mostrarPacientesPaginados(pacientes) {
  // Ordenar: por estado y fecha
  const estados = { 'En espera': 1, 'En atención': 2, 'Programado': 3, 'Atendido': 4 };

  pacientes.sort((a, b) => {
    if (estados[a.estado] !== estados[b.estado]) {
      return estados[a.estado] - estados[b.estado];
    } else {
      return new Date(b.fechaModificacion) - new Date(a.fechaModificacion);
    }
  });

  const totalPaginas = Math.ceil(pacientes.length / pacientesPorPagina);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * pacientesPorPagina;
  const fin = inicio + pacientesPorPagina;
  const pacientesPagina = pacientes.slice(inicio, fin);

  // Renderizar tabla
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
      <td style="font-size: 12px;">${p.fechaModificacion}</td>
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
      aplicarFiltros();
    });
    paginacionDiv.appendChild(btn);
  }
}

filtroSede.addEventListener('input', aplicarFiltros);
filtroFecha.addEventListener('input', aplicarFiltros);

cargarPacientes();
