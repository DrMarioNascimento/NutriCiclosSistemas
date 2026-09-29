import { useState } from "react";
import { criarCardapio, excluirDieta, salvarDieta } from "@/lib/clinic/api";
import { fmtData, fmtNum } from "@/lib/clinic/calc";
import type { Dieta, Prontuario, RefeicaoDieta } from "@/lib/clinic/types";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea } from "./ui";

function rascunho(prontuario: Prontuario): Omit<Dieta, "id"> & { id?: number } {
  const aval = prontuario.avaliacoes[0];
  const refeicoes: RefeicaoDieta[] = (
    prontuario.listas.refeicoes.length ? prontuario.listas.refeicoes : [{ nome: "Almoço", hora: "12:00" }]
  ).map((r) => ({ nome: r.nome, hora: r.hora, substituicoes: "" }));
  return {
    tipo: "paciente",
    pacienteId: prontuario.paciente.id,
    nome: aval ? `Dieta ${fmtData(aval.data)}` : "Nova dieta",
    data: prontuario.hoje,
    indicacao: "",
    kcalMeta: aval?.kcalMeta ?? 0,
    protMeta: aval?.protMeta ?? 0,
    carbMeta: aval?.carbMeta ?? 0,
    lipMeta: aval?.lipMeta ?? 0,
    observacoes: "",
    refeicoes,
  };
}

export function DietaPainel({
  prontuario,
  onMudou,
  onIr,
}: {
  prontuario: Prontuario;
  onMudou: () => Promise<void>;
  onIr: (aba: "cardapio") => void;
}) {
  const [sel, setSel] = useState<number | "nova">(prontuario.dietas[0]?.id ?? "nova");
  const dieta = sel === "nova" ? null : prontuario.dietas.find((d) => d.id === sel) ?? null;

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto">
        {prontuario.dietas.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setSel(d.id)}
            className={sel === d.id ? "min-h-11 shrink-0 rounded-full bg-ink px-4 text-sm text-paper" : "min-h-11 shrink-0 rounded-full bg-sand px-4 text-sm text-ink"}
          >
            {d.nome}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSel("nova")}
          className={sel === "nova" ? "min-h-11 shrink-0 rounded-full bg-copper px-4 text-sm text-paper" : "min-h-11 shrink-0 rounded-full bg-copper-soft px-4 text-sm text-copper-deep"}
        >
          Nova dieta
        </button>
      </div>
      <Editor
        key={sel === "nova" ? "nova" : sel}
        base={dieta ?? rascunho(prontuario)}
        modelos={prontuario.modelosDieta}
        pacienteId={prontuario.paciente.id}
        onMudou={onMudou}
        onSalvo={(id) => setSel(id)}
        onIr={onIr}
      />
    </div>
  );
}

