// Importa lo necesario de Firebase
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// ⚡ Configuración de tu proyecto STAGING
const firebaseConfig = {
  apiKey: "AIzaSyA25H1n0isws9Jw8-LvOvqql2M1cEfzFaU",
  authDomain: "estado-pacientes-staging.firebaseapp.com",
  projectId: "estado-pacientes-staging",
  storageBucket: "estado-pacientes-staging.appspot.com",
  messagingSenderId: "17770566264",
  appId: "1:17770566264:web:bec6ff862496dc082f538d"
};

// Inicializa la app de Firebase
const app = initializeApp(firebaseConfig);

// Exporta la conexión a la base de datos
export const db = getDatabase(app);
