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

// Mostrar selector de cantidad para "Eco pb"
const estudioSelect = document.getElementById("estudios");
const formulario = document.getElementById("formulario");

const cantidadDiv = document.createElement("div");
cantidadDiv.id = "cantidad-div";
cantidadDiv.style.display = "none";

const labelCantidad = document.createElement("label");
labelCantidad.textContent = "Cantidad de Eco pb:";

const cantidadSelect = document.createElement("select");
cantidadSelect.id = "cantidad-eco-pb";
for (let i = 1; i <= 10; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = i;
  cantidadSelect.appendChild(option);
}

cantidadDiv.appendChild(labelCantidad);
cantidadDiv.appendChild(cantidadSelect);
formulario.insertBefore(cantidadDiv, formulario.querySelector('button'));

estudioSelect.addEventListener("change", function() {
  const seleccionados = Array.from(estudioSelect.selectedOptions).map(opt => opt.value);
  if (seleccionados.includes("Eco pb")) {
    cantidadDiv.style.display = "block";
  } else {
    cantidadDiv.style.display = "none";
  }
});

// Registrar pacientes
formulario.addEventListener("submit", function(e) {
  e.preventDefault();
  const sede = document.getElementById("sede").value.trim();
  const apellidos = document.getElementById("apellidos").value.trim();
  const nombres = document.getElementById("nombres").value.trim();
  const estudiosSeleccionados = Array.from(estudioSelect.selectedOptions).map(opt => opt.value);
  const cantidadEcoPb = parseInt(document.getElementById("cantidad-eco-pb").value) || 1;
  const ahora = new Date();
  const fecha = ahora.toISOString().split("T")[0];
  const hora = ahora.toLocaleTimeString();

  const estudiosFinales = estudiosSeleccionados.map(est => {
    if (est === "Eco pb") {
      return `Eco pb (${cantidadEcoPb})`;
    } else {
      return est;
    }
  });

  db.ref("pacientes").push({
    sede,
    apellidos,
    nombres,
    estudios: estudiosFinales,
    cantidad: estudiosSeleccionados.length - (estudiosSeleccionados.includes("Eco pb") ? 1 : 0) + (estudiosSeleccionados.includes("Eco pb") ? cantidadEcoPb : 0),
    estado: "En espera",
    fecha,
    modificado: `${fecha} ${hora}`
  });

  this.reset();
  cantidadDiv.style.display = "none";
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
      <td>${p.cantidad || 0}</td>
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
        <button onclick="eliminarPaciente('${p.id}', '${p.nombres} ${p.apellidos}')" style="background: none; border: none; cursor: pointer; color: red; font-size: 18px;">🗑️</button>
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

// Eliminar paciente
function eliminarPaciente(id, nombreCompleto) {
  const confirmar = confirm(`¿Deseas eliminar a ${nombreCompleto}?`);
  if (!confirmar) return;

  db.ref("pacientes/" + id).remove();
}
