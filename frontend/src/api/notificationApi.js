import api from './client';

export const notificationApi = {
  lister: (params) => api.get('/notifications', { params }).then((r) => r.data),
  marquerLue: (id) => api.patch(`/notifications/${id}/lue`).then((r) => r.data.notification),
  marquerToutesLues: () => api.patch('/notifications/lues').then((r) => r.data),
};
