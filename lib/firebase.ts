// ✅ [기존코드 유지 + 연결 추가 완료]
// 파일명: lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
