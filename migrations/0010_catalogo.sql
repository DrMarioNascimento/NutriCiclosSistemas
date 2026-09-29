create table if not exists catalogo_alimento (
  user_id text primary key,
  nome text not null,
  quantidade integer not null,
  atualizado_em timestamptz not null default now(),
  itens jsonb not null
);
