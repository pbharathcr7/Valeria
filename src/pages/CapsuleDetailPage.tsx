import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Share2, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Camera, 
  Quote, 
  Compass, 
  Heart, 
  Smile, 
  AlertCircle,
  ExternalLink,
  Plus
} from 'lucide-react';
import { MemoryCapsule, CapsuleContributor, MemoryMosaic } from '../types';
import { 
  loadMemoryCapsuleById, 
  saveMemoryCapsule, 
  deleteMemoryCapsule,
  loadCapsuleContributors, 
  saveCapsuleContribution, 
  deleteCapsuleContribution,
  authFetch
} from '../lib/firebase';
import { MemoryMosaicModal } from '../components/MemoryMosaicModal';
import { compressImageFile } from '../lib/imageUtils';

interface CapsuleDetailPageProps {
  capsuleId: string;
  userId: string;
  userName: string;
  onBack: () => void;
  onOpenCapsuleLink?: (inviteCode: string) => void;
}

const EMOTION_OPTIONS = [
  { label: 'Joy', icon: '✨' },
  { label: 'Nostalgia', icon: '🌅' },
  { label: 'Gratitude', icon: '🙏' },
  { label: 'Adventure', icon: '⛰️' },
  { label: 'Love & Warmth', icon: '💛' },
  { label: 'Wonder', icon: '🌌' },
  { label: 'Peace', icon: '🍃' }
];

