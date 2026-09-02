import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Image as ImageIcon, 
  Sparkles, 
  Lock, 
  Users, 
  Upload, 
  Compass,
  Check,
  Globe
} from 'lucide-react';
import { MemoryCapsule, ReflectionLocation } from '../types';
import { compressImageFile } from '../lib/imageUtils';

interface CreateCapsuleModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onCreated: (capsule: MemoryCapsule) => void;
}

const PRESET_COVERS = [
  {
    name: 'Ooty Mountain Mist',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    tags: 'Nature • Trip'
  },
  {
    name: 'Goa Coastal Sun',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    tags: 'Beach • Celebration'
  },
  {
    name: 'AI Academy & Milestone',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    tags: 'Team • Hackathon'
  },
  {
    name: 'Cozy Evening & Dinner',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    tags: 'Birthday • Reunion'
  },
  {
    name: 'Golden Hour Vista',
    url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80',
    tags: 'Adventure • Getaway'
  }
];

export const CreateCapsuleModal: React.FC<CreateCapsuleModalProps> = ({
  userId,
  userName,
  onClose,
  onCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [coverPhoto, setCoverPhoto] = useState(PRESET_COVERS[0].url);
  const [privacy, setPrivacy] = useState<'friends' | 'private'>('friends');
  const [hostMemory, setHostMemory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const base64 = await compressImageFile(file, 1600, 0.85);
      setCoverPhoto(base64);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setError('Could not process cover image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an event title.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Generate unique 6-character invite code (e.g. CAP-X7K9P2)
      const randomCode = 'CAP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      let locationObj: ReflectionLocation | undefined = undefined;
      if (placeName.trim()) {
        const query = encodeURIComponent(`${placeName.trim()} ${placeAddress.trim()}`.trim());
        locationObj = {
          placeName: placeName.trim(),
          address: placeAddress.trim() || undefined,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${query}`
        };
      }

      const newCapsule: MemoryCapsule = {
        id: `capsule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerId: userId,
        ownerName: userName || 'Host',
        title: title.trim(),
        description: description.trim() || undefined,
        eventDate: eventDate || new Date().toISOString().split('T')[0],
        location: locationObj,
        coverPhoto: coverPhoto || PRESET_COVERS[0].url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inviteCode: randomCode,
        status: 'open',
        privacy: privacy,
        hostMemory: hostMemory.trim() || undefined,
        contributorCount: 0,
        photoCount: coverPhoto ? 1 : 0
      };

      onCreated(newCapsule);
    } catch (err: any) {
      console.error('Failed to create capsule:', err);
      setError(err?.message || 'Failed to create memory capsule.');
      setIsSaving(false);
    }
  };

  return (
    <div id="create-capsule-modal-backdrop" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="create-capsule-modal-content"
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header with Live Cover Preview */}
        <div className="relative h-44 sm:h-52 w-full bg-stone-900 overflow-hidden shrink-0">
          <img 
            src={coverPhoto} 
            alt="Cover preview" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            id="close-create-capsule-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white backdrop-blur-xs transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title overlay in header */}
          <div className="absolute bottom-4 left-5 right-5 text-white space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-mono font-bold tracking-wider uppercase">
                Life Archive
              </span>
              <span className="text-[11px] text-stone-300 font-mono">
                Collaborative Event Scrapbook
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight truncate">
              {title || 'Untitled Event Archive'}
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Event Information */}
          <div className="space-y-4">
            <h3 className="font-serif text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Event Information</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Event Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="capsule-title-input"
                required
                placeholder="e.g. Ooty Escape 2026, Goa Graduation Trip, Birthday Celebration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Event Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="date"
                    id="capsule-date-input"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Location (Place Name)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    id="capsule-location-input"
                    placeholder="e.g. Ooty Hills, Tamil Nadu"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Event Context & Description (Optional)
              </label>
              <textarea
                id="capsule-desc-input"
                rows={2}
                placeholder="What was this gathering about? Add a note to welcome contributors..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Cover Photo Selection */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                <span>Select Cover Photo</span>
              </label>

              <label className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Compressing...' : 'Upload Custom Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESET_COVERS.map((preset, idx) => {
                const isSelected = coverPhoto === preset.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCoverPhoto(preset.url)}
                    className={`relative rounded-xl overflow-hidden aspect-4/3 border-2 transition cursor-pointer text-left group ${
                      isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                    <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-semibold text-white truncate">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy & Collaboration Setting */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-500" />
              <span>Privacy & Participation</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                id="privacy-friends-btn"
                onClick={() => setPrivacy('friends')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                  privacy === 'friends'
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/30'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span>Friends Only (Invite Link)</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-semibold">Recommended</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Generate an invite link to collect memories and photos from attendees.
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="privacy-private-btn"
                onClick={() => setPrivacy('private')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                  privacy === 'private'
                    ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900/30'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Private Capsule
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Personal event archive. Only you can view and add memories.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Host's Initial Memory (Optional) */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="block text-xs font-semibold text-stone-700">
              Host's Perspective (Your Memory of this Event)
            </label>
            <textarea
              id="host-initial-memory-input"
              rows={3}
              placeholder="Write your standout moment or feeling from this event..."
              value={hostMemory}
              onChange={(e) => setHostMemory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="cancel-create-capsule-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 text-xs font-semibold hover:bg-stone-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-capsule-btn"
              disabled={isSaving || isUploading}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSaving ? 'Creating Event...' : 'Create Archive Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
