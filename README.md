# Daily English — pacote consolidado

## O que contém
- `content/`: bancos extraídos do documento Word e schema.
- `index.html`, `css/styles.css`, `js/app.js`: interface conectada aos JSONs.
- `extraction-report.md`: relatório honesto de extração, auditoria e limitações.
- `content/excluded-records-review.json`: registros que a heurística detectou como possível associação/direção incorreta; preservados para auditoria.

## Executar
O app usa `fetch()` para carregar os JSONs. Abra a pasta no VS Code com Live Server ou execute `python -m http.server 8000` na pasta raiz e acesse `http://localhost:8000`. Não abra `index.html` via `file://`.

## Integridade pedagógica
O material vem do documento-fonte. Tentativas históricas do aluno não são gabaritos automáticos. Só respostas ligadas a blocos de correção correspondentes são tratadas como referências documentadas; mesmo assim, a equivalência semântica ainda precisa de revisão. Itens sem gabarito funcionam em autoavaliação. Não se declara certificação Cambridge, TOEFL ou IELTS.

## Atualização futura
Novos itens devem preservar IDs únicos, `source`, `sourceLocation`, `answerStatus` e status de auditoria. Não preencha campos ausentes com exemplos fictícios.
