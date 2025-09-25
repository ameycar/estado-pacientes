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

