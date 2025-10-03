// admin-script.js
import { db } from "./firebase-config.js";
import { ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const form = document.getElementById('form-sede');
const tabla = document.getElementById('tabla-sedes').querySelector('tbody');
const ADMIN_PASS = '1234';

function renderSedes(snapshotVal) {
  tabla.innerHTML = '';
  snapshotVal && Object.entries(snapshotVal).forEach(([key, s]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:8px;border:1px solid #ddd">${s.nombre}</td>
      <td style="padding:8px;border:1px solid #ddd">${s.direccion || ''}</td>
      <td style="padding:8px;border:1px solid #ddd; text-align:center">${s.activa ? 'Sí' : 'No'}</td>
      <td style="padding:8px;border:1px solid #ddd; text-align:center">
        <button data-key="${key}" class="editar">✏️</button>
        <button data-key="${key}" class="eliminar">🗑️</button>
      </td>`;
    tabla.appendChild(tr);
  });

  // listeners botones
  tabla.querySelectorAll('.eliminar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.getAttribute('data-key');
      const pass = prompt('Ingrese contraseña admin para eliminar sede:');
      if (pass === ADMIN_PASS) {
        remove(ref(db, 'sedes/' + key));
      } else alert('Contraseña incorrecta.');
    });
  });

  tabla.querySelectorAll('.editar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.getAttribute('data-key');
      const s = window.sedesCache && window.sedesCache[key];
      if (!s) return;
      const nuevoNombre = prompt('Editar nombre', s.nombre);
      if (nuevoNombre !== null) update(ref(db, 'sedes/' + key), { nombre: nuevoNombre });
    });
  });
}

onValue(ref(db, 'sedes'), snap => {
  const val = snap.val();
  window.sedesCache = val || {};
  renderSedes(val);
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const nombre = document.getElementById('sedeNombre').value.trim();
  const direccion = document.getElementById('sedeDireccion').value.trim();
  const activa = document.getElementById('sedeActiva').checked;
  if (!nombre) return alert('Nombre requerido');
  push(ref(db, 'sedes'), { nombre, direccion, activa });
  form.reset();
});
