import { useState } from "react";
import {
  CATALOGO_MICRO,
  SO_NO_IBGE,
  codigoMicronutriente,
  tipoPadraoMeta,
  type CodigoMicro,
  type TipoMeta,
} from "@/lib/clinic/composicao-micro";
import { analisarMeta, avisoDados, fmtPct, fmtValor, opcoesPorGrupo, type AnaliseMeta } from "@/lib/clinic/apresentacao-micro";
import {
  PERFIS_MICRO, avisoPotassio, montarSugestaoMulti, perfisSugeridos, type ContextoMicro,
} from "@/lib/clinic/perfis-micro";
import type { ItemPlano, MetaMicronutriente } from "@/lib/clinic/types";
import { BarraNutriente, PainelMicros, SeloEstado, TONS } from "./painel-nutrientes";
import { Button, Campo, Input, Select, cx } from "./ui";

export type MetaMicroEditavel = Omit<MetaMicronutriente, "meta"> & { meta: string };

export function editarMetasMicro(metas: MetaMicronutriente[] = []): MetaMicroEditavel[] {
  return metas.map((m) => ({ ...m, meta: String(m.meta) }));
}

export function validarMetasMicro(metas: MetaMicroEditavel[]): MetaMicronutriente[] {
  return metas.map((m) => {
    const nome = m.nome.trim();
    const meta = Number(m.meta.replace(",", "."));
    if (!nome || nome.length > 80 || !Number.isFinite(meta) || meta <= 0 || meta > 1000000) {
      throw new Error("Informe um nome e uma meta diária válida para cada micronutriente escolhido.");
    }
    if (!codigoMicronutriente(nome)) {
      throw new Error(`“${nome}” não é um nutriente reconhecido. Escolha o nutriente na lista.`);
    }
    return { nome, unidade: m.unidade, meta, tipo: m.tipo ?? tipoPadraoMeta(codigoMicronutriente(nome)) };
  });
}

export function AvisoFonteMicro({ nome }: { nome: string }) {
  const codigo = codigoMicronutriente(nome);
  if (!codigo || !SO_NO_IBGE.includes(codigo)) return null;
  return <p className="mt-2 text-sm text-ink-2"><span aria-hidden="true">ⓘ </span>A TACO não traz este nutriente: só os alimentos da fonte IBGE entram no total.</p>;
}

const GRUPOS_SELETOR = opcoesPorGrupo();

