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
import { SELO_SITUACAO, foraPorErro, oQueEntraOcorrencias, quantidade } from "@/lib/importacao";
import type { OcorrenciaImportada, PreviaOcorrencias, ResultadoOcorrencias } from "@/lib/types";

const NOME_DO_TIPO = { atraso: "Entrada atrasada", saida: "Saída antecipada" } as const;

/**
 * Importar as entradas atrasadas e saídas antecipadas anotadas no Excel
 * quando a escola estava sem internet (item 5 do pedido): baixar o modelo
 * (com o código de cada aluno), escolher ou arrastar a planilha, ver a
 * prévia linha a linha e confirmar. As regras são as do lançamento
 * manual (dia de aula, horário da turma, tolerância, uma de cada tipo por
 * aluno por dia); o que já está registrado fica como está. Os
 * responsáveis não recebem aviso por registro importado - só o de limite.
 */
export default function ImportarOcorrenciasPage() {
  const { etapa, erro, previa, soErros, setSoErros, lerArquivo, confirmar, recomecar } = useImportacao<
    PreviaOcorrencias,
    ResultadoOcorrencias
  >(Api.previaOcorrencias, Api.confirmarOcorrencias);

  const linhas = previa ? previa.linhas.filter((l) => !soErros || l.situacao === "erro") : [];
  const comErro = previa?.resumo.com_erro ?? 0;
  const entra = previa ? oQueEntraOcorrencias(previa.resumo) : "";

  return (
    <>
      <Topbar
        titulo="Importar planilha"
        subtitulo="Entradas atrasadas e saídas antecipadas anotadas no Excel quando a escola estava sem internet."
        acoes={
          <Link href="/registros" className="btn">
            <Icon name="chevronLeft" /> Entradas e saídas
          </Link>
        }
      />

      {etapa.tipo === "pronto" ? (
        <PainelConcluido
          acoes={
            <>
              <Link href="/registros" className="btn btn-primary">
                Ver entradas e saídas
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
            <PassoModelo baixar={Api.baixarModeloOcorrencias}>
              Para os dias sem internet: anote na aba Ocorrências uma linha por entrada atrasada ou saída antecipada. A aba Alunos traz
              o código de cada aluno da escola - digite o código e o nome e a turma aparecem sozinhos.
            </PassoModelo>
            <PassoArquivo etapa={etapa} nomeDaPrevia={previa?.arquivo.nome ?? null} erro={erro} onArquivo={lerArquivo} />
          </div>

          {previa && (
            <section className="panel importacao-previa" aria-live="polite">
              <div className="panel-head">
                <h2>3. Confira antes de registrar</h2>
                <span className="panel-meta">Nada foi gravado ainda.</span>
              </div>

              <div className="cards-resumo">
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Entradas atrasadas</span>
                  <span className="card-resumo-valor">{previa.resumo.atrasos_novos}</span>
                </div>
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Saídas antecipadas</span>
                  <span className="card-resumo-valor">{previa.resumo.saidas_novas}</span>
                </div>
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Já registradas</span>
                  <span className="card-resumo-valor">{previa.resumo.existentes}</span>
                </div>
                <div className="card-resumo">
                  <span className="card-resumo-rotulo">Linhas com erro</span>
                  <span className={`card-resumo-valor${comErro > 0 ? " cor-erro" : ""}`}>{comErro}</span>
                </div>
              </div>

              <AvisosEFiltro avisos={previa.avisos} comErro={comErro} soErros={soErros} onSoErros={setSoErros} />

              {linhas.length > 0 && <TabelaOcorrencias linhas={linhas} />}

              <RodapeDaPrevia
                erro={erro}
                legenda={
                  entra
                    ? `Vai registrar ${entra}${foraPorErro(comErro)}. Os responsáveis não recebem aviso por registro importado; o aviso de limite continua valendo.`
                    : "Não há nada novo para registrar nesta planilha."
                }
                gravando={etapa.tipo === "gravando"}
                podeConfirmar={entra !== ""}
                rotuloConfirmar={entra ? `Registrar ${entra}` : "Nada para registrar"}
                rotuloGravando="Registrando…"
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

/** O que entrou e o que ficou de fora (já registrado ou com erro). */
function ResultadoDaImportacao({ resultado }: { resultado: ResultadoOcorrencias }) {
  const { atrasos_criados: atrasos, saidas_criadas: saidas, avisos_de_limite: avisos } = resultado;
  const jaTinha = resultado.resumo.existentes;
  const comErro = resultado.resumo.com_erro;
  return (
    <>
      <ul className="importacao-numeros">
        {atrasos > 0 && (
          <li>
            <strong>{atrasos}</strong> {atrasos === 1 ? "entrada atrasada" : "entradas atrasadas"}
          </li>
        )}
        {saidas > 0 && (
          <li>
            <strong>{saidas}</strong> {saidas === 1 ? "saída antecipada" : "saídas antecipadas"}
          </li>
        )}
        {avisos > 0 && (
          <li>
            <strong>{avisos}</strong> {avisos === 1 ? "aviso de limite aos responsáveis" : "avisos de limite aos responsáveis"}
          </li>
        )}
      </ul>
      {jaTinha > 0 && (
        <p className="results-caption">O que já estava registrado ({quantidade(jaTinha, "linha", "linhas")}) ficou como estava.</p>
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

/** Motivo, justificativa, quem buscou e observação, um por linha. */
function detalhesDaLinha(linha: OcorrenciaImportada): string[] {
  const detalhes: string[] = [];
  if (linha.motivo) detalhes.push(`Motivo: ${linha.motivo}${linha.justificado ? " (justificada)" : ""}`);
  else if (linha.justificado) detalhes.push("Justificada");
  if (linha.retirado_por) detalhes.push(`Quem buscou: ${linha.retirado_por}`);
  if (linha.observacao) detalhes.push(`Observação: ${linha.observacao}`);
  return detalhes;
}

function TabelaOcorrencias({ linhas }: { linhas: OcorrenciaImportada[] }) {
  return (
    <table className="data-table tabela-cartoes">
      <thead>
        <tr>
          <th>Linha</th>
          <th>Aluno</th>
          <th>Data e horário</th>
          <th>Tipo</th>
          <th>Detalhes</th>
          <th>Situação</th>
          <th>Observações</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => {
          const detalhes = detalhesDaLinha(linha);
          return (
            <tr key={linha.linha}>
              <td data-label="Linha" className="num">
                {linha.linha}
              </td>
              <td className="celula-titulo">
                {linha.aluno || "(sem aluno)"}
                {linha.turma && <div className="panel-meta">{linha.turma}</div>}
              </td>
              <td data-label="Data e horário">
                {linha.data ? formatarData(linha.data) : "-"}
                {linha.hora && ` às ${linha.hora}`}
              </td>
              <td data-label="Tipo">{linha.tipo ? NOME_DO_TIPO[linha.tipo] : "-"}</td>
              <td data-label="Detalhes">
                {detalhes.length > 0 ? (
                  <ul className="importacao-observacoes">
                    {detalhes.map((texto) => (
                      <li key={texto}>{texto}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="panel-meta">-</span>
                )}
              </td>
              <td data-label="Situação">
                <span className={SELO_SITUACAO[linha.situacao].classe}>
                  {linha.situacao === "existente" ? "Já registrada" : SELO_SITUACAO[linha.situacao].texto}
                </span>
              </td>
              <td data-label="Observações" className="celula-acoes">
                <Observacoes erros={linha.erros} avisos={linha.avisos} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
