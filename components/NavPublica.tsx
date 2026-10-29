"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

/**
 * Barra das páginas públicas (downloads). A página de downloads é aberta
 * também pelo menu do painel ("Baixar app e desktop"): para quem já está
 * logado ela mostrava "Entrar" e "Cadastrar coordenação" - e "Entrar"
 * levava ao login, que devolvia ao dashboard. Agora mostra o caminho de
 * volta ao painel.
 */
export function NavPublica() {
  const { autenticado, carregando } = useAuth();

  return (
    <nav className="top-public-nav">
      <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>
        Biofrequência
      </Link>
      <div style={{ display: "flex", gap: 10 }}>
        {carregando ? null : autenticado ? (
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Voltar ao painel
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-sm">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary btn-sm">
              Cadastrar coordenação
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
