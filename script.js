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

// contraseña admin
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
    } else if (p.estado === 'Atendido') {
      // no mostramos botón de firma aún (solo cuando pase a Entregado)
      firmaHTML = '';
    }

    // Placas / CD / Informe:
    // - Si estado === Entregado -> mostrar controls, pero para edición se pedirá contraseña (editarConClave)
    // - Si no Entregado -> mostrar texto (vacío si no existe)
    let placasHTML = '';
    if (requierePlacas) {
      if (p.estado === 'Entregado') {
        // input readonly: onclick pide clave para editar
        placasHTML = `<input type="number" min="0" value="${p.placas || ''}" onclick="editarConClave('${p.key}','placas', this)" readonly style="width:52px; text-align:center;"/>`;
      } else {
        placasHTML = p.placas ? `<div style="width:52px; text-align:center;">${p.placas}</div>` : '';
      }
    } else {
      // estudios que no requieren placas: mostrar vacío o dato si existe
      placasHTML = p.placas ? `<div style="width:52px; text-align:center;">${p.placas}</div>` : '';
    }

    let cdHTML = '';
    if (p.estado === 'Entregado') {
      // checkbox clickable but onchange -> exige clave
      const checked = (p.cd === 'SI') ? 'checked' : '';
      cdHTML = `<input type="checkbox" ${checked} onchange="editarConClaveCheckbox('${p.key}','cd', this)">`;
    } else {
      cdHTML = p.cd === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;"></div>`;
    }

    let informeHTML = '';
    if (p.estado === 'Entregado') {
      // Informe no editable después de entregado (según última instrucción)
      informeHTML = p.informe === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;">NO</div>`;
    } else {
      informeHTML = p.informe === 'SI' ? `<div style="width:52px; text-align:center;">SI</div>` : `<div style="width:52px; text-align:center;"></div>`;
    }

    // Estados: select que llama a cambiarEstado(this) y lleva data-key
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

    // Acción eliminar: siempre requiere contraseña
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

    // color por estado
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

// =================== 🔹 Editar con clave (placas - input readonly -> solicita clave para permitir escritura) ===================
function editarConClave(key, campo, inputEl) {
  // pedir clave
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  if (pass === ADMIN_PASS) {
    // permitir edición "temporal" -> remove readonly, focus, y al blur guardar
    inputEl.removeAttribute('readonly');
    inputEl.focus();
    // al perder foco guardar y volver a readonly
    const blurHandler = () => {
      const nuevoValor = inputEl.value;
      db.ref('pacientes/' + key).update({ [campo]: nuevoValor });
      inputEl.setAttribute('readonly', 'true');
      inputEl.removeEventListener('blur', blurHandler);
    };
    inputEl.addEventListener('blur', blurHandler);
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
    // restaurar valor del input desde registro
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
    // restaurar estado del checkbox desde registro
    checkboxEl.checked = (pacienteActual[campo] === 'SI');
  }
}

// =================== 🔹 Guardar campo (usar en cambios normales) ===================
function guardarCampo(key, campo, valor) {
  db.ref('pacientes/' + key).update({ [campo]: valor });
}

// =================== 🔹 Cambiar estado (ahora recibe el select DOM) ===================
function cambiarEstado(selectElem) {
  const key = selectElem.getAttribute('data-key');
  const nuevoEstado = selectElem.value;
  const actual = datosPacientes.find(x => x.key === key);
  if (!actual) return;

  // reglas:
  if (actual.estado === 'Entregado') {
    alert('No se puede modificar: ya está ENTREGADO.');
    // revertir UI al estado real
    selectElem.value = actual.estado;
    return;
  }
  if (actual.estado === 'Atendido' && nuevoEstado !== 'Entregado') {
    alert('Una vez ATENDIDO solo puede avanzar a ENTREGADO.');
    selectElem.value = actual.estado;
    return;
  }

  // Si quieren marcar Entregado: abrir modal y exigir firma + datos obligatorios
  if (nuevoEstado === 'Entregado') {
    // guardamos el select en pending para revert si cancelan
    pendingSelectForEntrega = selectElem;
    abrirModalParaEntrega(key);
    return; // no actualizamos DB todavía
  }

  // si no es Entregado -> actualizar directamente
  const fechaModificacion = new Date().toISOString().slice(0, 16);
  db.ref('pacientes/' + key).update({ estado: nuevoEstado, fechaModificacion });
}

