"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { usePreferencias } from "@/components/Preferencias";
import { Interruptor } from "@/components/Interruptor";
import { formatarDataHora, iniciais } from "@/lib/format";
import { tocarSom, type TipoSom } from "@/lib/sons";
import type { EscolhaTema, Preferencias } from "@/lib/preferencias";
import type { PerfilConta, SessaoConectada } from "@/lib/types";

type Aba = "perfil" | "senha" | "preferencias" | "dispositivos";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "perfil", rotulo: "Perfil", icone: "user" },
  { id: "senha", rotulo: "Senha", icone: "lock" },
  { id: "preferencias", rotulo: "Preferências", icone: "sliders" },
  { id: "dispositivos", rotulo: "Dispositivos conectados", icone: "desktop" },
];

/**
 * Minha conta: dados da coordenação, troca de senha, preferências (tema e
 * sons, salvas na conta) e os aparelhos conectados - cada login, no site
 * ou no app do tablet, é uma sessão que pode ser desconectada daqui.
 */
export default function ContaPage() {
  const [aba, setAba] = useState<Aba>("perfil");

  // ?aba=preferencias abre direto na aba pedida (links de outras telas).
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("aba");
    if (ABAS.some((item) => item.id === pedida)) setAba(pedida as Aba);
  }, []);

  function trocarAba(nova: Aba) {
    setAba(nova);
    window.history.replaceState(null, "", nova === "perfil" ? "/conta" : `/conta?aba=${nova}`);
  }

  return (
    <>
      <Topbar titulo="Minha conta" subtitulo="Dados da coordenação, senha, preferências e aparelhos conectados." />

      <div className="abas-conta" role="tablist" aria-label="Seções da conta">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`aba-${item.id}`}
            aria-selected={aba === item.id}
            aria-controls={`painel-${item.id}`}
            className={`filter-pill${aba === item.id ? " active" : ""}`}
            onClick={() => trocarAba(item.id)}
          >
            <Icon name={item.icone} />
            {item.rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {aba === "perfil" && <AbaPerfil />}
        {aba === "senha" && <AbaSenha />}
        {aba === "preferencias" && <AbaPreferencias />}
        {aba === "dispositivos" && <AbaDispositivos />}
      </div>
    </>
  );
}

