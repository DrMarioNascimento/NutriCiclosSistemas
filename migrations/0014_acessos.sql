create table if not exists acessos (
  auth_user_id text primary key references "user" (id) on delete cascade,
  clinica_id text not null,
  nome text not null default '',
  email text not null default '',
  criado_em timestamptz not null default now()
);

create index if not exists acessos_clinica_idx on acessos (clinica_id);
