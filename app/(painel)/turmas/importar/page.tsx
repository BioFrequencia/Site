"use client";

import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import {
  AvisosEFiltro,
  Observacoes,
  PainelConcluido,
  PassoArquivo,
  PassoModelo,
  RodapeDaPrevia,
  useImportacao,
} from "@/components/Importacao";
import { formatarData } from "@/lib/format";
import { SELO_SITUACAO, foraPorErro, formatarTelefone, oQueEntraTurmas, quantidade } from "@/lib/importacao";
import type { AlunoImportado, PreviaImportacao, ResultadoImportacao, TurmaImportada } from "@/lib/types";

/**
 * Importar turmas e alunos de uma planilha (item 4 do pedido): baixar o
 * modelo, escolher ou arrastar o arquivo, ver a prévia linha a linha (o
 * que entra, o que a escola já tem e o que tem erro, com o motivo) e
 * confirmar. A API confere tudo de novo na confirmação e grava numa
 * transação só; importar a mesma planilha de novo não duplica nada.
 */
export default function ImportarPlanilhaPage() {
  const { etapa, erro, previa, soErros, setSoErros, lerArquivo, confirmar, recomecar } = useImportacao<
    PreviaImportacao,
    ResultadoImportacao
  >(Api.previaImportacao, Api.confirmarImportacao);

  const turmas = previa ? previa.turmas.filter((t) => !soErros || t.situacao === "erro") : [];
  const alunos = previa ? previa.alunos.filter((a) => !soErros || a.situacao === "erro") : [];
  const comErro = previa ? previa.resumo.turmas_com_erro + previa.resumo.alunos_com_erro : 0;
  const entra = previa ? oQueEntraTurmas(previa.resumo) : "";

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
        <PainelConcluido
          acoes={
            <>
              <Link href="/turmas" className="btn btn-primary">
                Ver turmas e alunos
              </Link>
              <button type="button" className="btn" onClick={recomecar}>
                Importar outra planilha
              </button>
            </>
          }
        >
          <ResultadoDaImportacao resultado={etapa.resultado} />
        </PainelConcluido>
      ) : (
        <>
          <div className="importacao-passos">
            <PassoModelo baixar={Api.baixarModeloImportacao}>
              O modelo tem as abas Turmas e Alunos, com listas de período e gênero e as turmas que a sua escola já tem. Uma
              linha por turma ou por aluno; o responsável é opcional.
            </PassoModelo>
            <PassoArquivo etapa={etapa} nomeDaPrevia={previa?.arquivo.nome ?? null} erro={erro} onArquivo={lerArquivo} />
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

              <AvisosEFiltro avisos={previa.avisos} comErro={comErro} soErros={soErros} onSoErros={setSoErros} />

              {turmas.length > 0 && <TabelaTurmas turmas={turmas} />}
              {alunos.length > 0 && <TabelaAlunos alunos={alunos} />}

              <RodapeDaPrevia
                erro={erro}
                legenda={
                  entra
                    ? `Vai cadastrar ${entra}${foraPorErro(comErro)}. Tudo entra de uma vez.`
                    : "Não há nada novo para cadastrar nesta planilha."
                }
                gravando={etapa.tipo === "gravando"}
                podeConfirmar={entra !== ""}
                rotuloConfirmar={entra ? `Cadastrar ${entra}` : "Nada para cadastrar"}
                rotuloGravando="Cadastrando…"
                onConfirmar={confirmar}
                onRecomecar={recomecar}
              />
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
        <p className="results-caption">O que a escola já tinha ({quantidade(jaTinha, "linha", "linhas")}) ficou como estava.</p>
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
