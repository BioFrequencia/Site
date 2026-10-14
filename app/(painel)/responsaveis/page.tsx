"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import type { AlunoFiltro, Responsavel } from "@/lib/types";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarCpf, formatarTelefone } from "@/lib/format";

/**
 * Visão geral dos responsáveis por aluno.
 *
 * O cadastro em si já existia, mas só dentro da ficha de cada aluno -
 * sem entrada no menu, ninguém encontrava, e a impressão era de que o
 * sistema não cadastrava responsáveis. Esta tela mostra quem tem e quem
 * não tem responsável vinculado, e leva direto para a ficha onde o
 * cadastro é feito. Nenhum endpoint novo foi criado para isso.
 */
export default function ResponsaveisPage() {
  const { mostrarToast } = useToast();
  const [linhas, setLinhas] = useState<{ aluno: AlunoFiltro; responsaveis: Responsavel[] }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [apenasSemResponsavel, setApenasSemResponsavel] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const lista = await Api.filtrarAlunos(null, null, null, 1, 200);
    if (!lista.sucesso || !lista.dados) {
      setCarregando(false);
      if (!lista.naoAutenticado) mostrarToast(lista.mensagem, true);
      return;
    }
    // Sequencial, pelo mesmo motivo dos contadores do painel: disparar
    // dezenas de chamadas juntas derrubava parte delas no plano gratuito
    // do banco.
    const resultado: { aluno: AlunoFiltro; responsaveis: Responsavel[] }[] = [];
    for (const aluno of lista.dados.alunos) {
      const resposta = await Api.listarResponsaveis(aluno.id_aluno);
      resultado.push({ aluno, responsaveis: resposta.dados ?? [] });
    }
    setLinhas(resultado);
    setCarregando(false);
  }, [mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = apenasSemResponsavel
    ? linhas.filter((l) => l.responsaveis.length === 0)
    : linhas;
  const semResponsavel = linhas.filter((l) => l.responsaveis.length === 0).length;

  return (
    <>
      <Topbar
        titulo="Responsáveis"
        subtitulo="Quem a escola aciona quando um aluno precisa de atenção."
      />

      <div className="panel">
        {!carregando && semResponsavel > 0 && (
          <div className="aviso-inline">
            <Icon name="alert" />
            <span>
              <b>{semResponsavel}</b>{" "}
              {semResponsavel === 1 ? "aluno não tem" : "alunos não têm"} responsável
              cadastrado. Sem isso o sistema não consegue avisar ninguém quando o alerta
              chega ao nível máximo.
            </span>
          </div>
        )}

        <div className="filtros-linha">
          <button
            type="button"
            className={`btn btn-sm${apenasSemResponsavel ? " btn-primary" : ""}`}
            onClick={() => setApenasSemResponsavel((v) => !v)}
          >
            {apenasSemResponsavel ? "Mostrando só os sem responsável" : "Só alunos sem responsável"}
          </button>
        </div>

        {carregando ? (
          <div className="estado-vazio">
            <div className="spinner" aria-label="Carregando" />
            <p>Carregando responsáveis…</p>
          </div>
        ) : visiveis.length === 0 ? (
          <div className="estado-vazio">
            <Icon name="shield" />
            <p>
              {apenasSemResponsavel
                ? "Todos os alunos têm responsável cadastrado."
                : "Nenhum aluno cadastrado ainda."}
            </p>
          </div>
        ) : (
          <div className="tabela-rolavel">
            <table className="table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Responsáveis</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visiveis.map(({ aluno, responsaveis }) => (
                  <tr key={aluno.id_aluno}>
                    <td>{aluno.nome_aluno}</td>
                    <td>{aluno.turma ?? "—"}</td>
                    <td>
                      {responsaveis.length === 0 ? (
                        <span className="badge badge--em-risco">Sem responsável</span>
                      ) : (
                        <ul className="lista-responsaveis">
                          {responsaveis.map((r) => (
                            <li key={r.id_responsavel}>
                              <b>{r.nome_responsavel}</b>
                              <span>
                                {formatarCpf(r.cpf_responsavel)} ·{" "}
                                {formatarTelefone(r.telefone_responsavel)}
                                {r.email_responsavel ? ` · ${r.email_responsavel}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/turmas/${aluno.id_aluno}`} className="btn btn-sm">
                        {responsaveis.length === 0 ? "Cadastrar" : "Gerenciar"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
