import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { generateRamp, applyRampToRoot, resetRampToDefault } from '../lib/colorUtils';
import { DEFAULT_BRANDING } from '../lib/apiBranding';

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/branding');
      setBranding(data);
      applyBranding(data);
    } catch {
      // Sem Firebase configurado (ex.: pré-visualização) ou sem conexão —
      // mantém os valores padrão em vez de travar a interface.
      setBranding(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function applyBranding(data) {
    document.title = data.siteName || DEFAULT_BRANDING.siteName;
    if (data.primaryColor && data.primaryColor !== DEFAULT_BRANDING.primaryColor) {
      applyRampToRoot(generateRamp(data.primaryColor));
    } else {
      resetRampToDefault();
    }
  }

  async function updateBranding(patch) {
    const { data } = await api.put('/settings/branding', patch);
    setBranding(data);
    applyBranding(data);
    return data;
  }

  return (
    <BrandingContext.Provider value={{ ...branding, loading, updateBranding, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
