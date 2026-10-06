// login.js (module)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');

// Asignación de evento para mostrar/ocultar contraseña (Ojito 👁️)
document.addEventListener('DOMContentLoaded', () => {
  const togglePassBtn = document.getElementById('btnTogglePass');
  const passInput = document.getElementById('loginPass');

  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      
      togglePassBtn.classList.toggle('fa-eye', !isPassword);
      togglePassBtn.classList.toggle('fa-eye-slash', isPassword);
    });
  }
});

let usuarios = [];

// Escuchar los usuarios registrados en Firebase Realtime Database
onValue(ref(db, 'usuarios'), snap => {
  usuarios = [];
  if (!snap.exists()) {
    console.warn("No se encontraron registros en la tabla de usuarios.");
    return;
  }
  
  snap.forEach(c => { 
    const u = c.val() || {}; 
    u.key = c.key;
    usuarios.push(u); 
  });
  console.log("Usuarios cargados desde Firebase:", usuarios.length);
});

if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (msg) {
      msg.textContent = '';
      msg.style.color = '#ef4444';
    }

    const inputUser = document.getElementById('loginUser').value.trim().toLowerCase();
    const inputPass = document.getElementById('loginPass').value.trim();

    if (!inputUser || !inputPass) {
      if (msg) msg.textContent = 'Por favor complete todos los campos';
      return;
    }

    if (usuarios.length === 0) {
      if (msg) msg.textContent = 'Cargando datos de la base de datos... Reintente en un momento.';
      return;
    }

    const found = usuarios.find(x => {
      const dbUsername = (x.username || x.user || '').toString().trim().toLowerCase();
      const dbKey = (x.key || '').toString().trim().toLowerCase();
      const dbEmail = (x.email || x.correo || '').toString().trim().toLowerCase();

      const matchesUser = (dbUsername === inputUser) || (dbKey === inputUser) || (dbEmail === inputUser);
      const dbPass = (x.password || x.clave || x.contrasena || x.passwordHash || '').toString().trim();

      return matchesUser && (dbPass === inputPass);
    });

    if (!found) {
      if (msg) msg.textContent = 'Usuario o contraseña incorrectos';
      return;
    }

    if (found.activo === false || found.estado === 'inactivo' || found.estado === 'inhabilitado') {
      if (msg) msg.textContent = 'Este usuario se encuentra inhabilitado';
      return;
    }

    const userRole = (found.role || found.rol || 'registrador').toString().toLowerCase();

    const userObj = {
      username: found.username || found.key || inputUser,
      displayName: found.displayName || `${found.nombres || ''} ${found.apellidos || ''}`.trim() || found.username || found.key || inputUser,
      role: userRole,
      rol: userRole,
      sede: found.sede || found.sedeId || ''
    };

    localStorage.setItem('user', JSON.stringify(userObj));

    if (userRole === 'admin' || userRole === 'operador') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html';
    }
  });
}
