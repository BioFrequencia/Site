"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { tocarSom } from "@/lib/sons";
import { formatarData } from "@/lib/format";
import type { AlunoImportado, PreviaImportacao, ResultadoImportacao, TurmaImportada } from "@/lib/types";

const EXTENSOES = [".xlsx", ".xls", ".ods", ".csv"];
const TAMANHO_MAXIMO = 2 * 1024 * 1024;

type Etapa =
  | { tipo: "escolher" }
  | { tipo: "lendo"; arquivo: File }
  | { tipo: "previa"; arquivo: File; previa: PreviaImportacao }
  | { tipo: "gravando"; arquivo: File; previa: PreviaImportacao }
  | { tipo: "pronto"; resultado: ResultadoImportacao };

const SELO_SITUACAO: Record<string, { classe: string; texto: string }> = {
  nova: { classe: "badge badge--regular", texto: "Nova" },
  novo: { classe: "badge badge--regular", texto: "Novo" },
  existente: { classe: "badge badge--neutral", texto: "Já existe" },
  erro: { classe: "badge badge--erro", texto: "Erro" },
};

/** "11988887777" => "(11) 98888-7777"; para a prévia ficar legível. */
function formatarTelefone(digitos: string): string {
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digitos);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}

/** O que a confirmação vai cadastrar, em palavras ("2 turmas e 15 alunos"). */
function oQueEntra(resumo: PreviaImportacao["resumo"]): string {
  const partes = [];
  if (resumo.turmas_novas > 0) partes.push(`${resumo.turmas_novas} ${resumo.turmas_novas === 1 ? "turma" : "turmas"}`);
  if (resumo.alunos_novos > 0) partes.push(`${resumo.alunos_novos} ${resumo.alunos_novos === 1 ? "aluno" : "alunos"}`);
  return partes.join(" e ");
}

/**
 * Importar turmas e alunos de uma planilha (item 4 do pedido): baixar o
 * modelo, escolher ou arrastar o arquivo, ver a prévia linha a linha (o
 * que entra, o que a escola já tem e o que tem erro, com o motivo) e
 * confirmar. A API confere tudo de novo na confirmação e grava numa
 * transação só; importar a mesma planilha de novo não duplica nada.
 */
