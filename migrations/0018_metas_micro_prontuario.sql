alter table avaliacoes add column if not exists micronutrientes jsonb not null default '[]'::jsonb;
alter table dietas add column if not exists micronutrientes jsonb not null default '[]'::jsonb;
alter table modelos_cardapio add column if not exists micronutrientes jsonb not null default '[]'::jsonb;
