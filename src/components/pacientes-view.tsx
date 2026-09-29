import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPainel } from "@/lib/clinic/api";
import { fmtCpf } from "@/lib/clinic/calc";
import type { Painel } from "@/lib/clinic/types";
import { FormPaciente } from "./form-paciente";
import { Button, Cartao, Erro, Input } from "./ui";

export function PacientesView() {
  const nav = useNavigate();
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [inativos, setInativos] = useState(false);

  useEffect(() => {
    getPainel()
      .then(setPainel)
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível listar."));
  }, []);

  if (erro) return <Erro>{erro}</Erro>;
  if (!painel) return <div className="h-40 animate-pulse rounded-2xl bg-sand" />;

  const q = busca.trim().toLowerCase();
  const lista = painel.pacientes.filter((p) => {
    if (!inativos && p.status !== "Ativo") return false;
    if (!q) return true;
    return [p.nome, p.cpf, p.telefone].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-copper-deep">Prontuários</p>
          <h1 className="font-serif text-4xl">Pacientes</h1>
        </div>
        <Button type="button" onClick={() => setNovo((v) => !v)}>
          Novo paciente
        </Button>
      </div>

      {novo ? (
        <Cartao className="mt-5">
          <h2 className="mb-4 font-serif text-2xl">Cadastro</h2>
          <FormPaciente
            objetivos={painel.listas.objetivos}
            equipe={painel.profissionais}
            onCancelar={() => setNovo(false)}
            onSalvo={(id) => {
              void nav({
                to: "/pacientes/$pacienteId",
                params: { pacienteId: String(id) },
                search: { aba: "resumo" },
              });
            }}
          />
        </Cartao>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome, CPF ou telefone"
          className="max-w-sm"
          aria-label="Buscar paciente"
        />
        <button type="button" className="min-h-11 text-sm text-ink-2" onClick={() => setInativos((v) => !v)}>
          {inativos ? "Ocultar inativos" : "Mostrar inativos"}
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {lista.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() =>
                nav({
                  to: "/pacientes/$pacienteId",
                  params: { pacienteId: String(p.id) },
                  search: { aba: "resumo" },
                })
              }
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-cream px-4 py-3 text-left hover:bg-sand"
            >
              <span>
                <span className="block font-medium text-ink">{p.nome}</span>
                <span className="text-sm text-muted">
                  {p.idade != null ? `${p.idade} anos · ` : ""}
                  {p.objetivo || "Sem objetivo"}
                  {p.profissionalNome ? ` · ${p.profissionalNome}` : ""}
                  {p.cpf ? ` · ${fmtCpf(p.cpf)}` : ""}
                </span>
              </span>
              <span className="text-sm text-copper-deep">{p.status}</span>
            </button>
          </li>
        ))}
      </ul>
      {lista.length === 0 ? <p className="mt-4 text-sm text-ink-2">Nenhum paciente com esse filtro.</p> : null}
    </div>
  );
}
