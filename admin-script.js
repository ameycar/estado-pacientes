// admin-script.js (module - Firebase v9)
import { db } from "./firebase-config.js";
import { ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const formSede = document.getElementById('form-sede');
const tablaSedesBody = document.querySelector('#tabla-sedes tbody');

const formUsuario = document.getElementById('form-usuario');
const tablaUsuariosBody = document.querySelector('#tabla-usuarios tbody');

const ADMIN_PASS = '1234';

// ---------- SEDES CRUD ----------
function cargarSedes() {
  onValue(ref(db, 'sedes'), snapshot => {
    tablaSedesBody.innerHTML = '';
    snapshot.forEach(child => {
      const s = child.val(); s.key = child.key;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px;border:1px solid #ddd">${s.name || s.nombre || ''}</td>
        <td style="padding:8px;border:1px solid #ddd">${s.address || s.direccion || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${s.active !== false ? 'Sí' : 'No'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">
          <button onclick="editarSede('${s.key}')">Editar</button>
          <button onclick="eliminarSede('${s.key}')">Eliminar</button>
        </td>
      `;
      tablaSedesBody.appendChild(tr);
    });
  });
}

if (formSede) {
  formSede.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('sedeNombre').value.trim();
    const direccion = document.getElementById('sedeDireccion').value.trim();
    const activa = document.getElementById('sedeActiva').checked;
    if (!name) return alert('Ingrese nombre de sede');
    push(ref(db, 'sedes'), { name, address: direccion, active: !!activa });
    formSede.reset();
  });
}

window.editarSede = function(key) {
  const newName = prompt('Nuevo nombre de la sede (vacío = cancelar):');
  if (!newName) return;
  const newDir = prompt('Nueva dirección (vacío = no cambiar):');
  update(ref(db, 'sedes/' + key), { name: newName, address: newDir === null ? undefined : newDir });
};

window.eliminarSede = function(key) {
  const pass = prompt('Ingrese contraseña de admin para eliminar sede:');
  if (pass === ADMIN_PASS) {
    remove(ref(db, 'sedes/' + key));
  } else alert('Contraseña incorrecta.');
};

// ---------- USUARIOS CRUD ----------
function cargarUsuarios() {
  onValue(ref(db, 'usuarios'), snapshot => {
    tablaUsuariosBody.innerHTML = '';
    snapshot.forEach(child => {
      const u = child.val(); u.key = child.key;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px;border:1px solid #ddd">${u.username || ''}</td>
        <td style="padding:8px;border:1px solid #ddd">${u.displayName || ''}</td>
        <td style="padding:8px;border:1px solid #ddd">${u.role || ''}</td>
        <td style="padding:8px;border:1px solid #ddd">${u.sede || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">
          <button onclick="eliminarUsuario('${u.key}')">Eliminar</button>
        </td>
      `;
      tablaUsuariosBody.appendChild(tr);
    });
  });
}

if (formUsuario) {
  formUsuario.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('user_username').value.trim();
    const display = document.getElementById('user_display').value.trim();
    const password = document.getElementById('user_password').value;
    const role = document.getElementById('user_role').value;
    const sede = document.getElementById('user_sede').value.trim();

    if (!username || !password) return alert('username y password requeridos');
    push(ref(db, 'usuarios'), { username, displayName: display, password, role, sede });
    formUsuario.reset();
  });
}

window.eliminarUsuario = function(key) {
  const pass = prompt('Ingrese contraseña de admin para eliminar usuario:');
  if (pass === ADMIN_PASS) {
    remove(ref(db, 'usuarios/' + key));
  } else alert('Contraseña incorrecta.');
};

// ---------- Inicializar ----------
cargarSedes();
cargarUsuarios();

// Exponer mostrarSeccion si falta
window.mostrarSeccion = window.mostrarSeccion || function(id){
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
};
