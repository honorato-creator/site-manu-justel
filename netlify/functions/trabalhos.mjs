// Lê a base "Trabalhos" do Notion da Manu e devolve só o que está marcado como Publicado.
// Variáveis no painel do Netlify: NOTION_TOKEN (chave da integração) e NOTION_DB (id da base).

const VERSAO = '2022-06-28';

const texto = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join('').trim();
const arquivos = (p) => (p?.files || []).map((f) => f.file?.url || f.external?.url).filter(Boolean);
/* nomes dos campos sem acento, maiúsculas ou espaços extras: "COMUNICAÇÃO " = "comunicacao" */
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function linha(pg) {
  const bruto = pg.properties || {};
  const p = {}; Object.keys(bruto).forEach((k) => { p[norm(k)] = bruto[k]; });
  const campo = (...nomes) => { for (const n of nomes) if (p[norm(n)]) return p[norm(n)]; return undefined; };
  /* campos de arquivo: acha pelo nome, mesmo que a Manu escreva "Fotos bastidores", "BRIEFING" etc. */
  const grupos = { capa: [], fotos: [], briefing: [], bastidores: [], comunicacao: [], videoArquivos: [] };
  Object.keys(p).forEach((k) => {
    const v = p[k]; if (!v || v.type !== 'files') return;
    const g = /video/.test(k) ? 'videoArquivos' : /capa/.test(k) ? 'capa' : /brief/.test(k) ? 'briefing' : /bastid/.test(k) ? 'bastidores' : /comunic|uso/.test(k) ? 'comunicacao' : /foto|resultado|galeria/.test(k) ? 'fotos' : null;
    if (g) grupos[g] = grupos[g].concat(arquivos(v));
  });
  return {
    id: pg.id,
    titulo: texto(campo('Título', 'Titulo', 'Nome', 'Name')),
    ordem: campo('Ordem')?.number ?? 999,
    cliente: texto(campo('Cliente')),
    ano: texto(campo('Ano')),
    categorias: (campo('Categorias')?.multi_select || []).map((o) => o.name),
    manchete: texto(campo('Manchete')),
    cor: campo('Cor do card')?.select?.name || '',
    projeto: texto(campo('O projeto', 'Projeto')),
    atIntro: texto(campo('Introdução da atuação')),
    atuacao: texto(campo('Minha atuação', 'Atuação')),
    resultado: texto(campo('Resultado', 'Resultados')),
    videos: texto(campo('Links de vídeo', 'Vídeos')),
    videoArquivos: grupos.videoArquivos,
    link: campo('Link')?.url || '',
    textoLink: texto(campo('Texto do link')),
    credito: texto(campo('Crédito')),
    idSite: texto(campo('id do site')).toLowerCase(),
    capa: grupos.capa,
    fotos: grupos.fotos,
    briefing: grupos.briefing,
    bastidores: grupos.bastidores,
    comunicacao: grupos.comunicacao,
  };
}

/* só os nomes e tipos dos campos de arquivo (sem conteúdo), para conferir a base */
const camposArquivo = (pg) => Object.keys(pg.properties || {}).filter((k) => pg.properties[k].type === 'files');

export default async () => {
  const token = (process.env.NOTION_TOKEN || '').trim();
  const db = (process.env.NOTION_DB || '').trim().replace(/-/g, '');
  if (!token || !db) return Response.json({ erro: 'Notion não configurado' }, { status: 503 });
  if (!/^[0-9a-f]{32}$/i.test(db)) return Response.json({ erro: 'NOTION_DB inválido: use o id da base (32 caracteres, letras e números)' }, { status: 503 });

  const trabalhos = []; let campos = null;
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
    d.results.forEach((pg) => { if (!campos) campos = camposArquivo(pg); trabalhos.push(linha(pg)); });
    while (d.has_more) {
      const url = modo === 'classico' ? `https://api.notion.com/v1/databases/${db}/query` : `https://api.notion.com/v1/data_sources/${ds}/query`;
      r = await pede(url, modo === 'classico' ? VERSAO : '2025-09-03', corpo(d.next_cursor));
      if (!r.ok) break;
      d = await r.json();
      d.results.forEach((pg) => { if (!campos) campos = camposArquivo(pg); trabalhos.push(linha(pg)); });
    }
  } catch (e) {
    return Response.json({ erro: 'Falha ao ler o Notion' }, { status: 502 });
  }

  trabalhos.sort((a, b) => a.ordem - b.ordem);
  // As fotos do Notion vêm com links que expiram em 1 hora; o cache curto faz as mudanças aparecerem em 1 a 3 minutos.
  return Response.json({ trabalhos, campos }, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
};

export const config = { path: '/api/trabalhos' };
