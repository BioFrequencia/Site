"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import { BarraProgresso } from "@/components/BarraProgresso";
import { Carregando } from "@/components/Carregando";
import { tocarSom } from "@/lib/sons";
import { CONTADORES_ZERADOS, temNovidade, type Contadores } from "@/lib/contadores";

// Os contadores do menu se atualizam sozinhos: sem a barra de carregamento.
const SEGUNDO_PLANO = { segundoPlano: true };

export default function PainelLayout({ children }: { children: ReactNode }) {
  const { autenticado, carregando, coordenacao } = useAuth();
  const router = useRouter();
  const [contadores, setContadores] = useState<Contadores>(CONTADORES_ZERADOS);
  const gestao = coordenacao?.papel === "gestor";
  const equipeDoSistema = !!coordenacao?.administrador;
  const contagemAnterior = useRef<Contadores | null>(null);

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
      const dashboard = await Api.dashboard(SEGUNDO_PLANO);
      if (!ativo) return;
      const notificacoes = await Api.listarNotificacoes("pendente", 1, SEGUNDO_PLANO);
      if (!ativo) return;
      const equipe = gestao ? await Api.equipe(SEGUNDO_PLANO) : null;
      if (!ativo) return;
      const resumo = equipeDoSistema ? await Api.adminResumo(SEGUNDO_PLANO) : null;
      if (!ativo) return;
      const novos: Contadores = {
        alertas: dashboard.dados?.alertas_ativos ?? 0,
        notificacoes: notificacoes.dados?.total_registros ?? 0,
        equipe: equipe?.dados?.pendentes ?? 0,
        admin: (resumo?.dados?.contas_pendentes ?? 0) + (resumo?.dados?.chamados_abertos ?? 0),
      };
      // Chegou algo novo desde a última consulta (não na primeira, ao abrir):
      // som de notificação (bloom), conforme as preferências da conta.
      if (contagemAnterior.current && temNovidade(contagemAnterior.current, novos)) {
        void tocarSom("notificacao");
      }
      contagemAnterior.current = novos;
      setContadores(novos);
    }
    carregarContadores();
    const intervalo = setInterval(carregarContadores, 45000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [autenticado, gestao, equipeDoSistema]);

  if (carregando || !autenticado) {
    return <Carregando tela texto="Conferindo a sua sessão…" />;
  }

  return (
    <div className="app">
      <BarraProgresso />
      <Sidebar contadores={contadores} />
      <main className="main">
        <div className="view">{children}</div>
      </main>
    </div>
  );
}
