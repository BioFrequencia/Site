// A regra de senha forte - a mesma da API (helpers/validacao.php) e do
// software desktop: 8 a 128 caracteres, com letra maiúscula, letra
// minúscula, número e caractere especial (qualquer coisa que não seja
// letra, número ou espaço). A tela marca cada requisito enquanto a pessoa
// digita; a API confere de novo e recusa a senha fraca.
//
// Funções puras, testadas com node --test (lib/senha.test.ts).

export const SENHA_MINIMA = 8;
export const SENHA_MAXIMA = 128;

export interface RequisitoSenha {
  chave: "tamanho" | "maiuscula" | "minuscula" | "numero" | "especial";
  /** Como aparece na lista ("Uma letra maiúscula"). */
  texto: string;
  /** Como entra na frase do erro ("uma letra maiúscula"). */
  falta: string;
  ok: boolean;
}

export function requisitosSenha(senha: string): RequisitoSenha[] {
  // Em pontos de código, como o mb_strlen da API: "ç" conta 1.
  const tamanho = [...senha].length;
  return [
    {
      chave: "tamanho",
      texto: `Pelo menos ${SENHA_MINIMA} caracteres`,
      falta: `pelo menos ${SENHA_MINIMA} caracteres`,
      ok: tamanho >= SENHA_MINIMA && tamanho <= SENHA_MAXIMA,
    },
    { chave: "maiuscula", texto: "Uma letra maiúscula", falta: "uma letra maiúscula", ok: /\p{Lu}/u.test(senha) },
    { chave: "minuscula", texto: "Uma letra minúscula", falta: "uma letra minúscula", ok: /\p{Ll}/u.test(senha) },
    { chave: "numero", texto: "Um número", falta: "um número", ok: /\p{N}/u.test(senha) },
    {
      chave: "especial",
      texto: "Um caractere especial (ex.: ! @ # $ %)",
      falta: "um caractere especial (ex.: ! @ # $ %)",
      ok: /[^\p{L}\p{N}\s]/u.test(senha),
    },
  ];
}

export function senhaForte(senha: string): boolean {
  return requisitosSenha(senha).every((requisito) => requisito.ok);
}

/** "A senha precisa ter uma letra maiúscula e um número." - ou null, se a senha serve. */
export function mensagemSenhaFraca(senha: string): string | null {
  const faltas = requisitosSenha(senha)
    .filter((requisito) => !requisito.ok)
    .map((requisito) => requisito.falta);
  if (faltas.length === 0) return null;
  const ultima = faltas.pop();
  return `A senha precisa ter ${faltas.length ? `${faltas.join(", ")} e ${ultima}` : ultima}.`;
}
