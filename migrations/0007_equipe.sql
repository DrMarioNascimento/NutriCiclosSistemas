alter table profissionais add column if not exists funcao text not null default 'nutricionista';
alter table profissionais add column if not exists cargo text not null default '';

alter table pacientes add column if not exists profissional_id integer;
alter table pacientes add column if not exists administrativo_id integer;
