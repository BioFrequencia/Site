"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { Paginacao } from "./Paginacao";
import { Esqueleto } from "./Esqueleto";
import { useToast } from "./Toast";
import { formatarData, plural } from "@/lib/format";
import { doValor, resumoDoEncerramento, type ValorDestino } from "@/lib/anoLetivo";
import {
  ROTULOS_SITUACAO_ALUNO,
  type DadosAnoLetivo,
  type ListaExAlunos,
} from "@/lib/types";

/**
 * Escola > Ano letivo (só a gestão). No fim do ano, para cada turma: os
 * alunos passam para outra turma, concluíram (saem da escola) ou ficam.
 * Dá para abrir a turma e mudar um aluno só (quem repete, quem foi
 * transferido). Quem sai some das listas e do app, com o histórico
 * guardado, e a biometria dele é apagada. Embaixo, quem já saiu.
 */
export function AbaAnoLetivo() {
  const { mostrarToast } = useToast();
  const [dados, setDados] = useState<DadosAnoLetivo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [destinos, setDestinos] = useState<Record<number, ValorDestino>>({});
  const [excecoes, setExcecoes] = useState<Record<number, ValorDestino>>({});
  const [aberta, setAberta] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [versaoExAlunos, setVersaoExAlunos] = useState(0);

  const carregar = useCallback(async () => {
    const resposta = await Api.anoLetivo();
    if (resposta.sucesso && resposta.dados) {
      setDados(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const turmas = useMemo(() => dados?.turmas ?? [], [dados]);
  const resumo = useMemo(() => resumoDoEncerramento(turmas, destinos, excecoes), [turmas, destinos, excecoes]);
  const algoMuda = resumo.movidos + resumo.saem > 0;

  async function encerrar() {
    setEnviando(true);
    const pedidoTurmas = turmas
      .filter((turma) => destinos[turma.id_sala] && destinos[turma.id_sala] !== "manter")
      .map((turma) => ({ id_sala: turma.id_sala, destino: doValor(destinos[turma.id_sala]) }));
    const pedidoExcecoes = Object.entries(excecoes)
      .filter(([, valor]) => valor)
      .map(([idAluno, valor]) => ({ id_aluno: Number(idAluno), destino: doValor(valor) }));
    const resposta = await Api.encerrarAnoLetivo(pedidoTurmas, pedidoExcecoes);
    setEnviando(false);
    setConfirmando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(resposta.mensagem || "Ano letivo encerrado.");
    setDestinos({});
    setExcecoes({});
    setAberta(null);
    setVersaoExAlunos((v) => v + 1);
    carregar();
  }

  if (erro) return <div className="error-block">{erro}</div>;
  if (!dados) return <Esqueleto variante="cartoes" texto="Carregando as turmas…" />;

  const opcoesDeTurma = (atual: number) =>
    turmas
      .filter((turma) => turma.id_sala !== atual)
      .map((turma) => (
        <option key={turma.id_sala} value={`turma-${turma.id_sala}`}>
          Passam para {turma.nome_sala}
        </option>
      ));

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h2>Encerrar o ano letivo</h2>
          <span className="panel-meta">Só a gestão</span>
        </div>
        <p className="results-caption">
          Escolha o que acontece com os alunos de cada turma. Quem sai (concluiu ou foi transferido) some das listas, do app e
          dos alertas, mas o histórico fica guardado e a ficha continua aberta. A biometria de quem sai é apagada. Abra a turma
          para mudar um aluno só (quem repete, quem foi transferido).
        </p>
        {turmas.length === 0 ? (
          <p className="results-caption">A escola ainda não tem turmas.</p>
        ) : (
          <ul className="lista-ano-letivo">
            {turmas.map((turma) => {
              const valor = destinos[turma.id_sala] ?? "manter";
              const idSelect = `destino-turma-${turma.id_sala}`;
              return (
                <li key={turma.id_sala}>
                  <div className="ano-letivo-turma">
                    <button
                      type="button"
                      className="btn btn-text btn-sm btn-recolher"
                      aria-expanded={aberta === turma.id_sala}
                      onClick={() => setAberta(aberta === turma.id_sala ? null : turma.id_sala)}
                      disabled={turma.alunos.length === 0}
                    >
                      <Icon name="chevronDown" />
                      <b>{turma.nome_sala}</b>
                      <span className="panel-meta">{plural(turma.alunos.length, "aluno", "alunos")}</span>
                    </button>
                    <label htmlFor={idSelect} className="sr-only">
                      O que acontece com a turma {turma.nome_sala}
                    </label>
                    <select
                      id={idSelect}
                      className="filter-select"
                      value={valor}
                      disabled={turma.alunos.length === 0}
                      onChange={(e) => setDestinos({ ...destinos, [turma.id_sala]: e.target.value })}
                    >
                      <option value="manter">Ficam na turma</option>
                      {opcoesDeTurma(turma.id_sala)}
                      <option value="concluiu">Concluíram (saem da escola)</option>
                    </select>
                  </div>
                  {aberta === turma.id_sala && (
                    <ul className="ano-letivo-alunos">
                      {turma.alunos.map((aluno) => {
                        const idAluno = `destino-aluno-${aluno.id_aluno}`;
                        return (
                          <li key={aluno.id_aluno}>
                            <label htmlFor={idAluno}>{aluno.nome_aluno}</label>
                            <select
                              id={idAluno}
                              className="filter-select"
                              value={excecoes[aluno.id_aluno] ?? ""}
                              onChange={(e) => setExcecoes({ ...excecoes, [aluno.id_aluno]: e.target.value })}
                            >
                              <option value="">Segue a turma</option>
                              <option value="manter">Fica na turma (repete)</option>
                              {opcoesDeTurma(turma.id_sala)}
                              <option value="concluiu">Concluiu (sai da escola)</option>
                              <option value="transferido">Transferido(a) (sai da escola)</option>
                            </select>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="modal-actions">
          <span className="panel-meta" aria-live="polite">
            {algoMuda
              ? `${plural(resumo.movidos, "aluno muda", "alunos mudam")} de turma · ${plural(resumo.saem, "sai", "saem")} da escola`
              : "Nada muda ainda."}
          </span>
          <button type="button" className="btn btn-primary" disabled={!algoMuda} onClick={() => setConfirmando(true)}>
            <Icon name="check" />
            Encerrar o ano letivo
          </button>
        </div>
      </div>

      <ExAlunos versao={versaoExAlunos} />

      <Modal titulo="Encerrar o ano letivo?" aberto={confirmando} onFechar={() => setConfirmando(false)}>
        <p>
          {plural(resumo.movidos, "aluno muda", "alunos mudam")} de turma e {plural(resumo.saem, "aluno sai", "alunos saem")} da
          escola. A biometria de quem sai é apagada; o histórico de todos continua guardado.
        </p>
        <p className="results-caption">Se alguém sair por engano, dá para trazer de volta na ficha do aluno.</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => setConfirmando(false)}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary" onClick={encerrar} disabled={enviando} aria-busy={enviando}>
            {enviando ? "Encerrando…" : "Encerrar"}
          </button>
        </div>
      </Modal>
    </>
  );
}

/** Quem já saiu da escola, com busca e páginas; cada nome abre a ficha. */
function ExAlunos({ versao }: { versao: number }) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<ListaExAlunos | null>(null);

  useEffect(() => {
    let valida = true;
    const espera = setTimeout(async () => {
      const resposta = await Api.exAlunos(pagina, busca.trim());
      if (valida && resposta.sucesso && resposta.dados) setLista(resposta.dados);
    }, 250);
    return () => {
      valida = false;
      clearTimeout(espera);
    };
  }, [pagina, busca, versao]);

  return (
    <div className="panel panel-tabela">
      <div className="panel-head">
        <h2>Quem saiu da escola ({lista?.total_registros ?? 0})</h2>
        <input
          type="search"
          className="filter-select"
          placeholder="Buscar pelo nome"
          aria-label="Buscar quem saiu pelo nome"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
        />
      </div>
      {!lista || lista.alunos.length === 0 ? (
        <p className="results-caption" style={{ padding: "0 20px 20px" }}>
          {busca ? "Ninguém com esse nome saiu da escola." : "Ninguém saiu da escola ainda."}
        </p>
      ) : (
        <>
          <table className="data-table tabela-cartoes">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Última turma</th>
                <th>Situação</th>
                <th>Saiu em</th>
              </tr>
            </thead>
            <tbody>
              {lista.alunos.map((aluno) => (
                <tr key={aluno.id_aluno}>
                  <td className="celula-titulo">
                    <Link href={`/turmas/${aluno.id_aluno}`} className="link-forte">
                      {aluno.nome_aluno}
                    </Link>
                  </td>
                  <td data-label="Última turma">{aluno.turma ?? "-"}</td>
                  <td data-label="Situação">{ROTULOS_SITUACAO_ALUNO[aluno.situacao]}</td>
                  <td data-label="Saiu em">{aluno.saiu_em ? formatarData(aluno.saiu_em) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginacao pagina={lista.pagina_atual} totalPaginas={lista.total_paginas} onMudar={setPagina} />
        </>
      )}
    </div>
  );
}
