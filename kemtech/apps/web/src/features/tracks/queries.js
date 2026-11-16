import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTrack, fetchTrackDay, fetchTracks, startTrack } from '@/features/tracks/api.js';

export const tracksKeys = {
  all: ['tracks'],
  detail: (trackId) => ['track', trackId],
  day: (trackId, dayNo) => ['day', trackId, dayNo],
};

export const useTracksQuery = () => useQuery({ queryKey: tracksKeys.all, queryFn: fetchTracks });

export const useTrackQuery = (trackId) =>
  useQuery({ queryKey: tracksKeys.detail(trackId), queryFn: () => fetchTrack(trackId) });

export const useTrackDayQuery = (trackId, dayNo) =>
  useQuery({ queryKey: tracksKeys.day(trackId, dayNo), queryFn: () => fetchTrackDay(trackId, dayNo) });

/** Starting a track changes "today" and every progress view, so invalidate everything. */
export function useStartTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startTrack,
    meta: { success: 'Đã bắt đầu lộ trình' },
    onSuccess: () => qc.invalidateQueries(),
  });
}
