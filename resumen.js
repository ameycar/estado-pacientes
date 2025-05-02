const dbRef = firebase.database().ref("pacientes");

const ESTADO_ORDEN = {
  "En espera": 1,
  "En atención": 2,
  "Programado": 3,
  "Atendido": 4
};

let pacientes = [];
let currentPage = 1;
const rowsPerPage = 50;

function renderTable(pacientesFiltrados) {
  const resumenBody = document.getElementById("resumenBody");
  resumenBody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedItems = pacientesFiltrados.slice(start, end);

  paginatedItems.forEach((paciente) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${paciente.fecha || ""}</td>
      <td>${paciente.sede}</td>
      <td>${paciente.apellidos}</td>
      <td>${paciente.nombres}</td>
      <td>${paciente.estudios}</td>
      <td>${paciente.cantidad || ""}</td>
      <td>${paciente.estado}</td>
      <td>${paciente.fechaModificacion || ""}</td>
    `;

    resumenBody.appendChild(row);
  });

  renderPagination(pacientesFiltrados.length);
}

function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  if (currentPage > 1) {
    const prev = document.createElement("button");
    prev.textContent = "← Anterior";
    prev.onclick = () => {
      currentPage--;
      renderTable(pacientes);
    };
    pagination.appendChild(prev);
  }

  if (currentPage < totalPages) {
    const next = document.createElement("button");
    next.textContent = "Siguiente →";
    next.onclick = () => {
      currentPage++;
      renderTable(pacientes);
    };
    pagination.appendChild(next);
  }
}

dbRef.on("value", (snapshot) => {
  pacientes = [];
  snapshot.forEach((childSnapshot) => {
    const paciente = childSnapshot.val();
    paciente.key = childSnapshot.key;
    pacientes.push(paciente);
  });

  pacientes.sort((a, b) => {
    const estadoA = ESTADO_ORDEN[a.estado] || 5;
    const estadoB = ESTADO_ORDEN[b.estado] || 5;

    if (estadoA !== estadoB) return estadoA - estadoB;

    const fechaA = new Date(b.fechaModificacion || "").getTime() || 0;
    const fechaB = new Date(a.fechaModificacion || "").getTime() || 0;
    return fechaA - fechaB;
  });

  currentPage = 1;
  renderTable(pacientes);
});
