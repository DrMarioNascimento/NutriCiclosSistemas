import { createFileRoute } from "@tanstack/react-router";
import { icsDoToken } from "@/lib/clinic/agenda-feed.server";

export const Route = createFileRoute("/api/agenda/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const ics = await icsDoToken(params.token);
        if (!ics) return new Response("Não encontrado", { status: 404 });
        return new Response(ics, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="nutriciclos.ics"',
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
