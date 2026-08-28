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
import { DetectedAction, CalendarAction, MapsAction } from '../types';
import { createGoogleMapsUrl, formatActionDateTime } from '../lib/actionUtils';
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../lib/googleCalendar';

interface ActionCardsProps {
  actions?: DetectedAction[];
  messageId: string;
  onUpdateAction?: (updatedAction: DetectedAction) => void;
}

export const ActionCards: React.FC<ActionCardsProps> = ({ actions, messageId, onUpdateAction }) => {
  const [creatingCalendarId, setCreatingCalendarId] = useState<string | null>(null);
  const [openingMapsId, setOpeningMapsId] = useState<string | null>(null);
  const [undoingCalendarId, setUndoingCalendarId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ id: string; message: string } | null>(null);
  const [mapsClicked, setMapsClicked] = useState<Record<string, boolean>>({});

  if (!actions || actions.length === 0) {
    return null;
  }

  const calendarActions = actions.filter((a): a is CalendarAction => a.type === 'calendar');
  const mapsActions = actions.filter((a): a is MapsAction => a.type === 'maps');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const handleCreateCalendarEvent = async (action: CalendarAction, actionKey: string) => {
    setCreatingCalendarId(actionKey);
    setErrorMessage(null);

    try {
      const result = await createGoogleCalendarEvent(action);
      const updatedAction: CalendarAction = {
        ...action,
        status: 'created',
        googleEventId: result.id,
        googleEventLink: result.htmlLink
      };

      onUpdateAction?.(updatedAction);
      showToast('Event added to Google Calendar');
    } catch (err: any) {
      console.error('Error creating Google Calendar event:', err);
      setErrorMessage({
        id: actionKey,
        message: err?.message || 'Failed to create calendar event. Please check permissions.'
      });
    } finally {
      setCreatingCalendarId(null);
    }
  };

  const handleUndoCalendarEvent = async (action: CalendarAction, actionKey: string) => {
    if (!action.googleEventId) return;

    setUndoingCalendarId(actionKey);
    setErrorMessage(null);

    try {
      await deleteGoogleCalendarEvent(action.googleEventId);
      const updatedAction: CalendarAction = {
        ...action,
        status: 'pending',
        googleEventId: undefined,
        googleEventLink: undefined
      };

      onUpdateAction?.(updatedAction);
      showToast('Event removed from Google Calendar');
    } catch (err: any) {
      console.error('Error undoing calendar event:', err);
      setErrorMessage({
        id: actionKey,
        message: err?.message || 'Failed to remove calendar event.'
      });
    } finally {
      setUndoingCalendarId(null);
    }
  };

  const handleMapsClick = (actionKey: string, url: string) => {
    setOpeningMapsId(actionKey);
    setMapsClicked(prev => ({ ...prev, [actionKey]: true }));
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setTimeout(() => setOpeningMapsId(null), 300);
    }
  };

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

        {/* Transient In-Canvas Toast */}
        {toastMessage && (
          <div 
            id="action-toast-banner"
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 animate-in fade-in duration-200"
          >
            <Check className="w-3 h-3 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Calendar Action Cards */}
        {calendarActions.map((action, idx) => {
          const actionKey = action.id || `cal_${messageId}_${idx}`;
          const isCreatingCalendarEvent = creatingCalendarId === actionKey;
          const isUndoingCalendarEvent = undoingCalendarId === actionKey;
          const isActionLoading = isCreatingCalendarEvent || isUndoingCalendarEvent;
          const isCreated = action.status === 'created';
          const dateTimeDisplay = formatActionDateTime(action);
          const hasError = errorMessage?.id === actionKey;

          return (
            <div
              key={actionKey}
              id={`action-calendar-card-${actionKey}`}
              className={`group relative flex flex-col justify-between p-3 rounded-xl border transition shadow-xs ${
                isCreated 
                  ? 'bg-emerald-50/50 border-emerald-200/90' 
                  : 'bg-amber-50/60 border-amber-200/90 hover:border-amber-300 hover:bg-amber-50/90'
              }`}
            >
              <div className="space-y-1.5">
                {/* Badge / Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                    <span className={`p-1 rounded-md ${isCreated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100/90 text-amber-700'}`}>
                      <CalendarIcon className="w-3 h-3" />
                    </span>
                    <span>Suggested Calendar Event</span>
                  </div>

                  {isCreated && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                      <Check className="w-2.5 h-2.5" />
                      <span>Added</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h5 className="text-xs font-semibold text-stone-900 leading-snug">
                  {action.title}
                </h5>

                {/* Date & Time */}
                <div className="flex items-center gap-1.5 text-[11px] text-stone-600">
                  <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                  <span>{dateTimeDisplay}</span>
                </div>

                {/* Optional Description */}
                {action.description && (
                  <p className="text-[11px] text-stone-500 line-clamp-2 italic">
                    "{action.description}"
                  </p>
                )}

                {/* Error Banner */}
                {hasError && (
                  <div className="mt-1 flex items-start gap-1 p-1.5 rounded-lg bg-rose-50 text-rose-800 text-[10px] border border-rose-200">
                    <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMessage.message}</span>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="pt-2.5 mt-1">
                {isCreated ? (
                  <div className="flex items-center gap-2">
                    {/* View Event Link */}
                    {action.googleEventLink && (
                      <a
                        id={`view-event-btn-${actionKey}`}
                        href={action.googleEventLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 transition shadow-xs text-center"
                        title="View event in Google Calendar"
                      >
                        <span>View Event</span>
                        <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                      </a>
                    )}

                    {/* Undo Action */}
                    <button
                      id={`undo-event-btn-${actionKey}`}
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleUndoCalendarEvent(action, actionKey)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer disabled:opacity-50"
                      title="Remove this event from Google Calendar"
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Undo2 className="w-3 h-3" />
                      )}
                      <span>Undo</span>
                    </button>
                  </div>
                ) : (
                  <button
                    id={`create-calendar-event-btn-${actionKey}`}
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleCreateCalendarEvent(action, actionKey)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.98] shadow-xs transition cursor-pointer disabled:opacity-60"
                    title="Create this event in your Google Calendar"
                  >
                    {isActionLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Creating Event...</span>
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-3 h-3" />
                        <span>Create Event in Google Calendar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Maps Action Cards */}
        {mapsActions.map((action, idx) => {
          const actionKey = action.id || `map_${messageId}_${idx}`;
          const isOpeningMaps = openingMapsId === actionKey;
          const isClicked = mapsClicked[actionKey];
          const mapsUrl = createGoogleMapsUrl(action);

          return (
            <div
              key={actionKey}
              id={`action-maps-card-${actionKey}`}
              className="group relative flex flex-col justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/90 hover:border-emerald-300 hover:bg-emerald-50/90 transition shadow-xs"
            >
              <div className="space-y-1.5">
                {/* Badge / Header */}
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                  <span className="p-1 rounded-md bg-emerald-100/90 text-emerald-700">
                    <MapPin className="w-3 h-3" />
                  </span>
                  <span>Detected Location</span>
                </div>

                {/* Place Name */}
                <h5 className="text-xs font-semibold text-stone-900 leading-snug">
                  {action.placeName}
                </h5>

                <p className="text-[11px] text-stone-500">
                  Physical location referenced in your reflection
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2.5 mt-1">
                <button
                  id={`open-in-maps-btn-${actionKey}`}
                  type="button"
                  disabled={isOpeningMaps}
                  onClick={() => handleMapsClick(actionKey, mapsUrl)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isClicked
                      ? 'bg-emerald-200/70 text-emerald-900 border border-emerald-300'
                      : 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-[0.98] shadow-xs'
                  } disabled:opacity-75`}
                  title="View this location on Google Maps"
                >
                  {isOpeningMaps ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Opening Maps...</span>
                    </>
                  ) : isClicked ? (
                    <>
                      <Navigation className="w-3 h-3 text-emerald-900" />
                      <span>Opened in Maps</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3" />
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
