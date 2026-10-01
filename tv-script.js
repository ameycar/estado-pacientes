// tv-script.js (module - Firebase v9)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// =========================================================================
// 🏢 MATRIZ CONFIGURACIÓN DE SEDES / RAZÓN SOCIAL Y RUTAS DE USB (D:\publicidad_tv\)
// =========================================================================
const MAPA_MARCAS_SEDES = {
  // MARCA: CDI
  "CDI": {
    razonSocial: "Centro de Diagnóstico e Imágenes (CDI)",
    colorPrincipal: "#0284c7",    // Azul Clínico
    colorAcento: "#38bdf8",       // Cían
    colorBanner: "linear-gradient(135deg, #0284c7, #0369a1)",
    carpetaUSB: "file:///D:/publicidad_tv/CDI/",
    videos: ["video1.mp4", "video2.mp4", "promo_cdi.mp4"]
  },
  
  // MARCA: GRUPO QUITO
  "GRUPO_QUITO": {
    razonSocial: "Grupo Quito - Servicios Médicos Integrales",
    colorPrincipal: "#3d0a11",    // Borgoña / Vino
    colorAcento: "#f59e0b",       // Ámbar
    colorBanner: "linear-gradient(135deg, #3d0a11, #7f1d1d)",
    carpetaUSB: "file:///D:/publicidad_tv/GRUPO_QUITO/",
    videos: ["video1.mp4", "publicidad_quito.mp4"]
  },

  // MARCA: RESOTEM
  "RESOTEM": {
    razonSocial: "Resotem - Resonancia y Tomografía Especializada",
    colorPrincipal: "#0f766e",    // Verde Teal / Esmeralda
    colorAcento: "#2dd4bf",       // Turquesa Brilante
    colorBanner: "linear-gradient(135deg, #0f766e, #115e59)",
    carpetaUSB: "file:///D:/publicidad_tv/RESOTEM/",
    videos: ["video1.mp4", "resotem_promo.mp4"]
  }
};

// Asignación de Sedes a su Marca/Razón Social correspondiente
const SEDE_A_MARCA = {
  // Asigna aquí el nombre de tus sedes en Firebase a la Marca de la USB
  "Grau Central": "GRUPO_QUITO",
  "San Isidro": "CDI",
  "Miraflores": "RESOTEM",
  "Surco": "CDI"
};

// Configuración por defecto si la sede no tiene asignación explícita
const MARCA_DEFECTO = {
  razonSocial: "Centro de Atención Médica",
  colorPrincipal: "#1e293b",
  colorAcento: "#38bdf8",
  colorBanner: "linear-gradient(135deg, #0284c7, #0369a1)",
  carpetaUSB: "file:///D:/publicidad_tv/CDI/",
  videos: ["video1.mp4"]
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

// ---------- Cargar Sedes desde Firebase ----------
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

// ---------- Aplicar Personalización de Marca según Sede ----------
function aplicarMarcaSede(nombreSede) {
  // 1. Identificar la marca asignada
  const claveMarca = SEDE_A_MARCA[nombreSede] || "CDI";
  marcaActual = MAPA_MARCAS_SEDES[claveMarca] || MARCA_DEFECTO;

  // 2. Personalizar Título y Razón Social
  if (tvTituloSede) {
    tvTituloSede.innerHTML = `<i class="fas fa-hospital-user"></i> ${marcaActual.razonSocial} - Sede: ${nombreSede}`;
  }
  if (fallbackRazonSocial) {
    fallbackRazonSocial.textContent = marcaActual.razonSocial;
  }

  // 3. Personalizar Colores Visuales
  if (tvHeader) tvHeader.style.backgroundColor = marcaActual.colorPrincipal;
  if (bannerLlamado) {
    bannerLlamado.style.background = marcaActual.colorBanner;
    bannerLlamado.style.borderColor = marcaActual.colorAcento;
  }
  if (tvReloj) tvReloj.style.color = marcaActual.colorAcento;

  // 4. Construir rutas completas a la USB (Unidad D:)
  listaRutasVideos = (marcaActual.videos || []).map(v => `${marcaActual.carpetaUSB}${v}`);
  indiceVideoActual = 0;
}

// ---------- Inicio de Pantalla TV ----------
btnIniciar.addEventListener('click', () => {
  sedeSeleccionada = selectSede.value;
  if (!sedeSeleccionada) return alert('Por favor seleccione una sede.');

  // Desbloqueo de audio para alertas de voz
  audioTimbre.play().then(() => {
    audioTimbre.pause();
    audioTimbre.currentTime = 0;
  }).catch(e => console.log("Audio listo"));

  aplicarMarcaSede(sedeSeleccionada);
  modalInicial.style.display = 'none';

  iniciarReproductorVideo();
  escucharTurnoActual();
  escucharListaPacientes();
});

// ---------- Bucle de Video USB (file:///D:/publicidad_tv/...) ----------
function iniciarReproductorVideo() {
  if (!reproductorVideo || listaRutasVideos.length === 0) {
    mostrarFallbackPublicidad();
    return;
  }

  reproductorVideo.src = listaRutasVideos[indiceVideoActual];
  reproductorVideo.play().then(() => {
    reproductorVideo.style.display = 'block';
    if (fallbackPublicidad) fallbackPublicidad.style.display = 'none';
  }).catch(e => {
    console.warn("No se pudo reproducir el video USB local:", e);
    mostrarFallbackPublicidad();
  });

  reproductorVideo.onerror = () => {
    console.warn(`Archivo de video no encontrado en la USB: ${listaRutasVideos[indiceVideoActual]}`);
    // Pasar al siguiente video si falla el archivo
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

      tvPacienteNombre.textContent = turno.nombre || 'PACIENTE';
      tvPacienteArea.textContent = `A: ${turno.estudio || 'CONSULTORIO'}`;

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
    }).catch(e => {
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

// Iniciar Carga de Sedes
cargarSedesModal();
