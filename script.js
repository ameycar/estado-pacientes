// Configuración Firebase
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
const cantidadEcoPbDiv = document.getElementById("cantidad-eco-pb");
const cantidadEcoPbSelect = document.getElementById("cantidad-eco-pb");

// Mostrar la selección de cantidad para "Eco pb"
document.getElementById("estudios").addEventListener("change", function() {
  const selectedOptions = Array.from(this.selectedOptions).map(opt => opt.value);
  
  if (selectedOptions.includes("Eco pb")) {
    cantidadEcoPbDiv.style.display = "block";
  } else {
    cantidadEcoPbDiv.style.display = "none";
  }
});

// Registrar pacientes
document.getElementById("formulario").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const sede = document.getElementById("sede").value.trim();
  const apellidos = document.getElementById("apellidos").value.trim();
  const nombres = document.getElementById("nombres").value.trim();
  const estudioSelect = document.getElementById("estudios");
  const estudios = Array.from(estudioSelect.selectedOptions).map(opt => opt.value);
  
  // Verificar si se seleccionó "Eco pb" y agregar la cantidad
  if (estudios.includes("Eco pb")) {
    const cantidadEcoPb = cantidadEcoPbSelect.value || 1;  // Valor por defecto 1 si no se selecciona
    const index = estudios.indexOf("Eco pb");
    estudios[index] = `Eco pb (${cantidadEcoPb})`;  // Modificar el estudio con la cantidad
  }

  const ahora = new Date();
  const fecha = ahora.toISOString().split("T")[0];
  const hora = ahora.toLocaleTimeString();

  db.ref("pacientes").push({
    sede,
    apellidos,
    nombres,
    estudios,
    estado: "En espera",
    fecha,
    modificado: `${fecha} ${hora}`
  });

  this.reset();
});

// Mostrar pacientes
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

// Cambiar estado
function cambiarEstado(id, nuevoEstado, nombreCompleto) {
  const confirmar = confirm(`¿Deseas cambiar el estado de ${nombreCompleto} a "${nuevoEstado}"?`);
  if (!confirmar) return;

  const ahora = new Date();
  const fecha = ahora.toISOString().split("T")[0];
  const hora = ahora.toLocaleTimeString();

  db.ref("pacientes/" + id).update({
    estado: nuevoEstado,
    modificado: `${fecha} ${hora}`
  });
}
