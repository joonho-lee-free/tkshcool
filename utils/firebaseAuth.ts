import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { firebaseApp } from "./firebaseConfig";

// Firebase 인증 인스턴스 생성
const auth = getAuth(firebaseApp);

// ✅ 인증 퍼시스턴스를 로컬 저장소로 설정
const initAuth = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Firebase persistence set to browserLocalPersistence");
  } catch (error) {
    console.error("🔥 Firebase Auth persistence error:", error);
  }
};

export { auth, initAuth };
