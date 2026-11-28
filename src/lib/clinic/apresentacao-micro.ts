import {
  CATALOGO_MICRO,
  codigoMicronutriente,
  converterUnidade,
  somarMicronutriente,
  tipoPadraoMeta,
  valorMicro,
  type CodigoMicro,
} from "./composicao-micro.ts";
import type { MetaMicronutriente } from "./types";

// Lógica pura da apresentação de macro e micronutrientes (estado, formatação, grupos, fontes).
// Fica fora dos componentes para ser testada sem navegador.

export type Tom = "ok" | "aviso" | "alerta";
export type EstadoNutriente = {
  id: "ok" | "perto" | "baixo" | "acima";
  rotulo: string;
  icone: string;
  tom: Tom;
  // Quanto menor, mais urgente: usado para listar primeiro o que pede atenção.
  prioridade: number;
};

const NF = new Map<number, Intl.NumberFormat>();
function formato(casas: number) {
  let f = NF.get(casas);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    NF.set(casas, f);
  }
  return f;
}

/** Valor sem casas inúteis: 2.000 mg, 1.969 mg, 12,9 g, 4,82 mg, 0,05 mg. */
export function fmtValor(valor: number): string {
  if (!Number.isFinite(valor)) return "—";
  const a = Math.abs(valor);
  const casas = a >= 100 ? 0 : a >= 10 ? 1 : 2;
  return formato(casas).format(valor).replace(/,00$/, "").replace(/(,\d)0$/, "$1");
}

export function fmtPct(pct: number): string {
  return `${formato(0).format(Math.round(pct))}%`;
}

/**
 * Estado de um micronutriente frente à meta.
 * Teto (sódio, colesterol…): quanto menos, melhor. Mínimo (cálcio…): chegar até a meta.
 */
export function estadoNutriente(pct: number, teto: boolean, parcial = false): EstadoNutriente {
  if (teto) {
    if (pct > 100) return { id: "acima", rotulo: "Passou do limite", icone: "▲", tom: "alerta", prioridade: 0 };
    if (pct >= 85) return { id: "perto", rotulo: "Perto do limite", icone: "!", tom: "aviso", prioridade: 2 };
    return { id: "ok", rotulo: parcial ? "Dentro, até agora" : "Dentro do limite", icone: "✓", tom: "ok", prioridade: 4 };
  }
  if (pct >= 100) return { id: "ok", rotulo: "Meta atingida", icone: "✓", tom: "ok", prioridade: 4 };
  if (pct >= 70) return { id: "perto", rotulo: "Quase lá", icone: "◔", tom: "aviso", prioridade: 3 };
  return { id: "baixo", rotulo: "Abaixo da meta", icone: "▼", tom: "aviso", prioridade: 1 };
}

export type GrupoNutriente = "limites" | "minerais" | "vitaminas" | "gorduras" | "outros";
export const ROTULO_GRUPO: Record<GrupoNutriente, { titulo: string; dica: string }> = {
  limites: { titulo: "Limites do dia", dica: "Quanto menos, melhor: não passar da marca." },
  minerais: { titulo: "Minerais", dica: "Chegar até a marca." },
  vitaminas: { titulo: "Vitaminas", dica: "Chegar até a marca." },
  gorduras: { titulo: "Gorduras e açúcares", dica: "Chegar até a marca." },
  outros: { titulo: "Outros nutrientes", dica: "Chegar até a marca." },
};
export const ORDEM_GRUPOS: GrupoNutriente[] = ["limites", "minerais", "vitaminas", "gorduras", "outros"];

const MINERAIS: readonly CodigoMicro[] = ["calcio", "magnesio", "manganes", "fosforo", "ferro", "potassio", "cobre", "zinco", "selenio", "sodio", "sodio_adicao", "sodio_total"];
const GORDURAS: readonly CodigoMicro[] = ["colesterol", "ag_saturados", "ag_monoinsaturados", "ag_poliinsaturados", "ag_trans", "acucar_total", "acucar_adicao"];

export function grupoDoNutriente(codigo: CodigoMicro, teto: boolean): GrupoNutriente {
  if (teto) return "limites";
  if (MINERAIS.includes(codigo)) return "minerais";
  if (GORDURAS.includes(codigo)) return "gorduras";
  if (codigo.startsWith("vitamina") || codigo === "retinol" || codigo === "niacina" || codigo === "niacina_ne" || codigo === "folato_dfe") return "vitaminas";
  return "outros";
}

/** Grupos para o seletor do editor (inclui os mínimos e os tetos pelo tipo padrão de cada nutriente). */
export function opcoesPorGrupo(): Array<{ titulo: string; codigos: CodigoMicro[] }> {
  const todos = Object.keys(CATALOGO_MICRO) as CodigoMicro[];
  const por = (g: GrupoNutriente) => todos.filter((c) => grupoDoNutriente(c, false) === g);
  return [
    { titulo: "Sódio e minerais", codigos: [...por("minerais")].sort((a, b) => (a === "sodio_total" ? -1 : b === "sodio_total" ? 1 : 0)) },
    { titulo: "Vitaminas", codigos: por("vitaminas") },
    { titulo: "Gorduras e açúcares", codigos: por("gorduras") },
  ];
}

