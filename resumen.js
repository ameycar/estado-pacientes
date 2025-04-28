// Configura Firebase versión 8
var firebaseConfig = {
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
const tablaResumen = document.getElementById("tabla-resumen");
const filtroSede = document.getElementById("filtro-sede");
const filtroFecha = document.getElementById("filtro-fecha");
const limpiarFiltrosBtn = document.getElementById("limpiar-filtros");

function mostrarPacientes(snapshot) {
  tablaResumen.innerHTML = "";

  snapshot.forEach((childSnapshot) => {
    const paciente = childSnapshot.val();
    const id = childSnapshot.key;

    if (filtroActivo(paciente)) {
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${paciente.sede || ""}</td>
        <td>${paciente.apellidos || ""}</td>
        <td>${paciente.nombres || ""}</td>
        <td>${(paciente.estudios || []).join(", ")}</td>
        <td>${paciente.cant || "1"}</td>
        <td style="background-color: ${colorEstado(paciente.estado)};">${paciente.estado || "En espera"}</td>
        <td>${paciente.fechaRegistro || ""}</td>
        <td>${paciente.fechaModificacion || ""}</td>
      `;

      tablaResumen.appendChild(fila);
    }
  });
}

function filtroActivo(paciente) {
  const sedeFiltro = filtroSede.value;
  const fechaFiltro = filtroFecha.value;

  let pasaSede = true;
  let pasaFecha = true;

  if (sedeFiltro && paciente.sede !== sedeFiltro) {
    pasaSede = false;
  }

  if (fechaFiltro && paciente.fechaRegistro) {
    pasaFecha = paciente.fechaRegistro.startsWith(fechaFiltro);
  }

  return pasaSede && pasaFecha;
}

function colorEstado(estado) {
  switch (estado) {
    case "En espera":
      return "#FFD6D6"; // Rojo pastel
    case "En atención":
      return "#FFF5CC"; // Amarillo pastel
    case "Atendido":
      return "#D6FFD6"; // Verde pastel
    case "Programado":
      return "#CCE5FF"; // Azul pastel
    default:
      return "#FFFFFF";
  }
}

// Actualización en tiempo real
db.ref("pacientes").on("value", (snapshot) => {
  mostrarPacientes(snapshot);
});

// Filtros
filtroSede.addEventListener("change", () => {
  db.ref("pacientes").once("value", (snapshot) => {
    mostrarPacientes(snapshot);
  });
});

filtroFecha.addEventListener("change", () => {
  db.ref("pacientes").once("value", (snapshot) => {
    mostrarPacientes(snapshot);
  });
});

limpiarFiltrosBtn.addEventListener("click", () => {
  filtroSede.value = "";
  filtroFecha.value = "";
  db.ref("pacientes").once("value", (snapshot) => {
    mostrarPacientes(snapshot);
  });
});
