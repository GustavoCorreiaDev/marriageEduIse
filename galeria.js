import { listarMidias, contarMidias } from './db.js';

const feed = document.getElementById('feed');
const sentinela = document.getElementById('sentinela');

const PAGE_SIZE = 12;
let offset = 0;
let carregando = false;
let fim = false;

async function carregarMais() {
  if (carregando || fim) return;
  carregando = true;
  sentinela.textContent = 'Carregando...';

  const itens = await listarMidias({ offset, limit: PAGE_SIZE });

  if (!itens.length) {
    fim = true;
    sentinela.textContent = offset === 0
      ? 'Nada aqui ainda. Envie a primeira foto! 📷'
      : 'Você chegou ao fim ✨';
    carregando = false;
    return;
  }

  itens.forEach(renderItem);
  offset += itens.length;
  sentinela.textContent = 'Carregando...';
  carregando = false;
}

function renderItem(item) {
  const el = document.createElement('article');
  el.className = 'post';
  el.innerHTML = `
    <div class="post-midia">
      ${item.tipo === 'foto'
        ? `<img src="${item.url}" loading="lazy" alt="" />`
        : `<video src="${item.url}" controls playsinline preload="metadata"></video>`}
    </div>
    <div class="post-meta">
      ${new Date(item.criado_em).toLocaleString('pt-BR')} · ${item.tamanho_kb} KB
    </div>
  `;
  feed.appendChild(el);
}

const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) carregarMais();
}, { rootMargin: '400px' });

observer.observe(sentinela);
carregarMais();