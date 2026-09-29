import { createFileRoute } from "@tanstack/react-router";
import { PacientesView } from "@/components/pacientes-view";

export const Route = createFileRoute("/_app/pacientes/")({
  component: PacientesView,
});
