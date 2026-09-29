alter table pacientes add column if not exists plano_token text not null default '';
create unique index if not exists pacientes_plano_token_idx on pacientes (plano_token) where plano_token <> '';
