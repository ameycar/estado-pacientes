<script>
// =================== 🔹 Configuración Firebase ===================
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

// =================== 🔹 Variables ===================
let datosPacientes = [];
let firmaActualPaciente = null;

// =================== 🔹 Cargar pacientes ===================
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

// =================== 🔹 Mostrar pacientes ===================
function mostrarPacientes(pacientes) {
  pacientes.sort((a, b) => {
    const estados = { 'En espera': 1, 'Programado': 2, 'En atención': 3, 'Atendido': 4, 'Entregado': 5 };
    return estados[a.estado] - estados[b.estado];
  });

  const tabla = document.getElementById('tabla-pacientes');
  tabla.innerHTML = '';
  let enEspera = 0;

  pacientes.forEach(p => {
    const tr = document.createElement('tr');
    const requierePlacas = /rx|tem|rm|mamografia/i.test(p.estudios);

    let opcionesEstado = '';
    if (p.estado === 'En espera') {
      opcionesEstado = `
        <option ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
        <option>En atención</option>
        <option>Programado</option>
        <option>Atendido</option>`;
    } else if (p.estado === 'En atención') {
      opcionesEstado = `
        <option>En espera</option>
        <option selected>En atención</option>
        <option>Programado</option>
        <option>Atendido</option>`;
    } else if (p.estado === 'Programado') {
      opcionesEstado = `
        <option>En espera</option>
        <option>En atención</option>
        <option selected>Programado</option>
        <option>Atendido</option>`;
    } else if (p.estado === 'Atendido') {
      opcionesEstado = `
        <option selected>Atendido</option>
        <option>Entregado</option>`;
    } else if (p.estado === 'Entregado') {
      opcionesEstado = `<option selected>Entregado</option>`;
    }

    tr.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${p.estudios}</td>
      <td style="width:40px; text-align:center;">${p.cant}</td>
      <td>
        <select onchange="cambiarEstado('${p.key}', this.value)">
          ${opcionesEstado}
        </select>
        <div style="font-size:10px;">${p.fechaModificacion || ''}</div>
      </td>
      <td style="width:50px; text-align:center;">
        ${requierePlacas && p.estado === 'Entregado' ? `
          <input type="number" min="0" value="${p.placas || ''}" 
            onchange="guardarCampo('${p.key}','placas',this.value)" style="width:45px;">` : ''}
      </td>
      <td style="width:50px; text-align:center;">
        ${p.estado === 'Entregado' ? `
          <input type="checkbox" ${p.cd === 'SI' ? 'checked' : ''} 
            onchange="guardarCampo('${p.key}','cd',this.checked ? 'SI' : 'NO')">` : ''}
      </td>
      <td style="width:50px; text-align:center;">
        ${p.estado === 'Entregado' ? `
          <input type="checkbox" ${p.informe === 'SI' ? 'checked' : ''} 
            onchange="guardarCampo('${p.key}','informe',this.checked ? 'SI' : 'NO')">` : ''}
      </td>
      <td style="width:80px; text-align:center;">
        ${p.estado === 'Entregado' ? `<button onclick="abrirModal('${p.key}')">✍️</button>` : ''}
        ${p.firma ? `<img src="${p.firma}" style="max-width:60px; max-height:40px; display:block;">` : ''}
      </td>
      <td>
        ${p.estado !== 'Entregado' ? `<button onclick="eliminarPaciente('${p.key}')">🗑️</button>` : ''}
      </td>
    `;

    tr.style.backgroundColor =
      p.estado === 'En espera' ? '#ffe5e5' :
      p.estado === 'En atención' ? '#fff5cc' :
      p.estado === 'Programado' ? '#cce5ff' :
      p.estado === 'Atendido' ? '#d5f5d5' : '#e0e0e0';

    tabla.appendChild(tr);
    if (p.estado === 'En espera') enEspera++;
  });

  document.getElementById('contador').textContent = `Pacientes en espera: ${enEspera}`;
}

// =================== 🔹 Guardar campos ===================
function guardarCampo(key, campo, valor) {
  db.ref('pacientes/' + key).update({ [campo]: valor });
}

// =================== 🔹 Cambiar estado ===================
function cambiarEstado(key, nuevoEstado) {
  const fechaModificacion = new Date().toISOString().slice(0, 16);
  db.ref('pacientes/' + key).update({ estado: nuevoEstado, fechaModificacion });
}

// =================== 🔹 Eliminar con contraseña ===================
function eliminarPaciente(key) {
  const pass = prompt("Ingrese contraseña de administrador:");
  if (pass === "1234") {
    db.ref('pacientes/' + key).remove();
  } else {
    alert("Contraseña incorrecta. No se eliminó el paciente.");
  }
}

// =================== 🔹 Firma digital ===================
const modalFirma = document.getElementById('modalFirma');
const canvas = document.getElementById('canvasFirma');
const ctx = canvas.getContext('2d');
let dibujando = false;

function getPosicion(evt) {
  let rect = canvas.getBoundingClientRect();
  if (evt.touches) {
    return { x: evt.touches[0].clientX - rect.left, y: evt.touches[0].clientY - rect.top };
  } else {
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }
}
canvas.addEventListener("mousedown", e => { dibujando = true; let pos = getPosicion(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); });
canvas.addEventListener("mousemove", e => { if (!dibujando) return; let pos = getPosicion(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); });
canvas.addEventListener("mouseup", () => dibujando = false);
canvas.addEventListener("touchstart", e => { e.preventDefault(); dibujando = true; let pos = getPosicion(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); });
canvas.addEventListener("touchmove", e => { e.preventDefault(); if (!dibujando) return; let pos = getPosicion(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); });
canvas.addEventListener("touchend", () => dibujando = false);

function abrirModal(id) { firmaActualPaciente = id; modalFirma.style.display = 'flex'; limpiarFirma(); }
function cerrarModal() { modalFirma.style.display = 'none'; firmaActualPaciente = null; }
function limpiarFirma() { ctx.clearRect(0, 0, canvas.width, canvas.height); }
function guardarFirma() {
  if (!firmaActualPaciente) return;
  const dataURL = canvas.toDataURL();
  db.ref('pacientes/' + firmaActualPaciente).update({ firma: dataURL });
  cerrarModal();
}

// =================== 🔹 Inicializar ===================
cargarPacientes();
</script>
