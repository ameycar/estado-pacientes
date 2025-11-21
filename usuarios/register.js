import { db, auth } from "../firebase-config.js";
import { ref, get, push, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Cargar sedes activas desde Firebase
const sedeSelect = document.getElementById("sede");
const sedesRef = ref(db, "sedes");

get(sedesRef).then(snapshot => {
  if (snapshot.exists()) {
    snapshot.forEach(sede => {
      const opt = document.createElement("option");
      opt.value = sede.key;
      opt.textContent = sede.val().nombre;
      sedeSelect.appendChild(opt);
    });
  }
});

// Registro de usuario
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const sede = document.getElementById("sede").value;
  const rol = document.getElementById("rol").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Guardar datos extra del usuario en Realtime Database
    await set(ref(db, "usuarios/" + userId), {
      nombre,
      email,
      sede,
      rol,
      activo: true
    });

    alert("✅ Usuario registrado correctamente");
    document.getElementById("registerForm").reset();
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
});
