# Site Manu Justel

Site da Manu Justel, gestora de projetos de marketing e produção criativa. Desenvolvido por Kaio Honorato.

Site: https://manujustel.com.br

## O que é

Um site de uma página só, com cara de mesa de trabalho criativa: apresentação da Manu, serviços, processo, rotina, portfólio de trabalhos em álbuns e um formulário de contato em formato de cartão-postal.

## Para que serve

- Apresentar a Manu e o que ela faz para quem chega pelo Google ou por indicação.
- Mostrar o portfólio sempre atualizado: a Manu publica um trabalho novo no Notion dela e ele aparece no site em poucos minutos, sem mexer em código.
- Receber pedidos de contato e de diagnóstico direto no e-mail dela.

## Engenharia

| Parte | Tecnologia |
|---|---|
| Página | HTML, CSS e JavaScript puros, sem framework e sem build |
| Portfólio | Função serverless da Netlify (`netlify/functions/trabalhos.mjs`, rota `/api/trabalhos`) que lê a base "Trabalhos" do Notion pela API e devolve só o que está marcado como Publicado |
| Plano B | Se o Notion falhar, o site mostra os trabalhos que já vêm embutidos na página |
| Formulários | Netlify Forms (`contato` e `diagnostico`), com campo anti-spam escondido e envio por e-mail como reserva |
| Imagens | WebP em vários tamanhos na pasta `img/` |
| Hospedagem | Netlify, com deploy automático a cada `git push` |
| Segurança | Cabeçalhos no `netlify.toml` (Content-Security-Policy, X-Frame-Options, nosniff, Permissions-Policy) |
| SEO | `sitemap.xml`, `robots.txt` e verificação do Google Search Console |

## Segredos

A chave do Notion **não fica no código**. Ela mora nas variáveis de ambiente da Netlify: `NOTION_TOKEN` (chave da integração, só leitura) e `NOTION_DB` (id da base).

## Publicar e configurar

O passo a passo completo (Netlify, Notion, formulários e domínio) está no [LEIA-ME.md](LEIA-ME.md).
