// admin.js
import { db } from "./firebase.js";
import {
  ref,
  push,
  onValue,
  update,
  remove,
  get,
  child,
  set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Contraseña maestra para acciones sensibles de administración
const ADMIN_PASSWORD = "admin"; // Puedes cambiar esta clave por la que prefieras

/* DOM - SEDES */
const formSede = document.getElementById("formSede");
const listaSedes = document.getElementById("listaSedes");
const inputNombre = document.getElementById("sedeNombre");

/* DOM - USUARIOS */
const formUsuario = document.getElementById("formUsuario");
const inputNombres = document.getElementById("usuarioNombres");
const inputApellidos = document.getElementById("usuarioApellidos");
const inputUsername = document.getElementById("usuarioUsername");
const inputEmail = document.getElementById("usuarioEmail");
const inputClave = document.getElementById("usuarioClave");
const selectRol = document.getElementById("usuarioRol");
const selectSedeUsuario = document.getElementById("usuarioSede");
const listaUsuarios = document.getElementById("listaUsuarios");

/* DOM - PERSONALIZACIÓN REMOTA TV */
const btnGuardarCfg = document.getElementById("btn-guardar-cfg-tv");
const selectMarcaCfg = document.getElementById("cfg-tv-marca");
const inputLogoFile = document.getElementById("cfg-logo-file");
const previewLogoImg = document.getElementById("preview-logo-img");

let logoBase64Actual = "";

/* ==========================================
   UTILIDADES
   ========================================== */
function keyify(s) {
  if (!s) return 'sin_sede';
  return String(s).replace(/[^\w]/g, '_').toLowerCase();
}

async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Función para solicitar contraseña
function verificarPasswordAdmin() {
  const pass = prompt("Ingrese la contraseña de Administrador para realizar esta acción:");
  if (pass === null) return false; // Cancelado
  if (pass !== ADMIN_PASSWORD) {
    alert("Contraseña incorrecta. Acción denegada.");
    return false;
  }
  return true;
}

/* ==========================================
   1. GESTIÓN DE SEDES
   ========================================== */

if (formSede) {
  formSede.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = (inputNombre.value || "").trim();
    if (!nombre) return alert("Ingresa el nombre de la sede.");

    try {
      await push(ref(db, "sedes"), {
        nombre: nombre,
        activo: true,
        createdAt: Date.now()
      });
      inputNombre.value = "";
    } catch (err) {
      alert("Error al guardar sede: " + (err.message || err));
    }
  });
}

function renderSedes(snapshot) {
  if (!listaSedes) return;
  listaSedes.innerHTML = "";
  if (!snapshot || !snapshot.exists()) {
    listaSedes.innerHTML = "<li style='padding:10px; color:#666;'>No hay sedes registradas.</li>";
    return;
  }

  snapshot.forEach((childSnap) => {
    const key = childSnap.key;
    const data = childSnap.val() || {};
    const nombre = data.nombre || "";
    const activo = data.activo !== false; // Por defecto activo

    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px 12px";
    li.style.borderBottom = "1px solid #eee";
    if (!activo) {
      li.style.opacity = "0.5";
      li.style.backgroundColor = "#f9f9f9";
    }

    const span = document.createElement("div");
    span.innerHTML = `<strong>${nombre}</strong> ${!activo ? "<small style='color:red;'> (Inactiva)</small>" : ""}`;

    const actions = document.createElement("div");
    actions.className = "sede-actions";

    // Botón Editar (requiere clave)
    const btnEdit = document.createElement("button");
    btnEdit.textContent = "✏️";
    btnEdit.title = "Editar nombre";
    btnEdit.style.marginRight = "6px";
    btnEdit.addEventListener("click", () => editarSede(key, nombre));

    // Botón Inhabilitar / Habilitar
    const btnToggle = document.createElement("button");
    btnToggle.textContent = activo ? "🚫 Inhabilitar" : "✅ Activar";
    btnToggle.style.marginRight = "6px";
    btnToggle.addEventListener("click", () => toggleSede(key, nombre, activo));

    // Botón Eliminar (requiere clave)
    const btnDel = document.createElement("button");
    btnDel.textContent = "🗑";
    btnDel.title = "Eliminar de la BD";
    btnDel.addEventListener("click", () => eliminarSede(key, nombre));

    actions.appendChild(btnEdit);
    actions.appendChild(btnToggle);
    actions.appendChild(btnDel);

    li.appendChild(span);
    li.appendChild(actions);

    listaSedes.appendChild(li);
  });
}

