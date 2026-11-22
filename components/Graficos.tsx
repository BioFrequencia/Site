"use client";

// Gráfico do Painel (Recharts): entradas atrasadas e saídas antecipadas por
// mês, em barras lado a lado - são contagens de cada mês, não uma curva.
// As cores vêm dos tokens de app/globals.css (--grafico-*), que mudam no
// tema escuro; o par passou no validador de paleta nos dois temas
// (separação para daltonismo, faixa de luminosidade e contraste com o
// painel). "Ver os números" traz os mesmos dados numa tabela.

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Icon } from "./Icon";
import { formatarPercentual, nomeMesCurto, nomeMesLongo } from "@/lib/format";
import { tendenciaDoMes } from "@/lib/graficos";
import { useMenosMovimento } from "@/lib/movimento";
import type { EvolucaoMensal } from "@/lib/types";

const SERIES = [
  { chave: "atrasos", rotulo: "Entradas atrasadas", cor: "var(--grafico-atrasos)" },
  { chave: "saidas", rotulo: "Saídas antecipadas", cor: "var(--grafico-saidas)" },
] as const;

type ChaveSerie = (typeof SERIES)[number]["chave"];

/** Entrada curta do gráfico (meio segundo): acompanha a tela abrindo, sem chamar atenção. */
const DURACAO_GRAFICO_MS = 500;

/** Dica ao passar o mouse ou focar um mês: o mês por extenso e as duas séries. */
function DicaDoMes({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const mes = payload[0].payload as EvolucaoMensal & { rotulo: string };
  return (
    <div className="grafico-dica">
      <div className="grafico-dica-titulo">{nomeMesLongo(mes.mes)}</div>
      {SERIES.map((serie) => (
        <div className="grafico-dica-linha" key={serie.chave}>
          <span className="grafico-dica-indicador" style={{ background: serie.cor }} />
          <span className="grafico-dica-nome">{serie.rotulo}</span>
          <span className="grafico-dica-valor">{mes[serie.chave]}</span>
        </div>
      ))}
      <div className="grafico-dica-rodape">
        {mes.dias_letivos} {mes.dias_letivos === 1 ? "dia de aula" : "dias de aula"}
        {mes.pontualidade !== null && ` · ${formatarPercentual(mes.pontualidade)} de pontualidade`}
      </div>
    </div>
  );
}

/**
 * Entradas atrasadas e saídas antecipadas por mês (dias distintos por
 * aluno, só em dia letivo). Começa no mês do primeiro registro da escola:
 * antes disso o sistema não era usado, e "0" seria inventar dado.
 */
export function GraficoEntradasSaidas({ meses }: { meses: EvolucaoMensal[] }) {
  const menosMovimento = useMenosMovimento();
  // Passar o mouse (ou o foco) numa legenda destaca a série; clicar fixa.
  const [sobLegenda, setSobLegenda] = useState<ChaveSerie | null>(null);
  const [fixada, setFixada] = useState<ChaveSerie | null>(null);
  const destaque = sobLegenda ?? fixada;
  const dados = meses.map((mes) => ({ ...mes, rotulo: nomeMesCurto(mes.mes) }));
  const tendencia = tendenciaDoMes(meses);

  return (
    <section className="panel grafico-cartao">
      <div className="panel-head">
        <h2>Entradas e saídas por mês</h2>
        <p className="panel-desc">
          {meses.length > 1 ? `Últimos ${meses.length} meses` : "Mês atual"}: dias com registro, contando só os dias de aula.
        </p>
      </div>

      {dados.length === 0 ? (
        <div className="empty-state">
          <Icon name="chartBar" />
          <p>Ainda não há registros. O gráfico começa no mês da primeira entrada atrasada ou presença registrada.</p>
        </div>
      ) : (
        <>
          <div className="chart-legend">
            {SERIES.map((serie) => (
              <button
                type="button"
                key={serie.chave}
                className={`legenda-serie${destaque && destaque !== serie.chave ? " apagada" : ""}`}
                aria-pressed={fixada === serie.chave}
                title={fixada === serie.chave ? "Clique para mostrar as duas séries" : `Destacar ${serie.rotulo.toLowerCase()}`}
                onMouseEnter={() => setSobLegenda(serie.chave)}
                onMouseLeave={() => setSobLegenda(null)}
                onFocus={() => setSobLegenda(serie.chave)}
                onBlur={() => setSobLegenda(null)}
                onClick={() => setFixada((atual) => (atual === serie.chave ? null : serie.chave))}
              >
                <span className="legend-dot" style={{ background: serie.cor }} /> {serie.rotulo}
              </button>
            ))}
          </div>
          <div
            className="grafico-area"
            role="img"
            aria-label="Gráfico de barras com as entradas atrasadas e as saídas antecipadas de cada mês. Os números estão em Ver os números, logo abaixo."
            data-destaque={destaque ?? undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--grafico-grade)" />
                <XAxis
                  dataKey="rotulo"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(valor: string) => valor.slice(0, 3)}
                  tick={{ fill: "var(--cor-texto-suave)", fontSize: 13 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fill: "var(--cor-texto-suave)", fontSize: 13 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--grafico-trilha)" }}
                  content={(props) => <DicaDoMes {...(props as TooltipContentProps<number, string>)} />}
                />
                {SERIES.map((serie) => (
                  <Bar
                    key={serie.chave}
                    dataKey={serie.chave}
                    name={serie.rotulo}
                    className={`serie-${serie.chave}`}
                    fill={serie.cor}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={!menosMovimento}
                    animationDuration={DURACAO_GRAFICO_MS}
                    animationEasing="ease-out"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grafico-rodape">
            {tendencia && (
              <div className={`grafico-tendencia${tendencia.direcao === "subiu" ? " ruim" : tendencia.direcao === "caiu" ? " bom" : ""}`}>
                <Icon name={tendencia.direcao === "caiu" ? "trendDown" : "trend"} />
                {tendencia.texto}
              </div>
            )}
            <details className="grafico-tabela">
              <summary>Ver os números</summary>
              <table className="tabela tabela-cartoes">
                <thead>
                  <tr>
                    <th scope="col">Mês</th>
                    <th scope="col" className="num">Dias de aula</th>
                    <th scope="col" className="num">Entradas atrasadas</th>
                    <th scope="col" className="num">Saídas antecipadas</th>
                    <th scope="col" className="num">Pontualidade</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((mes) => (
                    <tr key={mes.mes}>
                      <td className="celula-titulo">{nomeMesLongo(mes.mes)}</td>
                      <td className="num" data-label="Dias de aula">{mes.dias_letivos}</td>
                      <td className="num" data-label="Entradas atrasadas">{mes.atrasos}</td>
                      <td className="num" data-label="Saídas antecipadas">{mes.saidas}</td>
                      <td className="num" data-label="Pontualidade">{formatarPercentual(mes.pontualidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
