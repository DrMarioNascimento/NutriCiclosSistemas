alter table clinica add column if not exists agenda_token text not null default '';
create unique index if not exists clinica_agenda_token_idx on clinica (agenda_token) where agenda_token <> '';