// =================== 🔹 Abrir modal de entrega (rellenar inputs si ya había info) ===================
const modalFirma = document.getElementById('modalFirma'); // asumo que existe en tu index
const canvas = document.getElementById('canvasFirma');
const ctx = canvas.getContext('2d');

function abrirModalParaEntrega(key) {
  firmaActualPaciente = key;
  // precargar valores si existen
  const paciente = datosPacientes.find(x => x.key === key) || {};
  const placasInput = document.getElementById('modal_placas') || createHiddenModalInputs();
  const cdSelect = document.getElementById('modal_cd');
  const informeSelect = document.getElementById('modal_informe');

  // If your index doesn't have these modal inputs, create them dynamically inside modal.
  // (createHiddenModalInputs() ensures DOM elements exist; see function below)
  placasInput.value = paciente.placas || '';
  if (cdSelect) cdSelect.value = paciente.cd || '';
  if (informeSelect) informeSelect.value = paciente.informe || '';
  limpiarFirma();
  // show modal
  modalFirma.style.display = 'flex';
}

// Si tu index no tiene inputs dentro del modal con ids modal_placas/modal_cd/modal_informe
// creamos elementos dentro del modalFirma para usarlos (esto mantiene compatibilidad).
function createHiddenModalInputs() {
  // buscar contenedor del modal
  if (!modalFirma) return null;
  const cont = modalFirma.querySelector('.modal-body') || modalFirma.querySelector('div') || modalFirma;
  // placas
  let placasInput = document.getElementById('modal_placas');
  if (!placasInput) {
    placasInput = document.createElement('input');
    placasInput.id = 'modal_placas';
    placasInput.type = 'number';
    placasInput.min = 0;
    placasInput.placeholder = 'Placas (nro)';
    placasInput.style.margin = '6px';
    cont.appendChild(placasInput);
  }
  // cd
  let cdSelect = document.getElementById('modal_cd');
  if (!cdSelect) {
    cdSelect = document.createElement('select');
    cdSelect.id = 'modal_cd';
    cdSelect.innerHTML = '<option value="">CD?</option><option value="SI">SI</option><option value="NO">NO</option>';
    cdSelect.style.margin = '6px';
    cont.appendChild(cdSelect);
  }
  // informe
  let informeSelect = document.getElementById('modal_informe');
  if (!informeSelect) {
    informeSelect = document.createElement('select');
    informeSelect.id = 'modal_informe';
    informeSelect.innerHTML = '<option value="">Informe?</option><option value="SI">SI</option><option value="NO">NO</option>';
    informeSelect.style.margin = '6px';
    cont.appendChild(informeSelect);
  }
  // add save and cancel if not exist
  if (!document.getElementById('modal_save_entrega')) {
    const btnSave = document.createElement('button');
    btnSave.id = 'modal_save_entrega';
    btnSave.textContent = 'Guardar Entrega';
    btnSave.style.margin = '6px';
    btnSave.addEventListener('click', guardarEntregaDesdeModal);
    cont.appendChild(btnSave);
  }
  if (!document.getElementById('modal_cancel_entrega')) {
    const btnCancel = document.createElement('button');
    btnCancel.id = 'modal_cancel_entrega';
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.margin = '6px';
    btnCancel.addEventListener('click', () => {
      // revertir select al estado original
      if (pendingSelectForEntrega) {
        const orig = datosPacientes.find(x => x.key === firmaActualPaciente);
        if (orig) pendingSelectForEntrega.value = orig.estado;
      }
      cerrarModal();
    });
    cont.appendChild(btnCancel);
  }

  return placasInput;
}

