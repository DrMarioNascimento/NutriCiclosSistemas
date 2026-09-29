import { useState, type FormEvent } from "react";
import { excluirRecordatorio, salvarRecordatorio, TIPOS_RELATO } from "@/lib/clinic/api";
import { fmtData } from "@/lib/clinic/calc";
import type { Prontuario, Recordatorio, RelatoRefeicao } from "@/lib/clinic/types";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea } from "./ui";

function vazias(): RelatoRefeicao[] {
  return Array.from({ length: 7 }, () => ({ hora: "", relato: "", obs: "" }));
}

export function RecordatorioPainel({
  prontuario,
  onMudou,
}: {
  prontuario: Prontuario;
  onMudou: () => Promise<void>;
}) {
  const lista = prontuario.recordatorios;
  const [sel, setSel] = useState<number | "novo">(lista[0]?.id ?? "novo");
  const atual = sel === "novo" ? null : lista.find((r) => r.id === sel) ?? lista[0] ?? null;

  return (
    <div>
      <div className="no-print flex flex-wrap gap-2">
        {lista.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSel(r.id)}
            className={
              atual?.id === r.id
                ? "min-h-11 rounded-full bg-ink px-4 text-sm text-paper"
                : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"
            }
          >
            {fmtData(r.data)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSel("novo")}
          className={
            sel === "novo"
              ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper"
              : "min-h-11 rounded-full bg-copper-soft px-4 text-sm text-copper-deep"
          }
        >
          Novo
        </button>
      </div>
      <FormRelato
        key={atual ? atual.id : "novo"}
        prontuario={prontuario}
        registro={sel === "novo" ? null : atual}
        onSalvo={async (id) => {
          setSel(id);
          await onMudou();
        }}
        onApagado={async () => {
          setSel("novo");
          await onMudou();
        }}
      />
    </div>
  );
}

