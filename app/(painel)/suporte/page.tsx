"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarDataHora } from "@/lib/format";
import { tocarSom } from "@/lib/sons";
import {
  ROTULOS_CATEGORIA_CHAMADO,
  ROTULOS_STATUS_CHAMADO,
  type CategoriaChamado,
  type ChamadoSuporte,
  type StatusChamado,
} from "@/lib/types";

const PERGUNTAS: { pergunta: string; resposta: ReactNode }[] = [
  {
    pergunta: 'O app diz "Nenhum rosto encontrado". O que fazer?',
    resposta: (
      <>
        Deixe o rosto de frente, dentro do contorno e com luz vindo da frente (janela atrás do aluno atrapalha), com um
        aluno por vez a cerca de um braço do tablet. Confira se o app está na versão mais nova em{" "}
        <Link href="/downloads">Baixar app e desktop</Link>. Se continuar, abra um chamado com a linha{" "}
        <b>Detalhe técnico</b> que aparece junto da mensagem.
      </>
    ),
  },
  {
    pergunta: "Como instalo ou atualizo o app no tablet?",
    resposta: (
      <>
        Em <Link href="/downloads">Baixar app e desktop</Link>, baixe o APK no tablet e abra o arquivo. Na primeira vez, o
        Android pede para permitir a instalação de apps de fora da Play Store. A versão nova instala por cima da antiga.
      </>
    ),
  },
  {
    pergunta: "Um aluno não é reconhecido, mas os outros são.",
    resposta: (
      <>
        Refaça a biometria facial dele no app (Cadastrar biometria), com as fotos de frente e boa luz. Sem o consentimento
        do responsável registrado, o app não deixa cadastrar.
      </>
    ),
  },
  {
    pergunta: "Como registro a presença de quem não foi reconhecido?",
    resposta: (
      <>
        Em <Link href="/presencas">Presenças</Link>, use o botão ao lado do nome do aluno - ou, no app, a tela Registros do
        dia.
      </>
    ),
  },
  {
    pergunta: 'Por que o sistema não deixa lançar a mesma falta duas vezes?',
    resposta: (
      <>
        Cada aluno tem no máximo uma falta e um atraso por dia, para a frequência e os alertas não contarem em dobro. Se a
        falta do dia está errada, abra um chamado informando o aluno e a data.
      </>
    ),
  },
  {
    pergunta: 'O que é "Lembrar de mim"?',
    resposta: (
      <>
        Marcado no login, deixa a conta conectada por 30 dias naquele aparelho, em vez de 2 horas. Use só em computador
        pessoal. Os aparelhos conectados aparecem em{" "}
        <Link href="/conta?aba=dispositivos">Minha conta &gt; Dispositivos conectados</Link>, onde dá para desconectar.
      </>
    ),
  },
  {
    pergunta: "Apareceu um aparelho que eu não reconheço.",
    resposta: (
      <>
        Desconecte-o em <Link href="/conta?aba=dispositivos">Dispositivos conectados</Link> e troque a senha em{" "}
        <Link href="/conta?aba=senha">Minha conta &gt; Senha</Link> - a troca desconecta todos os outros aparelhos.
      </>
    ),
  },
  {
    pergunta: "Como desligo os sons ou mudo o tema?",
    resposta: (
      <>
        Em <Link href="/conta?aba=preferencias">Minha conta &gt; Preferências</Link>. As escolhas ficam salvas na conta e
        valem em qualquer computador.
      </>
    ),
  },
  {
    pergunta: "Os dados dos alunos estão protegidos?",
    resposta: (
      <>
        A foto do rosto não sai do tablet: só um código numérico do rosto vai para o servidor, guardado cifrado. A
        biometria só é cadastrada com o consentimento do responsável, que pode ser revogado - aí ela é apagada.
      </>
    ),
  },
];

const CLASSE_STATUS: Record<StatusChamado, string> = {
  aberto: "badge--pendente",
  em_andamento: "badge--baixa",
  respondido: "badge--enviada",
  fechado: "badge--neutral",
};

/**
 * Suporte: perguntas frequentes e chamados para a equipe do sistema. O
 * chamado fica gravado (suporte/abrirChamado.php) e a resposta da equipe
 * aparece em Meus chamados.
 */
