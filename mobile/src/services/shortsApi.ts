import api from './api';

export async function getShorts({ page = 1, pageSize = 20, categoryId = null }: {
  page?: number;
  pageSize?: number;
  categoryId?: number | null;
} = {}) {
  const params: any = { pageNumber: page, pageSize };
  if (categoryId != null) params.parentCategoryId = categoryId;
  return api.get('/shorts', { params });
}
