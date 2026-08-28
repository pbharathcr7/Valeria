import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  ExternalLink, 
  Check, 
  Sparkles,
  Navigation,
  Loader2,
  Undo2,
  AlertCircle
} from 'lucide-react';
import { DetectedAction, CalendarAction, MapsAction, JournalEntry } from '../types';
import { createGoogleMapsUrl, formatActionDateTime } from '../lib/actionUtils';
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../lib/googleCalendar';

export interface CalendarActionCardProps {
  action: CalendarAction;
  onUpdateAction?: (updatedAction: CalendarAction) => void | Promise<void>;
  parentEntry?: JournalEntry;
  onSelectEntry?: (entry: JournalEntry) => void;
  className?: string;
}

export const CalendarActionCard: React.FC<CalendarActionCardProps> = ({
  action,
  onUpdateAction,
  parentEntry,
  onSelectEntry,
  className = ''
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCreated = action.status === 'created' || Boolean(action.googleEventId || action.googleEventLink);
  const isActionLoading = isCreating || isUndoing;
  const dateTimeDisplay = formatActionDateTime(action);
  const cardId = action.id || `cal_${action.title.replace(/\s+/g, '_')}`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(current => (current === msg ? null : current));
    }, 4000);
  };

  const handleCreateEvent = async () => {
    if (isActionLoading) return;
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const result = await createGoogleCalendarEvent(action);
      const updatedAction: CalendarAction = {
        ...action,
        status: 'created',
        googleEventId: result.id,
        googleEventLink: result.htmlLink
      };

      await onUpdateAction?.(updatedAction);
      showToast('Event added to Google Calendar');
    } catch (err: any) {
      console.error('Error creating Google Calendar event:', err);
      setErrorMessage(err?.message || 'Failed to create calendar event. Please check permissions.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUndoEvent = async () => {
    if (!action.googleEventId || isActionLoading) return;
    setIsUndoing(true);
    setErrorMessage(null);

    try {
      await deleteGoogleCalendarEvent(action.googleEventId);
      const updatedAction: CalendarAction = {
        ...action,
        status: 'pending',
        googleEventId: undefined,
        googleEventLink: undefined
      };

      await onUpdateAction?.(updatedAction);
      showToast('Event removed from Google Calendar');
    } catch (err: any) {
      console.error('Error undoing calendar event:', err);
      setErrorMessage(err?.message || 'Failed to remove calendar event.');
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div
      id={`action-calendar-card-${cardId}`}
      className={`group relative flex flex-col justify-between p-3.5 rounded-xl border transition shadow-xs ${
        isCreated 
          ? 'bg-emerald-50/50 border-emerald-200/90' 
          : 'bg-amber-50/60 border-amber-200/90 hover:border-amber-300 hover:bg-amber-50/90'
      } ${className}`}
    >
      <div className="space-y-2">
        {/* Badge & Source Entry Header */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
            <span className={`p-1 rounded-md ${isCreated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100/90 text-amber-700'}`}>
              <CalendarIcon className="w-3 h-3" />
            </span>
            <span>{isCreated ? 'Google Calendar Event' : 'Suggested Event'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isCreated && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                <Check className="w-2.5 h-2.5" />
                <span>Added</span>
              </span>
            )}

            {parentEntry && onSelectEntry && (
              <button
                type="button"
                onClick={() => onSelectEntry(parentEntry)}
                className="text-[10px] font-mono text-stone-400 hover:text-stone-800 underline truncate max-w-[120px] cursor-pointer"
                title={`From reflection: ${parentEntry.title}`}
              >
                From: {parentEntry.title || 'Session'}
              </button>
            )}
          </div>
        </div>

        {/* Transient Toast Banner */}
        {toastMessage && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 animate-in fade-in duration-200 w-full">
            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Event Title */}
        <h5 className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug">
          {action.title}
        </h5>

        {/* Date & Time */}
        <div className="flex items-center gap-1.5 text-[11px] text-stone-600 font-mono">
          <Clock className="w-3 h-3 text-stone-400 shrink-0" />
          <span>{dateTimeDisplay}</span>
        </div>

        {/* Optional Location */}
        {action.location && (
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
            <span className="truncate">{action.location}</span>
          </div>
        )}

        {/* Optional Description */}
        {action.description && (
          <p className="text-[11px] text-stone-500 line-clamp-2 italic leading-relaxed">
            "{action.description}"
          </p>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="mt-1 flex items-start gap-1 p-2 rounded-lg bg-rose-50 text-rose-800 text-[10px] border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span className="flex-1">{errorMessage}</span>
            <button 
              type="button" 
              onClick={() => setErrorMessage(null)} 
              className="text-rose-500 hover:text-rose-900 text-[10px] underline ml-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="pt-3 mt-2 border-t border-stone-200/60">
        {isCreated ? (
          <div className="flex items-center gap-2">
            {/* View Event Link */}
            {action.googleEventLink && (
              <a
                id={`view-event-btn-${cardId}`}
                href={action.googleEventLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 transition shadow-2xs text-center cursor-pointer"
                title="View event in Google Calendar"
              >
                <span>View Event</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
            )}

            {/* Undo Action */}
            <button
              id={`undo-event-btn-${cardId}`}
              type="button"
              disabled={isActionLoading}
              onClick={handleUndoEvent}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer disabled:opacity-50"
              title="Remove this event from Google Calendar"
            >
              {isUndoing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Undo2 className="w-3 h-3" />
              )}
              <span>Undo</span>
            </button>
          </div>
        ) : (
          <button
            id={`create-calendar-event-btn-${cardId}`}
            type="button"
            disabled={isActionLoading}
            onClick={handleCreateEvent}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.98] shadow-xs transition cursor-pointer disabled:opacity-60"
            title="Create this event in your Google Calendar"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Event...</span>
              </>
            ) : (
              <>
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Create Event in Google Calendar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export interface MapsActionCardProps {
  action: MapsAction;
  parentEntry?: JournalEntry;
  onSelectEntry?: (entry: JournalEntry) => void;
  className?: string;
}

export const MapsActionCard: React.FC<MapsActionCardProps> = ({
  action,
  parentEntry,
  onSelectEntry,
  className = ''
}) => {
  const [isOpeningMaps, setIsOpeningMaps] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const mapsUrl = createGoogleMapsUrl(action);
  const cardId = action.id || `map_${action.placeName.replace(/\s+/g, '_')}`;

  const handleMapsClick = () => {
    setIsOpeningMaps(true);
    setIsClicked(true);
    try {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setTimeout(() => setIsOpeningMaps(false), 300);
    }
  };

  return (
    <div
      id={`action-maps-card-${cardId}`}
      className={`group relative flex flex-col justify-between p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/90 hover:border-emerald-300 hover:bg-emerald-50/90 transition shadow-xs ${className}`}
    >
      <div className="space-y-2">
        {/* Badge & Source Entry */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
            <span className="p-1 rounded-md bg-emerald-100/90 text-emerald-700">
              <MapPin className="w-3 h-3" />
            </span>
            <span>Detected Location</span>
          </div>

          {parentEntry && onSelectEntry && (
            <button
              type="button"
              onClick={() => onSelectEntry(parentEntry)}
              className="text-[10px] font-mono text-stone-400 hover:text-stone-800 underline truncate max-w-[120px] cursor-pointer"
              title={`From reflection: ${parentEntry.title}`}
            >
              From: {parentEntry.title || 'Session'}
            </button>
          )}
        </div>

        {/* Place Name */}
        <h5 className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug">
          {action.placeName}
        </h5>

        {action.query && action.query !== action.placeName && (
          <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
            {action.query}
          </p>
        )}

        <p className="text-[11px] text-stone-500">
          Physical location referenced in your reflection
        </p>
      </div>

      {/* Action Button */}
      <div className="pt-3 mt-2 border-t border-emerald-200/60">
        <button
          id={`open-in-maps-btn-${cardId}`}
          type="button"
          disabled={isOpeningMaps}
          onClick={handleMapsClick}
          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            isClicked
              ? 'bg-emerald-200/70 text-emerald-900 border border-emerald-300'
              : 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-[0.98] shadow-xs'
          } disabled:opacity-75`}
          title="View this location on Google Maps"
        >
          {isOpeningMaps ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Opening Maps...</span>
            </>
          ) : isClicked ? (
            <>
              <Navigation className="w-3.5 h-3.5 text-emerald-900" />
              <span>Opened in Maps</span>
            </>
          ) : (
            <>
              <MapPin className="w-3.5 h-3.5" />
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface ActionCardsProps {
  actions?: DetectedAction[];
  messageId: string;
  onUpdateAction?: (updatedAction: DetectedAction) => void;
}

export const ActionCards: React.FC<ActionCardsProps> = ({ actions, messageId, onUpdateAction }) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  const calendarActions = actions.filter((a): a is CalendarAction => a.type === 'calendar');
  const mapsActions = actions.filter((a): a is MapsAction => a.type === 'maps');

  return (
    <div 
      id={`actions-container-${messageId}`} 
      className="mt-3 pt-3 border-t border-stone-200/80 space-y-2.5 not-prose"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Actionable Suggestions</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Calendar Action Cards */}
        {calendarActions.map(action => (
          <CalendarActionCard
            key={action.id}
            action={action}
            onUpdateAction={onUpdateAction}
          />
        ))}

        {/* Maps Action Cards */}
        {mapsActions.map(action => (
          <MapsActionCard
            key={action.id}
            action={action}
          />
        ))}
      </div>
    </div>
  );
};

