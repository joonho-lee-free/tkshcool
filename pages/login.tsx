// pages/login.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../utils/firebaseAuth"; // ⬅️ 이 파일도 함께 필요합니다

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      alert("로그인 성공");
      router.push("/"); // 로그인 후 메인으로 이동
    } catch (error: any) {
      alert("로그인 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "100px auto", border: "1px solid #ccc", borderRadius: 8 }}>
      <h2 style={{ marginBottom: 20 }}>TKBid 로그인</h2>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 20 }}
      />
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ width: "100%", padding: 10, background: "#0070f3", color: "white", border: "none", borderRadius: 4 }}
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
    </div>
  );
}
