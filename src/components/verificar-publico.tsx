import { useEffect, useState } from "react";
import { lerVerificacao } from "@/lib/clinic/api";
import { fmtData } from "@/lib/clinic/calc";
import { Erro } from "./ui";

type Verificacao = {
  titulo: string;
  tipo: string;
  data: string;
  situacao: string;
  emitidoEm: string | null;
  clinica: string;
  nutricionista: string;
  crn: string;
  cidade: string;
};

export function VerificarPublico({ token }: { token: string }) {
  const [doc, setDoc] = useState<Verificacao | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    lerVerificacao({ data: { token } })
      .then(setDoc)
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível verificar."));
  }, [token]);

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <p className="text-xs tracking-[0.22em] text-copper-deep">NutriCiclos</p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Verificação do comprovante</h1>
      <p className="mt-2 text-sm text-ink-2">Confere se este documento foi emitido pela clínica. Não abre prontuário.</p>
      {erro ? <div className="mt-6"><Erro>{erro}</Erro></div> : null}
      {doc === undefined && !erro ? <div className="mt-8 h-24 animate-pulse rounded-2xl bg-sand" /> : null}
      {doc === null ? <p className="mt-8 text-sm text-ink">Este código não corresponde a um comprovante emitido.</p> : null}
      {doc ? (
        <section className="mt-8 rounded-2xl border border-line bg-paper px-5 py-5">
          <p className="text-sm text-muted">{doc.situacao === "Anulado" ? "Anulado" : "Emitido"}</p>
          <h2 className="mt-1 font-serif text-2xl text-ink">{doc.titulo}</h2>
          <p className="mt-3 text-sm text-ink">{doc.data ? fmtData(doc.data) : "Data não informada"}</p>
          <p className="mt-4 text-sm text-ink">{doc.clinica || "NutriCiclos"}</p>
          <p className="text-sm text-ink-2">{doc.nutricionista}{doc.crn ? ` · ${doc.crn}` : ""}</p>
          <p className="text-sm text-muted">{doc.cidade}</p>
        </section>
      ) : null}
    </main>
  );
}
