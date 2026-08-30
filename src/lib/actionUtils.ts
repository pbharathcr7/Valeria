import { CalendarAction, MapsAction } from '../types';

/**
 * Generate a Google Calendar event template URL.
 * URL parameters:
 * - action=TEMPLATE
 * - text: Event title
 * - dates: YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ (or YYYYMMDD/YYYYMMDD)
 * - details: Description
 * - location: Location
 */
export function createGoogleCalendarUrl(action: CalendarAction): string {
  let datesParam = '';
  
  try {
    const rawDate = action.date || '';
    // Extract YYYY-MM-DD if available
    const isoDateMatch = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    
    if (isoDateMatch) {
      const [, yearStr, monthStr, dayStr] = isoDateMatch;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      if (action.time) {
        // Parse time like "3:00 PM", "15:00", "10:30am"
        let hours = 9;
        let mins = 0;
        const timeMatch = action.time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const meridian = timeMatch[3]?.toLowerCase();
          if (meridian === 'pm' && hours < 12) hours += 12;
          if (meridian === 'am' && hours === 12) hours = 0;
        }

        // Duration calculation
        let durationMins = 60;
        if (action.duration) {
          const numMatch = action.duration.match(/(\d+)/);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            if (/h|hour/i.test(action.duration)) {
              durationMins = num * 60;
            } else {
              durationMins = num;
            }
          }
        }

        const startDt = new Date(Date.UTC(year, month - 1, day, hours, mins));
        const endDt = new Date(startDt.getTime() + durationMins * 60 * 1000);

        const formatGCalTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        datesParam = `${formatGCalTime(startDt)}/${formatGCalTime(endDt)}`;
      } else {
        // All-day event: YYYYMMDD/YYYYMMDD (next day)
        const startDt = new Date(Date.UTC(year, month - 1, day));
        const endDt = new Date(startDt.getTime() + 24 * 60 * 60 * 1000);
        const formatDay = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
        datesParam = `${formatDay(startDt)}/${formatDay(endDt)}`;
      }
    }
  } catch (e) {
    console.warn('Error formatting calendar dates parameter:', e);
  }

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', action.title || 'Valeria Reminder');
  
  if (datesParam) {
    params.set('dates', datesParam);
  }
  
  const detailsParts: string[] = [];
  if (action.description) {
    detailsParts.push(action.description);
  }
  detailsParts.push('\nCreated via Valeria cognitive reflection');
  params.set('details', detailsParts.join('\n'));

  if (action.location) {
    params.set('location', action.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate a Google Maps search URL.
 */
export function createGoogleMapsUrl(action: MapsAction): string {
  const query = action.query || action.placeName;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Human-friendly date and time formatter for action card display
 */
export function formatActionDateTime(action: CalendarAction): string {
  const parts: string[] = [];

  if (action.date) {
    // Try to format YYYY-MM-DD nicely
    const isoDateMatch = action.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      try {
        const [year, month, day] = action.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        parts.push(dateObj.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        }));
      } catch {
        parts.push(action.date);
      }
    } else {
      parts.push(action.date);
    }
  }

  if (action.time) {
    parts.push(action.time);
  }

  if (action.duration) {
    parts.push(`(${action.duration})`);
  }

  return parts.join(' • ') || 'Upcoming';
}
