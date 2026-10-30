"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const { autenticado, carregando, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [urlEditavel, setUrlEditavel] = useState(false);
  const [semApi, setSemApi] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [demorando, setDemorando] = useState(false);
  const [avisoSessaoExpirada, setAvisoSessaoExpirada] = useState(false);

  useEffect(() => {
    const url = Api.obterBaseUrl();
    setBaseUrl(url ?? "");
    setSemApi(url === null);
    setUrlEditavel(Api.urlEditavel());
    // Acorda a API (plano gratuito do Render) enquanto a pessoa digita.
    Api.aquecerServidor();
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("motivo") === "expirada") setAvisoSessaoExpirada(true);
  }, []);

  useEffect(() => {
    if (!carregando && autenticado) router.replace("/dashboard");
  }, [carregando, autenticado, router]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!email.trim() || !senha) {
      setErro("Informe email e senha.");
      return;
    }

    if (urlEditavel && baseUrl.trim()) Api.definirBaseUrl(baseUrl);

    setEnviando(true);
    // Primeiro acesso do dia: o servidor pode estar "acordando".
    const aviso = setTimeout(() => setDemorando(true), 5000);
    const resposta = await Api.login(email.trim(), senha);
    clearTimeout(aviso);
    setDemorando(false);
    setEnviando(false);

    if (!resposta.sucesso || !resposta.dados) {
      setErro(resposta.mensagem || "Não foi possível fazer login.");
      return;
    }

    login(resposta.dados);
    router.replace("/dashboard");
  }

  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <div className="auth-illustration-inner">
          <h1>Biofrequência</h1>
          <p>
            Acompanhe frequência, atrasos, alertas e o histórico de contato com responsáveis da sua
            coordenação em um só lugar — o mesmo sistema do software desktop, agora também pelo navegador.
          </p>
        </div>
      </div>
      <div className="auth-card">
        <form className="auth-form" onSubmit={aoEnviar}>
          <h2>Entrar</h2>
          <p className="auth-sub">Acesse com a conta da sua coordenação.</p>

          {avisoSessaoExpirada && (
            <div className="modal-summary" style={{ marginBottom: 16 }}>
              Sua sessão expirou. Faça login novamente.
            </div>
          )}

          {semApi && (
            <div className="error-block" style={{ marginBottom: 16 }}>
              Este site foi publicado sem o endereço da API (variável NEXT_PUBLIC_API_URL). O login não vai
              funcionar até isso ser configurado no deploy.
            </div>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && <p className="field-error show">{erro}</p>}
          {demorando && (
            <p className="panel-meta" style={{ marginTop: 6 }}>
              Conectando ao servidor… no primeiro acesso do dia isso pode levar até um minuto.
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={enviando || semApi}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>

          <p className="auth-switch">
            Ainda não tem conta? <Link href="/cadastro">Cadastre sua coordenação</Link>
          </p>
          <p className="auth-switch" style={{ marginTop: 4 }}>
            <Link href="/downloads">Baixar o app do aluno</Link>
          </p>

          {/* Endereço da API editável só em desenvolvimento local; no site
              publicado ele vem do deploy e não pode ficar "preso" num valor
              antigo salvo no navegador. */}
          {urlEditavel && (
            <>
              <button
                type="button"
                className="btn-text"
                style={{ marginTop: 14, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                onClick={() => setMostrarConfig((v) => !v)}
              >
                <Icon name="chevronDown" />
                {mostrarConfig ? "Ocultar" : "Endereço da API (desenvolvimento)"}
              </button>
              {mostrarConfig && (
                <div className="modal-field" style={{ marginTop: 10 }}>
                  <label htmlFor="apiUrl">URL base da BioFrequenciaApi</label>
                  <input
                    id="apiUrl"
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost/BioFrequenciaApi/"
                  />
                </div>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
