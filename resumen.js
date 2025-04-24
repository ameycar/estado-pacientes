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
const tabla = document.getElementById("tabla-pacientes");
const contador = document.getElementById("contador");

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
    "En espera": "#f8d7da",
    "En atención": "#fff3cd",
    "Atendido": "#d4edda",
    "Programado": "#d1ecf1"
  };

  let pacientes = [];
  snapshot.forEach(child => {
    const data = child.val();
    pacientes.push(data);
  });

  pacientes.sort((a, b) => estadosOrden[a.estado] - estadosOrden[b.estado]);

  pacientes.forEach(data => {
    if (data.estado === "En espera") enEspera++;
    const fila = document.createElement("tr");
    fila.style.backgroundColor = colores[data.estado] || "#fff";
    fila.innerHTML = `
      <td>${data.sede}</td>
      <td>${data.apellidos}</td>
      <td>${data.nombres}</td>
      <td>${(data.estudios || []).join(", ")}</td>
      <td>${data.estado}<br><small>${data.ultimaModificacion || ""}</small></td>
    `;
    tabla.appendChild(fila);
  });

  contador.innerText = `Pacientes en espera: ${enEspera}`;
});
