"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/Icon";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Campo de senha com o "olhinho" para ver o que foi digitado. Esconde de
 * novo quando o formulário é enviado: o gerenciador de senhas do
 * navegador só oferece salvar quando o campo volta a ser de senha.
 */
export function CampoSenha(props: Props) {
  const [visivel, setVisivel] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const formulario = campo.current?.form;
    if (!formulario) return;
    const esconder = () => setVisivel(false);
    formulario.addEventListener("submit", esconder);
    return () => formulario.removeEventListener("submit", esconder);
  }, []);

  const rotulo = visivel ? "Esconder a senha" : "Mostrar a senha";
  return (
    <div className="campo-senha">
      <input
        {...props}
        ref={campo}
        type={visivel ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="campo-senha-olho"
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={rotulo}
        aria-pressed={visivel}
        aria-controls={props.id}
        title={rotulo}
      >
        {/* A chave remonta o ícone: a troca anima a cada clique. */}
        <Icon key={visivel ? "aberto" : "fechado"} name={visivel ? "eyeOff" : "eye"} />
      </button>
    </div>
  );
}
