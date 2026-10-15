// Lê a base "Trabalhos" do Notion da Manu e devolve só o que está marcado como Publicado.
// Variáveis no painel do Netlify: NOTION_TOKEN (chave da integração) e NOTION_DB (id da base).

const VERSAO = '2022-06-28';

const texto = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join('').trim();
const arquivos = (p) => (p?.files || []).map((f) => f.file?.url || f.external?.url).filter(Boolean);

function linha(pg) {
  const p = pg.properties || {};
  return {
    id: pg.id,
    titulo: texto(p['Título']),
    ordem: p['Ordem']?.number ?? 999,
    cliente: texto(p['Cliente']),
    ano: texto(p['Ano']),
    categorias: (p['Categorias']?.multi_select || []).map((o) => o.name),
    manchete: texto(p['Manchete']),
    cor: p['Cor do card']?.select?.name || '',
    projeto: texto(p['O projeto']),
    atIntro: texto(p['Introdução da atuação']),
    atuacao: texto(p['Minha atuação']),
    resultado: texto(p['Resultado']),
    videos: texto(p['Vídeos']),
    link: p['Link']?.url || '',
    textoLink: texto(p['Texto do link']),
    credito: texto(p['Crédito']),
    idSite: texto(p['id do site']),
    capa: arquivos(p['Capa']),
    fotos: arquivos(p['Fotos']),
  };
}

export default async () => {
  const token = process.env.NOTION_TOKEN;
  const db = (process.env.NOTION_DB || '').replace(/-/g, '');
  if (!token || !db) return Response.json({ erro: 'Notion não configurado' }, { status: 503 });

  const trabalhos = [];
  let cursor;
  try {
    do {
      const r = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': VERSAO, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { property: 'Publicado', checkbox: { equals: true } },
          sorts: [{ property: 'Ordem', direction: 'ascending' }],
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      });
      if (!r.ok) return Response.json({ erro: 'Notion respondeu ' + r.status }, { status: 502 });
      const d = await r.json();
      d.results.forEach((pg) => trabalhos.push(linha(pg)));
      cursor = d.has_more ? d.next_cursor : null;
    } while (cursor);
  } catch (e) {
    return Response.json({ erro: 'Falha ao ler o Notion' }, { status: 502 });
  }

  trabalhos.sort((a, b) => a.ordem - b.ordem);
  // As fotos do Notion vêm com links que expiram em 1 hora; o cache fica bem abaixo disso.
  return Response.json({ trabalhos }, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1200',
    },
  });
};

export const config = { path: '/api/trabalhos' };
