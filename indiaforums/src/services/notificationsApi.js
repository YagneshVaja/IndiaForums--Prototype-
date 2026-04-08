import api, { PAGINATION_DEFAULTS } from './api';

export function getNotifications(params = {})  { return api.get('/user-notifications', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getUnreadCount()               { return api.get('/user-notifications/unread-count'); }
export function markAsRead(data)               { return api.post('/user-notifications/read', data); }
