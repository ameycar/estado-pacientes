// tv-script.js (module - Firebase v9)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

let sedeSeleccionada = '';
let ultimoTurnoId = null;
let historialLlamados = [];

// Elementos DOM
const modalInicial = document.getElementById('selector-sede-modal');
const selectSede = document.getElementById('select-tv-sede');
const btnIniciar = document.getElementById('btn-iniciar-tv');
const tvTituloSede = document.getElementById('tv-titulo-sede');
const tvReloj = document.getElementById('tv-reloj');

const tvPacienteNombre = document.getElementById('tv-paciente-nombre');
const tvPacienteArea = document.getElementById('tv-paciente-area');
const listaUltimos = document.getElementById('lista-ultimos-llamados');
const listaEspera = document.getElementById('lista-en-espera');
const audioTimbre = document.getElementById('audio-timbre');
const reproductorVideo = document.getElementById('reproductor-usb');

// Lista de reproducción de videos locales/USB
const listaVideosUSB = [
  './videos/publicidad1.mp4',
  './videos/publicidad2.mp4',
  './videos/publicidad3.mp4'
];
let indiceVideoActual = 0;

// ---------- Cargar Sedes al Iniciar ----------
function cargarSedesModal() {
  onValue(ref(db, 'sedes'), snapshot => {
    selectSede.innerHTML = '';
    snapshot.forEach(child => {
      const s = child.val();
      const nombre = s.name || s.nombre || child.key;
      const opt = document.createElement('option');
      opt.value = nombre;
      opt.textContent = nombre;
      selectSede.appendChild(opt);
    });
  });
}

// ---------- Reloj Digital ----------
function actualizarReloj() {
  const ahora = new Date();
  tvReloj.textContent = ahora.toLocaleTimeString('es-PE', { hour12: true });
}
setInterval(actualizarReloj, 1000);

// ---------- Inicio de Pantalla TV ----------
btnIniciar.addEventListener('click', () => {
  sedeSeleccionada = selectSede.value;
  if (!sedeSeleccionada) return alert('Por favor seleccione una sede.');

  // Habilitar audio desbloqueando la política del navegador
  audioTimbre.play().then(() => {
    audioTimbre.pause();
    audioTimbre.currentTime = 0;
  }).catch(e => console.log("Audio desbloqueado"));

  tvTituloSede.innerHTML = `<i class="fas fa-hospital-user"></i> Sede: ${sedeSeleccionada}`;
  modalInicial.style.display = 'none';

  iniciarReproductorVideo();
  escucharTurnoActual();
  escucharListaPacientes();
});

// ---------- Bucle de Video Publicitario USB ----------
function iniciarReproductorVideo() {
  if (!reproductorVideo || listaVideosUSB.length === 0) return;

  reproductorVideo.src = listaVideosUSB[indiceVideoActual];
  reproductorVideo.play().catch(e => console.log("Error al reproducir video", e));

  reproductorVideo.addEventListener('ended', () => {
    indiceVideoActual = (indiceVideoActual + 1) % listaVideosUSB.length;
    reproductorVideo.src = listaVideosUSB[indiceVideoActual];
    reproductorVideo.play();
  });
}

// ---------- Normalizar Claves de Sede ----------
function keyify(s) {
  if (!s) return 'sin_sede';
  return String(s).replace(/[^\w]/g, '_').toLowerCase();
}

// ---------- Escuchar Turno Actual en Tiempo Real ----------
function escucharTurnoActual() {
  const sedeKey = keyify(sedeSeleccionada);
  
  onValue(ref(db, `turnoActual/${sedeKey}`), snapshot => {
    const turno = snapshot.val();
    if (!turno) return;

    const turnoId = `${turno.nombre}-${turno.hora}`;
    
    // Si es un nuevo llamado o repetición
    if (turnoId !== ultimoTurnoId) {
      ultimoTurnoId = turnoId;

      // Actualizar Banner
      tvPacienteNombre.textContent = turno.nombre || 'PACIENTE';
      tvPacienteArea.textContent = `A: ${turno.estudio || 'CONSULTORIO'}`;

      // Agregar al Historial
      agregarAHistorial(turno);

      // Reproducir Sonido Timbre y Voz
      reproducirAnuncio(turno.nombre, turno.estudio);
    }
  });
}

// ---------- Escuchar Lista Completa para Pacientes en Espera ----------
function escucharListaPacientes() {
  onValue(ref(db, 'pacientes'), snapshot => {
    const enEspera = [];

    snapshot.forEach(child => {
      const p = child.val();
      if ((p.sede || '').toLowerCase() === sedeSeleccionada.toLowerCase() && p.estado === 'En espera') {
        enEspera.push(p);
      }
    });

    renderizarEspera(enEspera);
  });
}

// ---------- Renderizar Lista en Espera ----------
function renderizarEspera(lista) {
  listaEspera.innerHTML = '';
  if (lista.length === 0) {
    listaEspera.innerHTML = `<li style="color: #94a3b8; justify-content: center;">No hay pacientes en espera</li>`;
    return;
  }

  lista.slice(0, 6).forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <div class="nom">${p.apellidos || ''}, ${p.nombres || ''}</div>
        <div class="est">${p.estudios || '-'}</div>
      </div>
      <span style="font-size: 12px; color: #f59e0b; font-weight: bold;">En espera</span>
    `;
    listaEspera.appendChild(li);
  });
}

// ---------- Historial de Llamados ----------
function agregarAHistorial(turno) {
  historialLlamados.unshift(turno);
  if (historialLlamados.length > 5) historialLlamados.pop();

  listaUltimos.innerHTML = '';
  historialLlamados.forEach((item, index) => {
    const li = document.createElement('li');
    if (index === 0) li.classList.add('llamado-recent');
    li.innerHTML = `
      <div>
        <div class="nom">${item.nombre}</div>
        <div class="est">${item.estudio}</div>
      </div>
      <span style="font-size: 13px; color: #38bdf8; font-weight: bold;">${item.hora || ''}</span>
    `;
    listaUltimos.appendChild(li);
  });
}

// ---------- Reproducción de Timbre (Tilín) + Sintetizador de Voz ----------
function reproducirAnuncio(nombrePaciente, area) {
  if (audioTimbre) {
    audioTimbre.currentTime = 0;
    audioTimbre.play().then(() => {
      // Una vez terminado el timbre de aviso, hablar el mensaje
      setTimeout(() => {
        hablarMensaje(`Paciente ${nombrePaciente}, dirigirse a ${area}`);
      }, 1200);
    }).catch(e => {
      hablarMensaje(`Paciente ${nombrePaciente}, dirigirse a ${area}`);
    });
  }
}

function hablarMensaje(texto) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Cancelar locuciones anteriores

    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = 'es-PE'; // Español Perú / Latino
    mensaje.rate = 0.9;     // Velocidad de voz pausada y clara
    mensaje.pitch = 1.0;    // Tono estándar

    // Buscar una voz en español disponible en el sistema
    const voces = window.speechSynthesis.getVoices();
    const vozEspanol = voces.find(v => v.lang.includes('es'));
    if (vozEspanol) mensaje.voice = vozEspanol;

    window.speechSynthesis.speak(mensaje);
  }
}

// Iniciar Carga de Sedes
cargarSedesModal();
