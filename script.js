// script.js  (module - Firebase v9)
import { db } from "./firebase-config.js";
import {
  ref, onValue, push, update, remove, set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ---------- constantes y DOM ----------
const ADMIN_PASS = '1234'; // Contraseña de administrador
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

// Variables para Paginación de Tabla Principal
let paginaActual = 1;
const pacientesPorPagina = 50;

let datosPacientes = [];
let firmaActualPaciente = null;
let pendingSelectForEntrega = null;

// Escáner QR variable global
let html5QrcodeScanner = null;

// Prioridad de estados para el ordenamiento
const ordenEstados = {
  'En espera': 1,
  'En atención': 2,
  'Atendido': 3,
  'Programado': 4,
  'Entregado': 5
};

// Usuario logueado (object) guardado en localStorage como 'user'
const currentUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch (e) { return null; }
})();

// Utilidad para normalizar clave de sede
function keyify(s) {
  if (!s) return 'sin_sede';
  return String(s).replace(/[^\w]/g, '_').toLowerCase();
}

// ---------- Navegación en la misma página (SPA) ----------
function mostrarSeccion(idSeccion) {
  document.querySelectorAll('.seccion-modulo').forEach(sec => {
    sec.style.display = 'none';
  });
  const activa = document.getElementById(idSeccion);
  if (activa) activa.style.display = 'block';

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
}

// ---------- Escáner QR ----------
const btnEscaneoQR = document.getElementById('btn-escaneo-qr');
const readerDiv = document.getElementById('reader');

if (btnEscaneoQR) {
  btnEscaneoQR.addEventListener('click', () => {
    if (!readerDiv) return;
    
    if (readerDiv.style.display === 'block') {
      readerDiv.style.display = 'none';
      if (html5QrcodeScanner) html5QrcodeScanner.clear();
      return;
    }

    readerDiv.style.display = 'block';

    if (typeof Html5QrcodeScanner !== 'undefined') {
      html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      
      html5QrcodeScanner.render((qrCodeMessage) => {
        try {
          // Acepta formato JSON desde el QR
          const datos = JSON.parse(qrCodeMessage);
          
          if (datos.apellidos) document.getElementById('apellidos').value = datos.apellidos;
          if (datos.nombres) document.getElementById('nombres').value = datos.nombres;
          if (datos.precio) document.getElementById('precio').value = datos.precio;
          if (datos.pf) document.getElementById('pf').value = datos.pf;
          
          if (datos.estudios && estudiosSelect) {
            Array.from(estudiosSelect.options).forEach(opt => {
              opt.selected = String(datos.estudios).includes(opt.value);
            });
            estudiosSelect.dispatchEvent(new Event('change'));
          }

          alert("¡Datos del paciente cargados desde el QR exitosamente!");
          html5QrcodeScanner.clear();
          readerDiv.style.display = 'none';

        } catch (e) {
          alert("El código QR escaneado no tiene un formato válido (JSON).");
        }
      }, (error) => {
        // Ignorar errores continuos de búsqueda de marco QR
      });
    } else {
      alert('La librería de escaneo QR no está cargada.');
    }
  });
}

// ---------- Cargar sedes y popular select ----------
function loadSedesToSelect() {
  const select = document.getElementById('sede');
  if (!select) return;
  onValue(ref(db, 'sedes'), snapshot => {
    select.innerHTML = '';
    const arr = [];
    snapshot.forEach(child => {
      const s = child.val();
      s.key = child.key;
      if (s && s.active !== false) arr.push(s);
    });
    arr.sort((a, b) => (a.name || a.nombre || '').localeCompare(b.name || b.nombre || ''));
    arr.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name || s.nombre || s.key;
      opt.textContent = s.name || s.nombre || s.key;
      select.appendChild(opt);
    });

    if (currentUser && currentUser.role && currentUser.role !== 'admin') {
      select.value = currentUser.sede || select.value;
      select.disabled = true;
    } else {
      select.disabled = false;
    }
  });
}

// ---------- Mostrar cantidad Eco pb ----------
if (estudiosSelect) {
  estudiosSelect.addEventListener('change', () => {
    const seleccionados = Array.from(estudiosSelect.selectedOptions).map(o => o.value);
    if (cantidadEcoPbDiv) {
      cantidadEcoPbDiv.style.display = seleccionados.includes('Eco pb') ? 'block' : 'none';
    }
  });
}

// ---------- Registrar paciente ----------
if (formulario) {
  formulario.addEventListener('submit', e => {
    e.preventDefault();

    const sedeEl = document.getElementById('sede');
    const sede = (currentUser && currentUser.role !== 'admin') ? (currentUser.sede || sedeEl.value) : (sedeEl.value || '').trim();

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
    if (cantidadEcoPbDiv) cantidadEcoPbDiv.style.display = 'none';
  });
}

