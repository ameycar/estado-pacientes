// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.firebasestorage.app",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e",
  measurementId: "G-C9STJV4J6K"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tabla = document.getElementById("tabla-pacientes");
const contador = document.getElementById("contador");

// Registrar pacientes
document.getElementById("formulario").addEventListener("submit", function(e) {
  e.preventDefault();
  const sede = document.getElementById("sede").value;
  const apellidos = document.getElementById("apellidos").value;
  const nombres = document.getElementById("nombres").value;
  const estudios = Array.from(document.getElementById("estudios").selectedOptions).map(opt => opt.value);
  const fecha = new Date().toISOString().split("T")[0];

  db.ref("pacientes").push({
    sede,
    apellidos,
    nombres,
    estudios,
    estado: "En espera",
    fecha,
    modificado: fecha + " " + new Date().toLocaleTimeString()
  });

  this.reset();
});

// Mostrar pacientes
db.ref("pacientes").on("value", (snapshot) => {
  tabla.innerHTML = "";
  let enEspera = 0;

  const estadosOrden = {
    "En espera": 1,
    "En atención": 2,
    "Programado": 3,
    "Atendido": 4
  };

  const colores = {
    "En espera": "#f8d7da",     // rojo claro
    "En atención": "#fff3cd",   // amarillo
    "Programado": "#cfe2ff",    // azul
    "Atendido": "#d4edda"       // verde
  };

  const pacientes = [];

  snapshot.forEach(child => {
    pacientes.push({ id: child.key, ...child.val() });
  });

  pacientes
    .sort((a, b) => estadosOrden[a.estado] - estadosOrden[b.estado])
    .forEach(data => {
      const { id, sede, apellidos, nombres, estudios, estado, modificado } = data;

      if (estado === "En espera") enEspera++;

      const fila = document.createElement("tr");
      fila.style.backgroundColor = colores[estado] || "white";
      fila.innerHTML = `
        <td>${sede}</td>
        <td>${apellidos}</td>
        <td>${nombres}</td>
        <td>${(estudios || []).join(", ")}</td>
        <td>${estado}<br><small>${modificado || ""}</small></td>
        <td>
          <select onchange="cambiarEstado('${id}', this.value, '${nombres} ${apellidos}')">
            <option disabled selected>Cambiar estado</option>
            <option value="Programado">Programado</option>
            <option value="En espera">En espera</option>
            <option value="En atención">En atención</option>
            <option value="Atendido">Atendido</option>
          </select>
        </td>
      `;
      tabla.appendChild(fila);
    });

  contador.innerText = `Pacientes en espera: ${enEspera}`;
});

// Cambiar estado con confirmación
function cambiarEstado(id, nuevoEstado, nombreCompleto) {
  const confirmar = confirm(`¿Deseas cambiar el estado de ${nombreCompleto} a "${nuevoEstado}"?`);
  if (!confirmar) return;

  const fechaHora = new Date();
  const fecha = fechaHora.toISOString().split("T")[0];
  const hora = fechaHora.toLocaleTimeString();

  db.ref("pacientes/" + id).update({
    estado: nuevoEstado,
    modificado: `${fecha} ${hora}`
  });
}
