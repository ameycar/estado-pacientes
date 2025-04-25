const firebaseConfig = {
  apiKey: "AIzaSyAX2VYw2XVs6DGsw38rCFaSbk3VuUA60y4",
  authDomain: "estado-pacientes.firebaseapp.com",
  databaseURL: "https://estado-pacientes-default-rtdb.firebaseio.com",
  projectId: "estado-pacientes",
  storageBucket: "estado-pacientes.appspot.com",
  messagingSenderId: "515522648971",
  appId: "1:515522648971:web:d7b6e9cde4a7d36181ad8e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tabla = document.getElementById("tabla-pacientes");
const contador = document.getElementById("contador");

document.getElementById("formulario")?.addEventListener("submit", function(e) {
  e.preventDefault();
  const sede = document.getElementById("sede").value;
  const apellidos = document.getElementById("apellidos").value;
  const nombres = document.getElementById("nombres").value;
  const estudios = Array.from(document.getElementById("estudios").selectedOptions).map(opt => opt.value);
  const fecha = new Date();
  const fechaRegistro = fecha.toLocaleDateString();
  const horaRegistro = fecha.toLocaleTimeString();

  db.ref("pacientes").push({
    sede,
    apellidos,
    nombres,
    estudios,
    estado: "En espera",
    fecha: fechaRegistro,
    hora: horaRegistro,
    modificado: `${fechaRegistro} ${horaRegistro}`
  });

  this.reset();
});

db.ref("pacientes").on("value", (snapshot) => {
  tabla.innerHTML = "";
  let enEspera = 0;
  const colores = {
    "En espera": "#ffcccc",
    "En atención": "#fff3cd",
    "Atendido": "#d4edda",
    "Programado": "#cce5ff"
  };

  const pacientes = [];
  snapshot.forEach(child => {
    const data = child.val();
    pacientes.push({ id: child.key, ...data });
  });

  pacientes.sort((a, b) => {
    const orden = { "En espera": 1, "En atención": 2, "Programado": 3, "Atendido": 4 };
    return orden[a.estado] - orden[b.estado];
  });

  pacientes.forEach(data => {
    if (data.estado === "En espera") enEspera++;
    const fila = document.createElement("tr");
    fila.style.backgroundColor = colores[data.estado] || "#fff";
    fila.innerHTML = `
      <td>${data.sede}</td>
      <td>${data.apellidos}</td>
      <td>${data.nombres}</td>
      <td>${(data.estudios || []).join(", ")}</td>
      <td>${(data.estudios || []).length}</td>
      <td>${data.estado}<br><small>${data.modificado || ""}</small></td>
      <td>
        ${typeof cambiarEstado === "function" ? `
        <select onchange="cambiarEstado('${data.id}', this.value, '${data.nombres} ${data.apellidos}')">
          <option disabled selected>Cambiar estado</option>
          <option value="Programado">Programado</option>
          <option value="En espera">En espera</option>
          <option value="En atención">En atención</option>
          <option value="Atendido">Atendido</option>
        </select>
        ` : `-`}
      </td>
    `;
    tabla.appendChild(fila);
  });

  if (contador) {
    contador.innerText = `Pacientes en espera: ${enEspera}`;
  }
});

function cambiarEstado(id, nuevoEstado, nombreCompleto) {
  const confirmar = confirm(`¿Deseas cambiar el estado de ${nombreCompleto} a "${nuevoEstado}"?`);
  if (!confirmar) return;
  const fecha = new Date();
  const modificado = `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`;
  db.ref("pacientes/" + id).update({ estado: nuevoEstado, modificado });
}
