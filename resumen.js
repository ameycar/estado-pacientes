// Configuración de Firebase (misma versión estable 2025 mejorada)
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

const tablaResumen = document.getElementById('tabla-resumen');
const filtroSede = document.getElementById('filtro-sede');
const filtroFecha = document.getElementById('filtro-fecha');

// Cargar pacientes en tiempo real
database.ref('pacientes').on('value', (snapshot) => {
  const data = snapshot.val();
  tablaResumen.innerHTML = '';
  const sedes = new Set();

  if (data) {
    Object.keys(data).forEach((key) => {
      const paciente = data[key];

      // Filtro por sede
      if (filtroSede.value && paciente.sede !== filtroSede.value) {
        return;
      }

      // Filtro por fecha
      if (filtroFecha.value) {
        const fechaPaciente = paciente.fechaModificacion ? paciente.fechaModificacion.split(' ')[0] : '';
        if (fechaPaciente !== filtroFecha.value) {
          return;
        }
      }

      // Agregar sede única al filtro
      sedes.add(paciente.sede);

      const fila = document.createElement('tr');
      fila.style.backgroundColor = obtenerColorEstado(paciente.estado);

      fila.innerHTML = `
        <td>${paciente.sede}</td>
        <td>${paciente.apellidos}</td>
        <td>${paciente.nombres}</td>
        <td>${paciente.estudios}</td>
        <td>${paciente.cant}</td>
        <td>${paciente.estado}</td>
        <td>${paciente.fechaModificacion || '-'}</td>
      `;

      tablaResumen.appendChild(fila);
    });
  }

  // Actualizar las opciones de sede
  actualizarFiltroSede(Array.from(sedes));
});

// Función para colorear según estado
function obtenerColorEstado(estado) {
  switch (estado) {
    case 'En espera':
      return '#ffe4e1'; // Rosadito claro
    case 'En atención':
      return '#fffacc'; // Amarillo claro
    case 'Atendido':
      return '#d4edda'; // Verde muy suave
    case 'Programado':
      return '#cce5ff'; // Azul suave
    default:
      return 'white';
  }
}

// Actualizar select de sede
function actualizarFiltroSede(sedes) {
  filtroSede.innerHTML = '<option value="">Todas</option>';
  sedes.forEach((sede) => {
    const option = document.createElement('option');
    option.value = sede;
    option.textContent = sede;
    filtroSede.appendChild(option);
  });
}

// Refrescar al cambiar filtros
filtroSede.addEventListener('change', () => {
  database.ref('pacientes').once('value', (snapshot) => {
    const data = snapshot.val();
    tablaResumen.innerHTML = '';
    if (data) {
      Object.keys(data).forEach((key) => {
        const paciente = data[key];
        if (filtroSede.value && paciente.sede !== filtroSede.value) return;
        if (filtroFecha.value) {
          const fechaPaciente = paciente.fechaModificacion ? paciente.fechaModificacion.split(' ')[0] : '';
          if (fechaPaciente !== filtroFecha.value) return;
        }

        const fila = document.createElement('tr');
        fila.style.backgroundColor = obtenerColorEstado(paciente.estado);
        fila.innerHTML = `
          <td>${paciente.sede}</td>
          <td>${paciente.apellidos}</td>
          <td>${paciente.nombres}</td>
          <td>${paciente.estudios}</td>
          <td>${paciente.cant}</td>
          <td>${paciente.estado}</td>
          <td>${paciente.fechaModificacion || '-'}</td>
        `;
        tablaResumen.appendChild(fila);
      });
    }
  });
});

filtroFecha.addEventListener('change', () => {
  filtroSede.dispatchEvent(new Event('change'));
});