export type FonteNutriente = { nome: string; valor: number; pct: number };

/** Alimentos que mais contribuem para o total do nutriente (mesmo alimento em mais de uma refeição soma). */
export function maioresFontes(
  itens: readonly { alimentoNome: string; composicaoMicro?: Parameters<typeof valorMicro>[0] }[],
  codigo: CodigoMicro,
  quantas = 3,
): FonteNutriente[] {
  const por = new Map<string, number>();
  let total = 0;
  for (const item of itens) {
    const v = valorMicro(item.composicaoMicro, codigo);
    if (typeof v !== "number" || v <= 0) continue;
    por.set(item.alimentoNome, (por.get(item.alimentoNome) ?? 0) + v);
    total += v;
  }
  return [...por.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, quantas)
    .map(([nome, valor]) => ({ nome, valor, pct: total > 0 ? (valor / total) * 100 : 0 }));
}

export type AnaliseMeta = {
  meta: MetaMicronutriente;
  codigo?: CodigoMicro;
  reconhecido: boolean;
  teto: boolean;
  grupo: GrupoNutriente;
  unidade: string;
  /** Total do cardápio já na unidade da meta. */
  total: number;
  pct: number;
  medidos: number;
  semDados: number;
  tracos: number;
  itens: number;
  parcial: boolean;
  /** Nenhum alimento tem valor quantificado para este nutriente. */
  semValor: boolean;
  /** A nutricionista marcou este nutriente para acompanhar de perto neste paciente. */
  destaque: boolean;
  /** Não foi marcado, mas passou do limite e por isso sobe para o destaque. */
  promovido: boolean;
  estado?: EstadoNutriente;
  fontes: FonteNutriente[];
};

export function analisarMeta(
  meta: MetaMicronutriente,
  itens: readonly { alimentoNome: string; composicaoMicro?: Parameters<typeof valorMicro>[0] }[] | undefined,
): AnaliseMeta {
  const codigo = codigoMicronutriente(meta.nome);
  const teto = (meta.tipo ?? tipoPadraoMeta(codigo)) === "teto";
  const base = { meta, codigo, reconhecido: Boolean(codigo), teto, unidade: meta.unidade, itens: itens?.length ?? 0, destaque: Boolean(codigo) && meta.destaque === true, promovido: false };
  if (!codigo) {
    return { ...base, grupo: "outros", total: 0, pct: 0, medidos: 0, semDados: 0, tracos: 0, parcial: false, semValor: true, fontes: [] };
  }
  const grupo = grupoDoNutriente(codigo, teto);
  if (!itens?.length) {
    return { ...base, grupo, total: 0, pct: 0, medidos: 0, semDados: 0, tracos: 0, parcial: false, semValor: true, fontes: [] };
  }
  const s = somarMicronutriente(itens, codigo);
  const total = converterUnidade(s.total, CATALOGO_MICRO[codigo][1], meta.unidade);
  const pct = meta.meta > 0 ? (total / meta.meta) * 100 : 0;
  const parcial = s.semDados > 0 || s.tracos > 0;
  const semValor = s.medidos === 0;
  return {
    ...base,
    grupo,
    total,
    pct,
    medidos: s.medidos,
    semDados: s.semDados,
    tracos: s.tracos,
    parcial,
    semValor,
    estado: semValor ? undefined : estadoNutriente(pct, teto, parcial),
    fontes: maioresFontes(itens, codigo),
  };
}

export function analisarMetas(metas: readonly MetaMicronutriente[], itens?: Parameters<typeof analisarMeta>[1]): AnaliseMeta[] {
  return metas.map((m) => analisarMeta(m, itens));
}

export type ResumoEstados = { ok: number; atencao: number; acima: number; semDado: number; naoReconhecido: number };
export function resumirEstados(analises: readonly AnaliseMeta[]): ResumoEstados {
  const r: ResumoEstados = { ok: 0, atencao: 0, acima: 0, semDado: 0, naoReconhecido: 0 };
  for (const a of analises) {
    if (!a.reconhecido) r.naoReconhecido++;
    else if (!a.estado) r.semDado++;
    else if (a.estado.id === "acima") r.acima++;
    else if (a.estado.id === "ok") r.ok++;
    else r.atencao++;
  }
  return r;
}

/**
 * Separa o que fica em destaque do resto. Entram no destaque, na ordem escolhida, os marcados pela nutricionista;
 * depois sobem sozinhos os não marcados que passaram do limite (para ninguém perder um problema por esquecer de marcar).
 */
export function separarDestaques(analises: readonly AnaliseMeta[]) {
  const marcados = analises.filter((a) => a.reconhecido && a.destaque);
  const promovidos = analises
    .filter((a) => a.reconhecido && !a.destaque && a.estado?.id === "acima")
    .map((a) => ({ ...a, promovido: true }));
  const emDestaque = new Set([...marcados, ...analises.filter((a) => promovidos.some((p) => p.meta === a.meta))].map((a) => a.meta));
  return {
    destaques: [...marcados, ...promovidos],
    restantes: analises.filter((a) => !emDestaque.has(a.meta)),
  };
}