// ---------- Cargar pacientes (real-time) ----------
function cargarPacientes() {
  onValue(ref(db, 'pacientes'), snapshot => {
    const pacientes = [];
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();
      paciente.key = childSnapshot.key;
      
      if (currentUser && currentUser.role === 'sede') {
        if (paciente.sede === currentUser.sede) pacientes.push(paciente);
      } else {
        pacientes.push(paciente);
      }
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

  paginaActual = 1;
  mostrarPacientes(pacientes);
}

// ---------- Mostrar pacientes ----------
function mostrarPacientes(pacientes) {
  pacientes.sort((a, b) => {
    const ordenA = ordenEstados[a.estado] || 99;
    const ordenB = ordenEstados[b.estado] || 99;

    if (ordenA !== ordenB) {
      return ordenA - ordenB;
    }

    const fechaA = String(a.fechaModificacion || a.fecha || '');
    const fechaB = String(b.fechaModificacion || b.fecha || '');
    return fechaB.localeCompare(fechaA);
  });

  if (tablaPacientes) tablaPacientes.innerHTML = '';
  
  const enEspera = pacientes.filter(p => p.estado === 'En espera').length;
  if (contador) contador.textContent = `Pacientes en espera: ${enEspera}`;

  const totalPaginas = Math.ceil(pacientes.length / pacientesPorPagina) || 1;
  if (paginaActual > totalPaginas) paginaActual = 1;

  const inicio = (paginaActual - 1) * pacientesPorPagina;
  const pacientesPagina = pacientes.slice(inicio, inicio + pacientesPorPagina);

  pacientesPagina.forEach(p => {
    const tr = document.createElement('tr');
    tr.classList.add("fila-paciente");

    if (p.estado === 'En espera') tr.classList.add("estado-espera");
    else if (p.estado === 'En atención') tr.classList.add("estado-atencion");
    else if (p.estado === 'Programado') tr.classList.add("estado-programado");
    else if (p.estado === 'Atendido') tr.classList.add("estado-atendido");
    else if (p.estado === 'Entregado') tr.classList.add("estado-entregado");

    const requierePlacas = /TEM|RM|RX|Mamografia/i.test(p.estudios || '');

    let firmaHTML = '';
    if (p.firma) {
      firmaHTML = `<img src="${p.firma}" alt="Firma" class="firma-img" style="max-height: 40px;">`;
    } else if (p.estado === 'Entregado') {
      firmaHTML = `<button onclick="abrirModal('${p.key}')" title="Firmar">✍️</button>`;
    }

    const placasHTML = (requierePlacas && p.estado === 'Entregado')
      ? `<input type="number" min="0" value="${p.placas || ''}" onclick="editarConClave(event,'${p.key}','placas', this)" readonly style="width:60px; text-align:center;"/>`
      : (p.placas ? `<div style="width:60px; text-align:center;">${p.placas}</div>` : '');

    const cdChecked = p.cd === 'SI' ? 'checked' : '';
    const cdHTML = (p.estado === 'Entregado')
      ? `<input type="checkbox" ${cdChecked} onclick="editarConClaveCheckbox(event,'${p.key}','cd', this)">`
      : `<div style="width:60px; text-align:center;">${p.cd === 'SI' ? 'SI' : ''}</div>`;

    const informeHTML = (p.estado === 'Entregado')
      ? `<input type="checkbox" ${p.informe === 'SI' ? 'checked' : ''} onclick="editarConClaveCheckbox(event,'${p.key}','informe', this)">`
      : `<div style="width:60px; text-align:center;">${p.informe === 'SI' ? 'SI' : ''}</div>`;

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

    if (tablaPacientes) tablaPacientes.appendChild(tr);
  });

  renderizarPaginacion(pacientes.length, totalPaginas, pacientes);
}

// ---------- Renderizar Paginación ----------
function renderizarPaginacion(totalRegistros, totalPaginas, pacientes) {
  let pagContainer = document.getElementById('paginacion-tabla');
  
  if (!pagContainer) {
    pagContainer = document.createElement('div');
    pagContainer.id = 'paginacion-tabla';
    pagContainer.style.cssText = 'display:flex; gap:5px; justify-content:center; margin:15px 0;';
    if (tablaPacientes && tablaPacientes.parentNode) {
      tablaPacientes.parentNode.insertBefore(pagContainer, tablaPacientes.nextSibling);
    }
  }

  pagContainer.innerHTML = '';

  if (totalRegistros <= pacientesPorPagina) return;

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.style.cssText = `
      padding: 6px 12px;
      border: 1px solid #ccc;
      background: ${i === paginaActual ? '#3d0a11' : '#fff'};
      color: ${i === paginaActual ? '#fff' : '#333'};
      border-radius: 4px;
      cursor: pointer;
      font-weight: ${i === paginaActual ? 'bold' : 'normal'};
    `;
    btn.onclick = () => {
      paginaActual = i;
      mostrarPacientes(pacientes);
    };
    pagContainer.appendChild(btn);
  }
}

// ---------- Editar con clave (placas) ----------
function editarConClave(evt, key, campo, inputEl) {
  evt.preventDefault();
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  if (pass === ADMIN_PASS) {
    inputEl.removeAttribute('readonly');
    inputEl.focus();
    const blurHandler = () => {
      const nuevoValor = inputEl.value;
      const fechaModificacion = new Date().toISOString().slice(0, 16);
      update(ref(db, 'pacientes/' + key), { [campo]: nuevoValor, fechaModificacion });
      inputEl.setAttribute('readonly', 'true');
      inputEl.removeEventListener('blur', blurHandler);
    };
    inputEl.addEventListener('blur', blurHandler);
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
  }
}

// ---------- Editar checkbox con clave (CD/Informe) ----------
function editarConClaveCheckbox(evt, key, campo, checkboxEl) {
  evt.preventDefault();
  const pass = prompt('Ingrese contraseña de administrador para modificar ' + campo + ':');
  const pacienteActual = datosPacientes.find(x => x.key === key) || {};
  if (pass === ADMIN_PASS) {
    const nuevoVal = (!checkboxEl.checked) ? 'SI' : 'NO';
    checkboxEl.checked = (nuevoVal === 'SI');
    const fechaModificacion = new Date().toISOString().slice(0, 16);
    update(ref(db, 'pacientes/' + key), { [campo]: nuevoVal, fechaModificacion });
  } else {
    alert('Contraseña incorrecta. No se permite modificar.');
    checkboxEl.checked = (pacienteActual[campo] === 'SI');
  }
}

// ---------- Cambiar estado ----------
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
    const turno = {
      nombre: actual.nombres + ' ' + actual.apellidos,
      sede: actual.sede,
      estudio: actual.estudios,
      hora: new Date().toLocaleTimeString()
    };
    set(ref(db, `turnoActual/${keyify(actual.sede)}`), turno);
    set(ref(db, 'turnoActual_global'), turno);
  }

  if (nuevoEstado === 'Entregado') {
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

  const turno = {
    nombre: actual.nombres + ' ' + actual.apellidos,
    sede: actual.sede,
    estudio: actual.estudios,
    hora: new Date().toLocaleTimeString()
  };
  set(ref(db, `turnoActual/${keyify(actual.sede)}`), turno);
  set(ref(db, 'turnoActual_global'), turno);
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
    if (pendingSelectForEntrega) {
      update(ref(db, 'pacientes/' + key), { estado: paciente.estado || 'En espera' });
      pendingSelectForEntrega = null;
    }
    return;
  }

  placasInput.value = paciente.placas || '';
  cdSelect.value = paciente.cd || '';
  informeSelect.value = paciente.informe || '';

  modalFirma.style.display = 'flex';
  modalFirma.setAttribute('aria-hidden', 'false');
  setTimeout(() => { resizeCanvasForDisplay(); limpiarFirma(); }, 50);
}

