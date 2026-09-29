import { createFileRoute } from "@tanstack/react-router";
import { PacienteView, type Aba } from "@/components/paciente-view";

const abas: readonly Aba[] = ["resumo", "cadastro", "avaliacao", "dieta", "cardapio", "evolucao", "historico", "recordatorio", "exames", "documentos"];

export const Route = createFileRoute("/_app/pacientes/$pacienteId")({
  validateSearch: (search: Record<string, unknown>): { aba: Aba } => {
    const aba = search.aba;
    if (typeof aba === "string" && abas.includes(aba as Aba)) return { aba: aba as Aba };
    return { aba: "resumo" };
  },
  component: Tela,
});

function Tela() {
  const { pacienteId } = Route.useParams();
  const { aba } = Route.useSearch();
  return <PacienteView id={Number(pacienteId)} aba={aba} />;
}