export const CapsuleDetailPage: React.FC<CapsuleDetailPageProps> = ({
  capsuleId,
  userId,
  userName,
  onBack,
  onOpenCapsuleLink
}) => {
  const [capsule, setCapsule] = useState<MemoryCapsule | null>(null);
  const [contributors, setContributors] = useState<CapsuleContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // AI Mosaic State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showMosaicModal, setShowMosaicModal] = useState(false);

  // Host editing memory
  const [isEditingHostMemory, setIsEditingHostMemory] = useState(false);
  const [hostMemoryDraft, setHostMemoryDraft] = useState('');

  // Contributor submission form
  const [showAddContributionModal, setShowAddContributionModal] = useState(false);
  const [contribName, setContribName] = useState(userName || '');
  const [contribMemory, setContribMemory] = useState('');
  const [contribEmotion, setContribEmotion] = useState('Joy');
  const [contribFavMoment, setContribFavMoment] = useState('');
  const [contribPhotoUrl, setContribPhotoUrl] = useState<string | null>(null);
  const [contribPhotoCaption, setContribPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingContrib, setIsSavingContrib] = useState(false);

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption?: string } | null>(null);

  // Delete Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingCapsule, setIsDeletingCapsule] = useState(false);
  const [contribToDelete, setContribToDelete] = useState<string | null>(null);
  const [isDeletingContrib, setIsDeletingContrib] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const cap = await loadMemoryCapsuleById(capsuleId);
        if (!isMounted) return;
        if (!cap) {
          setError('Capsule not found.');
          setLoading(false);
          return;
        }
        setHostMemoryDraft(cap.hostMemory || '');

        const contribs = await loadCapsuleContributors(capsuleId);
        if (!isMounted) return;
        setContributors(contribs);

        const trueContribCount = contribs.length;
        const truePhotoCount = contribs.filter(c => Boolean(c.photoUrl)).length + (cap.coverPhoto ? 1 : 0);
        setCapsule({
          ...cap,
          contributorCount: trueContribCount,
          photoCount: truePhotoCount
        });
      } catch (err: any) {
        console.error('Error loading capsule details:', err);
        if (isMounted) setError(err?.message || 'Failed to load capsule.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [capsuleId]);

  // True owner check: only the user who created the event is the host/owner.
  // Invited participants and contributors can pool memories and photos, but cannot delete the event.
  const isOwner = Boolean(!capsule?.ownerId || capsule?.ownerId === userId);

  const inviteUrl = capsule?.inviteCode 
    ? `${window.location.origin}/capsules?capsuleInvite=${capsule.inviteCode}&capsuleId=${capsule.id}`
    : '';

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!capsule?.inviteCode) return;
    navigator.clipboard.writeText(capsule.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!capsule) return;
    const text = encodeURIComponent(
      `📸 Share your memories for "${capsule.title}" on Valeria!\nJoin this Life Archive event here:\n${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSaveHostMemory = async () => {
    if (!capsule || !isOwner) return;
    try {
      const updated = { 
        ...capsule, 
        hostMemory: hostMemoryDraft.trim() || undefined,
        updatedAt: new Date().toISOString() 
      };
      await saveMemoryCapsule(updated);
      setCapsule(updated);
      setIsEditingHostMemory(false);
    } catch (err: any) {
      console.error('Failed to save host memory:', err);
      setError('Could not save your personal memory.');
    }
  };

  const handleConfirmDeleteCapsule = async () => {
    if (!capsule) return;
    if (!isOwner) {
      setError('Only the event host can delete this archive event.');
      setShowDeleteModal(false);
      return;
    }
    try {
      setIsDeletingCapsule(true);
      setError(null);
      await deleteMemoryCapsule(capsule.id);
      setShowDeleteModal(false);
      onBack();
    } catch (err: any) {
      console.error('Failed to delete archive event:', err);
      setError(err?.message || 'Failed to delete archive event.');
      setIsDeletingCapsule(false);
    }
  };

  const handleConfirmDeleteContrib = async () => {
    if (!capsule || !contribToDelete) return;
    try {
      setIsDeletingContrib(true);
      await deleteCapsuleContribution(capsule.id, contribToDelete);
      const updated = await loadCapsuleContributors(capsule.id);
      setContributors(updated);

      const updatedCap = {
        ...capsule,
        contributorCount: updated.length,
        photoCount: updated.filter(c => c.photoUrl).length + (capsule.coverPhoto ? 1 : 0),
        updatedAt: new Date().toISOString()
      };
      await saveMemoryCapsule(updatedCap);
      setCapsule(updatedCap);
      setContribToDelete(null);
    } catch (err: any) {
      console.error('Error deleting contributor:', err);
      setError('Failed to remove perspective.');
    } finally {
      setIsDeletingContrib(false);
    }
  };

  const handleGenerateMosaic = async () => {
    if (!capsule) return;
    try {
      setIsSynthesizing(true);
      setError(null);

      const response = await authFetch('/api/capsules/mosaic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: capsule.title,
          eventDate: capsule.eventDate,
          description: capsule.description,
          hostMemory: capsule.hostMemory,
          location: capsule.location,
          contributors: contributors.map(c => ({
            displayName: c.displayName,
            memory: c.memory,
            emotion: c.emotion,
            favoriteMoment: c.favoriteMoment,
            photoCaption: c.photoCaption
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate collective AI mosaic.');
      }

      const data = await response.json();
      if (!data.mosaic) {
        throw new Error('No mosaic structure returned.');
      }

      const updatedCapsule: MemoryCapsule = {
        ...capsule,
        mosaic: data.mosaic,
        updatedAt: new Date().toISOString()
      };

      await saveMemoryCapsule(updatedCapsule);
      setCapsule(updatedCapsule);
      setShowMosaicModal(true);
    } catch (err: any) {
      console.error('Error synthesizing mosaic:', err);
      setError(err?.message || 'Failed to synthesize AI Memory Mosaic.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      const base64 = await compressImageFile(file, 1200, 0.8);
      setContribPhotoUrl(base64);
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setError('Could not process photo upload.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsule) return;
    if (!contribMemory.trim()) {
      setError('Please enter your memory.');
      return;
    }

    try {
      setIsSavingContrib(true);
      setError(null);

      const contribId = userId || `user_${Date.now()}`;
      const newContrib: CapsuleContributor = {
        id: contribId,
        userId: userId,
        displayName: contribName.trim() || 'Contributor',
        memory: contribMemory.trim(),
        emotion: contribEmotion,
        favoriteMoment: contribFavMoment.trim() || undefined,
        photoUrl: contribPhotoUrl || undefined,
        photoCaption: contribPhotoCaption.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveCapsuleContribution(capsule.id, newContrib);
      const updatedContribs = await loadCapsuleContributors(capsule.id);
      setContributors(updatedContribs);

      // Update capsule counts
      const updatedCap = {
        ...capsule,
        contributorCount: updatedContribs.length,
        photoCount: updatedContribs.filter(c => c.photoUrl).length + (capsule.coverPhoto ? 1 : 0),
        updatedAt: new Date().toISOString()
      };
      await saveMemoryCapsule(updatedCap);
      setCapsule(updatedCap);

      setShowAddContributionModal(false);
      setContribMemory('');
      setContribFavMoment('');
      setContribPhotoUrl(null);
      setContribPhotoCaption('');
    } catch (err: any) {
      console.error('Error saving contribution:', err);
      setError(err?.message || 'Failed to save perspective.');
    } finally {
      setIsSavingContrib(false);
    }
  };

  const handleDeleteContributor = (contribId: string) => {
    setContribToDelete(contribId);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-stone-600 text-xs tracking-wide">Loading Life Archive...</p>
        </div>
      </div>
    );
  }

  if (error && !capsule) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-lg font-bold text-stone-900">Archive Event Unavailable</h2>
        <p className="text-xs text-stone-600 leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold"
        >
          Back to Life Archive
        </button>
      </div>
    );
  }

  if (!capsule) return null;

  return (
    <div className="min-h-full bg-stone-50/60 pb-16 font-sans text-stone-800">
      {/* Top Bar */}
      <div className="rounded-2xl bg-white border border-stone-200 shadow-xs px-4 sm:px-8 py-4.5 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            id="back-to-capsules-list-btn"
            onClick={onBack}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Life Archive</span>
          </button>

          <div className="h-4 w-px bg-stone-200 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <h1 className="font-serif text-sm sm:text-base font-bold text-stone-900 truncate">
              {capsule.title}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI Mosaic Button */}
          <button
            type="button"
            id="generate-mosaic-top-btn"
            onClick={capsule.mosaic ? () => setShowMosaicModal(true) : handleGenerateMosaic}
            disabled={isSynthesizing}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            <span>{isSynthesizing ? 'Synthesizing...' : capsule.mosaic ? 'View AI Mosaic' : 'Generate Mosaic'}</span>
          </button>

          {/* Host Actions - Only visible to event owner */}
          {isOwner && (
            <button
              type="button"
              id="delete-capsule-btn"
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 transition cursor-pointer"
              title="Delete Archive Event (Host only)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hero Banner Card */}
        <div className="relative rounded-3xl overflow-hidden bg-stone-900 border border-stone-200 shadow-lg text-white">
          <div className="h-60 sm:h-72 w-full relative">
            <img 
              src={capsule.coverPhoto || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'} 
              alt={capsule.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-stone-950 text-[10px] font-mono font-bold uppercase tracking-wider">
                Life Archive
              </span>
              <span className="text-xs text-stone-300 font-mono">
                Host: {capsule.ownerName || 'Valeria User'}
              </span>
              {!isOwner && (
                <span className="px-2 py-0.5 rounded-md bg-stone-800/90 border border-stone-700/80 text-amber-300 text-[10px] font-mono">
                  Contributed Archive
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white">
              {capsule.title}
            </h1>

            {capsule.description && (
              <p className="text-xs sm:text-sm text-stone-200 max-w-2xl leading-relaxed font-serif">
                {capsule.description}
              </p>
            )}

            <div className="flex items-center gap-4 sm:gap-6 pt-1 text-xs font-mono text-stone-300 flex-wrap">
              {capsule.eventDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{capsule.eventDate}</span>
                </div>
              )}

              {capsule.location && (
                <a 
                  href={capsule.location.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(capsule.location.placeName)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-amber-300 underline underline-offset-2 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{capsule.location.placeName}</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              )}

              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>{contributors.length} {contributors.length === 1 ? 'Perspective' : 'Perspectives'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invite Friends & Sharing Bar (For Friends Mode) */}
        {capsule.privacy === 'friends' && (
          <div className="p-5 rounded-3xl bg-white border border-amber-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-700" />
                <h3 className="font-serif text-sm font-bold text-stone-900">
                  Invite Friends & Attendees
                </h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Send this link to friends so they can add their memories, emotions, and photo keepsakes.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                type="button"
                id="copy-invite-code-btn"
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono font-semibold border border-stone-200 transition cursor-pointer flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                <span>Code: {capsule.inviteCode}</span>
              </button>

              <button
                type="button"
                id="copy-invite-link-btn"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 transition cursor-pointer flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Invite Link'}</span>
              </button>

              <button
                type="button"
                id="share-whatsapp-btn"
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* AI Memory Mosaic Spotlight (If Generated) */}
        {capsule.mosaic && (
          <div className="p-6 rounded-3xl bg-linear-to-br from-amber-500/10 via-white to-amber-500/5 border border-amber-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900">
                    AI Memory Mosaic Active
                  </span>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    {capsule.mosaic.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMosaicModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                Open Full Mosaic
              </button>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 font-serif italic leading-relaxed line-clamp-3 pl-3 border-l-2 border-amber-400">
              "{capsule.mosaic.narrative}"
            </p>

            {capsule.mosaic.sharedThemes && capsule.mosaic.sharedThemes.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                <span className="text-[11px] font-semibold text-stone-500">Shared Themes:</span>
                {capsule.mosaic.sharedThemes.map((th, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-xs font-medium text-stone-800">
                    #{th}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Host Personal Perspective Card */}
        {(isOwner || capsule.hostMemory) && (
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-amber-700" />
                <h3 className="font-serif text-sm font-bold text-stone-900">
                  {isOwner ? "Host's Vantage Point (Your Memory)" : `Host's Vantage Point (${capsule.ownerName || 'Host'})`}
                </h3>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsEditingHostMemory(!isEditingHostMemory)}
                  className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingHostMemory ? 'Cancel' : capsule.hostMemory ? 'Edit Memory' : '+ Add Your Memory'}</span>
                </button>
              )}
            </div>

            {isEditingHostMemory && isOwner ? (
              <div className="space-y-3 pt-1">
                <textarea
                  rows={3}
                  value={hostMemoryDraft}
                  onChange={(e) => setHostMemoryDraft(e.target.value)}
                  placeholder="Reflect on your personal experience and standout moment from this event..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 font-serif leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingHostMemory(false)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHostMemory}
                    className="px-4 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold"
                  >
                    Save Memory
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-stone-700 font-serif leading-relaxed italic pl-3 border-l-2 border-stone-300">
                {capsule.hostMemory || 'No personal reflection written yet.'}
              </p>
            )}
          </div>
        )}

        {/* Collective Scrapbook / Contributor Perspectives Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-stone-600" />
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Collective Scrapbook ({contributors.length})
              </h2>
            </div>

            <button
              type="button"
              id="add-perspective-btn"
              onClick={() => setShowAddContributionModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>
          </div>

          {contributors.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center space-y-3">
              <Quote className="w-8 h-8 text-stone-300 mx-auto" />
              <h3 className="font-serif text-sm font-bold text-stone-800">No memories gathered yet</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                Invite attendees with the link above or click "Add Memory" to contribute your perspective.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contributors.map((contrib) => {
                const isMine = contrib.userId === userId;
                const canDelete = isOwner || isMine;
                const photo = contrib.photoUrl || (contrib.photos && contrib.photos[0]);

                return (
                  <div
                    key={contrib.id}
                    className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
                            {contrib.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-900 block truncate">
                              {contrib.displayName} {isMine && '(You)'}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">
                              {new Date(contrib.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {contrib.emotion && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                              {contrib.emotion}
                            </span>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteContributor(contrib.id)}
                              className="p-1 rounded-md text-stone-400 hover:text-rose-600 transition cursor-pointer"
                              title="Remove contribution"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed font-serif whitespace-pre-line">
                        "{contrib.memory}"
                      </p>

                      {contrib.favoriteMoment && (
                        <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Favorite moment:</strong> {contrib.favoriteMoment}</span>
                        </div>
                      )}
                    </div>

                    {photo && (
                      <div className="pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => setLightboxPhoto({ url: photo, caption: contrib.photoCaption })}
                          className="relative w-full h-40 rounded-2xl overflow-hidden bg-stone-100 group cursor-pointer border border-stone-200"
                        >
                          <img src={photo} alt="Keepsake" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          {contrib.photoCaption && (
                            <div className="absolute bottom-0 inset-x-0 bg-stone-900/80 p-2 text-[10px] text-stone-200 text-left truncate">
                              {contrib.photoCaption}
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Contribution Modal */}
      {showAddContributionModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Add Your Perspective to Capsule
              </h3>
              <button
                type="button"
                onClick={() => setShowAddContributionModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={contribName}
                  onChange={(e) => setContribName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Dominant Emotion</label>
                <select
                  value={contribEmotion}
                  onChange={(e) => setContribEmotion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                >
                  {EMOTION_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Your Memory / Reflection</label>
                <textarea
                  required
                  rows={3}
                  placeholder="What stood out to you during this gathering?"
                  value={contribMemory}
                  onChange={(e) => setContribMemory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm font-serif leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Favorite Moment (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. The laugh by the bonfire"
                  value={contribFavMoment}
                  onChange={(e) => setContribFavMoment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Attach Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="text-xs text-stone-600"
                />
                {contribPhotoUrl && (
                  <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden bg-stone-100">
                    <img src={contribPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddContributionModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingContrib || isUploadingPhoto}
                  className="px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isSavingContrib ? 'Saving...' : 'Save to Scrapbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl w-full bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={lightboxPhoto.url} alt="Enlarged" className="w-full max-h-[75vh] object-contain bg-black" />
            <div className="p-4 flex items-center justify-between bg-stone-900 text-white">
              <span className="text-xs text-stone-300">{lightboxPhoto.caption || 'Memory Photo'}</span>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memory Mosaic Modal */}
      {showMosaicModal && capsule.mosaic && (
        <MemoryMosaicModal
          mosaic={capsule.mosaic}
          onClose={() => setShowMosaicModal(false)}
          onRegenerate={handleGenerateMosaic}
          isRegenerating={isSynthesizing}
          isOwner={isOwner}
        />
      )}

      {/* Delete Archive Event Confirmation Modal */}
      {showDeleteModal && isOwner && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingCapsule && setShowDeleteModal(false)}
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
                Are you sure you want to permanently delete <strong className="text-stone-900">"{capsule.title}"</strong> and all collaborative contributions? This action cannot be reversed.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                id="cancel-delete-capsule-btn"
                disabled={isDeletingCapsule}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-capsule-btn"
                disabled={isDeletingCapsule}
                onClick={handleConfirmDeleteCapsule}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingCapsule ? (
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

      {/* Delete Perspective Confirmation Modal */}
      {contribToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingContrib && setContribToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Remove Perspective?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Remove this memory entry and associated photo from the archive scrapbook?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingContrib}
                onClick={() => setContribToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingContrib}
                onClick={handleConfirmDeleteContrib}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingContrib ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
