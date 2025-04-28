// Configuración Firebase
var firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.appspot.com",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e"
};
firebase.initializeApp(firebaseConfig);
var database = firebase.database();

const formulario = document.getElementById("formulario");
const tablaPacientes = document.getElementById("tabla-pacientes");
const contador = document.getElementById("contador");

function limpiarFormulario() {
  formulario.reset();
}

function mostrarPacientes() {
  database.ref("pacientes").once("value", function(snapshot) {
    tablaPacientes.innerHTML = '';
    let countEnEspera = 0;
    snapshot.forEach(function(childSnapshot) {
      const data = childSnapshot.val();
      const tr = document.createElement("tr");
      
      // Colores según el estado
      let estadoColor;
      if (data.estado === 'En espera') estadoColor = '#ffcc00'; // Amarillo
      else if (data.estado === 'En atención') estadoColor = '#ff9900'; // Naranja
      else if (data.estado === 'Atendido') estadoColor = '#66cc66'; // Verde
      else estadoColor = '#9999ff'; // Azul

      tr.innerHTML = `
        <td>${data.sede}</td>
        <td>${data.apellidos}</td>
        <td>${data.nombres}</td>
        <td>${data.estudios.join(', ')}</td>
        <td>${data.cantidad}</td>
        <td style="background-color:${estadoColor};">${data.estado}</td>
        <td>${data.fechaModificacion}</td>
      `;
      tablaPacientes.appendChild(tr);
      
      if (data.estado === 'En espera') countEnEspera++;
    });

    // Actualizar contador
    contador.innerHTML = `Pacientes en espera: ${countEnEspera}`;
  });
}

// Registrar paciente
formulario.addEventListener('submit', function(e) {
  e.preventDefault();

  const sede = document.getElementById("sede").value;
  const apellidos = document.getElementById("apellidos").value;
  const nombres = document.getElementById("nombres").value;
  const estudios = Array.from(document.getElementById("estudios").selectedOptions).map(option => option.value);
  const cantidad = estudios.includes("Eco pb") ? estudios.filter(e => e === "Eco pb").length : 0;
  const estado = "En espera";
  const fechaModificacion = new Date().toLocaleString();

  // Subir a Firebase
  const pacienteData = {
    sede: sede,
    apellidos: apellidos,
    nombres: nombres,
    estudios: estudios,
    cantidad: cantidad,
    estado: estado,
    fechaModificacion: fechaModificacion
  };

  database.ref('pacientes').push(pacienteData)
    .then(() => {
      limpiarFormulario();
      mostrarPacientes();
    });
});

// Cargar pacientes al iniciar
mostrarPacientes();
