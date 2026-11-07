"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { Interruptor } from "@/components/Interruptor";
import { useToast } from "@/components/Toast";
import { ModalAprovacao } from "@/components/ModalAprovacao";
import { formatarData, formatarDataHora, iniciais } from "@/lib/format";
import {
  PERIODOS_SALA,
  ROTULOS_CARGO,
  ROTULOS_PAPEL,
  type AcaoEquipe,
  type ConfiguracaoEscola,
  type DadosEscola,
  type MembroEquipe,
  type PapelConta,
  type TipoCalendario,
} from "@/lib/types";

type Aba = "escola" | "turmas" | "calendario" | "avisos" | "equipe";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "escola", rotulo: "Escola", icone: "building" },
  { id: "turmas", rotulo: "Turmas e horários", icone: "clock" },
  { id: "calendario", rotulo: "Calendário", icone: "calendar" },
  { id: "avisos", rotulo: "Regras e avisos", icone: "bell" },
  { id: "equipe", rotulo: "Equipe", icone: "users" },
];

const DIAS_DA_SEMANA = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/**
 * Escola: o que vale para toda a equipe. Os dados vêm do catálogo da
 * SEDUC; o horário de cada turma e a tolerância decidem o que é entrada
 * atrasada e saída antecipada; o calendário diz quando há aula; as regras
 * de aviso dizem quando a família é avisada; e a equipe é quem acessa.
 *
 * Toda a equipe vê; só a gestão altera (a API confere de novo).
 */
export default function EscolaPage() {
  const { coordenacao } = useAuth();
  const [aba, setAba] = useState<Aba>("escola");
  const [dados, setDados] = useState<DadosEscola | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ano, setAno] = useState<number | undefined>(undefined);

  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("aba");
    if (ABAS.some((item) => item.id === pedida)) setAba(pedida as Aba);
  }, []);

  const carregar = useCallback(async () => {
    const resposta = await Api.configuracaoEscola(ano);
    if (resposta.sucesso && resposta.dados) {
      setDados(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
  }, [ano]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function trocarAba(nova: Aba) {
    setAba(nova);
    window.history.replaceState(null, "", nova === "escola" ? "/escola" : `/escola?aba=${nova}`);
  }

  const podeEditar = dados?.pode_editar ?? coordenacao?.papel === "gestor";

  return (
    <>
      <Topbar
        titulo={dados?.escola.nome_escola ?? coordenacao?.nome_escola ?? "Escola"}
        subtitulo={
          podeEditar
            ? "Horários, calendário, regras de aviso e equipe da escola. Você faz parte da gestão."
            : "Horários, calendário e regras da escola. Só a gestão altera."
        }
      />

      <div className="abas-conta" role="tablist" aria-label="Seções da escola">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={aba === item.id}
            className={`filter-pill${aba === item.id ? " active" : ""}`}
            onClick={() => trocarAba(item.id)}
          >
            <Icon name={item.icone} />
            {item.rotulo}
          </button>
        ))}
      </div>

      {erro && <div className="error-block">{erro}</div>}
      {!dados && !erro && <Esqueleto variante="cartoes" texto="Carregando a escola…" />}

      {dados && (
        <div role="tabpanel" className="entrada-em-cascata" key={aba}>
          {aba === "escola" && <AbaDados dados={dados} />}
          {aba === "turmas" && <AbaTurmas dados={dados} podeEditar={podeEditar} aoMudar={carregar} />}
          {aba === "calendario" && <AbaCalendario dados={dados} podeEditar={podeEditar} aoMudar={carregar} trocarAno={setAno} />}
          {aba === "avisos" && <AbaAvisos dados={dados} podeEditar={podeEditar} aoMudar={carregar} />}
          {aba === "equipe" && <AbaEquipe />}
        </div>
      )}
    </>
  );
}

