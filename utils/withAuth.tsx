import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, initAuth } from "./firebaseAuth";

export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  const ComponentWithAuth = (props: P): React.ReactElement | null => {
    const [user, loading] = useAuthState(auth);
    const router = useRouter();

    useEffect(() => {
      // ✅ 브라우저 로컬에 세션 유지 설정
      initAuth();
    }, []);

    useEffect(() => {
      // ✅ 인증 복구 완료 후 사용자 없으면 로그인 페이지로 이동
      if (!loading && !user) {
        router.replace("/login");
      }
    }, [user, loading, router]);

    if (loading) {
      return <div>🔐 인증 확인 중...</div>;
    }

    if (!user) {
      return null; // 로그인 페이지로 이동 중이므로 아무것도 렌더링하지 않음
    }

    return <WrappedComponent {...props} />;
  };

  return ComponentWithAuth;
}
