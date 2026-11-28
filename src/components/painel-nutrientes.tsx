import type { ReactNode } from "react";
import {
  agruparAnalises, analisarMetas, avisoDados, separarDestaques, fmtPct, fmtValor, larguraBarra, listarMacros, resumirEstados,
  POSICAO_MARCA, type AnaliseMeta, type MetasMacro, type Tom, type TotaisMacro,
} from "@/lib/clinic/apresentacao-micro";
import { CATALOGO_MICRO, converterUnidade } from "@/lib/clinic/composicao-micro";
import type { ItemPlano, MetaMicronutriente } from "@/lib/clinic/types";

// Cores de estado. O estado nunca depende só da cor: sempre vem com ícone e texto.
export const TONS: Record<Tom, { cor: string; fundo: string; texto: string }> = {
  ok: { cor: "var(--color-ok)", fundo: "var(--color-ok-soft)", texto: "var(--color-ok)" },
  aviso: { cor: "var(--color-amber)", fundo: "var(--color-amber-soft)", texto: "var(--color-aviso)" },
  alerta: { cor: "var(--color-alerta)", fundo: "var(--color-alerta-soft)", texto: "var(--color-alerta)" },
};

export function SeloEstado({ tom, icone, rotulo, largo = true }: { tom: Tom; icone: string; rotulo: string; largo?: boolean }) {
  const t = TONS[tom];
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${largo ? "min-w-[8.75rem]" : ""}`}
      style={{ background: t.fundo, color: t.texto, borderColor: t.cor }}
    >
      <span aria-hidden="true">{icone}</span>
      {rotulo}
    </span>
  );
}

/** Barra de 0 a 150% da meta, marca fixa em 100%. Nos tetos, a faixa acima da marca fica tingida de vermelho. */
export function BarraNutriente({ pct, teto, tom, nome, texto }: { pct: number; teto: boolean; tom: Tom; nome: string; texto: string }) {
  const t = TONS[tom];
  return (
    <div className="pb-5">
      <div
        role="progressbar"
        aria-label={`${nome}: ${fmtPct(pct)} ${teto ? "do limite" : "da meta"}`}
        aria-valuemin={0}
        aria-valuemax={150}
        aria-valuenow={Math.round(Math.min(Math.max(pct, 0), 150))}
        aria-valuetext={texto}
        className="nutri-trilho"
        style={teto ? { backgroundImage: `linear-gradient(90deg, transparent ${POSICAO_MARCA}%, var(--color-alerta-soft) ${POSICAO_MARCA}%)` } : undefined}
      >
        <div className="nutri-fill" style={{ width: `${larguraBarra(pct)}%`, backgroundColor: t.cor }} />
        <span className="nutri-marca" style={{ left: `${POSICAO_MARCA}%` }} aria-hidden="true" />
        <span className="absolute top-full mt-1 -translate-x-1/2 text-xs font-semibold text-ink-2" style={{ left: `${POSICAO_MARCA}%` }} aria-hidden="true">
          {teto ? "limite" : "meta"}
        </span>
      </div>
    </div>
  );
}

function ListaFontes({ a }: { a: AnaliseMeta }) {
  return (
    <ol className="mt-2 flex flex-col gap-1.5 px-1 pb-1 text-sm">
      {a.fontes.map((f) => (
        <li key={f.nome} className="grid grid-cols-[1fr_auto] gap-x-3 tabular-nums">
          <span className="min-w-0 truncate">{f.nome}</span>
          <span className="text-ink-2">{fmtValor(a.codigo ? converterUnidade(f.valor, CATALOGO_MICRO[a.codigo][1], a.unidade) : f.valor)} {a.unidade} · {fmtPct(f.pct)}</span>
        </li>
      ))}
    </ol>
  );
}

function FontesFixas({ a }: { a: AnaliseMeta }) {
  if (!a.fontes.length) return null;
  return <p className="mt-2 text-sm text-ink-2">Maiores fontes: {a.fontes.map((f) => `${f.nome.toLowerCase()} (${fmtPct(f.pct)})`).join("; ")}.</p>;
}

export function LinhaNutriente({ a, fixo = false }: { a: AnaliseMeta; fixo?: boolean }) {
  const destaque = a.destaque || a.promovido;
  if (destaque) fixo = true;
  const est = a.estado;
  const tom: Tom = est?.tom ?? "aviso";
  const aviso = avisoDados(a);
  const palavra = a.teto ? "Limite" : "Meta";
  const nome = a.codigo ? a.meta.nome.replace(/ \(.*\)$/, "") : a.meta.nome;
  return (
    <article className={`nutri-card ${destaque ? "nutri-card-destaque p-4" : "p-3.5"}`} style={{ borderLeft: `${destaque ? 8 : 6}px solid ${est ? TONS[tom].cor : "var(--color-line)"}` }}>
      {destaque ? (
        <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: a.promovido ? "var(--color-alerta)" : "var(--color-copper-deep)" }}>
          {a.promovido ? <><span aria-hidden="true">▲ </span>Subiu para o destaque: passou do limite</> : <><span aria-hidden="true">★ </span>Em destaque</>}
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className={`font-sans font-semibold leading-snug ${destaque ? "text-lg" : "text-base"}`}>{nome}</h4>
          <p className="text-sm text-ink-2">{palavra} de {fmtValor(a.meta.meta)} {a.unidade} por dia</p>
        </div>
        {est ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <p className={`min-w-[4ch] text-right font-bold leading-none tabular-nums ${destaque ? "text-4xl" : "text-3xl"}`} style={{ color: TONS[tom].texto }}>{fmtPct(a.pct)}</p>
            <SeloEstado tom={est.tom} icone={est.icone} rotulo={est.rotulo} />
          </div>
        ) : null}
      </div>
      {est ? (
        <>
          <div className="mt-3">
            <BarraNutriente
              pct={a.pct}
              teto={a.teto}
              tom={tom}
              nome={nome}
              texto={`${fmtValor(a.total)} de ${fmtValor(a.meta.meta)} ${a.unidade}. ${est.rotulo}.${a.parcial ? " Total incompleto." : ""}`}
            />
          </div>
          {a.fontes.length && !fixo ? (
            <details>
              <summary className="nutri-resumo text-sm">
                <span className="tabular-nums"><strong>{fmtValor(a.total)}</strong> <span className="text-ink-2">de {fmtValor(a.meta.meta)} {a.unidade}</span></span>
                <span className="flex items-center gap-1.5 font-semibold">De onde vem <span className="nutri-seta text-ink-2" aria-hidden="true">▾</span></span>
              </summary>
              <ListaFontes a={a} />
            </details>
          ) : (
            <p className="text-sm tabular-nums"><strong>{fmtValor(a.total)}</strong> <span className="text-ink-2">de {fmtValor(a.meta.meta)} {a.unidade}</span></p>
          )}
        </>
      ) : null}
      {aviso ? (
        <p className="mt-2 rounded-lg px-2.5 py-1.5 text-sm" style={{ background: "var(--color-sand)", color: "var(--color-ink-2)" }}>
          <span aria-hidden="true">ⓘ </span>{aviso}
        </p>
      ) : null}
      {est && fixo ? <FontesFixas a={a} /> : null}
    </article>
  );
}

function LinhaDocumento({ a }: { a: AnaliseMeta }) {
  const est = a.estado;
  const tom: Tom = est?.tom ?? "aviso";
  const aviso = avisoDados(a);
  return (
    <li className={`break-inside-avoid border-b border-line py-2.5 ${a.destaque || a.promovido ? "-mx-2 rounded-lg px-2" : ""}`} style={a.destaque || a.promovido ? { background: "var(--color-copper-soft)" } : undefined}>
      <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
        <span className="font-semibold">{a.destaque ? <span aria-label="em destaque">★ </span> : a.promovido ? <span aria-label="passou do limite">▲ </span> : null}{a.meta.nome.replace(/ \(.*\)$/, "")}</span>
        {est ? <span className="text-lg font-bold tabular-nums" style={{ color: TONS[tom].texto }}>{fmtPct(a.pct)}</span> : null}
        <span className="text-sm text-ink-2">{a.teto ? "Limite" : "Meta"} {fmtValor(a.meta.meta)} {a.unidade}{est ? ` · total ${fmtValor(a.total)} ${a.unidade}` : ""}</span>
        {est ? <span className="text-right text-sm font-semibold" style={{ color: TONS[tom].texto }}><span aria-hidden="true">{est.icone} </span>{est.rotulo}</span> : null}
      </div>
      {est ? <div className="mt-1.5"><BarraNutriente pct={a.pct} teto={a.teto} tom={tom} nome={a.meta.nome} texto={`${fmtValor(a.total)} de ${fmtValor(a.meta.meta)} ${a.unidade}. ${est.rotulo}.`} /></div> : null}
      {aviso ? <p className="text-sm text-ink-2">{aviso}</p> : null}
      {est ? <FontesFixas a={a} /> : null}
    </li>
  );
}

function AlertaNaoReconhecido({ nome }: { nome: string }) {
  return (
    <div role="alert" className="rounded-xl border-2 border-dashed p-3 text-sm" style={{ borderColor: "var(--color-amber)", background: "var(--color-amber-soft)", color: "var(--color-aviso)" }}>
      <strong>“{nome}”</strong> não é um nutriente reconhecido, então nenhum total é calculado. Escolha o nutriente na lista.
    </div>
  );
}

function ChipResumo({ tom, icone, children }: { tom: Tom; icone: string; children: ReactNode }) {
  const t = TONS[tom];
  return (
    <li className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ background: t.fundo, color: t.texto, borderColor: t.cor }}>
      <span aria-hidden="true">{icone}</span>{children}
    </li>
  );
}

/** Resumo no topo: quantos estão no alvo, pedem atenção ou passaram do limite. */
export function ResumoEstados({ analises }: { analises: AnaliseMeta[] }) {
  const r = resumirEstados(analises);
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Resumo dos nutrientes">
      {r.ok ? <ChipResumo tom="ok" icone="✓">{r.ok} no alvo</ChipResumo> : null}
      {r.atencao ? <ChipResumo tom="aviso" icone="▼">{r.atencao} pedem atenção</ChipResumo> : null}
      {r.acima ? <ChipResumo tom="alerta" icone="▲">{r.acima} passaram do limite</ChipResumo> : null}
      {r.semDado ? <ChipResumo tom="aviso" icone="ⓘ">{r.semDado} sem dado nas tabelas</ChipResumo> : null}
      {r.naoReconhecido ? <ChipResumo tom="aviso" icone="⚠">{r.naoReconhecido} sem reconhecer</ChipResumo> : null}
    </ul>
  );
}

/** Metas escolhidas, sem cardápio para comparar (avaliação, dieta, histórico). */
function ListaMetas({ analises }: { analises: AnaliseMeta[] }) {
  const ordenadas = [...analises.filter((a) => a.destaque), ...analises.filter((a) => !a.destaque)];
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {ordenadas.map((a, i) => (
        <li key={i} className="nutri-card flex min-h-[46px] items-center justify-between gap-3 px-3 py-2" style={{ borderLeft: `6px solid ${a.teto ? "var(--color-alerta)" : "var(--color-copper)"}` }}>
          <span className="min-w-0 font-semibold leading-snug">{a.destaque ? <span className="text-copper-deep" aria-label="em destaque">★ </span> : null}{a.meta.nome.replace(/ \(.*\)$/, "")}</span>
          <span className="shrink-0 text-right text-sm tabular-nums text-ink-2">
            <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide">{a.teto ? "Limite" : "Meta"}</span>
            <strong className="text-ink">{fmtValor(a.meta.meta)} {a.unidade}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PainelMicros({ metas, itens, titulo = "Micronutrientes acompanhados", variante = "cartao" }: {
  metas?: MetaMicronutriente[];
  itens?: ItemPlano[];
  titulo?: string;
  variante?: "cartao" | "documento";
}) {
  if (!metas?.length) return null;
  const analises = analisarMetas(metas, itens);
  const comCardapio = Boolean(itens?.length);
  const invalidos = analises.filter((a) => !a.reconhecido);
  const { destaques, restantes } = separarDestaques(analises);
  return (
    <section className="mt-6" aria-label={titulo}>
      <h3 className="font-serif text-2xl">{titulo}</h3>
      {comCardapio ? <ResumoEstados analises={analises} /> : null}
      {!comCardapio ? (
        <ListaMetas analises={analises.filter((a) => a.reconhecido)} />
      ) : (
        <>
          {destaques.length ? (
            <div className="mt-5">
              <h4 className="font-serif text-xl">Em destaque</h4>
              <p className="text-sm text-ink-2">Escolhidos para acompanhar de perto.</p>
              {variante === "documento" ? (
                <ul className="mt-2">{destaques.map((a, i) => <LinhaDocumento key={i} a={a} />)}</ul>
              ) : (
                <div className="mt-3 flex flex-col gap-4">{destaques.map((a, i) => <LinhaNutriente key={i} a={a} />)}</div>
              )}
            </div>
          ) : null}
          {agruparAnalises(restantes).map((g, gi) => (
            <div key={g.grupo} className="mt-5">
              {destaques.length && gi === 0 ? <p className="mb-3 border-t border-line pt-4 text-sm font-semibold uppercase tracking-wide text-ink-2">Demais nutrientes</p> : null}
              <h4 className="font-serif text-xl">{g.titulo}</h4>
              <p className="text-sm text-ink-2">{g.dica}</p>
              {variante === "documento" ? (
                <ul className="mt-2">{g.itens.map((a, i) => <LinhaDocumento key={i} a={a} />)}</ul>
              ) : (
                <div className="mt-3 flex flex-col gap-4">{g.itens.map((a, i) => <LinhaNutriente key={i} a={a} />)}</div>
              )}
            </div>
          ))}
        </>
      )}
      {invalidos.length ? <div className="mt-4 flex flex-col gap-2">{invalidos.map((a, i) => <AlertaNaoReconhecido key={i} nome={a.meta.nome} />)}</div> : null}
    </section>
  );
}

// ---- Macronutrientes ----

function Anel({ pct, cor, rotulo }: { pct: number; cor: string; rotulo: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const preenchido = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]" role="img" aria-label={`${rotulo}: ${fmtPct(pct)} da meta`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-trilho)" strokeWidth="9" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={cor} strokeWidth="9" strokeLinecap="round" className="nutri-anel" strokeDasharray={`${preenchido} ${c}`} transform="rotate(-90 40 40)" />
      {pct > 100 ? <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-alerta)" strokeWidth="3" strokeDasharray="2 5" /> : null}
      <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-ink)" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtPct(pct)}</text>
    </svg>
  );
}

/** Energia e macronutrientes: o que o cardápio entrega frente à meta. Cada variável tem uma única cor. */
const COLUNAS: Record<number, string> = { 1: "@2xl:grid-cols-1", 2: "@2xl:grid-cols-2", 3: "@2xl:grid-cols-3", 4: "@2xl:grid-cols-4", 5: "@2xl:grid-cols-5" };

export function PainelMacros({ totais, metas, titulo = "O dia em números" }: { totais: TotaisMacro; metas: MetasMacro; titulo?: string }) {
  const lista = listarMacros(totais, metas);
  if (!lista.length) return null;
  const impar = lista.length % 2 === 1;
  return (
    <section className="@container mt-5" aria-label={titulo}>
      <h3 className="font-serif text-2xl">{titulo}</h3>
      <ul className={`mt-3 grid grid-cols-2 gap-3 ${COLUNAS[lista.length] ?? ""}`}>
        {lista.map((m, i) => {
          const largo = impar && i === 0;
          return (
            <li
              key={m.codigo}
              className={`nutri-card flex items-center gap-1 p-2.5 ${largo ? "col-span-2 flex-row justify-center gap-4 text-left @2xl:col-span-1 @2xl:flex-col @2xl:gap-1 @2xl:text-center" : "flex-col text-center"}`}
              style={{ borderTop: `5px solid ${m.cor}` }}
            >
              <Anel pct={m.pct} cor={m.cor} rotulo={m.rotulo} />
              <div className={`flex min-w-0 flex-col gap-1 ${largo ? "items-start @2xl:items-center" : "items-center"}`}>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.cor }} aria-hidden="true" />
                  {m.rotulo}
                </p>
                <p className="text-xs tabular-nums text-ink-2">{fmtValor(m.valor)} de {fmtValor(m.meta)} {m.unidade}</p>
                <SeloEstado tom={m.estado.tom} icone={m.estado.icone} rotulo={m.estado.rotulo} largo={false} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Só as metas (sem cardápio): avaliação, dieta e dossiê. */
export function MetasMacroChips({ kcal, ptn, cho, lip, fibra }: { kcal?: number; ptn?: number; cho?: number; lip?: number; fibra?: number | null }) {
  const itens = listarMacros({ kcal: 0, ptn: 0, cho: 0, lip: 0, fibra: 0 }, { kcal: kcal ?? 0, ptn: ptn ?? 0, cho: cho ?? 0, lip: lip ?? 0, fibra });
  if (!itens.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2" aria-label="Metas de energia e macronutrientes">
      {itens.map((m) => (
        <li key={m.codigo} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-sm tabular-nums" style={{ borderLeft: `5px solid ${m.cor}` }}>
          <span className="font-semibold">{m.curto}</span>
          {fmtValor(m.meta)} {m.unidade}
        </li>
      ))}
    </ul>
  );
}
