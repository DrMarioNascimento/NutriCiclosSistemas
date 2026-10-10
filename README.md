# NutriCiclos — sistema

Nutrição em cada ciclo da vida. Documentação revisada em 10 de outubro de 2026.

Sistema de consultório de nutrição com prontuário, avaliação, dieta, cardápio, exames, documentos e agenda. Este repositório contém código e recursos da aplicação; não é o banco operacional da clínica.

## Onde cada componente fica

| Componente | Responsabilidade |
|---|---|
| [Código do sistema](https://github.com/DrMarioNascimento/NutriCiclosSistemas) | Aplicação e ferramentas de desenvolvimento. |
| [Manual](https://github.com/DrMarioNascimento/NutriCiclos-manual) | PDF com orientação de uso. |
| Aplicação publicada | Ambiente de uso da clínica; confirme o endereço com os titulares. |
| Banco configurado no servidor | Dados operacionais; no código auditado, `DATABASE_URL` seleciona PostgreSQL/Neon. |
| [Site da clínica](https://nutriciclos.com.br) | Comunicação pública da NutriCiclos. |

A presença do código no GitHub não comprova a disponibilidade nem a configuração de uma instalação em produção. O ambiente local não deve ser usado como substituto do banco da clínica. O código contém fallback PGLite quando `DATABASE_URL` não está configurada; esse fallback não comprova persistência, backup ou recuperação em produção.

## Desenvolvimento

O projeto usa React, TypeScript, TanStack Start, Vite e PostgreSQL. As instruções específicas estão em [AGENTS.md](AGENTS.md).

```text
npm ci
npm run dev
```

O comando de desenvolvimento usa `scripts/with-app-env.mjs`; não o substitua por uma chamada direta ao Vite. A configuração de autenticação e banco deve corresponder ao ambiente. Não desligue autenticação em uma instalação que trate dados reais.

Verificações disponíveis:

```text
npm run typecheck
npm run lint
npm test
npm run check:auth
```

`npm run build` também executa `npm run db:migrate`. Quando `DATABASE_URL` está presente, a compilação pode aplicar migrações ao banco apontado por essa variável. Use um banco de desenvolvimento/homologação para validar alterações e confira backup e destino antes de publicar. Esta revisão documental não executou migrações nem modificou dados.

## Operação e manutenção

Antes de mudar uma instalação em uso, confirme destino de publicação, autenticação, autorização, banco configurado, exportação e restauração de backup. A existência de rotas de login e backup no código não comprova que todos esses controles estejam configurados em produção.

Mudanças devem passar por branch e PR de revisão; não publicar diretamente em `main` sem autorização dos titulares.

## Titulares e licença

Mario César Nascimento e Osana Melo · Clínica NutriCiclos · Florianópolis/SC.  
Contato: contato@nutriciclos.com.br.

Todos os direitos reservados. Consulte [LICENSE](LICENSE). Esta revisão preserva as permissões e restrições existentes; não concede autorização comercial adicional.
