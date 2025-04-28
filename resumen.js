// Configuración Firebase (misma que en index.html)
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

const db = firebase.database();
const tablaResumen = document.getElementById('tablaResumen');
const filtroSede = document.getElementById('filtroSede');
const filtroFecha = document.getElementById('filtroFecha');
const btnFiltrar = document.getElementById('btnFiltrar');
const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

// Función para cargar todos los pacientes
function cargarPacientes(filtroSedeValor = '', filtroFechaValor = '') {
  tablaResumen.innerHTML = "";

  db.ref('pacientes').orderByChild('estado').once('value', snapshot => {
    snapshot.forEach(childSnapshot => {
      const paciente = childSnapshot.val();

      // Solo mostrar si coincide con filtros
      const sedeCoincide = filtroSedeValor ? paciente.sede.toLowerCase().includes(filtroSedeValor.toLowerCase()) : true;
      const fechaCoincide = filtroFechaValor ? (paciente.fechaRegistro && paciente.fechaRegistro.startsWith(filtroFechaValor)) : true;

      if (sedeCoincide && fechaCoincide) {
        const fila = document.createElement('tr');

        fila.innerHTML = `
          <td>${paciente.sede || ''}</td>
          <td>${paciente.apellidos || ''}</td>
          <td>${paciente.nombres || ''}</td>
          <td>${paciente.estudios ? paciente.estudios.join(', ') : ''}</td>
          <td>${paciente.cantidadTotal || '1'}</td>
          <td>${paciente.estado || 'En espera'}</td>
          <td>${paciente.fechaRegistro || ''}</td>
          <td>${paciente.fechaModificacion || ''}</td>
        `;

        tablaResumen.appendChild(fila);
      }
    });
  });
}

// Botones de filtro
btnFiltrar.addEventListener('click', () => {
  const sedeValor = filtroSede.value.trim();
  const fechaValor = filtroFecha.value;
  cargarPacientes(sedeValor, fechaValor);
});

btnLimpiarFiltros.addEventListener('click', () => {
  filtroSede.value = '';
  filtroFecha.value = '';
  cargarPacientes();
});

// Cargar pacientes al abrir
cargarPacientes();
