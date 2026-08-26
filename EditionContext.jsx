import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const EditionContext = createContext(null);

/**
 * Provedor do "workspace" de uma edição específica do retiro.
 * O `editionId` vem da rota (/retiros/:editionId/...) — não é mais um estado
 * global solto: cada edição tem sua própria URL, o que permite abrir duas
 * edições em abas diferentes e reflete melhor o conceito de "módulo do retiro".
 */
export function EditionProvider({ editionId, children }) {
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/editions');
    setEditions(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const current = editions.find((e) => e.id === editionId) || null;

  return (
    <EditionContext.Provider value={{ editions, current, currentId: editionId, refresh, loading }}>
      {children}
    </EditionContext.Provider>
  );
}

export function useEdition() {
  return useContext(EditionContext);
}
