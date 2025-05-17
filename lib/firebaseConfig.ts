// utils/firebaseConfig.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUezJZSuUZrcD9U8IDOTDRJ_7N0THiNFU",
  authDomain: "tkhealth-30380.firebaseapp.com",
  projectId: "tkhealth-30380",
  storageBucket: "tkhealth-30380.appspot.com",
  messagingSenderId: "116352337472834743034",
  appId: "1:116352337472834743034:web:exampleappidvalue"
};

// ✅ 이미 초기화된 Firebase 앱이 있으면 재사용, 없으면 새로 초기화
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(firebaseApp);

export { firebaseApp };
export default db;
