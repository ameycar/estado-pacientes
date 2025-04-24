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
  const hora = new Date().toLocaleTimeString();
  const timestamp = Date.now();

  db.ref("pacientes").push({
    sede,
    apellidos,
    nombres,
    estudios,
    estado: "En espera",
    fechaRegistro: `${fecha} ${hora}`,
    ultimaModificacion: `${fecha} ${hora}`,
    timestamp
  });

  this.reset();
});

// Mostrar pacientes
db.ref("pacientes").on("value", (snapshot) => {
  tabla.innerHTML = "";
  let pacientes = [];
  let enEspera = 0;

  snapshot.forEach(child => {
    const data = child.val();
    const id = child.key;
    if (data.estado === "En espera") enEspera++;

    pacientes.push({ id, ...data });
  });

  // Orden personalizado: En espera -> En atención -> Programado -> Atendido
  const ordenEstados = { "En espera": 1, "En atención": 2, "Programado": 3, "Atendido": 4 };
  pacientes.sort((a, b) => {
    const ordenEstado = ordenEstados[a.estado] - ordenEstados[b.estado];
    if (ordenEstado !== 0) return ordenEstado;
    return b.timestamp - a.timestamp; // más nuevo primero
  });

  pacientes.forEach(p => {
    const fila = document.createElement("tr");
    fila.style.backgroundColor = obtenerColorEstado(p.estado);
    fila.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${(p.estudios || []).join(", ")}</td>
      <td>${p.estado}</td>
      <td>${p.ultimaModificacion || ""}</td>
      <td>
        <select onchange="cambiarEstado('${p.id}', this.value, '${p.nombres} ${p.apellidos}')">
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

  const fecha = new Date().toISOString().split("T")[0];
  const hora = new Date().toLocaleTimeString();

  db.ref("pacientes/" + id).update({
    estado: nuevoEstado,
    ultimaModificacion: `${fecha} ${hora}`
  });
}

// Color según estado
function obtenerColorEstado(estado) {
  switch (estado) {
    case "En espera": return "#f8d7da";     // rojo claro
    case "En atención": return "#fff3cd";   // amarillo claro
    case "Atendido": return "#d4edda";      // verde claro
    case "Programado": return "#d1ecf1";    // azul claro
    default: return "white";
  }
}
