const db = firebase.database();
const pacientesRef = db.ref("pacientes");

let pacientes = [];
let paginaActual = 1;
const pacientesPorPagina = 50;

function cargarPacientes() {
  pacientesRef.on("value", (snapshot) => {
    pacientes = [];
    snapshot.forEach((childSnapshot) => {
      const paciente = childSnapshot.val();
      paciente.id = childSnapshot.key;
      pacientes.push(paciente);
    });

    // Ordenar por fecha de modificación descendente
    pacientes.sort((a, b) => {
      const fechaA = new Date(a.fechaModificacion || a.fechaRegistro || 0);
      const fechaB = new Date(b.fechaModificacion || b.fechaRegistro || 0);
      return fechaB - fechaA;
    });

    mostrarPagina(paginaActual);
    crearPaginacion();
  });
}

function mostrarPagina(numeroPagina) {
  const inicio = (numeroPagina - 1) * pacientesPorPagina;
  const fin = inicio + pacientesPorPagina;
  const pacientesPagina = pacientes.slice(inicio, fin);

  const tbody = document.getElementById("tablaResumen");
  tbody.innerHTML = "";

  pacientesPagina.forEach((p) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${(Array.isArray(p.estudios) ? p.estudios.join(", ") : p.estudios) || ""}</td>
      <td>${p.cantidad || 1}</td>
      <td>${p.estado}</td>
      <td>${p.fechaModificacion || p.fechaRegistro || ""}</td>
    `;
    fila.classList.add(getColorFila(p.estado));
    tbody.appendChild(fila);
  });
}

function crearPaginacion() {
  const totalPaginas = Math.ceil(pacientes.length / pacientesPorPagina);
  const paginacion = document.getElementById("paginacion");
  paginacion.innerHTML = "";

  for (let i = 1; i <= totalPaginas; i++) {
    const boton = document.createElement("button");
    boton.textContent = i;
    boton.classList.add("btn-pagina");
    if (i === paginaActual) boton.classList.add("activo");
    boton.onclick = () => {
      paginaActual = i;
      mostrarPagina(paginaActual);
      crearPaginacion();
    };
    paginacion.appendChild(boton);
  }
}

function getColorFila(estado) {
  switch (estado) {
    case "En espera":
      return "color-en-espera";
    case "En atención":
      return "color-en-atencion";
    case "Atendido":
      return "color-atendido";
    case "Programado":
      return "color-programado";
    default:
      return "";
  }
}

window.onload = () => {
  cargarPacientes();
};
