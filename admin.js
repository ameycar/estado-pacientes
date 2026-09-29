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

/* ==========================================
   UTILIDADES - ENCRIPTACIÓN DE CONTRASEÑA
   ========================================== */
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
        debeCambiarPassword: true, // Habilita la obligatoriedad de cambiar clave en primer acceso por privacidad
        createdAt: Date.now()
      });

      alert(`Usuario '${username}' registrado con éxito. Se requería cambio de contraseña en su primer inicio.`);
      formUsuario.reset();
    } catch (err) {
      alert("Error guardando usuario: " + err.message);
    }
  });
}

if (listaUsuarios) {
  onValue(ref(db, "usuarios"), async (snapUsuarios) => {
    listaUsuarios.innerHTML = "";
    if (!snapUsuarios.exists()) return;

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

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.padding = "8px 12px";
      li.style.borderBottom = "1px solid #eee";

      const info = document.createElement("div");
      info.innerHTML = `
        <strong>${nombres} ${apellidos} (${username})</strong> - <small>${email}</small><br>
        <small>Rol: <b>${rol.toUpperCase()}</b> | Sede: <b>${nombreSede}</b></small>
      `;

      const actions = document.createElement("div");
      const btnDel = document.createElement("button");
      btnDel.textContent = "🗑";
      btnDel.title = "Revocar usuario";
      btnDel.addEventListener("click", () => eliminarUsuario(userKey, username));

      actions.appendChild(btnDel);
      li.appendChild(info);
      li.appendChild(actions);

      listaUsuarios.appendChild(li);
    });
  });
}

async function eliminarUsuario(userKey, username) {
  if (!verificarPasswordAdmin()) return;

  const ok = confirm(`¿Quitar permisos y eliminar al usuario '${username}'?`);
  if (!ok) return;
  try {
    await remove(ref(db, `usuarios/${userKey}`));
  } catch (err) {
    alert("Error al eliminar usuario: " + err.message);
  }
}
