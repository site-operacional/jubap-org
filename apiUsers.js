import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getSecondaryAuth } from './firebase';
import { listAll, getOne, createDoc, createDocWithId, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

export async function usersList() {
  const [users, roles] = await Promise.all([listAll('users'), listAll('roles')]);
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.nome]));
  return users
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    .map((u) => ({ ...u, role_nome: roleMap[u.role_id] }));
}

export async function usersCreate({ nome, email, senha, role_id }) {
  if (!nome || !email || !senha || !role_id) throw apiError('Preencha nome, e-mail, senha e função.');
  const secondaryAuth = getSecondaryAuth();
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), senha);
  } catch (e) {
    if (e?.code === 'auth/email-already-in-use') throw apiError('Já existe um usuário com este e-mail.', 409);
    if (e?.code === 'auth/weak-password') throw apiError('A senha precisa ter pelo menos 6 caracteres.');
    throw apiError('Não foi possível criar o usuário. Verifique os dados e tente novamente.');
  }
  const uid = cred.user.uid;
  await createDocWithId('users', uid, { nome, email: email.trim().toLowerCase(), role_id, ativo: true });
  await signOut(secondaryAuth);
  await writeAudit({ edition_id: null, modulo: 'Usuários', acao: 'criacao', registro: nome, descricao: `Criou o usuário "${nome}" (${email}).` });
  return { id: uid, nome, email, role_id, ativo: true };
}

export async function usersUpdate(id, body) {
  const u = await getOne('users', id);
  if (!u) throw apiError('Usuário não encontrado.');
  const patch = {};
  if (body.nome !== undefined) patch.nome = body.nome;
  if (body.role_id !== undefined) patch.role_id = body.role_id;
  if (body.ativo !== undefined) patch.ativo = !!body.ativo;
  await patchDoc('users', id, patch);
  await writeAudit({ edition_id: null, modulo: 'Usuários', acao: 'edicao', registro: u.nome, descricao: `Editou o usuário "${u.nome}".` });
  return { ok: true };
}

export async function rolesList() {
  return listAll('roles');
}

export async function rolesCreate({ nome, descricao, permissoes, readOnly }) {
  if (!nome?.trim()) throw apiError('Informe o nome do perfil.');
  const created = await createDoc('roles', {
    nome: nome.trim(), descricao: descricao || '',
    permissoes: readOnly ? ['*'] : (Array.isArray(permissoes) ? permissoes : []),
    readOnly: !!readOnly, sistema: false,
  });
  await writeAudit({ edition_id: null, modulo: 'Permissões', acao: 'criacao', registro: nome, descricao: `Criou o perfil de acesso "${nome}".` });
  return created;
}

export async function rolesUpdate(id, body) {
  const role = await getOne('roles', id);
  if (!role) throw apiError('Perfil não encontrado.');
  if (role.sistema) throw apiError('Este é um perfil padrão do sistema e não pode ser editado. Crie um novo perfil personalizado.', 403);
  const patch = {};
  if (body.nome !== undefined) patch.nome = body.nome;
  if (body.descricao !== undefined) patch.descricao = body.descricao;
  if (body.readOnly !== undefined) patch.readOnly = !!body.readOnly;
  if (body.permissoes !== undefined) patch.permissoes = body.readOnly ? ['*'] : body.permissoes;
  const updated = await patchDoc('roles', id, patch);
  await writeAudit({ edition_id: null, modulo: 'Permissões', acao: 'edicao', registro: role.nome, descricao: `Editou o perfil de acesso "${role.nome}".` });
  return updated;
}

export async function rolesDelete(id) {
  const role = await getOne('roles', id);
  if (!role) throw apiError('Perfil não encontrado.');
  if (role.sistema) throw apiError('Este é um perfil padrão do sistema e não pode ser excluído.', 403);
  const users = await listAll('users');
  if (users.some((u) => u.role_id === id)) throw apiError('Existem usuários com este perfil. Troque o perfil deles antes de excluir.', 409);
  await removeDoc('roles', id);
  await writeAudit({ edition_id: null, modulo: 'Permissões', acao: 'exclusao', registro: role.nome, descricao: `Excluiu o perfil de acesso "${role.nome}".` });
  return { ok: true };
}
