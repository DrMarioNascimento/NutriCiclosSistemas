import { useId, useState } from "react";
import { fmtNum } from "@/lib/clinic/calc";
import {
  CATALOGO_MICRO,
  CODIGOS_MICRO,
  SO_NO_IBGE,
  codigoMicronutriente,
  converterUnidade,
  somarMicronutriente,
  tipoPadraoMeta,
  type TipoMeta,
} from "@/lib/clinic/composicao-micro";
import { PERFIS_MICRO, montarSugestao, perfilSugerido, type ContextoMicro } from "@/lib/clinic/perfis-micro";
import type { ItemPlano, MetaMicronutriente } from "@/lib/clinic/types";
import { Button, Campo, Input, Select } from "./ui";

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
    return { nome, unidade: m.unidade, meta, tipo: m.tipo ?? tipoPadraoMeta(codigoMicronutriente(nome)) };
  });
}

type TotalMicro = ReturnType<typeof somarMicronutriente>;

function situacao(pct: number, tipo: TipoMeta) {
  if (tipo === "teto") return pct > 100 ? { texto: "Acima do teto", alerta: true } : { texto: "Dentro do teto", alerta: false };
  if (pct >= 100) return { texto: "Meta atingida", alerta: false };
  return pct >= 70 ? { texto: "Perto da meta", alerta: false } : { texto: "Abaixo da meta", alerta: true };
}

/** Barra de 0 a 150% da meta, com marca fixa em 100%, para o total já somado do cardápio. */
export function BarraMicro({ total, meta, unidade, tipo }: {
  total: TotalMicro;
  meta: number;
  unidade: string;
  tipo: TipoMeta;
}) {
  if (!total.medidos || meta <= 0) return null;
  const pct = (total.total / meta) * 100;
  const { texto, alerta } = situacao(pct, tipo);
  const largura = Math.min(100, (pct / 150) * 100);
  const parcial = total.semDados > 0 || total.tracos > 0;
  return (
    <div className="mt-1.5">
      <div
        role="progressbar"
        aria-label={texto}
        aria-valuemin={0}
        aria-valuemax={150}
        aria-valuenow={Math.round(Math.min(pct, 150))}
        className="relative h-2 rounded-full bg-sand"
      >
        <div className={`h-full rounded-full ${alerta ? "bg-amber" : "bg-copper"}`} style={{ width: `${largura}%` }} />
        <div className="absolute inset-y-[-3px] w-0.5 bg-ink-2" style={{ left: `${(100 / 150) * 100}%` }} aria-hidden="true" />
      </div>
      <p className="mt-1 text-xs tabular-nums text-ink-2">
        {fmtNum(total.total, 2)} de {fmtNum(meta, 2)} {unidade} · {fmtNum(pct, 0)}% · {texto}
        {parcial ? " (parcial: pode ser maior)" : ""}
      </p>
    </div>
  );
}

export function AvisoFonteMicro({ nome }: { nome: string }) {
  const codigo = codigoMicronutriente(nome);
  if (!codigo || !SO_NO_IBGE.includes(codigo)) return null;
  return <p className="mt-1 text-sm text-muted">A TACO não traz este nutriente: só os alimentos da fonte IBGE entram no total.</p>;
}

export function SugestaoMicros({ metas, onChange, contexto }: {
  metas: MetaMicroEditavel[];
  onChange: (metas: MetaMicroEditavel[]) => void;
  contexto: ContextoMicro;
}) {
  const sugerido = perfilSugerido(contexto);
  const [perfilId, setPerfilId] = useState(sugerido?.id ?? PERFIS_MICRO[0].id);
  const perfil = PERFIS_MICRO.find((p) => p.id === perfilId) ?? PERFIS_MICRO[0];
  const novas = montarSugestao(perfil, contexto, metas.map((m) => m.nome));
  const semReferencia = novas.some((n) => n.meta === "");
  const espaco = Math.max(0, 30 - metas.length);

  return (
    <div className="mt-3 rounded-lg bg-copper-soft p-3 text-sm">
      <div className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
        <Campo label="Sugerir pelo perfil do paciente">
          <Select value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
            {PERFIS_MICRO.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.id === sugerido?.id ? " (combina com o cadastro)" : ""}</option>)}
          </Select>
        </Campo>
        <Button type="button" variant="sand" disabled={!novas.length || !espaco} onClick={() => onChange([...metas, ...novas.slice(0, espaco)])}>
          {novas.length ? `Adicionar ${Math.min(novas.length, espaco)} nutrientes` : "Já adicionados"}
        </Button>
      </div>
      <p className="mt-2 text-ink-2">{perfil.porque}</p>
      <p className="mt-1 text-muted">
        {semReferencia
          ? "Metas em branco: não há referência automática para este paciente (menor de 19 anos, gestante, lactante ou sem sexo/idade). Preencha à mão."
          : "Metas pré-preenchidas com a referência para adultos (DRI) e tetos da OMS. Revise e ajuste ao caso."}
        {perfil.aviso ? ` ${perfil.aviso}` : ""}
      </p>
    </div>
  );
}

