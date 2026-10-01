import { createFileRoute } from "@tanstack/react-router";
import { VerificarPublico } from "@/components/verificar-publico";

export const Route = createFileRoute("/verificar/$token")({
  component: function Pagina() {
    const { token } = Route.useParams();
    return <VerificarPublico token={token} />;
  },
});
