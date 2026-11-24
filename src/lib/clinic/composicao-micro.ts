export const FONTE_TACO = "TACO, NEPA/Unicamp, 4ª edição (2011)";
export const FONTE_IBGE = "IBGE, POF 2008–2009";
export const LINK_IBGE = "https://ftp.ibge.gov.br/Orcamentos_Familiares/Pesquisa_de_Orcamentos_Familiares_2008_2009/Tabelas_de_Composicao_Nutricional_dos_Alimentos_Consumidos_no_Brasil/";
export type FonteAlimento = "ibge" | "taco";

export const LINK_TACO = "https://nepa.unicamp.br/publicacoes/";

export const CATALOGO_MICRO = {
  calcio: ["Cálcio", "mg"],
  magnesio: ["Magnésio", "mg"],
  manganes: ["Manganês", "mg"],
  fosforo: ["Fósforo", "mg"],
  ferro: ["Ferro", "mg"],
  sodio: ["Sódio", "mg"],
  sodio_adicao: ["Sódio de adição (IBGE)", "mg"],
  potassio: ["Potássio", "mg"],
  cobre: ["Cobre", "mg"],
  zinco: ["Zinco", "mg"],
  selenio: ["Selênio", "µg"],
  retinol: ["Retinol", "µg"],
  vitamina_a: ["Vitamina A (RAE)", "µg"],
  vitamina_b1: ["Vitamina B1 (tiamina)", "mg"],
  vitamina_b2: ["Vitamina B2 (riboflavina)", "mg"],
  vitamina_b6: ["Vitamina B6 (piridoxina)", "mg"],
  niacina: ["Niacina", "mg"],
  niacina_ne: ["Equivalente de niacina (NE)", "mg"],
  vitamina_b12: ["Vitamina B12 (cobalamina)", "µg"],
  folato_dfe: ["Folato (DFE)", "µg"],
  vitamina_d: ["Vitamina D", "µg"],
  vitamina_e: ["Vitamina E (alfa-tocoferol)", "mg"],
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
  "vitamina b12": "vitamina_b12", cobalamina: "vitamina_b12",
  folato: "folato_dfe", "vitamina b9": "folato_dfe",
  "vitamina e": "vitamina_e",
  "sodio de adicao": "sodio_adicao",
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
