// admin.js (módulos v9)
import { db } from "./firebase.js";
import {
  ref,
  push,
  onValue,
  update,
  remove,
  get,
  child
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

/* DOM */
const formSede = document.getElementById("formSede");
const listaSedes = document.getElementById("listaSedes");
const inputNombre = document.getElementById("sedeNombre");

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

/* Renderizar lista en tiempo real */
function renderSedes(snapshot) {
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

/* Escuchar sedes */
onValue(ref(db, "sedes"), (snap) => renderSedes(snap), (err) => {
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

/* Helper: cargar sedes en un select (si otro módulo lo necesita) */
export async function cargarSedesEnSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">Seleccione</option>`;
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