// ---------- Canvas Helpers ----------
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
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function cerrarModal() {
  if (modalFirma) {
    modalFirma.style.display = 'none';
    modalFirma.setAttribute('aria-hidden', 'true');
  }
  if (pendingSelectForEntrega) {
    aplicarFiltros();
    pendingSelectForEntrega = null;
  }
  firmaActualPaciente = null;
}

// ---------- Guardar firma ----------
function guardarFirma() {
  if (!firmaActualPaciente) return;
  if (!ctx || isCanvasBlank(canvas)) { alert('Firma vacía.'); return; }
  const dataURL = canvas.toDataURL('image/png');
  const fechaModificacion = new Date().toISOString().slice(0, 16);
  update(ref(db, 'pacientes/' + firmaActualPaciente), { firma: dataURL, fechaModificacion });
  cerrarModal();
}

// ---------- Exportar Excel ----------
function exportarExcel() {
  if (typeof XLSX === 'undefined') {
    alert('La librería XLSX no está cargada.');
    return;
  }
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
if (btnCancelEntrega) btnCancelEntrega.addEventListener('click', cerrarModal);
if (btnClearFirma) btnClearFirma.addEventListener('click', limpiarFirma);

// ---------- Listeners filtros ----------
[filtroSede, filtroNombre, filtroEstudio, filtroFecha].forEach(i => i && i.addEventListener('input', aplicarFiltros));

// ---------- Exponer funciones globales ----------
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
window.mostrarSeccion = mostrarSeccion;

// ---------- Iniciar ----------
loadSedesToSelect();
cargarPacientes();
