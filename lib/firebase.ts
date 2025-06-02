// 파일명: lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./firebaseConfig"; // ✅ 수정된 부분: 중괄호 제거

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