function FormRelato({
  prontuario,
  registro,
  onSalvo,
  onApagado,
}: {
  prontuario: Prontuario;
  registro: Recordatorio | null;
  onSalvo: (id: number) => Promise<void>;
  onApagado: () => Promise<void>;
}) {
  const [data, setData] = useState(registro?.data ?? prontuario.hoje);
  const [tipo, setTipo] = useState<(typeof TIPOS_RELATO)[number]>(
    (TIPOS_RELATO as readonly string[]).includes(registro?.tipo ?? "")
      ? (registro!.tipo as (typeof TIPOS_RELATO)[number])
      : "Recordatório 24 horas",
  );
  const [queixa, setQueixa] = useState(registro?.queixa ?? "");
  const [refeicoes, setRefeicoes] = useState<RelatoRefeicao[]>(registro?.refeicoes ?? vazias());
  const [gosta, setGosta] = useState(registro?.gosta ?? "");
  const [naoGosta, setNaoGosta] = useState(registro?.naoGosta ?? "");
  const [alergias, setAlergias] = useState(registro?.alergias ?? prontuario.paciente.alergias);
  const [restricoes, setRestricoes] = useState(registro?.restricoes ?? "");
  const [quemCozinha, setQuemCozinha] = useState(registro?.quemCozinha ?? "");
  const [rotina, setRotina] = useState(registro?.rotina ?? "");
  const [agua, setAgua] = useState(registro?.agua ?? "");
  const [bebidas, setBebidas] = useState(registro?.bebidas ?? "");
  const [sono, setSono] = useState(registro?.sonoApetite ?? "");
  const [atividade, setAtividade] = useState(registro?.atividade ?? "");
  const [suplementos, setSuplementos] = useState(registro?.suplementos ?? "");
  const [digestao, setDigestao] = useState(registro?.digestao ?? "");
  const [orcamento, setOrcamento] = useState(registro?.orcamento ?? "");
  const [obs, setObs] = useState(registro?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const preenchidas = refeicoes.filter((r) => r.relato.trim()).length;

  function patch(i: number, parcial: Partial<RelatoRefeicao>) {
    setRefeicoes((lista) => lista.map((r, idx) => (idx === i ? { ...r, ...parcial } : r)));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro(null);
    try {
      const res = await salvarRecordatorio({
        data: {
          id: registro?.id,
          pacienteId: prontuario.paciente.id,
          data,
          tipo,
          queixa,
          refeicoes,
          gosta,
          naoGosta,
          alergias,
          restricoes,
          quemCozinha,
          rotina,
          agua,
          bebidas,
          sonoApetite: sono,
          atividade,
          suplementos,
          digestao,
          orcamento,
          observacoes: obs,
        },
      });
      await onSalvo(res.id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível gravar o relato.");
    } finally {
      setOcupado(false);
    }
  }

  async function apagar() {
    if (!registro) return;
    if (!window.confirm("Apagar este recordatório?")) return;
    setOcupado(true);
    setErro(null);
    try {
      await excluirRecordatorio({ data: { id: registro.id } });
      await onApagado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível apagar.");
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      <Cartao className="mt-4">
        <h2 className="font-serif text-2xl">{registro ? "Relato" : "Novo relato"}</h2>
        <p className="mt-1 text-sm text-ink-2">
          Texto livre, como na planilha. Não calcula nutrientes — isso fica no cardápio.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Campo label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Campo>
          <Campo label="Tipo de relato">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as (typeof TIPOS_RELATO)[number])}>
              {TIPOS_RELATO.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <div className="md:col-span-2">
            <Campo label="Queixa principal">
              <Input value={queixa} onChange={(e) => setQueixa(e.target.value)} />
            </Campo>
          </div>
        </div>
        <p className="mt-5 text-sm text-muted">
          Refeições · {preenchidas === 1 ? "1 descrita" : `${preenchidas} descritas`}
        </p>
        <div className="mt-2">
          {refeicoes.map((ref, i) => (
            <div key={i} className="grid items-center gap-2 border-t border-line py-3 md:grid-cols-[1.25rem_6.5rem_1fr_1fr]">
              <span className="text-sm tabular-nums text-muted">{i + 1}</span>
              <Input
                value={ref.hora}
                onChange={(e) => patch(i, { hora: e.target.value })}
                placeholder="Hora"
                aria-label={`Hora da refeição ${i + 1}`}
                inputMode="numeric"
              />
              <Input
                value={ref.relato}
                onChange={(e) => patch(i, { relato: e.target.value })}
                placeholder="O que comeu e bebeu"
                aria-label={`Relato da refeição ${i + 1}`}
              />
              <Input
                value={ref.obs}
                onChange={(e) => patch(i, { obs: e.target.value })}
                placeholder="Observação"
                aria-label={`Observação da refeição ${i + 1}`}
              />
            </div>
          ))}
        </div>
      </Cartao>
      <Cartao className="mt-4">
        <h2 className="font-serif text-2xl">Contexto</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Campo label="Gosta de">
            <Input value={gosta} onChange={(e) => setGosta(e.target.value)} />
          </Campo>
          <Campo label="Não gosta de">
            <Input value={naoGosta} onChange={(e) => setNaoGosta(e.target.value)} />
          </Campo>
          <Campo label="Alergias neste relato">
            <Input value={alergias} onChange={(e) => setAlergias(e.target.value)} />
          </Campo>
          <Campo label="Restrições">
            <Input value={restricoes} onChange={(e) => setRestricoes(e.target.value)} />
          </Campo>
          <Campo label="Quem cozinha">
            <Input value={quemCozinha} onChange={(e) => setQuemCozinha(e.target.value)} />
          </Campo>
          <Campo label="Água">
            <Input value={agua} onChange={(e) => setAgua(e.target.value)} placeholder="litros por dia" />
          </Campo>
          <div className="md:col-span-2">
            <Campo label="Rotina">
              <Textarea value={rotina} onChange={(e) => setRotina(e.target.value)} />
            </Campo>
          </div>
          <Campo label="Outras bebidas">
            <Input value={bebidas} onChange={(e) => setBebidas(e.target.value)} />
          </Campo>
          <Campo label="Sono e apetite">
            <Input value={sono} onChange={(e) => setSono(e.target.value)} />
          </Campo>
          <Campo label="Atividade física">
            <Input value={atividade} onChange={(e) => setAtividade(e.target.value)} />
          </Campo>
          <Campo label="Suplementos">
            <Input value={suplementos} onChange={(e) => setSuplementos(e.target.value)} />
          </Campo>
          <Campo label="Digestão / intestino">
            <Input value={digestao} onChange={(e) => setDigestao(e.target.value)} />
          </Campo>
          <Campo label="Orçamento para alimentação">
            <Input value={orcamento} onChange={(e) => setOrcamento(e.target.value)} />
          </Campo>
          <div className="md:col-span-2">
            <Campo label="Observações">
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </Campo>
          </div>
        </div>
      </Cartao>
      <div className="no-print mt-4">
        <Erro>{erro}</Erro>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit" disabled={ocupado}>
            Gravar relato
          </Button>
          {registro ? (
            <Button type="button" variant="ghost" disabled={ocupado} onClick={apagar}>
              Apagar
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
