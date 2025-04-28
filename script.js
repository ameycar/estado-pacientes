// Configuración de Firebase
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

// Mostrar/ocultar selector de cantidad
document.getElementById('estudios').addEventListener('change', function() {
  let selected = Array.from(this.selectedOptions).map(option => option.value);
  document.getElementById('cantidadEcoPb').style.display = selected.includes('Eco pb') ? 'block' : 'none';
});

// Agregar paciente
document.getElementById('formulario').addEventListener('submit', function(e) {
  e.preventDefault();
  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  const estudios = Array.from(document.getElementById('estudios').selectedOptions).map(option => option.value);
  let cantidad = 1;

  if (estudios.includes('Eco pb')) {
    cantidad = parseInt(document.getElementById('cantidad').value);
  }

  const nuevoPaciente = {
    sede,
    apellidos,
    nombres,
    estudios,
    cantidad,
    estado: 'En espera',
    fechaModificacion: new Date().toLocaleString()
  };

  database.ref('pacientes').push(nuevoPaciente);
  document.getElementById('formulario').reset();
  document.getElementById('cantidadEcoPb').style.display = 'none';
});

// Mostrar pacientes
const tablaPacientes = document.getElementById('tabla-pacientes');
const contadorPacientes = document.getElementById('contador');

firebase.database().ref('pacientes').on('value', function(snapshot) {
  tablaPacientes.innerHTML = '';
  let contador = 0;

  const pacientes = [];
  snapshot.forEach(function(childSnapshot) {
    pacientes.push({...childSnapshot.val(), key: childSnapshot.key});
  });

  // Ordenar: en espera primero
  pacientes.sort((a, b) => {
    const ordenEstado = { "En espera": 1, "En atención": 2, "Programado": 3, "Atendido": 4 };
    return (ordenEstado[a.estado] || 99) - (ordenEstado[b.estado] || 99);
  });

  pacientes.forEach(function(data) {
    const tr = document.createElement('tr');
    tr.style.backgroundColor = getColorEstado(data.estado);

    tr.innerHTML = `
      <td>${data.sede}</td>
      <td>${data.apellidos}</td>
      <td>${data.nombres}</td>
      <td>${data.estudios.join(', ')}</td>
      <td>${data.cantidad}</td>
      <td>
        <select data-id="${data.key}" class="estado-select">
          <option ${data.estado === 'En espera' ? 'selected' : ''}>En espera</option>
          <option ${data.estado === 'En atención' ? 'selected' : ''}>En atención</option>
          <option ${data.estado === 'Programado' ? 'selected' : ''}>Programado</option>
          <option ${data.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        </select>
      </td>
      <td>${data.fechaModificacion}</td>
      <td><button data-id="${data.key}" class="eliminar">Eliminar</button></td>
    `;
    tablaPacientes.appendChild(tr);

    if (data.estado === 'En espera') {
      contador++;
    }
  });

  contadorPacientes.textContent = `Pacientes en espera: ${contador}`;
});

// Cambiar estado
tablaPacientes.addEventListener('change', function(e) {
  if (e.target.classList.contains('estado-select')) {
    const id = e.target.getAttribute('data-id');
    const nuevoEstado = e.target.value;
    database.ref('pacientes/' + id).update({
      estado: nuevoEstado,
      fechaModificacion: new Date().toLocaleString()
    });
  }
});

// Eliminar paciente
tablaPacientes.addEventListener('click', function(e) {
  if (e.target.classList.contains('eliminar')) {
    const id = e.target.getAttribute('data-id');
    database.ref('pacientes/' + id).remove();
  }
});

// Colores por estado
function getColorEstado(estado) {
  switch (estado) {
    case 'En espera': return '#ffe0e0';
    case 'En atención': return '#fff5cc';
    case 'Programado': return '#d6f5d6';
    case 'Atendido': return '#d9d9d9';
    default: return '#ffffff';
  }
}
