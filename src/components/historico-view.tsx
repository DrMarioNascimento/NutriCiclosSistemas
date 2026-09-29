import { useMemo, useState } from "react";
import { fmtData, fmtNum } from "@/lib/clinic/calc";
import type { Prontuario } from "@/lib/clinic/types";
import { Cartao } from "./ui";

type Destino = "resumo" | "avaliacao" | "dieta" | "cardapio" | "recordatorio" | "exames" | "documentos";

type Filtro = "tudo" | "avaliacao" | "dieta" | "cardapio" | "recordatorio" | "exames" | "documentos" | "agenda";

const FILTROS: Array<[Filtro, string]> = [
  ["tudo", "Tudo"],
  ["avaliacao", "Avaliação"],
  ["dieta", "Dieta"],
  ["cardapio", "Cardápio"],
  ["recordatorio", "Recordatório"],
  ["exames", "Exames"],
  ["documentos", "Documentos"],
  ["agenda", "Agenda"],
];

type Evento = {
  chave: string;
  data: string;
  hora: string;
  filtro: Exclude<Filtro, "tudo">;
  tipo: string;
  titulo: string;
  detalhe: string;
  aba: Destino;
};

function eventosDe(prontuario: Prontuario): Evento[] {
  const lista: Evento[] = [];
  for (const a of prontuario.avaliacoes) {
    lista.push({
      chave: `av-${a.id}`,
      data: a.data,
      hora: "",
      filtro: "avaliacao",
      tipo: "Avaliação",
      titulo: `${fmtNum(a.peso, 1)} kg · IMC ${fmtNum(a.imc, 1)}`,
      detalhe: a.diagnostico || a.equipamento || "Sem diagnóstico.",
      aba: "avaliacao",
    });
  }
  for (const d of prontuario.dietas) {
    lista.push({
      chave: `di-${d.id}`,
      data: d.data,
      hora: "",
      filtro: "dieta",
      tipo: "Dieta",
      titulo: d.nome,
      detalhe: `${fmtNum(d.kcalMeta, 0)} kcal${d.indicacao ? ` · ${d.indicacao}` : ""}`,
      aba: "dieta",
    });
  }
  for (const p of prontuario.prescricoes) {
    const n = p.refeicoes.reduce((s, r) => s + r.itens.length, 0);
    lista.push({
      chave: `ca-${p.id}`,
      data: p.data,
      hora: "",
      filtro: "cardapio",
      tipo: "Cardápio",
      titulo: p.titulo,
      detalhe: `${p.situacao} · ${fmtNum(p.kcalMeta, 0)} kcal · ${n} alimentos`,
      aba: "cardapio",
    });
  }
  for (const r of prontuario.recordatorios) {
    const relato = r.refeicoes.find((item) => item.relato.trim());
    lista.push({
      chave: `re-${r.id}`,
      data: r.data,
      hora: "",
      filtro: "recordatorio",
      tipo: "Recordatório",
      titulo: r.tipo || "Recordatório",
      detalhe: r.queixa || (relato ? relato.relato : "Sem queixa."),
      aba: "recordatorio",
    });
  }
  const porDia = new Map<string, typeof prontuario.exames>();
  for (const e of prontuario.exames) {
    const grupo = porDia.get(e.data) ?? [];
    grupo.push(e);
    porDia.set(e.data, grupo);
  }
  for (const [data, grupo] of porDia) {
    const fora = grupo.filter((e) => e.foraFaixa).length;
    lista.push({
      chave: `ex-${data}`,
      data,
      hora: "",
      filtro: "exames",
      tipo: "Exames",
      titulo: grupo.length === 1 ? grupo[0].exame : `${grupo.length} resultados`,
      detalhe: fora ? `${fora} fora da faixa` : "Dentro da referência registrada",
      aba: "exames",
    });
  }
  for (const d of prontuario.documentos) {
    lista.push({
      chave: `do-${d.id}`,
      data: d.data,
      hora: d.horaInicio,
      filtro: "documentos",
      tipo: "Documento",
      titulo: d.titulo,
      detalhe: `${d.situacao}${d.destinatario ? ` · ${d.destinatario}` : ""}`,
      aba: "documentos",
    });
  }
  for (const a of prontuario.agenda) {
    lista.push({
      chave: `ag-${a.id}`,
      data: a.dia,
      hora: a.hora ?? "",
      filtro: "agenda",
      tipo: a.tipo === "retorno" ? "Retorno" : a.tipo === "consulta" ? "Consulta" : "Lembrete",
      titulo: a.titulo,
      detalhe: `${a.feito ? "Feito" : "Em aberto"}${a.notas ? ` · ${a.notas}` : ""}`,
      aba: "resumo",
    });
  }
  return lista.sort((x, y) => `${y.data}T${y.hora || "99:99"}`.localeCompare(`${x.data}T${x.hora || "99:99"}`));
}

export function HistoricoPainel({ prontuario, ir }: { prontuario: Prontuario; ir: (aba: Destino) => void }) {
  const eventos = useMemo(() => eventosDe(prontuario), [prontuario]);
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const visiveis = filtro === "tudo" ? eventos : eventos.filter((e) => e.filtro === filtro);

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Histórico</h2>
      <p className="mt-1 text-sm text-ink-2">O prontuário em ordem de data. Cada linha abre a aba de onde veio.</p>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        {FILTROS.map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            onClick={() => setFiltro(chave)}
            className={
              filtro === chave
                ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper"
                : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"
            }
          >
            {rotulo}
          </button>
        ))}
      </div>
      {visiveis.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nada neste filtro.</p>
      ) : (
        <ul className="mt-2">
          {visiveis.map((e) => (
            <li key={e.chave} className="border-t border-line">
              <button type="button" onClick={() => ir(e.aba)} className="w-full py-3 text-left">
                <span className="text-xs text-muted">
                  {fmtData(e.data)}
                  {e.hora ? ` · ${e.hora}` : ""} · {e.tipo}
                </span>
                <span className="mt-0.5 block text-sm font-medium text-ink">{e.titulo}</span>
                <span className="mt-0.5 block text-sm text-ink-2">{e.detalhe}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