function Editor({
  base,
  modelos,
  pacienteId,
  onMudou,
  onSalvo,
  onIr,
}: {
  base: Omit<Dieta, "id"> & { id?: number };
  modelos: Dieta[];
  pacienteId: number;
  onMudou: () => Promise<void>;
  onSalvo: (id: number | "nova") => void;
  onIr: (aba: "cardapio") => void;
}) {
  const [nome, setNome] = useState(base.nome);
  const [data, setData] = useState(base.data);
  const [kcal, setKcal] = useState(base.kcalMeta ? String(base.kcalMeta) : "");
  const [prot, setProt] = useState(base.protMeta ? String(base.protMeta) : "");
  const [carb, setCarb] = useState(base.carbMeta ? String(base.carbMeta) : "");
  const [lip, setLip] = useState(base.lipMeta ? String(base.lipMeta) : "");
  const [obs, setObs] = useState(base.observacoes);
  const [refeicoes, setRefeicoes] = useState<RefeicaoDieta[]>(base.refeicoes);
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? 0);
  const [tituloModelo, setTituloModelo] = useState("");
  const [indicacao, setIndicacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const n = (s: string) => Number(s.replace(",", ".")) || 0;
  const kcalN = n(kcal);
  const protN = n(prot);
  const carbN = n(carb);
  const lipN = n(lip);
  const vet = protN * 4 + carbN * 4 + lipN * 9;

  function payload(tipo: "paciente" | "modelo", id?: number, nomeDieta = nome, indicacaoDieta = tipo === "modelo" ? indicacao : "") {
    return {
      id,
      pacienteId: tipo === "paciente" ? pacienteId : null,
      tipo,
      nome: nomeDieta,
      data,
      indicacao: indicacaoDieta,
      kcalMeta: kcalN,
      protMeta: protN,
      carbMeta: carbN,
      lipMeta: lipN,
      observacoes: obs,
      refeicoes: refeicoes.filter((r) => r.nome.trim()).map((r) => ({ nome: r.nome.trim(), hora: r.hora.trim(), substituicoes: r.substituicoes.trim() })),
    };
  }

  async function gravar() {
    if (!refeicoes.some((r) => r.nome.trim())) {
      setErro("Deixe ao menos uma refeição.");
      return null;
    }
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      const res = await salvarDieta({ data: payload("paciente", base.id) });
      await onMudou();
      onSalvo(res.id);
      setOk("Dieta gravada.");
      return res.id;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar a dieta.");
      return null;
    } finally {
      setOcupado(false);
    }
  }

  function aplicarModelo() {
    const modelo = modelos.find((m) => m.id === modeloId);
    if (!modelo) return;
    setNome(modelo.nome);
    setKcal(modelo.kcalMeta ? String(modelo.kcalMeta) : "");
    setProt(modelo.protMeta ? String(modelo.protMeta) : "");
    setCarb(modelo.carbMeta ? String(modelo.carbMeta) : "");
    setLip(modelo.lipMeta ? String(modelo.lipMeta) : "");
    setObs(modelo.observacoes);
    setRefeicoes(modelo.refeicoes.map((r) => ({ ...r })));
    setOk(`Modelo “${modelo.nome}” copiado. Grave para ficar no prontuário.`);
  }

  return (
    <Cartao className="mt-4">
      <h2 className="font-serif text-2xl">Dieta</h2>
      <p className="mt-1 text-sm text-ink-2">
        Metas e substituições, antes dos alimentos. O cardápio nasce daqui. Um modelo, como “Pacientes hipertensos”, se escreve uma vez.
      </p>
      {modelos.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Campo label="Modelo de dieta">
            <Select value={String(modeloId)} onChange={(e) => setModeloId(Number(e.target.value))}>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.indicacao ? ` · ${m.indicacao}` : ""}
                </option>
              ))}
            </Select>
          </Campo>
          <Button type="button" variant="sand" onClick={aplicarModelo}>
            Copiar modelo
          </Button>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Campo label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>
        <Campo label="Energia, kcal">
          <Input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Proteína, g">
          <Input value={prot} onChange={(e) => setProt(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Carboidrato, g">
          <Input value={carb} onChange={(e) => setCarb(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Lipídio, g">
          <Input value={lip} onChange={(e) => setLip(e.target.value)} inputMode="decimal" />
        </Campo>
      </div>
      {vet > 0 ? (
        <p className="mt-3 text-sm text-ink-2">
          Os macros fecham {fmtNum(vet, 0)} kcal
          {kcalN > 0 ? ` · ${fmtNum((vet / kcalN) * 100, 0)}% da meta de energia` : ""}. Proteína {fmtNum((protN * 4 * 100) / vet, 0)}%, carboidrato{" "}
          {fmtNum((carbN * 4 * 100) / vet, 0)}%, lipídio {fmtNum((lipN * 9 * 100) / vet, 0)}%.
        </p>
      ) : null}
      <h3 className="mt-6 font-serif text-xl">Refeições</h3>
      <div className="mt-3 flex flex-col gap-4">
        {refeicoes.map((r, i) => (
          <div key={i} className="border-t border-line pt-3">
            <div className="grid gap-2 md:grid-cols-[1fr_8rem_auto]">
              <Campo label="Refeição">
                <Input value={r.nome} onChange={(e) => setRefeicoes((lista) => lista.map((item, n) => (n === i ? { ...item, nome: e.target.value } : item)))} />
              </Campo>
              <Campo label="Hora">
                <Input value={r.hora} onChange={(e) => setRefeicoes((lista) => lista.map((item, n) => (n === i ? { ...item, hora: e.target.value } : item)))} placeholder="12:00" />
              </Campo>
              <button type="button" className="min-h-11 self-end text-sm text-amber" onClick={() => setRefeicoes((lista) => lista.filter((_, n) => n !== i))}>
                Tirar
              </button>
            </div>
            <div className="mt-2">
              <Campo label="Substituições e orientações">
                <Textarea
                  rows={2}
                  value={r.substituicoes}
                  onChange={(e) => setRefeicoes((lista) => lista.map((item, n) => (n === i ? { ...item, substituicoes: e.target.value } : item)))}
                  placeholder="Arroz integral ou batata. Sem fritura."
                />
              </Campo>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button type="button" variant="sand" onClick={() => setRefeicoes((lista) => [...lista, { nome: "", hora: "", substituicoes: "" }])}>
          Outra refeição
        </Button>
      </div>
      <div className="mt-4">
        <Campo label="Observações gerais">
          <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Saem na hidratação do cardápio, se não houver outro texto." />
        </Campo>
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">{ok}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={ocupado} onClick={() => void gravar()}>
          Gravar dieta
        </Button>
        <Button
          type="button"
          variant="sand"
          disabled={ocupado}
          onClick={async () => {
            const id = await gravar();
            if (!id) return;
            setOcupado(true);
            try {
              await criarCardapio({ data: { pacienteId, origem: "dieta", origemId: id } });
              await onMudou();
              onIr("cardapio");
            } catch (e) {
              setErro(e instanceof Error ? e.message : "A dieta foi gravada, mas o cardápio não.");
            } finally {
              setOcupado(false);
            }
          }}
        >
          Levar ao cardápio
        </Button>
        {base.id ? (
          <Button
            type="button"
            variant="ghost"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              setErro(null);
              try {
                await excluirDieta({ data: { id: base.id! } });
                await onMudou();
                onSalvo("nova");
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não foi possível apagar.");
              } finally {
                setOcupado(false);
              }
            }}
          >
            Apagar
          </Button>
        ) : null}
      </div>
      <div className="mt-6 grid gap-3 border-t border-line pt-4 md:grid-cols-[1fr_1fr_auto]">
        <Campo label="Guardar como modelo">
          <Input value={tituloModelo} onChange={(e) => setTituloModelo(e.target.value)} placeholder="Pacientes hipertensos" />
        </Campo>
        <Campo label="Indicação">
          <Input value={indicacao} onChange={(e) => setIndicacao(e.target.value)} placeholder="Hipertensão, sem adição de sal" />
        </Campo>
        <div className="self-end">
          <Button
            type="button"
            variant="sand"
            disabled={ocupado}
            onClick={async () => {
              if (tituloModelo.trim().length < 2) {
                setErro("Dê um nome ao modelo.");
                return;
              }
              setOcupado(true);
              setErro(null);
              setOk(null);
              try {
                await salvarDieta({ data: payload("modelo", undefined, tituloModelo.trim(), indicacao.trim()) });
                await onMudou();
                setTituloModelo("");
                setIndicacao("");
                setOk("Modelo guardado. Serve para o próximo paciente.");
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não foi possível guardar o modelo.");
              } finally {
                setOcupado(false);
              }
            }}
          >
            Guardar modelo
          </Button>
        </div>
      </div>
    </Cartao>
  );
}
