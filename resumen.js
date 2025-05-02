// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "

https://estado-pacientes-default-rtdb.firebaseio.com

",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.appspot.com",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tabla = document.getElementById("tabla-pacientes");
const contador = document.getElementById("contador");

db.ref("pacientes").on("value", (snapshot) => {
  tabla.innerHTML = "";
  let enEspera = 0;

  const colores = {
    "En espera": "#f8d7da",
    "En atención": "#fff3cd",
    "Programado": "#cfe2ff",
    "Atendido": "#d4edda"
  };

  const ordenEstado = {
    "En espera": 1,
    "En atención": 2,
    "Programado": 3,
    "Atendido": 4
  };

  const pacientes = [];

  snapshot.forEach(child => {
    pacientes.push({ id: child.key, ...child.val() });
  });

  pacientes.sort((a, b) => ordenEstado[a.estado] - ordenEstado[b.estado]);

  pacientes.forEach(p => {
    if (p.estado === "En espera") enEspera++;

    const fila = document.createElement("tr");
    fila.style.backgroundColor = colores[p.estado] || "#fff";

    fila.innerHTML = `
      <td>${p.sede || ""}</td>
      <td>${p.apellidos || ""}</td>
      <td>${p.nombres || ""}</td>
      <td>${(p.estudios || []).join(", ")}</td>
      <td>
        ${p.estado}<br><small>${p.modificado || ""}</small>
      </td>
      <td>-</td>
    `;
    tabla.appendChild(fila);
  });

  contador.innerText = `Pacientes en espera: ${enEspera}`;
});
