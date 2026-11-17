const fileInput = document.getElementById('file');
const preview   = document.getElementById('preview');
const btnEnviar = document.getElementById('enviar');
const status    = document.getElementById('status');

let arquivoOtimizado = null; // Blob WebP
let previewUrl = null;

const MAX_LADO  = 1200;
const QUALIDADE = 0.8;
const STORAGE_KEY = 'fotos_webp';

// ---------- SELEÇÃO E COMPRESSÃO ----------
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  status.textContent = 'Otimizando imagem...';
  btnEnviar.disabled = true;

  // limpa preview anterior
  if (previewUrl) URL.revokeObjectURL(previewUrl);

  const imagem = await carregarImagem(file);
  const { blob, url } = await otimizarParaWebP(imagem);

  arquivoOtimizado = blob;
  previewUrl = url;

  preview.innerHTML = `<img src="${url}" alt="Preview" />`;
  status.textContent = `Pronto! ${(blob.size / 1024).toFixed(0)} KB em WebP`;
  btnEnviar.disabled = false;
});

// ---------- BOTÃO SALVAR ----------
btnEnviar.addEventListener('click', async () => {
  if (!arquivoOtimizado) return;

  status.textContent = 'Salvando...';
  btnEnviar.disabled = true;

  try {
    const base64 = await blobParaBase64(arquivoOtimizado);

    const fotos = carregarFotos();
    fotos.push({
      id: Date.now(),
      data: new Date().toISOString(),
      tamanhoKB: Math.round(arquivoOtimizado.size / 1024),
      imagem: base64, // data:image/webp;base64,...
    });

    salvarFotos(fotos);
    status.textContent = '✅ Foto salva no navegador!';
  } catch (err) {
    console.error(err);
    status.textContent = '❌ Erro ao salvar. Talvez o armazenamento esteja cheio.';
  } finally {
    btnEnviar.disabled = false;
  }
});

// ---------- HELPERS ----------
function carregarImagem(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function otimizarParaWebP(img) {
  let { width, height } = img;
  if (width > height && width > MAX_LADO) {
    height = Math.round(height * MAX_LADO / width);
    width = MAX_LADO;
  } else if (height > MAX_LADO) {
    width = Math.round(width * MAX_LADO / height);
    height = MAX_LADO;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve({ blob, url: URL.createObjectURL(blob) }),
      'image/webp',
      QUALIDADE
    );
  });
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function carregarFotos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function salvarFotos(fotos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fotos));
}