// Escuchar sedes en tiempo real
onValue(ref(db, "sedes"), (snap) => {
  renderSedes(snap);
  actualizarSelectSedesUsuarios(snap);
});

async function editarSede(id, currentName) {
  if (!verificarPasswordAdmin()) return;

  const nuevo = prompt("Nuevo nombre para la sede:", currentName);
  if (!nuevo) return;
  const trimmed = nuevo.trim();
  if (!trimmed) return alert("Nombre inválido.");

  try {
    await update(ref(db, `sedes/${id}`), { nombre: trimmed, updatedAt: Date.now() });
    alert("Sede actualizada con éxito.");
  } catch (err) {
    alert("Error al editar sede: " + err.message);
  }
}

async function toggleSede(id, nombre, estadoActual) {
  const accion = estadoActual ? "inhabilitar" : "activar";
  if (!confirm(`¿Deseas ${accion} la sede "${nombre}"?`)) return;

  try {
    await update(ref(db, `sedes/${id}`), { activo: !estadoActual });
  } catch (err) {
    alert("Error al cambiar estado: " + err.message);
  }
}

async function eliminarSede(id, currentName) {
  if (!verificarPasswordAdmin()) return;

  const ok = confirm(`¿Está seguro de eliminar permanentemente la sede "${currentName}"?\nSe recomienda únicamente inhabilitarla.`);
  if (!ok) return;

  try {
    await remove(ref(db, `sedes/${id}`));
  } catch (err) {
    alert("Error al eliminar sede: " + err.message);
  }
}

/* ==========================================
   2. GESTIÓN DE USUARIOS
   ========================================== */

function actualizarSelectSedesUsuarios(snapshot) {
  if (!selectSedeUsuario) return;
  selectSedeUsuario.innerHTML = '<option value="">Seleccione Sede</option>';

  const optAdmin = document.createElement("option");
  optAdmin.value = "TODAS";
  optAdmin.textContent = "TODAS (Acceso Total Admin)";
  selectSedeUsuario.appendChild(optAdmin);

  if (!snapshot || !snapshot.exists()) return;

  snapshot.forEach((childSnap) => {
    const key = childSnap.key;
    const data = childSnap.val() || {};
    if (data.activo !== false) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = data.nombre || key;
      selectSedeUsuario.appendChild(opt);
    }
  });
}

if (formUsuario) {
  formUsuario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombres = (inputNombres.value || "").trim();
    const apellidos = (inputApellidos.value || "").trim();
    const username = (inputUsername.value || "").trim().toLowerCase();
    const email = (inputEmail.value || "").trim().toLowerCase();
    const claveRaw = (inputClave.value || "").trim();
    const rol = selectRol ? selectRol.value : "registrador";
    const sedeId = selectSedeUsuario ? selectSedeUsuario.value : "";
    const nombreSedeTexto = selectSedeUsuario ? selectSedeUsuario.options[selectSedeUsuario.selectedIndex].text : "";

    if (!nombres || !apellidos || !username || !email || !claveRaw || !sedeId || !rol) {
      return alert("Complete todos los campos del formulario de registro.");
    }

    // Clave encriptada SHA-256
    const passwordHash = await hashPassword(claveRaw);
    const userKey = username.replace(/[^\w]/g, "_");

    try {
      await set(ref(db, `usuarios/${userKey}`), {
        nombres: nombres,
        apellidos: apellidos,
        username: username,
        email: email,
        passwordHash: passwordHash,
        rol: rol,
        sedeId: sedeId,
        sede: nombreSedeTexto,
        activo: true, // Estado activo por defecto
        debeCambiarPassword: true, // Forzar cambio al ingresar por privacidad
        createdAt: Date.now()
      });

      alert(`Usuario '${username}' registrado con éxito. Debe cambiar contraseña en su primer inicio.`);
      formUsuario.reset();
    } catch (err) {
      alert("Error guardando usuario: " + err.message);
    }
  });
}

