"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

export default function PainelLayout({ children }: { children: ReactNode }) {
  const { autenticado, carregando } = useAuth();
  const router = useRouter();
  const [contadores, setContadores] = useState({ alertas: 0, notificacoes: 0, checkins: 0, ocorrencias: 0 });

  // Só redireciona daqui quem chegou numa tela do painel SEM nunca ter
  // tido sessão nesta visita (ex.: acessou a URL direto, sem estar
  // logado). Quando a sessão já esteve válida e caiu no meio do caminho
  // (token expirado numa chamada), é o callback de sessão expirada
  // (lib/auth.tsx) que já limpa e redireciona com o motivo - se este
  // efeito também redirecionasse aqui, a corrida entre os dois apagava
  // o "?motivo=expirada" da URL.
  const jaEsteveAutenticado = useRef(autenticado);
  useEffect(() => {
    if (autenticado) jaEsteveAutenticado.current = true;
  }, [autenticado]);

  useEffect(() => {
    if (!carregando && !autenticado && !jaEsteveAutenticado.current) router.replace("/login");
  }, [carregando, autenticado, router]);

  useEffect(() => {
    if (!autenticado) return;

    let ativo = true;
    async function carregarContadores() {
      // Sequencial de propósito, não Promise.all: bancos gerenciados com
      // limite baixo de conexões simultâneas (comum no plano gratuito do
      // Supabase sem usar o connection pooler) rejeitavam parte dessas
      // chamadas quando disparadas juntas, exatamente junto com as
      // chamadas próprias de cada tela - resultado real observado:
      // dashboard.php/filtroAluno.php falhando de forma intermitente.
      const dashboard = await Api.dashboard();
      if (!ativo) return;
      const notificacoes = await Api.listarNotificacoes("pendente", 1);
      if (!ativo) return;
      const checkins = await Api.listarCheckinsPendentes();
      if (!ativo) return;
      const ocorrencias = await Api.listarOcorrencias("pendente");
      if (!ativo) return;
      setContadores({
        alertas: dashboard.dados?.alertas_ativos ?? 0,
        notificacoes: notificacoes.dados?.total_registros ?? 0,
        checkins: checkins.dados?.length ?? 0,
        ocorrencias: ocorrencias.dados?.total ?? 0,
      });
    }
    carregarContadores();
    const intervalo = setInterval(carregarContadores, 45000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [autenticado]);

  if (carregando || !autenticado) {
    return <div className="loading-block">Carregando…</div>;
  }

  return (
    <div className="app">
      <Sidebar contadores={contadores} />
      <main className="main">
        <div className="view">{children}</div>
      </main>
    </div>
  );
}
