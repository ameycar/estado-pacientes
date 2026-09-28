// admin.js (módulos v9)
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

/* ==========================================
   DOM - ELEMENTOS PARA SEDES
   ========================================== */
const formSede = document.getElementById("formSede");
const listaSedes = document.getElementById("listaSedes");
const inputNombre = document.getElementById("sedeNombre");

/* ==========================================
   DOM - ELEMENTOS PARA USUARIOS
   ========================================== */
const formUsuario = document.getElementById("formUsuario");
const inputEmail = document.getElementById("usuarioEmail");
const selectRol = document.getElementById("usuarioRol");
const selectSedeUsuario = document.getElementById("usuarioSede");
const listaUsuarios = document.getElementById("listaUsuarios");

/* ==========================================
   PASO 1: GESTIÓN DE SEDES
   ========================================== */

/* Agregar sede */
if (formSede) {
  formSede.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = (inputNombre.value || "").trim();
    if (!nombre) return alert("Ingresa nombre de sede.");
    try {
      await push(ref(db, "sedes"), { nombre, createdAt: Date.now() });
      inputNombre.value = "";
    } catch (err) {
      console.error("Error al guardar sede:", err);
      alert("Error al guardar sede: " + (err.message || err));
    }
  });
}

/* Renderizar lista de sedes en tiempo real */
function renderSedes(snapshot) {
  if (!listaSedes) return;
  listaSedes.innerHTML = "";
  if (!snapshot || !snapshot.exists()) return;

  snapshot.forEach((childSnap) => {
    const key = childSnap.key;
    const data = childSnap.val() || {};
    const nombre = data.nombre || "";

    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";

    const span = document.createElement("div");
    span.className = "sede-nombre";
    span.textContent = nombre;

    const actions = document.createElement("div");
    actions.className = "sede-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "edit";
    btnEdit.textContent = "✏️";
    btnEdit.title = "Editar";
    btnEdit.addEventListener("click", () => editarSede(key, nombre));

    const btnDel = document.createElement("button");
    btnDel.className = "del";
    btnDel.textContent = "🗑";
    btnDel.title = "Eliminar";
    btnDel.addEventListener("click", () => eliminarSede(key, nombre));

    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    li.appendChild(span);
    li.appendChild(actions);

    listaSedes.appendChild(li);
  });
}

/* Escuchar sedes en tiempo real */
onValue(ref(db, "sedes"), (snap) => {
  renderSedes(snap);
  actualizarSelectSedesUsuarios(snap);
}, (err) => {
  console.error("Error escuchando sedes:", err);
});

/* Editar sede */
async function editarSede(id, currentName) {
  const nuevo = prompt("Editar nombre de la sede:", currentName);
  if (!nuevo) return;
  const trimmed = nuevo.trim();
  if (!trimmed) return alert("Nombre inválido.");
  try {
    await update(ref(db, `sedes/${id}`), { nombre: trimmed, updatedAt: Date.now() });
  } catch (err) {
    console.error("Error editando sede:", err);
    alert("Error al editar sede: " + (err.message || err));
  }
}

/* Eliminar sede */
async function eliminarSede(id, currentName) {
  const ok = confirm(`Eliminar sede "${currentName}" ? (Se recomienda inactivar en producción)`);
  if (!ok) return;
  try {
    await remove(ref(db, `sedes/${id}`));
  } catch (err) {
    console.error("Error eliminando sede:", err);
    alert("Error al eliminar sede: " + (err.message || err));
  }
}

/* Helper: cargar sedes en un select genérico */
export async function cargarSedesEnSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">Seleccione Sede</option>`;
  try {
    const snap = await get(child(ref(db), "sedes"));
    if (!snap.exists()) return;
    snap.forEach(childSnap => {
      const opt = document.createElement("option");
      opt.value = childSnap.key;
      opt.textContent = (childSnap.val() || {}).nombre || "";
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Error cargando sedes para select:", e);
  }
}


/* ==========================================
   PASO 2: GESTIÓN DE USUARIOS Y ROLES POR SEDE
   ========================================== */

/**
 * Mantiene actualizado automáticamente el <select> de sedes en el formulario de usuarios
 */
function actualizarSelectSedesUsuarios(snapshot) {
  if (!selectSedeUsuario) return;
  selectSedeUsuario.innerHTML = '<option value="">Seleccione Sede</option>';
  
  // Opción para administradores
  const optAdmin = document.createElement("option");
  optAdmin.value = "TODAS";
  optAdmin.textContent = "TODAS (Acceso Total Admin)";
  selectSedeUsuario.appendChild(optAdmin);

  if (!snapshot || !snapshot.exists()) return;

  snapshot.forEach((childSnap) => {
    const key = childSnap.key;
    const data = childSnap.val() || {};
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = data.nombre || key;
    selectSedeUsuario.appendChild(opt);
  });
}

/* Registrar / Asignar Sede a un Usuario */
if (formUsuario) {
  formUsuario.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (inputEmail.value || "").trim().toLowerCase();
    const rol = selectRol ? selectRol.value : "sede";
    const sedeId = selectSedeUsuario ? selectSedeUsuario.value : "";

    if (!email) return alert("Ingresa el correo del usuario.");
    if (!sedeId) return alert("Selecciona la sede asignada para este usuario.");

    // Sanitizar el email para usarlo como clave en Realtime Database (reemplazar puntos)
    const emailKey = email.replace(/\./g, "_at_");

    try {
      await set(ref(db, `usuarios/${emailKey}`), {
        email: email,
        rol: rol,
        sedeId: sedeId,
        updatedAt: Date.now()
      });

      alert(`Usuario ${email} configurado correctamente.`);
      inputEmail.value = "";
      if (selectSedeUsuario) selectSedeUsuario.value = "";
    } catch (err) {
      console.error("Error guardando usuario:", err);
      alert("Error guardando usuario: " + (err.message || err));
    }
  });
}

/* Escuchar y renderizar lista de usuarios */
if (listaUsuarios) {
  onValue(ref(db, "usuarios"), async (snapUsuarios) => {
    listaUsuarios.innerHTML = "";
    if (!snapUsuarios.exists()) return;

    // Obtener sedes para mapear IDs a Nombres
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
      const email = data.email || userKey;
      const rol = data.rol || "operador";
      const sedeId = data.sedeId || "";
      const nombreSede = sedesMap[sedeId] || "Sin asignación";

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";

      const info = document.createElement("div");
      info.innerHTML = `<strong>${email}</strong> <br><small>Rol: ${rol} | Sede: ${nombreSede}</small>`;

      const actions = document.createElement("div");

      const btnDel = document.createElement("button");
      btnDel.className = "del";
      btnDel.textContent = "🗑";
      btnDel.title = "Eliminar permiso";
      btnDel.addEventListener("click", () => eliminarUsuario(userKey, email));

      actions.appendChild(btnDel);
      li.appendChild(info);
      li.appendChild(actions);

      listaUsuarios.appendChild(li);
    });
  });
}

/* Eliminar configuración de usuario */
async function eliminarUsuario(userKey, email) {
  const ok = confirm(`¿Quitar configuración y permisos para ${email}?`);
  if (!ok) return;
  try {
    await remove(ref(db, `usuarios/${userKey}`));
  } catch (err) {
    console.error("Error eliminando usuario:", err);
    alert("Error al eliminar usuario: " + (err.message || err));
  }
}
