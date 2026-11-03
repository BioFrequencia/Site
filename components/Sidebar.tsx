"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { iniciais } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { Contadores } from "@/lib/contadores";

interface Item {
  href: string;
  label: string;
  icone: string;
  badge?: keyof Contadores;
  /** Só para a gestão da escola ou só para a equipe do sistema. */
  so?: "gestao" | "equipe";
}

// Em grupos, na ordem do dia a dia: ver a escola, registrar, cuidar dos
// alunos e das famílias, configurar e pedir ajuda. As telas do celular
// do aluno (check-ins e ocorrências, fluxo anterior ao app da
// coordenação) saíram do menu; o relatório delas continua em Relatórios.
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Visão geral",
    itens: [
      { href: "/dashboard", label: "Dashboard", icone: "home" },
      { href: "/alertas", label: "Alertas", icone: "alert", badge: "alertas" },
    ],
  },
  {
    titulo: "Registros",
    itens: [
      { href: "/registros", label: "Entradas e saídas", icone: "clock" },
      { href: "/presencas", label: "Presenças", icone: "userCheck" },
    ],
  },
  {
    titulo: "Alunos e famílias",
    itens: [
      { href: "/turmas", label: "Turmas e alunos", icone: "users" },
      { href: "/responsaveis", label: "Responsáveis", icone: "shield" },
      { href: "/notificacoes", label: "Notificações", icone: "bell", badge: "notificacoes" },
      { href: "/acompanhamento", label: "Acompanhamento", icone: "activity" },
      { href: "/relatorios", label: "Relatórios", icone: "fileText" },
    ],
  },
  {
    titulo: "Escola",
    itens: [
      { href: "/escola", label: "Escola", icone: "building", badge: "equipe" },
      { href: "/admin", label: "Administração", icone: "settings", badge: "admin", so: "equipe" },
    ],
  },
  {
    titulo: "Ajuda",
    itens: [
      { href: "/como-funciona", label: "Como funciona", icone: "book" },
      { href: "/suporte", label: "Suporte", icone: "lifeBuoy" },
      { href: "/downloads", label: "Baixar app", icone: "download" },
      { href: "/conta", label: "Minha conta", icone: "user" },
    ],
  },
];

export function Sidebar({ contadores }: { contadores: Contadores }) {
  const pathname = usePathname();
  const { coordenacao, logout } = useAuth();
  const visivel = (item: Item) =>
    !item.so || (item.so === "equipe" ? !!coordenacao?.administrador : coordenacao?.papel === "gestor");

  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo tamanho={34} />
        <div>
          <div className="brand-name">Biofrequência</div>
          <div className="brand-sub">Coordenação escolar</div>
        </div>
      </div>

      <nav className="nav">
        {GRUPOS.map((grupo) => {
          const itens = grupo.itens.filter(visivel);
          if (itens.length === 0) return null;
          return (
            <div className="nav-grupo" key={grupo.titulo}>
              <div className="nav-grupo-titulo">{grupo.titulo}</div>
              {itens.map((item) => {
                const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
                const contador = item.badge ? contadores[item.badge] : 0;
                return (
                  <Link key={item.href} href={item.href} className={`nav-item${ativo ? " active" : ""}`}>
                    <Icon name={item.icone} />
                    <span className="label">{item.label}</span>
                    {contador > 0 && (
                      <span className="nav-badge" key={contador}>
                        {contador}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Link href="/conta" className="sidebar-conta" title="Minha conta">
          <div className="avatar">{iniciais(coordenacao?.nome_coordenacao ?? "?")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{coordenacao?.nome_coordenacao}</div>
            <div className="user-role">
              {coordenacao?.nome_escola || "Coordenação"}
              {coordenacao?.papel === "gestor" && " · gestão"}
            </div>
          </div>
        </Link>
        <button type="button" className="icon-btn" onClick={logout} title="Sair" aria-label="Sair">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
