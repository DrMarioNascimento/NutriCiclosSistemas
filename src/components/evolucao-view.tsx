import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { arred, fmtData, fmtNum } from "@/lib/clinic/calc";
import type { Avaliacao, Prontuario } from "@/lib/clinic/types";
import { Cartao, Select } from "./ui";

type Metrica = {
  id: string;
  rotulo: string;
  unidade: string;
  casas: number;
  ler: (a: Avaliacao) => number | null;
};

const METRICAS: Metrica[] = [
  { id: "peso", rotulo: "Peso", unidade: "kg", casas: 1, ler: (a) => a.peso },
  { id: "imc", rotulo: "IMC", unidade: "", casas: 1, ler: (a) => a.imc },
  { id: "cintura", rotulo: "Cintura", unidade: "cm", casas: 1, ler: (a) => a.cintura },
  { id: "gordura", rotulo: "Gordura", unidade: "%", casas: 1, ler: (a) => a.gorduraPct },
  { id: "massa", rotulo: "Massa muscular", unidade: "kg", casas: 1, ler: (a) => a.massaMuscular },
];

function rcq(a: Avaliacao): number | null {
  if (!a.cintura || !a.quadril) return null;
  return arred(a.cintura / a.quadril, 2);
}

function sinal(n: number, casas: number): string {
  const t = fmtNum(Math.abs(n), casas);
  if (n > 0) return `+${t}`;
  if (n < 0) return `−${t}`;
  return t;
}

