import api, { PAGINATION_DEFAULTS } from './api';

export function getMyActivities(params: any = {}) {
  return api.get('/user-activities', { params: { ...PAGINATION_DEFAULTS, ...params } });
}

export function createActivity(data: any) {
  return api.post('/user-activities', data);
}

export function getUserActivities(userId: number | string, params: any = {}) {
  return api.get(`/user-activities/${userId}`, { params: { ...PAGINATION_DEFAULTS, ...params } });
}

export function postOnWall(data: any) {
  return api.post('/user-activities/post-on-wall', data);
}

export function updateActivity(activityId: number | string, data: any) {
  return api.put(`/user-activities/${activityId}`, data);
}

export function deleteActivity(activityId: number | string) {
  return api.delete(`/user-activities/${activityId}`);
}
