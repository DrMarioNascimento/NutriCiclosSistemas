alter table documentos add column if not exists verificacao_token text;
alter table documentos add column if not exists anulado_em timestamptz;
create unique index if not exists documentos_verificacao_token_idx
  on documentos (verificacao_token)
  where verificacao_token is not null;
