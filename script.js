// Configuración Firebase (mantener la tuya tal cual)
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

/* --------------------
   Helpers para fechas
   -------------------- */
// Devuelve 'YYYY-MM-DD' o '' si no se puede inferir
function inferISODate(str) {
  if (!str) return '';
  // si ya viene en formato ISO date (YYYY-MM-DD)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // intento directo con Date
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0,10);

  // buscar dd/mm/yyyy o dd-mm-yyyy (asumo formato día/mes/año por localización)
  const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let day = parseInt(m[1], 10);
    let month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const dt = new Date(year, month - 1, day);
    if (!isNaN(dt)) return dt.toISOString().slice(0,10);
  }

  // si no pudimos, devolver vacío
  return '';
}

/* --------------------
   Firma digital (canvas ya en index.html)
   -------------------- */
let pacienteActualFirma = null;
const canvas = document.getElementById("canvasFirma");
let ctx = null;
let dibujando = false;
if (canvas) {
  ctx = canvas.getContext("2d");
  // mouse
  canvas.addEventListener("mousedown", e => { dibujando = true; iniciarDibujar(e); });
  canvas.addEventListener("mousemove", moverDibujar);
  canvas.addEventListener("mouseup", () => dibujando = false);
  canvas.addEventListener("mouseout", () => dibujando = false);
  // touch
  canvas.addEventListener("touchstart", e => { dibujando = true; iniciarDibujar(e.touches[0]); });
  canvas.addEventListener("touchmove", e => { moverDibujar(e.touches[0]); e.preventDefault(); });
  canvas.addEventListener("touchend", () => dibujando = false);
}
function iniciarDibujar(e) {
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "black";
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}
function moverDibujar(e) {
  if (!dibujando || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}
function limpiarFirma() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function abrirModal(key) {
  pacienteActualFirma = key;
  limpiarFirma();
  const modal = document.getElementById("modalFirma");
  if (modal) modal.style.display = "flex";
}
function cerrarModal() {
  const modal = document.getElementById("modalFirma");
  if (modal) modal.style.display = "none";
  pacienteActualFirma = null;
}
function guardarFirma() {
  if (!pacienteActualFirma || !canvas) return;
  const dataUrl = canvas.toDataURL("image/png");
  const fecha_entrega_iso = new Date().toISOString().slice(0,10);
  const fecha_entrega = new Date().toLocaleString();
  db.ref("pacientes/" + pacienteActualFirma).update({
    firma: dataUrl,
    entregado: "Sí",
    fecha_entrega,
    fecha_entrega_iso
  }).then(() => {
    cerrarModal();
  }).catch(err => {
    console.error("Error guardando firma:", err);
    alert("Error guardando la firma. Revisa la consola.");
  });
}

/* --------------------
   Lógica de formulario
   -------------------- */
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
  const precio = (document.getElementById('precio') && document.getElementById('precio').value.trim()) || "";
  const pf = (document.getElementById('pf') && document.getElementById('pf').value.trim()) || "";
  const estado = 'En espera';
  const fechaModificacion = new Date().toLocaleString();
  const fechaModificacionISO = new Date().toISOString().slice(0,10);
  const created_at_iso = fechaModificacionISO;

  if (estudios.includes('Eco pb')) {
    const ecoCantidad = parseInt(ecoPbCantidad.value) || 0;
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
    placas: "",
    cd: "",
    informe: "",
    entregado: "No",
    firma: "",
    fechaModificacion,
    fechaModificacionISO,
    created_at_iso
  };

  db.ref('pacientes').push(nuevoPaciente);
  formulario.reset();
  cantidadEcoPbDiv.style.display = 'none';
});

/* --------------------
   Cargar + backfill ISO para registros viejos
   -------------------- */
function cargarPacientes() {
  db.ref('pacientes').on('value', snapshot => {
    let pacientes = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val() || {};
      paciente.key = childSnapshot.key;

      // backfill fechaModificacionISO si falta
      if (!paciente.fechaModificacionISO) {
        const iso = inferISODate(paciente.fechaModificacion) || inferISODate(paciente.created_at) || '';
        if (iso) {
          // actualizar en la base (no obligatorio, pero útil)
          db.ref('pacientes/' + paciente.key).update({ fechaModificacionISO: iso }).catch(()=>{});
          paciente.fechaModificacionISO = iso;
        } else {
          paciente.fechaModificacionISO = '';
        }
      }
      // backfill fecha_entrega_iso si existe fecha_entrega pero no la ISO
      if (!paciente.fecha_entrega_iso && paciente.fecha_entrega) {
        const iso2 = inferISODate(paciente.fecha_entrega) || '';
        if (iso2) {
          db.ref('pacientes/' + paciente.key).update({ fecha_entrega_iso: iso2 }).catch(()=>{});
          paciente.fecha_entrega_iso = iso2;
        } else {
          paciente.fecha_entrega_iso = '';
        }
      }

      pacientes.push(paciente);
    });
    datosPacientes = pacientes;
    aplicarFiltros();
  });
}

/* --------------------
   Filtrado (ahora fecha compara ISO)
   -------------------- */
