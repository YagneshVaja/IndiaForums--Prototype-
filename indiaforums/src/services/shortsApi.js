import api from './api';

export async function getShorts({ page = 1, pageSize = 20, categoryId = null } = {}) {
  const params = { pageNumber: page, pageSize };
  if (categoryId != null) params.parentCategoryId = categoryId;
  return api.get('/shorts', { params });
}