export function EvolucaoPainel({ prontuario }: { prontuario: Prontuario }) {
  const avaliacoes = prontuario.avaliacoes;
  const crono = useMemo(() => [...avaliacoes].reverse(), [avaliacoes]);
  const disponiveis = METRICAS.filter((m) => crono.some((a) => m.ler(a) != null));
  const [metricaId, setMetricaId] = useState(disponiveis[0]?.id ?? "peso");
  const metrica = disponiveis.find((m) => m.id === metricaId) ?? disponiveis[0];

  if (crono.length === 0) {
    return <p className="text-sm text-ink-2">Ainda não há avaliação para acompanhar.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Cartao>
        <h2 className="font-serif text-2xl">Curva</h2>
        <p className="mt-1 text-sm text-ink-2">
          {crono.length === 1
            ? "Uma consulta no prontuário. A linha ganha forma quando houver a segunda avaliação."
            : "Da primeira consulta à mais recente. Gordura e massa muscular só entram se foram medidas."}
        </p>
        <div className="no-print mt-4 flex flex-wrap gap-2">
          {disponiveis.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetricaId(m.id)}
              className={
                m.id === metrica?.id
                  ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper"
                  : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"
              }
            >
              {m.rotulo}
            </button>
          ))}
        </div>
        {metrica ? <Curva crono={crono} metrica={metrica} /> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2 font-medium">Data</th>
                <th className="py-2 font-medium">Peso</th>
                <th className="py-2 font-medium">IMC</th>
                <th className="py-2 font-medium">Cintura</th>
                {crono.some((a) => a.gorduraPct != null) ? <th className="py-2 font-medium">Gordura</th> : null}
                {crono.some((a) => a.massaMuscular != null) ? <th className="py-2 font-medium">M. muscular</th> : null}
              </tr>
            </thead>
            <tbody>
              {crono.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="py-2">{fmtData(a.data)}</td>
                  <td className="py-2 tabular-nums">{fmtNum(a.peso, 1)} kg</td>
                  <td className="py-2 tabular-nums">{fmtNum(a.imc, 1)}</td>
                  <td className="py-2 tabular-nums">{a.cintura ? `${fmtNum(a.cintura, 0)} cm` : "—"}</td>
                  {crono.some((x) => x.gorduraPct != null) ? (
                    <td className="py-2 tabular-nums">{a.gorduraPct != null ? `${fmtNum(a.gorduraPct, 1)} %` : "—"}</td>
                  ) : null}
                  {crono.some((x) => x.massaMuscular != null) ? (
                    <td className="py-2 tabular-nums">{a.massaMuscular != null ? `${fmtNum(a.massaMuscular, 1)} kg` : "—"}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
      <Comparar crono={crono} limiteGordura={prontuario.clinica.variacaoBia} />
    </div>
  );
}

function Curva({ crono, metrica }: { crono: Avaliacao[]; metrica: Metrica }) {
  const pontos = crono
    .map((a) => {
      const valor = metrica.ler(a);
      return valor == null
        ? null
        : {
            data: a.data,
            rotulo: `${a.data.slice(8, 10)}/${a.data.slice(5, 7)}`,
            valor,
          };
    })
    .filter((p): p is { data: string; rotulo: string; valor: number } => p != null);

  if (pontos.length === 0) return null;

  return (
    <div className="mt-4 h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="rotulo" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            width={44}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { data: string; valor: number };
              return (
                <div className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink">
                  <p>{fmtData(p.data)}</p>
                  <p className="tabular-nums">
                    {fmtNum(p.valor, metrica.casas)}
                    {metrica.unidade ? ` ${metrica.unidade}` : ""}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="var(--color-copper)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--color-copper)", stroke: "var(--color-cream)" }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type Modo = "tabela" | "delta" | "lados";

const MEDIDAS: Array<{ id: string; rotulo: string; grupo: "corpo" | "composicao" | "energia" }> = [
  { id: "peso", rotulo: "Peso", grupo: "corpo" },
  { id: "altura", rotulo: "Altura", grupo: "corpo" },
  { id: "imc", rotulo: "IMC", grupo: "corpo" },
  { id: "cintura", rotulo: "Cintura", grupo: "corpo" },
  { id: "quadril", rotulo: "Quadril", grupo: "corpo" },
  { id: "rcq", rotulo: "Cintura/quadril", grupo: "corpo" },
  { id: "gordura", rotulo: "Gordura", grupo: "composicao" },
  { id: "massa", rotulo: "Massa muscular", grupo: "composicao" },
  { id: "tmb", rotulo: "TMB", grupo: "energia" },
  { id: "get", rotulo: "GET", grupo: "energia" },
  { id: "kcal", rotulo: "Meta calórica", grupo: "energia" },
  { id: "ptn", rotulo: "Proteína", grupo: "energia" },
  { id: "lip", rotulo: "Lipídios da meta", grupo: "energia" },
  { id: "cho", rotulo: "Carboidrato", grupo: "energia" },
];

function preferencia(): { modo: Modo; ids: string[] } {
  try {
    const cru = localStorage.getItem("nutriciclos-comparar");
    if (!cru) return { modo: "tabela", ids: MEDIDAS.map((m) => m.id) };
    const o = JSON.parse(cru) as { modo?: Modo; ids?: string[] };
    const modo = o.modo === "delta" || o.modo === "lados" ? o.modo : "tabela";
    const ids = Array.isArray(o.ids) ? o.ids.filter((id) => MEDIDAS.some((m) => m.id === id)) : MEDIDAS.map((m) => m.id);
    return { modo, ids: ids.length ? ids : MEDIDAS.map((m) => m.id) };
  } catch {
    return { modo: "tabela", ids: MEDIDAS.map((m) => m.id) };
  }
}

function Comparar({ crono, limiteGordura }: { crono: Avaliacao[]; limiteGordura: number }) {
  const [aId, setA] = useState(crono[0]?.id ?? 0);
  const [bId, setB] = useState(crono[crono.length - 1]?.id ?? 0);
  const [modo, setModo] = useState<Modo>("tabela");
  const [ids, setIds] = useState<string[]>(MEDIDAS.map((m) => m.id));
  const a = crono.find((x) => x.id === aId) ?? crono[0];
  const b = crono.find((x) => x.id === bId) ?? crono[crono.length - 1];

  useEffect(() => {
    const pref = preferencia();
    setModo(pref.modo);
    setIds(pref.ids);
  }, []);

  function gravar(proximoModo: Modo, proximoIds: string[]) {
    setModo(proximoModo);
    setIds(proximoIds);
    try {
      localStorage.setItem("nutriciclos-comparar", JSON.stringify({ modo: proximoModo, ids: proximoIds }));
    } catch {
      /* a escolha vale nesta visita */
    }
  }

  function grupo(nome: "corpo" | "composicao" | "energia") {
    gravar(modo, MEDIDAS.filter((m) => m.grupo === nome).map((m) => m.id));
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Comparar</h2>
      {crono.length < 2 || !a || !b ? (
        <p className="mt-2 text-sm text-ink-2">Escolha duas avaliações quando houver a próxima consulta. O delta é B menos A.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-2">A é a referência. B é a consulta que se compara com ela. O delta é B − A.</p>
          <div className="no-print mt-4 grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-ink-2">
              Avaliação A
              <Select className="mt-1" value={a.id} onChange={(e) => setA(Number(e.target.value))}>
                {crono.map((item) => (
                  <option key={item.id} value={item.id}>
                    {fmtData(item.data)} · {fmtNum(item.peso, 1)} kg
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-sm text-ink-2">
              Avaliação B
              <Select className="mt-1" value={b.id} onChange={(e) => setB(Number(e.target.value))}>
                {crono.map((item) => (
                  <option key={item.id} value={item.id}>
                    {fmtData(item.data)} · {fmtNum(item.peso, 1)} kg
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="no-print mt-4 flex flex-wrap gap-2">
            {(
              [
                ["tabela", "Tabela"],
                ["delta", "Só a diferença"],
                ["lados", "Lado a lado"],
              ] as const
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                onClick={() => gravar(chave, ids)}
                className={
                  modo === chave
                    ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper"
                    : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"
                }
              >
                {rotulo}
              </button>
            ))}
          </div>
          <div className="no-print mt-3 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 text-sm text-copper-deep" onClick={() => gravar(modo, MEDIDAS.map((m) => m.id))}>
              Tudo
            </button>
            <button type="button" className="min-h-11 text-sm text-copper-deep" onClick={() => grupo("corpo")}>
              Antropometria
            </button>
            <button type="button" className="min-h-11 text-sm text-copper-deep" onClick={() => grupo("composicao")}>
              Composição
            </button>
            <button type="button" className="min-h-11 text-sm text-copper-deep" onClick={() => grupo("energia")}>
              Energia
            </button>
          </div>
          <div className="no-print mt-2 flex flex-wrap gap-2">
            {MEDIDAS.map((m) => {
              const ativo = ids.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => gravar(modo, ativo ? ids.filter((id) => id !== m.id) : [...ids, m.id])}
                  className={
                    ativo
                      ? "min-h-9 rounded-full border border-copper px-3 text-sm text-copper-deep"
                      : "min-h-9 rounded-full border border-line px-3 text-sm text-muted"
                  }
                >
                  {m.rotulo}
                </button>
              );
            })}
          </div>
          {a.id === b.id ? (
            <p className="mt-4 text-sm text-amber">Escolha duas datas diferentes.</p>
          ) : ids.length === 0 ? (
            <p className="mt-4 text-sm text-ink-2">Marque ao menos uma medida.</p>
          ) : (
            <TabelaDelta a={a} b={b} limiteGordura={limiteGordura} ids={ids} modo={modo} />
          )}
        </>
      )}
    </Cartao>
  );
}

function TabelaDelta({
  a,
  b,
  limiteGordura,
  ids,
  modo,
}: {
  a: Avaliacao;
  b: Avaliacao;
  limiteGordura: number;
  ids: string[];
  modo: Modo;
}) {
  const linhas: Array<{ id: string; rotulo: string; va: number | null; vb: number | null; casas: number; unidade: string }> = [
    { id: "peso", rotulo: "Peso", va: a.peso, vb: b.peso, casas: 1, unidade: "kg" },
    { id: "altura", rotulo: "Altura", va: a.altura, vb: b.altura, casas: 0, unidade: "cm" },
    { id: "imc", rotulo: "IMC", va: a.imc, vb: b.imc, casas: 1, unidade: "" },
    { id: "cintura", rotulo: "Cintura", va: a.cintura, vb: b.cintura, casas: 1, unidade: "cm" },
    { id: "quadril", rotulo: "Quadril", va: a.quadril, vb: b.quadril, casas: 1, unidade: "cm" },
    { id: "rcq", rotulo: "Cintura/quadril", va: rcq(a), vb: rcq(b), casas: 2, unidade: "" },
    { id: "gordura", rotulo: "Gordura", va: a.gorduraPct, vb: b.gorduraPct, casas: 1, unidade: "%" },
    { id: "massa", rotulo: "Massa muscular", va: a.massaMuscular, vb: b.massaMuscular, casas: 1, unidade: "kg" },
    { id: "tmb", rotulo: "TMB", va: a.tmb, vb: b.tmb, casas: 0, unidade: "kcal" },
    { id: "get", rotulo: "GET", va: a.get, vb: b.get, casas: 0, unidade: "kcal" },
    { id: "kcal", rotulo: "Meta calórica", va: a.kcalMeta, vb: b.kcalMeta, casas: 0, unidade: "kcal" },
    { id: "ptn", rotulo: "Proteína", va: a.protMeta, vb: b.protMeta, casas: 0, unidade: "g" },
    { id: "lip", rotulo: "Lipídios da meta", va: a.lipMeta, vb: b.lipMeta, casas: 0, unidade: "g" },
    { id: "cho", rotulo: "Carboidrato", va: a.carbMeta, vb: b.carbMeta, casas: 0, unidade: "g" },
  ];
  const visiveis = linhas.filter((l) => ids.includes(l.id) && (l.va != null || l.vb != null));
  const celula = (v: number | null, casas: number, unidade: string) =>
    v == null ? "—" : `${fmtNum(v, casas)}${unidade ? ` ${unidade}` : ""}`;

  return (
    <div className="mt-4">
      {visiveis.length === 0 ? <p className="text-sm text-muted">Essas medidas não foram preenchidas nas duas datas.</p> : null}
      {modo === "lados" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-cream px-4 py-3">
            <p className="font-serif text-lg text-copper-deep">A · {fmtData(a.data)}</p>
            <dl className="mt-2">
              {visiveis.map((l) => (
                <div key={l.id} className="flex justify-between gap-3 border-t border-line py-2 text-sm first:border-t-0">
                  <dt className="text-ink-2">{l.rotulo}</dt>
                  <dd className="tabular-nums text-ink">{celula(l.va, l.casas, l.unidade)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border border-line bg-cream px-4 py-3">
            <p className="font-serif text-lg text-copper-deep">B · {fmtData(b.data)}</p>
            <dl className="mt-2">
              {visiveis.map((l) => {
                const delta = l.va != null && l.vb != null ? arred(l.vb - l.va, l.casas) : null;
                return (
                  <div key={l.id} className="flex justify-between gap-3 border-t border-line py-2 text-sm first:border-t-0">
                    <dt className="text-ink-2">{l.rotulo}</dt>
                    <dd className="text-right tabular-nums text-ink">
                      {celula(l.vb, l.casas, l.unidade)}
                      {delta != null ? <span className="mt-0.5 block text-xs text-muted">{sinal(delta, l.casas)}</span> : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2 font-medium">Medida</th>
                {modo === "tabela" ? <th className="py-2 font-medium">A · {fmtData(a.data)}</th> : null}
                {modo === "tabela" ? <th className="py-2 font-medium">B · {fmtData(b.data)}</th> : null}
                <th className="py-2 font-medium">B − A</th>
                <th className="py-2 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => {
                const delta = l.va != null && l.vb != null ? arred(l.vb - l.va, l.casas) : null;
                const pct = delta != null && l.va ? arred((delta / l.va) * 100, 1) : null;
                return (
                  <tr key={l.id} className="border-t border-line">
                    <td className="py-2">{l.rotulo}</td>
                    {modo === "tabela" ? <td className="py-2 tabular-nums">{celula(l.va, l.casas, l.unidade)}</td> : null}
                    {modo === "tabela" ? <td className="py-2 tabular-nums">{celula(l.vb, l.casas, l.unidade)}</td> : null}
                    <td className="py-2 tabular-nums">{delta == null ? "—" : `${sinal(delta, l.casas)}${l.unidade ? ` ${l.unidade}` : ""}`}</td>
                    <td className="py-2 tabular-nums">{pct == null ? "—" : `${sinal(pct, 1)} %`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {ids.includes("gordura") && a.gorduraPct != null && b.gorduraPct != null && Math.abs(b.gorduraPct - a.gorduraPct) > limiteGordura ? (
        <p className="mt-3 text-sm text-amber">
          A gordura variou mais de {fmtNum(limiteGordura, 1)} ponto. Pode ser o método da bioimpedância, não só a composição.
        </p>
      ) : null}
      {a.equipamento && b.equipamento && a.equipamento !== b.equipamento ? (
        <p className="mt-2 text-sm text-muted">Equipamentos diferentes: {a.equipamento} e {b.equipamento}.</p>
      ) : null}
    </div>
  );
}
