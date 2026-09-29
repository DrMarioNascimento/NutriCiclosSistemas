import { createFileRoute } from "@tanstack/react-router";
import { InicioView } from "@/components/inicio-view";

export const Route = createFileRoute("/_app/")({
  component: InicioView,
});