export default function ImportarPlanilhaPage() {
  const { mostrarToast } = useToast();
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "escolher" });
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [soErros, setSoErros] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const tituloPronto = useRef<HTMLHeadingElement>(null);

  // O painel do resultado toma o lugar do botão clicado: o foco vai para o
  // título dele, para quem usa teclado ou leitor de tela não ficar perdido.
  useEffect(() => {
    if (etapa.tipo === "pronto") tituloPronto.current?.focus();
  }, [etapa.tipo]);

  async function baixarModelo() {
    setBaixando(true);
    const resposta = await Api.baixarModeloImportacao();
    setBaixando(false);
    mostrarToast(resposta.mensagem, !resposta.sucesso);
  }

  async function lerArquivo(arquivo: File) {
    setErro(null);
    setSoErros(false);
    const extensao = arquivo.name.slice(arquivo.name.lastIndexOf(".")).toLowerCase();
    if (!EXTENSOES.includes(extensao)) {
      setErro("Escolha uma planilha do Excel (.xlsx ou .xls), do LibreOffice (.ods) ou um .csv.");
      void tocarSom("erro");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro("A planilha passa de 2 MB. Divida em arquivos menores.");
      void tocarSom("erro");
      return;
    }
    setEtapa({ tipo: "lendo", arquivo });
    const resposta = await Api.previaImportacao(arquivo);
    if (!resposta.sucesso || !resposta.dados) {
      setEtapa({ tipo: "escolher" });
      setErro(resposta.mensagem);
      void tocarSom("erro");
      return;
    }
    setEtapa({ tipo: "previa", arquivo, previa: resposta.dados });
  }

  function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Limpa o campo: escolher o mesmo arquivo de novo (corrigido) dispara de novo.
    evento.target.value = "";
    if (arquivo) void lerArquivo(arquivo);
  }

  function aoSoltar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    setArrastando(false);
    const arquivo = evento.dataTransfer.files?.[0];
    if (arquivo) void lerArquivo(arquivo);
  }

  async function confirmar() {
    if (etapa.tipo !== "previa") return;
    setErro(null);
    setEtapa({ ...etapa, tipo: "gravando" });
    const resposta = await Api.confirmarImportacao(etapa.arquivo, etapa.previa.arquivo.hash);
    if (!resposta.sucesso || !resposta.dados) {
      setEtapa({ ...etapa, tipo: "previa" });
      setErro(resposta.mensagem);
      void tocarSom("erro");
      return;
    }
    setEtapa({ tipo: "pronto", resultado: resposta.dados });
    void tocarSom("confirmacao");
  }

  function recomecar() {
    setErro(null);
    setEtapa({ tipo: "escolher" });
  }

  const previa = etapa.tipo === "previa" || etapa.tipo === "gravando" ? etapa.previa : null;
  const turmas = previa ? previa.turmas.filter((t) => !soErros || t.situacao === "erro") : [];
  const alunos = previa ? previa.alunos.filter((a) => !soErros || a.situacao === "erro") : [];
  const comErro = previa ? previa.resumo.turmas_com_erro + previa.resumo.alunos_com_erro : 0;
  const entra = previa ? oQueEntra(previa.resumo) : "";

  return (
    <>
      <Topbar
        titulo="Importar planilha"
        subtitulo="Cadastre turmas e alunos de uma vez, a partir de uma planilha do Excel."
        acoes={
          <Link href="/turmas" className="btn">
            <Icon name="chevronLeft" /> Turmas e alunos
          </Link>
        }
      />

      {etapa.tipo === "pronto" ? (
        <div className="panel importacao-pronta">
          <svg className="check-animado" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="23" />
            <path d="M15 27l7 7 15-16" />
          </svg>
          <h2 ref={tituloPronto} tabIndex={-1}>
            Importação concluída
          </h2>
          <ResultadoDaImportacao resultado={etapa.resultado} />
          <div className="importacao-acoes">
            <Link href="/turmas" className="btn btn-primary">
              Ver turmas e alunos
            </Link>
            <button type="button" className="btn" onClick={recomecar}>
              Importar outra planilha
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="importacao-passos">
            <section className="panel">
              <div className="panel-head">
                <h2>1. Baixe o modelo</h2>
              </div>
              <p className="results-caption">
                O modelo tem as abas Turmas e Alunos, com listas de período e gênero e as turmas que a sua escola já tem. Uma
                linha por turma ou por aluno; o responsável é opcional.
              </p>
              <button type="button" className="btn" onClick={baixarModelo} disabled={baixando} aria-busy={baixando}>
                <Icon name="download" /> {baixando ? "Gerando…" : "Baixar o modelo (.xlsx)"}
              </button>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>2. Escolha a planilha</h2>
              </div>
              <label
                className={`area-arquivo${arrastando ? " arrastando" : ""}${etapa.tipo === "lendo" ? " lendo" : ""}`}
                onDragOver={(evento) => {
                  evento.preventDefault();
                  setArrastando(true);
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={aoSoltar}
              >
                <input
                  type="file"
                  accept={EXTENSOES.join(",")}
                  onChange={aoEscolher}
                  disabled={etapa.tipo === "lendo" || etapa.tipo === "gravando"}
                  aria-describedby="dicaArquivo"
                />
                <Icon name="fileText" />
                <strong>
                  {etapa.tipo === "lendo"
                    ? `Lendo ${etapa.arquivo.name}…`
                    : previa
                      ? previa.arquivo.nome
                      : "Arraste a planilha para cá ou clique para escolher"}
                </strong>
                <span id="dicaArquivo">Excel (.xlsx ou .xls), LibreOffice (.ods) ou .csv, até 2 MB.</span>
              </label>
              {erro && etapa.tipo === "escolher" && (
                <p className="field-error show" role="alert">
                  {erro}
                </p>
              )}
            </section>
          </div>

          {previa && (
            <section className="panel importacao-previa" aria-live="polite">
              <div className="panel-head">
                <h2>3. Confira antes de cadastrar</h2>
                <span className="panel-meta">Nada foi gravado ainda.</span>
              </div>

              <div className="cards-resumo">
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Turmas novas</span>
                  <span className="card-resumo-valor">
                    {previa.resumo.turmas_novas}
                    {previa.resumo.turmas_existentes > 0 && <small> · {previa.resumo.turmas_existentes} já existem</small>}
                  </span>
                </div>
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Alunos novos</span>
                  <span className="card-resumo-valor">
                    {previa.resumo.alunos_novos}
                    {previa.resumo.alunos_existentes > 0 && <small> · {previa.resumo.alunos_existentes} já existem</small>}
                  </span>
                </div>
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Responsáveis</span>
                  <span className="card-resumo-valor">
                    {previa.resumo.responsaveis_novos}
                    {previa.resumo.responsaveis_vinculados > 0 && <small> · {previa.resumo.responsaveis_vinculados} só vinculados</small>}
                  </span>
                </div>
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Linhas com erro</span>
                  <span className={`card-resumo-valor${comErro > 0 ? " cor-erro" : ""}`}>{comErro}</span>
                </div>
              </div>

              {previa.avisos.length > 0 && (
                <ul className="importacao-avisos">
                  {previa.avisos.map((aviso) => (
                    <li key={aviso}>{aviso}</li>
                  ))}
                </ul>
              )}

              {comErro > 0 && (
                <label className="importacao-filtro">
                  <input type="checkbox" checked={soErros} onChange={(e) => setSoErros(e.target.checked)} /> Mostrar só as linhas com erro
                </label>
              )}

              {turmas.length > 0 && <TabelaTurmas turmas={turmas} />}
              {alunos.length > 0 && <TabelaAlunos alunos={alunos} />}

              {erro && (
                <p className="field-error show" role="alert">
                  {erro}
                </p>
              )}
              <div className="importacao-confirmar">
                <p className="results-caption">
                  {entra
                    ? `Vai cadastrar ${entra}${comErro > 0 ? `; as ${comErro} linhas com erro ficam de fora` : ""}. Tudo entra de uma vez.`
                    : "Não há nada novo para cadastrar nesta planilha."}
                </p>
                <div className="importacao-acoes">
                  <button type="button" className="btn" onClick={recomecar} disabled={etapa.tipo === "gravando"}>
                    Escolher outro arquivo
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmar}
                    disabled={!entra || etapa.tipo === "gravando"}
                    aria-busy={etapa.tipo === "gravando"}
                  >
                    {etapa.tipo === "gravando" ? "Cadastrando…" : entra ? `Cadastrar ${entra}` : "Nada para cadastrar"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

/**
 * O que a importação cadastrou (só o que entrou: nada de "0 turmas novas")
 * e o que ficou de fora: o que a escola já tinha e as linhas com erro.
 */
function ResultadoDaImportacao({ resultado }: { resultado: ResultadoImportacao }) {
  const { turmas_criadas: turmas, alunos_criados: alunos, responsaveis_criados: responsaveis, vinculos_criados: vinculos } = resultado;
  const jaTinha = resultado.resumo.turmas_existentes + resultado.resumo.alunos_existentes;
  const comErro = resultado.resumo.turmas_com_erro + resultado.resumo.alunos_com_erro;
  return (
    <>
      <ul className="importacao-numeros">
        {turmas > 0 && (
          <li>
            <strong>{turmas}</strong> {turmas === 1 ? "turma nova" : "turmas novas"}
          </li>
        )}
        {alunos > 0 && (
          <li>
            <strong>{alunos}</strong> {alunos === 1 ? "aluno novo" : "alunos novos"}
          </li>
        )}
        {responsaveis > 0 && (
          <li>
            <strong>{responsaveis}</strong> {responsaveis === 1 ? "responsável cadastrado" : "responsáveis cadastrados"}
          </li>
        )}
        {/* Cada responsável novo tem ao menos um vínculo; só vale mostrar quando há mais. */}
        {vinculos > responsaveis && (
          <li>
            <strong>{vinculos}</strong> {vinculos === 1 ? "vínculo entre aluno e responsável" : "vínculos entre alunos e responsáveis"}
          </li>
        )}
      </ul>
      {jaTinha > 0 && (
        <p className="results-caption">
          O que a escola já tinha ({jaTinha === 1 ? "1 linha" : `${jaTinha} linhas`}) ficou como estava.
        </p>
      )}
      {comErro > 0 && (
        <p className="results-caption">
          {comErro === 1 ? "A linha com erro ficou de fora" : `As ${comErro} linhas com erro ficaram de fora`}: corrija na planilha e
          importe de novo; o que já entrou não duplica.
        </p>
      )}
    </>
  );
}

function Observacoes({ erros, avisos }: { erros: string[]; avisos: string[] }) {
  if (erros.length === 0 && avisos.length === 0) return <span className="panel-meta">-</span>;
  return (
    <ul className="importacao-observacoes">
      {erros.map((texto) => (
        <li key={texto} className="erro">
          {texto}
        </li>
      ))}
      {avisos.map((texto) => (
        <li key={texto}>{texto}</li>
      ))}
    </ul>
  );
}

function TabelaTurmas({ turmas }: { turmas: TurmaImportada[] }) {
  return (
    <>
      <h3 className="importacao-titulo-tabela">Turmas</h3>
      <table className="data-table tabela-cartoes">
        <thead>
          <tr>
            <th>Linha</th>
            <th>Turma</th>
            <th>Período</th>
            <th>Horário</th>
            <th>Situação</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          {turmas.map((turma) => (
            <tr key={turma.linha}>
              <td data-label="Linha" className="num">
                {turma.linha}
              </td>
              <td className="celula-titulo">{turma.nome || "(sem nome)"}</td>
              <td data-label="Período">{turma.periodo ?? "-"}</td>
              <td data-label="Horário">{turma.inicio && turma.fim ? `${turma.inicio}–${turma.fim}` : "do período"}</td>
              <td data-label="Situação">
                <span className={SELO_SITUACAO[turma.situacao].classe}>{SELO_SITUACAO[turma.situacao].texto}</span>
              </td>
              <td data-label="Observações" className="celula-acoes">
                <Observacoes erros={turma.erros} avisos={turma.avisos} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TabelaAlunos({ alunos }: { alunos: AlunoImportado[] }) {
  return (
    <>
      <h3 className="importacao-titulo-tabela">Alunos</h3>
      <table className="data-table tabela-cartoes">
        <thead>
          <tr>
            <th>Linha</th>
            <th>Aluno</th>
            <th>Turma</th>
            <th>Nascimento</th>
            <th>Responsável</th>
            <th>Situação</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((aluno) => (
            <tr key={aluno.linha}>
              <td data-label="Linha" className="num">
                {aluno.linha}
              </td>
              <td className="celula-titulo">
                {aluno.nome || "(sem nome)"}
                {aluno.genero && <div className="panel-meta">{aluno.genero}</div>}
              </td>
              <td data-label="Turma">{aluno.turma || "-"}</td>
              <td data-label="Nascimento">{aluno.nascimento ? formatarData(aluno.nascimento) : "-"}</td>
              <td data-label="Responsável">
                {aluno.responsavel ? (
                  <>
                    {aluno.responsavel.nome}
                    <div className="panel-meta">
                      {formatarTelefone(aluno.responsavel.telefone)}
                      {aluno.responsavel.parentesco && ` · ${aluno.responsavel.parentesco}`}
                    </div>
                  </>
                ) : (
                  "-"
                )}
              </td>
              <td data-label="Situação">
                <span className={SELO_SITUACAO[aluno.situacao].classe}>{SELO_SITUACAO[aluno.situacao].texto}</span>
              </td>
              <td data-label="Observações" className="celula-acoes">
                <Observacoes erros={aluno.erros} avisos={aluno.avisos} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
