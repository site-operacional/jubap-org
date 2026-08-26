// Guarda em memória os dados do usuário logado (uid, nome, perfil) para que
// o módulo de auditoria (db.js) saiba quem está fazendo cada alteração,
// sem precisar repassar essa informação em cada chamada.
export const session = {
  uid: null,
  nome: null,
  role_id: null,
};

export function setSession({ uid, nome, role_id }) {
  session.uid = uid;
  session.nome = nome;
  session.role_id = role_id;
}

export function clearSession() {
  session.uid = null;
  session.nome = null;
  session.role_id = null;
}
