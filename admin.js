// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);

// ====== CAMBIO DE PESTAÑAS ======
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// ====== SEDES ======
function agregarSede(e) {
  e.preventDefault();
  const input = document.getElementById("nuevaSede");
  const nombre = input.value.trim();
  if (!nombre) return;

  const sedeRef = db.ref("sedes").push();
  sedeRef.set({ nombre });

  input.value = "";
}

// Mostrar sedes en tiempo real con botones
db.ref("sedes").on("value", (snapshot) => {
  const lista = document.getElementById("listaSedes");
  lista.innerHTML = "";
  snapshot.forEach(child => {
    const sede = child.val();
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${sede.nombre}</span>
      <button onclick="editarSede('${child.key}', '${sede.nombre}')">✏️</button>
      <button onclick="eliminarSede('${child.key}')">🗑</button>
    `;
    lista.appendChild(li);
  });
});

// Eliminar sede
function eliminarSede(id) {
  if (confirm("¿Seguro que deseas eliminar esta sede?")) {
    db.ref("sedes/" + id).remove();
  }
}

// Editar sede
function editarSede(id, nombreActual) {
  const nuevoNombre = prompt("Editar nombre de la sede:", nombreActual);
  if (nuevoNombre && nuevoNombre.trim() !== "") {
    db.ref("sedes/" + id).update({ nombre: nuevoNombre.trim() });
  }
}


// Mostrar sedes en tiempo real
db.ref("sedes").on("value", (snapshot) => {
  const lista = document.getElementById("listaSedes");
  lista.innerHTML = "";
  snapshot.forEach(child => {
    const li = document.createElement("li");
    li.textContent = child.val().nombre;
    lista.appendChild(li);
  });
});

