import { NotFoundError } from '../../common/errors.js';
import { assembleDay, buildPhases } from './track-logic.js';

/** Study tracks: list, start, detail and a single day's lessons. */
export function createTracksService({ tracksRepo }) {
  /** One day of a track with its lessons and sessions; shared by tracks, today and dashboard. */
  async function dayDetail(trackId, dayNo, userId) {
    const day = await tracksRepo.dayRow(trackId, dayNo);
    if (!day) throw new NotFoundError('Không tìm thấy ngày học này.');
    const [items, sections] = await Promise.all([tracksRepo.dayItems(trackId, dayNo), tracksRepo.daySections(trackId, dayNo, userId)]);
    return assembleDay(day, items, sections);
  }

  return {
    dayDetail,
    /** Tracks with progress; `days_done` only exists once the user started the track. */
    async list(userId) {
      return (await tracksRepo.list(userId)).map(({ days_done, ...t }) => (t.started_at ? { ...t, days_done } : t));
    },

    async detail(trackId, userId) {
      const track = await tracksRepo.find(trackId, userId);
      if (!track) throw new NotFoundError('Không tìm thấy lộ trình.');
      const days = await tracksRepo.days(trackId, userId);
      return {
        track,
        days: days.map((d) => ({ id: d.id, day_no: d.day_no, title: d.title, minutes: d.minutes, topic_title: d.topic_title, total: d.total, done: d.done })),
        phases: buildPhases(days),
      };
    },

    async day(trackId, dayNo, userId) {
      if (!(await tracksRepo.find(trackId, userId))) throw new NotFoundError('Không tìm thấy lộ trình.');
      const { doneMinutes, items, ...d } = await dayDetail(trackId, dayNo, userId);
      return { ...d, items: items.map(({ minutes, ...it }) => it) };
    },

    async start(trackId, userId) {
      if (!(await tracksRepo.find(trackId, userId))) throw new NotFoundError('Không tìm thấy lộ trình.');
      await tracksRepo.activate(userId, trackId);
      return { ok: true, trackId };
    },
  };
}
