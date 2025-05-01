const db = firebase.database();
const pacientesRef = db.ref("pacientes");

const tablaResumen = document.getElementById("tablaResumen");
const paginacionDiv = document.getElementById("paginacion");

let pacientes = [];
let pacientesPorPagina = 50;
let paginaActual = 1;

function obtenerPacientes() {
  pacientesRef.on("value", (snapshot) => {
    pacientes = [];
    snapshot.forEach((child) => {
      pacientes.push({ id: child.key, ...child.val() });
    });

    mostrarPacientesPaginados();
  });
}

function ordenarPacientes(pacientesArray) {
  const ordenEstado = {
    "En espera": 1,
    "En atención": 2,
    "Programado": 3,
    "Atendido": 4,
  };

  return pacientesArray.sort((a, b) => {
    const estadoA = ordenEstado[a.estado] || 5;
    const estadoB = ordenEstado[b.estado] || 5;

    if (estadoA !== estadoB) {
      return estadoA - estadoB;
    }

    const fechaA = new Date(a.fechaModificacion || a.fecha || "2000-01-01");
    const fechaB = new Date(b.fechaModificacion || b.fecha || "2000-01-01");

    return fechaB - fechaA;
  });
}

function mostrarPacientesPaginados() {
  const pacientesOrdenados = ordenarPacientes(pacientes);
  const totalPaginas = Math.ceil(pacientesOrdenados.length / pacientesPorPagina);

  const inicio = (paginaActual - 1) * pacientesPorPagina;
  const fin = inicio + pacientesPorPagina;
  const pacientesPagina = pacientesOrdenados.slice(inicio, fin);

  tablaResumen.innerHTML = "";
  pacientesPagina.forEach((pac) => {
    const fila = document.createElement("tr");

    let clase = "";
    if (pac.estado === "En espera") clase = "color-en-espera";
    else if (pac.estado === "En atención") clase = "color-en-atencion";
    else if (pac.estado === "Atendido") clase = "color-atendido";
    else if (pac.estado === "Programado") clase = "color-programado";

    fila.className = clase;

    fila.innerHTML = `
      <td>${pac.sede || ""}</td>
      <td>${pac.apellidos || ""}</td>
      <td>${pac.nombres || ""}</td>
      <td>${pac.estudios ? pac.estudios.join(", ") : ""}</td>
      <td>${pac.cantidad || ""}</td>
      <td>${pac.estado || ""}</td>
      <td>${pac.fechaModificacion || pac.fecha || ""}</td>
    `;
    tablaResumen.appendChild(fila);
  });

  mostrarPaginacion(totalPaginas);
}

function mostrarPaginacion(totalPaginas) {
  paginacionDiv.innerHTML = "";

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "btn-pagina" + (i === paginaActual ? " activo" : "");
    btn.onclick = () => {
      paginaActual = i;
      mostrarPacientesPaginados();
    };
    paginacionDiv.appendChild(btn);
  }
}

obtenerPacientes();