function AbaDados({ dados }: { dados: DadosEscola }) {
  const e = dados.escola;
  const linhas: [string, string | number | null][] = [
    ["Nome oficial", e.nome_oficial],
    ["Código CIE (SEDUC)", e.codigo_cie],
    ["Código INEP", e.codigo_inep],
    ["Rede", e.rede],
    ["Diretoria de ensino", e.diretoria_ensino],
    ["Município", e.municipio],
    ["Endereço", [e.endereco, e.numero].filter(Boolean).join(", ") + (e.bairro ? ` - ${e.bairro}` : "")],
    ["CEP", e.cep ? `${e.cep.slice(0, 5)}-${e.cep.slice(5)}` : null],
  ];
  return (
    <div className="grid-2">
      <div className="panel">
        <div className="panel-head">
          <h2>Dados da escola</h2>
          <span className="panel-meta">{e.codigo_cie ? "Catálogo da Secretaria da Educação de SP" : "Escola fora do catálogo"}</span>
        </div>
        <dl className="lista-dados">
          {linhas
            .filter(([, valor]) => valor !== null && valor !== "")
            .map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
        </dl>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>Hoje</h2>
          <span className="panel-meta">{formatarData(dados.hoje.data)}</span>
        </div>
        <div className={`dia-hoje${dados.hoje.letivo ? " letivo" : ""}`}>
          <Icon name={dados.hoje.letivo ? "check" : "calendar"} />
          <div>
            <b>{dados.hoje.letivo ? "Dia de aula" : "Sem aula"}</b>
            <span>
              {dados.hoje.letivo
                ? dados.hoje.motivo ?? "Entradas atrasadas e saídas antecipadas podem ser registradas."
                : `Motivo: ${dados.hoje.motivo}. Nada pode ser registrado hoje.`}
            </span>
          </div>
        </div>
        <p className="results-caption">
          Tolerância de entrada: {dados.configuracao.tolerancia_minutos} min · aviso à família a partir de{" "}
          {dados.configuracao.limite_alerta_percentual}% dos dias de aula nos últimos {dados.configuracao.janela_alerta_dias} dias.
        </p>
      </div>
    </div>
  );
}

function AbaTurmas({ dados, podeEditar, aoMudar }: { dados: DadosEscola; podeEditar: boolean; aoMudar: () => void }) {
  const { mostrarToast } = useToast();
  const [editando, setEditando] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState("Matutino");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [salvando, setSalvando] = useState(false);

  function comecar(idSala: number) {
    const turma = dados.turmas.find((t) => t.id_sala === idSala);
    if (!turma) return;
    setEditando(idSala);
    setPeriodo(turma.periodo_sala);
    setInicio(turma.horario.inicio);
    setFim(turma.horario.fim);
  }

  async function salvar(idSala: number) {
    if (fim <= inicio) {
      mostrarToast("O fim da aula precisa ser depois do início.", true);
      return;
    }
    const padrao = dados.horario_padrao[periodo];
    const igualAoPadrao = padrao && padrao.inicio === inicio && padrao.fim === fim;
    setSalvando(true);
    const resposta = await Api.salvarTurma(idSala, {
      periodo_sala: periodo,
      horario_inicio: igualAoPadrao ? null : inicio,
      horario_fim: igualAoPadrao ? null : fim,
    });
    setSalvando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Horário da turma salvo.");
    setEditando(null);
    aoMudar();
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Turmas e horários</h2>
        <span className="panel-meta">Tolerância de entrada: {dados.configuracao.tolerancia_minutos} min</span>
      </div>
      <p className="results-caption">
        Entrada depois do início da aula mais a tolerância é <b>entrada atrasada</b>; saída antes do fim é <b>saída antecipada</b>.
        Fora desse horário, nada é registrado - por exemplo, um aluno da manhã não recebe entrada atrasada à tarde.
      </p>
      {dados.turmas.length === 0 ? (
        <div className="empty-state">
          <Icon name="users" />
          <p>Nenhuma turma cadastrada. Cadastre em Turmas e alunos.</p>
        </div>
      ) : (
        <table className="data-table tabela-cartoes">
          <thead>
            <tr>
              <th>Turma</th>
              <th>Período</th>
              <th>Horário</th>
              <th>Alunos</th>
              {podeEditar && <th></th>}
            </tr>
          </thead>
          <tbody>
            {dados.turmas.map((turma) =>
              editando === turma.id_sala ? (
                <tr key={turma.id_sala} className="linha-editando">
                  <td className="celula-titulo">{turma.nome_sala}</td>
                  <td data-label="Período">
                    <select
                      className="filter-select"
                      value={periodo}
                      onChange={(e) => {
                        setPeriodo(e.target.value);
                        const padrao = dados.horario_padrao[e.target.value];
                        if (padrao) {
                          setInicio(padrao.inicio);
                          setFim(padrao.fim);
                        }
                      }}
                    >
                      {PERIODOS_SALA.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Horário">
                    <div className="horario-edicao">
                      <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-label="Início da aula" />
                      <span>às</span>
                      <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} aria-label="Fim da aula" />
                    </div>
                  </td>
                  <td data-label="Alunos" className="num">{turma.total_alunos}</td>
                  <td className="acoes-linha celula-acoes">
                    <button type="button" className="btn btn-sm" onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => salvar(turma.id_sala)} disabled={salvando}>
                      {salvando ? "Salvando…" : "Salvar"}
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={turma.id_sala}>
                  <td className="celula-titulo">{turma.nome_sala}</td>
                  <td data-label="Período">{turma.periodo_sala}</td>
                  <td data-label="Horário">
                    {turma.horario.inicio} às {turma.horario.fim}
                    {!turma.horario_inicio && <span className="panel-meta"> (padrão do período)</span>}
                  </td>
                  <td data-label="Alunos" className="num">{turma.total_alunos}</td>
                  {podeEditar && (
                    <td className="celula-acoes" style={{ textAlign: "right" }}>
                      <button type="button" className="btn btn-sm" onClick={() => comecar(turma.id_sala)}>
                        Mudar horário
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AbaCalendario({
  dados,
  podeEditar,
  aoMudar,
  trocarAno,
}: {
  dados: DadosEscola;
  podeEditar: boolean;
  aoMudar: () => void;
  trocarAno: (ano: number) => void;
}) {
  const { mostrarToast } = useToast();
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [tipo, setTipo] = useState<TipoCalendario>("sem_aula");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function adicionar(evento: FormEvent) {
    evento.preventDefault();
    if (!inicio || !descricao.trim()) {
      mostrarToast("Informe a data e a descrição.", true);
      return;
    }
    setSalvando(true);
    const resposta = await Api.adicionarCalendario(inicio, fim || inicio, tipo, descricao.trim());
    setSalvando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(resposta.mensagem);
    setInicio("");
    setFim("");
    setDescricao("");
    aoMudar();
  }

  async function remover(id: number) {
    if (!confirm("Tirar este período do calendário?")) return;
    const resposta = await Api.removerCalendario(id);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Período removido.");
    aoMudar();
  }

  return (
    <div className="grid-2">
      <div className="panel">
        <div className="panel-head">
          <h2>Dias próprios da escola</h2>
          <div className="seletor-ano">
            <button type="button" className="icon-btn" aria-label="Ano anterior" onClick={() => trocarAno(dados.ano - 1)}>
              <Icon name="chevronLeft" />
            </button>
            <b>{dados.ano}</b>
            <button type="button" className="icon-btn" aria-label="Próximo ano" onClick={() => trocarAno(dados.ano + 1)}>
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
        <p className="results-caption">
          Recesso, férias, feriado municipal e conselho de classe são <b>dias sem aula</b>: ninguém registra entrada atrasada e
          eles não contam nas porcentagens. Sábado letivo e reposição são <b>aulas extras</b>.
        </p>
        {podeEditar && (
          <form className="form-calendario" onSubmit={adicionar}>
            <div className="modal-field-row">
              <div className="modal-field">
                <label htmlFor="inicioCalendario">De</label>
                <input id="inicioCalendario" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
              </div>
              <div className="modal-field">
                <label htmlFor="fimCalendario">Até (opcional)</label>
                <input id="fimCalendario" type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} />
              </div>
            </div>
            <div className="modal-field-row">
              <div className="modal-field">
                <label htmlFor="tipoCalendario">Tipo</label>
                <select id="tipoCalendario" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCalendario)}>
                  <option value="sem_aula">Sem aula</option>
                  <option value="aula_extra">Aula extra (dia letivo)</option>
                </select>
              </div>
              <div className="modal-field">
                <label htmlFor="descricaoCalendario">Descrição</label>
                <input
                  id="descricaoCalendario"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={tipo === "sem_aula" ? "Ex.: Recesso escolar" : "Ex.: Sábado letivo"}
                  maxLength={100}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={salvando}>
              <Icon name="plus" /> {salvando ? "Salvando…" : "Adicionar ao calendário"}
            </button>
          </form>
        )}
        {dados.calendario.length === 0 ? (
          <p className="results-caption">Nenhum dia próprio cadastrado em {dados.ano}.</p>
        ) : (
          <ul className="lista-calendario">
            {dados.calendario.map((item) => (
              <li key={item.id_calendario} className={item.tipo === "sem_aula" ? "sem-aula" : "aula-extra"}>
                <span className="lista-calendario-data">
                  {formatarData(item.data_inicio)}
                  {item.data_fim !== item.data_inicio && ` a ${formatarData(item.data_fim)}`}
                </span>
                <span>
                  <b>{item.descricao}</b>
                  <span className="panel-meta">{item.tipo === "sem_aula" ? "Sem aula" : "Aula extra"}</span>
                </span>
                {podeEditar && (
                  <button type="button" className="icon-btn" aria-label={`Remover ${item.descricao}`} onClick={() => remover(item.id_calendario)}>
                    <Icon name="trash" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>Feriados de {dados.ano}</h2>
          <span className="panel-meta">Entram sozinhos</span>
        </div>
        <p className="results-caption">Feriados nacionais, o de São Paulo (9 de julho), Carnaval e Corpus Christi.</p>
        <ul className="lista-feriados">
          {dados.feriados.map((f) => (
            <li key={f.data} className={f.dia_da_semana >= 6 ? "fim-de-semana" : ""}>
              <span className="lista-calendario-data">
                {formatarData(f.data)} <span className="panel-meta">{DIAS_DA_SEMANA[f.dia_da_semana]}</span>
              </span>
              <span>{f.nome}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AbaAvisos({ dados, podeEditar, aoMudar }: { dados: DadosEscola; podeEditar: boolean; aoMudar: () => void }) {
  const { mostrarToast } = useToast();
  const [config, setConfig] = useState<ConfiguracaoEscola>(dados.configuracao);
  const [salvando, setSalvando] = useState(false);
  const faixa = (campo: keyof ConfiguracaoEscola) => dados.faixas[campo] ?? [0, 100];

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const resposta = await Api.salvarConfiguracaoEscola(config);
    setSalvando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Regras da escola salvas.");
    aoMudar();
  }

  const numero = (campo: keyof ConfiguracaoEscola, rotulo: string, unidade: string, ajuda: string) => (
    <div className="campo-regra">
      <label htmlFor={`regra-${campo}`}>{rotulo}</label>
      <div className="campo-regra-entrada">
        <input
          id={`regra-${campo}`}
          type="number"
          min={faixa(campo)[0]}
          max={faixa(campo)[1]}
          value={config[campo] as number}
          disabled={!podeEditar}
          onChange={(e) => setConfig({ ...config, [campo]: Number(e.target.value) })}
        />
        <span>{unidade}</span>
      </div>
      <p className="results-caption">{ajuda}</p>
    </div>
  );

  const opcao = (campo: "aviso_automatico" | "aviso_cada_registro" | "atraso_pela_presenca", rotulo: string, ajuda: string) => (
    <div className="linha-opcao">
      <div>
        <b>{rotulo}</b>
        <p className="results-caption">{ajuda}</p>
      </div>
      <Interruptor ligado={config[campo]} rotulo={rotulo} desabilitado={!podeEditar} onMudar={(ligado) => setConfig({ ...config, [campo]: ligado })} />
    </div>
  );

  return (
    <form className="panel" onSubmit={salvar}>
      <div className="panel-head">
        <h2>Regras e avisos</h2>
        {!podeEditar && <span className="panel-meta">Só a gestão altera</span>}
      </div>
      <div className="grade-regras">
        {numero("tolerancia_minutos", "Tolerância de entrada", "minutos", "Chegar até esse tempo depois do início da aula não é entrada atrasada.")}
        {numero(
          "limite_alerta_percentual",
          "Limite para avisar a família",
          "% dos dias de aula",
          "Ao passar disso, o aluno entra em alerta (média) e os responsáveis são avisados."
        )}
        {numero(
          "minimo_ocorrencias_alerta",
          "Mínimo de ocorrências",
          "registros",
          "Evita alerta por 1 atraso em 2 dias de aula (seria \"50%\")."
        )}
        {numero("janela_alerta_dias", "Período analisado", "últimos dias", "As porcentagens olham os dias de aula desse período.")}
        {numero("intervalo_aviso_dias", "Intervalo entre avisos", "dias", "Se a situação continuar, a família é avisada de novo só depois disso.")}
      </div>
      {opcao(
        "aviso_automatico",
        "Avisar os responsáveis ao passar do limite",
        "Mensagem pelo canal de cada responsável (WhatsApp, e-mail ou os dois). Sem o envio automático configurado, ela fica em Notificações com o link pronto."
      )}
      {opcao("aviso_cada_registro", "Avisar também a cada registro", "Uma mensagem a cada entrada atrasada ou saída antecipada.")}
      {opcao(
        "atraso_pela_presenca",
        "Presença do app depois da tolerância vira entrada atrasada",
        "O aluno passa pela biometria do tablet ao chegar e, se já passou do horário, o atraso fica registrado sozinho."
      )}
      {podeEditar && (
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => setConfig(dados.padroes)}>
            Voltar ao padrão
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando} aria-busy={salvando}>
            {salvando ? "Salvando…" : "Salvar regras"}
          </button>
        </div>
      )}
    </form>
  );
}

const ROTULOS_SITUACAO: Record<string, string> = {
  pendente: "Aguardando aprovação",
  ativo: "Ativa",
  recusado: "Recusada",
  desativado: "Desativada",
};

function AbaEquipe() {
  const { mostrarToast } = useToast();
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<number | null>(null);
  const [aprovando, setAprovando] = useState<MembroEquipe | null>(null);

  const carregar = useCallback(async () => {
    const resposta = await Api.equipe();
    if (resposta.sucesso && resposta.dados) {
      setEquipe(resposta.dados.equipe);
      setPodeEditar(resposta.dados.pode_editar);
    } else {
      mostrarToast(resposta.mensagem, true);
    }
    setCarregando(false);
  }, [mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aplicar(membro: MembroEquipe, nova: AcaoEquipe) {
    const textos: Record<AcaoEquipe, string> = {
      aprovar: `Aprovar o acesso de ${membro.nome_coordenacao}?`,
      recusar: `Recusar o acesso de ${membro.nome_coordenacao}?`,
      desativar: `Desativar a conta de ${membro.nome_coordenacao}? Ela sai na hora de todos os aparelhos.`,
      reativar: `Reativar a conta de ${membro.nome_coordenacao}?`,
      tornar_gestor: `Tornar ${membro.nome_coordenacao} gestor(a) da escola? A gestão altera horários, calendário, regras e equipe.`,
      tornar_coordenador: `Tirar ${membro.nome_coordenacao} da gestão?`,
    };
    if (!confirm(textos[nova])) return;
    setAcao(membro.id_coordenacao);
    const resposta = await Api.atualizarMembro(membro.id_coordenacao, nova);
    setAcao(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Equipe atualizada.");
    carregar();
  }

  /** Aprovação com a permissão escolhida no modal (cargo e permissão são coisas diferentes). */
  async function aprovar(membro: MembroEquipe, papel: PapelConta) {
    setAcao(membro.id_coordenacao);
    const resposta = await Api.atualizarMembro(membro.id_coordenacao, "aprovar", papel);
    setAcao(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    setAprovando(null);
    mostrarToast(`Acesso aprovado como ${ROTULOS_PAPEL[resposta.dados?.papel ?? papel]}: a pessoa recebe um e-mail e já pode entrar.`);
    carregar();
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Equipe da escola</h2>
        <span className="panel-meta">Quem se cadastra nesta escola aguarda a aprovação da gestão</span>
      </div>
      {carregando ? (
        <Esqueleto variante="lista" texto="Carregando a equipe…" />
      ) : (
        <ul className="lista-equipe">
          {equipe.map((membro) => (
            <li key={membro.id_coordenacao} className={`membro membro--${membro.situacao}`}>
              <div className="avatar">{iniciais(membro.nome_coordenacao)}</div>
              <div className="membro-dados">
                <b>
                  {membro.nome_coordenacao}
                  {membro.voce && <span className="panel-meta"> (você)</span>}
                </b>
                <span className="panel-meta">
                  {membro.email_coordenacao && `${membro.email_coordenacao} · `}
                  {membro.cargo && `${ROTULOS_CARGO[membro.cargo]} · `}
                  {/* Pendente: a permissão ainda vai ser escolhida por quem aprova. */}
                  {membro.situacao !== "pendente" && `${ROTULOS_PAPEL[membro.papel]} · `}
                  {ROTULOS_SITUACAO[membro.situacao]}
                  {membro.criado_em && membro.situacao === "pendente" && ` · pediu em ${formatarDataHora(membro.criado_em)}`}
                </span>
                {membro.situacao === "pendente" && membro.email_verificado === false && (
                  <span className="selo-email">Ainda não abriu o link do e-mail: a aprovação fica liberada depois.</span>
                )}
              </div>
              {podeEditar && !membro.voce && (
                <div className="acoes-linha">
                  {membro.situacao === "pendente" && (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => aplicar(membro, "recusar")} disabled={acao !== null}>
                        Recusar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setAprovando(membro)}
                        disabled={acao !== null || membro.email_verificado === false}
                        title={membro.email_verificado === false ? "A pessoa ainda não confirmou o e-mail" : undefined}
                      >
                        Aprovar
                      </button>
                    </>
                  )}
                  {membro.situacao === "ativo" && membro.papel === "coordenador" && (
                    <button type="button" className="btn btn-sm" onClick={() => aplicar(membro, "tornar_gestor")} disabled={acao !== null}>
                      Tornar gestão
                    </button>
                  )}
                  {membro.situacao === "ativo" && membro.papel === "gestor" && (
                    <button type="button" className="btn btn-sm" onClick={() => aplicar(membro, "tornar_coordenador")} disabled={acao !== null}>
                      Tirar da gestão
                    </button>
                  )}
                  {membro.situacao === "ativo" && (
                    <button type="button" className="btn btn-sm" onClick={() => aplicar(membro, "desativar")} disabled={acao !== null}>
                      Desativar
                    </button>
                  )}
                  {(membro.situacao === "desativado" || membro.situacao === "recusado") && (
                    <button type="button" className="btn btn-sm" onClick={() => aplicar(membro, "reativar")} disabled={acao !== null}>
                      Reativar
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <ModalAprovacao
        key={aprovando?.id_coordenacao ?? "nenhum"}
        pedido={aprovando && { nome: aprovando.nome_coordenacao, cargo: aprovando.cargo }}
        onFechar={() => setAprovando(null)}
        onAprovar={(papel) => (aprovando ? aprovar(aprovando, papel) : Promise.resolve())}
      />
    </div>
  );
}
