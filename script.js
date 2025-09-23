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

let datosPacientes = [];               // lista local de pacientes (sync con firebase)
let firmaActualPaciente = null;        // key del paciente que está firmando
let pendingSelectForEntrega = null;    // select DOM que provocó la transición a Entregado (para revert si cancelan)
const ADMIN_PASS = '1234';

// =================== 🔹 Mostrar cantidad Eco pb ===================
if (estudiosSelect) {
  estudiosSelect.addEventListener('change', () => {
    const seleccionados = Array.from(estudiosSelect.selectedOptions).map(o => o.value);
    cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
  });
}

// =================== 🔹 Registrar paciente ===================
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

    db.ref('pacientes').push(nuevoPaciente);
    formulario.reset();
    cantidadEcoPbDiv.style.display = 'none';
  });
}

// =================== 🔹 Cargar pacientes ===================
function cargarPacientes() {
  db.ref('pacientes').on('value', snapshot => {
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

    // identificar si el/los estudios requieren placas/CD
    const requierePlacas = /TEM|RM|RX|Mamografia/i.test(p.estudios || '');

    // firma: mostrar imagen si existe
    let firmaHTML = '';
    if (p.firma) {
      firmaHTML = `<img src="${p.firma}" alt="Firma" style="max-width:100px; max-height:45px; display:block; margin:auto;">`;
    } else if (p.estado === 'Entregado') {
      // si está entregado pero sin firma (caso raro) permitimos firmar
      firmaHTML = `<button onclick="abrirModal('${p.key}')" title="Firmar">✍️</button>`;
    }

    // Placas / CD / Informe:
    let placasHTML = '';
    if (requierePlacas) {
      if (p.estado === 'Entregado') {
        placasHTML = `<input type="number" min="0" value="${p.placas || ''}" onclick="editarConClave('${p.key}','placas', this)" readonly style="width:52px; text-align:center;"/>`;
      } else {
        placasHTML = p.placas ? `<div style="width:52px; text-align:center;">${p.placas}</div>` : '';
      }
    } else {
      placasHTML = p.placas ? `<div style="width:52px; text-align:center;">${p.placas}</div>` : '';
    }

    let cdHTML = '';
    if (p.state === undefined || p.state === null) { /* ignore */ }
    if (p.estado === 'Entregado') {
      const checked = (p.cd === 'SI') ? 'checked' : '';
      cdHTML = `<input type="checkbox" ${checked} onchange="editarConClaveCheckbox('${p.key}','cd', this)">`;
    } else {
      cdHTML = p.cd === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;"></div>`;
    }

    let informeHTML = '';
    if (p.estado === 'Entregado') {
      // Informe no editable after entregue (per requirement) -> show text
      informeHTML = p.informe === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;">NO</div>`;
    } else {
      informeHTML = p.informe === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;"></div>`;
    }

    // Estados: select
    const estadoSelect = `
      <select data-key="${p.key}" onchange="cambiarEstado(this)" ${ (p.estado === 'Entregado') ? 'disabled' : '' } >
        <option value="En espera" ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
        <option value="En atención" ${p.estado === 'En atención' ? 'selected' : ''}>En atención</option>
        <option value="Programado" ${p.estado === 'Programado' ? 'selected' : ''}>Programado</option>
        <option value="Atendido" ${p.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        <option value="Entregado" ${p.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
      </select>
      <div style="font-size:10px;">${p.fechaModificacion || ''}</div>
    `;

    // Acción eliminar
    const accionEliminar = `<button onclick="confirmarEliminar('${p.key}')">🗑️</button>`;

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
      <td style="text-align:center;">${accionEliminar}</td>
    `;

    tr.style.backgroundColor =
      p.estado === 'En espera' ? '#ffe5e5' :
      p.estado === 'En atención' ? '#fff5cc' :
      p.estado === 'Programado' ? '#cce5ff' :
      p.estado === 'Atendido' ? '#d5f5d5' :
      p.estado === 'Entregado' ? '#e6f7ff' : '#fff';

    tablaPacientes.appendChild(tr);
    if (p.estado === 'En espera') enEspera++;
  });

  contador.textContent = `Pacientes en espera: ${enEspera}`;
}

// =================== 🔹 Editar con clave (placas) ===================
function editarConClave(key, campo, inputEl) {
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  if (pass === ADMIN_PASS) {
    inputEl.removeAttribute('readonly');
    inputEl.focus();
    const blurHandler = () => {
      const nuevoValor = inputEl.value;
      db.ref('pacientes/' + key).update({ [campo]: nuevoValor });
      inputEl.setAttribute('readonly', 'true');
      inputEl.removeEventListener('blur', blurHandler);
    };
    inputEl.addEventListener('blur', blurHandler);
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
    inputEl.value = pacienteActual[campo] || '';
  }
}

// =================== 🔹 Editar checkbox con clave (CD) ===================
function editarConClaveCheckbox(key, campo, checkboxEl) {
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  if (pass === ADMIN_PASS) {
    const valor = checkboxEl.checked ? 'SI' : 'NO';
    db.ref('pacientes/' + key).update({ [campo]: valor });
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
    checkboxEl.checked = (pacienteActual[campo] === 'SI');
  }
}

// =================== 🔹 Guardar campo (uso general) ===================
function guardarCampo(key, campo, valor) {
  db.ref('pacientes/' + key).update({ [campo]: valor });
}

// =================== 🔹 Cambiar estado (recibe select DOM) ===================
function cambiarEstado(selectElem) {
  const key = selectElem.getAttribute('data-key');
  const nuevoEstado = selectElem.value;
  const actual = datosPacientes.find(x => x.key === key);
  if (!actual) return;

  if (actual.estado === 'Entregado') {
    alert('No se puede modificar: ya está ENTREGADO.');
    selectElem.value = actual.estado;
    return;
  }
  if (actual.estado === 'Atendido' && nuevoEstado !== 'Entregado') {
    alert('Una vez ATENDIDO solo puede avanzar a ENTREGADO.');
    selectElem.value = actual.estado;
    return;
  }

  if (nuevoEstado === 'Entregado') {
    pendingSelectForEntrega = selectElem;
    abrirModalParaEntrega(key);
    return;
  }

  const fechaModificacion = new Date().toISOString().slice(0, 16);
  db.ref('pacientes/' + key).update({ estado: nuevoEstado, fechaModificacion });
}

// =================== 🔹 Modal de entrega (usa inputs existentes en index) ===================
const modalFirma = document.getElementById('modalFirma');
const canvas = document.getElementById('canvasFirma');
const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

function abrirModalParaEntrega(key) {
  firmaActualPaciente = key;
  const paciente = datosPacientes.find(x => x.key === key) || {};
  const placasInput = document.getElementById('modal_placas');
  const cdSelect = document.getElementById('modal_cd');
  const informeSelect = document.getElementById('modal_informe');

  if (!placasInput || !cdSelect || !informeSelect || !modalFirma || !canvas) {
    alert('Faltan elementos del modal en index.html. Asegúrate de tener modal_placas/modal_cd/modal_informe/canvasFirma/modalFirma.');
    // revertir select si hay pending
    if (pendingSelectForEntrega) {
      pendingSelectForEntrega.value = paciente.estado || 'En espera';
      pendingSelectForEntrega = null;
    }
    return;
  }

  placasInput.value = paciente.placas || '';
  cdSelect.value = paciente.cd || '';
  informeSelect.value = paciente.informe || '';
  limpiarFirma();
  modalFirma.style.display = 'flex';
  // ensure pendingSelectForEntrega remains set until saved or cancelled
}

// =================== 🔹 Validación canvas vacío ===================
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

// =================== 🔹 Guardar entrega desde modal ===================
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

  db.ref('pacientes/' + firmaActualPaciente).update({
    estado: 'Entregado',
    placas: placasVal || '',
    cd: cdVal,
    informe: informeVal,
    firma: dataURL,
    fechaModificacion
  });

  if (pendingSelectForEntrega) {
    pendingSelectForEntrega.value = 'Entregado';
    pendingSelectForEntrega = null;
  }
  cerrarModal();
}

// =================== 🔹 Funciones modal firma (abrir/limpiar/cerrar) ===================
function abrirModal(key) {
  firmaActualPaciente = key;
  limpiarFirma();
  if (modalFirma) modalFirma.style.display = 'flex';
}
function limpiarFirma() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function cerrarModal() {
  if (modalFirma) modalFirma.style.display = 'none';
  // revert pendingSelect if modal cancelled
  if (pendingSelectForEntrega) {
    const actual = datosPacientes.find(x => x.key === firmaActualPaciente);
    if (actual) pendingSelectForEntrega.value = actual.estado;
    pendingSelectForEntrega = null;
  }
  firmaActualPaciente = null;
}

// Si en tu index sigue existiendo el botón "Guardar firma" que solo guarda firma, lo mantenemos compat.
function guardarFirma() {
  if (!firmaActualPaciente) return;
  if (!ctx || isCanvasBlank(canvas)) { alert('Firma vacía.'); return; }
  const dataURL = canvas.toDataURL('image/png');
  db.ref('pacientes/' + firmaActualPaciente).update({ firma: dataURL });
  cerrarModal();
}

// =================== 🔹 Confirmar y eliminar (contraseña admin) ===================
function confirmarEliminar(key) {
  const pass = prompt('Ingrese contraseña de administrador:');
  if (pass === ADMIN_PASS) {
    db.ref('pacientes/' + key).remove();
  } else {
    alert('Contraseña incorrecta. No se eliminó.');
  }
}

// =================== 🔹 Repetir llamado (mantengo tu función original) ===================
function repetirLlamado(id) {
  firebase.database().ref("pacientes/" + id).update({ repetir: true });
}

// =================== 🔹 Exportar Excel ===================
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
    Entregado: p.estado === 'Entregado' ? 'Sí' : 'No',
    Fecha: p.fechaModificacion
  }));
  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');
  XLSX.writeFile(workbook, 'Pacientes.xlsx');
}

// =================== 🔹 Firma digital: canvas touch + repaint para móviles ===================
if (ctx) {
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000';
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

if (canvas && ctx) {
  // Mouse
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

  // Touch
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

// =================== 🔹 Listeners modal buttons (save/cancel/clear) ===================
const btnSaveEntrega = document.getElementById('modal_save_entrega');
const btnCancelEntrega = document.getElementById('modal_cancel_entrega');
const btnClearFirma = document.getElementById('modal_limpiar_firma');

if (btnSaveEntrega) btnSaveEntrega.addEventListener('click', guardarEntregaDesdeModal);
if (btnCancelEntrega) btnCancelEntrega.addEventListener('click', () => {
  if (pendingSelectForEntrega && firmaActualPaciente) {
    const actual = datosPacientes.find(x => x.key === firmaActualPaciente);
    if (actual) pendingSelectForEntrega.value = actual.estado;
    pendingSelectForEntrega = null;
  }
  cerrarModal();
});
if (btnClearFirma) btnClearFirma.addEventListener('click', limpiarFirma);

// =================== 🔹 Inicialización ===================
if (filtroSede) filtroSede.addEventListener('input', aplicarFiltros);
if (filtroNombre) filtroNombre.addEventListener('input', aplicarFiltros);
if (filtroEstudio) filtroEstudio.addEventListener('input', aplicarFiltros);
if (filtroFecha) filtroFecha.addEventListener('input', aplicarFiltros);

cargarPacientes();
