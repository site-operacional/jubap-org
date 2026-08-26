// Script único de inicialização do banco no Firebase (rodar UMA VEZ, localmente).
//
// O que ele faz:
//  1. Cria os 4 perfis de acesso padrão (Administrador, Financeiro, Programação, Acomodações).
//  2. Cria o primeiro usuário administrador no Firebase Authentication + o perfil dele no Firestore.
//  3. Cria uma edição de exemplo do retiro, já com categorias e tipos básicos.
//
// Como usar:
//  1. No Console do Firebase → Configurações do projeto → Contas de serviço →
//     "Gerar nova chave privada". Salve o arquivo como `firebase/serviceAccountKey.json`
//     (esse arquivo NUNCA deve ir para o GitHub — já está no .gitignore).
//  2. cd firebase && npm install
//  3. node scripts/seed.js
//
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
} catch (e) {
  console.error(`\nNão encontrei "firebase/serviceAccountKey.json".`);
  console.error('Baixe a chave de conta de serviço no Console do Firebase (Configurações do projeto > Contas de serviço) e salve nesse caminho.\n');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@igreja.org';
const ADMIN_SENHA = process.env.SEED_ADMIN_SENHA || 'admin123';
const ADMIN_NOME = process.env.SEED_ADMIN_NOME || 'Administrador(a)';

function uid() {
  return db.collection('_').doc().id;
}

async function main() {
  console.log('Iniciando configuração do sistema no Firebase...\n');

  // 1. Perfis de acesso
  const roles = [
    { id: 'admin', nome: 'Administrador', descricao: 'Acesso total ao sistema.', permissoes: ['*'], sistema: true, readOnly: false },
    { id: 'financeiro', nome: 'Financeiro', descricao: 'Participantes, financeiro, arrecadações e relatórios financeiros.', permissoes: ['dashboard', 'participants', 'financial', 'fundraisers', 'shopping', 'history'], sistema: true, readOnly: false },
    { id: 'programacao', nome: 'Programação', descricao: 'Programação, gincana e eventos.', permissoes: ['dashboard', 'schedule', 'gymkhana', 'events'], sistema: true, readOnly: false },
    { id: 'acomodacoes', nome: 'Acomodações', descricao: 'Participantes, quartos e acomodações.', permissoes: ['dashboard', 'participants', 'rooms'], sistema: true, readOnly: false },
    { id: 'visualizador', nome: 'Visualizador', descricao: 'Pode navegar e ver todos os módulos, mas não pode criar, editar ou excluir nada.', permissoes: ['*'], sistema: true, readOnly: true },
  ];
  for (const r of roles) {
    await db.collection('roles').doc(r.id).set(r, { merge: true });
  }
  console.log('✓ Perfis de acesso criados (admin, financeiro, programacao, acomodacoes).');

  // 2. Usuário administrador
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
    console.log(`✓ Usuário ${ADMIN_EMAIL} já existe no Authentication, reaproveitando.`);
  } catch {
    userRecord = await auth.createUser({ email: ADMIN_EMAIL, password: ADMIN_SENHA, displayName: ADMIN_NOME });
    console.log(`✓ Usuário administrador criado: ${ADMIN_EMAIL} / senha: ${ADMIN_SENHA}`);
  }
  await db.collection('users').doc(userRecord.uid).set({
    nome: ADMIN_NOME, email: ADMIN_EMAIL, role_id: 'admin', ativo: true, criado_em: new Date().toISOString(),
  }, { merge: true });
  console.log('✓ Perfil do administrador salvo no Firestore.');

  // 3. Edição de exemplo (só cria se ainda não existir nenhuma edição)
  const existing = await db.collection('editions').limit(1).get();
  if (existing.empty) {
    const year = new Date().getFullYear();
    const edId = uid();
    await db.collection('editions').doc(edId).set({
      nome: `Retiro ${year}`, ano: year, tema: 'A definir', versiculo: 'A definir',
      data_inicio: null, data_fim: null, local: 'A definir', endereco: '',
      observacoes: 'Edição inicial criada automaticamente. Edite ou substitua pela edição real.',
      status: 'ativa', criado_a_partir_de: null, criado_em: new Date().toISOString(),
    });

    const catBatch = db.batch();
    const addCat = (tipo, nome, ordem) => {
      const ref = db.collection('categories').doc(uid());
      catBatch.set(ref, { edition_id: edId, tipo, nome, cor: '#2f6a3d', ativo: true, ordem });
    };
    ['Inscrições', 'Bazar', 'Cantina', 'Doações', 'Eventos', 'Outras arrecadações'].forEach((n, i) => addCat('entrada', n, i));
    ['Mercado', 'Açougue', 'Seara', 'Transporte', 'Brindes', 'Material', 'Decoração', 'Alimentação', 'Outros'].forEach((n, i) => addCat('saida', n, i));
    ['Individual', 'Coletivo', 'Barraca'].forEach((n, i) => addCat('acomodacao', n, i));
    ['Meia', 'Inteira', 'Não paga'].forEach((n, i) => addCat('classificacao', n, i));
    ['Bazar', 'Cantina', 'Evento', 'Doação', 'Rifa', 'Outros'].forEach((n, i) => addCat('arrecadacao', n, i));
    ['Mercado', 'Açougue', 'Material', 'Decoração', 'Outros'].forEach((n, i) => addCat('compra', n, i));
    await catBatch.commit();
    console.log(`✓ Edição de exemplo "Retiro ${year}" criada com categorias padrão.`);
  } else {
    console.log('✓ Já existe uma edição cadastrada — pulei a criação da edição de exemplo.');
  }

  console.log('\nTudo pronto! Faça login no sistema com:');
  console.log(`  E-mail: ${ADMIN_EMAIL}`);
  console.log(`  Senha:  ${ADMIN_SENHA}`);
  console.log('\nTroque essa senha assim que possível em Configurações.\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erro ao inicializar:', e);
  process.exit(1);
});
