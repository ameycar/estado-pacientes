// login.js (module)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');

let usuarios = [];

// Escuchar los usuarios registrados en Firebase Realtime Database
onValue(ref(db, 'usuarios'), snap => {
  usuarios = [];
  if (!snap.exists()) return;
  
  snap.forEach(c => { 
    const u = c.val(); 
    u.key = c.key; 
    usuarios.push(u); 
  });
});

if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (msg) msg.textContent = '';

    const inputUser = document.getElementById('loginUser').value.trim().toLowerCase();
    const inputPass = document.getElementById('loginPass').value.trim();

    if (!inputUser || !inputPass) {
      if (msg) msg.textContent = 'Por favor complete todos los campos';
      return;
    }

    // Buscar coincidencia soportando ambas variantes de nombres de variables (password/clave, role/rol)
    const found = usuarios.find(x => {
      const dbUser = (x.username || x.user || x.key || '').toString().toLowerCase();
      const dbPass = (x.password || x.clave || '').toString();
      return dbUser === inputUser && dbPass === inputPass;
    });

    if (!found) {
      if (msg) msg.textContent = 'Usuario o contraseña incorrectos';
      return;
    }

    // Verificar si el usuario ha sido inhabilitado por el administrador
    if (found.activo === false) {
      if (msg) msg.textContent = 'Este usuario se encuentra inhabilitado';
      return;
    }

    // Determinar el rol (normalizado a minúsculas)
    const userRole = (found.role || found.rol || 'registrador').toString().toLowerCase();

    // Guardar la sesión en localStorage
    const userObj = {
      username: found.username || inputUser,
      displayName: found.displayName || `${found.nombres || ''} ${found.apellidos || ''}`.trim() || found.username || inputUser,
      role: userRole,
      rol: userRole,
      sede: found.sede || found.sedeId || ''
    };

    localStorage.setItem('user', JSON.stringify(userObj));

    // Redireccionar según el permiso del usuario
    if (userRole === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html';
    }
  });
}
