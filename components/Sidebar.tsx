"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { iniciais } from "@/lib/format";
import { useAuth } from "@/lib/auth";

const ITENS = [
  { href: "/dashboard", label: "Dashboard", icone: "home" as const, badge: undefined as "alertas" | "notificacoes" | "checkins" | "ocorrencias" | undefined },
  { href: "/alertas", label: "Alertas", icone: "alert" as const, badge: "alertas" as const },
  { href: "/turmas", label: "Turmas e alunos", icone: "users" as const, badge: undefined },
  // Os envios do aplicativo ficam logo abaixo de alertas porque são a
  // outra fila que exige decisão da coordenação.
  { href: "/ocorrencias", label: "Ocorrências do app", icone: "inbox" as const, badge: "ocorrencias" as const },
  // Responsáveis existia só dentro da ficha do aluno, sem entrada no
  // menu - a coordenação não encontrava e achava que o sistema não
  // cadastrava responsáveis.
  { href: "/responsaveis", label: "Responsáveis", icone: "shield" as const, badge: undefined },
  { href: "/acompanhamento", label: "Acompanhamento", icone: "activity" as const, badge: undefined },
  { href: "/relatorios", label: "Relatórios", icone: "fileText" as const, badge: undefined },
  { href: "/notificacoes", label: "Notificações", icone: "bell" as const, badge: "notificacoes" as const },
  { href: "/checkins", label: "Check-ins", icone: "fingerprint" as const, badge: "checkins" as const },
  { href: "/downloads", label: "Baixar app e desktop", icone: "download" as const, badge: undefined },
];

export function Sidebar({
  contadores,
}: {
  contadores: { alertas: number; notificacoes: number; checkins: number; ocorrencias: number };
}) {
  const pathname = usePathname();
  const { coordenacao, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="fingerprint" />
        </div>
        <div>
          <div className="brand-name">Biofrequência</div>
          <div className="brand-sub">Coordenação escolar</div>
        </div>
      </div>

      <nav className="nav">
        {ITENS.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
          const contador = item.badge ? contadores[item.badge] : 0;
          return (
            <Link key={item.href} href={item.href} className={`nav-item${ativo ? " active" : ""}`}>
              <Icon name={item.icone} />
              <span className="label">{item.label}</span>
              {contador > 0 && <span className="nav-badge">{contador}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">{iniciais(coordenacao?.nome_coordenacao ?? "?")}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{coordenacao?.nome_coordenacao}</div>
          <div className="user-role">Coordenação</div>
        </div>
        <button type="button" className="icon-btn" onClick={logout} title="Sair" aria-label="Sair">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
