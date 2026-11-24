export const FONTE_TACO = "TACO, NEPA/Unicamp, 4ª edição (2011)";
export const LINK_TACO = "https://nepa.unicamp.br/publicacoes/";

export const CATALOGO_MICRO = {
  calcio: ["Cálcio", "mg"],
  magnesio: ["Magnésio", "mg"],
  manganes: ["Manganês", "mg"],
  fosforo: ["Fósforo", "mg"],
  ferro: ["Ferro", "mg"],
  sodio: ["Sódio", "mg"],
  potassio: ["Potássio", "mg"],
  cobre: ["Cobre", "mg"],
  zinco: ["Zinco", "mg"],
  retinol: ["Retinol", "µg"],
  vitamina_a: ["Vitamina A (RAE)", "µg"],
  vitamina_b1: ["Vitamina B1 (tiamina)", "mg"],
  vitamina_b2: ["Vitamina B2 (riboflavina)", "mg"],
  vitamina_b6: ["Vitamina B6 (piridoxina)", "mg"],
  niacina: ["Niacina", "mg"],
  vitamina_c: ["Vitamina C", "mg"],
} as const;

export type CodigoMicro = keyof typeof CATALOGO_MICRO;
export type ComposicaoMicro = Partial<Record<CodigoMicro, number | "Tr">>;
export const CODIGOS_MICRO = Object.keys(CATALOGO_MICRO) as CodigoMicro[];

const normalizar = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const aliases: Record<string, CodigoMicro> = {
  "vitamina a": "vitamina_a",
  "vitamina b1": "vitamina_b1", tiamina: "vitamina_b1",
  "vitamina b2": "vitamina_b2", riboflavina: "vitamina_b2",
  "vitamina b6": "vitamina_b6", piridoxina: "vitamina_b6",
  "vitamina b3": "niacina",
};

export function codigoMicronutriente(nome: string) {
  const chave = normalizar(nome);
  return CODIGOS_MICRO.find((codigo) => normalizar(CATALOGO_MICRO[codigo][0]) === chave)
    ?? (Object.hasOwn(aliases, chave) ? aliases[chave] : undefined);
}

export function lerComposicaoMicro(valor: unknown): ComposicaoMicro {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const entrada = valor as Record<string, unknown>;
  const saida: ComposicaoMicro = {};
  for (const codigo of CODIGOS_MICRO) {
    const dado = entrada[codigo];
    if (dado === "Tr" || (typeof dado === "number" && Number.isFinite(dado) && dado >= 0)) {
      saida[codigo] = dado;
    }
  }
  return saida;
}

export function composicaoMicroPorPorcao(base: ComposicaoMicro, gramas: number): ComposicaoMicro {
  const porcao: ComposicaoMicro = {};
  for (const codigo of CODIGOS_MICRO) {
    const dado = base[codigo];
    if (dado !== undefined) porcao[codigo] = dado === "Tr" ? dado : dado * gramas / 100;
  }
  return porcao;
}

export function somarMicronutriente(itens: readonly { composicaoMicro?: ComposicaoMicro }[], codigo: CodigoMicro) {
  let total = 0;
  let medidos = 0;
  let tracos = 0;
  for (const item of itens) {
    const dado = item.composicaoMicro?.[codigo];
    if (dado === "Tr") tracos++;
    if (typeof dado === "number") {
      total += dado;
      medidos++;
    }
  }
  return { total, medidos, tracos, semDados: itens.length - medidos - tracos };
}
