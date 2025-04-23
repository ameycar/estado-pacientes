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

function agregarPaciente() {
  const sede = document.getElementById("sede").value;
  const apellidos = document.getElementById("apellidos").value;
  const nombres = document.getElementById("nombres").value;
  const estudios = document.getElementById("estudios").value.split(",").map(e => e.trim());
  const estado = "En espera";
  const fecha = new Date().toISOString().split("T")[0];

  db.ref("pacientes").push({
    sede,
    apellidos,
    nombres,
    estudios,
    estado,
    fecha
  });

  document.getElementById("sede").value = "";
  document.getElementById("apellidos").value = "";
  document.getElementById("nombres").value = "";
  document.getElementById("estudios").value = "";
}

function filtrarPorFecha() {
  const fechaFiltro = document.getElementById("filtroFecha").value;
  mostrarPacientes(fechaFiltro);
}

function mostrarPacientes(filtroFecha = "") {
  db.ref("pacientes").on("value", (snapshot) => {
    const lista = document.getElementById("listaPacientes");
    lista.innerHTML = "";
    let enEspera = 0;
    const data = [];

    snapshot.forEach(child => {
      const p = child.val();
      p.id = child.key;
      if (!filtroFecha || p.fecha === filtroFecha) data.push(p);
    });

    const orden = { "En espera": 1, "En atención": 2, "Programado": 3, "Atendido": 4 };
    data.sort((a, b) => orden[a.estado] - orden[b.estado]);

    data.forEach(p => {
      if (p.estado === "En espera") enEspera++;
      const div = document.createElement("div");
      div.className = `paciente ${colorEstado(p.estado)}`;
      div.innerHTML = `
        <strong>${p.apellidos}, ${p.nombres}</strong><br/>
        <em>Sede:</em> ${p.sede}<br/>
        <em>Estudios:</em> ${p.estudios.join(", ")}<br/>
        <em>Estado:</em> ${p.estado} - <em>Fecha:</em> ${p.fecha}
      `;
      lista.appendChild(div);
    });

    document.getElementById("contador").innerText = `Pacientes en espera: ${enEspera}`;
  });
}

function colorEstado(estado) {
  switch (estado) {
    case "En espera": return "rojo";
    case "En atención": return "naranja";
    case "Atendido": return "verde";
    case "Programado": return "azul";
    default: return "";
  }
}

mostrarPacientes();
