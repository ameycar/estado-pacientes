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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Mapeo de colores por estado
const estadoColores = {
  "En espera": "#ffe5e5",
  "En atención": "#fff8dc",
  "Atendido": "#e5ffe5",
  "Programado": "#e5f0ff"
};

// Función para crear opciones del selector de estado
function crearSelectorEstado(estadoActual, idPaciente) {
  const select = document.createElement('select');
  const estados = ["En espera", "En atención", "Atendido", "Programado"];
  estados.forEach(estado => {
    const option = document.createElement('option');
    option.value = estado;
    option.text = estado;
    if (estado === estadoActual) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener('change', () => {
    db.ref('pacientes/' + idPaciente).update({ estado: select.value });
  });
  return select;
}

// Mostrar u ocultar selector de cantidad de Eco pb
document.getElementById('estudios').addEventListener('change', function() {
  const ecoPbCantidadDiv = document.getElementById('ecoPbCantidadDiv');
  const estudiosSeleccionados = Array.from(this.selectedOptions).map(opt => opt.value);
  if (estudiosSeleccionados.includes('Eco pb')) {
    ecoPbCantidadDiv.style.display = 'block';
  } else {
    ecoPbCantidadDiv.style.display = 'none';
    document.getElementById('ecoPbCantidad').value = '1';
  }
});

// Registrar nuevo paciente
document.getElementById('formulario').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  const estudiosSeleccionados = Array.from(document.getElementById('estudios').selectedOptions).map(opt => opt.value);
  const ecoPbCantidad = parseInt(document.getElementById('ecoPbCantidad').value) || 1;

  if (!sede || !apellidos || !nombres || estudiosSeleccionados.length === 0) {
    alert('Completa todos los campos');
    return;
  }

  const nuevoPaciente = {
    sede: sede,
    apellidos: apellidos,
    nombres: nombres,
    estudios: estudiosSeleccionados,
    ecoPbCantidad: estudiosSeleccionados.includes('Eco pb') ? ecoPbCantidad : 0,
    estado: 'En espera',
    fecha: new Date().toLocaleString()
  };

  db.ref('pacientes').push(nuevoPaciente)
    .then(() => {
      document.getElementById('formulario').reset();
      document.getElementById('ecoPbCantidadDiv').style.display = 'none';
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
  
  const pacientes = [];
  snapshot.forEach((childSnapshot) => {
    const paciente = childSnapshot.val();
    paciente.id = childSnapshot.key;
    pacientes.push(paciente);
  });

  // Ordenar pacientes: "En espera" primero
  pacientes.sort((a, b) => {
    const orden = { "En espera": 1, "En atención": 2, "Programado": 3, "Atendido": 4 };
    return orden[a.estado] - orden[b.estado];
  });

  pacientes.forEach(paciente => {
    const fila = document.createElement('tr');
    fila.style.backgroundColor = estadoColores[paciente.estado] || '#ffffff';

    const cantidadEstudios = paciente.estudios.length - (paciente.estudios.includes('Eco pb') ? 1 : 0);
    const cantidadTotal = cantidadEstudios + (paciente.ecoPbCantidad || 0);

    fila.innerHTML = `
      <td>${paciente.sede}</td>
      <td>${paciente.apellidos}</td>
      <td>${paciente.nombres}</td>
      <td>${paciente.estudios.join(', ')}</td>
      <td>${cantidadTotal}</td>
    `;

    const estadoTd = document.createElement('td');
    const selectorEstado = crearSelectorEstado(paciente.estado, paciente.id);
    estadoTd.appendChild(selectorEstado);
    fila.appendChild(estadoTd);

    const eliminarTd = document.createElement('td');
    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.addEventListener('click', () => {
      if (confirm('¿Seguro que deseas eliminar este paciente?')) {
        db.ref('pacientes/' + paciente.id).remove()
          .then(() => {
            alert('Paciente eliminado');
          })
          .catch((error) => {
            console.error('Error al eliminar paciente:', error);
          });
      }
    });
    eliminarTd.appendChild(btnEliminar);
    fila.appendChild(eliminarTd);

    tabla.appendChild(fila);
  });
});
