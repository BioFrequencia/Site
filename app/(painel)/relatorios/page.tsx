"use client";

import { useState } from "react";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { baixarCsv, formatarData, formatarDataHora, formatarPercentual, hojeNaEscola, nomeMesLongo, rotuloOrigemAtraso, rotuloTipoAlerta } from "@/lib/format";

// Relatórios de entradas atrasadas e saídas antecipadas, em CSV (montado
// no navegador, baixarCsv em lib/format.ts) ou XML (montado no servidor).
// Os números são os mesmos das telas: só dias de aula entram nas contas.
export default function RelatoriosPage() {
  const { mostrarToast } = useToast();
  const [gerando, setGerando] = useState<string | null>(null);
  const [gerandoXml, setGerandoXml] = useState<string | null>(null);
  const [buscaIndividual, setBuscaIndividual] = useState("");

  async function comFeedback(id: string, tarefa: () => Promise<void>) {
    setGerando(id);
    try {
      await tarefa();
    } finally {
      setGerando(null);
    }
  }

  /**
   * XML vem pronto do servidor (relatorio/exportarXml.php). Montar XML
   * no navegador concatenando string é como se produz aquele arquivo
   * ".xml" que na verdade não abre em lugar nenhum: faltaria escapar &,
   * < e aspas vindos de nomes e observações.
   */
  async function baixarXml(relatorio: RelatorioXml) {
    setGerandoXml(relatorio);
    const resultado = await Api.baixarRelatorioXml(relatorio);
    setGerandoXml(null);
    mostrarToast(resultado.mensagem, !resultado.sucesso);
  }

  async function relatorioAlertas() {
    const resposta = await Api.alertas(null, null, null);
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    baixarCsv(
      `alertas_pendentes_${dataHoje()}.csv`,
      ["Aluno", "Turma", "Tipo", "Prioridade", "Ocorrências", "Dias de aula", "Taxa", "Motivo", "Último registro"],
      resposta.dados.alertas.map((a) => [
        a.nome_aluno,
        a.turma ?? "",
        rotuloTipoAlerta(a.tipo),
        a.prioridade,
        a.ocorrencias,
        a.dias_letivos,
        formatarPercentual(a.taxa),
        a.motivo,
        formatarData(a.dta_referencia),
      ])
    );
    mostrarToast("Relatório de alertas baixado.");
  }

  async function relatorioAcompanhamento() {
    const todos = [];
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const resposta = await Api.listarAcompanhamento(null, pagina);
      if (!resposta.sucesso || !resposta.dados) {
        mostrarToast(resposta.mensagem, true);
        return;
      }
      todos.push(...resposta.dados.registros);
      totalPaginas = resposta.dados.total_paginas;
      pagina++;
    } while (pagina <= totalPaginas);

    baixarCsv(
      `historico_acompanhamentos_${dataHoje()}.csv`,
      ["Data", "Aluno", "Turma", "Canal", "Observação", "Registrado por"],
      todos.map((r) => [formatarDataHora(r.data_registro), r.nome_aluno, r.nome_sala ?? "", r.canal, r.observacao ?? "", r.nome_coordenacao])
    );
    mostrarToast("Relatório de acompanhamentos baixado.");
  }

  async function relatorioEvolucao() {
    const resposta = await Api.dashboard();
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    baixarCsv(
      `entradas_e_saidas_por_mes_${dataHoje()}.csv`,
      ["Mês", "Dias de aula", "Entradas atrasadas", "Saídas antecipadas", "Pontualidade"],
      resposta.dados.evolucao_mensal.map((m) => [nomeMesLongo(m.mes), m.dias_letivos, m.atrasos, m.saidas, formatarPercentual(m.pontualidade)])
    );
    mostrarToast("Relatório de evolução baixado.");
  }

  async function relatorioTurmas() {
    const resposta = await Api.dashboard();
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    baixarCsv(
      `pontualidade_por_turma_${dataHoje()}.csv`,
      ["Turma", "Período", "Alunos", "Entradas atrasadas no mês", "Saídas antecipadas no mês", "Pontualidade"],
      resposta.dados.turmas.map((t) => [t.nome_sala, t.periodo_sala ?? "", t.total_alunos, t.atrasos, t.saidas, formatarPercentual(t.pontualidade)])
    );
    mostrarToast("Relatório de turmas baixado.");
  }

  async function relatorioIndividual() {
    const nome = buscaIndividual.trim();
    if (!nome) {
      mostrarToast("Digite o nome do aluno para gerar o relatório individual.", true);
      return;
    }
    const buscaAlunos = await Api.filtrarAlunos(nome, null, null, 1, 1);
    if (!buscaAlunos.sucesso || !buscaAlunos.dados) {
      mostrarToast(buscaAlunos.mensagem, true);
      return;
    }
    if (buscaAlunos.dados.alunos.length === 0) {
      mostrarToast("Nenhum aluno encontrado com esse nome.", true);
      return;
    }
    const aluno = buscaAlunos.dados.alunos[0];
    const hoje = dataHoje();
    const [ano, mes, dia] = hoje.split("-").map(Number);
    // Mesmo dia, três meses antes (no calendário da escola).
    const tresMesesAtras = new Date(Date.UTC(ano, mes - 1 - 3, dia)).toISOString().slice(0, 10);
    const historico = await Api.historicoAluno(aluno.id_aluno, tresMesesAtras, hoje);
    if (!historico.sucesso || !historico.dados) {
      mostrarToast(historico.mensagem, true);
      return;
    }

    // Ordena pelo horário original (texto ISO) e só depois formata.
    const linhas = [
      ...historico.dados.atrasos.map((a) => ({ ...a, tipo: "Entrada atrasada", registro: rotuloOrigemAtraso(a.origem) })),
      ...historico.dados.saidas.map((s) => ({ ...s, tipo: "Saída antecipada", registro: "Lançada pela coordenação" })),
    ]
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .map((r) => [
        formatarDataHora(r.data),
        r.tipo,
        r.motivo ?? "",
        r.justificado ? "Sim" : "Não",
        r.retirado_por ?? "",
        r.observacao ?? "",
        r.registro,
        r.registrado_por ?? "",
      ]);

    baixarCsv(
      `historico_${aluno.nome_aluno.replace(/\s+/g, "_")}_${dataHoje()}.csv`,
      ["Data e hora", "Tipo", "Motivo", "Justificado", "Quem buscou", "Observação", "Registro", "Registrado por"],
      linhas
    );
    mostrarToast("Relatório individual baixado.");
  }

  // xml: null quando aquele relatório existe só em CSV (montados a partir
  // dos agregados do dashboard, que não têm listagem no servidor);
  // executar: null quando existe só em XML.
  const relatorios: {
    id: string; titulo: string; desc: string; executar: (() => Promise<void>) | null;
    xml: RelatorioXml | null;
  }[] = [
    { id: "registros", titulo: "Entradas atrasadas e saídas antecipadas", desc: "Cada registro dos últimos 90 dias: aluno, horário, motivo, quem buscou e de onde veio.", executar: null, xml: "registros" },
    { id: "alunos", titulo: "Situação de cada aluno", desc: "Dias de aula, entradas atrasadas, saídas antecipadas e taxas de cada aluno na janela de alerta da escola.", executar: null, xml: "alunos" },
    { id: "alertas", titulo: "Alertas", desc: "Alunos acima ou perto do limite, com a taxa e o motivo.", executar: relatorioAlertas, xml: "alertas" },
    { id: "evolucao", titulo: "Entradas e saídas por mês", desc: "Os meses do gráfico do dashboard, com os dias de aula e a pontualidade.", executar: relatorioEvolucao, xml: null },
    { id: "turmas", titulo: "Pontualidade por turma", desc: "Entradas atrasadas, saídas antecipadas e pontualidade de cada turma no mês.", executar: relatorioTurmas, xml: null },
    { id: "acompanhamento", titulo: "Histórico de acompanhamentos", desc: "Todos os contatos registrados com responsáveis.", executar: relatorioAcompanhamento, xml: "acompanhamentos" },
  ];

  return (
    <>
      <Topbar titulo="Relatórios" subtitulo="Exporte dados da coordenação em CSV ou XML." />

      <div className="panel report-list">
        {relatorios.map((relatorio) => (
          <div className="report-item" key={relatorio.id}>
            <div className="report-icon">
              <Icon name="fileText" />
            </div>
            <div className="report-body">
              <div className="report-title">{relatorio.titulo}</div>
              <div className="report-desc">{relatorio.desc}</div>
            </div>
            <div className="report-acoes">
              {relatorio.executar && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => comFeedback(relatorio.id, relatorio.executar!)}
                  disabled={gerando === relatorio.id}
                >
                  {gerando === relatorio.id ? "Gerando…" : "CSV"}
                </button>
              )}
              {relatorio.xml && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => baixarXml(relatorio.xml!)}
                  disabled={gerandoXml === relatorio.xml}
                >
                  {gerandoXml === relatorio.xml ? "Gerando…" : "XML"}
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="report-item">
          <div className="report-icon">
            <Icon name="inbox" />
          </div>
          <div className="report-body">
            <div className="report-title">Ocorrências do celular do aluno (fluxo anterior)</div>
            <div className="report-desc">
              Histórico dos envios feitos pelo app antigo do aluno, com motivo, observação e a decisão da coordenação.
            </div>
          </div>
          <div className="report-acoes">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => baixarXml("ocorrencias")}
              disabled={gerandoXml === "ocorrencias"}
            >
              {gerandoXml === "ocorrencias" ? "Gerando…" : "XML"}
            </button>
          </div>
        </div>

        <div className="report-item">
          <div className="report-icon">
            <Icon name="fileText" />
          </div>
          <div className="report-body">
            <div className="report-title">Histórico individual por aluno</div>
            <div className="report-desc">Entradas atrasadas e saídas antecipadas dos últimos 3 meses de um aluno.</div>
            <input
              style={{
                marginTop: 10,
                border: "1px solid var(--mist-200)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: 13,
                width: "100%",
                maxWidth: 260,
              }}
              placeholder="Nome do aluno"
              value={buscaIndividual}
              onChange={(e) => setBuscaIndividual(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => comFeedback("individual", relatorioIndividual)}
            disabled={gerando === "individual"}
          >
            {gerando === "individual" ? "Gerando…" : "Baixar CSV"}
          </button>
        </div>
      </div>
    </>
  );
}

type RelatorioXml = "alertas" | "alunos" | "registros" | "acompanhamentos" | "ocorrencias";

// Data da escola, não a data em UTC: depois das 21h o toISOString() já
// dava o dia seguinte (nome do arquivo e período do relatório errados).
function dataHoje(): string {
  return hojeNaEscola();
}
