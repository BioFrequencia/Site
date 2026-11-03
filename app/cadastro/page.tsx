"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AlternarTema } from "@/components/AlternarTema";
import { Icon } from "@/components/Icon";
import { CampoSenha } from "@/components/CampoSenha";
import { ReenviarLink } from "@/components/ReenviarLink";
import type { ContaCriada, EscolaCatalogo } from "@/lib/types";

/** "SAO BERNARDO DO CAMPO" -> "Sao Bernardo do Campo" (o catálogo vem em maiúsculas). */
function emTitulo(texto: string | null): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .split(" ")
    .map((palavra, i) => (i > 0 && ["de", "da", "do", "das", "dos", "e"].includes(palavra) ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1)))
    .join(" ");
}

export default function CadastroPage() {
  const { autenticado, carregando } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  // Escola: escolhida no catálogo da SEDUC ou, se não estiver nele, nova.
  const [buscaEscola, setBuscaEscola] = useState("");
  const [resultados, setResultados] = useState<EscolaCatalogo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [escola, setEscola] = useState<EscolaCatalogo | null>(null);
  const [foraDoCatalogo, setForaDoCatalogo] = useState(false);
  const [nomeEscola, setNomeEscola] = useState("");
  const [municipio, setMunicipio] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<{ mensagem: string; conta: ContaCriada } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && autenticado) router.replace("/dashboard");
  }, [carregando, autenticado, router]);

  useEffect(() => {
    const termo = buscaEscola.trim();
    if (escola || foraDoCatalogo || termo.length < 3) {
      setResultados([]);
      return;
    }
    let ativo = true;
    const espera = setTimeout(async () => {
      setBuscando(true);
      const resposta = await Api.buscarEscolas(termo);
      if (!ativo) return;
      setBuscando(false);
      setResultados(resposta.sucesso && resposta.dados ? resposta.dados.escolas : []);
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [buscaEscola, escola, foraDoCatalogo]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!escola && !foraDoCatalogo) {
      setErro("Escolha a escola na busca (ou marque que ela não está na lista).");
      return;
    }
    if (foraDoCatalogo && (!nomeEscola.trim() || !municipio.trim())) {
      setErro("Informe o nome da escola e o município.");
      return;
    }
    if (!nome.trim() || !email.trim() || !senha) {
      setErro("Preencha seu nome, o email e a senha.");
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
    const resposta = await Api.cadastrarCoordenacao(
      nome.trim(),
      email.trim(),
      senha,
      escola ? { id_escola: escola.id_escola } : { nome_escola: nomeEscola.trim(), municipio: municipio.trim() }
    );
    setEnviando(false);

    if (!resposta.sucesso || !resposta.dados) {
      setErro(resposta.mensagem || "Não foi possível concluir o cadastro.");
      return;
    }
    setConcluido({ mensagem: resposta.mensagem, conta: resposta.dados });
  }

  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <div className="auth-illustration-inner">
          <Logo tamanho={56} className="logo-sobre-indigo auth-logo" />
          <h1>Crie a conta da sua coordenação</h1>
          <p>
            Escolha a sua escola entre as 5.795 escolas estaduais de São Paulo e confirme o seu e-mail. Depois, a gestão da escola
            libera o seu acesso - ou a equipe do BioFrequência, se a escola ainda não usa o sistema. Os alunos e os responsáveis
            de uma escola nunca aparecem para outra.
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
          <h2>Cadastrar coordenação</h2>
          <p className="auth-sub">Leva menos de um minuto.</p>

          {concluido ? (
            <div className="auth-concluido pendente">
              <Icon name="mail" className="icon auth-concluido-icone" />
              <p>{concluido.mensagem}</p>
              {/* O caminho até entrar, com o passo em que a pessoa está. */}
              <ol className="passos-acesso">
                <li className="feito">Conta criada</li>
                <li className="atual">
                  Abrir o link enviado para <b>{email.trim().toLowerCase()}</b>
                  <small>Confira também a caixa de spam. O link vale por 24 horas.</small>
                </li>
                <li>
                  Aprovação {concluido.conta.aprovacao === "gestao" ? `da gestão da ${concluido.conta.nome_escola}` : "da equipe do BioFrequência"}
                  <small>Você recebe um e-mail quando o acesso for liberado.</small>
                </li>
              </ol>
              <ReenviarLink email={email.trim()} senha={senha} acabouDeEnviar={concluido.conta.email_enviado} />
              <Link href="/login" className="btn btn-primary">
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <label htmlFor="buscaEscola">Escola</label>
              {escola ? (
                <div className="escola-escolhida">
                  <div>
                    <b>{escola.nome_escola}</b>
                    <span>
                      {emTitulo(escola.municipio)}
                      {escola.bairro && ` · ${emTitulo(escola.bairro)}`} · CIE {escola.codigo_cie}
                    </span>
                    <span className="aviso-escola">
                      {escola.tem_gestao
                        ? "Esta escola já usa o BioFrequência: a gestão dela aprova a sua conta."
                        : "Esta escola ainda não usa o BioFrequência: a equipe do sistema aprova a sua conta, e você vira a gestão dela."}
                    </span>
                  </div>
                  <button type="button" className="btn-text" onClick={() => setEscola(null)}>
                    Trocar
                  </button>
                </div>
              ) : foraDoCatalogo ? (
                <div className="escola-nova">
                  <input
                    id="nomeEscola"
                    type="text"
                    maxLength={150}
                    placeholder="Nome da escola"
                    value={nomeEscola}
                    onChange={(e) => setNomeEscola(e.target.value)}
                  />
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Município"
                    aria-label="Município"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                  />
                  <button type="button" className="btn-text" onClick={() => setForaDoCatalogo(false)}>
                    Voltar para a busca
                  </button>
                </div>
              ) : (
                <div className="busca-escola">
                  <input
                    id="buscaEscola"
                    type="search"
                    autoComplete="off"
                    placeholder="Nome, município ou código CIE"
                    value={buscaEscola}
                    onChange={(e) => setBuscaEscola(e.target.value)}
                  />
                  {buscando && <p className="auth-sub">Procurando…</p>}
                  {resultados.length > 0 && (
                    <div className="lista-escolha" role="listbox" aria-label="Escolas encontradas">
                      {resultados.map((e) => (
                        <button type="button" role="option" aria-selected={false} key={e.id_escola} onClick={() => setEscola(e)}>
                          <span>{e.nome_escola}</span>
                          <span className="panel-meta">
                            {emTitulo(e.municipio)}
                            {e.bairro && ` · ${emTitulo(e.bairro)}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!buscando && buscaEscola.trim().length >= 3 && resultados.length === 0 && (
                    <p className="auth-sub">Nenhuma escola encontrada. Tente outra parte do nome ou o município.</p>
                  )}
                  <button type="button" className="btn-text" onClick={() => setForaDoCatalogo(true)}>
                    Minha escola não está na lista
                  </button>
                </div>
              )}

              <label htmlFor="nome">Seu nome</label>
              <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />

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
              <CampoSenha
                id="senha"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />

              <label htmlFor="confirmarSenha">Confirmar senha</label>
              <CampoSenha
                id="confirmarSenha"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
              />

              {erro && <p className="field-error show">{erro}</p>}

              <button type="submit" className="btn btn-primary" disabled={enviando} aria-busy={enviando}>
                {enviando ? "Cadastrando…" : "Cadastrar"}
              </button>
            </>
          )}

          <p className="auth-switch">
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
