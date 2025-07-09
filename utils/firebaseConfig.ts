// utils/firebaseConfig.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgo4epYkdiQZcYxapDtgI8hM_qLZg68r",
  authDomain: "tkhealth-30380.firebaseapp.com",
  projectId: "tkhealth-30380",
  storageBucket: "tkhealth-30380.appspot.com",
  messagingSenderId: "692960061905",
  appId: "1:692960061905:web:babfe553aef6aa4dddfd02",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app };
export default db;
