import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { firebaseApp } from "./firebaseConfig";

// 인증 인스턴스 생성
const auth = getAuth(firebaseApp);

// ✅ 브라우저 로컬에 세션 유지 설정
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("🔥 Firebase Auth persistence error:", error);
});

export { auth };
