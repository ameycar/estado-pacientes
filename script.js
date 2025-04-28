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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const formulario = document.getElementById('formulario');
const tablaPacientes = document.getElementById('tabla-pacientes');
const estudiosSelect = document.getElementById('estudios');
const cantidadEcoPb = document.getElementById('cantidad-eco-pb');
const labelCantidad = document.getElementById('label-cantidad');

// Mostrar select de cantidad solo si elige "Eco pb"
estudiosSelect.addEventListener('change', () => {
  const seleccionados = Array.from(estudiosSelect.selectedOptions).map(opt => opt.value);
  if (seleccionados.includes('Eco pb')) {
    cantidadEcoPb.style.display = 'inline-block';
    labelCantidad.style.display = 'inline-block';
  } else {
    cantidadEcoPb.style.display = 'none';
    labelCantidad.style.display = 'none';
  }
});

formulario.addEventListener('submit', (e) => {
  e.preventDefault();

  const sede = document.getElementById('sede').value.trim();
  const apellidos = document.getElementById('apellidos').value.trim();
  const nombres = document.getElementById('nombres').value.trim();
  const estudiosSeleccionados = Array.from(estudiosSelect.selectedOptions).map(opt => opt.value);
  const cantidadSeleccionada = cantidadEcoPb.value || 1;

  let cantidadFinal = estudiosSeleccionados.length;
  if (estudiosSeleccionados.includes('Eco pb')) {
    cantidadFinal += parseInt(cantidadSeleccionada) - 1;
  }

  const nuevoPaciente = {
    sede,
    apellidos,
    nombres,
    estudios: estudiosSeleccionados.join(", "),
    cantidad: cantidadFinal,
    estado: "En espera",
    fechaHora: new Date().toISOString()
  };

  database.ref('pacientes').push(nuevoPaciente);
  formulario.reset();
  cantidadEcoPb.style.display = 'none';
  labelCantidad.style.display = 'none';
});

function cargarPacientes() {
  database.ref('pacientes').on('value', (snapshot) => {
    tablaPacientes.innerHTML = '';
    const data = [];
    snapshot.forEach(child => {
      const paciente = child.val();
      paciente.id = child.key;
      data.push(paciente);
    });

    // Ordenar primero "En espera", luego "En atención", luego "Atendido", luego "Programado"
    const orden = { "En espera": 1, "En atención": 2, "Atendido": 3, "Programado": 4 };
    data.sort((a, b) => (orden[a.estado] || 99) - (orden[b.estado] || 99));

    data.forEach(paciente => agregarFila(paciente));
  });
}

function agregarFila(paciente) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${paciente.sede}</td>
    <td>${paciente.apellidos}</td>
    <td>${paciente.nombres}</td>
    <td>${paciente.estudios}</td>
    <td>${paciente.cantidad}</td>
    <td>
      <select onchange="cambiarEstado('${paciente.id}', this.value)">
        <option value="En espera" ${paciente.estado === 'En espera' ? 'selected' : ''}>En espera</option>
        <option value="En atención" ${paciente.estado === 'En atención' ? 'selected' : ''}>En atención</option>
        <option value="Atendido" ${paciente.estado === 'Atendido' ? 'selected' : ''}>Atendido</option>
        <option value="Programado" ${paciente.estado === 'Programado' ? 'selected' : ''}>Programado</option>
      </select>
    </td>
    <td><button onclick="eliminarPaciente('${paciente.id}')">🗑️</button></td>
  `;

  // Color de fila según estado
  switch (paciente.estado) {
    case 'En espera':
      tr.style.backgroundColor = '#FFF7E6';
      break;
    case 'En atención':
      tr.style.backgroundColor = '#FFE6E6';
      break;
    case 'Atendido':
      tr.style.backgroundColor = '#E6FFE6';
      break;
    case 'Programado':
      tr.style.backgroundColor = '#E6F0FF';
      break;
  }

  tablaPacientes.appendChild(tr);
}

function cambiarEstado(id, nuevoEstado) {
  database.ref('pacientes/' + id).update({
    estado: nuevoEstado,
    fechaHora: new Date().toISOString()
  });
}

function eliminarPaciente(id) {
  if (confirm('¿Seguro que quieres eliminar este paciente?')) {
    database.ref('pacientes/' + id).remove();
  }
}

cargarPacientes();
