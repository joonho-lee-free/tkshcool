// pages/login.tsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../utils/firebaseAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      alert("✅ 로그인 성공");
    } catch (err: any) {
      alert(`로그인 실패: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>🔐 로그인</h1>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="비밀번호"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      <br />
      <button onClick={handleLogin}>로그인</button>
    </div>
  );
}
