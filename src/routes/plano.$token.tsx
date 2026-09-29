import { createFileRoute } from "@tanstack/react-router";
import { PlanoPublico } from "@/components/plano-publico";

export const Route = createFileRoute("/plano/$token")({
  component: function Pagina() {
    const { token } = Route.useParams();
    return <PlanoPublico token={token} />;
  },
});
