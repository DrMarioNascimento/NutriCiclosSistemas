import { createFileRoute } from "@tanstack/react-router";
import { Entrada } from "@/components/shell";

export const Route = createFileRoute("/login")({
  component: Entrada,
});
