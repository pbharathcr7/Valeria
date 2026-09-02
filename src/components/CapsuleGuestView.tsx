import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Image as ImageIcon, 
  Send, 
  Check, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  ArrowLeft,
  Heart,
  Quote,
  Sparkles,
  Smile,
  Compass,
  Upload,
  Camera,
  X
} from 'lucide-react';
import { MemoryCapsule, CapsuleContributor } from '../types';
import { 
  loadMemoryCapsuleById, 
  loadMemoryCapsuleByInviteCode,
  loadCapsuleContributors, 
  saveCapsuleContribution, 
  deleteCapsuleContribution,
  saveMemoryCapsule
} from '../lib/firebase';
import { compressImageFile } from '../lib/imageUtils';

interface CapsuleGuestViewProps {
  capsuleId?: string;
  inviteCode?: string;
  currentUser: { uid: string; displayName?: string | null; email?: string | null } | null;
  onBackToApp: () => void;
  onSignIn?: () => void;
}

const EMOTION_OPTIONS = [
  { label: 'Joy', icon: '✨', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
  { label: 'Nostalgia', icon: '🌅', bg: 'bg-orange-100 text-orange-900 border-orange-300' },
  { label: 'Gratitude', icon: '🙏', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { label: 'Adventure', icon: '⛰️', bg: 'bg-sky-100 text-sky-900 border-sky-300' },
  { label: 'Love & Warmth', icon: '💛', bg: 'bg-rose-100 text-rose-900 border-rose-300' },
  { label: 'Wonder', icon: '🌌', bg: 'bg-purple-100 text-purple-900 border-purple-300' },
  { label: 'Peace', icon: '🍃', bg: 'bg-teal-100 text-teal-900 border-teal-300' }
];

export const CapsuleGuestView: React.FC<CapsuleGuestViewProps> = ({
  capsuleId,
  inviteCode,
  currentUser,
  onBackToApp,
  onSignIn
}) => {
  const [capsule, setCapsule] = useState<MemoryCapsule | null>(null);
  const [contributors, setContributors] = useState<CapsuleContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contributor form state
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [memoryText, setMemoryText] = useState('');
  const [emotion, setEmotion] = useState('Joy');
  const [favoriteMoment, setFavoriteMoment] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null);

  // Fetch capsule data
  useEffect(() => {
    let isMounted = true;

    async function fetchCapsule() {
      try {
        setLoading(true);
        setError(null);

        let data: MemoryCapsule | null = null;
        if (inviteCode) {
          data = await loadMemoryCapsuleByInviteCode(inviteCode);
        }
        if (!data && capsuleId) {
          data = await loadMemoryCapsuleById(capsuleId);
        }

        if (!isMounted) return;

        if (!data) {
          setError('This Life Archive link is invalid or has expired.');
          setLoading(false);
          return;
        }

        setCapsule(data);

        // Load contributors
        const contribs = await loadCapsuleContributors(data.id);
        if (!isMounted) return;
        setContributors(contribs);

        // If current user already submitted, prefill form
        if (currentUser) {
          const myContrib = contribs.find(c => c.userId === currentUser.uid);
          if (myContrib) {
            setDisplayName(myContrib.displayName || currentUser.displayName || '');
            setMemoryText(myContrib.memory || '');
            setEmotion(myContrib.emotion || 'Joy');
            setFavoriteMoment(myContrib.favoriteMoment || '');
            setPhotoUrl(myContrib.photoUrl || (myContrib.photos && myContrib.photos[0]) || null);
            setPhotoCaption(myContrib.photoCaption || '');
            setEditingContributionId(myContrib.id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching capsule:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to load Life Archive event.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCapsule();

    return () => {
      isMounted = false;
    };
  }, [capsuleId, inviteCode, currentUser]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      const base64 = await compressImageFile(file, 1200, 0.8);
      setPhotoUrl(base64);
    } catch (err: any) {
      console.error('Photo compression failed:', err);
      setError('Could not process photo upload.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsule) return;
    if (!memoryText.trim()) {
      setError('Please write a short memory or perspective.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (capsule.status === 'closed') {
      setError('This Memory Capsule is closed for new submissions.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const userId = currentUser?.uid || `guest_${Date.now()}`;
      const contribId = editingContributionId || userId;

      const contributionData: CapsuleContributor = {
        id: contribId,
        userId: userId,
        displayName: displayName.trim(),
        memory: memoryText.trim(),
        emotion: emotion,
        favoriteMoment: favoriteMoment.trim() || undefined,
        photoUrl: photoUrl || undefined,
        photoCaption: photoCaption.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveCapsuleContribution(capsule.id, contributionData);

      // Refresh contributors list
      const updated = await loadCapsuleContributors(capsule.id);
      setContributors(updated);

      // Synchronize capsule contributorCount & photoCount in parent document
      try {
        const trueContribCount = updated.length;
        const truePhotoCount = updated.filter(c => Boolean(c.photoUrl)).length + (capsule.coverPhoto ? 1 : 0);
        const updatedCap: MemoryCapsule = {
          ...capsule,
          contributorCount: trueContribCount,
          photoCount: truePhotoCount,
          updatedAt: new Date().toISOString()
        };
        await saveMemoryCapsule(updatedCap);
        setCapsule(updatedCap);
      } catch (countErr) {
        console.warn('Could not update capsule counts:', countErr);
      }

      setSubmitSuccess(true);
      setEditingContributionId(contribId);

      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error submitting contribution:', err);
      setError(err?.message || 'Failed to submit memory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContribution = async (contribId: string) => {
    if (!capsule) return;
    if (!window.confirm('Are you sure you want to remove your perspective?')) return;

    try {
      await deleteCapsuleContribution(capsule.id, contribId);
      const updated = await loadCapsuleContributors(capsule.id);
      setContributors(updated);

      // Synchronize capsule contributorCount & photoCount in parent document
      try {
        const trueContribCount = updated.length;
        const truePhotoCount = updated.filter(c => Boolean(c.photoUrl)).length + (capsule.coverPhoto ? 1 : 0);
        const updatedCap: MemoryCapsule = {
          ...capsule,
          contributorCount: trueContribCount,
          photoCount: truePhotoCount,
          updatedAt: new Date().toISOString()
        };
        await saveMemoryCapsule(updatedCap);
        setCapsule(updatedCap);
      } catch (countErr) {
        console.warn('Could not update capsule counts:', countErr);
      }

      setMemoryText('');
      setPhotoUrl(null);
      setPhotoCaption('');
      setFavoriteMoment('');
      setEditingContributionId(null);
    } catch (err: any) {
      console.error('Error deleting memory:', err);
      setError('Failed to delete memory.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-amber-200 text-sm tracking-wide">Opening Life Archive...</p>
        </div>
      </div>
    );
  }

  if (error || !capsule) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-stone-200">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-stone-900">Archive Event Not Found</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            {error || 'This invite link might be invalid or the host has closed submissions.'}
          </p>
          <button
            type="button"
            onClick={onBackToApp}
            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer"
          >
            Return to Valeria
          </button>
        </div>
      </div>
    );
  }

  const myExistingContribution = currentUser ? contributors.find(c => c.userId === currentUser.uid) : null;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950 font-sans">
      {/* Top Banner Navigation */}
      <header className="border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToApp}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Valeria App</span>
          </button>
          <div className="h-4 w-px bg-stone-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono uppercase tracking-wider font-semibold">
              Life Archive
            </span>
            <span className="text-xs text-stone-400 font-medium truncate max-w-[200px] sm:max-w-md">
              {capsule.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!currentUser && onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
        {/* Event Hero Card */}
        <div className="relative rounded-3xl overflow-hidden bg-stone-900 border border-stone-800 shadow-2xl">
          <div className="h-56 sm:h-72 w-full relative">
            <img
              src={capsule.coverPhoto || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'}
              alt={capsule.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider">
                Event Scrapbook
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              {capsule.title}
            </h1>

            {capsule.description && (
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl font-serif">
                {capsule.description}
              </p>
            )}

            <div className="flex items-center gap-4 sm:gap-6 pt-2 text-xs font-mono text-stone-400 flex-wrap">
              {capsule.eventDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{capsule.eventDate}</span>
                </div>
              )}
              {capsule.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{capsule.location.placeName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Host: {capsule.ownerName || 'Valeria User'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{contributors.length} {contributors.length === 1 ? 'Perspective' : 'Perspectives'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Share Your Memory Submission Section */}
        <section id="contributor-form-section" className="bg-stone-900/90 rounded-3xl border border-stone-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Quote className="w-5 h-5 text-amber-400" />
                <h2 className="font-serif text-xl font-bold text-white tracking-tight">
                  {myExistingContribution ? 'Edit Your Memory' : 'Share Your Memory'}
                </h2>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Contribute your unique vantage point, emotion, and keepsake photo to this collective event scrapbook.
              </p>
            </div>

            {myExistingContribution && (
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono uppercase font-bold shrink-0">
                Submitted ✓
              </span>
            )}
          </div>

          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Your perspective and photo keepsake have been saved to the collective memory capsule!</span>
            </div>
          )}

          <form onSubmit={handleSaveContribution} className="space-y-5">
              {/* Name & Emotion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Your Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="guest-name-input"
                    required
                    placeholder="e.g. Maya, Arjun, Sarah"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-100 focus:outline-hidden focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dominant Emotion</span>
                  </label>
                  <select
                    id="guest-emotion-select"
                    value={emotion}
                    onChange={(e) => setEmotion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-100 focus:outline-hidden focus:border-amber-400 transition"
                  >
                    {EMOTION_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Memory Text */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Your Memory or Reflection <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="guest-memory-input"
                  required
                  rows={4}
                  placeholder="What stood out to you? A funny conversation, an unforgettable scene, or how you felt..."
                  value={memoryText}
                  onChange={(e) => setMemoryText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-100 focus:outline-hidden focus:border-amber-400 transition leading-relaxed font-serif"
                />
              </div>

              {/* Standout favorite moment (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Favorite Moment / Standout Highlight (Optional)</span>
                </label>
                <input
                  type="text"
                  id="guest-fav-moment-input"
                  placeholder="e.g. Catching the sunset at the viewpoint, the late-night campfire talks"
                  value={favoriteMoment}
                  onChange={(e) => setFavoriteMoment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-100 focus:outline-hidden focus:border-amber-400 transition"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Attach Keepsake Photo (Optional)</span>
                  </label>

                  <label className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={isUploadingPhoto}
                    />
                  </label>
                </div>

                {photoUrl && (
                  <div className="flex flex-col sm:flex-row gap-3 p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                    <div className="relative w-full sm:w-32 h-28 rounded-xl overflow-hidden bg-stone-900 shrink-0">
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-stone-900/80 text-rose-400 hover:bg-stone-900 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                        Photo Note / Caption
                      </label>
                      <input
                        type="text"
                        placeholder="Add context to this photo..."
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 focus:outline-hidden focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
                {myExistingContribution && (
                  <button
                    type="button"
                    onClick={() => handleDeleteContribution(myExistingContribution.id)}
                    className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete My Memory</span>
                  </button>
                )}

                <button
                  type="submit"
                  id="submit-guest-memory-btn"
                  disabled={isSubmitting || isUploadingPhoto}
                  className="ml-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Saving Memory...' : myExistingContribution ? 'Update Memory' : 'Save to Capsule'}</span>
                </button>
              </div>
            </form>
        </section>

        {/* Collective Scrapbook Feed (All Perspectives) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h2 className="font-serif text-xl font-bold text-white tracking-tight">
                Collective Scrapbook ({contributors.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-stone-400">
              Shared Moments
            </span>
          </div>

          {contributors.length === 0 ? (
            <div className="p-8 rounded-3xl bg-stone-900/50 border border-stone-800 text-center space-y-2">
              <Quote className="w-6 h-6 text-stone-600 mx-auto" />
              <p className="text-xs font-semibold text-stone-300">No perspectives contributed yet</p>
              <p className="text-[11px] text-stone-500">
                Be the first to share your memory and photo for this event!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contributors.map((contrib) => {
                const isMine = currentUser && contrib.userId === currentUser.uid;
                const photo = contrib.photoUrl || (contrib.photos && contrib.photos[0]);

                return (
                  <div
                    key={contrib.id}
                    className={`rounded-3xl bg-stone-900/90 border p-5 space-y-3.5 shadow-md flex flex-col justify-between transition ${
                      isMine ? 'border-amber-500/50 bg-stone-900 ring-1 ring-amber-500/20' : 'border-stone-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                            {contrib.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-100 block truncate">
                              {contrib.displayName} {isMine && '(You)'}
                            </span>
                            <span className="text-[10px] font-mono text-stone-500">
                              {new Date(contrib.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {contrib.emotion && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-amber-300 shrink-0">
                            {contrib.emotion}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-300 leading-relaxed font-serif whitespace-pre-line">
                        "{contrib.memory}"
                      </p>

                      {contrib.favoriteMoment && (
                        <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/80 text-[11px] text-amber-200/90 flex items-start gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>Highlight:</strong> {contrib.favoriteMoment}</span>
                        </div>
                      )}
                    </div>

                    {photo && (
                      <div className="pt-2 border-t border-stone-800/80">
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: photo, caption: contrib.photoCaption })}
                          className="relative w-full h-40 rounded-2xl overflow-hidden bg-stone-950 group cursor-pointer border border-stone-800"
                        >
                          <img src={photo} alt="Keepsake" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          {contrib.photoCaption && (
                            <div className="absolute bottom-0 inset-x-0 bg-stone-950/80 p-2 text-[10px] font-sans text-stone-300 text-left truncate">
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
        </section>
      </main>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl w-full bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={lightboxImage.url} alt="Enlarged keepsake" className="w-full max-h-[75vh] object-contain bg-black" />
            <div className="p-4 flex items-center justify-between bg-stone-900">
              <span className="text-xs text-stone-300">{lightboxImage.caption || 'Memory Photo'}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
