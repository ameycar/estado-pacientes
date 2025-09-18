// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.appspot.com",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e"
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
const filtroNombre = document.getElementById('filtroNombre');
const filtroEstudio = document.getElementById('filtroEstudio');
const filtroFecha = document.getElementById('filtroFecha');

let datosPacientes = [];
let firmaActualPaciente = null; // paciente sobre el que se firma

// 🔹 Mostrar cantidad Eco pb
estudiosSelect.addEventListener('change', () => {
  const seleccionados = Array.from(estudiosSelect.selectedOptions).map(option => option.value);
  cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
});

// 🔹 Registrar paciente
formulario.addEventListener('submit', e => {
  e.preventDefault();
  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  let estudios = Array.from(estudiosSelect.selectedOptions).map(option => option.value);
  let cant = estudios.length;
  const precio = document.getElementById('precio').value.trim();
  const pf = document.getElementById('pf').value.trim();
  const estado = 'En espera';
  const fechaModificacion = new Date().toISOString().slice(0, 16); // formato YYYY-MM-DDTHH:mm

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
    precio,
    pf,
    estado,
    placas: '',
    cd: '',
    informe: '',
    entregado: '',
    firma: '',
    fechaModificacion
  };

  db.ref('pacientes').push(nuevoPaciente);
  formulario.reset();
  cantidadEcoPbDiv.style.display = 'none';
});

// 🔹 Cargar pacientes
function cargarPacientes() {
  db.ref('pacientes').on('value', snapshot => {
    let pacientes = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      pacientes.push(paciente);
    });
    datosPacientes = pacientes;
    aplicarFiltros();
  });
}

// 🔹 Filtros
function aplicarFiltros() {
  let pacientes = datosPacientes;

  const sedeFiltro = filtroSede.value.trim().toLowerCase();
  const nombreFiltro = filtroNombre.value.trim().toLowerCase();
  const estudioFiltro = filtroEstudio.value.trim().toLowerCase();
  const fechaFiltro = filtroFecha.value;

  if (sedeFiltro) {
    pacientes = pacientes.filter(p => p.sede.toLowerCase().includes(sedeFiltro));
  }
  if (nombreFiltro) {
    pacientes = pacientes.filter(p => p.nombres.toLowerCase().includes(nombreFiltro) || p.apellidos.toLowerCase().includes(nombreFiltro));
  }
  if (estudioFiltro) {
    pacientes = pacientes.filter(p => p.estudios.toLowerCase().includes(estudioFiltro));
  }
  if (fechaFiltro) {
    pacientes = pacientes.filter(p => p.fechaModificacion.startsWith(fechaFiltro));
  }

  mostrarPacientes(pacientes);
  actualizarGraficos(pacientes);
}

