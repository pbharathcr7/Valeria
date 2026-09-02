import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Plus
} from 'lucide-react';
import { JournalEntry, CalendarAction, MapsAction, ReflectionIntent } from '../types';
import { CalendarActionCard, MapsActionCard } from '../components/ActionCards';

interface CalendarPlacesPageProps {
  entries: JournalEntry[];
  onNewReflection: (intent?: ReflectionIntent) => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onUpdateEntry?: (entry: JournalEntry) => Promise<void>;
}

export const CalendarPlacesPage: React.FC<CalendarPlacesPageProps> = ({
  entries,
  onNewReflection,
  onSelectEntry,
  onUpdateEntry
}) => {
  const [filterType, setFilterType] = useState<'all' | 'calendar' | 'maps'>('all');

  // Extract all calendar actions and maps actions with their parent entry
  const calendarItems: { action: CalendarAction; entry: JournalEntry }[] = [];
  const mapItems: { action: MapsAction; entry: JournalEntry }[] = [];

  entries.forEach(entry => {
    // 1. User-tagged location from Reflection photo/place attachments
    if (entry.location) {
      mapItems.push({
        action: {
          id: `tagged_loc_${entry.id}`,
          type: 'maps',
          placeName: entry.location.placeName,
          query: `${entry.location.placeName} ${entry.location.address || ''}`.trim()
        },
        entry
      });
    }

    // 2. Actions extracted from conversation messages
    (entry.messages || []).forEach(msg => {
      (msg.actions || []).forEach(act => {
        if (act.type === 'calendar') {
          calendarItems.push({ action: act as CalendarAction, entry });
        } else if (act.type === 'maps') {
          // Avoid duplicate if same location name
          const mapsAct = act as MapsAction;
          const alreadyAdded = mapItems.some(m => m.entry.id === entry.id && m.action.placeName?.toLowerCase() === mapsAct.placeName?.toLowerCase());
          if (!alreadyAdded) {
            mapItems.push({ action: mapsAct, entry });
          }
        }
      });
    });
  });

  const handleUpdateCalendarAction = async (parentEntry: JournalEntry, updatedAction: CalendarAction) => {
    if (!onUpdateEntry) return;

    const updatedMessages = (parentEntry.messages || []).map(msg => {
      if (!msg.actions) return msg;
      const hasThisAction = msg.actions.some(act => act.id === updatedAction.id || (act.type === 'calendar' && (act as CalendarAction).title === updatedAction.title));
      if (!hasThisAction) return msg;

      const updatedActions = msg.actions.map(act => {
        if (act.id === updatedAction.id || (act.type === 'calendar' && (act as CalendarAction).title === updatedAction.title)) {
          return updatedAction;
        }
        return act;
      });

      return {
        ...msg,
        actions: updatedActions
      };
    });

    const updatedEntry: JournalEntry = {
      ...parentEntry,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };

    await onUpdateEntry(updatedEntry);
  };

  return (
    <div id="calendar-places-page-container" className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 uppercase tracking-wider font-semibold">
              Google Workspace &amp; Maps Hub
            </span>
            <span className="text-xs text-stone-500 font-mono">
              {calendarItems.length} Event{calendarItems.length === 1 ? '' : 's'} • {mapItems.length} Location{mapItems.length === 1 ? '' : 's'}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Calendar &amp; Places
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
            Actionable commitments, appointments, and points of interest automatically extracted by Gemini during your reflection sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNewReflection('action_plan')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold transition cursor-pointer shadow-xs group"
          >
            <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-200" />
            <span>Plan Next Actions</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            filterType === 'all'
              ? 'bg-stone-900 text-stone-50 shadow-2xs font-semibold'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          All Items ({calendarItems.length + mapItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('calendar')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            filterType === 'calendar'
              ? 'bg-stone-900 text-stone-50 shadow-2xs font-semibold'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Calendar Commitments ({calendarItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('maps')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            filterType === 'maps'
              ? 'bg-stone-900 text-stone-50 shadow-2xs font-semibold'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Locations &amp; Maps ({mapItems.length})
        </button>
      </div>

      {/* 3. Calendar Commitments Section */}
      {(filterType === 'all' || filterType === 'calendar') && (
        <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100/70 text-amber-950 border border-amber-200/80">
                <Calendar className="w-4 h-4 text-amber-900" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Google Calendar Commitments ({calendarItems.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Deadlines, meetings, habits, and appointments derived from dialogues.
                </p>
              </div>
            </div>
          </div>

          {calendarItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {calendarItems.map(({ action, entry }, idx) => (
                <CalendarActionCard
                  key={action.id || `cal_${entry.id}_${idx}`}
                  action={action}
                  parentEntry={entry}
                  onSelectEntry={onSelectEntry}
                  onUpdateAction={(updatedAct) => handleUpdateCalendarAction(entry, updatedAct)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-stone-50/50 border border-dashed border-stone-200 text-center space-y-2">
              <Calendar className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-medium text-stone-700">No calendar events detected yet</p>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                Mention appointments, deadlines, or daily routines during your reflections (e.g. "I need to schedule a strategy review next Tuesday at 2 PM") and Gemini will automatically generate actionable calendar events.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Detected Places & Maps Section */}
      {(filterType === 'all' || filterType === 'maps') && (
        <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-stone-100 text-stone-900 border border-stone-200">
                <MapPin className="w-4 h-4 text-stone-700" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Detected Locations &amp; Maps ({mapItems.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Offices, destinations, and places identified during reflections.
                </p>
              </div>
            </div>
          </div>

          {mapItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {mapItems.map(({ action, entry }, idx) => (
                <MapsActionCard
                  key={action.id || `map_${entry.id}_${idx}`}
                  action={action}
                  parentEntry={entry}
                  onSelectEntry={onSelectEntry}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-stone-50/50 border border-dashed border-stone-200 text-center space-y-2">
              <MapPin className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-medium text-stone-700">No locations detected yet</p>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                Mention venues, travel destinations, or meeting places during your reflections to generate one-click Google Maps links and directions.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
