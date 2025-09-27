// script.js (módulo, Firebase v9)
// importa funciones de RTDB y el objeto db (desde firebase-config.js)
import { ref, onValue, push, update, remove, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { db } from './firebase-config.js';

// ========== CONFIG / ESTADO ==========
const ADMIN_PASS = '1234'; // cambia aquí si quieres otra clave
let datosPacientes = [];
let firmaActualPaciente = null;
let pendingSelectForEntrega = null; // elemento select (para revert si cancelan)

// ========== ELEMENTOS (se obtienen cuando DOM listo) ==========
let formulario, tablaPacientes, contador, estudiosSelect, cantidadEcoPbDiv, ecoPbCantidad;
let filtroSede, filtroNombre, filtroEstudio, filtroFecha;
let modalFirma, canvas, ctx, modalPlacas, modalCd, modalInforme;
let btnSaveEntrega, btnCancelEntrega, btnClearFirma;

// Inicializar cuando DOM listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // DOM elements
  formulario = document.getElementById('formulario');
  tablaPacientes = document.getElementById('tabla-pacientes');
  contador = document.getElementById('contador');
  estudiosSelect = document.getElementById('estudios');
  cantidadEcoPbDiv = document.getElementById('cantidad-eco-pb');
  ecoPbCantidad = document.getElementById('ecoPbCantidad');
  filtroSede = document.getElementById('filtroSede');
  filtroNombre = document.getElementById('filtroNombre');
  filtroEstudio = document.getElementById('filtroEstudio');
  filtroFecha = document.getElementById('filtroFecha');

  modalFirma = document.getElementById('modalFirma');
  canvas = document.getElementById('canvasFirma');
  modalPlacas = document.getElementById('modal_placas');
  modalCd = document.getElementById('modal_cd');
  modalInforme = document.getElementById('modal_informe');
  btnSaveEntrega = document.getElementById('modal_save_entrega');
  btnCancelEntrega = document.getElementById('modal_cancel_entrega');
  btnClearFirma = document.getElementById('modal_limpiar_firma');

  // canvas context
  if (canvas && canvas.getContext) {
    ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  }

  // listeners
  if (estudiosSelect) {
    estudiosSelect.addEventListener('change', () => {
      const seleccionados = Array.from(estudiosSelect.selectedOptions).map(o => o.value);
      cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
    });
  }

  if (formulario) {
    formulario.addEventListener('submit', onSubmitPaciente);
  }

  [filtroSede, filtroNombre, filtroEstudio, filtroFecha].forEach(i => i && i.addEventListener('input', aplicarFiltros));

  if (btnSaveEntrega) btnSaveEntrega.addEventListener('click', guardarEntregaDesdeModal);
  if (btnCancelEntrega) btnCancelEntrega.addEventListener('click', () => {
    // revertir select si cancelaron entrega
    if (pendingSelectForEntrega && firmaActualPaciente) {
      const actual = datosPacientes.find(x => x.key === firmaActualPaciente);
      if (actual) pendingSelectForEntrega.value = actual.estado;
      pendingSelectForEntrega = null;
    }
    cerrarModal();
  });
  if (btnClearFirma) btnClearFirma.addEventListener('click', limpiarFirma);

  // canvas eventos (mouse + touch)
  setupCanvasEvents();

  // Exponer funciones que se usan en atributos inline (onchange/onclick)
  window.cambiarEstado = cambiarEstado;
  window.abrirModal = abrirModalFirma; // boton "✍️" en tabla
  window.confirmarEliminar = confirmarEliminar;
  window.llamarOtraVez = llamarOtraVez;
  window.editarConClave = editarConClave;
  window.editarConClaveCheckbox = editarConClaveCheckbox;
  window.guardarCampo = guardarCampo;

  // start listening datos
  cargarPacientes();
}

// =================== SUBMIT ===================
function onSubmitPaciente(e) {
  e.preventDefault();
  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  const estudios = Array.from(estudiosSelect.selectedOptions).map(option => option.value);
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
}

// =================== CARGAR PACIENTES (RTDB) ===================
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

// =================== FILTROS ===================
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

