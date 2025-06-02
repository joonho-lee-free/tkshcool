// 파일명: pages/login.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // 이미 로그인된 상태라면 메인 페이지('/')로 자동 이동
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // 로그인 성공 시 onAuthStateChanged 훅이 실행되어 자동 리다이렉트
    } catch (error) {
      console.error("Google 로그인 실패:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">로그인</h1>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 533.5 544.3"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M533.5 278.4c0-17.5-1.4-35-4.5-52H272v98.4h146.6c-6.3 34.1-25.4 63-54 82.1v68h87.4c51-46.9 80.5-116.3 80.5-196.5z"
              fill="#4285F4"
            />
            <path
              d="M272 544.3c73.4 0 135.1-24.3 180.2-65.8l-87.4-68c-24.3 16.3-55.3 25.9-92.8 25.9-71 0-131.2-47.9-152.7-112.3h-90v70.5c45 88.3 138.1 150 242.7 150z"
              fill="#34A853"
            />
            <path
              d="M119.3 324.3c-10.3-30-10.3-62.2 0-92.2v-70.5h-90c-39.5 77.2-39.5 167.1 0 244.3l90-70.5z"
              fill="#FBBC05"
            />
            <path
              d="M272 107.1c39.9 0 75.9 13.7 104.2 40.7l78-78c-49.9-46.5-115.7-75-182.2-75-104.6 0-197.7 61.7-242.7 150l90 70.5C140.8 155 201 107.1 272 107.1z"
              fill="#EA4335"
            />
          </svg>
          <span>Google 계정으로 로그인</span>
        </button>
      </div>
    </div>
  );
}