/** Uma meta de micronutriente: escolha na lista (sem digitar nome), valor, unidade, mínimo ou teto, e o total do cardápio quando houver. */
export function LinhaMetaMicro({ m, onChange, onRemover, desabilitado = false, itens, nota }: {
  m: MetaMicroEditavel;
  onChange: (parcial: Partial<MetaMicroEditavel>) => void;
  onRemover?: () => void;
  desabilitado?: boolean;
  itens?: ItemPlano[];
  nota?: string;
}) {
  const codigo = codigoMicronutriente(m.nome);
  const tipo: TipoMeta = m.tipo ?? tipoPadraoMeta(codigo);
  const metaNum = Number(m.meta.replace(",", "."));
  const analise: AnaliseMeta | null = codigo && itens?.length && metaNum > 0
    ? analisarMeta({ nome: m.nome, unidade: m.unidade, meta: metaNum, tipo }, itens)
    : null;
  const naoReconhecido = Boolean(m.nome.trim()) && !codigo;
  const tom = analise?.estado?.tom;
  const aviso = analise ? avisoDados(analise) : null;
  const textoNota = nota ?? (codigo === "sodio_total" ? "Soma o sódio do alimento e o sódio de adição (sal do preparo) que o IBGE informa em colunas separadas. Na TACO o sódio já é o total." : null);

  return (
    <div className="nutri-card p-3" style={{ borderLeft: `6px solid ${naoReconhecido ? "var(--color-amber)" : tom ? TONS[tom].cor : "var(--color-copper)"}` }}>
      <Campo label="Nutriente">
        <Select
          value={codigo ?? (m.nome.trim() ? "__atual" : "")}
          disabled={desabilitado}
          onChange={(e) => {
            const novo = e.target.value as CodigoMicro;
            if (!(novo in CATALOGO_MICRO)) return;
            const [nome, unidade] = CATALOGO_MICRO[novo];
            onChange({ nome, unidade: unidade as MetaMicroEditavel["unidade"], tipo: tipoPadraoMeta(novo) });
          }}
        >
          <option value="" disabled>Escolha o nutriente</option>
          {naoReconhecido ? <option value="__atual" disabled>{m.nome} (não reconhecido)</option> : null}
          {GRUPOS_SELETOR.map((g) => (
            <optgroup key={g.titulo} label={g.titulo}>
              {g.codigos.map((c) => <option key={c} value={c}>{CATALOGO_MICRO[c][0]}</option>)}
            </optgroup>
          ))}
        </Select>
      </Campo>
      {naoReconhecido ? (
        <p role="alert" className="mt-2 rounded-lg px-2.5 py-1.5 text-sm" style={{ background: "var(--color-amber-soft)", color: "var(--color-aviso)" }}>
          “{m.nome}” não é um nutriente reconhecido: nenhum total será calculado. Escolha na lista acima.
        </p>
      ) : null}
      <div className="mt-2 grid grid-cols-[1fr_6.5rem] gap-2">
        <Campo label="Meta por dia">
          <Input value={m.meta} inputMode="decimal" disabled={desabilitado} onChange={(e) => onChange({ meta: e.target.value })} />
        </Campo>
        <Campo label="Unidade">
          <Select value={m.unidade} disabled={desabilitado} onChange={(e) => onChange({ unidade: e.target.value as MetaMicronutriente["unidade"] })}>
            <option>mg</option><option>µg</option><option>g</option>
          </Select>
        </Campo>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <fieldset className="min-w-0 flex-1">
          <legend className="mb-1 text-sm text-ink-2">A meta é</legend>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl p-1" style={{ background: "var(--color-sand)", boxShadow: "var(--depth-inset)" }}>
            {([["minimo", "Mínimo"], ["teto", "Teto"]] as const).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={tipo === valor}
                disabled={desabilitado}
                onClick={() => onChange({ tipo: valor })}
                className={cx("min-h-[46px] rounded-lg px-3 text-sm font-semibold", tipo === valor ? "bg-copper text-paper" : "bg-paper text-ink-2")}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </fieldset>
        {onRemover && !desabilitado ? (
          <Button type="button" variant="ghost" onClick={onRemover} aria-label={`Remover ${m.nome || "micronutriente"}`}>
            <span aria-hidden="true">✕</span> Remover
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-ink-2">
        {tipo === "teto" ? "Teto: o total do dia não deve passar desse valor." : "Mínimo: o total do dia deve chegar a esse valor."}
      </p>
      {analise ? (
        <div className="mt-3 border-t border-line pt-3">
          {analise.estado ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-bold leading-none tabular-nums" style={{ color: TONS[analise.estado.tom].texto }}>{fmtPct(analise.pct)}</p>
                <SeloEstado tom={analise.estado.tom} icone={analise.estado.icone} rotulo={analise.estado.rotulo} />
              </div>
              <div className="mt-3">
                <BarraNutriente
                  pct={analise.pct}
                  teto={analise.teto}
                  tom={analise.estado.tom}
                  nome={m.nome}
                  texto={`${fmtValor(analise.total)} de ${fmtValor(analise.meta.meta)} ${m.unidade}. ${analise.estado.rotulo}.`}
                />
              </div>
              <p className="text-sm tabular-nums"><strong>{fmtValor(analise.total)}</strong> <span className="text-ink-2">de {fmtValor(analise.meta.meta)} {m.unidade} no cardápio</span></p>
            </>
          ) : null}
          {aviso ? <p className="mt-2 text-sm text-ink-2"><span aria-hidden="true">ⓘ </span>{aviso}</p> : null}
        </div>
      ) : codigo && itens && !itens.length ? (
        <p className="mt-2 text-sm text-ink-2">Adicione alimentos ao cardápio para calcular o total.</p>
      ) : null}
      <AvisoFonteMicro nome={m.nome} />
      {textoNota ? <p className="mt-1 text-sm text-ink-2">{textoNota}</p> : null}
    </div>
  );
}

export function SugestaoMicros({ metas, onChange, contexto }: {
  metas: MetaMicroEditavel[];
  onChange: (metas: MetaMicroEditavel[]) => void;
  contexto: ContextoMicro;
}) {
  const detectados = perfisSugeridos(contexto);
  const [escolhidos, setEscolhidos] = useState<string[]>(() => (detectados.length ? detectados.map((p) => p.id) : ["base"]));
  const perfis = PERFIS_MICRO.filter((p) => escolhidos.includes(p.id));
  const novas = montarSugestaoMulti(perfis, contexto, metas.map((m) => m.nome));
  const semReferencia = novas.some((n) => n.meta === "");
  const espaco = Math.max(0, 30 - metas.length);
  const aviso = avisoPotassio(contexto, perfis.flatMap((p) => p.nutrientes));
  const alternar = (id: string) => setEscolhidos((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  return (
    <div className="mt-3 rounded-xl bg-copper-soft p-3 text-sm">
      <fieldset>
        <legend className="mb-2 font-semibold text-ink">Sugerir pelo perfil do paciente</legend>
        <div className="flex flex-wrap gap-2">
          {PERFIS_MICRO.map((p) => {
            const ligado = escolhidos.includes(p.id);
            const combina = detectados.some((d) => d.id === p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={ligado}
                onClick={() => alternar(p.id)}
                className={cx("min-h-[46px] rounded-full px-4 text-sm font-semibold", ligado ? "bg-copper text-paper" : "bg-paper text-ink")}
              >
                {combina ? <span aria-hidden="true">● </span> : null}{p.nome}{combina ? <span className="sr-only"> (combina com o cadastro)</span> : null}
              </button>
            );
          })}
        </div>
      </fieldset>
      {detectados.length ? <p className="mt-2 text-ink-2"><span aria-hidden="true">● </span>combina com o cadastro do paciente. Você pode juntar vários perfis.</p> : null}
      {perfis.map((p) => <p key={p.id} className="mt-1 text-ink-2"><strong>{p.nome}:</strong> {p.porque}{p.aviso ? ` ${p.aviso}` : ""}</p>)}
      {aviso ? <p role="alert" className="mt-2 rounded-lg px-2.5 py-1.5 font-semibold" style={{ background: "var(--color-amber-soft)", color: "var(--color-aviso)" }}>{aviso}</p> : null}
      <p className="mt-2 text-ink-2">
        {semReferencia
          ? "Metas em branco: não há referência automática para este paciente (menor de 19 anos, gestante, lactante ou sem sexo/idade). Preencha à mão."
          : "Metas pré-preenchidas com a referência para adultos (DRI) e tetos da OMS. Revise e ajuste ao caso."}
      </p>
      <Button type="button" variant="sand" className="mt-3 w-full sm:w-auto" disabled={!novas.length || !espaco || !perfis.length} onClick={() => onChange([...metas, ...novas.slice(0, espaco)])}>
        {novas.length && perfis.length ? `Adicionar ${Math.min(novas.length, espaco)} nutrientes` : "Já adicionados"}
      </Button>
    </div>
  );
}

export function MetasMicroEditor({ metas, onChange, contexto }: {
  metas: MetaMicroEditavel[];
  onChange: (metas: MetaMicroEditavel[]) => void;
  contexto?: ContextoMicro;
}) {
  function alterar(indice: number, valor: Partial<MetaMicroEditavel>) {
    onChange(metas.map((m, i) => i === indice ? { ...m, ...valor } : m));
  }

  return (
    <section className="mt-4 rounded-2xl border border-line p-4">
      <h3 className="font-serif text-2xl">Micronutrientes opcionais</h3>
      {contexto ? <SugestaoMicros metas={metas} onChange={onChange} contexto={contexto} /> : null}
      <div className="mt-3 flex flex-col gap-3">
        {metas.map((m, i) => (
          <LinhaMetaMicro key={i} m={m} onChange={(p) => alterar(i, p)} onRemover={() => onChange(metas.filter((_, n) => n !== i))} />
        ))}
      </div>
      <Button type="button" variant="sand" className="mt-3" disabled={metas.length >= 30} onClick={() => onChange([...metas, { nome: "", unidade: "mg", meta: "" }])}>
        <span aria-hidden="true">＋</span> Adicionar micronutriente
      </Button>
    </section>
  );
}

export function ResumoMicronutrientes({ metas, itens, variante }: {
  metas?: MetaMicronutriente[];
  itens?: ItemPlano[];
  variante?: "cartao" | "documento";
}) {
  return <PainelMicros metas={metas} itens={itens} variante={variante} />;
}
