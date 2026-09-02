import React, { useState, useMemo, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Search, 
  ExternalLink, 
  X, 
  Maximize2,
  FolderArchive,
  Clock,
  Heart,
  Smile,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MemoryCapsule, CapsuleContributor, ReflectionLocation } from '../types';
import { loadMemoryCapsules, loadCapsuleContributors } from '../lib/firebase';

interface TimelinePhotoItem {
  id: string;
  url: string;
  caption?: string;
  contributorName: string;
  contributorAvatar?: string;
  emotion?: string;
  date: string; // ISO string
  capsuleId: string;
  capsuleTitle: string;
  location?: ReflectionLocation;
  isCover?: boolean;
}

interface CapsuleWithMeta {
  capsule: MemoryCapsule;
  contributors: CapsuleContributor[];
  totalPhotos: number;
  contributorNames: string[];
  coverImageUrl: string | null;
  photos: TimelinePhotoItem[];
}

interface MemoriesPageProps {
  userId?: string;
  userName?: string;
  onOpenCapsule?: (capsuleId: string) => void;
  onNavigate?: (path: string) => void;
}

// Helper to parse event dates accurately without UTC midnight timezone rollback
const parseTimelineDate = (dateStr?: string): Date => {
  if (!dateStr || !dateStr.trim()) return new Date();
  const trimmed = dateStr.trim();
  // If date is formatted as YYYY-MM-DD, anchoring to midday prevents rolling back across day/month boundaries in Western timezones
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const MemoriesPage: React.FC<MemoriesPageProps> = ({
  userId,
  userName,
  onOpenCapsule,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [capsulesMeta, setCapsulesMeta] = useState<CapsuleWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Lightbox Modal for Timeline View
  const [selectedPhoto, setSelectedPhoto] = useState<TimelinePhotoItem | null>(null);

  // Load capsules & all contributor details from Firestore
  useEffect(() => {
    let isMounted = true;

    async function fetchAllGalleryData() {
      try {
        setIsLoading(true);
        const rawCapsules = await loadMemoryCapsules(userId);
        if (!isMounted) return;

        const enhancedCapsules: CapsuleWithMeta[] = [];

        await Promise.all(
          rawCapsules.map(async (cap) => {
            let contributors: CapsuleContributor[] = [];
            try {
              contributors = await loadCapsuleContributors(cap.id);
            } catch (err) {
              console.warn(`Could not load contributors for capsule ${cap.id}:`, err);
            }

            const capPhotos: TimelinePhotoItem[] = [];

            // Primary event date: represents when the memories in this Life Archive actually happened
            const archiveEventDate = cap.eventDate?.trim() || cap.createdAt || new Date().toISOString();

            // 1. Cover photo
            if (cap.coverPhoto) {
              capPhotos.push({
                id: `cover_${cap.id}`,
                url: cap.coverPhoto,
                caption: cap.title,
                contributorName: cap.ownerName || 'Host',
                emotion: 'Adventure',
                date: archiveEventDate,
                capsuleId: cap.id,
                capsuleTitle: cap.title,
                location: cap.location,
                isCover: true
              });
            }

            // 2. Contributor photos
            contributors.forEach((c) => {
              const caption = c.photoCaption || c.favoriteMoment || c.memory || `${c.displayName || 'Friend'}'s memory`;
              
              if (c.photoUrl) {
                capPhotos.push({
                  id: `contrib_${c.id}_main`,
                  url: c.photoUrl,
                  caption,
                  contributorName: c.displayName || 'Contributor',
                  emotion: c.emotion || 'Joy',
                  date: archiveEventDate,
                  capsuleId: cap.id,
                  capsuleTitle: cap.title,
                  location: cap.location,
                  isCover: false
                });
              }

              if (c.photos && Array.isArray(c.photos)) {
                c.photos.forEach((pUrl, pIdx) => {
                  if (pUrl && pUrl !== c.photoUrl) {
                    capPhotos.push({
                      id: `contrib_${c.id}_extra_${pIdx}`,
                      url: pUrl,
                      caption,
                      contributorName: c.displayName || 'Contributor',
                      emotion: c.emotion || 'Joy',
                      date: archiveEventDate,
                      capsuleId: cap.id,
                      capsuleTitle: cap.title,
                      location: cap.location,
                      isCover: false
                    });
                  }
                });
              }
            });

            const contributorNames = Array.from(
              new Set([
                cap.ownerName,
                ...contributors.map((c) => c.displayName).filter(Boolean)
              ])
            ) as string[];

            const coverImageUrl = cap.coverPhoto || capPhotos[0]?.url || null;
            const totalPhotos = cap.photoCount !== undefined ? Math.max(cap.photoCount, capPhotos.length) : capPhotos.length;

            enhancedCapsules.push({
              capsule: cap,
              contributors,
              totalPhotos,
              contributorNames,
              coverImageUrl,
              photos: capPhotos
            });
          })
        );

        // Sort capsules by event date descending (when the event happened)
        enhancedCapsules.sort((a, b) => {
          const dateA = parseTimelineDate(a.capsule.eventDate || a.capsule.createdAt).getTime();
          const dateB = parseTimelineDate(b.capsule.eventDate || b.capsule.createdAt).getTime();
          return dateB - dateA;
        });

        if (isMounted) {
          setCapsulesMeta(enhancedCapsules);
        }
      } catch (err) {
        console.error('Failed to load gallery items:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchAllGalleryData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // ----------------------------------------------------
  // FILTERING & GROUPING FOR MONTH & YEAR TIMELINE
  // ----------------------------------------------------
  const allTimelinePhotos = useMemo(() => {
    const photos: TimelinePhotoItem[] = [];
    capsulesMeta.forEach((meta) => {
      photos.push(...meta.photos);
    });

    // Sort descending chronologically by event date (when memories happened)
    photos.sort((a, b) => parseTimelineDate(b.date).getTime() - parseTimelineDate(a.date).getTime());
    return photos;
  }, [capsulesMeta]);

  const filteredTimelinePhotos = useMemo(() => {
    if (!searchQuery.trim()) return allTimelinePhotos;
    const q = searchQuery.toLowerCase();

    return allTimelinePhotos.filter((item) => {
      const captionMatch = item.caption?.toLowerCase().includes(q);
      const contributorMatch = item.contributorName?.toLowerCase().includes(q);
      const titleMatch = item.capsuleTitle?.toLowerCase().includes(q);
      const emotionMatch = item.emotion?.toLowerCase().includes(q);
      const placeMatch = 
        item.location?.placeName?.toLowerCase().includes(q) ||
        item.location?.address?.toLowerCase().includes(q);

      return captionMatch || contributorMatch || titleMatch || emotionMatch || placeMatch;
    });
  }, [allTimelinePhotos, searchQuery]);

  // Group timeline photos by Month & Year (e.g. September 2026, August 2026)
  // Empty months are collapsed/omitted automatically
  const timelineMonthGroups = useMemo(() => {
    const groups: { [key: string]: { monthTitle: string; photos: TimelinePhotoItem[] } } = {};

    filteredTimelinePhotos.forEach((photo) => {
      const d = parseTimelineDate(photo.date);
      const monthKey = isNaN(d.getTime())
        ? 'Unscheduled Memories'
        : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthTitle: monthKey,
          photos: []
        };
      }
      groups[monthKey].photos.push(photo);
    });

    return Object.entries(groups).map(([key, value]) => ({
      key,
      monthTitle: value.monthTitle,
      photos: value.photos
    }));
  }, [filteredTimelinePhotos]);

  // Helper to open archive
  const handleOpenArchive = (capsuleId: string) => {
    if (onOpenCapsule) {
      onOpenCapsule(capsuleId);
    } else if (onNavigate) {
      onNavigate('/capsules');
    }
  };

  // Helper for emotion color styling
  const getEmotionBadge = (emotion?: string) => {
    if (!emotion) return null;
    const em = emotion.toLowerCase();
    let bg = 'bg-stone-100 text-stone-700 border-stone-200';
    let icon = <Smile className="w-3 h-3 text-stone-500" />;

    if (em.includes('joy') || em.includes('happy') || em.includes('fun')) {
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      icon = <Smile className="w-3 h-3 text-amber-600" />;
    } else if (em.includes('nostalgia') || em.includes('memory') || em.includes('peace')) {
      bg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      icon = <Clock className="w-3 h-3 text-indigo-600" />;
    } else if (em.includes('gratitude') || em.includes('love') || em.includes('warm')) {
      bg = 'bg-rose-50 text-rose-800 border-rose-200';
      icon = <Heart className="w-3 h-3 text-rose-600" />;
    } else if (em.includes('adventure') || em.includes('wonder') || em.includes('excite')) {
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      icon = <Compass className="w-3 h-3 text-emerald-600" />;
    }

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${bg}`}>
        {icon}
        <span>{emotion}</span>
      </span>
    );
  };

  return (
    <div id="life-gallery-container" className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header with Subtitle & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 uppercase tracking-wider font-semibold">
              CHRONOLOGICAL TIMELINE
            </span>
            <span className="text-xs text-stone-500 font-mono">
              {capsulesMeta.length} {capsulesMeta.length === 1 ? 'Archive' : 'Archives'} • {allTimelinePhotos.length} {allTimelinePhotos.length === 1 ? 'Photo' : 'Photos'}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Life Gallery
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl leading-relaxed">
            A chronological visual timeline generated from your Life Archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Universal Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="life-gallery-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search photos by caption, place, friend..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 text-xs transition text-stone-900 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            id="gallery-open-capsules-btn"
            onClick={() => onNavigate ? onNavigate('/capsules') : null}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs shrink-0 group"
          >
            <FolderArchive className="w-3.5 h-3.5 text-amber-300" />
            <span>Manage Archives</span>
          </button>
        </div>
      </div>

      {/* 2. Main Chronological Timeline View */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="w-8 h-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-stone-600 text-xs tracking-wide">Loading photo timeline...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {timelineMonthGroups.length > 0 ? (
            timelineMonthGroups.map((group) => (
              <div key={group.key} className="space-y-4">
                {/* Month Header Banner */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="font-serif font-bold text-lg text-stone-900 tracking-tight">
                      {group.monthTitle}
                    </h3>
                  </div>

                  <span className="text-xs font-mono text-stone-400">
                    {group.photos.length} {group.photos.length === 1 ? 'Photo' : 'Photos'}
                  </span>
                </div>

                {/* Responsive Photo Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.photos.map((item) => {
                    const dayFormatted = parseTimelineDate(item.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <div
                        key={item.id}
                        id={`timeline-photo-${item.id}`}
                        onClick={() => setSelectedPhoto(item)}
                        className="group rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-stone-400 transition-all flex flex-col justify-between cursor-pointer"
                      >
                        {/* Photo Aspect Container */}
                        <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                          <img
                            src={item.url}
                            alt={item.caption || item.capsuleTitle}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />

                          {/* Hover zoom overlay */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="p-2 rounded-xl bg-white/95 text-stone-900 shadow-md">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Top Date & Archive Tag Pill */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white font-medium">
                              {dayFormatted}
                            </span>

                            {item.isCover && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-bold uppercase tracking-wider">
                                Cover
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tile Meta & Caption */}
                        <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            {/* Archive Name Badge */}
                            <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-stone-800">
                              <span className="truncate group-hover:text-amber-800 transition-colors">
                                {item.capsuleTitle}
                              </span>
                            </div>

                            {/* Caption Preview */}
                            {item.caption && (
                              <p className="text-xs text-stone-600 italic line-clamp-2 leading-relaxed">
                                "{item.caption}"
                              </p>
                            )}
                          </div>

                          {/* Contributor Avatar & Name Strip */}
                          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                            <div className="flex items-center gap-1.5 text-stone-600 font-medium truncate max-w-[140px]">
                              <div className="w-4 h-4 rounded-full bg-stone-200 text-[9px] font-mono font-bold flex items-center justify-center text-stone-700 shrink-0">
                                {item.contributorName[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="truncate">{item.contributorName}</span>
                            </div>

                            {item.emotion && (
                              <span className="text-[10px] font-mono text-stone-500">
                                {item.emotion}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            /* Empty State for Timeline */
            <div className="p-12 rounded-2xl bg-white border border-dashed border-stone-200 text-center space-y-4">
              <Calendar className="w-12 h-12 text-stone-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base text-stone-800">
                  {searchQuery ? 'No matching photos found in timeline' : 'No timeline photos available yet'}
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try clearing your search query to see all photos in the timeline.'
                    : 'Photos added to your collaborative Life Archives will appear here arranged chronologically by month.'}
                </p>
              </div>

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition cursor-pointer"
                >
                  Reset Search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate('/capsules') : null}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4 text-amber-300" />
                  <span>Create Life Archive</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Timeline Photo Lightbox / Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/90">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-stone-900 text-stone-100">
                  <Camera className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    Memory Keepsake
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Captured on {parseTimelineDate(selectedPhoto.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-res Image Display */}
            <div className="relative bg-stone-900 max-h-[50vh] flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || selectedPhoto.capsuleTitle}
                className="max-h-[50vh] w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Modal Body & Interactive Details */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Contributor & Emotion Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-stone-100 text-[10px] font-mono font-bold flex items-center justify-center">
                    {selectedPhoto.contributorName[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-stone-900">{selectedPhoto.contributorName}</span>
                    <span className="text-[11px] text-stone-500 ml-1">contributed this moment</span>
                  </div>
                </div>

                {selectedPhoto.emotion && getEmotionBadge(selectedPhoto.emotion)}
              </div>

              {/* Memory Caption */}
              {selectedPhoto.caption && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">Memory Note</span>
                  <p className="text-sm italic text-stone-800 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 leading-relaxed">
                    "{selectedPhoto.caption}"
                  </p>
                </div>
              )}

              {/* Location Pin */}
              {selectedPhoto.location && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs">
                  <div className="flex items-center gap-2 text-stone-800">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <span className="font-semibold">{selectedPhoto.location.placeName}</span>
                      {selectedPhoto.location.address && (
                        <span className="text-stone-500 ml-1">({selectedPhoto.location.address})</span>
                      )}
                    </div>
                  </div>
                  {selectedPhoto.location.mapsUrl && (
                    <a
                      href={selectedPhoto.location.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 font-medium"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Archive Navigation Badge Bar */}
              <div className="p-3.5 rounded-xl bg-stone-900 text-white flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Belongs to Archive</span>
                  <h4 className="font-serif font-bold text-sm text-white truncate">
                    {selectedPhoto.capsuleTitle}
                  </h4>
                </div>

                <button
                  type="button"
                  id={`modal-goto-archive-${selectedPhoto.capsuleId}`}
                  onClick={() => {
                    handleOpenArchive(selectedPhoto.capsuleId);
                    setSelectedPhoto(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-stone-900 hover:bg-amber-100 text-xs font-semibold transition cursor-pointer shadow-xs shrink-0"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-amber-700" />
                  <span>Open Archive &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
