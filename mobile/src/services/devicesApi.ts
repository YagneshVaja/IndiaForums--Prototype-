import api from './api';

export function getDevices() {
  return api.get('/devices');
}

export function registerDevice(data: any) {
  return api.post('/devices/register', data);
}

export function removeDevice(deviceId: number | string) {
  return api.delete(`/devices/${deviceId}`);
}

export function updateDevicePreferences(deviceId: number | string, data: any) {
  return api.put(`/devices/${deviceId}/preferences`, data);
}
