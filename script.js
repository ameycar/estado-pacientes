// =================== 🔹 Import Firebase V9 ===================
import { initializeApp } from "[https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js](https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js)";
import {
getDatabase, ref, onValue, push, update, remove, set
} from "[https://www.gstatic.com/firebasejs/9.6.11/firebase-database.js](https://www.gstatic.com/firebasejs/9.6.11/firebase-database.js)";

// =================== 🔹 Configuración Firebase ===================
const firebaseConfig = {
apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
authDomain: "estado-pacientes.firebaseapp.com",
databaseURL: "[https://estado-pacientes-default-rtdb.firebaseio.com](https://estado-pacientes-default-rtdb.firebaseio.com)",
projectId: "estado-pacientes",
storageBucket: "estado-pacientes.appspot.com",
messagingSenderId: "515522648971",
appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =================== 🔹 Elementos DOM ===================
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
let firmaActualPaciente = null;

// =================== 🔹 Mostrar cantidad Eco pb ===================
estudiosSelect.addEventListener('change', () => {
const seleccionados = Array.from(estudiosSelect.selectedOptions).map(o => o.value);
cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
});

// =================== 🔹 Registrar paciente ===================
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
const fechaModificacion = new Date().toISOString().slice(0, 16);

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
cantidadEcoPbDiv.style.display = 'none';
});

// =================== 🔹 Cargar pacientes ===================
function cargarPacientes() {
onValue(ref(db, 'pacientes'), snapshot => {
const pacientes = [];
snapshot.forEach(childSnapshot => {
const paciente = childSnapshot.val();
paciente.key = childSnapshot.key;
pacientes.push(paciente);
});
datosPacientes = pacientes;
aplicarFiltros();
});
}

// =================== 🔹 Filtros ===================
function aplicarFiltros() {
let pacientes = datosPacientes.slice();

const sedeFiltro = (filtroSede.value || '').trim().toLowerCase();
const nombreFiltro = (filtroNombre.value || '').trim().toLowerCase();
const estudioFiltro = (filtroEstudio.value || '').trim().toLowerCase();
const fechaFiltro = filtroFecha.value;

if (sedeFiltro) pacientes = pacientes.filter(p => (p.sede || '').toLowerCase().includes(sedeFiltro));
if (nombreFiltro) pacientes = pacientes.filter(p => (p.nombres || '').toLowerCase().includes(nombreFiltro) || (p.apellidos || '').toLowerCase().includes(nombreFiltro));
if (estudioFiltro) pacientes = pacientes.filter(p => (p.estudios || '').toLowerCase().includes(estudioFiltro));
if (fechaFiltro) pacientes = pacientes.filter(p => (p.fechaModificacion || '').startsWith(fechaFiltro));

mostrarPacientes(pacientes);
}