// =================== 🔹 Validación canvas vacío ===================
function isCanvasBlank(c) {
  const blank = document.createElement('canvas');
  blank.width = c.width;
  blank.height = c.height;
  return c.toDataURL() === blank.toDataURL();
}

// =================== 🔹 Guardar entrega desde modal (valida campos obligatorios y firma) ===================
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

  // Validaciones obligatorias:
  if (requierePlacas && (placasVal === '' || isNaN(Number(placasVal)))) {
    alert('Debe indicar el número de placas (obligatorio para este estudio).');
    return;
  }
  if (!cdVal) { alert('Debe seleccionar CD (SI/NO).'); return; }
  if (!informeVal) { alert('Debe seleccionar Informe (SI/NO).'); return; }

  // firma obligatoria
  if (isCanvasBlank(canvas)) {
    alert('Debe firmar antes de guardar la entrega.');
    return;
  }

  const dataURL = canvas.toDataURL('image/png');
  const fechaModificacion = new Date().toISOString().slice(0, 16);

  // actualizar registro con todos los datos de entrega
  db.ref('pacientes/' + firmaActualPaciente).update({
    estado: 'Entregado',
    placas: placasVal || '',
    cd: cdVal,
    informe: informeVal,
    firma: dataURL,
    fechaModificacion
  });

  // cerrar modal y limpiar pending select
  if (pendingSelectForEntrega) {
    pendingSelectForEntrega.value = 'Entregado';
    pendingSelectForEntrega = null;
  }
  cerrarModal();
}

// =================== 🔹 Funciones modal firma básicas (si usas modalFirma y canvasFirma pre-existentes) ===================
function abrirModal(key) {
  // este abrirModal lo usamos cuando queremos firmar sin pasar por "Entregado" (caso excepcional)
  firmaActualPaciente = key;
  limpiarFirma();
  modalFirma.style.display = 'flex';
}
function limpiarFirma() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function cerrarModal() {
  modalFirma.style.display = 'none';
  firmaActualPaciente = null;
  // si hubo pendingSelect y el usuario canceló, revertimos valor del select
  if (pendingSelectForEntrega) {
    const actual = datosPacientes.find(x => x.key === firmaActualPaciente);
    if (actual && pendingSelectForEntrega) {
      pendingSelectForEntrega.value = actual.estado;
      pendingSelectForEntrega = null;
    }
  }
}

// Si usas el botón "Guardar" del modal original (canvasFirma), este guarda firma sola (sin cambiar estado)
// lo dejamos por compatibilidad con tu UX anterior:
function guardarFirma() {
  if (!firmaActualPaciente) return;
  if (isCanvasBlank(canvas)) { alert('Firma vacía.'); return; }
  const dataURL = canvas.toDataURL('image/png');
  db.ref('pacientes/' + firmaActualPaciente).update({ firma: dataURL });
  cerrarModal();
}

// =================== 🔹 Confirmar y eliminar (contraseña admin) ===================
function confirmarEliminar(key) {
  const pass = prompt('Ingrese contraseña de administrador:');
  if (pass === '1234') {
    db.ref('pacientes/' + key).remove();
  } else {
    alert('Contraseña incorrecta. No se eliminó.');
  }
}

// =================== 🔹 Repetir llamado (mantengo tu función original) ===================
function repetirLlamado(id) {
  firebase.database().ref("pacientes/" + id).update({
    repetir: true
  });
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
// (si tu index tiene canvas con id 'canvasFirma' y modal 'modalFirma', ya referenciados arriba)
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
  // forzar repintado móvil:
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

// =================== 🔹 Inicialización ===================
if (filtroSede) filtroSede.addEventListener('input', aplicarFiltros);
if (filtroNombre) filtroNombre.addEventListener('input', aplicarFiltros);
if (filtroEstudio) filtroEstudio.addEventListener('input', aplicarFiltros);
if (filtroFecha) filtroFecha.addEventListener('input', aplicarFiltros);

cargarPacientes();
