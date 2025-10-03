// script.js  (module - Firebase v9)
import { db } from "./firebase-config.js";
import {
  ref, onValue, push, update, remove, set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ---------- constantes y DOM ----------
const ADMIN_PASS = '1234';

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
let pendingSelectForEntrega = null;

// ---------- Mostrar cantidad Eco pb ----------
if (estudiosSelect) {
  estudiosSelect.addEventListener('change', () => {
    const seleccionados = Array.from(estudiosSelect.selectedOptions).map(o => o.value);
    cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
  });
}

// ---------- Registrar paciente ----------
if (formulario) {
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
}

// ---------- Cargar pacientes (real-time) ----------
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

// ---------- Filtros ----------
function aplicarFiltros() {
  let pacientes = (datosPacientes || []).slice();

  const sedeFiltro = (filtroSede && filtroSede.value || '').trim().toLowerCase();
  const nombreFiltro = (filtroNombre && filtroNombre.value || '').trim().toLowerCase();
  const estudioFiltro = (filtroEstudio && filtroEstudio.value || '').trim().toLowerCase();
  const fechaFiltro = (filtroFecha && filtroFecha.value) || '';

  if (sedeFiltro) pacientes = pacientes.filter(p => (p.sede || '').toLowerCase().includes(sedeFiltro));
  if (nombreFiltro) pacientes = pacientes.filter(p => (p.nombres || '').toLowerCase().includes(nombreFiltro) || (p.apellidos || '').toLowerCase().includes(nombreFiltro));
  if (estudioFiltro) pacientes = pacientes.filter(p => (p.estudios || '').toLowerCase().includes(estudioFiltro));
  if (fechaFiltro) pacientes = pacientes.filter(p => (p.fechaModificacion || '').startsWith(fechaFiltro));

  mostrarPacientes(pacientes);
}

// ---------- Mostrar pacientes ----------
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

    if (p.estado === 'En espera') tr.classList.add("estado-espera");
    else if (p.estado === 'En atención') tr.classList.add("estado-atencion");
    else if (p.estado === 'Programado') tr.classList.add("estado-programado");
    else if (p.estado === 'Atendido') tr.classList.add("estado-atendido");
    else if (p.estado === 'Entregado') tr.classList.add("estado-entregado");

    const requierePlacas = /TEM|RM|RX|Mamografia/i.test(p.estudios || '');

    // firma: mostrar imagen si existe
    let firmaHTML = '';
    if (p.firma) {
      firmaHTML = `<img src="${p.firma}" alt="Firma" class="firma-img">`;
    } else if (p.estado === 'Entregado') {
      // caso raro: entregado sin firma -> permitir firmar
      firmaHTML = `<button onclick="abrirModal('${p.key}')" title="Firmar">✍️</button>`;
    }

    // Placas: si requiere y está Entregado -> input readonly (edición con clave)
    const placasHTML = (requierePlacas && p.estado === 'Entregado')
      ? `<input type="number" min="0" value="${p.placas || ''}" onclick="editarConClave(event,'${p.key}','placas', this)" readonly style="width:60px; text-align:center;"/>`
      : (p.placas ? `<div style="width:60px; text-align:center;">${p.placas}</div>` : '');

    // CD / Informe: muestro checkbox que requiere clave para cambiar después de entregado
    const cdChecked = p.cd === 'SI' ? 'checked' : '';
    const cdHTML = (p.estado === 'Entregado')
      ? `<input type="checkbox" ${cdChecked} onclick="editarConClaveCheckbox(event,'${p.key}','cd', this)">`
      : `<div style="width:60px; text-align:center;">${p.cd === 'SI' ? 'SI' : ''}</div>`;

    const informeHTML = (p.estado === 'Entregado')
      ? `<input type="checkbox" ${p.informe === 'SI' ? 'checked' : ''} onclick="editarConClaveCheckbox(event,'${p.key}','informe', this)">`
      : `<div style="width:60px; text-align:center;">${p.informe === 'SI' ? 'SI' : ''}</div>`;

    // estado (select) - se bloquea si ya está ENTREGADO
    const estadoSelect = `
      <select onchange="cambiarEstado('${p.key}', this.value)" ${ (p.estado === 'Entregado') ? 'disabled' : '' } >
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
  });

  contador.textContent = `Pacientes en espera: ${enEspera}`;
}

// ---------- editar con clave (placas) ----------
function editarConClave(evt, key, campo, inputEl) {
  // evita que el input cambie sin autorización
  evt.preventDefault();
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  if (pass === ADMIN_PASS) {
    inputEl.removeAttribute('readonly');
    inputEl.focus();
    const blurHandler = () => {
      const nuevoValor = inputEl.value;
      update(ref(db, 'pacientes/' + key), { [campo]: nuevoValor });
      inputEl.setAttribute('readonly', 'true');
      inputEl.removeEventListener('blur', blurHandler);
    };
    inputEl.addEventListener('blur', blurHandler);
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
  }
}

// ---------- editar checkbox con clave (CD/Informe) ----------
function editarConClaveCheckbox(evt, key, campo, checkboxEl) {
  // evitar toggle visual hasta confirmar
  evt.preventDefault();
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  if (pass === ADMIN_PASS) {
    const nuevoVal = (!checkboxEl.checked) ? 'SI' : 'NO'; // como evt.preventDefault impidió toggle, invertimos
    // set real checked state then update DB
    checkboxEl.checked = (nuevoVal === 'SI');
    update(ref(db, 'pacientes/' + key), { [campo]: nuevoVal });
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
    // mantener el valor real del registro
    checkboxEl.checked = (pacienteActual[campo] === 'SI');
  }
}

// ---------- Guardar campo general ----------
function guardarCampo(key, campo, valor) {
  update(ref(db, 'pacientes/' + key), { [campo]: valor });
}

// ---------- Cambiar estado (respeta reglas y abre modal si Entregado) ----------
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
    // sincronizar turno para TV / pantalla
    set(ref(db, 'turnoActual'), {
      nombre: actual.nombres + ' ' + actual.apellidos,
      sede: actual.sede,
      estudio: actual.estudios,
      hora: new Date().toLocaleTimeString()
    });
  }

  if (nuevoEstado === 'Entregado') {
    // abrir modal para pedir placas/cd/informe/firma
    pendingSelectForEntrega = { key, prev: actual.estado };
    abrirModalParaEntrega(key);
    return;
  }

  update(ref(db, 'pacientes/' + key), { estado: nuevoEstado, fechaModificacion });
}

// ---------- Llamar otra vez ----------
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

// ---------- Confirmar eliminar ----------
function confirmarEliminar(key) {
  const pass = prompt('Ingrese contraseña de administrador:');
  if (pass === ADMIN_PASS) {
    remove(ref(db, 'pacientes/' + key));
  } else {
    alert('Contraseña incorrecta. No se eliminó.');
  }
}

// ---------- Modal de entrega (obligatorio) ----------
const modalFirma = document.getElementById('modalFirma');
const canvas = document.getElementById('canvasFirma');
const ctx = canvas ? canvas.getContext('2d') : null;

// redimensiona canvas para pantallas retina y móviles
function resizeCanvasForDisplay() {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000';
}

function abrirModalParaEntrega(key) {
  firmaActualPaciente = key;
  const paciente = datosPacientes.find(x => x.key === key) || {};
  const placasInput = document.getElementById('modal_placas');
  const cdSelect = document.getElementById('modal_cd');
  const informeSelect = document.getElementById('modal_informe');

  if (!placasInput || !cdSelect || !informeSelect || !modalFirma || !canvas) {
    alert('Faltan elementos del modal en index.html. Revisa modal_placas/modal_cd/modal_informe/canvasFirma.');
    // revertir select si hay pendiente
    if (pendingSelectForEntrega) {
      update(ref(db, 'pacientes/' + key), { estado: paciente.estado || 'En espera' });
      pendingSelectForEntrega = null;
    }
    return;
  }

  placasInput.value = paciente.placas || '';
  cdSelect.value = paciente.cd || '';
  informeSelect.value = paciente.informe || '';

  // preparar canvas (resizing)
  modalFirma.style.display = 'flex';
  modalFirma.setAttribute('aria-hidden', 'false');
  // allow layout to compute
  setTimeout(() => {
    resizeCanvasForDisplay();
    limpiarFirma();
  }, 50);
}

// ---------- canvas helpers ----------
function isCanvasBlank(c) {
  try {
    const blank = document.createElement('canvas');
    blank.width = c.width;
    blank.height = c.height;
    return c.toDataURL() === blank.toDataURL();
  } catch (e) {
    return true;
  }
}

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

// Eventos para dibujo (mouse + touch)
if (canvas && ctx) {
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
}

// ---------- Guardar entrega desde modal ----------
function guardarEntregaDesdeModal() {
  if (!firmaActualPaciente) return alert('Paciente no seleccionado.');

  const placasInput = document.getElementById('modal_placas');
  const cdSelect = document.getElementById('modal_cd');
  const informeSelect = document.getElementById('modal_informe');

  const paciente = datosPacientes.find(x => x.key === firmaActualPaciente) || {};
  const requierePlacas = /TEM|RM|RX|Mamografia/i.test(paciente.estudios || '');

  const placasVal = placasInput ? placasInput.value.trim() : '';
  const cdVal = cdSelect ? cdSelect.value : '';
  const informeVal = informeSelect ? informeSelect.value : '';

  if (requierePlacas && (placasVal === '' || isNaN(Number(placasVal)))) {
    alert('Debe indicar el número de placas (obligatorio para este estudio).');
    return;
  }
  if (!cdVal) { alert('Debe seleccionar CD (SI/NO).'); return; }
  if (!informeVal) { alert('Debe seleccionar Informe (SI/NO).'); return; }

  if (!ctx || isCanvasBlank(canvas)) {
    alert('Debe firmar antes de guardar la entrega.');
    return;
  }

  const dataURL = canvas.toDataURL('image/png');
  const fechaModificacion = new Date().toISOString().slice(0, 16);

  update(ref(db, 'pacientes/' + firmaActualPaciente), {
    estado: 'Entregado',
    placas: placasVal || '',
    cd: cdVal,
    informe: informeVal,
    firma: dataURL,
    fechaModificacion
  });

  // si algún select quedó pendiente, actualizamos el valor visible
  pendingSelectForEntrega = null;
  cerrarModal();
}

// ---------- Modal util ----------
function abrirModal(key) {
  firmaActualPaciente = key;
  resizeCanvasForDisplay();
  limpiarFirma();
  if (modalFirma) {
    modalFirma.style.display = 'flex';
    modalFirma.setAttribute('aria-hidden', 'false');
  }
}
function limpiarFirma() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function cerrarModal() {
  if (modalFirma) {
    modalFirma.style.display = 'none';
    modalFirma.setAttribute('aria-hidden', 'true');
  }
  // si había un select pendiente para Entregado, revertimos su valor visible
  if (pendingSelectForEntrega) {
    const actual = datosPacientes.find(x => x.key === pendingSelectForEntrega.key);
    if (actual) {
      // restaurar estado en la UI (aplicarFiltros recarga)
      aplicarFiltros();
    }
    pendingSelectForEntrega = null;
  }
  firmaActualPaciente = null;
}

// ---------- Guardar firma suelta (compat) ----------
function guardarFirma() {
  if (!firmaActualPaciente) return;
  if (!ctx || isCanvasBlank(canvas)) { alert('Firma vacía.'); return; }
  const dataURL = canvas.toDataURL('image/png');
  update(ref(db, 'pacientes/' + firmaActualPaciente), { firma: dataURL });
  cerrarModal();
}

// ---------- Exportar Excel ----------
function exportarExcel() {
  const datos = (datosPacientes || []).map(p => ({
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
    Entregado: p.estado === 'Entregado' ? 'Sí' : 'No',
    Fecha: p.fechaModificacion
  }));
  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');
  XLSX.writeFile(workbook, 'Pacientes.xlsx');
}

// ---------- Listeners modal buttons ----------
const btnSaveEntrega = document.getElementById('modal_save_entrega');
const btnCancelEntrega = document.getElementById('modal_cancel_entrega');
const btnClearFirma = document.getElementById('modal_limpiar_firma');

if (btnSaveEntrega) btnSaveEntrega.addEventListener('click', guardarEntregaDesdeModal);
if (btnCancelEntrega) btnCancelEntrega.addEventListener('click', () => { cerrarModal(); });
if (btnClearFirma) btnClearFirma.addEventListener('click', limpiarFirma);

// ---------- Listeners filtros ----------
[filtroSede, filtroNombre, filtroEstudio, filtroFecha].forEach(i => i && i.addEventListener('input', aplicarFiltros));

// ---------- Exponer funciones para handlers inline ----------
window.cambiarEstado = cambiarEstado;
window.abrirModal = abrirModal;
window.confirmarEliminar = confirmarEliminar;
window.llamarOtraVez = llamarOtraVez;
window.editarConClave = editarConClave;
window.editarConClaveCheckbox = editarConClaveCheckbox;
window.guardarFirma = guardarFirma;
window.limpiarFirma = limpiarFirma;
window.guardarEntregaDesdeModal = guardarEntregaDesdeModal;
window.exportarExcel = exportarExcel;

// ---------- Iniciar ----------
cargarPacientes();
