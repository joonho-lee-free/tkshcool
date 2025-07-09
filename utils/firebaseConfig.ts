import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBgo9r4epKHiq2CrXpayDtgHB4M_lgzC68",
  authDomain: "tkhealth-30380.firebaseapp.com",
  projectId: "tkhealth-30380",
  storageBucket: "tkhealth-30380.appspot.com", // ✅ 수정
  messagingSenderId: "692900691095",
  appId: "1:692900691095:web:babfe553aef6aa4dddfdd2",
  measurementId: "G-0MYSSGWH84",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app };

