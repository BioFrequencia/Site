"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { IconesEscola } from "@/components/IconesEscola";
import { AlternarTema } from "@/components/AlternarTema";
import { Carregando } from "@/components/Carregando";
import { Icon } from "@/components/Icon";
import { tocarSom } from "@/lib/sons";
import type { EmailConfirmado } from "@/lib/types";

type Estado =
  | { tipo: "confirmando" }
  | { tipo: "sem-codigo" }
  | { tipo: "confirmado"; mensagem: string; dados: EmailConfirmado }
  | { tipo: "erro"; mensagem: string; vencido: boolean };

/**
 * Página do link que chega por e-mail (/confirmar-email?codigo=...): no
 * cadastro e na troca do e-mail de login. Lê o código, tira ele da barra
 * de endereço (e do histórico) e manda para a API.
 */
export default function ConfirmarEmailPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: "confirmando" });
  const pedido = useRef(false);

  useEffect(() => {
    // Em desenvolvimento o React roda o efeito duas vezes: o link é de uso único.
    if (pedido.current) return;
    pedido.current = true;
    const codigo = new URLSearchParams(window.location.search).get("codigo") ?? "";
    window.history.replaceState(null, "", "/confirmar-email");
    if (!codigo) {
      setEstado({ tipo: "sem-codigo" });
      return;
    }
    Api.confirmarEmail(codigo).then((resposta) => {
      if (resposta.sucesso && resposta.dados) {
        setEstado({ tipo: "confirmado", mensagem: resposta.mensagem, dados: resposta.dados });
        void tocarSom("confirmacao");
      } else {
        setEstado({ tipo: "erro", mensagem: resposta.mensagem, vencido: resposta.status === 410 });
        void tocarSom("erro");
      }
    });
  }, []);

  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <IconesEscola />
        <div className="auth-illustration-inner">
          <Logo tamanho={56} className="logo-sobre-indigo auth-logo" />
          <h1>Confirmação de e-mail</h1>
          <p>
            O e-mail é o seu login no BioFrequência e é por ele que chegam os avisos da sua conta. Confirmar mostra que ele é seu
            - e, numa conta nova, manda o pedido de acesso para quem aprova.
          </p>
        </div>
      </div>
      <div className="auth-card">
        <AlternarTema className="icon-btn auth-tema" />
        <div className="auth-form">
          <div className="auth-marca">
            <Logo tamanho={30} />
            Biofrequência
          </div>

          {estado.tipo === "confirmando" && <Carregando texto="Confirmando o seu e-mail…" />}

          {estado.tipo === "sem-codigo" && (
            <div className="auth-concluido pendente">
              <Icon name="mail" className="icon auth-concluido-icone" />
              <h2>Abra o link do e-mail</h2>
              <p>Esta página precisa do link completo que enviamos. Se você já confirmou, é só entrar.</p>
              <Link href="/login" className="btn btn-primary">
                Ir para o login
              </Link>
            </div>
          )}

          {estado.tipo === "confirmado" && (
            <div className="auth-concluido">
              <svg className="check-animado" viewBox="0 0 52 52" aria-hidden="true">
                <circle cx="26" cy="26" r="23" />
                <path d="M15 27l7 7 15-16" />
              </svg>
              <h2>E-mail confirmado</h2>
              {/* O título já diz isso: fica só o resto da mensagem da API. */}
              <p>{estado.mensagem.replace(/^E-mail confirmado\.\s*/, "")}</p>
              {estado.dados.situacao === "pendente" && estado.dados.finalidade === "cadastro" && (
                <ol className="passos-acesso">
                  <li className="feito">Conta criada</li>
                  <li className="feito">E-mail confirmado</li>
                  <li className="atual">
                    Aprovação {estado.dados.aprovacao === "gestao" ? "da gestão da escola" : "da equipe do BioFrequência"}
                    <small>Você recebe um e-mail quando o acesso for liberado.</small>
                  </li>
                </ol>
              )}
              <Link href="/login" className="btn btn-primary">
                {estado.dados.situacao === "ativo" ? "Entrar" : "Ir para o login"}
              </Link>
            </div>
          )}

          {estado.tipo === "erro" && (
            <div className="auth-concluido erro">
              <Icon name="alert" className="icon auth-concluido-icone" />
              <h2>{estado.vencido ? "Link vencido" : "Não deu para confirmar"}</h2>
              <p>{estado.mensagem}</p>
              <Link href="/login" className="btn btn-primary">
                Ir para o login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
