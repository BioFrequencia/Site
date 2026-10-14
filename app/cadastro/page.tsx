"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function CadastroPage() {
  const { autenticado, carregando } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && autenticado) router.replace("/dashboard");
  }, [carregando, autenticado, router]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!nome.trim() || !email.trim() || !senha) {
      setErro("Preencha nome, email e senha.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    const resposta = await Api.cadastrarCoordenacao(nome.trim(), email.trim(), senha);
    setEnviando(false);

    if (!resposta.sucesso) {
      setErro(resposta.mensagem || "Não foi possível concluir o cadastro.");
      return;
    }

    setSucesso(true);
    setTimeout(() => router.replace("/login"), 1600);
  }

  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <div className="auth-illustration-inner">
          <h1>Crie a conta da sua coordenação</h1>
          <p>
            Cadastre turmas, alunos e responsáveis, registre faltas e atrasos, acompanhe alertas de
            frequência e receba os check-ins biométricos do app do aluno.
          </p>
        </div>
      </div>
      <div className="auth-card">
        <form className="auth-form" onSubmit={aoEnviar}>
          <h2>Cadastrar coordenação</h2>
          <p className="auth-sub">Leva menos de um minuto.</p>

          <label htmlFor="nome">Nome da coordenação</label>
          <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <label htmlFor="confirmarSenha">Confirmar senha</label>
          <input
            id="confirmarSenha"
            type="password"
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
          />

          {erro && <p className="field-error show">{erro}</p>}
          {sucesso && (
            <p style={{ color: "var(--emerald-dark)", fontSize: 12, marginTop: 6 }}>
              Cadastro concluído! Redirecionando para o login…
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={enviando || sucesso}>
            {enviando ? "Cadastrando…" : "Cadastrar"}
          </button>

          <p className="auth-switch">
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
