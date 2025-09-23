// Config Firebase
const firebaseConfig = {
  apiKey: "TU_APIKEY",
  authDomain: "app-ecografia.firebaseapp.com",
  databaseURL: "https://app-ecografia.firebaseio.com",
  projectId: "app-ecografia",
  storageBucket: "app-ecografia.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123456:web:abcdef"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Referencias
const form = document.getElementById("paciente-form");
const pacientesBody = document.getElementById("pacientes-body");

// Modal firma
const modal = document.getElementById("firma-modal");
const signaturePad = document.getElementById("signature-pad");
const ctx = signaturePad.getContext("2d");
let drawing = false;
let currentPacienteId = null;

// Firma en canvas
signaturePad.addEventListener("mousedown", () => drawing = true);
signaturePad.addEventListener("mouseup", () => drawing = false);
signaturePad.addEventListener("mousemove", draw);
signaturePad.addEventListener("touchstart", () => drawing = true);
signaturePad.addEventListener("touchend", () => drawing = false);
signaturePad.addEventListener("touchmove", drawTouch);

function draw(e) {
  if (!drawing) return;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}
function drawTouch(e) {
  e.preventDefault();
  const rect = signaturePad.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

document.getElementById("clear-signature").addEventListener("click", () => {
  ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
});

// Guardar paciente
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const paciente = {
    sede: document.getElementById("sede").value,
    apellidos: document.getElementById("apellidos").value,
    nombres: document.getElementById("nombres").value,
    estudios: Array.from(document.getElementById("estudios").selectedOptions).map(o => o.value),
    precio: document.getElementById("precio").value || "",
    pf: document.getElementById("pf").value || "",
    estado: "Programado",
    placas: "",
    cd: "",
    informe: "",
    firma: ""
  };
  db.ref("pacientes").push(paciente);
  form.reset();
});

// Mostrar pacientes
db.ref("pacientes").on("value", (snapshot) => {
  pacientesBody.innerHTML = "";
  snapshot.forEach(child => {
    const p = child.val();
    const id = child.key;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.sede}</td>
      <td>${p.apellidos}</td>
      <td>${p.nombres}</td>
      <td>${p.estudios.join(", ")}</td>
      <td>${p.precio}</td>
      <td>${p.pf}</td>
      <td>
        <select data-id="${id}" class="estado-select">
          <option ${p.estado==="Programado"?"selected":""}>Programado</option>
          <option ${p.estado==="En espera"?"selected":""}>En espera</option>
          <option ${p.estado==="En atención"?"selected":""}>En atención</option>
          <option ${p.estado==="Atendido"?"selected":""}>Atendido</option>
          <option ${p.estado==="Entregado"?"selected":""}>Entregado</option>
        </select>
      </td>
      <td>${p.placas}</td>
      <td>${p.cd}</td>
      <td>${p.informe}</td>
      <td>${p.firma ? `<img src="${p.firma}" width="80">` : ""}</td>
      <td><button class="delete-btn" data-id="${id}">Eliminar</button></td>
    `;

    pacientesBody.appendChild(tr);

    // Bloqueo estado si ya está entregado
    if (p.estado === "Entregado") {
      tr.querySelector(".estado-select").disabled = true;
    }
  });
});

// Cambio estado
document.addEventListener("change", (e) => {
  if (e.target.classList.contains("estado-select")) {
    const id = e.target.dataset.id;
    const nuevoEstado = e.target.value;

    if (nuevoEstado === "Entregado") {
      currentPacienteId = id;
      modal.style.display = "block";
    } else {
      db.ref("pacientes/" + id).update({ estado: nuevoEstado });
    }
  }
});

// Guardar entrega con firma
document.getElementById("save-firma").addEventListener("click", () => {
  const placas = document.getElementById("modal-placas").value;
  const cd = document.getElementById("modal-cd").value;
  const informe = document.getElementById("modal-informe").value;
  const firmaData = signaturePad.toDataURL();

  if (!placas || !cd || !informe || ctx.getImageData(0,0,signaturePad.width,signaturePad.height).data.every(v => v===0)) {
    alert("Debe completar Placas, CD, Informe y la firma.");
    return;
  }

  db.ref("pacientes/" + currentPacienteId).update({
    estado: "Entregado",
    placas,
    cd,
    informe,
    firma: firmaData
  });
  modal.style.display = "none";
  ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
});

// Eliminar con clave
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    const clave = prompt("Ingrese clave de administrador:");
    if (clave === "1234") {
      db.ref("pacientes/" + id).remove();
    } else {
      alert("Clave incorrecta");
    }
  }
});
