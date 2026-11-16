import { api } from '@/shared/api/client.js';

export const fetchTracks = () => api('/tracks');
export const startTrack = (id) => api(`/tracks/${id}/start`, { method: 'POST' });
export const fetchTrack = (trackId) => api(`/tracks/${trackId}`);
export const fetchTrackDay = (trackId, dayNo) => api(`/tracks/${trackId}/days/${dayNo}`);
