import api, { PAGINATION_DEFAULTS } from './api';

export function getMyActivities(params = {})        { return api.get('/user-activities', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function createActivity(data)                 { return api.post('/user-activities', data); }
export function getUserActivities(userId, params = {}) { return api.get(`/user-activities/${userId}`, { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function postOnWall(data)                     { return api.post('/user-activities/post-on-wall', data); }
export function updateActivity(activityId, data)     { return api.put(`/user-activities/${activityId}`, data); }
export function deleteActivity(activityId)           { return api.delete(`/user-activities/${activityId}`); }
