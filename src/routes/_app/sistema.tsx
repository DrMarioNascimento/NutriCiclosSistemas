import { createFileRoute } from "@tanstack/react-router";
import { SistemaView } from "@/components/sistema-view";

export const Route = createFileRoute("/_app/sistema")({
  component: SistemaView,
});
