import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebaseAuth";

export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  const ComponentWithAuth = (props: P): React.ReactElement | null => {
    const [user, loading] = useAuthState(auth);
    const router = useRouter();

    useEffect(() => {
      if (typeof window !== "undefined" && !loading && !user) {
        router.replace("/login");
      }
    }, [user, loading, router]);

    if (typeof window === "undefined" || loading || !user) {
      return <div>🔐 인증 확인 중...</div>;
    }

    return <WrappedComponent {...props} />;
  };

  return ComponentWithAuth;
}
