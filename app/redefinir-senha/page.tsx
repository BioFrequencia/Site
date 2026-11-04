"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { AlternarTema } from "@/components/AlternarTema";
import { CampoSenha } from "@/components/CampoSenha";
import { RequisitosSenha } from "@/components/RequisitosSenha";
import { Icon } from "@/components/Icon";
import { mensagemSenhaFraca, SENHA_MAXIMA } from "@/lib/senha";
import { tocarSom } from "@/lib/sons";

type Estado =
  | { tipo: "formulario" }
  | { tipo: "sem-codigo" }
  | { tipo: "pronto"; sessoesEncerradas: number }
  | { tipo: "invalido"; mensagem: string };

function textoDosAparelhos(quantos: number): string {
  if (quantos <= 0) return "";
  return quantos === 1 ? " 1 aparelho conectado saiu da conta." : ` ${quantos} aparelhos conectados saíram da conta.`;
}

/**
 * Página do link de "Esqueci minha senha" (/redefinir-senha?codigo=...).
 * Guarda o código, tira ele da barra de endereço (e do histórico) e pede a
 * senha nova, com os requisitos marcando enquanto a pessoa digita.
 */
export default function RedefinirSenhaPage() {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "formulario" });
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lido = useRef(false);

  useEffect(() => {
    // Em desenvolvimento o React roda o efeito duas vezes, e na segunda o
    // código já saiu da barra de endereço: lê uma vez só.
    if (lido.current) return;
    lido.current = true;
    const doLink = new URLSearchParams(window.location.search).get("codigo") ?? "";
    window.history.replaceState(null, "", "/redefinir-senha");
    // Ler o código do endereço só pode acontecer no navegador, depois de montar.
    if (doLink) setCodigo(doLink);
    else setEstado({ tipo: "sem-codigo" });
  }, []);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const senhaFraca = mensagemSenhaFraca(senha);
    if (senhaFraca) {
      setErro(senhaFraca);
      return;
    }
    if (senha !== confirmacao) {
      setErro("A confirmação não é igual à senha nova.");
      return;
    }
    if (!codigo) return;
    setEnviando(true);
    const resposta = await Api.redefinirSenha(codigo, senha);
    setEnviando(false);
    if (resposta.sucesso) {
      setEstado({ tipo: "pronto", sessoesEncerradas: resposta.dados?.sessoes_encerradas ?? 0 });
      void tocarSom("confirmacao");
    } else if (resposta.status === 422) {
      // Senha recusada pela API: o link continua valendo, a pessoa corrige.
      setErro(resposta.mensagem);
      void tocarSom("erro");
    } else {
      setEstado({ tipo: "invalido", mensagem: resposta.mensagem });
      void tocarSom("erro");
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <div className="auth-illustration-inner">
          <Logo tamanho={56} className="logo-sobre-indigo auth-logo" />
          <h1>Senha nova</h1>
          <p>
            Use uma senha que você não usa em outro lugar. Depois de criada, todos os aparelhos conectados saem da conta e você
            entra de novo com ela.
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

          {estado.tipo === "formulario" && (
            <>
              <h2>Criar a senha nova</h2>
              <p className="auth-sub">O link vale por 1 hora e só uma vez.</p>
              <label htmlFor="senhaNova">Senha nova</label>
              <CampoSenha
                id="senhaNova"
                autoComplete="new-password"
                maxLength={SENHA_MAXIMA}
                aria-describedby="requisitosSenhaNova"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <RequisitosSenha senha={senha} id="requisitosSenhaNova" />
              <label htmlFor="confirmacao">Confirme a senha nova</label>
              <CampoSenha
                id="confirmacao"
                autoComplete="new-password"
                maxLength={SENHA_MAXIMA}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
              />
              {erro && <p className="field-error show">{erro}</p>}
              <button type="submit" className="btn btn-primary" disabled={enviando || !codigo} aria-busy={enviando}>
                {enviando ? "Salvando…" : "Criar a senha nova"}
              </button>
            </>
          )}

          {estado.tipo === "sem-codigo" && (
            <div className="auth-concluido pendente">
              <Icon name="mail" className="icon auth-concluido-icone" />
              <h2>Abra o link do e-mail</h2>
              <p>Esta página precisa do link completo que enviamos. Se ele não chegou, peça outro.</p>
              <Link href="/esqueci-senha" className="btn btn-primary">
                Pedir o link
              </Link>
            </div>
          )}

          {estado.tipo === "pronto" && (
            <div className="auth-concluido">
              <svg className="check-animado" viewBox="0 0 52 52" aria-hidden="true">
                <circle cx="26" cy="26" r="23" />
                <path d="M15 27l7 7 15-16" />
              </svg>
              <h2>Senha nova criada</h2>
              <p>
                Entre com o seu e-mail e a senha nova.
                {textoDosAparelhos(estado.sessoesEncerradas)}
              </p>
              <Link href="/login" className="btn btn-primary">
                Entrar
              </Link>
            </div>
          )}

          {estado.tipo === "invalido" && (
            <div className="auth-concluido erro">
              <Icon name="alert" className="icon auth-concluido-icone" />
              <h2>Não deu para usar este link</h2>
              <p>{estado.mensagem}</p>
              <Link href="/esqueci-senha" className="btn btn-primary">
                Pedir outro link
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
