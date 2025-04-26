// Configura tu Firebase
var firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  databaseURL: "TU_DATABASE_URL",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
firebase.initializeApp(firebaseConfig);

var database = firebase.database();

// Detectar cambios en selección de estudios
const estudiosSelect = document.getElementById('estudios');
const cantidadEcoPbDiv = document.getElementById('cantidad-eco-pb');
estudiosSelect.addEventListener('change', function() {
  const opcionesSeleccionadas = Array.from(estudiosSelect.selectedOptions).map(option => option.value);
  if (opcionesSeleccionadas.includes('Eco pb')) {
    cantidadEcoPbDiv.style.display = 'block';
  } else {
    cantidadEcoPbDiv.style.display = 'none';
  }
});

// Capturar el formulario
document.getElementById('formulario').addEventListener('submit', function(e) {
  e.preventDefault();

  var sede = document.getElementById('sede').value.trim();
  var apellidos = document.getElementById('apellidos').value.trim();
  var nombres = document.getElementById('nombres').value.trim();
  var estudios = Array.from(document.getElementById('estudios').selectedOptions).map(option => option.value);
  var cantidadPb = parseInt(document.getElementById('cantidadPb').value) || 1;
  var fechaHora = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  var cantidadTotal = estudios.length;
  if (estudios.includes('Eco pb')) {
    cantidadTotal += (cantidadPb - 1); // ya cuenta 1, sumamos el resto
  }

  var paciente = {
    sede: sede,
    apellidos: apellidos,
    nombres: nombres,
    estudios: estudios.join(', '),
    cantidad: cantidadTotal,
    estado: 'Programado',
    fechaHora: fechaHora
  };

  var nuevoPacienteKey = database.ref().child('pacientes').push().key;
  var updates = {};
  updates['/pacientes/' + nuevoPacienteKey] = paciente;
  database.ref().update(updates);

  document.getElementById('formulario').reset();
  cantidadEcoPbDiv.style.display = 'none';
});

// Mostrar los pacientes
database.ref('pacientes').on('value', function(snapshot) {
  var tabla = document.getElementById('tabla-pacientes');
  tabla.innerHTML = '';
  var contadorEnEspera = 0;

  snapshot.forEach(function(childSnapshot) {
    var paciente = childSnapshot.val();
    var fila = document.createElement('tr');

    fila.innerHTML = `
      <td>${paciente.sede}</td>
      <td>${paciente.apellidos}</td>
      <td>${paciente.nombres}</td>
      <td>${paciente.estudios}</td>
      <td>${paciente.cantidad || 1}</td>
      <td>${paciente.estado}</td>
      <td><button onclick="cambiarEstado('${childSnapshot.key}')">Cambiar Estado</button></td>
    `;

    tabla.appendChild(fila);

    if (paciente.estado === 'En espera') {
      contadorEnEspera++;
    }
  });

  document.getElementById('contador').innerText = `Pacientes en espera: ${contadorEnEspera}`;
});

// Cambiar estado de paciente
function cambiarEstado(key) {
  var pacienteRef = database.ref('pacientes/' + key);
  pacienteRef.once('value').then(function(snapshot) {
    var paciente = snapshot.val();
    var nuevoEstado = '';
    if (paciente.estado === 'Programado') {
      nuevoEstado = 'En espera';
    } else if (paciente.estado === 'En espera') {
      nuevoEstado = 'En atención';
    } else if (paciente.estado === 'En atención') {
      nuevoEstado = 'Atendido';
    } else {
      nuevoEstado = 'Programado';
    }
    pacienteRef.update({ estado: nuevoEstado });
  });
}