// =================== 🔹 Mostrar pacientes ===================
function mostrarPacientes(pacientes) {
pacientes.sort((a, b) => {
const order = { 'En espera': 1, 'Programado': 2, 'En atención': 3, 'Atendido': 4, 'Entregado': 5 };
return (order[a.estado] || 0) - (order[b.estado] || 0);
});

tablaPacientes.innerHTML = '';
let enEspera = 0;

pacientes.forEach(p => {
const tr = document.createElement('tr');
tr.classList.add("fila-paciente");

```
// 🔹 Clases dinámicas según estado
if (p.estado === 'En espera') tr.classList.add("estado-espera");
else if (p.estado === 'En atención') tr.classList.add("estado-atencion");
else if (p.estado === 'Programado') tr.classList.add("estado-programado");
else if (p.estado === 'Atendido') tr.classList.add("estado-atendido");
else if (p.estado === 'Entregado') tr.classList.add("estado-entregado");

const requierePlacas = /TEM|RM|RX|Mamografia/i.test(p.estudios || '');

let firmaHTML = '';
if (p.firma) {
  firmaHTML = `<img src="${p.firma}" alt="Firma" style="max-width:100px; max-height:45px; display:block; margin:auto;">`;
} else if (p.estado === 'Entregado') {
  firmaHTML = `<button onclick="abrirModal('${p.key}')" title="Firmar">✍️</button>`;
}

const placasHTML = (requierePlacas && p.estado === 'Entregado')
  ? `<input type="number" min="0" value="${p.placas || ''}" onchange="guardarCampo('${p.key}','placas',this.value)" style="width:52px;"/>`
  : (p.placas ? `<div style="width:52px; text-align:center;">${p.placas}</div>` : '');

const cdHTML = (p.estado === 'Entregado')
  ? `<input type="checkbox" ${p.cd === 'SI' ? 'checked' : ''} onchange="guardarCampo('${p.key}','cd', this.checked ? 'SI' : 'NO')">`
  : `<div style="width:52px; text-align:center;">${p.cd === 'SI' ? 'SI' : ''}</div>`;

const informeHTML = (p.estado === 'Entregado')
  ? `<input type="checkbox" ${p.informe === 'SI' ? 'checked' : ''} onchange="guardarCampo('${p.key}','informe', this.checked ? 'SI' : 'NO')">`
  : `<div style="width:52px; text-align:center;">${p.informe === 'SI' ? 'SI' : ''}</div>`;

const estadoSelect = `
  <select onchange="cambiarEstado('${p.key}', this.value)" ${(p.estado === 'Entregado') ? 'disabled' : ''} >
    <option ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
    <option ${p.estado === 'En atención' ? 'selected' : ''}>En atención</option>
    <option ${p.estado === 'Programado' ? 'selected' : ''}>Programado</option>
    <option ${p.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
    <option ${p.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
  </select>
  <div style="font-size:10px;">${p.fechaModificacion || ''}</div>
`;

const accionEliminar = `<button onclick="confirmarEliminar('${p.key}')">🗑️</button>`;
const llamarOtraVez = (p.estado === 'En atención')
  ? `<button onclick="llamarOtraVez('${p.key}')">🔔 Llamar otra vez</button>` : '';

tr.innerHTML = `
  <td>${p.sede || ''}</td>
  <td>${p.apellidos || ''}</td>
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
  <td style="text-align:center;">${accionEliminar} ${llamarOtraVez}</td>
`;

tablaPacientes.appendChild(tr);
if (p.estado === 'En espera') enEspera++;
```

});

contador.textContent = `Pacientes en espera: ${enEspera}`;
}

// =================== 🔹 Guardar campo ===================
function guardarCampo(key, campo, valor) {
update(ref(db, 'pacientes/' + key), { [campo]: valor });
}

// =================== 🔹 Cambiar estado ===================
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

const fechaModificacion = new Date().toISOString().slice(0, 16);

if (nuevoEstado === 'En atención') {
set(ref(db, 'turnoActual'), {
nombre: actual.nombres + ' ' + actual.apellidos,
sede: actual.sede,
estudio: actual.estudios,
hora: new Date().toLocaleTimeString()
});
}

if (nuevoEstado === 'Entregado') {
const updates = { estado: nuevoEstado, fechaModificacion };
if (!actual.placas) updates.placas = actual.placas || '';
if (!actual.cd) updates.cd = actual.cd || 'NO';
if (!actual.informe) updates.informe = actual.informe || 'NO';
update(ref(db, 'pacientes/' + key), updates);
} else {
update(ref(db, 'pacientes/' + key), { estado: nuevoEstado, fechaModificacion });
}
}

// =================== 🔹 Llamar otra vez ===================
function llamarOtraVez(key) {
const actual = datosPacientes.find(x => x.key === key);
if (!actual) return;

set(ref(db, 'turnoActual'), {
nombre: actual.nombres + ' ' + actual.apellidos,
sede: actual.sede,
estudio: actual.estudios,
hora: new Date().toLocaleTimeString()
});
}

// =================== 🔹 Confirmar eliminar ===================
function confirmarEliminar(key) {
const pass = prompt('Ingrese contraseña de administrador:');
if (pass === '1234') {
remove(ref(db, 'pacientes/' + key));
} else {
alert('Contraseña incorrecta. No se eliminó.');
}
}

// =================== 🔹 Firma digital ===================
const modalFirma = document.getElementById('modalFirma');
const canvas = document.getElementById('canvasFirma');
const ctx = canvas.getContext('2d');
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.strokeStyle = '#000';
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

function abrirModal(key) {
firmaActualPaciente = key;
limpiarFirma();
modalFirma.style.display = 'flex';
}
function cerrarModal() {
modalFirma.style.display = 'none';
firmaActualPaciente = null;
}
function limpiarFirma() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function guardarFirma() {
if (!firmaActualPaciente) return;
const dataURL = canvas.toDataURL('image/png');
update(ref(db, 'pacientes/' + firmaActualPaciente), { firma: dataURL });
cerrarModal();
}

// =================== 🔹 Inicialización ===================
[filtroSede, filtroNombre, filtroEstudio, filtroFecha].forEach(i => i && i.addEventListener('input', aplicarFiltros));
cargarPacientes();
