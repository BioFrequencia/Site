"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { Paginacao } from "@/components/Paginacao";
import { formatarDataHora } from "@/lib/format";
import type { HistoricoCorrecoes, TipoCancelavel } from "@/lib/types";

const NOMES_TIPO: Record<TipoCancelavel, string> = {
  atraso: "Entrada atrasada",
  saida: "Saída antecipada",
  presenca: "Presença",
};

/**
 * Histórico de correções (migração 012): cada entrada atrasada, saída
 * antecipada ou presença cancelada ou restaurada - quem fez, quando, o
 * motivo e como o registro estava. Só a gestão vê (a API responde 403 para
 * as outras contas). ?aluno=ID mostra só um aluno (link da ficha dele).
 */
export default function CorrecoesPage() {
  const [pagina, setPagina] = useState(1);
  // undefined: ainda lendo o endereço (o filtro por aluno vem do ?aluno=).
  const [idAluno, setIdAluno] = useState<number | null | undefined>(undefined);
  const [dados, setDados] = useState<HistoricoCorrecoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const aluno = Number(new URLSearchParams(window.location.search).get("aluno"));
    setIdAluno(Number.isInteger(aluno) && aluno > 0 ? aluno : null);
  }, []);

  const carregar = useCallback(async () => {
    if (idAluno === undefined) return;
    const resposta = await Api.historicoCorrecoes(pagina, idAluno);
    if (resposta.sucesso && resposta.dados) {
      setDados(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
  }, [pagina, idAluno]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function verEscolaToda() {
    window.history.replaceState(null, "", window.location.pathname);
    setPagina(1);
    setDados(null);
    setIdAluno(null);
  }

  const nomeDoAluno = idAluno ? dados?.correcoes[0]?.nome_aluno : undefined;

  return (
    <>
      <Link href="/registros" className="link-voltar">
        <Icon name="chevronLeft" />
        Entradas e saídas
      </Link>
      <Topbar
        titulo="Histórico de correções"
        subtitulo={
          idAluno
            ? `Registros de ${nomeDoAluno ?? "um aluno"} que foram cancelados ou restaurados.`
            : "Cada registro cancelado ou restaurado na escola: quem fez, quando, o motivo e como o registro estava."
        }
      />

      {idAluno ? (
        <p className="results-caption">
          Mostrando só um aluno.{" "}
          <button type="button" className="btn-link" onClick={verEscolaToda}>
            Ver a escola toda
          </button>
        </p>
      ) : null}

      {erro && (
        <div className="error-block" role="alert">
          {erro}
        </div>
      )}
      {!dados && !erro && <Esqueleto variante="lista" texto="Carregando o histórico de correções…" />}

      {dados && (
        <div className="panel panel-tabela">
          {dados.correcoes.length === 0 ? (
            <div className="empty-state">
              <Icon name="clipboardText" />
              <p>Nenhuma correção até agora. Quando alguém cancelar ou restaurar um registro, ele aparece aqui, com o motivo.</p>
            </div>
          ) : (
            <table className="tabela tabela-cartoes">
              <caption className="sr-only">Histórico de correções</caption>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Aluno</th>
                  <th>Registro corrigido</th>
                  <th>O que foi feito</th>
                  <th>Quem fez</th>
                </tr>
              </thead>
              <tbody>
                {dados.correcoes.map((correcao) => (
                  <tr key={correcao.id_auditoria}>
                    <td className="celula-titulo tabular">{formatarDataHora(correcao.feito_em)}</td>
                    <td data-label="Aluno">
                      <Link href={`/turmas/${correcao.id_aluno}`} className="link-aluno">
                        {correcao.nome_aluno}
                      </Link>
                      {correcao.nome_sala && <div className="panel-meta">{correcao.nome_sala}</div>}
                    </td>
                    <td data-label="Registro corrigido">
                      {NOMES_TIPO[correcao.tipo]}
                      {correcao.antes.momento ? ` de ${formatarDataHora(correcao.antes.momento)}` : ""}
                      <div className="panel-meta">
                        {[
                          correcao.antes.detalhe,
                          correcao.antes.motivo ? `Motivo do registro: ${correcao.antes.motivo}` : null,
                          correcao.registrado_por ? `Registrado por ${correcao.registrado_por}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td data-label="O que foi feito">
                      <span className={`badge ${correcao.acao === "cancelar" ? "badge--cancelado" : "badge--regular"}`}>
                        {correcao.acao === "cancelar" ? "Cancelado" : "Restaurado"}
                      </span>
                      {correcao.motivo && <div className="panel-meta">{correcao.motivo}</div>}
                    </td>
                    <td data-label="Quem fez">{correcao.feito_por}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Paginacao pagina={dados.pagina} totalPaginas={dados.total_paginas} onMudar={setPagina} />
        </div>
      )}
    </>
  );
}
