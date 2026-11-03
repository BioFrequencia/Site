"use client";

import { useEffect, useState } from "react";
import { Api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { tocarSom } from "@/lib/sons";

/** A API aceita um link novo por minuto (conta/reenviarConfirmacao.php). */
const ESPERA_SEGUNDOS = 60;

/**
 * "Reenviar o link" de confirmação do e-mail, no fim do cadastro e no
 * login de quem ainda não confirmou. Pede a senha na API para ninguém
 * encher a caixa de entrada de outra pessoa; o botão espera um minuto
 * entre um envio e outro, como a API.
 */
export function ReenviarLink({ email, senha, acabouDeEnviar = false }: { email: string; senha: string; acabouDeEnviar?: boolean }) {
  const [espera, setEspera] = useState(acabouDeEnviar ? ESPERA_SEGUNDOS : 0);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ texto: string; erro: boolean } | null>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const passo = setTimeout(() => setEspera((atual) => atual - 1), 1000);
    return () => clearTimeout(passo);
  }, [espera]);

  async function reenviar() {
    setEnviando(true);
    const resposta = await Api.reenviarConfirmacao(email, senha);
    setEnviando(false);
    setResultado({ texto: resposta.mensagem, erro: !resposta.sucesso });
    void tocarSom(resposta.sucesso ? "confirmacao" : "erro");
    if (resposta.sucesso || resposta.status === 429) setEspera(ESPERA_SEGUNDOS);
  }

  return (
    <div className="reenviar-link">
      <button type="button" className="btn" onClick={reenviar} disabled={enviando || espera > 0} aria-busy={enviando}>
        {!enviando && <Icon name="refresh" />}
        {espera > 0 ? `Reenviar o link (${espera} s)` : enviando ? "Enviando…" : "Reenviar o link"}
      </button>
      {resultado && (
        <p className={resultado.erro ? "field-error show" : "reenviar-ok"} role="status">
          {resultado.texto}
        </p>
      )}
    </div>
  );
}
