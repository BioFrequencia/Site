"use client";

import { useEffect, useRef, useState } from "react";
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
  /** Fica na barra de baixo do celular; os outros vão para o "Mais". */
  principal?: boolean;
  /** Nome mais curto na barra do celular, onde cada item tem uns 70px. */
  curto?: string;
}

// Em grupos, na ordem do dia a dia: ver a escola, registrar, cuidar dos
// alunos e das famílias, configurar e pedir ajuda. As telas do celular
// do aluno (check-ins e ocorrências, fluxo anterior ao app da
// coordenação) saíram do menu; o relatório delas continua em Relatórios.
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Visão geral",
    itens: [
      { href: "/dashboard", label: "Dashboard", icone: "home", principal: true },
      { href: "/alertas", label: "Alertas", icone: "alert", badge: "alertas", principal: true },
    ],
  },
  {
    titulo: "Registros",
    itens: [
      { href: "/registros", label: "Entradas e saídas", icone: "clock", principal: true, curto: "Registros" },
      { href: "/presencas", label: "Presenças", icone: "userCheck" },
    ],
  },
  {
    titulo: "Alunos e famílias",
    itens: [
      { href: "/turmas", label: "Turmas e alunos", icone: "users", principal: true, curto: "Turmas" },
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

/**
 * Menu do painel. No computador, a coluna da esquerda com todos os grupos;
 * no tablet, só os ícones (o nome aparece ao passar o mouse e é lido pelo
 * leitor de tela); no celular, uma barra embaixo com as quatro telas do dia
 * a dia e o "Mais", que abre o menu inteiro com a conta e o Sair.
 */
export function Sidebar({ contadores }: { contadores: Contadores }) {
  const pathname = usePathname();
  const { coordenacao, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMais = useRef<HTMLButtonElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const visivel = (item: Item) =>
    !item.so || (item.so === "equipe" ? !!coordenacao?.administrador : coordenacao?.papel === "gestor");
  const ativo = (item: Item) => pathname === item.href || pathname.startsWith(item.href + "/");
  const grupos = GRUPOS.map((grupo) => ({ ...grupo, itens: grupo.itens.filter(visivel) })).filter((grupo) => grupo.itens.length > 0);
  const escondidos = grupos.flatMap((grupo) => grupo.itens).filter((item) => !item.principal);
  // O "Mais" se destaca quando a tela aberta está dentro dele, e ganha um
  // ponto quando algo lá dentro tem contador (equipe, notificações).
  const maisAtivo = escondidos.some(ativo);
  const maisComAviso = escondidos.some((item) => item.badge && contadores[item.badge] > 0);

  function fecharMenu() {
    setMenuAberto(false);
    botaoMais.current?.focus();
  }

  useEffect(() => {
    if (!menuAberto) return;
    botaoFechar.current?.focus();
    const rolagemAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const teclas = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setMenuAberto(false);
        botaoMais.current?.focus();
      }
    };
    document.addEventListener("keydown", teclas);
    return () => {
      document.body.style.overflow = rolagemAntes;
      document.removeEventListener("keydown", teclas);
    };
  }, [menuAberto]);

  function contadorDe(item: Item) {
    const contador = item.badge ? contadores[item.badge] : 0;
    return contador > 0 ? <span className="nav-badge">{contador}</span> : null;
  }

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <Logo tamanho={34} />
          <div>
            <div className="brand-name">BioFrequência</div>
            <div className="brand-sub">Coordenação escolar</div>
          </div>
        </div>

        <nav className="nav" aria-label="Menu">
          {grupos.map((grupo) => (
            <div className="nav-grupo" key={grupo.titulo}>
              <div className="nav-grupo-titulo">{grupo.titulo}</div>
              {grupo.itens.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={ativo(item) ? "page" : undefined}
                  className={`nav-item${ativo(item) ? " active" : ""}${item.principal ? " nav-principal" : ""}${item.curto ? " tem-curto" : ""}`}
                >
                  <Icon name={item.icone} />
                  <span className="label">{item.label}</span>
                  {item.curto && (
                    <span className="label-curto" aria-hidden="true">
                      {item.curto}
                    </span>
                  )}
                  {contadorDe(item)}
                </Link>
              ))}
            </div>
          ))}
          <button
            ref={botaoMais}
            type="button"
            className={`nav-item nav-mais${maisAtivo ? " active" : ""}`}
            aria-expanded={menuAberto}
            aria-controls="menu-celular"
            aria-label={maisComAviso ? "Mais (há novidades)" : "Mais"}
            onClick={() => setMenuAberto(true)}
          >
            <Icon name="menu" />
            <span className="label">Mais</span>
            {maisComAviso && <span className="nav-ponto" aria-hidden="true" />}
          </button>
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

      {/* Só existe no celular (o botão "Mais" some nas telas maiores). */}
      {menuAberto && (
        <div className="menu-celular-fundo" onClick={fecharMenu}>
          <div
            id="menu-celular"
            className="menu-celular"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="menu-celular-topo">
              <strong>Menu</strong>
              <button ref={botaoFechar} type="button" className="icon-btn" onClick={fecharMenu} aria-label="Fechar o menu">
                <Icon name="x" />
              </button>
            </div>
            {grupos.map((grupo) => (
              <section key={grupo.titulo} className="menu-celular-grupo">
                <h2>{grupo.titulo}</h2>
                {grupo.itens.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={ativo(item) ? "page" : undefined}
                    className={ativo(item) ? "active" : undefined}
                    onClick={() => setMenuAberto(false)}
                  >
                    <Icon name={item.icone} />
                    <span>{item.label}</span>
                    {contadorDe(item)}
                  </Link>
                ))}
              </section>
            ))}
            <div className="menu-celular-conta">
              <div className="avatar">{iniciais(coordenacao?.nome_coordenacao ?? "?")}</div>
              <div className="menu-celular-quem">
                <strong>{coordenacao?.nome_coordenacao}</strong>
                <span>
                  {coordenacao?.nome_escola || "Coordenação"}
                  {coordenacao?.papel === "gestor" && " · gestão"}
                </span>
              </div>
              <button type="button" className="btn" onClick={logout}>
                <Icon name="logout" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
