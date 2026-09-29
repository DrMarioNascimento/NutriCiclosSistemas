# NutriCiclos

Consultório de nutrição. Prontuário, avaliação, dieta, cardápio, exames, documentos e agenda.

Nutrição em cada ciclo da vida.

Versão 5.0 · 2026.

## Para quem é

Para a clínica usar no navegador. Não é uma planilha e não abre com dois cliques num arquivo.

## Onde cada coisa fica

| Lugar | Função | Endereço |
|---|---|---|
| Este repositório | Guarda o código. Não guarda pacientes. | https://github.com/osanilda-cell/NutriCiclosSistemas |
| Computador da clínica | Versão local, só enquanto a janela azul estiver aberta. | http://localhost:8080 |
| Netlify | Site publicado. | O endereço está no painel: https://app.netlify.com |
| Neon | Banco dos pacientes na internet. Ainda precisa ser ligado ao site. | https://neon.tech |

O manual completo, com as telas e o passo a passo, está em PDF:

https://github.com/DrMarioNascimento/NutriCiclos-manual/blob/main/Manual-NutriCiclos.pdf

## Abrir no computador

Na pasta de dentro, aquela em que aparecem `package.json` e `src`:

```powershell
cd C:\Users\mario\Documents\NutriCiclosSistemas-main\NutriCiclosSistemas-main
$env:VITE_AUTH_ENABLED="false"
.\node_modules\.bin\vite.cmd dev --host 0.0.0.0 --port 8080
```

Abra http://localhost:8080 e deixe a janela azul aberta.

Antes de fechar, exporte um backup em Sistema → Backup. No computador, os pacientes ficam na memória e somem quando o programa para.

A primeira instalação pede o Node.js (https://nodejs.org, versão LTS), o ZIP deste repositório extraído e, no Windows, a permissão para o npm:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Licença

Todos os direitos reservados. O texto está no arquivo `LICENSE`.

Copiar, modificar ou distribuir este sistema exige autorização prévia dos titulares.

## Produção

Mario César Nascimento  
Osana
