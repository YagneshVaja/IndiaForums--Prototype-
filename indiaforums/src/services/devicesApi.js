import api from './api';

export function getDevices()                          { return api.get('/devices'); }
export function registerDevice(data)                  { return api.post('/devices/register', data); }
export function removeDevice(deviceId)                { return api.delete(`/devices/${deviceId}`); }
export function updateDevicePreferences(deviceId, data) { return api.put(`/devices/${deviceId}/preferences`, data); }