export function MetasMicroEditor({ metas, onChange, contexto }: {
  metas: MetaMicroEditavel[];
  onChange: (metas: MetaMicroEditavel[]) => void;
  contexto?: ContextoMicro;
}) {
  const lista = useId();
  function alterar(indice: number, valor: Partial<MetaMicroEditavel>) {
    onChange(metas.map((m, i) => i === indice ? { ...m, ...valor } : m));
  }

  return (
    <section className="mt-4 rounded-xl border border-line p-4">
      <h3 className="font-serif text-xl">Micronutrientes opcionais</h3>
      {contexto ? <SugestaoMicros metas={metas} onChange={onChange} contexto={contexto} /> : null}
      <datalist id={lista}>
        {CODIGOS_MICRO.map((codigo) => <option key={codigo} value={CATALOGO_MICRO[codigo][0]} />)}
      </datalist>
      {metas.map((m, i) => (
        <div key={i} className="mt-3">
          <div className="grid items-end gap-2 sm:grid-cols-[1fr_8rem_6rem_8rem_auto]">
            <Campo label="Nutriente">
              <Input list={lista} value={m.nome} maxLength={80} onChange={(e) => {
                const nome = e.target.value;
                const codigo = codigoMicronutriente(nome);
                alterar(i, { nome, unidade: codigo ? CATALOGO_MICRO[codigo][1] : m.unidade, tipo: codigo ? tipoPadraoMeta(codigo) : m.tipo });
              }} />
            </Campo>
            <Campo label="Meta diária">
              <Input value={m.meta} inputMode="decimal" onChange={(e) => alterar(i, { meta: e.target.value })} />
            </Campo>
            <Campo label="Unidade">
              <Select value={m.unidade} onChange={(e) => alterar(i, { unidade: e.target.value as MetaMicronutriente["unidade"] })}>
                <option>mg</option><option>µg</option><option>g</option>
              </Select>
            </Campo>
            <Campo label="A meta é">
              <Select value={m.tipo ?? tipoPadraoMeta(codigoMicronutriente(m.nome))} onChange={(e) => alterar(i, { tipo: e.target.value as TipoMeta })}>
                <option value="minimo">Mínimo</option><option value="teto">Teto</option>
              </Select>
            </Campo>
            <Button type="button" variant="ghost" onClick={() => onChange(metas.filter((_, n) => n !== i))}>Remover</Button>
          </div>
          <AvisoFonteMicro nome={m.nome} />
        </div>
      ))}
      <Button type="button" variant="sand" disabled={metas.length >= 30} onClick={() => onChange([...metas, { nome: "", unidade: "mg", meta: "" }])}>
        Adicionar micronutriente
      </Button>
    </section>
  );
}

export function ResumoMicronutrientes({ metas, itens }: {
  metas?: MetaMicronutriente[];
  itens?: ItemPlano[];
}) {
  if (!metas?.length) return null;

  return (
    <section className="mt-5">
      <h3 className="font-serif text-xl">Micronutrientes acompanhados</h3>
      <dl className="mt-2 divide-y divide-line text-sm">
        {metas.map(({ nome, unidade, meta, tipo }, i) => {
          const codigo = codigoMicronutriente(nome);
          const total = codigo && itens?.length ? somarMicronutriente(itens, codigo) : null;
          const unidadeTotal = codigo ? CATALOGO_MICRO[codigo][1] : "";
          const tipoMeta = tipo ?? tipoPadraoMeta(codigo);
          return (
            <div key={i} className="grid gap-1 py-2 sm:grid-cols-[1fr_2fr]">
              <dt className="font-medium">{nome}</dt>
              <dd className="text-ink-2">
                {tipoMeta === "teto" ? "Teto diário" : "Meta diária"} {fmtNum(meta, 3)} {unidade}
                {total?.medidos ? ` · ${total.semDados || total.tracos ? "Total parcial" : "Total do cardápio"} ${fmtNum(total.total, 3)} ${unidadeTotal}` : ""}
                {itens?.length && !total?.medidos ? " · Sem valor quantificado" : ""}
                {total?.tracos ? ` · ${total.tracos} com traços` : ""}
                {total?.semDados ? ` · ${total.semDados} sem dados` : ""}
                {total ? <BarraMicro total={{ ...total, total: converterUnidade(total.total, unidadeTotal, unidade) }} meta={meta} unidade={unidade} tipo={tipoMeta} /> : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
