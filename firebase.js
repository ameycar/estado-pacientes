// firebase.js  (v9 modular, cargado como módulo ES)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

/* ----- Pega aquí TU configuración de Firebase ----- */
/* Ejemplo con tu staging (ajusta databaseURL si corresponde) */
const firebaseConfig = {
  apiKey: "AIzaSyA25H1n0isws9Jw8-LvOvqql2M1cEfzFaU",
  authDomain: "estado-pacientes-staging.firebaseapp.com",
  databaseURL: "https://estado-pacientes-staging-default-rtdb.firebaseio.com", // AJUSTA si tu DB URL es diferente
  projectId: "estado-pacientes-staging",
  storageBucket: "estado-pacientes-staging.appspot.com",
  messagingSenderId: "17770566264",
  appId: "1:17770566264:web:bec6ff862496dc082f538d"
};
/* ------------------------------------------------- */

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
