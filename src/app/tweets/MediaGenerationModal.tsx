'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ScheduledPost } from '@/types/scheduled-post';
import type { MediaLibraryEntry } from '@/types/media-library';
import { X, Sparkles, Image as ImageIcon, Video, Loader2, Trash2, Search, Upload } from 'lucide-react';

interface MediaGenerationModalProps {
  tweet: ScheduledPost;
  onClose: () => void;
  onMediaGenerated: (tweetId: string, mediaUrls: string[], mediaTypes: ('image' | 'video')[]) => void;
}

export function MediaGenerationModal({ tweet, onClose, onMediaGenerated }: MediaGenerationModalProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'browse'>('generate');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryEntry[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'studio' | 'whatsapp'>('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelected, setDeleteSelected] = useState<string[]>([]);
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [generationError, setGenerationError] = useState('');

  // Auto-seed the prompt from the tweet content — prioritize stored imagePrompt, then build from tweet text + thread
  useEffect(() => {
    const imagePrompt = (tweet as any).imagePrompt;
    if (imagePrompt) {
      setPrompt(imagePrompt);
    } else {
      // Build a rich context prompt from all tweet text
      const allText = [tweet.text, ...(tweet.threadTexts || [])].join(' ');
      const pillarHints: Record<string, string> = {
        build_in_public: 'behind-the-scenes hardware development, workshop, prototyping, 3D printing, soldering',
        product_showcase: 'sleek product photography, clean background, professional lighting, cute robot with pets',
        founder_voice: 'candid founder moment, startup life, authentic, natural lighting',
        community_prompt: 'pets and technology, pet owners, community, warm and inviting',
        market_context: 'pet industry data visualization, infographic style, modern and clean',
      };
      const pillarHint = pillarHints[tweet.pillar || ''] || 'cute robot interacting with pets';

      setPrompt(
        `Create a compelling social media image for this tweet:\n\n"${allText.substring(0, 300)}${allText.length > 300 ? '...' : ''}"\n\nStyle: ${pillarHint}\nProduct: PawMe — a spherical self-balancing AI pet companion robot with camera, LED eyes, and laser pointer.\nMake it visually engaging for Twitter/X.`
      );
    }
  }, [tweet]);

  // Load media library when browsing or when ref picker opens
  useEffect(() => {
    if ((activeTab === 'browse' || showRefPicker) && mediaLibrary.length === 0) {
      loadMediaLibrary();
    }
  }, [activeTab, showRefPicker]);

  const loadMediaLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const res = await fetch('/api/media-library');
      const data = await res.json();
      setMediaLibrary(data.media || []);
    } catch {}
    setLoadingLibrary(false);
  };

  // Filtered media
  const filteredMedia = useMemo(() => {
    return mediaLibrary.filter((m) => {
      if (!m.storageUrl) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (sourceFilter !== 'all') {
        const tags = m.tags || [];
        if (sourceFilter === 'studio' && !tags.includes('studio')) return false;
        if (sourceFilter === 'whatsapp' && !tags.includes('whatsapp')) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCaption = m.caption?.toLowerCase().includes(q);
        const matchPath = m.path?.toLowerCase().includes(q);
        const matchTags = m.tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!matchCaption && !matchPath && !matchTags) return false;
      }
      return true;
    });
  }, [mediaLibrary, typeFilter, sourceFilter, searchQuery]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError('');
    try {
      const response = await fetch('/api/generate-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetId: tweet.id,
          prompt,
          referenceImageUrl: referenceImageUrl || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        onMediaGenerated(tweet.id, data.mediaUrls, data.mediaTypes || ['image']);
      } else {
        const details = data.details ? `\n${data.details}` : '';
        const models = data.modelsAttempted ? `\nModels tried: ${data.modelsAttempted.join(', ')}` : '';
        setGenerationError(`${data.error || 'Generation failed'}${details}${models}`);
      }
    } catch (error: any) {
      setGenerationError(error.message || 'Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseExisting = async () => {
    if (selectedMedia.length === 0) return;
    try {
      const response = await fetch('/api/tweets/attach-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: tweet.id, mediaLibraryIds: selectedMedia }),
      });
      if (response.ok) {
        const data = await response.json();
        onMediaGenerated(tweet.id, data.mediaUrls, data.mediaTypes);
      }
    } catch (error) {
      console.error('Failed to attach media:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (deleteSelected.length === 0) return;
    const confirmed = window.confirm(
      `Delete ${deleteSelected.length} media file(s)? This removes them from Firebase Storage and library permanently.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/media-library/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: deleteSelected }),
      });
      if (response.ok) {
        setMediaLibrary(prev => prev.filter(m => !deleteSelected.includes(m.id)));
        setDeleteSelected([]);
        setDeleteMode(false);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    if (deleteMode) {
      setDeleteSelected(prev =>
        prev.includes(mediaId) ? prev.filter(id => id !== mediaId) : [...prev, mediaId]
      );
    } else {
      setSelectedMedia(prev =>
        prev.includes(mediaId) ? prev.filter(id => id !== mediaId) : [...prev, mediaId]
      );
    }
  };

  const selectAsReference = (media: any) => {
    setReferenceImageUrl(media.storageUrl);
    setShowRefPicker(false);
  };

  // Shared media grid renderer
  const renderMediaGrid = (items: any[], mode: 'select' | 'delete' | 'reference') => (
    <div className="grid grid-cols-4 gap-3">
      {items.map((media) => {
        const isSelected =
          mode === 'delete' ? deleteSelected.includes(media.id) :
          mode === 'reference' ? referenceImageUrl === media.storageUrl :
          selectedMedia.includes(media.id);

        const borderColor =
          mode === 'delete' ? 'border-red-500 ring-2 ring-red-200' :
          'border-purple-600 ring-2 ring-purple-200';

        return (
          <div
            key={media.id}
            onClick={() => mode === 'reference' ? selectAsReference(media) : toggleMediaSelection(media.id)}
            className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
              isSelected ? borderColor : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            {media.type === 'video' ? (
              <div className="relative w-full h-full bg-gray-900">
                {media.thumbnailUrl ? (
                  <img src={media.thumbnailUrl} alt={media.caption} className="w-full h-full object-cover" />
                ) : media.storageUrl ? (
                  <video src={media.storageUrl} className="w-full h-full object-cover" muted preload="metadata" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute top-1 right-1 bg-black bg-opacity-75 text-white text-[10px] px-1.5 py-0.5 rounded">
                  VIDEO
                </div>
              </div>
            ) : (
              <img src={media.storageUrl} alt={media.caption} className="w-full h-full object-cover" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
              <p className="text-[10px] text-white truncate">{media.caption}</p>
            </div>
            {isSelected && (
              <div className={`absolute inset-0 ${mode === 'delete' ? 'bg-red-500' : 'bg-purple-600'} bg-opacity-20 flex items-center justify-center`}>
                <div className={`w-7 h-7 ${mode === 'delete' ? 'bg-red-600' : 'bg-purple-600'} rounded-full flex items-center justify-center`}>
                  {mode === 'delete' ? (
                    <Trash2 className="w-4 h-4 text-white" />
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Media Generation</h2>
            <p className="text-sm text-gray-600 mt-1 truncate max-w-lg">
              {tweet.text.substring(0, 80)}...
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => { setActiveTab('generate'); setShowRefPicker(false); }}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'generate' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Generate New
          </button>
          <button
            onClick={() => { setActiveTab('browse'); setShowRefPicker(false); }}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'browse' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Browse ({mediaLibrary.filter(m => m.storageUrl).length})
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'generate' ? (
            showRefPicker ? (
              /* Reference image picker */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Pick a reference image for AI editing</h3>
                  <button onClick={() => setShowRefPicker(false)} className="text-sm text-purple-600 hover:underline">
                    Back to prompt
                  </button>
                </div>
                {loadingLibrary ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                ) : (
                  renderMediaGrid(mediaLibrary.filter(m => m.storageUrl && m.type === 'image'), 'reference')
                )}
              </div>
            ) : (
              /* Generate tab */
              <div className="space-y-4">
                {/* Reference image section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Image (optional — AI will edit this image based on your prompt)
                  </label>
                  {referenceImageUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <img src={referenceImageUrl} alt="Reference" className="w-20 h-14 object-cover rounded" />
                      <div className="flex-1">
                        <p className="text-sm text-purple-700 font-medium">Reference image selected</p>
                        <p className="text-xs text-purple-600">AI will use this as a starting point</p>
                      </div>
                      <button onClick={() => setReferenceImageUrl('')} className="text-red-500 hover:text-red-700 text-sm">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRefPicker(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Pick reference image from library
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {referenceImageUrl ? 'Edit Instructions' : 'Image Prompt'}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder={referenceImageUrl
                      ? "Describe how to edit the reference image (e.g., 'add a glowing LED eye effect', 'place in a modern living room')"
                      : "Describe the image you want to generate..."}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {referenceImageUrl
                      ? 'Tip: Be specific about what to change — colors, background, effects, style'
                      : 'Tip: Be specific about style, lighting, and composition'}
                  </p>
                </div>

                {generationError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 font-medium">Generation failed</p>
                    <p className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{generationError}</p>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> {referenceImageUrl ? 'Edit Image with AI' : 'Generate with AI'}</>
                  )}
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Models:</strong> Gemini 2.0 Flash (image gen) → Gemini 2.5 Flash (fallback)
                  </p>
                </div>
              </div>
            )
          ) : (
            /* Browse tab */
            <div>
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  {/* Search and filters */}
                  <div className="flex gap-3 mb-4 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, date, tag..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="all">All Types</option>
                      <option value="image">Images</option>
                      <option value="video">Videos</option>
                    </select>
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="all">All Sources</option>
                      <option value="studio">Studio</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                    <button
                      onClick={() => { setDeleteMode(!deleteMode); setDeleteSelected([]); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        deleteMode ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteMode ? 'Cancel' : 'Delete'}
                    </button>
                  </div>

                  {/* Info bar */}
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {filteredMedia.length} of {mediaLibrary.filter(m => m.storageUrl).length} assets
                    </p>
                    {deleteMode && deleteSelected.length > 0 && (
                      <button
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete {deleteSelected.length}
                      </button>
                    )}
                  </div>

                  {renderMediaGrid(filteredMedia, deleteMode ? 'delete' : 'select')}

                  {filteredMedia.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No media matches your filters.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Sticky bottom bar */}
        {activeTab === 'browse' && !deleteMode && selectedMedia.length > 0 && (
          <div className="flex-shrink-0 border-t bg-white p-4">
            <button
              onClick={handleUseExisting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
            >
              <ImageIcon className="w-5 h-5" />
              Use Selected Media ({selectedMedia.length})
            </button>
          </div>
        )}

        {activeTab === 'browse' && deleteMode && deleteSelected.length > 0 && (
          <div className="flex-shrink-0 border-t bg-white p-4">
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all font-medium"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Delete {deleteSelected.length} file(s) permanently
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
