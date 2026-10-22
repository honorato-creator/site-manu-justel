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
    videos: texto(p['Links de vídeo'] || p['Vídeos']),
    videoArquivos: arquivos(p['Arquivos de vídeo']),
    link: p['Link']?.url || '',
    textoLink: texto(p['Texto do link']),
    credito: texto(p['Crédito']),
    idSite: texto(p['id do site']),
    capa: arquivos(p['Capa']),
    fotos: arquivos(p['Fotos']),
    briefing: arquivos(p['Briefing']),
    bastidores: arquivos(p['Bastidores']),
    comunicacao: arquivos(p['Comunicação']),
  };
}

export default async () => {
  const token = (process.env.NOTION_TOKEN || '').trim();
  const db = (process.env.NOTION_DB || '').trim().replace(/-/g, '');
  if (!token || !db) return Response.json({ erro: 'Notion não configurado' }, { status: 503 });
  if (!/^[0-9a-f]{32}$/i.test(db)) return Response.json({ erro: 'NOTION_DB inválido: use o id da base (32 caracteres, letras e números)' }, { status: 503 });

  const trabalhos = [];
  const corpo = (cursor) => JSON.stringify({
    filter: { property: 'Publicado', checkbox: { equals: true } },
    sorts: [{ property: 'Ordem', direction: 'ascending' }],
    page_size: 100,
    ...(cursor ? { start_cursor: cursor } : {}),
  });
  const pede = (url, versao, body) => fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': versao, 'Content-Type': 'application/json' },
    ...(body ? { body } : {}),
  });
  // só o código do erro (ex.: object_not_found), nunca a mensagem, que pode repetir valores das variáveis
  const detalhe = async (r) => { try { const j = await r.json(); return j.code || ''; } catch (e) { return ''; } };

  try {
    // 1ª tentativa: API clássica (consulta a base pelo id)
    let r = await pede(`https://api.notion.com/v1/databases/${db}/query`, VERSAO, corpo());
    let modo = 'classico', ds = null;
    if (r.status === 404 || r.status === 400) {
      // 2ª tentativa: API nova, em que a base tem "fontes de dados" (data sources)
      const info = await pede(`https://api.notion.com/v1/databases/${db}`, '2025-09-03');
      if (info.ok) {
        const j = await info.json();
        ds = j.data_sources && j.data_sources[0] && j.data_sources[0].id;
      }
      if (!ds) ds = db; // o id informado pode já ser o da fonte de dados
      r = await pede(`https://api.notion.com/v1/data_sources/${ds}/query`, '2025-09-03', corpo());
      modo = 'fonte';
    }
    if (!r.ok) return Response.json({ erro: 'Notion respondeu ' + r.status, detalhe: await detalhe(r) }, { status: 502 });
    let d = await r.json();
    d.results.forEach((pg) => trabalhos.push(linha(pg)));
    while (d.has_more) {
      const url = modo === 'classico' ? `https://api.notion.com/v1/databases/${db}/query` : `https://api.notion.com/v1/data_sources/${ds}/query`;
      r = await pede(url, modo === 'classico' ? VERSAO : '2025-09-03', corpo(d.next_cursor));
      if (!r.ok) break;
      d = await r.json();
      d.results.forEach((pg) => trabalhos.push(linha(pg)));
    }
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
