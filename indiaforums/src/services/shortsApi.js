import api from './api';

export async function getShorts({ page = 1, pageSize = 20 } = {}) {
  return api.get('/shorts', { params: { pageNumber: page, pageSize } });
}