// 🔹 Mostrar pacientes
function mostrarPacientes(pacientes) {
  pacientes.sort((a, b) => {
    const estados = { 'En espera': 1, 'En atención': 2, 'Programado': 3, 'Atendido': 4 };
    return estados[a.estado] - estados[b.estado];
  });

  let enEspera = 0;
  tablaPacientes.innerHTML = '';

  pacientes.forEach(p => {
    const tr = document.createElement('tr');

    // 🔹 Validar si el estudio requiere Placas/CD
    const requierePlacas = /rx|tem|rm|mamografia/i.test(p.estudios);

    tr.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${p.estudios}</td>
      <td>${p.cant}</td>
      <td>${p.precio || ''}</td>
      <td>${p.pf || ''}</td>
      <td>
        <select onchange="cambiarEstado('${p.key}', this.value)">
          <option ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
          <option ${p.estado === 'En atención' ? 'selected' : ''}>En atención</option>
          <option ${p.estado === 'Programado' ? 'selected' : ''}>Programado</option>
          <option ${p.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        </select>
        <div style="font-size:10px;">${p.fechaModificacion || ''}</div>
      </td>
      <td>${requierePlacas && p.estado === 'Atendido' ? `<input type="text" value="${p.placas || ''}" onchange="guardarCampo('${p.key}','placas',this.value)">` : ''}</td>
      <td>${requierePlacas && p.estado === 'Atendido' ? `<input type="text" value="${p.cd || ''}" onchange="guardarCampo('${p.key}','cd',this.value)">` : ''}</td>
      <td>${p.estado === 'Atendido' ? `<input type="text" value="${p.informe || ''}" onchange="guardarCampo('${p.key}','informe',this.value)">` : ''}</td>
      <td>${p.estado === 'Atendido' ? `<input type="text" value="${p.entregado || ''}" onchange="guardarCampo('${p.key}','entregado',this.value)">` : ''}</td>
      <td>${p.estado === 'Atendido' ? `<button onclick="abrirModal('${p.key}')">✍️ Firmar</button>` : ''}</td>
      <td>
        <button onclick="eliminarPaciente('${p.key}')">🗑️</button>
        ${p.estado === 'En atención' ? `<button onclick="repetirLlamado('${p.key}')">📢 Llamar otra vez</button>` : ''}
      </td>
    `;

    tr.style.backgroundColor =
      p.estado === 'En espera' ? '#ffe5e5' :
      p.estado === 'En atención' ? '#fff5cc' :
      p.estado === 'Programado' ? '#cce5ff' : '#d5f5d5';

    tablaPacientes.appendChild(tr);

    if (p.estado === 'En espera') enEspera++;
  });

  contador.textContent = `Pacientes en espera: ${enEspera}`;
}

// 🔹 Guardar campos editables
function guardarCampo(key, campo, valor) {
  db.ref('pacientes/' + key).update({ [campo]: valor });
}

// 🔹 Cambiar estado
function cambiarEstado(key, nuevoEstado) {
  const fechaModificacion = new Date().toISOString().slice(0, 16);
  db.ref('pacientes/' + key).update({ estado: nuevoEstado, fechaModificacion });
}

// 🔹 Eliminar paciente
function eliminarPaciente(key) {
  db.ref('pacientes/' + key).remove();
}

// 🔹 Repetir llamado
function repetirLlamado(id) {
  firebase.database().ref("pacientes/" + id).update({ repetir: true });
}

// 🔹 Exportar Excel
function exportarExcel() {
  const datos = datosPacientes.map(p => ({
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
    Entregado: p.entregado,
    Fecha: p.fechaModificacion
  }));

  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');
  XLSX.writeFile(workbook, 'Pacientes.xlsx');
}

// 🔹 Firma digital
const modalFirma = document.getElementById('modalFirma');
const canvas = document.getElementById('canvasFirma');
const ctx = canvas.getContext('2d');
let dibujando = false;

canvas.addEventListener('mousedown', e => { dibujando = true; ctx.moveTo(e.offsetX, e.offsetY); });
canvas.addEventListener('mousemove', e => { if (dibujando) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
canvas.addEventListener('mouseup', () => dibujando = false);
canvas.addEventListener('mouseleave', () => dibujando = false);

function abrirModal(pacienteId) {
  firmaActualPaciente = pacienteId;
  modalFirma.style.display = 'flex';
}

function limpiarFirma() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function guardarFirma() {
  const dataURL = canvas.toDataURL();
  db.ref('pacientes/' + firmaActualPaciente).update({ firma: dataURL });
  cerrarModal();
}

function cerrarModal() {
  modalFirma.style.display = 'none';
  limpiarFirma();
}

// 🔹 Graficos
let graficoEstados, graficoSedes, graficoEstudios;

function actualizarGraficos(pacientes) {
  const estados = { 'En espera': 0, 'En atención': 0, 'Programado': 0, 'Atendido': 0 };
  const sedes = {};
  const estudios = {};

  pacientes.forEach(p => {
    estados[p.estado] = (estados[p.estado] || 0) + 1;
    sedes[p.sede] = (sedes[p.sede] || 0) + 1;
    p.estudios.split(', ').forEach(est => {
      estudios[est] = (estudios[est] || 0) + 1;
    });
  });

  if (graficoEstados) graficoEstados.destroy();
  graficoEstados = new Chart(document.getElementById('graficoEstados'), {
    type: 'pie',
    data: { labels: Object.keys(estados), datasets: [{ data: Object.values(estados), backgroundColor: ['#ff9999', '#ffff99', '#99ccff', '#99ff99'] }] }
  });

  if (graficoSedes) graficoSedes.destroy();
  graficoSedes = new Chart(document.getElementById('graficoSedes'), {
    type: 'bar',
    data: { labels: Object.keys(sedes), datasets: [{ label: 'Cantidad por Sede', data: Object.values(sedes), backgroundColor: '#4CAF50' }] }
  });

  if (graficoEstudios) graficoEstudios.destroy();
  graficoEstudios = new Chart(document.getElementById('graficoEstudios'), {
    type: 'bar',
    data: { labels: Object.keys(estudios), datasets: [{ label: 'Cantidad por Estudio', data: Object.values(estudios), backgroundColor: '#2196F3' }] },
    options: { indexAxis: 'y' }
  });
}

// 🔹 Inicializar
filtroSede.addEventListener('input', aplicarFiltros);
filtroNombre.addEventListener('input', aplicarFiltros);
filtroEstudio.addEventListener('input', aplicarFiltros);
filtroFecha.addEventListener('input', aplicarFiltros);

cargarPacientes();
