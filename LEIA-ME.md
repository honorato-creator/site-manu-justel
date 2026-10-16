# Site Manu Justel · como colocar no ar (Netlify)

Esta pasta é o site inteiro, pronto para o Netlify.

- `index.html`: o site, na versão da mesa.
- `img/`: todas as imagens.
- `obrigada.html`: página de "postal enviado", usada só se o visitante estiver sem JavaScript.
- `netlify/functions/trabalhos.mjs`: lê a base "Trabalhos" do Notion da Manu.
- `netlify.toml`: configuração do Netlify.

> **Importante:** arrastar a pasta no Netlify Drop publica só a parte estática, e a função do Notion fica de fora. Por isso, use o GitHub (passo 1A) ou a linha de comando (passo 1B).

## 1A. Pelo GitHub (recomendado)
1. Crie um repositório (pode ser privado) e suba o conteúdo desta pasta, com o `netlify.toml` na raiz.
2. No Netlify: **Add new site → Import an existing project → GitHub** e escolha o repositório.
3. Deixe o build command vazio e o publish directory como `.`, e faça o deploy.
4. A cada `git push`, o site se atualiza sozinho.

## 1B. Pela linha de comando
```
npm i -g netlify-cli
netlify login
netlify deploy --prod --dir . --functions netlify/functions
```

## 2. Ligar o Notion
1. No Notion da Manu, abra https://www.notion.so/profile/integrations e clique em **New integration**.
   - Tipo: **Internal**.
   - Workspace: o dela.
   - Nome: "Site Manu".
   - Permissão: só **Read content**.
   - Copie o **Internal Integration Secret**.
2. Abra a base **Trabalhos**, clique em **••• → Connections** e adicione a integração "Site Manu".
3. Pegue o id da base, que é o trecho de 32 caracteres no link dela, entre o `/` e o `?v=`.
4. No Netlify: **Site configuration → Environment variables**. Crie as duas variáveis abaixo e depois faça **Deploys → Trigger deploy**.
   - `NOTION_TOKEN`: o secret copiado no item 1.
   - `NOTION_DB`: o id da base.
5. Para testar, abra `seusite.com.br/api/trabalhos`. Tem que aparecer uma lista em JSON.

**Como o site usa o Notion:**
- O que estiver marcado como **Publicado** aparece no site em até uns 5 minutos.
- Se o Notion estiver fora do ar ou as variáveis estiverem erradas, o site mostra os trabalhos que já vêm embutidos nele.
- Os trabalhos antigos continuam usando as fotos da pasta `img/`, ligadas pelo campo "id do site".
- Trabalhos novos usam a **Capa** e as **Fotos** enviadas no próprio Notion.

## 3. Cartão-postal → e-mail da Manu (Netlify Forms)
1. No Netlify: **Forms**. O formulário **contato** aparece sozinho depois do primeiro deploy. Se o Forms pedir, clique em **Enable form detection** e faça um novo deploy.
2. Para receber por e-mail: **Forms → Form notifications → Add notification → Email notification**, com o e-mail manujustel@gmail.com.
3. O assunto do e-mail já chega como "[Site] assunto | nome de quem enviou".
4. Ficam de fora:
   - spam, por um campo escondido no formulário;
   - envios que dão erro: nesses casos, o site abre o aplicativo de e-mail com a mensagem pronta.

## 4. Domínio
- No Netlify: **Domain management → Add a domain**, com o domínio dela.
- Se o domínio estiver no Registro.br, troque os servidores DNS pelos que o Netlify mostrar. Também dá para manter o DNS no Registro.br e criar os registros que o Netlify indicar.
- O HTTPS é ativado sozinho.

## Atalho da proposta
Dois cliques num espaço vazio da faixa de baixo do rodapé abrem a proposta comercial (`#proposta`).
