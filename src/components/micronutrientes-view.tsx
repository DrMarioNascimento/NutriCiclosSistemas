import { useId } from "react";
import { fmtNum } from "@/lib/clinic/calc";
import { CATALOGO_MICRO, CODIGOS_MICRO, codigoMicronutriente, somarMicronutriente } from "@/lib/clinic/composicao-micro";
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
    return { nome, unidade: m.unidade, meta };
  });
}

export function MetasMicroEditor({ metas, onChange }: {
  metas: MetaMicroEditavel[];
  onChange: (metas: MetaMicroEditavel[]) => void;
}) {
  const lista = useId();
  function alterar(indice: number, valor: Partial<MetaMicroEditavel>) {
    onChange(metas.map((m, i) => i === indice ? { ...m, ...valor } : m));
  }

  return (
    <section className="mt-4 rounded-xl border border-line p-4">
      <h3 className="font-serif text-xl">Micronutrientes opcionais</h3>
      <datalist id={lista}>
        {CODIGOS_MICRO.map((codigo) => <option key={codigo} value={CATALOGO_MICRO[codigo][0]} />)}
      </datalist>
      {metas.map((m, i) => (
        <div key={i} className="mt-3 grid items-end gap-2 sm:grid-cols-[1fr_8rem_6rem_auto]">
          <Campo label="Nutriente">
            <Input list={lista} value={m.nome} maxLength={80} onChange={(e) => {
              const nome = e.target.value;
              const codigo = codigoMicronutriente(nome);
              alterar(i, { nome, unidade: codigo ? CATALOGO_MICRO[codigo][1] : m.unidade });
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
          <Button type="button" variant="ghost" onClick={() => onChange(metas.filter((_, n) => n !== i))}>Remover</Button>
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
        {metas.map(({ nome, unidade, meta }, i) => {
          const codigo = codigoMicronutriente(nome);
          const total = codigo && itens?.length ? somarMicronutriente(itens, codigo) : null;
          const unidadeTotal = codigo ? CATALOGO_MICRO[codigo][1] : "";
          return (
            <div key={i} className="grid gap-1 py-2 sm:grid-cols-[1fr_2fr]">
              <dt className="font-medium">{nome}</dt>
              <dd className="text-ink-2">
                Meta diária {fmtNum(meta, 3)} {unidade}
                {total?.medidos ? ` · ${total.semDados || total.tracos ? "Total parcial" : "Total do cardápio"} ${fmtNum(total.total, 3)} ${unidadeTotal}` : ""}
                {itens?.length && !total?.medidos ? " · Sem valor quantificado" : ""}
                {total?.tracos ? ` · ${total.tracos} com traços` : ""}
                {total?.semDados ? ` · ${total.semDados} sem dados` : ""}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