function AbaPerfil() {
  const { atualizarCoordenacao, coordenacao } = useAuth();
  const { mostrarToast } = useToast();
  const [original, setOriginal] = useState<PerfilConta | null>(null);
  const [form, setForm] = useState<PerfilConta>({ nome_coordenacao: "", email_coordenacao: "", nome_escola: "" });
  const [senhaAtual, setSenhaAtual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Api.perfil().then((resposta) => {
      if (resposta.sucesso && resposta.dados) {
        setOriginal(resposta.dados);
        setForm(resposta.dados);
      } else {
        setErroCarregar(resposta.mensagem);
      }
    });
  }, []);

  if (erroCarregar) return <div className="error-block">{erroCarregar}</div>;
  if (!original) return <div className="loading-block">Carregando os dados da conta…</div>;

  const trocaEmail = form.email_coordenacao.trim().toLowerCase() !== original.email_coordenacao.toLowerCase();
  const mudou =
    trocaEmail || form.nome_coordenacao.trim() !== original.nome_coordenacao || form.nome_escola.trim() !== original.nome_escola;

  function campo(nome: keyof PerfilConta, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (trocaEmail && !senhaAtual) {
      setErro("Para trocar o e-mail, confirme a senha atual.");
      void tocarSom("erro");
      return;
    }
    setSalvando(true);
    const resposta = await Api.atualizarPerfil(
      {
        nome_coordenacao: form.nome_coordenacao.trim(),
        email_coordenacao: form.email_coordenacao.trim(),
        nome_escola: form.nome_escola.trim(),
      },
      trocaEmail ? senhaAtual : undefined
    );
    setSalvando(false);
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    setOriginal(resposta.dados);
    setForm(resposta.dados);
    setSenhaAtual("");
    atualizarCoordenacao(resposta.dados);
    mostrarToast(resposta.mensagem || "Dados da conta salvos.");
  }

  return (
    <div className="panel painel-conta">
      <div className="conta-resumo">
        <div className="avatar avatar-grande">{iniciais(original.nome_coordenacao)}</div>
        <div>
          <strong>{original.nome_coordenacao}</strong>
          <span>
            {original.email_coordenacao} · {original.nome_escola}
          </span>
        </div>
      </div>

      <form className="form-conta" onSubmit={salvar}>
        <div className="modal-field">
          <label htmlFor="perfilNome">Nome da coordenação</label>
          <input
            id="perfilNome"
            value={form.nome_coordenacao}
            maxLength={150}
            onChange={(e) => campo("nome_coordenacao", e.target.value)}
            required
          />
        </div>
        <div className="modal-field">
          <label htmlFor="perfilEmail">E-mail (é o seu login)</label>
          <input
            id="perfilEmail"
            type="email"
            autoComplete="email"
            value={form.email_coordenacao}
            maxLength={150}
            onChange={(e) => campo("email_coordenacao", e.target.value)}
            required
          />
        </div>
        {trocaEmail && (
          <div className="modal-field">
            <label htmlFor="perfilSenha">Senha atual</label>
            <input
              id="perfilSenha"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />
            <p className="dica-campo">Para trocar o e-mail de login, confirme a senha.</p>
          </div>
        )}
        <div className="modal-field">
          <label htmlFor="perfilEscola">Escola</label>
          <input
            id="perfilEscola"
            value={form.nome_escola}
            maxLength={150}
            onChange={(e) => campo("nome_escola", e.target.value)}
            // O nome de uma escola do catálogo é o oficial da SEDUC; fora
            // do catálogo, só a gestão muda (vale para a escola inteira).
            disabled={original.escola_do_catalogo || coordenacao?.papel !== "gestor"}
            required
          />
          <p className="dica-campo">
            {original.escola_do_catalogo
              ? "Nome oficial do catálogo da Secretaria da Educação - não muda por aqui."
              : coordenacao?.papel === "gestor"
                ? "Aparece no app de biometria e vale para todas as contas desta escola."
                : "Só a gestão da escola muda o nome."}{" "}
            Você é {original.papel === "gestor" ? "da gestão" : "da coordenação"} desta escola.
          </p>
        </div>

        {erro && <p className="field-error show">{erro}</p>}
        <div className="acoes-form">
          <button type="submit" className="btn btn-primary" disabled={!mudou || salvando}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
          {mudou && (
            <button
              type="button"
              className="btn btn-text"
              onClick={() => {
                setForm(original);
                setSenhaAtual("");
                setErro(null);
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function AbaSenha() {
  const { mostrarToast } = useToast();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function recusar(mensagem: string) {
    setErro(mensagem);
    void tocarSom("erro");
  }

  async function trocar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (nova.length < 6) return recusar("A nova senha precisa ter pelo menos 6 caracteres.");
    if (nova !== confirmacao) return recusar("A confirmação não é igual à nova senha.");
    if (nova === atual) return recusar("A nova senha precisa ser diferente da atual.");

    setSalvando(true);
    const resposta = await Api.alterarSenha(atual, nova);
    setSalvando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    setAtual("");
    setNova("");
    setConfirmacao("");
    mostrarToast(resposta.mensagem || "Senha alterada.");
  }

  return (
    <div className="panel painel-conta">
      <form className="form-conta" onSubmit={trocar}>
        <div className="modal-field">
          <label htmlFor="senhaAtual">Senha atual</label>
          <input
            id="senhaAtual"
            type="password"
            autoComplete="current-password"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            required
          />
        </div>
        <div className="modal-field">
          <label htmlFor="senhaNova">Nova senha</label>
          <input
            id="senhaNova"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            required
          />
        </div>
        <div className="modal-field">
          <label htmlFor="senhaConfirmacao">Repita a nova senha</label>
          <input
            id="senhaConfirmacao"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            required
          />
          <p className="dica-campo">
            Ao trocar a senha, os outros aparelhos conectados à conta são desconectados. Este continua conectado.
          </p>
        </div>

        {erro && <p className="field-error show">{erro}</p>}
        <div className="acoes-form">
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? "Trocando…" : "Trocar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}

const OPCOES_TEMA: { valor: EscolhaTema; rotulo: string; descricao: string }[] = [
  { valor: "claro", rotulo: "Claro", descricao: "Fundo claro o tempo todo." },
  { valor: "escuro", rotulo: "Escuro", descricao: "Fundo escuro, mais confortável à noite." },
  { valor: "sistema", rotulo: "Seguir o sistema", descricao: "Acompanha o modo do computador ou do celular." },
];

type CampoSom = "somConfirmacao" | "somNotificacao" | "somErro";

const SONS: { tipo: TipoSom; campo: CampoSom; rotulo: string; descricao: string }[] = [
  { tipo: "confirmacao", campo: "somConfirmacao", rotulo: "Confirmações", descricao: "Presença registrada, aluno cadastrado, dados salvos." },
  { tipo: "notificacao", campo: "somNotificacao", rotulo: "Notificações", descricao: "Chegou um alerta, notificação, check-in ou ocorrência nova." },
  { tipo: "erro", campo: "somErro", rotulo: "Erros", descricao: "Algo não deu certo, como registrar duas entradas atrasadas no mesmo dia." },
];

function AbaPreferencias() {
  const { preferencias, daConta, salvar } = usePreferencias();
  const { mostrarToast } = useToast();
  // Enquanto o volume é arrastado, só a tela muda; salva ao soltar.
  const [volumeArrastando, setVolumeArrastando] = useState<number | null>(null);
  const volume = volumeArrastando ?? preferencias.volumeSons;

  async function mudar(mudancas: Partial<Preferencias>) {
    const erro = await salvar(mudancas);
    if (erro) mostrarToast(erro, true);
  }

  function ligarSom(campo: CampoSom, ligado: boolean) {
    const mudancas: Partial<Preferencias> = {};
    mudancas[campo] = ligado;
    void mudar(mudancas);
  }

  function soltarVolume() {
    if (volumeArrastando === null) return;
    const valor = volumeArrastando;
    setVolumeArrastando(null);
    void mudar({ volumeSons: valor });
    void tocarSom("confirmacao", { testar: true, volume: valor / 100 });
  }

  return (
    <div className="panel painel-conta">
      <fieldset className="opcoes-tema">
        <legend>Tema</legend>
        {OPCOES_TEMA.map((opcao) => (
          <label key={opcao.valor} className={`opcao-tema${preferencias.tema === opcao.valor ? " ativa" : ""}`}>
            <input
              type="radio"
              name="tema"
              value={opcao.valor}
              checked={preferencias.tema === opcao.valor}
              onChange={() => mudar({ tema: opcao.valor })}
            />
            <span className={`amostra-tema amostra-${opcao.valor}`} aria-hidden="true" />
            <span className="opcao-tema-texto">
              <strong>{opcao.rotulo}</strong>
              <small>{opcao.descricao}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <section className="secao-sons" aria-labelledby="tituloSons">
        <h3 id="tituloSons">Sons</h3>
        <div className="linha-preferencia">
          <div>
            <strong>Sons do site</strong>
            <small>Um som curto nas confirmações, nas notificações novas e nos erros.</small>
          </div>
          <Interruptor ligado={preferencias.sonsAtivos} rotulo="Sons do site" onMudar={(ligado) => mudar({ sonsAtivos: ligado })} />
        </div>
        <div className="linha-preferencia">
          <label htmlFor="volumeSons">
            <strong>Volume</strong>
          </label>
          <div className="controle-volume">
            <Icon name="volume" />
            <input
              id="volumeSons"
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              disabled={!preferencias.sonsAtivos}
              onChange={(e) => setVolumeArrastando(Number(e.target.value))}
              onPointerUp={soltarVolume}
              onKeyUp={soltarVolume}
              onBlur={soltarVolume}
            />
            <span className="valor-volume">{volume}%</span>
          </div>
        </div>
        {SONS.map((som) => (
          <div key={som.tipo} className="linha-preferencia">
            <div>
              <strong>{som.rotulo}</strong>
              <small>{som.descricao}</small>
            </div>
            <div className="acoes-som">
              <button
                type="button"
                className="btn btn-sm"
                disabled={!preferencias.sonsAtivos}
                onClick={() => tocarSom(som.tipo, { testar: true, volume: volume / 100 })}
              >
                Ouvir
              </button>
              <Interruptor
                ligado={preferencias[som.campo]}
                rotulo={som.rotulo}
                desabilitado={!preferencias.sonsAtivos}
                onMudar={(ligado) => ligarSom(som.campo, ligado)}
              />
            </div>
          </div>
        ))}
      </section>

      <p className="panel-meta">
        {daConta
          ? "Salvas na sua conta: valem em qualquer computador em que você entrar."
          : "Buscando as preferências da conta…"}
      </p>
    </div>
  );
}


function AbaDispositivos() {
  const { logout } = useAuth();
  const { mostrarToast } = useToast();
  const [aparelhos, setAparelhos] = useState<SessaoConectada[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function carregar() {
    const resposta = await Api.listarAparelhos();
    if (resposta.sucesso && resposta.dados) {
      setAparelhos(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function desconectar(aparelho: SessaoConectada) {
    setOcupado(aparelho.id_sessao);
    const resposta = await Api.desconectarAparelho(aparelho.id_sessao);
    setOcupado(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(`${aparelho.dispositivo} desconectado.`);
    carregar();
  }

  async function desconectarOutros() {
    if (!confirm("Desconectar todos os outros aparelhos? Quem estiver usando a conta neles volta para a tela de login.")) return;
    setOcupado("outros");
    const resposta = await Api.desconectarOutrosAparelhos();
    setOcupado(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(resposta.mensagem || "Aparelhos desconectados.");
    carregar();
  }

  if (erro) return <div className="error-block">{erro}</div>;
  if (!aparelhos) return <div className="loading-block">Carregando os aparelhos conectados…</div>;

  const outros = aparelhos.filter((aparelho) => !aparelho.atual);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Dispositivos conectados ({aparelhos.length})</h2>
        {outros.length > 0 && (
          <button type="button" className="btn btn-sm" onClick={desconectarOutros} disabled={ocupado !== null}>
            {ocupado === "outros" ? "Desconectando…" : "Desconectar os outros"}
          </button>
        )}
      </div>
      <p className="panel-meta">
        Cada login - aqui no site ou no app do tablet - aparece nesta lista. Desconecte os aparelhos que você não usa mais
        ou não reconhece; se desconfiar de alguém, troque também a senha.
      </p>

      <ul className="lista-aparelhos">
        {aparelhos.map((aparelho) => (
          <li key={aparelho.id_sessao} className={`aparelho${aparelho.atual ? " atual" : ""}`}>
            <div className="aparelho-icone">
              <Icon name={aparelho.cliente === "app" ? "smartphone" : "desktop"} />
            </div>
            <div className="aparelho-info">
              <div className="aparelho-nome">
                {aparelho.dispositivo}
                {aparelho.atual && <span className="badge badge--enviada">Este aparelho</span>}
                {aparelho.lembrar && <span className="badge badge--neutral">Lembrar de mim</span>}
              </div>
              <div className="aparelho-meta">
                Último acesso {formatarDataHora(aparelho.ultimo_acesso)} · conectado em {formatarDataHora(aparelho.criada_em)} ·
                vale até {formatarDataHora(aparelho.expira_em)}
              </div>
            </div>
            {aparelho.atual ? (
              <button type="button" className="btn btn-sm" onClick={logout}>
                Sair
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => desconectar(aparelho)}
                disabled={ocupado !== null}
              >
                {ocupado === aparelho.id_sessao ? "Desconectando…" : "Desconectar"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