if (listaUsuarios) {
  onValue(ref(db, "usuarios"), async (snapUsuarios) => {
    listaUsuarios.innerHTML = "";
    if (!snapUsuarios.exists()) {
      listaUsuarios.innerHTML = "<li style='padding:10px; color:#666;'>No hay usuarios registrados.</li>";
      return;
    }

    const snapSedes = await get(child(ref(db), "sedes"));
    const sedesMap = {};
    if (snapSedes.exists()) {
      snapSedes.forEach(s => {
        sedesMap[s.key] = (s.val() || {}).nombre || s.key;
      });
    }
    sedesMap["TODAS"] = "TODAS (Acceso Total)";

    snapUsuarios.forEach((childSnap) => {
      const userKey = childSnap.key;
      const data = childSnap.val() || {};
      const nombres = data.nombres || "";
      const apellidos = data.apellidos || "";
      const username = data.username || userKey;
      const email = data.email || "Sin correo";
      const rol = data.rol || "operador";
      const sedeId = data.sedeId || "";
      const nombreSede = data.sede || sedesMap[sedeId] || "Sin asignación";
      const activo = data.activo !== false; // Por defecto activo

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.padding = "10px 12px";
      li.style.borderBottom = "1px solid #eee";
      if (!activo) {
        li.style.opacity = "0.5";
        li.style.backgroundColor = "#f9f9f9";
      }

      const info = document.createElement("div");
      info.innerHTML = `
        <strong>${nombres} ${apellidos} (${username})</strong> ${!activo ? "<small style='color:red;'> (Inactivo)</small>" : ""} - <small>${email}</small><br>
        <small>Rol: <b>${rol.toUpperCase()}</b> | Sede: <b>${nombreSede}</b></small>
      `;

      const actions = document.createElement("div");
      actions.className = "user-actions";

      // Botón Editar Usuario (Nombres, Apellidos, Rol)
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "✏️";
      btnEdit.title = "Editar usuario";
      btnEdit.style.marginRight = "6px";
      btnEdit.addEventListener("click", () => editarUsuario(userKey, data));

      // Botón Cambiar / Resetear Contraseña
      const btnResetPass = document.createElement("button");
      btnResetPass.textContent = "🔑";
      btnResetPass.title = "Resetear contraseña";
      btnResetPass.style.marginRight = "6px";
      btnResetPass.addEventListener("click", () => resetearClaveUsuario(userKey, username));

      // Botón Inhabilitar / Habilitar Usuario
      const btnToggle = document.createElement("button");
      btnToggle.textContent = activo ? "🚫 Inhabilitar" : "✅ Activar";
      btnToggle.style.marginRight = "6px";
      btnToggle.addEventListener("click", () => toggleUsuario(userKey, username, activo));

      // Botón Eliminar de la BD
      const btnDel = document.createElement("button");
      btnDel.textContent = "🗑";
      btnDel.title = "Eliminar de la BD";
      btnDel.addEventListener("click", () => eliminarUsuario(userKey, username));

      actions.appendChild(btnEdit);
      actions.appendChild(btnResetPass);
      actions.appendChild(btnToggle);
      actions.appendChild(btnDel);

      li.appendChild(info);
      li.appendChild(actions);

      listaUsuarios.appendChild(li);
    });
  });
}

// Editar Datos Básicos de Usuario (Requiere clave admin)
async function editarUsuario(userKey, dataActual) {
  if (!verificarPasswordAdmin()) return;

  const nuevosNombres = prompt("Nombres:", dataActual.nombres || "");
  if (nuevosNombres === null) return;
  
  const nuevosApellidos = prompt("Apellidos:", dataActual.apellidos || "");
  if (nuevosApellidos === null) return;

  const nuevoRol = prompt("Rol (registrador, visualizador, llamador, estadistica, admin):", dataActual.rol || "registrador");
  if (nuevoRol === null) return;

  try {
    await update(ref(db, `usuarios/${userKey}`), {
      nombres: nuevosNombres.trim(),
      apellidos: nuevosApellidos.trim(),
      rol: nuevoRol.trim().toLowerCase(),
      updatedAt: Date.now()
    });
    alert("Datos de usuario actualizados correctamente.");
  } catch (err) {
    alert("Error al actualizar usuario: " + err.message);
  }
}

