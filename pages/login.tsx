import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 이미 로그인되어 있으면 메인 페이지로 리다이렉트
        router.replace("/");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(() => {
        // 로그인 성공 시 자동으로 onAuthStateChanged 콜백에서 리다이렉트 됨
      })
      .catch((error) => {
        console.error("Login error:", error);
      });
  };

  if (loading) {
    return <div className="p-4 flex items-center justify-center h-screen">로딩 중...</div>;
  }

  return (
    <div className="p-4 flex flex-col items-center justify-center h-screen">
      <h2 className="text-xl mb-4">로그인이 필요합니다</h2>
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Google 로그인
      </button>
    </div>
  );
}
