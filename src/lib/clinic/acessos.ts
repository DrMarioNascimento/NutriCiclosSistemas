import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type AcessoItem = {
  id: string;
  nome: string;
  email: string;
  dono: boolean;
  eu: boolean;
};

const novo = z.object({
  nome: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  senha: z.string().min(8).max(80),
});

function localSemSenha() {
  return process.env.VITE_AUTH_ENABLED === "false";
}

export const temConta = createServerFn({ method: "GET" }).handler(async (): Promise<{ tem: boolean }> => {
  try {
    const sql = await getSql();
    const rows = await sql<{ n: number }>`select count(*)::int as n from "user"`;
    return { tem: Number(rows[0]?.n ?? 0) > 0 };
  } catch {
    return { tem: false };
  }
});

export const listarAcessos = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ local: boolean; itens: AcessoItem[] }> => {
    if (localSemSenha()) return { local: true, itens: [] };
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const eu = await getSessionUser();
    const sql = await getSql();
    const rows = await sql<{ id: string; nome: string; email: string; dono: boolean }>`
      select auth_user_id as id, nome, email, (auth_user_id = clinica_id) as dono
      from acessos
      where clinica_id = ${context.userId}
      order by criado_em
    `;
    return {
      local: false,
      itens: rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        dono: Boolean(r.dono),
        eu: r.id === eu?.id,
      })),
    };
  });

export const criarAcesso = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(novo)
  .handler(async ({ data, context }) => {
    if (localSemSenha()) {
      throw new Error("Neste computador o consultório abre sem senha. O login vale no site, com o banco ligado.");
    }
    const { auth } = await import("@/lib/auth/server");
    const { fecharAcessoDaClinica, liberarAcessoDaClinica } = await import("@/lib/auth/email-password");
    liberarAcessoDaClinica(context.userId);
    try {
      const resultado = await auth.api.signUpEmail({
        body: { name: data.nome, email: data.email, password: data.senha },
      });
      if (!resultado?.user) throw new Error("Não foi possível criar o acesso.");
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/already|exists|unique/i.test(msg)) throw new Error("Este e-mail já tem acesso.");
      throw new Error(msg || "Não foi possível criar o acesso.");
    } finally {
      fecharAcessoDaClinica();
    }
  });

export const excluirAcesso = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    if (localSemSenha()) throw new Error("Neste computador não há senha para remover.");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const eu = await getSessionUser();
    if (data.id === eu?.id) throw new Error("Você não pode remover o próprio acesso.");
    const sql = await getSql();
    const rows = await sql<{ dono: boolean }>`
      select (auth_user_id = clinica_id) as dono
      from acessos
      where auth_user_id = ${data.id} and clinica_id = ${context.userId}
    `;
    if (!rows[0]) throw new Error("Acesso não encontrado.");
    if (rows[0].dono) throw new Error("O primeiro acesso da clínica não pode ser removido.");
    await sql`delete from "user" where id = ${data.id}`;
    return { ok: true };
  });
