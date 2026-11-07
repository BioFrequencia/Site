"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ModalEditarResponsavel, ModalResponsavel } from "@/components/ModalResponsavel";
import { formatarCpf, formatarTelefone } from "@/lib/format";
import { ROTULOS_CANAL_RESPONSAVEL, type AlunoFiltro, type ResponsaveisDaEscola, type ResponsavelDaEscola } from "@/lib/types";

/**
 * Responsáveis da escola: quem recebe os avisos quando um aluno passa do
 * limite de entradas atrasadas ou saídas antecipadas.
 *
 * Uma chamada só (responsavel/listarDaEscola.php) - antes a tela buscava
 * a lista de alunos e depois os responsáveis de cada aluno, um por um.
 */
export default function ResponsaveisPage() {
  const { mostrarToast } = useToast();
  const [dados, setDados] = useState<ResponsaveisDaEscola | null>(null);
  const [alunos, setAlunos] = useState<AlunoFiltro[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<"responsaveis" | "sem">("responsaveis");
  const [adicionarPara, setAdicionarPara] = useState<{ id_aluno: number; nome_aluno: string; turma?: string | null } | null>(null);
  const [adicionarEscolhendo, setAdicionarEscolhendo] = useState(false);
  const [editando, setEditando] = useState<ResponsavelDaEscola | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resposta = await Api.listarResponsaveisDaEscola(busca.trim() || null);
    if (resposta.sucesso && resposta.dados) {
      setDados(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }, [busca]);

  useEffect(() => {
    const espera = setTimeout(carregar, 250);
    return () => clearTimeout(espera);
  }, [carregar]);

  useEffect(() => {
    Api.filtrarAlunos(null, null, null, 1, 500).then((resposta) => {
      if (resposta.sucesso && resposta.dados) setAlunos(resposta.dados.alunos);
    });
  }, []);

  const semResponsavel = dados?.sem_responsavel ?? [];
  // Com um aluno só, o parentesco com ele também é editável. Memorizado: um
  // objeto novo a cada render reiniciaria o formulário enquanto se digita.
  const responsavelEditado = useMemo(
    () => (editando ? { ...editando, parentesco: editando.alunos.length === 1 ? editando.alunos[0].parentesco : null } : null),
    [editando]
  );

  return (
    <>
      <Topbar
        titulo="Responsáveis"
        subtitulo="Quem a escola avisa quando um aluno passa do limite de entradas atrasadas ou saídas antecipadas."
        acoes={
          <button type="button" className="btn btn-primary" onClick={() => setAdicionarEscolhendo(true)}>
            <Icon name="plus" /> Adicionar responsável
          </button>
        }
      />

      {semResponsavel.length > 0 && (
        <div className="aviso-dia">
          <Icon name="alert" />
          <span>
            <b>{semResponsavel.length}</b> {semResponsavel.length === 1 ? "aluno não tem" : "alunos não têm"} responsável
            cadastrado: a escola não consegue avisar a família quando {semResponsavel.length === 1 ? "ele passar" : "eles passarem"} do
            limite.{" "}
            <button type="button" className="btn-text" onClick={() => setAba("sem")}>
              Ver quem
            </button>
          </span>
        </div>
      )}

      <div className="panel">
        <div className="filter-bar" style={{ marginBottom: 18 }}>
          <div className="abas-mini" role="tablist">
            <button type="button" role="tab" aria-selected={aba === "responsaveis"} className={aba === "responsaveis" ? "ativa" : ""} onClick={() => setAba("responsaveis")}>
              Responsáveis ({dados?.responsaveis.length ?? 0})
            </button>
            <button type="button" role="tab" aria-selected={aba === "sem"} className={aba === "sem" ? "ativa" : ""} onClick={() => setAba("sem")}>
              Alunos sem responsável ({semResponsavel.length})
            </button>
          </div>
          {aba === "responsaveis" && (
            <div className="search-box busca-estreita">
              <Icon name="search" />
              <input placeholder="Nome, CPF, telefone ou aluno" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          )}
        </div>

        {erro && <div className="error-block">{erro}</div>}
        {carregando && !dados && <Esqueleto variante="lista" texto="Carregando responsáveis…" />}

        {dados && aba === "responsaveis" && (
          dados.responsaveis.length === 0 ? (
            <div className="empty-state">
              <Icon name="shield" />
              <p>{busca ? "Nenhum responsável encontrado com essa busca." : "Nenhum responsável cadastrado ainda."}</p>
            </div>
          ) : (
            <div className="tabela-rolavel">
              <table className="data-table tabela-cartoes">
                <thead>
                  <tr>
                    <th>Responsável</th>
                    <th>Contato</th>
                    <th>Avisos por</th>
                    <th>Alunos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dados.responsaveis.map((r) => (
                    <tr key={r.id_responsavel}>
                      <td className="celula-titulo">
                        <b>{r.nome_responsavel}</b>
                        <div className="panel-meta">CPF {formatarCpf(r.cpf_responsavel)}</div>
                      </td>
                      <td data-label="Contato">
                        {formatarTelefone(r.telefone_responsavel)}
                        {r.email_responsavel && <div className="panel-meta">{r.email_responsavel}</div>}
                      </td>
                      <td data-label="Avisos por">{ROTULOS_CANAL_RESPONSAVEL[r.canal_preferido ?? "whatsapp"]}</td>
                      <td data-label="Alunos">
                        <ul className="lista-responsaveis">
                          {r.alunos.map((a) => (
                            <li key={a.id_aluno}>
                              <Link href={`/turmas/${a.id_aluno}`} className="link-forte">
                                {a.nome_aluno}
                              </Link>
                              <span>
                                {a.nome_sala}
                                {a.parentesco && ` · ${a.parentesco}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="celula-acoes" style={{ textAlign: "right" }}>
                        <button type="button" className="btn btn-sm" onClick={() => setEditando(r)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {dados && aba === "sem" && (
          semResponsavel.length === 0 ? (
            <div className="empty-state">
              <Icon name="check" />
              <p>Todos os alunos têm responsável cadastrado.</p>
            </div>
          ) : (
            <table className="data-table tabela-cartoes">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {semResponsavel.map((a) => (
                  <tr key={a.id_aluno}>
                    <td className="celula-titulo">
                      <Link href={`/turmas/${a.id_aluno}`} className="link-forte">
                        {a.nome_aluno}
                      </Link>
                    </td>
                    <td data-label="Turma">{a.nome_sala}</td>
                    <td className="celula-acoes" style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setAdicionarPara({ id_aluno: a.id_aluno, nome_aluno: a.nome_aluno, turma: a.nome_sala })}
                      >
                        <Icon name="plus" /> Responsável
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      <ModalResponsavel
        aberto={!!adicionarPara || adicionarEscolhendo}
        aluno={adicionarPara ?? undefined}
        alunos={adicionarPara ? undefined : alunos.map((a) => ({ id_aluno: a.id_aluno, nome_aluno: a.nome_aluno, turma: a.turma }))}
        onFechar={() => {
          setAdicionarPara(null);
          setAdicionarEscolhendo(false);
        }}
        onSalvo={(mensagem) => {
          setAdicionarPara(null);
          setAdicionarEscolhendo(false);
          mostrarToast(mensagem);
          carregar();
        }}
      />

      <ModalEditarResponsavel
        responsavel={responsavelEditado}
        idAluno={editando?.alunos.length === 1 ? editando.alunos[0].id_aluno : undefined}
        nomeAluno={editando?.alunos.length === 1 ? editando.alunos[0].nome_aluno : undefined}
        onFechar={() => setEditando(null)}
        onSalvo={(mensagem) => {
          setEditando(null);
          mostrarToast(mensagem);
          carregar();
        }}
      />
    </>
  );
}
