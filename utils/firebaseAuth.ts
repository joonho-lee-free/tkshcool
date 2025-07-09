import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";

// 🔧 Firebase 설정 가져오기
import firebaseConfig from "./firebaseConfig";

// ✅ Firebase 앱 초기화
const firebaseApp = initializeApp(firebaseConfig);

// ✅ 인증 인스턴스 생성 (브라우저 로컬에 세션 유지)
const auth = initializeAuth(firebaseApp, {
  persistence: browserLocalPersistence,
});

export { auth };