function aplicarFiltros() {
  let pacientes = datosPacientes;

  const sedeFiltro = filtroSede.value.trim().toLowerCase();
  const nombreFiltro = filtroNombre.value.trim().toLowerCase();
  const estudioFiltro = filtroEstudio.value.trim().toLowerCase();
  const fechaFiltro = filtroFecha.value; // viene 'YYYY-MM-DD' desde <input type="date">

  if (sedeFiltro) {
    pacientes = pacientes.filter(p => (p.sede || '').toLowerCase().includes(sedeFiltro));
  }
  if (nombreFiltro) {
    pacientes = pacientes.filter(p => ((p.nombres || '').toLowerCase().includes(nombreFiltro) || (p.apellidos || '').toLowerCase().includes(nombreFiltro)));
  }
  if (estudioFiltro) {
    pacientes = pacientes.filter(p => (p.estudios || '').toLowerCase().includes(estudioFiltro));
  }
  if (fechaFiltro) {
    pacientes = pacientes.filter(p => {
      const modIso = p.fechaModificacionISO || inferISODate(p.fechaModificacion) || '';
      const entIso = p.fecha_entrega_iso || inferISODate(p.fecha_entrega) || '';
      return modIso === fechaFiltro || entIso === fechaFiltro;
    });
  }

  mostrarPacientes(pacientes);
  actualizarGraficos(pacientes);
}

/* --------------------
   Mostrar tabla (se respetó estructura y colores)
   -------------------- */
function mostrarPacientes(pacientes) {
  pacientes.sort((a, b) => {
    const estados = { 'En espera': 1, 'En atención': 2, 'Programado': 3, 'Atendido': 4 };
    return (estados[a.estado] || 99) - (estados[b.estado] || 99);
  });

  let enEspera = 0;
  tablaPacientes.innerHTML = '';

  pacientes.forEach(p => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${p.sede || ''}</td>
      <td>${p.apellidos || ''}</td>
      <td>${p.nombres || ''}</td>
      <td>${p.estudios || ''}</td>
      <td>${p.cant || ''}</td>
      <td>${p.precio || ""}</td>
      <td>${p.pf || ""}</td>
      <td>
        <select onchange="cambiarEstado('${p.key}', this.value)">
          <option ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
          <option ${p.estado === 'En atención' ? 'selected' : ''}>En atención</option>
          <option ${p.estado === 'Programado' ? 'selected' : ''}>Programado</option>
          <option ${p.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        </select>
        <div style="font-size:10px;">${p.fechaModificacion || ''}</div>
      </td>
      <td>${p.placas || ""}</td>
      <td>${p.cd || ""}</td>
      <td>${p.informe || ""}</td>
      <td>${p.entregado || "No"}</td>
      <td>
        ${p.firma ? `<img src="${p.firma}" alt="Firma" width="100"/>` : `<button onclick="abrirModal('${p.key}')">Firmar</button>`}
      </td>
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

/* --------------------
   Cambiar estado (ahora también actualiza ISO)
   -------------------- */
function cambiarEstado(key, nuevoEstado) {
  const fechaModificacion = new Date().toLocaleString();
  const fechaModificacionISO = new Date().toISOString().slice(0,10);
  db.ref('pacientes/' + key).update({ estado: nuevoEstado, fechaModificacion, fechaModificacionISO });
}

/* --------------------
   Eliminar / repetir llamado
   -------------------- */
function eliminarPaciente(key) {
  db.ref('pacientes/' + key).remove();
}
filtroSede.addEventListener('input', aplicarFiltros);
filtroNombre.addEventListener('input', aplicarFiltros);
filtroEstudio.addEventListener('input', aplicarFiltros);
filtroFecha.addEventListener('input', aplicarFiltros);

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
    Fecha: p.fechaModificacion,
    Fecha_Entrega_ISO: p.fecha_entrega_iso || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');

  XLSX.writeFile(workbook, 'Pacientes.xlsx');
}

function repetirLlamado(id) {
  firebase.database().ref("pacientes/" + id).update({
    repetir: true
  });
}

/* --------------------
   Gráficos
   -------------------- */
let graficoEstados, graficoSedes, graficoEstudios;
function actualizarGraficos(pacientes) {
  const estados = { 'En espera': 0, 'En atención': 0, 'Programado': 0, 'Atendido': 0 };
  const sedes = {};
  const estudios = {};

  pacientes.forEach(p => {
    estados[p.estado] = (estados[p.estado] || 0) + 1;
    sedes[p.sede] = (sedes[p.sede] || 0) + 1;
    (p.estudios || '').split(', ').forEach(est => {
      if (!est) return;
      estudios[est] = (estudios[est] || 0) + 1;
    });
  });

  const ctxEstados = document.getElementById('graficoEstados').getContext('2d');
  if (graficoEstados) graficoEstados.destroy();
  graficoEstados = new Chart(ctxEstados, {
    type: 'pie',
    data: {
      labels: Object.keys(estados),
      datasets: [{ data: Object.values(estados), backgroundColor: ['#ff9999', '#ffff99', '#99ccff', '#99ff99'] }]
    },
    options: { responsive: false }
  });

  const ctxSedes = document.getElementById('graficoSedes').getContext('2d');
  if (graficoSedes) graficoSedes.destroy();
  graficoSedes = new Chart(ctxSedes, {
    type: 'bar',
    data: {
      labels: Object.keys(sedes),
      datasets: [{ label: 'Cantidad por Sede', data: Object.values(sedes), backgroundColor: '#4CAF50' }]
    },
    options: { responsive: false }
  });

  const ctxEstudios = document.getElementById('graficoEstudios').getContext('2d');
  if (graficoEstudios) graficoEstudios.destroy();
  graficoEstudios = new Chart(ctxEstudios, {
    type: 'bar',
    data: {
      labels: Object.keys(estudios),
      datasets: [{ label: 'Cantidad por Estudio', data: Object.values(estudios), backgroundColor: '#2196F3' }]
    },
    options: { responsive: false, indexAxis: 'y' }
  });
}

/* --------------------
   Inicializar carga
   -------------------- */
cargarPacientes();
