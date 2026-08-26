import { getOne, createDocWithId, patchDoc, writeAudit } from './fs';

const DOC_ID = 'branding';
const COLL = 'settings';

export const DEFAULT_BRANDING = {
  siteName: 'Juventude',
  logoUrl: null,
  primaryColor: '#2f6a3d',
};

export async function getBranding() {
  const doc = await getOne(COLL, DOC_ID);
  return doc ? { ...DEFAULT_BRANDING, ...doc } : DEFAULT_BRANDING;
}

export async function updateBranding(body) {
  const patch = {};
  if (body.siteName !== undefined) patch.siteName = body.siteName || DEFAULT_BRANDING.siteName;
  if (body.logoUrl !== undefined) patch.logoUrl = body.logoUrl || null;
  if (body.primaryColor !== undefined) patch.primaryColor = body.primaryColor || DEFAULT_BRANDING.primaryColor;

  const existing = await getOne(COLL, DOC_ID);
  if (existing) await patchDoc(COLL, DOC_ID, patch);
  else await createDocWithId(COLL, DOC_ID, { ...DEFAULT_BRANDING, ...patch });

  await writeAudit({ edition_id: null, modulo: 'Configurações', acao: 'edicao', registro: 'Aparência', descricao: 'Atualizou a identidade visual do sistema (nome, logo e/ou cor-tema).' });
  return getBranding();
}
