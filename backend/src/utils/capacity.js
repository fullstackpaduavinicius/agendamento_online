import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js'; import tz from 'dayjs/plugin/timezone.js';
dayjs.extend(utc); dayjs.extend(tz);

const TZ = process.env.TZ || 'America/Maceio';

export function startOfDayLocal(dateLike) {
  return dayjs.tz(dateLike, TZ).startOf('day').toDate();
}

export function endOfDayLocal(dateLike) {
  return dayjs.tz(dateLike, TZ).endOf('day').toDate();
}
