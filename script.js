// Configuración original Firebase versión 8
var firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.appspot.com",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Base de datos
const db = firebase.database();

// Función para registrar pacientes
document.getElementById('formulario').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  const estudiosSeleccionados = Array.from(document.getElementById('estudios').selectedOptions).map(option => option.value);

  if (!sede || !apellidos || !nombres || estudiosSeleccionados.length === 0) {
    alert('Completa todos los campos');
    return;
  }

  const nuevoPaciente = {
    sede: sede,
    apellidos: apellidos,
    nombres: nombres,
    estudios: estudiosSeleccionados,
    estado: 'En espera',
    fecha: new Date().toLocaleString()
  };

  db.ref('pacientes').push(nuevoPaciente)
    .then(() => {
      document.getElementById('formulario').reset();
      alert('Paciente registrado exitosamente');
    })
    .catch((error) => {
      console.error('Error al registrar paciente:', error);
    });
});

// Escuchar cambios en la base de datos
db.ref('pacientes').on('value', (snapshot) => {
  const tabla = document.getElementById('tabla-pacientes');
  tabla.innerHTML = '';
  
  snapshot.forEach((childSnapshot) => {
    const paciente = childSnapshot.val();
    const key = childSnapshot.key;
    
    const fila = document.createElement('tr');
    
    fila.innerHTML = `
      <td>${paciente.sede}</td>
      <td>${paciente.apellidos}</td>
      <td>${paciente.nombres}</td>
      <td>${paciente.estudios.join(', ')}</td>
      <td>${paciente.estudios.length}</td>
      <td>${paciente.estado}</td>
      <td><button onclick="eliminarPaciente('${key}')">Eliminar</button></td>
    `;
    
    tabla.appendChild(fila);
  });
});

// Eliminar paciente
function eliminarPaciente(id) {
  if (confirm('¿Seguro que deseas eliminar este paciente?')) {
    db.ref('pacientes/' + id).remove()
      .then(() => {
        alert('Paciente eliminado');
      })
      .catch((error) => {
        console.error('Error al eliminar paciente:', error);
      });
  }
}
