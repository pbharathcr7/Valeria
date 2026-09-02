import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Users, 
  Image as ImageIcon, 
  Search, 
  ArrowRight,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { MemoryCapsule } from '../types';
import { loadMemoryCapsules, saveMemoryCapsule, deleteMemoryCapsule } from '../lib/firebase';
import { CreateCapsuleModal } from '../components/CreateCapsuleModal';
import { CapsuleDetailPage } from './CapsuleDetailPage';

interface MemoryCapsulesPageProps {
  userId: string;
  userName: string;
  onOpenCapsuleLink?: (inviteCode: string) => void;
  selectedCapsuleId?: string | null;
  onSelectCapsuleId?: (id: string | null) => void;
}

export const MemoryCapsulesPage: React.FC<MemoryCapsulesPageProps> = ({
  userId,
  userName,
  onOpenCapsuleLink,
  selectedCapsuleId,
  onSelectCapsuleId
}) => {
  const [capsules, setCapsules] = useState<MemoryCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | null>(selectedCapsuleId || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [capsuleToDelete, setCapsuleToDelete] = useState<MemoryCapsule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCapsuleId !== undefined) {
      setActiveCapsuleId(selectedCapsuleId);
    }
  }, [selectedCapsuleId]);

  // Load capsules from Firestore
  useEffect(() => {
    let isMounted = true;

    async function fetchCapsules() {
      try {
        setLoading(true);
        const data = await loadMemoryCapsules(userId);
        if (!isMounted) return;

        if (data && Array.isArray(data)) {
          // Filter out any legacy sample capsules if any exist
          const realCapsules = data.filter(c => !c.id.startsWith('sample_capsule_'));
          setCapsules(realCapsules as MemoryCapsule[]);
        } else {
          setCapsules([]);
        }
      } catch (err) {
        console.error('Failed to load Memory Capsules:', err);
        if (isMounted) setCapsules([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCapsules();

    return () => {
      isMounted = false;
    };
  }, [userId, userName]);

  const handleCapsuleCreated = async (newCapsule: MemoryCapsule) => {
    try {
      await saveMemoryCapsule(newCapsule);
      setCapsules(prev => [newCapsule, ...prev]);
      setShowCreateModal(false);
      handleOpenCapsule(newCapsule.id);
    } catch (err) {
      console.error('Error saving new capsule:', err);
    }
  };

  const handleOpenCapsule = (id: string) => {
    setActiveCapsuleId(id);
    if (onSelectCapsuleId) onSelectCapsuleId(id);
  };

  const handleBackToList = () => {
    setActiveCapsuleId(null);
    if (onSelectCapsuleId) onSelectCapsuleId(null);
  };

  const handleConfirmDelete = async () => {
    if (!capsuleToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteMemoryCapsule(capsuleToDelete.id);
      setCapsules(prev => prev.filter(c => c.id !== capsuleToDelete.id));
      setCapsuleToDelete(null);
    } catch (err: any) {
      console.error('Error deleting capsule:', err);
      setDeleteError(err?.message || 'Failed to delete archive event.');
    } finally {
      setIsDeleting(false);
    }
  };

  // If a capsule is actively opened, show Detail Page
  if (activeCapsuleId) {
    return (
      <CapsuleDetailPage
        capsuleId={activeCapsuleId}
        userId={userId}
        userName={userName}
        onBack={handleBackToList}
        onOpenCapsuleLink={onOpenCapsuleLink}
      />
    );
  }

  const filteredCapsules = capsules.filter(cap => {
    return cap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cap.description && cap.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cap.location && cap.location.placeName.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="min-h-full bg-stone-50/60 font-sans pb-16 text-stone-800">
      {/* Top Header with integrated Search & CTA */}
      <div className="rounded-2xl bg-white border border-stone-200 shadow-xs px-4 sm:px-8 py-4.5 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-300 text-amber-900 text-[10px] font-mono font-bold tracking-wider uppercase">
              Shared Moments
            </span>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Life Archive
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl">
            Collaborative event scrapbooks where friends pool memories, keepsake photos, and emotions.
          </p>
        </div>

        {/* Integrated Top Bar Search & Create Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              id="life-archive-search-input"
              placeholder="Search events, places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          <button
            type="button"
            id="create-capsule-btn"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Create Archive Event</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {deleteError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{deleteError}</span>
            </div>
            <button type="button" onClick={() => setDeleteError(null)} className="text-rose-500 hover:text-rose-800 font-semibold text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-serif text-stone-600 text-xs tracking-wide">Gathering Life Archive...</p>
          </div>
        ) : filteredCapsules.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4 max-w-md mx-auto shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-900">
              No Life Archive Events Found
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              {searchQuery 
                ? 'No events match your current search query. Try searching with a different keyword.'
                : 'Create your first collaborative event scrapbook for a trip, celebration, or meetup!'}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold shadow-xs hover:bg-stone-800 transition"
            >
              + Create First Archive Event
            </button>
          </div>
        ) : (
          /* Visual Scrapbook Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCapsules.map((capsule) => {
              const formattedDate = capsule.eventDate
                ? new Date(capsule.eventDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Event';

              return (
                <div
                  key={capsule.id}
                  id={`capsule-card-${capsule.id}`}
                  className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-2xs hover:shadow-md transition duration-300 flex flex-col justify-between group"
                >
                  {/* Card Cover Image */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-900 shrink-0">
                    <img
                      src={capsule.coverPhoto || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'}
                      alt={capsule.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

                    {/* AI Mosaic Badge if present */}
                    {capsule.mosaic && (
                      <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/90 text-stone-950 text-[10px] font-mono font-bold tracking-wider uppercase backdrop-blur-md flex items-center gap-1 shadow-xs">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Mosaic</span>
                        </span>
                      </div>
                    )}

                    {/* Quick Delete Button */}
                    <button
                      type="button"
                      id={`delete-capsule-card-btn-${capsule.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCapsuleToDelete(capsule);
                      }}
                      className="absolute top-3.5 right-3.5 p-2 rounded-full bg-stone-950/60 hover:bg-rose-600 text-white backdrop-blur-md transition cursor-pointer opacity-80 hover:opacity-100 shadow-xs"
                      title="Delete Archive Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Date Pill */}
                    <div className="absolute bottom-3 left-3.5 text-white flex items-center gap-1.5 text-xs font-mono drop-shadow-sm">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-900 transition line-clamp-1">
                        {capsule.title}
                      </h3>

                      {capsule.description && (
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-serif">
                          {capsule.description}
                        </p>
                      )}

                      {capsule.location && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{capsule.location.placeName}</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata stats & Open Button */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-xs font-mono text-stone-500">
                        <div className="flex items-center gap-1" title="Contributors">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          <span>{capsule.contributorCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Keepsake Photos">
                          <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
                          <span>{capsule.photoCount ?? (capsule.coverPhoto ? 1 : 0)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        id={`open-capsule-${capsule.id}`}
                        onClick={() => handleOpenCapsule(capsule.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 group/btn shadow-2xs"
                      >
                        <span>Open Archive</span>
                        <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Capsule Modal */}
      {showCreateModal && (
        <CreateCapsuleModal
          userId={userId}
          userName={userName}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCapsuleCreated}
        />
      )}

      {/* Delete Archive Confirmation Modal */}
      {capsuleToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setCapsuleToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Delete Life Archive Event?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Are you sure you want to permanently delete <strong className="text-stone-900">"{capsuleToDelete.title}"</strong> and all collaborative contributions? This action cannot be reversed.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                id="cancel-delete-list-btn"
                disabled={isDeleting}
                onClick={() => setCapsuleToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-list-btn"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Archive</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
