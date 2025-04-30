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

const tablaResumen = document.getElementById("tablaResumen");
const filtroFecha = document.getElementById("filtroFecha");
const filtroSede = document.getElementById("filtroSede");

function cargarPacientes() {
  db.ref("pacientes").on("value", (snapshot) => {
    const pacientes = snapshot.val();
    tablaResumen.innerHTML = "";

    if (!pacientes) return;

    // Convertir a array para ordenar
    const lista = Object.entries(pacientes).map(([id, data]) => ({
      id,
      ...data
    }));

    // Orden por estado: En espera -> En atención -> Programado -> Atendido
    const ordenEstado = {
      "En espera": 1,
      "En atención": 2,
      "Programado": 3,
      "Atendido": 4
    };

    lista.sort((a, b) => {
      return (ordenEstado[a.estado] || 5) - (ordenEstado[b.estado] || 5);
    });

    lista.forEach((pac) => {
      const coincideFecha =
        !filtroFecha.value || (pac.fecha && pac.fecha.startsWith(filtroFecha.value));
      const coincideSede =
        !filtroSede.value || (pac.sede && pac.sede.toLowerCase() === filtroSede.value.toLowerCase());

      if (coincideFecha && coincideSede) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${pac.fecha || ""}</td>
          <td>${pac.sede}</td>
          <td>${pac.apellidos}</td>
          <td>${pac.nombres}</td>
          <td>${pac.estudios?.join(", ") || ""}</td>
          <td>${pac.cantidad || ""}</td>
          <td style="background-color: ${colorEstado(pac.estado)}">${pac.estado}</td>
          <td>${pac.modificado || ""}</td>
        `;
        tablaResumen.appendChild(tr);
      }
    });
  });
}

function colorEstado(estado) {
  switch (estado) {
    case "Programado":
      return "#ADD8E6"; // Azul pastel
    case "En espera":
      return "#FFCCCC"; // Rojo pastel
    case "En atención":
      return "#FFF5BA"; // Amarillo pastel
    case "Atendido":
      return "#C6F6C6"; // Verde pastel
    default:
      return "#f0f0f0";
  }
}

filtroFecha.addEventListener("input", cargarPacientes);
filtroSede.addEventListener("change", cargarPacientes);

cargarPacientes();