// Resetear Contraseña (Requiere clave admin)
async function resetearClaveUsuario(userKey, username) {
  if (!verificarPasswordAdmin()) return;

  const nuevaClave = prompt(`Ingrese la nueva contraseña temporal para '${username}':`);
  if (!nuevaClave) return;

  const trimmedClave = nuevaClave.trim();
  if (!trimmedClave) return alert("Contraseña no válida.");

  try {
    const passwordHash = await hashPassword(trimmedClave);
    await update(ref(db, `usuarios/${userKey}`), {
      passwordHash: passwordHash,
      debeCambiarPassword: true, // Forzar cambio en primer acceso
      updatedAt: Date.now()
    });
    alert(`Contraseña actualizada para '${username}'. Se le requerirá cambiarla al iniciar sesión.`);
  } catch (err) {
    alert("Error al resetear contraseña: " + err.message);
  }
}

// Inhabilitar / Activar Usuario
async function toggleUsuario(userKey, username, estadoActual) {
  const accion = estadoActual ? "inhabilitar" : "activar";
  if (!confirm(`¿Deseas ${accion} al usuario '${username}'?`)) return;

  try {
    await update(ref(db, `usuarios/${userKey}`), { activo: !estadoActual });
  } catch (err) {
    alert("Error al cambiar estado del usuario: " + err.message);
  }
}

// Eliminar Usuario de la BD (Requiere clave admin)
async function eliminarUsuario(userKey, username) {
  if (!verificarPasswordAdmin()) return;

  const ok = confirm(`¿Está seguro de eliminar permanentemente al usuario '${username}'?\nSe recomienda únicamente inhabilitarlo.`);
  if (!ok) return;

  try {
    await remove(ref(db, `usuarios/${userKey}`));
  } catch (err) {
    alert("Error al eliminar usuario: " + err.message);
  }
}

/* ==========================================
   3. PERSONALIZACIÓN REMOTA COMPLETA DE PANTALLAS TV POR MARCA
   ========================================== */

