// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getDatabase, ref, push, set, onValue, update, remove 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ⚠️ Reemplaza con tu configuración real de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "app-ecografia.firebaseapp.com",
  databaseURL: "https://app-ecografia.firebaseio.com",
  projectId: "app-ecografia",
  storageBucket: "app-ecografia.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Exportar
export { db, ref, push, set, onValue, update, remove };
