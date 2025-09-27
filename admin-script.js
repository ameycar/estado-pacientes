// admin-script.js
// Comprueba que DOM esté listo
document.addEventListener('DOMContentLoaded', () => {

  // ====== 🔹 Inicializar Firebase (usa tu config tal cual) ======
  const firebaseConfig = {
    apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
    authDomain: "estado-pacientes.firebaseapp.com",
    databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
    projectId: "estado-pacientes",
    storageBucket: "estado-pacientes.appspot.com",
    messagingSenderId: "515522648971",
    appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e"
  };
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.database();

  // ====== 🔹 Helpers DOM ======
  const formSede = document.getElementById('form-sede');
  const tablaSedesBody = document.querySelector('#tabla-sedes tbody');
  const inputNombre = document.getElementById('sedeNombre');
  const inputDireccion = document.getElementById('sedeDireccion');
  const inputActiva = document.getElementById('sedeActiva');

  // ====== 🔹 Mostrar / ocultar secciones ======
  window.mostrarSeccion = function (nombre) {
    // oculta todas
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    // muestra seleccionada
    const el = document.getElementById(nombre);
    if (el) {
      el.style.display = 'block';
      // si pedimos sedes, cargamos su data
      if (nombre === 'sedes') cargarSedes();
    } else {
      // fallback: si la sección no existe, redirigir a pagina o mostrar mensaje
      console.error('Sección no encontrada:', nombre);
      alert(`La sección "${nombre}" no está disponible.`);
    }
  };

  // mostrar pacienes por defecto (o la que quieras)
  mostrarSeccion('pacientes');

  // ====== 🔹 Crear sede ======
  formSede && formSede.addEventListener('submit', e => {
    e.preventDefault();
    const nombre = inputNombre.value && inputNombre.value.trim();
    if (!nombre) {
      alert('El nombre de la sede es obligatorio.');
      return;
    }
    const nueva = {
      nombre,
      direccion: (inputDireccion.value || '').trim(),
      activa: !!inputActiva.checked,
      creada: new Date().toISOString()
    };
    // push a /sedes
    db.ref('sedes').push(nueva)
      .then(() => {
        inputNombre.value = '';
        inputDireccion.value = '';
        inputActiva.checked = true;
      })
      .catch(err => {
        console.error(err);
        alert('Error creando sede: ' + err.message);
      });
  });

  // ====== 🔹 Cargar listado de sedes (realtime) ======
  function cargarSedes() {
    db.ref('sedes').on('value', snap => {
      tablaSedesBody.innerHTML = '';
      if (!snap.exists()) return;
      snap.forEach(child => {
        const key = child.key;
        const s = child.val();
        const tr = document.createElement('tr');

        const nombreTd = document.createElement('td');
        nombreTd.textContent = s.nombre || '';
        nombreTd.style.padding = '8px'; nombreTd.style.border = '1px solid #ddd';

        const dirTd = document.createElement('td');
        dirTd.textContent = s.direccion || '';
        dirTd.style.padding = '8px'; dirTd.style.border = '1px solid #ddd';

        const activaTd = document.createElement('td');
        activaTd.style.textAlign = 'center';
        activaTd.style.padding = '8px'; activaTd.style.border = '1px solid #ddd';
        activaTd.textContent = s.activa ? 'Sí' : 'No';

        const accTd = document.createElement('td');
        accTd.style.textAlign = 'center'; accTd.style.padding = '8px'; accTd.style.border = '1px solid #ddd';

        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.style.marginRight = '6px';
        btnEditar.onclick = () => editarSede(key, s);

        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.onclick = () => eliminarSede(key, s);

        accTd.appendChild(btnEditar);
        accTd.appendChild(btnEliminar);

        tr.appendChild(nombreTd);
        tr.appendChild(dirTd);
        tr.appendChild(activaTd);
        tr.appendChild(accTd);

        tablaSedesBody.appendChild(tr);
      });
    }, err => {
      console.error('Error cargando sedes:', err);
    });
  }

  // ====== 🔹 Editar sede (prompt simple) ======
  function editarSede(key, sedeObj) {
    const nuevoNombre = prompt('Editar nombre de la sede:', sedeObj.nombre || '');
    if (nuevoNombre === null) return; // cancel
    const nuevaDir = prompt('Editar dirección (opcional):', sedeObj.direccion || '');
    const activa = confirm('¿Mantener la sede activa? OK = Sí, Cancel = No');
    db.ref('sedes/' + key).update({
      nombre: (nuevoNombre || '').trim(),
      direccion: (nuevaDir || '').trim(),
      activa: !!activa
    }).catch(err => {
      console.error(err);
      alert('Error al editar: ' + err.message);
    });
  }

  // ====== 🔹 Eliminar sede (con contraseña) ======
  function eliminarSede(key, sedeObj) {
    const pass = prompt('Ingrese contraseña de administrador para eliminar esta sede:');
    if (pass === '1234') {
      db.ref('sedes/' + key).remove().catch(err => {
        console.error(err);
        alert('Error al eliminar: ' + err.message);
      });
    } else {
      alert('Contraseña incorrecta. No se eliminó.');
    }
  }

  // exportar funciones globales para botones que puedan usarla
  window.cargarSedes = cargarSedes;
  window.editarSede = editarSede;
  window.eliminarSede = eliminarSede;

});
