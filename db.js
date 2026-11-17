// db.js
// Hoje: IndexedDB local (pra testar).
// Amanhã: trocar o corpo destas funções por chamadas ao Supabase.
// O resto do app NÃO precisa mudar.

const DB_NAME = 'midias_db';
const STORE = 'midias';
const VERSION = 1;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('criado_em', 'criado_em');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function salvarMidia({ blob, tipo, nome }) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add({
      tipo,                         // 'foto' | 'video'
      nome: nome || '',
      blob,                         // Blob direto (IndexedDB aceita)
      tamanho_kb: Math.round(blob.size / 1024),
      criado_em: Date.now(),
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listarMidias({ offset = 0, limit = 12 } = {}) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const index = store.index('criado_em');
    const out = [];
    let pulados = 0;

    // Cursor decrescente (mais novo primeiro), pulando `offset`
    const req = index.openCursor(null, 'prev');
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve(out);

      if (pulados < offset) {
        pulados++;
        cursor.continue();
        return;
      }
      if (out.length >= limit) return resolve(out);

      out.push({ id: cursor.value.id, ...cursor.value, url: URL.createObjectURL(cursor.value.blob) });
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function contarMidias() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}