/** Agrupa e ordena: o que pede atenção sobe; nutrientes de mesma prioridade mantêm a ordem em que foram escolhidos. */
export function agruparAnalises(analises: readonly AnaliseMeta[]) {
  const grupos = new Map<GrupoNutriente, AnaliseMeta[]>();
  for (const a of analises) {
    if (!a.reconhecido) continue;
    const lista = grupos.get(a.grupo) ?? [];
    lista.push(a);
    grupos.set(a.grupo, lista);
  }
  return ORDEM_GRUPOS.filter((g) => grupos.has(g)).map((g) => ({
    grupo: g,
    ...ROTULO_GRUPO[g],
    itens: grupos.get(g)!
      .map((a, i) => ({ a, i }))
      .sort((x, y) => (x.a.estado?.prioridade ?? 5) - (y.a.estado?.prioridade ?? 5) || x.i - y.i)
      .map(({ a }) => a),
  }));
}

/** Posição da marca de 100% na barra (a barra vai de 0 a 150% da meta). */
export const ESCALA_BARRA = 150;
export const POSICAO_MARCA = (100 / ESCALA_BARRA) * 100;
export function larguraBarra(pct: number) {
  return Math.max(0, Math.min(100, (pct / ESCALA_BARRA) * 100));
}

/** Frase em português simples sobre dados que faltam no cálculo. */
export function avisoDados(a: Pick<AnaliseMeta, "semDados" | "tracos" | "itens" | "teto" | "semValor">): string | null {
  if (a.semValor) return a.itens ? "Nenhum alimento do cardápio tem esse dado nas tabelas." : null;
  const partes: string[] = [];
  if (a.semDados) partes.push(`${a.semDados} de ${a.itens} alimentos sem esse dado`);
  if (a.tracos) partes.push(`${a.tracos} só com traços`);
  if (!partes.length) return null;
  return `${partes.join("; ")}. O total real pode ser maior.`;
}

// ---- Macronutrientes ----

export type TotaisMacro = { kcal: number; ptn: number; cho: number; lip: number; fibra: number };
export type MetasMacro = { kcal: number; ptn: number; cho: number; lip: number; fibra?: number | null };
export type CodigoMacro = "kcal" | "ptn" | "cho" | "lip" | "fibra";

export const MACROS: Record<CodigoMacro, { rotulo: string; curto: string; unidade: string; cor: string; minimo: boolean }> = {
  kcal: { rotulo: "Energia", curto: "Energia", unidade: "kcal", cor: "#b4633a", minimo: false },
  ptn: { rotulo: "Proteína", curto: "Proteína", unidade: "g", cor: "#2f6f8f", minimo: false },
  cho: { rotulo: "Carboidrato", curto: "Carbo", unidade: "g", cor: "#a8730f", minimo: false },
  lip: { rotulo: "Gordura", curto: "Gordura", unidade: "g", cor: "#7a5a8a", minimo: false },
  fibra: { rotulo: "Fibras", curto: "Fibras", unidade: "g", cor: "#5a7a35", minimo: true },
};

export function somarMacros(refeicoes: readonly { itens: readonly TotaisMacro[] }[]): TotaisMacro {
  const t: TotaisMacro = { kcal: 0, ptn: 0, cho: 0, lip: 0, fibra: 0 };
  for (const r of refeicoes) {
    for (const i of r.itens) {
      t.kcal += i.kcal;
      t.ptn += i.ptn;
      t.cho += i.cho;
      t.lip += i.lip;
      t.fibra += i.fibra;
    }
  }
  return t;
}

export type EstadoMacro = { rotulo: string; icone: string; tom: Tom };
/** Macros são alvos (não limites rígidos): de 90% a 105% está no alvo. Fibra só tem mínimo. */
export function estadoMacro(codigo: CodigoMacro, pct: number): EstadoMacro {
  if (MACROS[codigo].minimo) {
    return pct >= 100 ? { rotulo: "Meta atingida", icone: "✓", tom: "ok" } : pct >= 70 ? { rotulo: "Quase lá", icone: "◔", tom: "aviso" } : { rotulo: "Abaixo da meta", icone: "▼", tom: "aviso" };
  }
  if (pct > 105) return { rotulo: "Acima do alvo", icone: "▲", tom: "alerta" };
  if (pct >= 90) return { rotulo: "No alvo", icone: "✓", tom: "ok" };
  return { rotulo: "Abaixo do alvo", icone: "▼", tom: "aviso" };
}

export function listarMacros(totais: TotaisMacro, metas: MetasMacro) {
  const codigos: CodigoMacro[] = ["kcal", "ptn", "cho", "lip"];
  if (metas.fibra && metas.fibra > 0) codigos.push("fibra");
  return codigos
    .filter((c) => (metas[c] ?? 0) > 0)
    .map((codigo) => {
      const meta = metas[codigo] as number;
      const valor = totais[codigo];
      const pct = (valor / meta) * 100;
      return { codigo, ...MACROS[codigo], valor, meta, pct, estado: estadoMacro(codigo, pct) };
    });
}
