// login.js (module)
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');

let usuarios = [];
onValue(ref(db, 'usuarios'), snap => {
  usuarios = [];
  snap.forEach(c => { const u = c.val(); u.key = c.key; usuarios.push(u); });
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const found = usuarios.find(x => x.username === u && x.password === p);
  if (!found) {
    msg.textContent = 'Usuario o contraseña incorrectos';
    return;
  }
  // guardamos user en localStorage (object)
  const userObj = {
    username: found.username,
    displayName: found.displayName || found.username,
    role: found.role || 'sede',
    sede: found.sede || ''
  };
  localStorage.setItem('user', JSON.stringify(userObj));
  // redirigir según rol
  if (userObj.role === 'admin') window.location.href = 'admin.html';
  else window.location.href = 'index.html';
});
