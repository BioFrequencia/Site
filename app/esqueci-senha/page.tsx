"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { IconesEscola } from "@/components/IconesEscola";
import { AlternarTema } from "@/components/AlternarTema";
import { Icon } from "@/components/Icon";

/**
 * "Esqueci minha senha": manda o link para criar uma senha nova. A resposta
 * é a mesma com ou sem conta para o e-mail - a página não revela quem está
 * cadastrado.
 */
export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!email.trim()) {
      setErro("Informe o e-mail da sua conta.");
      return;
    }
    setEnviando(true);
    const resposta = await Api.esqueciSenha(email.trim());
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem || "Não foi possível pedir a senha nova agora. Tente de novo em alguns minutos.");
      return;
    }
    setEnviado(resposta.mensagem);
  }

  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <IconesEscola />
        <div className="auth-illustration-inner">
          <Logo tamanho={56} className="logo-sobre-indigo auth-logo" />
          <h1>Esqueceu a senha?</h1>
          <p>
            Mandamos um link para o e-mail da sua conta. Com ele você cria uma senha nova, e todos os aparelhos conectados saem da
            conta - quem estiver usando a senha antiga também.
          </p>
        </div>
      </div>
      <div className="auth-card">
        <AlternarTema className="icon-btn auth-tema" />
        <form className="auth-form" onSubmit={aoEnviar}>
          <div className="auth-marca">
            <Logo tamanho={30} />
            Biofrequência
          </div>
          <h2>Criar uma senha nova</h2>

          {enviado ? (
            <div className="auth-concluido pendente">
              <Icon name="mail" className="icon auth-concluido-icone" />
              <p>{enviado}</p>
              <Link href="/login" className="btn btn-primary">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <p className="auth-sub">Informe o e-mail que você usa para entrar.</p>
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {erro && <p className="field-error show">{erro}</p>}
              <button type="submit" className="btn btn-primary" disabled={enviando} aria-busy={enviando}>
                {enviando ? "Enviando…" : "Enviar o link"}
              </button>
            </>
          )}

          <p className="auth-switch">
            Lembrou a senha? <Link href="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
