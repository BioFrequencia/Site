"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Api } from "@/lib/api";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { formatarCpf, formatarTelefone } from "@/lib/format";
import {
  GENEROS_RESPONSAVEL,
  PARENTESCOS_SUGERIDOS,
  ROTULOS_CANAL_RESPONSAVEL,
  ROTULOS_GENERO_RESPONSAVEL,
  type CanalResponsavel,
  type Responsavel,
  type ResponsavelEncontrado,
} from "@/lib/types";

interface AlunoDoVinculo {
  id_aluno: number;
  nome_aluno: string;
  turma?: string | null;
}

type Etapa = "cpf" | "vincular" | "cadastrar";

/**
 * Responsável de um aluno, em etapas - antes buscar e cadastrar ficavam
 * no mesmo formulário e a equipe não sabia qual botão usar:
 *
 *   1. CPF: o sistema procura o responsável na escola.
 *   2a. Achou (irmão de outro aluno): mostra quem é e os alunos que já
 *       acompanha; é só confirmar o vínculo, sem digitar nada de novo.
 *   2b. Não achou: o cadastro, com o CPF já preenchido.
 */
export function ModalResponsavel({
  aberto,
  aluno,
  alunos,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  aluno?: AlunoDoVinculo;
  alunos?: AlunoDoVinculo[];
  onFechar: () => void;
  onSalvo: (mensagem: string) => void;
}) {
  const { mostrarToast } = useToast();
  const [etapa, setEtapa] = useState<Etapa>("cpf");
  const [idAluno, setIdAluno] = useState<number | null>(aluno?.id_aluno ?? null);
  const [buscaAluno, setBuscaAluno] = useState("");
  const [cpf, setCpf] = useState("");
  const [encontrado, setEncontrado] = useState<ResponsavelEncontrado | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [genero, setGenero] = useState("");
  const [canal, setCanal] = useState<CanalResponsavel>("whatsapp");
  const [parentesco, setParentesco] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setEtapa("cpf");
    setIdAluno(aluno?.id_aluno ?? null);
    setBuscaAluno("");
    setCpf("");
    setEncontrado(null);
    setNome("");
    setTelefone("");
    setEmail("");
    setGenero("");
    setCanal("whatsapp");
    setParentesco("");
    setErro(null);
  }, [aberto, aluno?.id_aluno]);

  const escolhido = aluno ?? alunos?.find((a) => a.id_aluno === idAluno) ?? null;
  const filtrados = useMemo(() => {
    const termo = buscaAluno.trim().toLowerCase();
    return (alunos ?? []).filter((a) => !termo || a.nome_aluno.toLowerCase().includes(termo)).slice(0, 8);
  }, [alunos, buscaAluno]);
  const jaVinculado = !!encontrado && !!escolhido && encontrado.alunos.some((a) => a.id_aluno === escolhido.id_aluno);

  async function procurarCpf(evento: FormEvent) {
    evento.preventDefault();
    if (!escolhido) {
      setErro("Escolha o aluno.");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErro("Digite os 11 números do CPF.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const resposta = await Api.buscarResponsavelPorCpf(cpf);
    setEnviando(false);
    if (resposta.sucesso && resposta.dados) {
      setEncontrado(resposta.dados);
      setEtapa("vincular");
      return;
    }
    if (resposta.status === 404) {
      setEtapa("cadastrar");
      return;
    }
    setErro(resposta.mensagem);
  }

  async function vincular() {
    if (!escolhido || !encontrado) return;
    setEnviando(true);
    const resposta = await Api.vincularResponsavel(escolhido.id_aluno, encontrado.id_responsavel, parentesco.trim() || null);
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      mostrarToast(resposta.mensagem, true);
      return;
    }
    onSalvo(`${encontrado.nome_responsavel} agora também é responsável por ${escolhido.nome_aluno}.`);
  }

  async function cadastrar(evento: FormEvent) {
    evento.preventDefault();
    if (!escolhido) return;
    if (!nome.trim() || !telefone.trim() || !genero) {
      setErro("Preencha nome, telefone e gênero.");
      return;
    }
    if (canal !== "whatsapp" && !email.trim()) {
      setErro("Para receber os avisos por e-mail, informe o e-mail.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const resposta = await Api.addResponsavel(escolhido.id_aluno, {
      nome: nome.trim(),
      cpf,
      telefone,
      email: email.trim() || null,
      genero,
      canal,
      parentesco: parentesco.trim() || null,
    });
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      mostrarToast(resposta.mensagem, true);
      return;
    }
    onSalvo(`${nome.trim()} cadastrado(a) como responsável por ${escolhido.nome_aluno}.`);
  }

  const campoParentesco = (
    <div className="modal-field">
      <label htmlFor="parentescoResponsavel">Parentesco com {escolhido?.nome_aluno.split(" ")[0] ?? "o aluno"}</label>
      <input
        id="parentescoResponsavel"
        list="parentescosSugeridos"
        value={parentesco}
        onChange={(e) => setParentesco(e.target.value)}
        placeholder="Opcional. Ex.: Mãe"
        maxLength={30}
      />
      <datalist id="parentescosSugeridos">
        {PARENTESCOS_SUGERIDOS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );

  return (
    <Modal titulo="Adicionar responsável" aberto={aberto} onFechar={onFechar}>
      <ol className="etapas" aria-label="Etapas">
        <li className={etapa === "cpf" ? "atual" : "feita"}>CPF</li>
        <li className={etapa === "cpf" ? "" : "atual"}>{etapa === "vincular" ? "Vincular" : "Dados"}</li>
      </ol>

      {etapa === "cpf" && (
        <form onSubmit={procurarCpf}>
          {!aluno && (
            <div className="modal-field">
              <label htmlFor="buscaAlunoResponsavel">Aluno</label>
              {escolhido ? (
                <div className="escolhido">
                  <span>
                    <b>{escolhido.nome_aluno}</b>
                    {escolhido.turma && <> · {escolhido.turma}</>}
                  </span>
                  <button type="button" className="btn-text" onClick={() => setIdAluno(null)}>
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="buscaAlunoResponsavel"
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
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
                  </div>
                </>
              )}
            </div>
          )}
          <div className="modal-field">
            <label htmlFor="cpfResponsavel">CPF do responsável</label>
            <input
              id="cpfResponsavel"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              autoFocus={!!aluno}
            />
          </div>
          <p className="results-caption">
            Primeiro o sistema procura o CPF: se a pessoa já é responsável por outro aluno da escola (um irmão, por exemplo), é só
            confirmar o vínculo.
          </p>
          {erro && <p className="field-error show">{erro}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Procurando…" : "Continuar"}
            </button>
          </div>
        </form>
      )}

      {etapa === "vincular" && encontrado && (
        <div>
          <div className="cartao-responsavel">
            <div className="avatar">
              <Icon name="user" />
            </div>
            <div>
              <div className="student-name">{encontrado.nome_responsavel}</div>
              <div className="panel-meta">
                CPF {formatarCpf(encontrado.cpf_responsavel)} · {formatarTelefone(encontrado.telefone_responsavel)}
                {encontrado.email_responsavel && <> · {encontrado.email_responsavel}</>}
              </div>
              <div className="panel-meta">
                Avisos por {ROTULOS_CANAL_RESPONSAVEL[encontrado.canal_preferido ?? "whatsapp"]} · já acompanha{" "}
                {encontrado.alunos.map((a) => `${a.nome_aluno} (${a.nome_sala})`).join(", ")}
              </div>
            </div>
          </div>
          {jaVinculado ? (
            <p className="results-caption">Esta pessoa já é responsável por {escolhido?.nome_aluno}.</p>
          ) : (
            campoParentesco
          )}
          {erro && <p className="field-error show">{erro}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setEtapa("cpf")}>
              Voltar
            </button>
            <button type="button" className="btn btn-primary" onClick={vincular} disabled={enviando || jaVinculado}>
              {enviando ? "Vinculando…" : `Vincular a ${escolhido?.nome_aluno.split(" ")[0] ?? "o aluno"}`}
            </button>
          </div>
        </div>
      )}

      {etapa === "cadastrar" && (
        <form onSubmit={cadastrar}>
          <div className="modal-summary">
            Nenhum responsável com o CPF <b>{formatarCpf(cpf.replace(/\D/g, ""))}</b> nesta escola. Preencha os dados para
            cadastrar.
          </div>
          <div className="modal-field">
            <label htmlFor="nomeResponsavel">Nome</label>
            <input id="nomeResponsavel" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={150} autoFocus />
          </div>
          <div className="modal-field-row">
            <div className="modal-field">
              <label htmlFor="telefoneResponsavel">Telefone (WhatsApp)</label>
              <input
                id="telefoneResponsavel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-0000"
                inputMode="tel"
              />
            </div>
            <div className="modal-field">
              <label htmlFor="generoResponsavel">Gênero</label>
              <select id="generoResponsavel" value={genero} onChange={(e) => setGenero(e.target.value)}>
                <option value="">Selecione…</option>
                {GENEROS_RESPONSAVEL.map((g) => (
                  <option key={g} value={g}>
                    {ROTULOS_GENERO_RESPONSAVEL[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-field">
            <label htmlFor="emailResponsavel">E-mail</label>
            <input
              id="emailResponsavel"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={canal === "whatsapp" ? "Opcional" : "Obrigatório para avisos por e-mail"}
            />
          </div>
          <EscolhaCanal canal={canal} onMudar={setCanal} />
          {campoParentesco}
          {erro && <p className="field-error show">{erro}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setEtapa("cpf")}>
              Voltar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Salvando…" : "Cadastrar e vincular"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** Por onde o responsável recebe os avisos automáticos. */
export function EscolhaCanal({ canal, onMudar }: { canal: CanalResponsavel; onMudar: (canal: CanalResponsavel) => void }) {
  return (
    <fieldset className="modal-field escolha-canal">
      <legend>Avisos automáticos por</legend>
      {(Object.keys(ROTULOS_CANAL_RESPONSAVEL) as CanalResponsavel[]).map((opcao) => (
        <label key={opcao} className={`opcao-canal${canal === opcao ? " ativa" : ""}`}>
          <input type="radio" name="canalResponsavel" value={opcao} checked={canal === opcao} onChange={() => onMudar(opcao)} />
          {ROTULOS_CANAL_RESPONSAVEL[opcao]}
        </label>
      ))}
    </fieldset>
  );
}

/** Corrige telefone, e-mail, canal e o parentesco com um aluno - antes era preciso remover e cadastrar de novo. */
export function ModalEditarResponsavel({
  responsavel,
  idAluno,
  nomeAluno,
  onFechar,
  onSalvo,
}: {
  responsavel: Responsavel | null;
  idAluno?: number;
  nomeAluno?: string;
  onFechar: () => void;
  onSalvo: (mensagem: string) => void;
}) {
  const { mostrarToast } = useToast();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [genero, setGenero] = useState("");
  const [canal, setCanal] = useState<CanalResponsavel>("whatsapp");
  const [parentesco, setParentesco] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!responsavel) return;
    setNome(responsavel.nome_responsavel);
    setTelefone(formatarTelefone(responsavel.telefone_responsavel));
    setEmail(responsavel.email_responsavel ?? "");
    setGenero(responsavel.genero_responsavel);
    setCanal(responsavel.canal_preferido ?? "whatsapp");
    setParentesco(responsavel.parentesco ?? "");
    setErro(null);
  }, [responsavel]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!responsavel) return;
    setEnviando(true);
    setErro(null);
    const resposta = await Api.atualizarResponsavel(responsavel.id_responsavel, {
      nome_responsavel: nome.trim(),
      telefone_responsavel: telefone,
      email_responsavel: email.trim() || null,
      genero_responsavel: genero,
      canal_preferido: canal,
      ...(idAluno ? { id_aluno: idAluno, parentesco: parentesco.trim() || null } : {}),
    });
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      mostrarToast(resposta.mensagem, true);
      return;
    }
    onSalvo(`Dados de ${nome.trim()} atualizados.`);
  }

  return (
    <Modal titulo="Editar responsável" aberto={!!responsavel} onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        <div className="modal-summary">
          CPF <b>{responsavel ? formatarCpf(responsavel.cpf_responsavel) : ""}</b> (o CPF não muda: é o que identifica a pessoa).
        </div>
        <div className="modal-field">
          <label htmlFor="editarNomeResponsavel">Nome</label>
          <input id="editarNomeResponsavel" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={150} required />
        </div>
        <div className="modal-field-row">
          <div className="modal-field">
            <label htmlFor="editarTelefoneResponsavel">Telefone (WhatsApp)</label>
            <input id="editarTelefoneResponsavel" value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" required />
          </div>
          <div className="modal-field">
            <label htmlFor="editarGeneroResponsavel">Gênero</label>
            <select id="editarGeneroResponsavel" value={genero} onChange={(e) => setGenero(e.target.value)}>
              {GENEROS_RESPONSAVEL.map((g) => (
                <option key={g} value={g}>
                  {ROTULOS_GENERO_RESPONSAVEL[g]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-field">
          <label htmlFor="editarEmailResponsavel">E-mail</label>
          <input id="editarEmailResponsavel" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <EscolhaCanal canal={canal} onMudar={setCanal} />
        {idAluno && (
          <div className="modal-field">
            <label htmlFor="editarParentesco">Parentesco com {nomeAluno?.split(" ")[0] ?? "o aluno"}</label>
            <input
              id="editarParentesco"
              list="parentescosEdicao"
              value={parentesco}
              onChange={(e) => setParentesco(e.target.value)}
              maxLength={30}
            />
            <datalist id="parentescosEdicao">
              {PARENTESCOS_SUGERIDOS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        )}
        {erro && <p className="field-error show">{erro}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
