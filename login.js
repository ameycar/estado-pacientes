document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const usuario = document.getElementById('usuario').value.trim();
  const clave = document.getElementById('clave').value.trim();
  const mensajeError = document.getElementById('mensaje-error');

  if (usuario === 'admin' && clave === '2025') {
    window.location.href = 'admin.html';
  } else if (usuario === 'consulta' && clave === '1234') {
    window.location.href = 'resumen.html';
  } else {
    mensajeError.textContent = 'Usuario o contraseña incorrectos';
    mensajeError.style.color = 'red';
  }
});
