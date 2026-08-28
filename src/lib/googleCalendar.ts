import { CalendarAction } from '../types';
import { initFirebase } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_STORAGE_KEY = 'mm_gcal_access_token';
const EXPIRY_STORAGE_KEY = 'mm_gcal_token_expiry';

/**
 * Retrieves a valid Google Calendar OAuth Access Token.
 * Prompts user with Google Sign-In popup with Calendar scopes if not already authorized.
 */
export async function getCalendarAccessToken(forcePrompt = false): Promise<string> {
  if (!forcePrompt) {
    const cachedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const cachedExpiry = sessionStorage.getItem(EXPIRY_STORAGE_KEY);
    if (cachedToken && cachedExpiry) {
      const expiryTime = parseInt(cachedExpiry, 10);
      // Ensure at least 5 minutes remaining
      if (Date.now() < expiryTime - 5 * 60 * 1000) {
        return cachedToken;
      }
    }
  }

  const { auth } = await initFirebase();
  const provider = new GoogleAuthProvider();
  provider.addScope(CALENDAR_SCOPE);
  provider.setCustomParameters({
    prompt: 'consent'
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('Could not obtain Google Calendar authorization from your Google account.');
  }

  // Google OAuth tokens are typically valid for 3600 seconds (1 hour). Cache for 50 minutes.
  const expiry = Date.now() + 50 * 60 * 1000;
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(EXPIRY_STORAGE_KEY, expiry.toString());

  return token;
}

/**
 * Clear cached token if expired or revoked.
 */
export function clearCalendarAccessToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(EXPIRY_STORAGE_KEY);
}

/**
 * Format start and end date/time for Google Calendar API payload.
 */
function buildCalendarEventTimes(action: CalendarAction) {
  const rawDate = action.date || new Date().toISOString().split('T')[0];
  const isoMatch = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);

  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  }

  if (action.time) {
    // Timed event
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

    let durationMinutes = 60;
    if (action.duration) {
      const numMatch = action.duration.match(/(\d+)/);
      if (numMatch) {
        const val = parseInt(numMatch[1], 10);
        if (/h|hour/i.test(action.duration)) {
          durationMinutes = val * 60;
        } else {
          durationMinutes = val;
        }
      }
    }

    // Build local date time object
    const startObj = new Date(year, month - 1, day, hours, mins);
    const endObj = new Date(startObj.getTime() + durationMinutes * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    // Format to local ISO without Z to preserve local time or with timezone
    const formatLocalIso = (d: Date) => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    return {
      start: {
        dateTime: formatLocalIso(startObj),
        timeZone
      },
      end: {
        dateTime: formatLocalIso(endObj),
        timeZone
      }
    };
  } else {
    // All-day event
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${year}-${pad(month)}-${pad(day)}`;

    // End date is exclusive in Google Calendar, so add 1 day
    const nextDayObj = new Date(year, month - 1, day + 1);
    const endStr = `${nextDayObj.getFullYear()}-${pad(nextDayObj.getMonth() + 1)}-${pad(nextDayObj.getDate())}`;

    return {
      start: { date: startStr },
      end: { date: endStr }
    };
  }
}

/**
 * Creates an event directly in Google Calendar using the Google Calendar REST API.
 */
export async function createGoogleCalendarEvent(action: CalendarAction): Promise<{ id: string; htmlLink: string }> {
  let token: string;
  try {
    token = await getCalendarAccessToken(false);
  } catch (err: any) {
    throw new Error(err.message || 'Calendar permission was not granted.');
  }

  const { start, end } = buildCalendarEventTimes(action);

  const payload: any = {
    summary: action.title || 'MindMirror Reminder',
    description: action.description 
      ? `${action.description}\n\nCreated from MindMirror cognitive reflection.` 
      : 'Created from MindMirror cognitive reflection.',
    start,
    end,
    reminders: {
      useDefault: true
    }
  };

  if (action.location) {
    payload.location = action.location;
  }

  const sendRequest = async (accessToken: string) => {
    return await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  };

  let response = await sendRequest(token);

  // If token expired or unauthorized, try refreshing once
  if (response.status === 401) {
    clearCalendarAccessToken();
    token = await getCalendarAccessToken(true);
    response = await sendRequest(token);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Failed to create calendar event (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${data.id}`
  };
}

/**
 * Deletes / Undoes a created event in Google Calendar using the REST API.
 */
export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  if (!eventId) return;

  let token = await getCalendarAccessToken(false);

  const sendDelete = async (accessToken: string) => {
    return await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
  };

  let response = await sendDelete(token);

  if (response.status === 401) {
    clearCalendarAccessToken();
    token = await getCalendarAccessToken(true);
    response = await sendDelete(token);
  }

  // 204 No Content, 404 (already deleted), 410 (gone) are considered deleted successfully
  if (!response.ok && response.status !== 404 && response.status !== 410 && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Failed to delete calendar event (${response.status})`;
    throw new Error(message);
  }
}
