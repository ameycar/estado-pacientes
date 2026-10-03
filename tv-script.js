// tv-script.js (module - Firebase v9)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// =========================================================================
// 🏢 MARCAS, RAZONES SOCIALES Y RUTA EN DISCO/USB (Unidad D:\publicidad_tv\)
// =========================================================================
const MARCAS_CONFIG = {
  "CDI": {
    razonSocial: "Centro de Diagnóstico e Imágenes (CDI)",
    colorPrincipal: "#0284c7",    // Azul Clínico
    colorAcento: "#38bdf8",       // Cían
    colorBanner: "linear-gradient(135deg, #0284c7, #0369a1)",
    carpetaUSB: "file:///D:/publicidad_tv/CDI/",
    videos: ["video1.mp4", "video2.mp4", "promo_cdi.mp4"]
  },
  "GRUPO_QUITO": {
    razonSocial: "Grupo Quito - Servicios Médicos Integrales",
    colorPrincipal: "#3d0a11",    // Borgoña / Vino
    colorAcento: "#f59e0b",       // Ámbar
    colorBanner: "linear-gradient(135deg, #3d0a11, #7f1d1d)",
    carpetaUSB: "file:///D:/publicidad_tv/GRUPO_QUITO/",
    videos: ["video1.mp4", "publicidad_quito.mp4"]
  },
  "RESOTEM": {
    razonSocial: "Resotem - Resonancia y Tomografía Especializada",
    colorPrincipal: "#0f766e",    // Verde Teal / Esmeralda
    colorAcento: "#2dd4bf",       // Turquesa Brilante
    colorBanner: "linear-gradient(135deg, #0f766e, #115e59)",
    carpetaUSB: "file:///D:/publicidad_tv/RESOTEM/",
    videos: ["video1.mp4", "resotem_promo.mp4"]
  }
};

// Variables Globales
let sedeSeleccionada = '';
let marcaActual = {};
let ultimoTurnoId = null;
let historialLlamados = [];
let listaRutasVideos = [];
let indiceVideoActual = 0;

// Elementos DOM
const modalInicial = document.getElementById('selector-sede-modal');
const selectSede = document.getElementById('select-tv-sede');
const selectMarca = document.getElementById('select-tv-marca');
const btnIniciar = document.getElementById('btn-iniciar-tv');

const tvTituloSede = document.getElementById('tv-titulo-sede');
const tvReloj = document.getElementById('tv-reloj');
const tvPacienteNombre = document.getElementById('tv-paciente-nombre');
const tvPacienteArea = document.getElementById('tv-paciente-area');
const listaUltimos = document.getElementById('lista-ultimos-llamados');
const listaEspera = document.getElementById('lista-en-espera');
const audioTimbre = document.getElementById('audio-timbre');

const reproductorVideo = document.getElementById('reproductor-usb');
const fallbackPublicidad = document.getElementById('fallback-publicidad');
const fallbackRazonSocial = document.getElementById('fallback-razon-social');

const bannerLlamado = document.querySelector('.llamado-actual-banner');
const tvHeader = document.querySelector('.tv-header');

