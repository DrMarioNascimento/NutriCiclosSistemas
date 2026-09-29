import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/agenda-view";

export const Route = createFileRoute("/_app/agenda")({
  component: AgendaView,
});
