"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { tocarSom } from "@/lib/sons";
import { formatarTelefone } from "@/lib/format";
import { alternarDestino, destinosSugeridos, novaChaveDeEnvio, rotuloComoSai, seloDoEnvio, temDestino, tituloDoEnvio } from "@/lib/mensagens";
import type { AlunoFiltro, ContatosDoAluno, DestinoMensagem, EnvioDeMensagem, EnvioPrevisto, ModelosMensagem } from "@/lib/types";

type Etapa = "editar" | "previa" | "enviando" | "enviado";

/**
 * Enviar mensagem aos responsáveis (item 7 do pedido): escolher o aluno,
 * os responsáveis e os canais (WhatsApp, e-mail), escrever ou usar um
 * modelo, ver a prévia - montada pela API, igual ao que sai - e enviar.
 * O resultado mostra o que saiu, o que ficou para mandar pelo link e o
 * que deu erro; tudo fica no histórico (Notificações). Cada mensagem tem
 * uma chave: o mesmo envio repetido (clique duplo, conexão que caiu) não
 * manda de novo.
 */
export default function EnviarMensagemPage() {
  const { mostrarToast } = useToast();
  const [modelos, setModelos] = useState<ModelosMensagem | null>(null);
  const [alunos, setAlunos] = useState<AlunoFiltro[]>([]);
  const [busca, setBusca] = useState("");
  const [idAluno, setIdAluno] = useState<number | null>(null);
  const [contatos, setContatos] = useState<ContatosDoAluno | null>(null);
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const [destinos, setDestinos] = useState<DestinoMensagem[]>([]);
  const [modelo, setModelo] = useState("livre");
  const [texto, setTexto] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("editar");
  const [previa, setPrevia] = useState<EnvioPrevisto[] | null>(null);
  const [chave, setChave] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EnvioDeMensagem | null>(null);
  const [mensagemFinal, setMensagemFinal] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void Api.modelosDeMensagem().then((r) => r.sucesso && r.dados && setModelos(r.dados));
    void Api.filtrarAlunos(null, null, null, 1, 500).then((r) => r.sucesso && r.dados && setAlunos(r.dados.alunos));
    // Vindo da ficha do aluno: /notificacoes/enviar?aluno=12.
    const daUrl = Number(new URLSearchParams(window.location.search).get("aluno"));
    if (Number.isInteger(daUrl) && daUrl > 0) setIdAluno(daUrl);
  }, []);

  useEffect(() => {
    setContatos(null);
    setDestinos([]);
    invalidarPrevia();
    if (idAluno === null) return;
    setCarregandoContatos(true);
    void Api.contatosDoAluno(idAluno).then((resposta) => {
      setCarregandoContatos(false);
      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem);
        return;
      }
      setErro(null);
      setContatos(resposta.dados);
      setDestinos(destinosSugeridos(resposta.dados.responsaveis));
    });
  }, [idAluno]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (termo ? alunos.filter((a) => a.nome_aluno.toLowerCase().includes(termo)) : alunos).slice(0, 8);
  }, [alunos, busca]);

  const maximo = modelos?.maximo ?? 1000;

  /** Mudou o aluno, o texto ou os destinos: a prévia (e a chave) de antes não vale mais. */
  function invalidarPrevia() {
    setPrevia(null);
    setChave(null);
    setEtapa((atual) => (atual === "enviado" ? atual : "editar"));
  }

  function escolherModelo(chaveDoModelo: string) {
    setModelo(chaveDoModelo);
    const escolhido = modelos?.modelos.find((m) => m.chave === chaveDoModelo);
    if (escolhido && escolhido.texto) setTexto(escolhido.texto);
    invalidarPrevia();
  }

  async function verPrevia() {
    if (idAluno === null) return;
    setErro(null);
    const resposta = await Api.previaDeMensagem(idAluno, texto, destinos);
    if (!resposta.sucesso || !resposta.dados) {
      setErro(resposta.mensagem);
      void tocarSom("erro");
      return;
    }
    setPrevia(resposta.dados.envios);
    setChave(novaChaveDeEnvio());
    setEtapa("previa");
  }

  async function enviar() {
    if (idAluno === null || chave === null) return;
    setErro(null);
    setEtapa("enviando");
    // A mesma chave numa nova tentativa: o que já saiu não sai de novo.
    const resposta = await Api.enviarMensagem(idAluno, texto, destinos, chave);
    if (!resposta.sucesso || !resposta.dados) {
      setEtapa("previa");
      setErro(resposta.mensagem);
      void tocarSom("erro");
      return;
    }
    setResultado(resposta.dados);
    setMensagemFinal(resposta.mensagem);
    setEtapa("enviado");
    mostrarToast(resposta.mensagem, resposta.dados.resumo.erros > 0);
  }

  function novaMensagem() {
    setResultado(null);
    setMensagemFinal("");
    setTexto("");
    setModelo("livre");
    setPrevia(null);
    setChave(null);
    setEtapa("editar");
    if (contatos) setDestinos(destinosSugeridos(contatos.responsaveis));
  }

  const aluno = contatos?.aluno ?? null;
  const podeVerPrevia = idAluno !== null && destinos.length > 0 && texto.trim().length > 0 && texto.length <= maximo;

  return (
    <>
      <Topbar
        titulo="Enviar mensagem"
        subtitulo="Para os responsáveis de um aluno, por WhatsApp ou e-mail."
        acoes={
          <Link href="/notificacoes" className="btn">
            <Icon name="chevronLeft" /> Notificações
          </Link>
        }
      />

      {etapa === "enviado" && resultado ? (
        <section className="panel mensagem-enviada" aria-live="polite">
          <div className="panel-head">
            <h2>{tituloDoEnvio(resultado.resumo)}</h2>
          </div>
          <p className="results-caption">{mensagemFinal}</p>
          <ul className="lista-resultados">
            {resultado.resultados.map((r) => {
              const selo = seloDoEnvio(r.status);
              return (
                <li key={`${r.id_responsavel}-${r.canal}`}>
                  <div>
                    <b>{r.nome}</b>
                    <div className="panel-meta">
                      {r.canal === "whatsapp" ? `WhatsApp ${formatarTelefone(r.contato.replace(/^55/, ""))}` : `E-mail ${r.contato}`}
                      {r.repetido && " · já tinha sido enviada"}
                    </div>
                  </div>
                  <div className="lista-resultados-acoes">
                    <span className={selo.classe}>{selo.texto}</span>
                    {r.link && (
                      <a className="btn btn-sm" href={r.link} target="_blank" rel="noreferrer">
                        Abrir no WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {resultado.resumo.erros > 0 && (
            <p className="results-caption">
              Em Notificações, a mensagem com erro tem &quot;Tentar de novo&quot;. Confira também o contato do responsável.
            </p>
          )}
          <div className="modal-actions">
            <Link href="/notificacoes" className="btn">
              Ver o histórico
            </Link>
            <button type="button" className="btn btn-primary" onClick={novaMensagem}>
              Nova mensagem
            </button>
          </div>
        </section>
      ) : (
        <div className="enviar-mensagem">
          <div className="enviar-mensagem-campos">
            <section className="panel">
              <div className="panel-head">
                <h2>1. Aluno</h2>
              </div>
              {idAluno !== null && (aluno || carregandoContatos) ? (
                <div className="escolhido">
                  <span>
                    {aluno ? (
                      <>
                        <b>{aluno.nome}</b> · {aluno.turma}
                      </>
                    ) : (
                      "Carregando…"
                    )}
                  </span>
                  <button type="button" className="btn-text" onClick={() => setIdAluno(null)} disabled={etapa === "enviando"}>
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="modal-field">
                  <label htmlFor="buscaAlunoMensagem">Aluno</label>
                  <input
                    id="buscaAlunoMensagem"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Digite o nome do aluno"
                    autoComplete="off"
                  />
                  <div className="lista-escolha" role="listbox" aria-label="Alunos">
                    {filtrados.map((a) => (
                      <button type="button" role="option" aria-selected={false} key={a.id_aluno} onClick={() => setIdAluno(a.id_aluno)}>
                        <span>{a.nome_aluno}</span>
                        <span className="panel-meta">{a.turma ?? ""}</span>
                      </button>
                    ))}
                    {filtrados.length === 0 && <p className="results-caption">Nenhum aluno com esse nome.</p>}
                  </div>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>2. Para quem</h2>
              </div>
              {!contatos ? (
                <p className="results-caption">{carregandoContatos ? "Carregando os responsáveis…" : "Escolha o aluno primeiro."}</p>
              ) : contatos.responsaveis.length === 0 ? (
                <p className="results-caption">
                  Este aluno ainda não tem responsável cadastrado. <Link href="/responsaveis">Cadastre em Responsáveis</Link>.
                </p>
              ) : (
                <ul className="lista-contatos">
                  {contatos.responsaveis.map((r) => (
                    <li key={r.id_responsavel}>
                      <div>
                        <b>{r.nome}</b>
                        {r.parentesco && <span className="panel-meta"> · {r.parentesco}</span>}
                      </div>
                      <label className={r.whatsapp ? undefined : "desabilitado"}>
                        <input
                          type="checkbox"
                          checked={temDestino(destinos, r.id_responsavel, "whatsapp")}
                          disabled={!r.whatsapp || etapa === "enviando"}
                          onChange={() => {
                            setDestinos((atual) => alternarDestino(atual, { id_responsavel: r.id_responsavel, canal: "whatsapp" }));
                            invalidarPrevia();
                          }}
                        />{" "}
                        WhatsApp {r.whatsapp ? formatarTelefone(r.telefone) : "(sem telefone com DDD)"}
                      </label>
                      <label className={r.email_disponivel ? undefined : "desabilitado"}>
                        <input
                          type="checkbox"
                          checked={temDestino(destinos, r.id_responsavel, "email")}
                          disabled={!r.email_disponivel || etapa === "enviando"}
                          onChange={() => {
                            setDestinos((atual) => alternarDestino(atual, { id_responsavel: r.id_responsavel, canal: "email" }));
                            invalidarPrevia();
                          }}
                        />{" "}
                        E-mail {r.email_disponivel ? r.email : "(sem e-mail cadastrado)"}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {contatos && (!contatos.provedores.whatsapp || !contatos.provedores.email) && (
                <p className="results-caption">
                  {!contatos.provedores.whatsapp && "O WhatsApp automático ainda não está configurado: a mensagem fica com o link para você mandar. "}
                  {!contatos.provedores.email && "O e-mail automático ainda não está configurado: a mensagem fica na fila."}
                </p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>3. Mensagem</h2>
              </div>
              <div className="modal-field">
                <label htmlFor="modeloMensagem">Modelo</label>
                <select id="modeloMensagem" className="filter-select" value={modelo} onChange={(e) => escolherModelo(e.target.value)}>
                  {(modelos?.modelos ?? [{ chave: "livre", titulo: "Mensagem livre", texto: "" }]).map((m) => (
                    <option key={m.chave} value={m.chave}>
                      {m.titulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-field">
                <label htmlFor="textoMensagem">Texto</label>
                <textarea
                  id="textoMensagem"
                  rows={6}
                  value={texto}
                  maxLength={maximo}
                  onChange={(e) => {
                    setTexto(e.target.value);
                    invalidarPrevia();
                  }}
                  aria-describedby="variaveisMensagem"
                  disabled={etapa === "enviando"}
                />
                <div className="contador-texto" aria-live="polite">
                  {texto.length}/{maximo}
                </div>
              </div>
              <p className="results-caption" id="variaveisMensagem">
                Pode usar: {(modelos?.variaveis ?? []).map((v) => `${v.variavel} (${v.descricao})`).join(", ")}.
              </p>
              {erro && etapa === "editar" && (
                <p className="field-error show" role="alert">
                  {erro}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-primary" onClick={verPrevia} disabled={!podeVerPrevia || etapa === "enviando"}>
                  Ver prévia
                </button>
              </div>
            </section>
          </div>

          <section className="panel enviar-mensagem-previa" aria-live="polite">
            <div className="panel-head">
              <h2>4. Prévia</h2>
              {previa && <span className="panel-meta">Nada foi enviado ainda.</span>}
            </div>
            {!previa ? (
              <p className="results-caption">Escolha o aluno, para quem e o texto, e clique em &quot;Ver prévia&quot;.</p>
            ) : (
              <>
                <ul className="lista-previa">
                  {previa.map((envio) => (
                    <li key={`${envio.id_responsavel}-${envio.canal}`}>
                      <div className="lista-previa-topo">
                        <b>{envio.nome}</b>
                        <span className="panel-meta">
                          {envio.canal === "whatsapp" ? "WhatsApp" : "E-mail"} · {rotuloComoSai(envio.canal, envio.como)}
                        </span>
                      </div>
                      {envio.assunto && <div className="panel-meta">Assunto: {envio.assunto}</div>}
                      <p className="lista-previa-texto">{envio.mensagem}</p>
                    </li>
                  ))}
                </ul>
                {erro && (
                  <p className="field-error show" role="alert">
                    {erro}
                  </p>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={invalidarPrevia} disabled={etapa === "enviando"}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={enviar} disabled={etapa === "enviando"} aria-busy={etapa === "enviando"}>
                    <Icon name="send" /> {etapa === "enviando" ? "Enviando…" : previa.length === 1 ? "Enviar" : `Enviar para ${previa.length} contatos`}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