// Lector de archivo de imagen (Convierte PNG/JPG a Base64)
if (inputLogoFile) {
  inputLogoFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Límite recomendado 1MB
        alert("La imagen es muy grande. Por favor selecciona un logo de menos de 1MB.");
        inputLogoFile.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        logoBase64Actual = event.target.result;
        if (previewLogoImg) {
          previewLogoImg.src = logoBase64Actual;
          previewLogoImg.style.display = "block";
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

// Cargar configuración guardada al cambiar la Marca seleccionada
function cargarConfiguracionMarca(marcaClave) {
  onValue(ref(db, `configuracion_tv/${marcaClave}`), (snapshot) => {
    const config = snapshot.val();
    if (!config) {
      logoBase64Actual = "";
      if (previewLogoImg) previewLogoImg.style.display = "none";
      return;
    }

    // 1. Colores Principales y Banners
    if (config.colorHeader && document.getElementById('cfg-color-header')) document.getElementById('cfg-color-header').value = config.colorHeader;
    if (config.colorAcento && document.getElementById('cfg-color-acento')) document.getElementById('cfg-color-acento').value = config.colorAcento;
    if (config.colorBanner && document.getElementById('cfg-color-banner')) document.getElementById('cfg-color-banner').value = config.colorBanner;
    if (config.colorFooterBg && document.getElementById('cfg-color-footer-bg')) document.getElementById('cfg-color-footer-bg').value = config.colorFooterBg;
    if (config.colorFooterText && document.getElementById('cfg-color-footer-text')) document.getElementById('cfg-color-footer-text').value = config.colorFooterText;

    // 2. Tipografía y Fuentes
    if (config.fontFamily && document.getElementById('cfg-font-family')) document.getElementById('cfg-font-family').value = config.fontFamily;
    if (config.fontSizeScale && document.getElementById('cfg-font-size-scale')) document.getElementById('cfg-font-size-scale').value = config.fontSizeScale;

    // 3. Tarjetas de Pacientes
    if (config.colorCardBg && document.getElementById('cfg-color-card-bg')) document.getElementById('cfg-color-card-bg').value = config.colorCardBg;
    if (config.colorCardText && document.getElementById('cfg-color-card-text')) document.getElementById('cfg-color-card-text').value = config.colorCardText;

    // 4. Logo y Disposición
    if (config.posicionVideo && document.getElementById('cfg-pos-video')) document.getElementById('cfg-pos-video').value = config.posicionVideo;
    if (document.getElementById('cfg-chk-ultimos')) document.getElementById('cfg-chk-ultimos').checked = config.mostrarUltimos !== false;
    if (document.getElementById('cfg-chk-espera')) document.getElementById('cfg-chk-espera').checked = config.mostrarEspera !== false;

    if (config.logoUrl) {
      logoBase64Actual = config.logoUrl;
      if (previewLogoImg) {
        previewLogoImg.src = config.logoUrl;
        previewLogoImg.style.display = "block";
      }
    } else {
      logoBase64Actual = "";
      if (previewLogoImg) previewLogoImg.style.display = "none";
    }
  }, { onlyOnce: true });
}

if (selectMarcaCfg) {
  selectMarcaCfg.addEventListener("change", () => {
    cargarConfiguracionMarca(selectMarcaCfg.value);
  });
  // Carga inicial al cargar el módulo admin
  cargarConfiguracionMarca(selectMarcaCfg.value);
}

if (btnGuardarCfg) {
  btnGuardarCfg.addEventListener('click', () => {
    const marcaClave = selectMarcaCfg ? selectMarcaCfg.value : '';
    if (!marcaClave) return alert('Seleccione una marca comercial para personalizar.');

    const configuracion = {
      // 1. Colores y Banners
      colorHeader: document.getElementById('cfg-color-header') ? document.getElementById('cfg-color-header').value : '#3d0a11',
      colorAcento: document.getElementById('cfg-color-acento') ? document.getElementById('cfg-color-acento').value : '#f59e0b',
      colorBanner: document.getElementById('cfg-color-banner') ? document.getElementById('cfg-color-banner').value : 'linear-gradient(135deg, #0284c7, #0369a1)',
      colorFooterBg: document.getElementById('cfg-color-footer-bg') ? document.getElementById('cfg-color-footer-bg').value : '#0f172a',
      colorFooterText: document.getElementById('cfg-color-footer-text') ? document.getElementById('cfg-color-footer-text').value : '#ffffff',

      // 2. Tipografía y Tamaño
      fontFamily: document.getElementById('cfg-font-family') ? document.getElementById('cfg-font-family').value : "'Segoe UI', sans-serif",
      fontSizeScale: document.getElementById('cfg-font-size-scale') ? document.getElementById('cfg-font-size-scale').value : "100%",

      // 3. Tarjetas
      colorCardBg: document.getElementById('cfg-color-card-bg') ? document.getElementById('cfg-color-card-bg').value : '#ffffff',
      colorCardText: document.getElementById('cfg-color-card-text') ? document.getElementById('cfg-color-card-text').value : '#1e293b',

      // 4. Logo y Posición
      logoUrl: logoBase64Actual,
      posicionVideo: document.getElementById('cfg-pos-video') ? document.getElementById('cfg-pos-video').value : 'izquierda',
      mostrarUltimos: document.getElementById('cfg-chk-ultimos') ? document.getElementById('cfg-chk-ultimos').checked : true,
      mostrarEspera: document.getElementById('cfg-chk-espera') ? document.getElementById('cfg-chk-espera').checked : true,
      updatedAt: Date.now()
    };

    set(ref(db, `configuracion_tv/${marcaClave}`), configuracion)
      .then(() => {
        alert(`¡Configuración de diseño enviada para la marca '${marcaClave}' exitosamente!`);
      })
      .catch((err) => {
        alert("Error al guardar en Firebase: " + err.message);
      });
  });
}
