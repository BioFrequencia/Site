"use client";

import { requisitosSenha } from "@/lib/senha";
import { Icon } from "@/components/Icon";

/**
 * Os requisitos da senha nova, marcando cada um enquanto a pessoa digita
 * (cadastro, Minha conta > Senha e "Esqueci minha senha"). O campo aponta
 * para esta lista com aria-describedby, e o leitor de tela ouve o que falta.
 */
export function RequisitosSenha({ senha, id }: { senha: string; id: string }) {
  const requisitos = requisitosSenha(senha);
  const faltam = requisitos.filter((requisito) => !requisito.ok).length;
  return (
    <div className="requisitos-senha" id={id}>
      <ul aria-label="A senha precisa ter">
        {requisitos.map((requisito) => (
          <li key={requisito.chave} data-requisito={requisito.chave} className={requisito.ok ? "ok" : undefined}>
            <span className="requisito-marca" aria-hidden="true">
              {requisito.ok && <Icon name="check" />}
            </span>
            {requisito.texto}
            <span className="sr-only">{requisito.ok ? " - cumprido" : " - falta"}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {senha && (faltam === 0 ? "A senha cumpre todos os requisitos." : faltam === 1 ? "Falta 1 requisito." : `Faltam ${faltam} requisitos.`)}
      </p>
    </div>
  );
}
