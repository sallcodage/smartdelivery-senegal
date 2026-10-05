import api from './client';

export const assistantApi = {
  etat: () => api.get('/assistant/etat').then((r) => r.data),
  historique: (params) => api.get('/assistant/historique', { params }).then((r) => r.data),
  // L'IA peut prendre plusieurs secondes : délai plus long que les autres appels
  poser: (question) => api.post('/assistant/questions', { question }, { timeout: 60000 }).then((r) => r.data),
};
