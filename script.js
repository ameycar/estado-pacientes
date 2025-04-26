// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.appspot.com",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e",
  measurementId: "G-C9STJV4J6K"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Función para agregar paciente
document.getElementById('formulario').addEventListener('submit', function(e) {
  e.preventDefault();

  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  const estudiosSelect = document.getElementById('estudios');
  const estudiosSeleccionados = Array.from(estudiosSelect.selectedOptions).map(option => option.value);

  if (estudiosSeleccionados.length === 0) {
    alert('Debe seleccionar al menos un estudio.');
    return;
  }

  let cantidad = estudiosSeleccionados.length;

  // Si incluye "Eco pb", considerar la cantidad especial
  if (estudiosSeleccionados.includes("Eco pb")) {
    const cantidadEcoPb = document.getElementById('cantidad-eco-pb')?.value || 1;
    cantidad = estudiosSeleccionados.length - 1 + parseInt(cantidadEcoPb);
  }

  const fechaHora = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  const nuevoPaciente = {
    sede,
    apellidos,
    nombres,
    estudios: estudiosSeleccionados.join(', '),
    cantidad,
    estado: 'Programado',
    fechaHora
  };

  database.ref('pacientes').push(nuevoPaciente);

  document.getElementById('formulario').reset();
});

// Función para cargar pacientes
function cargarPacientes() {
  const tabla = document.getElementById('tabla-pacientes');
  tabla.innerHTML = '';

  database.ref('pacientes').on('value', (snapshot) => {
    tabla.innerHTML = '';
    let enEspera = 0;

    snapshot.forEach((childSnapshot) => {
      const paciente = childSnapshot.val();
      const key = childSnapshot.key;

      if (paciente.estado === 'En espera') enEspera++;

      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${paciente.sede}</td>
        <td>${paciente.apellidos}</td>
        <td>${paciente.nombres}</td>
        <td>${paciente.estudios}</td>
        <td>${paciente.cantidad}</td>
        <td>${paciente.estado}</td>
        <td>
          <select onchange="cambiarEstado('${key}', this.value)">
            <option disabled selected>Cambiar</option>
            <option value="En espera">En espera</option>
            <option value="En atención">En atención</option>
            <option value="Atendido">Atendido</option>
          </select>
        </td>
      `;

      tabla.appendChild(tr);
    });

    document.getElementById('contador').innerText = `Pacientes en espera: ${enEspera}`;
  });
}

// Función para cambiar estado
function cambiarEstado(key, nuevoEstado) {
  const fechaModificacion = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  database.ref('pacientes/' + key).update({
    estado: nuevoEstado,
    fechaHora: fechaModificacion
  });
}

// Cargar pacientes al iniciar
cargarPacientes();
