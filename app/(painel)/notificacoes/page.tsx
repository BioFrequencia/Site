"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarDataHora, formatarTelefone } from "@/lib/format";
import type { Notificacao, StatusNotificacao } from "@/lib/types";

export default function NotificacoesPage() {
  const { mostrarToast } = useToast();
  const [status, setStatus] = useState<StatusNotificacao | "">("pendente");
  const [pagina, setPagina] = useState(1);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.listarNotificacoes(status || null, pagina);
    if (resposta.sucesso && resposta.dados) {
      setNotificacoes(resposta.dados.notificacoes);
      setTotalPaginas(resposta.dados.total_paginas);
      setTotalRegistros(resposta.dados.total_registros);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pagina]);

  async function marcarEnviada(notificacao: Notificacao) {
    setEnviando(notificacao.id_notificacao);
    const resposta = await Api.marcarNotificacaoEnviada(notificacao.id_notificacao);
    setEnviando(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Notificação marcada como enviada.");
    if (status === "pendente") {
      setNotificacoes((atual) => atual.filter((n) => n.id_notificacao !== notificacao.id_notificacao));
    } else {
      carregar();
    }
  }

  return (
    <>
      <Topbar titulo="Notificações" subtitulo={`${totalRegistros} notificação(ões) neste filtro.`} />

      <div className="pill-group" style={{ marginBottom: 22 }}>
        {[
          { valor: "pendente" as const, rotulo: "Pendentes" },
          { valor: "erro" as const, rotulo: "Com falha no envio" },
          { valor: "enviada" as const, rotulo: "Enviadas" },
          { valor: "" as const, rotulo: "Todas" },
        ].map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            className={`filter-pill${status === opcao.valor ? " active" : ""}`}
            onClick={() => {
              setStatus(opcao.valor);
              setPagina(1);
            }}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && <div className="loading-block">Carregando notificações…</div>}

      {!carregando && (
        <div className="panel">
          {notificacoes.length === 0 ? (
            <div className="empty-state">
              <Icon name="bell" />
              <p>Nenhuma notificação neste filtro.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Responsável</th>
                  <th>Mensagem</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notificacoes.map((notificacao) => (
                  <tr key={notificacao.id_notificacao}>
                    <td>
                      <Link href={`/turmas/${notificacao.id_aluno}`}>{notificacao.nome_aluno}</Link>
                    </td>
                    <td>
                      {notificacao.nome_responsavel}
                      <div className="panel-meta">
                        {formatarTelefone(notificacao.telefone_responsavel)}
                        {notificacao.email_responsavel ? ` · ${notificacao.email_responsavel}` : ""}
                      </div>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <MensagemNotificacao mensagem={notificacao.mensagem} />
                    </td>
                    <td>
                      <span className={`badge badge--${notificacao.status_notificacao === "enviada" ? "enviada" : "pendente"}`}>
                        {notificacao.status_notificacao === "erro" ? "falha no envio" : notificacao.status_notificacao}
                      </span>
                      {notificacao.data_envio_notificacao && (
                        <div className="panel-meta">{formatarDataHora(notificacao.data_envio_notificacao)}</div>
                      )}
                    </td>
                    <td>
                      {notificacao.status_notificacao !== "enviada" && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => marcarEnviada(notificacao)}
                          disabled={enviando === notificacao.id_notificacao}
                        >
                          {enviando === notificacao.id_notificacao ? "…" : "Marcar enviada"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button type="button" className="btn btn-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                Anterior
              </button>
              <span className="panel-meta" style={{ alignSelf: "center" }}>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Sem provedor de WhatsApp configurado, a API guarda a mensagem como um
 * link wa.me pronto (helpers/contatoResponsavel.php). Mostrar a URL crua
 * na tabela não ajudava ninguém: vira um botão que abre a conversa com o
 * texto já preenchido, e o texto aparece legível embaixo.
 */
function MensagemNotificacao({ mensagem }: { mensagem: string }) {
  if (!mensagem.startsWith("https://wa.me/")) return <>{mensagem}</>;
  let texto = "";
  try {
    texto = new URL(mensagem).searchParams.get("text") ?? "";
  } catch {
    return <>{mensagem}</>;
  }
  return (
    <>
      <a href={mensagem} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
        Abrir no WhatsApp
      </a>
      {texto && <div className="panel-meta" style={{ marginTop: 6 }}>{texto}</div>}
    </>
  );
}