// ---------- Cargar Sedes desde Firebase Realtime Database ----------
function cargarSedesModal() {
  if (!selectSede) return;
  onValue(ref(db, 'sedes'), snapshot => {
    selectSede.innerHTML = '';
    if (!snapshot.exists()) {
      const opt = document.createElement('option');
      opt.value = "General";
      opt.textContent = "Sede Principal";
      selectSede.appendChild(opt);
      return;
    }
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
  if (tvReloj) {
    const ahora = new Date();
    tvReloj.textContent = ahora.toLocaleTimeString('es-PE', { hour12: true });
  }
}
setInterval(actualizarReloj, 1000);

// ---------- Aplicar Personalización de Marca y Tema ----------
function aplicarMarca(claveMarca, nombreSede) {
  marcaActual = MARCAS_CONFIG[claveMarca] || MARCAS_CONFIG["CDI"];

  if (tvTituloSede) {
    tvTituloSede.innerHTML = `<i class="fas fa-hospital-user"></i> ${marcaActual.razonSocial} - Sede: ${nombreSede}`;
  }
  if (fallbackRazonSocial) {
    fallbackRazonSocial.textContent = marcaActual.razonSocial;
  }

  if (tvHeader) tvHeader.style.backgroundColor = marcaActual.colorPrincipal;
  if (bannerLlamado) {
    bannerLlamado.style.background = marcaActual.colorBanner;
    bannerLlamado.style.borderColor = marcaActual.colorAcento;
  }
  if (tvReloj) tvReloj.style.color = marcaActual.colorAcento;

  listaRutasVideos = (marcaActual.videos || []).map(v => `${marcaActual.carpetaUSB}${v}`);
  indiceVideoActual = 0;
}

// ---------- Inicio de Pantalla TV ----------
if (btnIniciar) {
  btnIniciar.addEventListener('click', (e) => {
    e.preventDefault();
    sedeSeleccionada = selectSede ? selectSede.value : '';
    const marcaSeleccionada = selectMarca ? selectMarca.value : 'CDI';

    if (!sedeSeleccionada) {
      alert('Por favor seleccione una sede de atención.');
      return;
    }

    // Activar audio
    if (audioTimbre) {
      audioTimbre.play().then(() => {
        audioTimbre.pause();
        audioTimbre.currentTime = 0;
      }).catch(err => console.log("Audio de timbre preparado:", err));
    }

    aplicarMarca(marcaSeleccionada, sedeSeleccionada);
    
    if (modalInicial) modalInicial.style.display = 'none';

    iniciarReproductorVideo();
    escucharTurnoActual();
    escucharListaPacientes();
  });
}

// ---------- Bucle de Video USB (file:///D:/publicidad_tv/...) ----------
function iniciarReproductorVideo() {
  if (!reproductorVideo || listaRutasVideos.length === 0) {
    mostrarFallbackPublicidad();
    return;
  }

  reproductorVideo.src = listaRutasVideos[indiceVideoActual];
  
  const promise = reproductorVideo.play();
  if (promise !== undefined) {
    promise.then(() => {
      reproductorVideo.style.display = 'block';
      if (fallbackPublicidad) fallbackPublicidad.style.display = 'none';
    }).catch(e => {
      console.warn("Aviso de reproducción de video:", e);
      mostrarFallbackPublicidad();
    });
  }

  reproductorVideo.onerror = () => {
    console.warn(`Archivo no encontrado en USB local: ${listaRutasVideos[indiceVideoActual]}`);
    siguienteVideo();
  };

  reproductorVideo.onended = () => {
    siguienteVideo();
  };
}

function siguienteVideo() {
  if (listaRutasVideos.length === 0) return;
  indiceVideoActual = (indiceVideoActual + 1) % listaRutasVideos.length;
  reproductorVideo.src = listaRutasVideos[indiceVideoActual];
  reproductorVideo.play().catch(() => mostrarFallbackPublicidad());
}

function mostrarFallbackPublicidad() {
  if (reproductorVideo) reproductorVideo.style.display = 'none';
  if (fallbackPublicidad) fallbackPublicidad.style.display = 'block';
}

// ---------- Normalizar Claves ----------
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
    
    if (turnoId !== ultimoTurnoId) {
      ultimoTurnoId = turnoId;

      if (tvPacienteNombre) tvPacienteNombre.textContent = turno.nombre || 'PACIENTE';
      if (tvPacienteArea) tvPacienteArea.textContent = `A: ${turno.estudio || 'CONSULTORIO'}`;

      agregarAHistorial(turno);
      reproducirAnuncio(turno.nombre, turno.estudio);
    }
  });
}

// ---------- Escuchar Lista en Espera ----------
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

function renderizarEspera(lista) {
  if (!listaEspera) return;
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
      <span style="font-size: 12px; color: ${marcaActual.colorAcento || '#f59e0b'}; font-weight: bold;">En espera</span>
    `;
    listaEspera.appendChild(li);
  });
}

function agregarAHistorial(turno) {
  if (!listaUltimos) return;
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

// ---------- Timbre + Voz ----------
function reproducirAnuncio(nombrePaciente, area) {
  if (audioTimbre) {
    audioTimbre.currentTime = 0;
    audioTimbre.play().then(() => {
      setTimeout(() => {
        hablarMensaje(`Paciente ${nombrePaciente}, dirigirse a ${area}`);
      }, 1200);
    }).catch(() => {
      hablarMensaje(`Paciente ${nombrePaciente}, dirigirse a ${area}`);
    });
  }
}

function hablarMensaje(texto) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = 'es-PE';
    mensaje.rate = 0.9;
    mensaje.pitch = 1.0;

    const voces = window.speechSynthesis.getVoices();
    const vozEspanol = voces.find(v => v.lang.includes('es'));
    if (vozEspanol) mensaje.voice = vozEspanol;

    window.speechSynthesis.speak(mensaje);
  }
}

// Cargar sedes al iniciar
cargarSedesModal();
