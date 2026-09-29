/**
 * E-mail e senha da clínica (Better Auth neste app, não o login do Grok).
 *
 * O primeiro acesso é criado na tela de entrada. Os seguintes só em Sistema,
 * para um visitante não abrir uma clínica vazia por conta própria.
 */
import { getSql } from "../db";

export const emailAndPasswordEnabled = true;

export const emailAndPasswordConfig = {
  enabled: true,
  minPasswordLength: 8,
  autoSignIn: false,
};

let clinicaDoNovoAcesso: string | null = null;

export function liberarAcessoDaClinica(clinicaId: string) {
  clinicaDoNovoAcesso = clinicaId;
}

export function fecharAcessoDaClinica() {
  clinicaDoNovoAcesso = null;
}

export const acessoHooks = {
  user: {
    create: {
      before: async (user: { email: string; name: string }) => {
        if (clinicaDoNovoAcesso) return { data: user };
        const sql = await getSql();
        const rows = await sql<{ n: number }>`select count(*)::int as n from "user"`;
        if (Number(rows[0]?.n ?? 0) === 0) return { data: user };
        throw new Error("O acesso da clínica já existe. Entre com o e-mail ou peça um login em Sistema.");
      },
      after: async (user: { id: string; email: string; name: string }) => {
        const sql = await getSql();
        const clinicaId = clinicaDoNovoAcesso ?? user.id;
        await sql`
          insert into acessos (auth_user_id, clinica_id, nome, email)
          values (${user.id}, ${clinicaId}, ${user.name}, ${user.email})
          on conflict (auth_user_id) do nothing
        `;
      },
    },
  },
};
