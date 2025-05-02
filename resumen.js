const db = firebase.database();
const tbody = document.querySelector("#tablaPacientes tbody");
const filtroSede = document.getElementById("filtroSede");
const paginacionDiv = document.getElementById("paginacion");

let pacientes = [];
let pacientesFiltrados = [];
let pacientesPorPagina = 50;
let paginaActual = 1;

function cargarPacientes() {
  db.ref("pacientes").on("value", (snapshot) => {
    pacientes = [];

    snapshot.forEach((child) => {
      const pac = child.val();
      pac.id = child.key;
      pacientes.push(pac);
    });

    // Ordenar por estado y fecha (los más recientes primero)
    pacientes.sort((a, b) => {
      const estados = { "En espera": 1, "En atención": 2, "Programado": 3, "Atendido": 4 };
      if (estados[a.estado] !== estados[b.estado]) {
        return estados[a.estado] - estados[b.estado];
      }
      return (b.fechaModificacion || "").localeCompare(a.fechaModificacion || "");
    });

    aplicarFiltroYPaginar();
  });
}

function aplicarFiltroYPaginar() {
  const sedeSeleccionada = filtroSede.value;
  pacientesFiltrados = sedeSeleccionada
    ? pacientes.filter((p) => p.sede === sedeSeleccionada)
    : pacientes;

  mostrarPagina(paginaActual);
  mostrarPaginacion();
}

function mostrarPagina(pagina) {
  tbody.innerHTML = "";
  const inicio = (pagina - 1) * pacientesPorPagina;
  const fin = inicio + pacientesPorPagina;

  pacientesFiltrados.slice(inicio, fin).forEach((p) => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${p.estudios ? p.estudios.join(", ") : ""}</td>
      <td>${p.cant || ""}</td>
      <td style="background-color: ${colorEstado(p.estado)}">${p.estado}</td>
      <td>${p.fechaModificacion || ""}</td>
    `;
    tbody.appendChild(fila);
  });
}

function mostrarPaginacion() {
  const totalPaginas = Math.ceil(pacientesFiltrados.length / pacientesPorPagina);
  paginacionDiv.innerHTML = "";

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.disabled = i === paginaActual;
    btn.onclick = () => {
      paginaActual = i;
      mostrarPagina(paginaActual);
    };
    paginacionDiv.appendChild(btn);
  }
}

function colorEstado(estado) {
  switch (estado) {
    case "En espera": return "#ffcccc";      // rojo pastel
    case "En atención": return "#fff5ba";    // amarillo claro
    case "Programado": return "#cce5ff";     // celeste
    case "Atendido": return "#ccffcc";       // verde claro
    default: return "#f0f0f0";
  }
}

filtroSede.addEventListener("change", () => {
  paginaActual = 1;
  aplicarFiltroYPaginar();
});

cargarPacientes();
