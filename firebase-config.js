// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Configuración de Firebase (STAGING o PRODUCCIÓN según quieras probar)
const firebaseConfig = {
  apiKey: "AIzaSyA25H1n0isws9Jw8-LvOvqql2M1cEfzFaU",
  authDomain: "estado-pacientes-staging.firebaseapp.com",
  projectId: "estado-pacientes-staging",
  storageBucket: "estado-pacientes-staging.appspot.com",
  messagingSenderId: "17770566264",
  appId: "1:17770566264:web:bec6ff862496dc082f538d"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta la base de datos
export const db = getDatabase(app);

