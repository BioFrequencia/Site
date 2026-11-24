"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { telaInicial } from "@/lib/equipe";
import { Carregando } from "@/components/Carregando";

export default function Home() {
  const { autenticado, carregando, coordenacao } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    router.replace(autenticado ? telaInicial(coordenacao) : "/login");
  }, [carregando, autenticado, coordenacao, router]);

  return <Carregando tela />;
}