// =================== MOSTRAR PACIENTES ===================
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

    // clases por estado
    if (p.estado === 'En espera') tr.classList.add("estado-espera");
    else if (p.estado === 'En atención') tr.classList.add("estado-atencion");
    else if (p.estado === 'Programado') tr.classList.add("estado-programado");
    else if (p.estado === 'Atendido') tr.classList.add("estado-atendido");
    else if (p.estado === 'Entregado') tr.classList.add("estado-entregado");

    // requiere placas
    const requierePlacas = /TEM|RM|RX|Mamografia/i.test(p.estudios || '');

    // firma visible
    let firmaHTML = '';
    if (p.firma) {
      firmaHTML = `<img class="firma-img" src="${p.firma}" alt="Firma">`;
    } else if (p.estado === 'Entregado') {
      firmaHTML = `<button class="btn small" onclick="abrirModal('${p.key}')" title="Firmar">✍️</button>`;
    }

    // placas: si requiere placas y está ENTREGADO -> input readonly con editarConClave on click
    let placasHTML = '';
    if (requierePlacas) {
      if (p.estado === 'Entregado') {
        placasHTML = `<input type="number" min="0" value="${p.placas || ''}" onclick="editarConClave('${p.key}','placas', this)" readonly style="width:52px; text-align:center;" />`;
      } else {
        placasHTML = p.placas ? `<div style="width:52px; text-align:center;">${p.placas}</div>` : '';
      }
    } else {
      placasHTML = p.placas ? `<div style="width:52px; text-align:center;">${p.placas}</div>` : '';
    }

    // cd: checkbox editable solo con clave (onclick -> editarConClaveCheckbox)
    let cdHTML = '';
    if (p.estado === 'Entregado') {
      const checked = (p.cd === 'SI') ? 'checked' : '';
      cdHTML = `<input type="checkbox" ${checked} onclick="editarConClaveCheckbox('${p.key}','cd', this)">`;
    } else {
      cdHTML = p.cd === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;"></div>`;
    }

    // informe: show SI/NO text; if Entregado keep as text (no edit) — if you want to allow edit with password you can adapt
    let informeHTML = '';
    if (p.estado === 'Entregado') {
      informeHTML = `<div style="width:52px; text-align:center;">${p.informe === 'SI' ? 'SI' : 'NO'}</div>`;
    } else {
      informeHTML = p.informe === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;"></div>`;
    }

    // estado select (agrego data-key para encontrar el select desde la función)
    const estadoSelect = `
      <select data-key="${p.key}" onchange="cambiarEstado('${p.key}', this.value, this)" ${ (p.estado === 'Entregado') ? 'disabled' : '' }>
        <option ${p.estado === 'En espera' ? 'selected' : ''}>En espera</option>
        <option ${p.estado === 'En atención' ? 'selected' : ''}>En atención</option>
        <option ${p.estado === 'Programado' ? 'selected' : ''}>Programado</option>
        <option ${p.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        <option ${p.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
      </select>
      <div style="font-size:10px;">${p.fechaModificacion || ''}</div>
    `;

    const accionEliminar = `<button class="btn small danger" onclick="confirmarEliminar('${p.key}')">🗑️</button>`;
    const llamarOtraVez = (p.estado === 'En atención') ? `<button class="btn small" onclick="llamarOtraVez('${p.key}')">🔔 Llamar otra vez</button>` : '';

    tr.innerHTML = `
      <td>${escapeHtml(p.sede || '')}</td>
      <td>${escapeHtml(p.apellidos || '')}</td>
      <td>${escapeHtml(p.nombres || '')}</td>
      <td>${escapeHtml(p.estudios || '')}</td>
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

// =================== GUARDAR CAMPO (general) ===================
function guardarCampo(key, campo, valor) {
  update(ref(db, 'pacientes/' + key), { [campo]: valor });
}

// =================== CAMBIAR ESTADO ===================
function cambiarEstado(key, nuevoEstado, selectElem) {
  const actual = datosPacientes.find(x => x.key === key);
  if (!actual) return;

  // reglas
  if (actual.estado === 'Entregado') {
    alert('No se puede modificar: ya está ENTREGADO.');
    // revertir UI
    if (selectElem) selectElem.value = actual.estado;
    aplicarFiltros();
    return;
  }
  if (actual.estado === 'Atendido' && nuevoEstado !== 'Entregado') {
    alert('Una vez ATENDIDO solo puede avanzar a ENTREGADO.');
    if (selectElem) selectElem.value = actual.estado;
    aplicarFiltros();
    return;
  }

  const fechaModificacion = new Date().toISOString().slice(0, 16);

  // Si pasa a "En atención" actualizamos turnoActual (para TV)
  if (nuevoEstado === 'En atención') {
    set(ref(db, 'turnoActual'), {
      nombre: actual.nombres + ' ' + actual.apellidos,
      sede: actual.sede,
      estudio: actual.estudios,
      hora: new Date().toLocaleTimeString()
    });
  }

  // si va a Entregado: abrimos modal para datos obligatorios
  if (nuevoEstado === 'Entregado') {
    // guardamos el select para poder revertir si cancelan
    pendingSelectForEntrega = selectElem || null;
    abrirModalParaEntrega(key);
    return;
  }

  // actualizar estado normal
  update(ref(db, 'pacientes/' + key), { estado: nuevoEstado, fechaModificacion });
}

// =================== LLAMAR OTRA VEZ (sincroniza turnoActual) ===================
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

// =================== CONFIRMAR ELIMINAR (con clave) ===================
function confirmarEliminar(key) {
  const pass = prompt('Ingrese contraseña de administrador:');
  if (pass === ADMIN_PASS) {
    remove(ref(db, 'pacientes/' + key));
  } else {
    alert('Contraseña incorrecta. No se eliminó.');
  }
}

// =================== EDITAR CON CLAVE (placas num) ===================
function editarConClave(key, campo, inputEl) {
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
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
    inputEl.value = pacienteActual[campo] || '';
  }
}

// =================== EDITAR CHECKBOX CON CLAVE (CD) ===================
function editarConClaveCheckbox(key, campo, checkboxEl) {
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  if (pass === ADMIN_PASS) {
    const valor = checkboxEl.checked ? 'SI' : 'NO';
    update(ref(db, 'pacientes/' + key), { [campo]: valor });
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
    checkboxEl.checked = (pacienteActual[campo] === 'SI');
  }
}

// =================== MODAL ENTREGA / FIRMA ===================
function abrirModalParaEntrega(key) {
  firmaActualPaciente = key;
  const paciente = datosPacientes.find(x => x.key === key) || {};
  // llenar modal con valores existentes
  if (modalPlacas) modalPlacas.value = paciente.placas || '';
  if (modalCd) modalCd.value = paciente.cd || '';
  if (modalInforme) modalInforme.value = paciente.informe || '';
  limpiarFirma();
  if (modalFirma) {
    modalFirma.style.display = 'flex';
    modalFirma.setAttribute('aria-hidden', 'false');
  }
}

// abrir modal SOLO para firmar/editar firma (botón ✍️)
function abrirModalFirma(key) {
  firmaActualPaciente = key;
  const paciente = datosPacientes.find(x => x.key === key) || {};
  // si ya está entregado, permitimos firmar (o rehacer firma)
  if (modalPlacas) modalPlacas.value = paciente.placas || '';
  if (modalCd) modalCd.value = paciente.cd || '';
  if (modalInforme) modalInforme.value = paciente.informe || '';
  limpiarFirma();
  if (modalFirma) {
    modalFirma.style.display = 'flex';
    modalFirma.setAttribute('aria-hidden', 'false');
  }
}

// =================== isCanvasBlank ===================
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

// =================== GUARDAR ENTREGA DESDE MODAL ===================
function guardarEntregaDesdeModal() {
  if (!firmaActualPaciente) return alert('Paciente no seleccionado.');
  const paciente = datosPacientes.find(x => x.key === firmaActualPaciente) || {};
  const requierePlacas = /TEM|RM|RX|Mamografia/i.test(paciente.estudios || '');

  const placasVal = modalPlacas ? modalPlacas.value.trim() : '';
  const cdVal = modalCd ? modalCd.value : '';
  const informeVal = modalInforme ? modalInforme.value : '';

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

  // actualizar turnoActual? No necesario al entregar
  // if had pending select, set its value to Entregado
  if (pendingSelectForEntrega) {
    try {
      pendingSelectForEntrega.value = 'Entregado';
    } catch (e) {}
    pendingSelectForEntrega = null;
  }

  cerrarModal();
}

// =================== FUNCIONES DEL MODAL ===================
function limpiarFirma() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function cerrarModal() {
  if (!modalFirma) return;
  modalFirma.style.display = 'none';
  modalFirma.setAttribute('aria-hidden', 'true');
  // revertir pending select si cancelaron
  if (pendingSelectForEntrega && firmaActualPaciente) {
    const actual = datosPacientes.find(x => x.key === firmaActualPaciente);
    if (actual) {
      try { pendingSelectForEntrega.value = actual.estado; } catch (e) {}
    }
    pendingSelectForEntrega = null;
  }
  firmaActualPaciente = null;
}

// Si alguien usa botón "Guardar firma" suelto (compat)
function guardarFirma() {
  if (!firmaActualPaciente) return;
  if (!ctx || isCanvasBlank(canvas)) { alert('Firma vacía.'); return; }
  const dataURL = canvas.toDataURL('image/png');
  update(ref(db, 'pacientes/' + firmaActualPaciente), { firma: dataURL });
  cerrarModal();
}

// =================== SETUP CANVAS (touch + mouse) ===================
function setupCanvasEvents() {
  if (!canvas || !ctx) return;
  let drawing = false;

  function getPos(evt) {
    const r = canvas.getBoundingClientRect();
    if (evt.touches && evt.touches[0]) {
      return { x: evt.touches[0].clientX - r.left, y: evt.touches[0].clientY - r.top };
    } else {
      return { x: evt.clientX - r.left, y: evt.clientY - r.top };
    }
  }

  // Mouse
  canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
  canvas.addEventListener('mouseout', () => { drawing = false; ctx.beginPath(); });

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('touchend', () => { drawing = false; ctx.beginPath(); });
}

// =================== EXPORTAR EXCEL ===================
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

// helper para evitar XSS en strings simples
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"'`=\/]/g, function (c) {
    return {
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#x60;','=':'&#x3D;','/':'&#x2F;'
    }[c];
  });
}

// Exponer algunas funciones globalmente (por seguridad adicional)
window.guardarCampo = guardarCampo;
window.guardarFirma = guardarFirma;
window.exportarExcel = exportarExcel;
