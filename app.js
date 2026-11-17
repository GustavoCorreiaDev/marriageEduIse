import { salvarMidia } from './db.js';

const fileInput = document.getElementById('file');
const preview   = document.getElementById('preview');
const btnEnviar = document.getElementById('enviar');
const status    = document.getElementById('status');

const MAX_LADO_FOTO = 1200;
const QUALIDADE_FOTO = 0.8;
const MAX_VIDEO_SEG = 10;
const MAX_VIDEO_MB  = 25;

let fila = []; // { blob, tipo, nome }

fileInput.addEventListener('change', async (e) => {
  fila = [];
  preview.innerHTML = '';
  btnEnviar.disabled = true;
  status.textContent = 'Processando...';

  for (const file of Array.from(e.target.files)) {
    try {
      if (file.type.startsWith('image/')) {
        const blob = await comprimirFoto(file);
        fila.push({ blob, tipo: 'foto', nome: file.name });
      } else if (file.type.startsWith('video/')) {
        if (await validarVideo(file)) {
          fila.push({ blob: file, tipo: 'video', nome: file.name });
        }
      }
    } catch (err) {
      console.error('Erro com', file.name, err);
    }
  }

  renderPreview();
  status.textContent = fila.length
    ? `${fila.length} arquivo(s) prontos.`
    : 'Nenhum arquivo válido.';
  btnEnviar.disabled = fila.length === 0;
});

function renderPreview() {
  preview.innerHTML = '';
  fila.forEach(({ blob, tipo }) => {
    const url = URL.createObjectURL(blob);
    const el = document.createElement('div');
    el.className = 'preview-item';
    el.innerHTML = tipo === 'foto'
      ? `<img src="${url}" />`
      : `<video src="${url}" muted playsinline></video>`;
    preview.appendChild(el);
  });
}

function comprimirFoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > MAX_LADO_FOTO) {
        height = Math.round(height * MAX_LADO_FOTO / width);
        width = MAX_LADO_FOTO;
      } else if (height > MAX_LADO_FOTO) {
        width = Math.round(width * MAX_LADO_FOTO / height);
        height = MAX_LADO_FOTO;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('toBlob falhou')),
        'image/webp',
        QUALIDADE_FOTO
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function validarVideo(file) {
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    alert(`"${file.name}" passa de ${MAX_VIDEO_MB} MB.`);
    return false;
  }
  const dur = await obterDuracao(file);
  if (dur > MAX_VIDEO_SEG + 0.5) {
    alert(`"${file.name}" tem ${dur.toFixed(1)}s (máx ${MAX_VIDEO_SEG}s).`);
    return false;
  }
  return true;
}

function obterDuracao(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

btnEnviar.addEventListener('click', async () => {
  btnEnviar.disabled = true;
  let ok = 0;

  for (let i = 0; i < fila.length; i++) {
    status.textContent = `Salvando ${i + 1}/${fila.length}...`;
    try {
      await salvarMidia(fila[i]);   // ← única chamada de persistência
      ok++;
    } catch (err) {
      console.error(err);
    }
  }

  status.textContent = `✅ ${ok}/${fila.length} salvos!`;
  fila = [];
  preview.innerHTML = '';
  fileInput.value = '';
});