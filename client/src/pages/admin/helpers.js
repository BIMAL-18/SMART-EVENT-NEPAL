import { api } from '../../api/client.js';
export const getAttendanceModelInfo = () => api.get('/ai/attendance/model-info').then(r => r.data);
