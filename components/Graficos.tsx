"use client";

// Gráficos do dashboard (Recharts), no estilo dos exemplos do shadcn/ui
// "Area Chart" e "Radial Chart - Shape", sem Tailwind: as cores vêm dos
// tokens de app/globals.css (--grafico-*), que mudam no tema escuro.
//
// O par de cores (entradas atrasadas / saídas antecipadas) passou no
// validador de paleta nos dois temas: separação para daltonismo, faixa
// de luminosidade e contraste com o fundo do cartão.

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type TooltipContentProps,
} from "recharts";
import { Icon } from "./Icon";
import { formatarDeltaPontos, formatarPercentual, nomeMesCurto, nomeMesLongo } from "@/lib/format";
import { tendenciaDoMes } from "@/lib/graficos";
import { useContagem, useMenosMovimento } from "@/lib/movimento";
import type { EvolucaoMensal } from "@/lib/types";

const SERIES = [
  { chave: "atrasos", rotulo: "Entradas atrasadas", cor: "var(--grafico-atrasos)" },
  { chave: "saidas", rotulo: "Saídas antecipadas", cor: "var(--grafico-saidas)" },
] as const;

type ChaveSerie = (typeof SERIES)[number]["chave"];

/** Duração da entrada do anel - o número do meio conta no mesmo ritmo. */
const DURACAO_ANEL_MS = 1100;

