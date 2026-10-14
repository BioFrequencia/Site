"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { autenticado, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    router.replace(autenticado ? "/dashboard" : "/login");
  }, [carregando, autenticado, router]);

  return <div className="loading-block">Carregando…</div>;
}
