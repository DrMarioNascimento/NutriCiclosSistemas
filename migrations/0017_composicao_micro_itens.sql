alter table itens add column if not exists composicao_micro jsonb not null default '{}'::jsonb;
