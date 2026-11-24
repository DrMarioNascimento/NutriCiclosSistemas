alter table prescricoes add column if not exists fibra_meta double precision;
alter table prescricoes add column if not exists micronutrientes jsonb not null default '[]'::jsonb;