export default function SuportePage() {
  const { mostrarToast } = useToast();
  const [chamados, setChamados] = useState<ChamadoSuporte[] | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaChamado>("duvida");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    const resposta = await Api.listarChamados();
    if (resposta.sucesso && resposta.dados) {
      setChamados(resposta.dados);
      setErroLista(null);
    } else {
      setErroLista(resposta.mensagem);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function recusar(texto: string) {
    setErro(texto);
    void tocarSom("erro");
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (assunto.trim().length < 3) return recusar("Escreva o assunto (pelo menos 3 letras).");
    if (mensagem.trim().length < 10) return recusar("Conte um pouco mais na mensagem (pelo menos 10 caracteres).");

    setEnviando(true);
    const resposta = await Api.abrirChamado(categoria, assunto.trim(), mensagem.trim());
    setEnviando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    setCategoria("duvida");
    setAssunto("");
    setMensagem("");
    mostrarToast(resposta.mensagem || "Chamado aberto.");
    carregar();
  }

  return (
    <>
      <Topbar titulo="Suporte" subtitulo="Perguntas frequentes e chamados para a equipe do BioFrequência." />

      <div className="grid-suporte">
        <div className="panel">
          <div className="panel-head">
            <h2>Perguntas frequentes</h2>
          </div>
          <div className="faq">
            {PERGUNTAS.map((item) => (
              <details key={item.pergunta} className="faq-item">
                <summary>{item.pergunta}</summary>
                <div className="faq-resposta">{item.resposta}</div>
              </details>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Abrir chamado</h2>
          </div>
          <p className="panel-meta">
            Não achou a resposta? Conte o que aconteceu: a equipe responde aqui mesmo, em Meus chamados.
          </p>
          <form onSubmit={enviar} className="form-chamado">
            <div className="modal-field">
              <label htmlFor="chamadoCategoria">Sobre o quê?</label>
              <select
                id="chamadoCategoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaChamado)}
              >
                {(Object.keys(ROTULOS_CATEGORIA_CHAMADO) as CategoriaChamado[]).map((valor) => (
                  <option key={valor} value={valor}>
                    {ROTULOS_CATEGORIA_CHAMADO[valor]}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label htmlFor="chamadoAssunto">Assunto</label>
              <input
                id="chamadoAssunto"
                value={assunto}
                maxLength={120}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex.: o tablet não reconhece nenhum aluno"
              />
            </div>
            <div className="modal-field">
              <label htmlFor="chamadoMensagem">Mensagem</label>
              <textarea
                id="chamadoMensagem"
                value={mensagem}
                maxLength={4000}
                rows={6}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder='O que você estava fazendo, o que apareceu na tela e, se for no app, a linha "Detalhe técnico" da mensagem.'
              />
              <p className="dica-campo">{mensagem.length}/4000</p>
            </div>
            {erro && <p className="field-error show">{erro}</p>}
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              <Icon name="send" />
              {enviando ? "Enviando…" : "Enviar chamado"}
            </button>
          </form>
        </div>
      </div>

      <div className="panel painel-chamados">
        <div className="panel-head">
          <h2>Meus chamados</h2>
        </div>
        {erroLista && <div className="error-block">{erroLista}</div>}
        {!chamados && !erroLista && <div className="loading-block">Carregando os chamados…</div>}
        {chamados && chamados.length === 0 && (
          <div className="empty-state">
            <Icon name="lifeBuoy" />
            <p>Nenhum chamado aberto ainda.</p>
          </div>
        )}
        {chamados && chamados.length > 0 && (
          <ul className="lista-chamados">
            {chamados.map((chamado) => (
              <li key={chamado.id_chamado} className="chamado">
                <div className="chamado-topo">
                  <div>
                    <strong>{chamado.assunto}</strong>
                    <div className="chamado-meta">
                      #{chamado.id_chamado} · {ROTULOS_CATEGORIA_CHAMADO[chamado.categoria]} · aberto em{" "}
                      {formatarDataHora(chamado.criado_em)}
                    </div>
                  </div>
                  <span className={`badge ${CLASSE_STATUS[chamado.status]}`}>{ROTULOS_STATUS_CHAMADO[chamado.status]}</span>
                </div>
                <p className="chamado-mensagem">{chamado.mensagem}</p>
                {chamado.resposta && (
                  <div className="chamado-resposta">
                    <span>
                      Resposta da equipe{chamado.respondido_em ? ` · ${formatarDataHora(chamado.respondido_em)}` : ""}
                    </span>
                    <p>{chamado.resposta}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
