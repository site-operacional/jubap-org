import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { dbFirestore } from './firebase';
import { session } from './session';

export function col(name) {
  return collection(dbFirestore, name);
}

export function toRow(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function listByEdition(collName, edition_id) {
  if (!edition_id) return [];
  const snap = await getDocs(query(col(collName), where('edition_id', '==', edition_id)));
  return snap.docs.map(toRow);
}

export async function listAll(collName) {
  const snap = await getDocs(col(collName));
  return snap.docs.map(toRow);
}

export async function getOne(collName, id) {
  if (!id) return null;
  const snap = await getDoc(doc(dbFirestore, collName, id));
  return snap.exists() ? toRow(snap) : null;
}

export async function createDoc(collName, data) {
  const ref = await addDoc(col(collName), { ...data, criado_em: new Date().toISOString() });
  return getOne(collName, ref.id);
}

// Cria um documento com um ID específico (usado para o perfil do usuário,
// que precisa ter o mesmo ID do UID do Firebase Auth).
export async function createDocWithId(collName, id, data) {
  await setDoc(doc(dbFirestore, collName, id), { ...data, criado_em: new Date().toISOString() });
  return getOne(collName, id);
}

export async function patchDoc(collName, id, data) {
  await updateDoc(doc(dbFirestore, collName, id), data);
  return getOne(collName, id);
}

export async function removeDoc(collName, id) {
  await deleteDoc(doc(dbFirestore, collName, id));
  return { ok: true };
}

/**
 * Registra uma entrada no histórico de auditoria (coleção `auditLog`).
 * Nunca é apagado automaticamente — nem ao duplicar uma edição.
 */
export async function writeAudit({ edition_id, modulo, acao, registro, descricao }) {
  try {
    await addDoc(col('auditLog'), {
      edition_id: edition_id || null,
      user_id: session.uid || null,
      user_nome: session.nome || 'Sistema',
      modulo,
      acao,
      registro: registro || null,
      descricao,
      criado_em: new Date().toISOString(),
    });
  } catch (e) {
    // Nunca deixamos uma falha ao gravar auditoria quebrar a ação principal do usuário.
    console.error('Falha ao gravar auditoria:', e);
  }
}

export { serverTimestamp };
