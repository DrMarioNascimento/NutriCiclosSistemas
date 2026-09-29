import { useMemo, useState } from "react";
import { excluirExame, guardarRequisicao, salvarExames } from "@/lib/clinic/api";
import { fmtData, situacaoExame } from "@/lib/clinic/calc";
import type { Exame, Prontuario } from "@/lib/clinic/types";
import { FolhaPapel } from "./folha-papel";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea } from "./ui";

type Linha = {
  exame: string;
  outro: string;
  resultado: string;
  unidade: string;
  referencia: string;
  observacao: string;
};

function vazia(): Linha {
  return { exame: "", outro: "", resultado: "", unidade: "", referencia: "", observacao: "" };
}

function nomeDa(linha: Linha): string {
  return linha.exame === "__outro__" ? linha.outro.trim() : linha.exame.trim();
}

export function ExamesPainel({
  prontuario,
  onMudou,
}: {
  prontuario: Prontuario;
  onMudou: () => Promise<void>;
}) {
  const [data, setData] = useState(prontuario.hoje);
  const [linhas, setLinhas] = useState<Linha[]>([vazia()]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [requisicao, setRequisicao] = useState(false);

  function patch(i: number, parcial: Partial<Linha>) {
    setLinhas((lista) => lista.map((l, idx) => (idx === i ? { ...l, ...parcial } : l)));
  }

  async function gravar() {
    const itens = linhas
      .map((l) => ({
        exame: nomeDa(l),
        resultado: l.resultado.trim(),
        unidade: l.unidade.trim(),
        referencia: l.referencia.trim(),
        observacao: l.observacao.trim(),
      }))
      .filter((l) => l.exame || l.resultado);
    if (itens.length === 0 || itens.some((l) => !l.exame || !l.resultado)) {
      setErro("Escolha o exame e informe o resultado.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      await salvarExames({ data: { pacienteId: prontuario.paciente.id, data, itens } });
      setLinhas([vazia()]);
      await onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar os exames.");
    } finally {
      setOcupado(false);
    }
  }

  const grupos = useMemo(() => {
    const mapa = new Map<string, Exame[]>();
    for (const exame of prontuario.exames) {
      const lista = mapa.get(exame.data) ?? [];
      lista.push(exame);
      mapa.set(exame.data, lista);
    }
    return [...mapa.entries()];
  }, [prontuario.exames]);

  return (
    <div className="flex flex-col gap-4">
      <Cartao>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">Resultados</h2>
            <p className="mt-1 text-sm text-ink-2">
              A faixa vem do catálogo da clínica. Abaixo ou acima da referência fica marcado. Hemograma e hormônios sem faixa ficam só registrados.
            </p>
          </div>
          <Button type="button" variant="sand" onClick={() => setRequisicao(true)}>
            Requisição
          </Button>
        </div>
        <div className="mt-4 max-w-xs">
          <Campo label="Data da coleta">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Campo>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {linhas.map((linha, i) => {
            const situacao = situacaoExame(linha.resultado, linha.referencia);
            return (
              <div key={i} className="grid gap-2 border-t border-line pt-3 md:grid-cols-4">
                <Campo label="Exame">
                  <Select
                    value={linha.exame}
                    onChange={(e) => {
                      const nome = e.target.value;
                      const cat = prontuario.referencias.find((ex) => ex.nome === nome);
                      patch(i, {
                        exame: nome,
                        unidade: cat ? cat.unidade : linha.unidade,
                        referencia: cat ? cat.referencia : linha.referencia,
                      });
                    }}
                  >
                    <option value="">Escolha</option>
                    {prontuario.referencias.map((ex) => (
                      <option key={ex.nome} value={ex.nome}>
                        {ex.nome}
                      </option>
                    ))}
                    <option value="__outro__">Outro</option>
                  </Select>
                </Campo>
                {linha.exame === "__outro__" ? (
                  <Campo label="Nome">
                    <Input value={linha.outro} onChange={(e) => patch(i, { outro: e.target.value })} />
                  </Campo>
                ) : null}
                <Campo label="Resultado">
                  <Input value={linha.resultado} onChange={(e) => patch(i, { resultado: e.target.value })} inputMode="decimal" />
                </Campo>
                <Campo label="Unidade">
                  <Input value={linha.unidade} onChange={(e) => patch(i, { unidade: e.target.value })} />
                </Campo>
                <Campo label="Referência">
                  <Input value={linha.referencia} onChange={(e) => patch(i, { referencia: e.target.value })} placeholder="70-99" />
                </Campo>
                <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-2">
                  <p className={situacao === "Abaixo" || situacao === "Acima" ? "text-sm text-amber" : "text-sm text-muted"}>
                    {situacao ? situacao : "Situação aparece com resultado e referência."}
                    {linha.unidade ? ` · ${linha.unidade}` : ""}
                  </p>
                  {linhas.length > 1 ? (
                    <button type="button" className="min-h-11 text-sm text-amber" onClick={() => setLinhas((lista) => lista.filter((_, idx) => idx !== i))}>
                      Tirar linha
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="sand" onClick={() => setLinhas((lista) => [...lista, vazia()])}>
            Outro exame
          </Button>
          <Button type="button" disabled={ocupado} onClick={gravar}>
            Gravar coleta
          </Button>
        </div>
        <div className="mt-3">
          <Erro>{erro}</Erro>
        </div>
      </Cartao>

      <Cartao>
        <h2 className="font-serif text-2xl">Histórico</h2>
        {grupos.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">Nenhum resultado. A planilha deste paciente também não tinha exames lançados.</p>
        ) : (
          grupos.map(([dia, itens]) => (
            <section key={dia} className="mt-4">
              <h3 className="text-sm font-medium text-ink">{fmtData(dia)}</h3>
              <ul>
                {itens.map((exame) => (
                  <li key={exame.id} className="flex items-start justify-between gap-3 border-t border-line py-2 text-sm">
                    <span>
                      <span className="text-ink">{exame.exame}</span>
                      <span className="block tabular-nums text-muted">
                        {exame.resultado}
                        {exame.unidade ? ` ${exame.unidade}` : ""}
                        {exame.referencia ? ` · ref. ${exame.referencia}` : ""}
                        {exame.situacao ? ` · ${exame.situacao}` : ""}
                      </span>
                      {exame.observacao ? <span className="block text-ink-2">{exame.observacao}</span> : null}
                    </span>
                    <button
                      type="button"
                      className="no-print min-h-11 shrink-0 text-amber"
                      onClick={async () => {
                        await excluirExame({ data: { id: exame.id } });
                        await onMudou();
                      }}
                    >
                      Tirar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </Cartao>

      {requisicao ? (
        <Requisicao
          prontuario={prontuario}
          onFechar={() => setRequisicao(false)}
          onGuardou={onMudou}
        />
      ) : null}
    </div>
  );
}

function Requisicao({
  prontuario,
  onFechar,
  onGuardou,
}: {
  prontuario: Prontuario;
  onFechar: () => void;
  onGuardou: () => Promise<void>;
}) {
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [outros, setOutros] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const p = prontuario.paciente;

  function itens() {
    const lista = prontuario.referencias.filter((ex) => marcados[ex.nome]).map((ex) => ({
      nome: ex.nome,
      justificativa: (notas[ex.nome] ?? "").trim(),
    }));
    const extra = outros
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((nome) => ({ nome, justificativa: "" }));
    return [...lista, ...extra];
  }

  async function guardar() {
    const lista = itens();
    if (lista.length === 0) {
      setErro("Marque ao menos um exame.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      await guardarRequisicao({ data: { pacienteId: p.id, data: prontuario.hoje, itens: lista } });
      await onGuardou();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível guardar a requisição.");
      setOcupado(false);
    }
  }

  return (
    <FolhaPapel
      clinica={prontuario.clinica}
      titulo="Solicitação de exames laboratoriais"
      subtitulo={[p.nome, p.cpf ? `CPF ${p.cpf}` : "", p.dataNascimento ? `nascimento ${fmtData(p.dataNascimento)}` : ""]
        .filter(Boolean)
        .join(" · ")}
      onFechar={onFechar}
      acoes={
        <Button type="button" variant="sand" disabled={ocupado} onClick={guardar}>
          Guardar no prontuário
        </Button>
      }
    >
      <p className="no-print text-sm text-muted">Marque os exames. Só os marcados saem na impressão.</p>
      <ul className="mt-3">
        {prontuario.referencias.map((ex) => {
          const on = Boolean(marcados[ex.nome]);
          return (
            <li key={ex.nome} className={on ? "border-t border-line py-2" : "no-print border-t border-line py-2"}>
              <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  className="no-print size-4 accent-copper"
                  checked={on}
                  onChange={(e) => setMarcados((m) => ({ ...m, [ex.nome]: e.target.checked }))}
                />
                <span>{ex.nome}</span>
              </label>
              {on ? (
                <Input
                  className="no-print mt-1"
                  value={notas[ex.nome] ?? ""}
                  onChange={(e) => setNotas((n) => ({ ...n, [ex.nome]: e.target.value }))}
                  placeholder="Justificativa, se quiser"
                  aria-label={`Justificativa de ${ex.nome}`}
                />
              ) : null}
              {on && notas[ex.nome]?.trim() ? <p className="print-only text-sm text-ink-2">{notas[ex.nome]}</p> : null}
            </li>
          );
        })}
      </ul>
      <div className="no-print mt-4">
        <Campo label="Outros, um por linha">
          <Textarea value={outros} onChange={(e) => setOutros(e.target.value)} />
        </Campo>
        <div className="mt-2">
          <Erro>{erro}</Erro>
        </div>
      </div>
      {outros
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((nome) => (
          <p key={nome} className="print-only mt-2 text-sm">
            {nome}
          </p>
        ))}
    </FolhaPapel>
  );
}
