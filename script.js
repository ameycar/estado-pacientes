// Configurar Firebase
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

const formulario = document.getElementById('formulario');
const tablaPacientes = document.getElementById('tabla-pacientes');
const contador = document.getElementById('contador');
const estudiosSelect = document.getElementById('estudios');
const cantidadEcoPbDiv = document.getElementById('cantidad-eco-pb');
const ecoPbCantidad = document.getElementById('ecoPbCantidad');
const filtroSede = document.getElementById('filtroSede');
const filtroFecha = document.getElementById('filtroFecha');
const filtroNombre = document.getElementById('filtroNombre');
const filtroEstudio = document.getElementById('filtroEstudio');
const exportBtn = document.getElementById('exportarExcel');

let datosPacientes = [];

estudiosSelect.addEventListener('change', () => {
  const seleccionados = Array.from(estudiosSelect.selectedOptions).map(option => option.value);
  cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
});

formulario.addEventListener('submit', e => {
  e.preventDefault();
  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  let estudios = Array.from(estudiosSelect.selectedOptions).map(option => option.value);
  let cant = estudios.length;
  const estado = 'En espera';
  const fechaModificacion = new Date().toLocaleString();

  if (estudios.includes('Eco pb')) {
    const ecoCantidad = parseInt(ecoPbCantidad.value);
    cant = estudios.length - 1 + ecoCantidad;
  }

  const nuevoPaciente = {
    sede,
    apellidos,
    nombres,
    estudios: estudios.join(', '),
    cant,
    estado,
    fechaModificacion
  };

  db.ref('pacientes').push(nuevoPaciente);
  formulario.reset();
  cantidadEcoPbDiv.style.display = 'none';
});

function cargarPacientes() {
  db.ref('pacientes').on('value', snapshot => {
    datosPacientes = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      datosPacientes.push(paciente);
    });
    aplicarFiltros();
  });
}

function aplicarFiltros() {
  let pacientes = [...datosPacientes];
  const sedeFiltro = filtroSede.value.trim().toLowerCase();
  const fechaFiltro = filtroFecha.value;
  const nombreFiltro = filtroNombre.value.trim().toLowerCase();
  const estudioFiltro = filtroEstudio.value.trim().toLowerCase();

  if (sedeFiltro) pacientes = pacientes.filter(p => p.sede.toLowerCase().includes(sedeFiltro));
  if (fechaFiltro) pacientes = pacientes.filter(p => p.fechaModificacion.startsWith(fechaFiltro));
  if (nombreFiltro) pacientes = pacientes.filter(p => p.apellidos.toLowerCase().includes(nombreFiltro) || p.nombres.toLowerCase().includes(nombreFiltro));
  if (estudioFiltro) pacientes = pacientes.filter(p => p.estudios.toLowerCase().includes(estudioFiltro));

  mostrarPacientes(pacientes);
  actualizarGraficos(pacientes);
}

function mostrarPacientes(pacientes) {
  pacientes.sort((a, b) => {
    const estados = { 'En espera': 1, 'En atención': 2, 'Programado': 3, 'Atendido': 4 };
    return estados[a.estado] - estados[b.estado];
  });

  let enEspera = 0;
  tablaPacientes.innerHTML = '';

  pacientes.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${p.estudios}</td>
      <td>${p.cant}</td>
      <td>
        <select onchange="cambiarEstado('${p.key}', this.value)">
          <option ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
          <option ${p.estado === 'En atención' ? 'selected' : ''}>En atención</option>
          <option ${p.estado === 'Programado' ? 'selected' : ''}>Programado</option>
          <option ${p.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        </select>
        <div style="font-size:10px;">${p.fechaModificacion}</div>
      </td>
      <td><button onclick="eliminarPaciente('${p.key}')">🗑️</button></td>
    `;

    tr.style.backgroundColor =
      p.estado === 'En espera' ? '#ffe5e5' :
      p.estado === 'En atención' ? '#fff5cc' :
      p.estado === 'Programado' ? '#cce5ff' :
      '#d5f5d5';

    tablaPacientes.appendChild(tr);

    if (p.estado === 'En espera') {
      enEspera++;
    }
  });

  contador.textContent = `Pacientes en espera: ${enEspera}`;
}

function cambiarEstado(key, nuevoEstado) {
  const fechaModificacion = new Date().toLocaleString();
  db.ref('pacientes/' + key).update({ estado: nuevoEstado, fechaModificacion });
}

function eliminarPaciente(key) {
  db.ref('pacientes/' + key).remove();
}

filtroSede.addEventListener('input', aplicarFiltros);
filtroFecha.addEventListener('input', aplicarFiltros);
filtroNombre.addEventListener('input', aplicarFiltros);
filtroEstudio.addEventListener('input', aplicarFiltros);

exportBtn.addEventListener('click', () => exportarExcel(datosPacientes));

function exportarExcel(pacientes) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(pacientes);
  XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');
  XLSX.writeFile(wb, 'ReportePacientes.xlsx');
}

function actualizarGraficos(pacientes) {
  const estados = { 'En espera': 0, 'En atención': 0, 'Programado': 0, 'Atendido': 0 };
  const sedes = {};
  const estudios = {};

  pacientes.forEach(p => {
    estados[p.estado]++;

    if (!sedes[p.sede]) sedes[p.sede] = 0;
    sedes[p.sede]++;

    p.estudios.split(', ').forEach(est => {
      if (!estudios[est]) estudios[est] = 0;
      estudios[est]++;
    });
  });

  generarGrafico('graficoEstado', 'Pacientes por Estado', Object.keys(estados), Object.values(estados));
  generarGrafico('graficoSede', 'Pacientes por Sede', Object.keys(sedes), Object.values(sedes));
  generarGrafico('graficoEstudio', 'Pacientes por Estudio', Object.keys(estudios), Object.values(estudios));
}

function generarGrafico(canvasId, titulo, etiquetas, datos) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (window[canvasId]) window[canvasId].destroy();
  window[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{
        label: titulo,
        data: datos,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

cargarPacientes();
