import type { MetaMicronutriente } from "./types";

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
  sodio: ["Sódio sem sal de adição", "mg"],
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
  colesterol: ["Colesterol", "mg"],
  ag_saturados: ["Gordura saturada", "g"],
  ag_monoinsaturados: ["Gordura monoinsaturada", "g"],
  ag_poliinsaturados: ["Gordura poli-insaturada", "g"],
  ag_trans: ["Gordura trans", "g"],
  acucar_total: ["Açúcar total", "g"],
  acucar_adicao: ["Açúcar de adição", "g"],
  sodio_total: ["Sódio", "mg"],
} as const;

// Calculado na hora, nunca gravado: no IBGE o sódio de adição vem em coluna separada do sódio do alimento.
export const CODIGOS_DERIVADOS = ["sodio_total"] as const;
const COMPONENTES_DERIVADOS: Record<string, readonly CodigoMicro[]> = { sodio_total: ["sodio", "sodio_adicao"] };

// Nutrientes que têm limite máximo (teto) em vez de mínimo a atingir.
const CODIGOS_TETO: readonly CodigoMicro[] = [
  "sodio", "sodio_adicao", "sodio_total", "colesterol", "ag_saturados", "ag_trans", "acucar_adicao",
];
export type TipoMeta = "minimo" | "teto";

// A TACO não traz estes nutrientes: no cardápio, só os alimentos do IBGE entram no total.
export const SO_NO_IBGE: readonly CodigoMicro[] = [
  "selenio", "niacina_ne", "vitamina_b12", "folato_dfe", "vitamina_d", "vitamina_e",
  "sodio_adicao", "ag_trans", "acucar_total", "acucar_adicao",
];
export function tipoPadraoMeta(codigo?: CodigoMicro): TipoMeta {
  return codigo && CODIGOS_TETO.includes(codigo) ? "teto" : "minimo";
}

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
  "acidos graxos saturados": "ag_saturados", "gordura saturada total": "ag_saturados",
  "acidos graxos monoinsaturados": "ag_monoinsaturados",
  "acidos graxos poliinsaturados": "ag_poliinsaturados", "gordura poliinsaturada": "ag_poliinsaturados",
  "acidos graxos trans": "ag_trans",
  "acucar de adicao": "acucar_adicao", "acucar adicionado": "acucar_adicao",
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

const FATOR_UNIDADE: Record<string, number> = { "µg": 1, mg: 1000, g: 1000000 };
export function converterUnidade(valor: number, de: string, para: string) {
  const a = FATOR_UNIDADE[de];
  const b = FATOR_UNIDADE[para];
  return a && b ? (valor * a) / b : valor;
}

export function ehDerivado(codigo: CodigoMicro) {
  return (CODIGOS_DERIVADOS as readonly string[]).includes(codigo);
}

// Códigos gravados que precisam acompanhar o item para o valor derivado poder ser calculado.
export function codigosNecessarios(codigos: Iterable<CodigoMicro | undefined>): Set<CodigoMicro> {
  const saida = new Set<CodigoMicro>();
  for (const codigo of codigos) {
    if (!codigo) continue;
    saida.add(codigo);
    for (const base of COMPONENTES_DERIVADOS[codigo] ?? []) saida.add(base);
  }
  return saida;
}

// Valor de um nutriente numa composição. O sódio total soma o sódio do alimento ao sódio de adição (IBGE);
// na TACO o sódio já é o total medido no alimento preparado.
export function valorMicro(composicao: ComposicaoMicro | undefined, codigo: CodigoMicro): number | "Tr" | undefined {
  if (!composicao) return undefined;
  if (codigo !== "sodio_total") return composicao[codigo];
  const base = composicao.sodio;
  const adicao = composicao.sodio_adicao;
  if (base === undefined && adicao === undefined) return undefined;
  const soma = (typeof base === "number" ? base : 0) + (typeof adicao === "number" ? adicao : 0);
  if (soma === 0 && (base === "Tr" || adicao === "Tr")) return "Tr";
  return soma;
}

export function somarMicronutriente(itens: readonly { composicaoMicro?: ComposicaoMicro }[], codigo: CodigoMicro) {
  let total = 0;
  let medidos = 0;
  let tracos = 0;
  for (const item of itens) {
    const dado = valorMicro(item.composicaoMicro, codigo);
    if (dado === "Tr") tracos++;
    if (typeof dado === "number") {
      total += dado;
      medidos++;
    }
  }
  return { total, medidos, tracos, semDados: itens.length - medidos - tracos };
}

export function lerMetasMicro(valor: unknown): MetaMicronutriente[] {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, 30).flatMap((meta) => {
    if (!meta || typeof meta !== "object") return [];
    const { nome, unidade, meta: quantidade } = meta;
    if (typeof nome !== "string" || !nome.trim() || !["mg", "µg", "g"].includes(unidade)) return [];
    if (typeof quantidade !== "number" || !Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 1000000) return [];
    const { tipo } = meta as { tipo?: unknown };
    const base = { nome: nome.trim().slice(0, 80), unidade, meta: quantidade };
    return [tipo === "minimo" || tipo === "teto" ? { ...base, tipo } : base];
  });
}