/** O mês mais recente de cada série ganha um ponto que pulsa: é o "agora" do gráfico. */
function pontoDoMesAtual(cor: string, total: number) {
  return function PontoDoMesAtual({ cx, cy, index }: DotItemDotProps) {
    if (index !== total - 1 || cx === undefined || cy === undefined) return null;
    return (
      <g className="ponto-atual">
        <circle className="ponto-atual-pulso" cx={cx} cy={cy} r={5} fill={cor} />
        <circle cx={cx} cy={cy} r={4} fill={cor} stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  };
}

/** Tooltip no estilo do shadcn (indicator="line"): mês por extenso e as duas séries. */
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
  const idGradiente = useId().replace(/:/g, "");
  // Passar o mouse (ou o foco) numa legenda destaca a série; clicar fixa.
  const [sobLegenda, setSobLegenda] = useState<ChaveSerie | null>(null);
  const [fixada, setFixada] = useState<ChaveSerie | null>(null);
  const destaque = sobLegenda ?? fixada;
  const dados = meses.map((mes) => ({ ...mes, rotulo: nomeMesCurto(mes.mes) }));
  const tendencia = tendenciaDoMes(meses);

  return (
    <div className="panel grafico-cartao">
      <div className="grafico-cabecalho">
        <h2>Entradas atrasadas e saídas antecipadas</h2>
        <p className="grafico-descricao">
          {meses.length > 1 ? `Últimos ${meses.length} meses` : "Mês atual"} · dias com registro, só em dia de aula
        </p>
      </div>

      {dados.length === 0 ? (
        <div className="empty-state">
          <Icon name="activity" />
          <p>Ainda não há registros. O gráfico começa no mês da primeira entrada atrasada ou presença registrada.</p>
        </div>
      ) : (
        <>
          <div
            className="grafico-area"
            role="img"
            aria-label="Gráfico de entradas atrasadas e saídas antecipadas por mês"
            data-destaque={destaque ?? undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dados} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                {/* Degradê do "Area Chart - Gradient" do shadcn: a cor da série no
                    alto, sumindo até a linha de base. */}
                <defs>
                  {SERIES.map((serie, indice) => (
                    <linearGradient key={serie.chave} id={`${idGradiente}-${serie.chave}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" style={{ stopColor: serie.cor, stopOpacity: indice === 0 ? 0.55 : 0.45 }} />
                      <stop offset="95%" style={{ stopColor: serie.cor, stopOpacity: 0.04 }} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="var(--grafico-grade)" />
                <XAxis
                  dataKey="rotulo"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(valor: string) => valor.slice(0, 3)}
                  tick={{ fill: "var(--ink-500)", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fill: "var(--ink-500)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--ink-300)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={(props) => <DicaDoMes {...(props as TooltipContentProps<number, string>)} />}
                />
                {SERIES.map((serie, indice) => (
                  <Area
                    key={serie.chave}
                    dataKey={serie.chave}
                    name={serie.rotulo}
                    // monotone e não natural: a curva natural "passa do
                    // ponto" e desenharia contagens negativas entre os meses.
                    type="monotone"
                    className={`serie-${serie.chave}`}
                    fill={`url(#${idGradiente}-${serie.chave})`}
                    stroke={serie.cor}
                    strokeWidth={2}
                    dot={pontoDoMesAtual(serie.cor, dados.length)}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)", className: "ponto-ativo" }}
                    isAnimationActive={!menosMovimento}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    animationBegin={indice * 180}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
          <div className="grafico-rodape">
            {tendencia && (
              <div className={`grafico-tendencia${tendencia.direcao === "subiu" ? " ruim" : tendencia.direcao === "caiu" ? " bom" : ""}`}>
                <Icon name="trend" />
                {tendencia.texto}
              </div>
            )}
            <details className="grafico-tabela">
              <summary>Ver os números</summary>
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Dias de aula</th>
                    <th>Entradas atrasadas</th>
                    <th>Saídas antecipadas</th>
                    <th>Pontualidade</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((mes) => (
                    <tr key={mes.mes}>
                      <td>{nomeMesLongo(mes.mes)}</td>
                      <td className="num">{mes.dias_letivos}</td>
                      <td className="num">{mes.atrasos}</td>
                      <td className="num">{mes.saidas}</td>
                      <td className="num">{formatarPercentual(mes.pontualidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Pontualidade do mês num anel ("Radial Chart - Shape" do shadcn): a
 * parte pintada é a % dos dias de aula sem entrada atrasada. Sem dia de
 * aula no mês, o anel fica vazio com "—", nunca 100%.
 */
export function GraficoPontualidade({
  valor,
  delta,
  mesAnterior,
  alunoDias,
  totalAlunos,
  diasLetivos,
}: {
  valor: number | null;
  delta: number | null;
  mesAnterior: string;
  alunoDias: number;
  totalAlunos: number;
  diasLetivos: number;
}) {
  const menosMovimento = useMenosMovimento();
  const percentual = valor ?? 0;
  // O número do meio conta junto com o anel.
  const contado = useContagem(percentual, DURACAO_ANEL_MS);
  // O anel começa no alto e anda no sentido horário até a porcentagem.
  const dados = [{ nome: "pontualidade", valor: percentual, fill: "var(--grafico-atrasos)" }];

  return (
    <div className="grafico-radial" aria-label={`Pontualidade do mês: ${formatarPercentual(valor)}`} role="img">
      <div className="grafico-radial-anel">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={dados}
            startAngle={90}
            endAngle={90 - (360 * percentual) / 100}
            innerRadius={70}
            outerRadius={100}
          >
            {/* Como no "Radial Chart - Shape": um anel fino e claro por dentro
                do anel da porcentagem (o círculo maior pintado e o menor com a
                cor do cartão por cima). */}
            <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[76, 64]} />
            <RadialBar
              dataKey="valor"
              background={{ fill: "var(--grafico-trilha)" }}
              cornerRadius={10}
              className="anel-pontualidade"
              isAnimationActive={!menosMovimento}
              animationDuration={DURACAO_ANEL_MS}
              animationEasing="ease-out"
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || viewBox.cx === undefined || viewBox.cy === undefined) return null;
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy - 4} className="grafico-radial-valor">
                        {valor === null ? "—" : formatarPercentual(contado)}
                      </tspan>
                      <tspan x={viewBox.cx} y={viewBox.cy + 20} className="grafico-radial-rotulo">
                        pontualidade
                      </tspan>
                    </text>
                  );
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="grafico-radial-legenda">
        <strong>Dias de aula sem entrada atrasada</strong>
        {valor === null ? (
          <span>Ainda não houve dia de aula neste mês.</span>
        ) : (
          <span>
            {alunoDias} {alunoDias === 1 ? "dia-aluno" : "dias-aluno"} ({totalAlunos} {totalAlunos === 1 ? "aluno" : "alunos"} ×{" "}
            {diasLetivos} {diasLetivos === 1 ? "dia de aula" : "dias de aula"})
          </span>
        )}
        {delta !== null && (
          <span className={`gauge-delta${delta < 0 ? " negativo" : ""}`}>
            <Icon name="trend" />
            {formatarDeltaPontos(delta)} vs. {mesAnterior}
          </span>
        )}
      </div>
    </div>
  );
}
