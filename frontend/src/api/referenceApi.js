import api from './client';

let zonesEnCache = null;

export const referenceApi = {
  // Les zones changent rarement : un seul appel par session
  zones: async () => {
    if (!zonesEnCache) zonesEnCache = await api.get('/zones').then((r) => r.data.zones);
    return zonesEnCache;
  },
};
