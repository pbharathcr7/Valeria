import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  FileCheck, 
  Layers, 
  X,
  FileUp,
  AlertTriangle,
  Plus,
  MessageSquare,
  Sparkles,
  Mic
} from 'lucide-react';
import { UserProfile, DocumentItem, ReflectionIntent } from '../types';
import { 
  loadUserDocuments, 
  saveDocument, 
  saveDocumentChunks, 
  deleteUserDocument 
} from '../lib/firebase';
import { DocumentChatCanvas } from '../components/DocumentChatCanvas';

interface DocumentsPageProps {
  user: UserProfile;
  onNewReflection?: (intent?: ReflectionIntent) => void;
  onNavigate?: (path: string) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ user, onNewReflection, onNavigate }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [documentPendingDelete, setDocumentPendingDelete] = useState<DocumentItem | null>(null);
  const [activeChatDocument, setActiveChatDocument] = useState<DocumentItem | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load user documents from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchDocuments() {
      setIsLoading(true);
      try {
        const docs = await loadUserDocuments(user.uid);
        if (isMounted) {
          setDocuments(docs as DocumentItem[]);
        }
      } catch (err) {
        console.error('Failed to load user documents:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (user?.uid) {
      fetchDocuments();
    }

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (isoStr: string): string => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // File upload & processing pipeline
  const processSelectedFile = async (file: File) => {
    setErrorMessage(null);

    // 1. Validate PDF file type
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMessage(`"${file.name}" is not a PDF. PDF is the only supported document type.`);
      return;
    }

    // 2. Validate file size limit (20MB max)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage(`"${file.name}" is too large (${formatFileSize(file.size)}). Maximum file size is 20 MB.`);
      return;
    }

    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();

    const initialDoc: DocumentItem = {
      id: docId,
      userId: user.uid,
      fileName: file.name,
      fileSize: file.size,
      pageCount: undefined,
      uploadedAt: nowIso,
      status: 'uploading',
      storagePath: `users/${user.uid}/documents/${docId}`,
      chunkCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Update local state and save initial document to Firestore
    setDocuments(prev => [initialDoc, ...prev]);
    setIsUploading(true);
    setUploadProgressMsg('Uploading document...');

    try {
      await saveDocument(user.uid, docId, initialDoc);

      // Read file as base64
      setUploadProgressMsg('Reading file...');
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file from browser storage.'));
        reader.readAsDataURL(file);
      });

      // Update status to 'processing'
      const processingDoc: Partial<DocumentItem> = {
        status: 'processing',
        updatedAt: new Date().toISOString()
      };
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...processingDoc } : d));
      await saveDocument(user.uid, docId, processingDoc);
      setUploadProgressMsg('Extracting text, pages & vector embeddings...');

      // Call backend PDF processing service
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          fileName: file.name,
          fileSize: file.size,
          fileBase64: base64Data
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Document processing failed.' }));
        throw new Error(errJson.error || `Server returned error status ${response.status}`);
      }

      const result = await response.json();

      // Save extracted chunks to Firestore subcollection
      setUploadProgressMsg('Storing indexed chunks...');
      if (Array.isArray(result.chunks) && result.chunks.length > 0) {
        await saveDocumentChunks(user.uid, docId, result.chunks);
      }

      // Mark document as 'indexed'
      const indexedDoc: Partial<DocumentItem> = {
        status: 'indexed',
        pageCount: result.pageCount,
        chunkCount: result.chunkCount || result.chunks?.length || 0,
        updatedAt: new Date().toISOString()
      };

      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...indexedDoc } : d));
      await saveDocument(user.uid, docId, indexedDoc);

    } catch (err: any) {
      console.error('Document upload/processing error:', err);
      const failedDoc: Partial<DocumentItem> = {
        status: 'failed',
        errorMessage: err.message || 'Processing failed.',
        updatedAt: new Date().toISOString()
      };
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...failedDoc } : d));
      await saveDocument(user.uid, docId, failedDoc).catch(console.error);
      setErrorMessage(`Failed to process "${file.name}": ${err.message || 'Extraction error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Prompt confirmation modal for document deletion
  const promptDeleteDocument = (doc: DocumentItem) => {
    setDocumentPendingDelete(doc);
  };

  // Confirmed delete execution
  const handleConfirmDelete = async () => {
    if (!documentPendingDelete) return;
    const docToDelete = documentPendingDelete;
    const docId = docToDelete.id;

    setDeletingDocId(docId);
    try {
      await deleteUserDocument(user.uid, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setDocumentPendingDelete(null);
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      setErrorMessage(`Could not delete document: ${err.message || 'Network error'}`);
    } finally {
      setDeletingDocId(null);
    }
  };

  // If a document chat session is active, render the dedicated DocumentChatCanvas
  if (activeChatDocument) {
    return (
      <DocumentChatCanvas
        document={activeChatDocument}
        user={user}
        onClose={() => setActiveChatDocument(null)}
      />
    );
  }

  return (
    <div id="documents-page" className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <FileText className="w-3.5 h-3.5 text-amber-800" />
            <span>Document Intelligence</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Personal Documents
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Bring your documents into the conversation.
          </p>
        </div>

        {/* Top Upload Action */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,application/pdf"
            className="hidden"
            id="pdf-upload-file-input"
          />
          <button
            type="button"
            id="upload-pdf-header-btn"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 active:scale-[0.98] transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>{uploadProgressMsg || 'Uploading...'}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-amber-300 group-hover:-translate-y-0.5 transition-transform" />
                <span>Upload PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div 
          id="documents-error-banner"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 text-xs animate-in fade-in"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Document Processing Notice</p>
              <p className="mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-100 transition cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Drag & Drop Upload Zone (Compact & Elegant) */}
      <div
        id="pdf-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging 
            ? 'border-amber-600 bg-amber-50/50 scale-[1.005]' 
            : 'border-stone-200/90 hover:border-stone-400 bg-white hover:bg-stone-50/50 shadow-2xs'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center space-y-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'
          }`}>
            <FileUp className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-serif font-bold text-base text-stone-900">
              Drag and drop your PDF here, or <span className="underline decoration-stone-400 underline-offset-2">browse files</span>
            </p>
            <p className="text-xs text-stone-500">
              Supports searchable PDF documents up to 20 MB. Chunks and embeddings are prepared automatically.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Uploaded Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Your Uploaded Documents
            </h2>
            {documents.length > 0 && (
              <span className="text-xs font-mono bg-stone-100 border border-stone-200 text-stone-700 px-2 py-0.5 rounded-full">
                {documents.length} {documents.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-stone-200/80 p-8 shadow-2xs">
            <div className="w-7 h-7 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-stone-500">Loading your document library...</p>
          </div>
        ) : documents.length === 0 ? (
          /* Empty State as explicitly specified */
          <div 
            id="documents-empty-state"
            className="py-16 px-6 text-center bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="font-serif font-bold text-xl text-stone-900">
                No documents yet
              </h3>
              <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
                Upload a PDF to ask questions and reflect with your own knowledge.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                id="empty-state-upload-btn"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 active:scale-[0.98] transition shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Upload PDF</span>
              </button>
            </div>
          </div>
        ) : (
          /* Document Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const isDeleting = deletingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  id={`document-card-${doc.id}`}
                  className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
                >
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 text-amber-900 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 
                          className="font-serif font-bold text-stone-900 text-sm truncate leading-snug" 
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] font-mono text-stone-500">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.pageCount !== undefined && doc.pageCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                            </>
                          )}
                          {doc.chunkCount !== undefined && doc.chunkCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{doc.chunkCount} chunks</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      id={`delete-doc-btn-${doc.id}`}
                      disabled={isDeleting || doc.status === 'uploading' || doc.status === 'processing'}
                      onClick={() => promptDeleteDocument(doc)}
                      className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      title="Delete document"
                      aria-label={`Delete ${doc.fileName}`}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Card Bottom: Metadata & Status / Action Row */}
                  <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(doc.uploadedAt || doc.createdAt)}</span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {doc.status === 'indexed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Indexed</span>
                          </span>
                        )}

                        {doc.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-amber-50 text-amber-900 border border-amber-200">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                            <span>Processing</span>
                          </span>
                        )}

                        {doc.status === 'uploading' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-stone-100 text-stone-800 border border-stone-200">
                            <Loader2 className="w-3 h-3 animate-spin text-stone-600" />
                            <span>Uploading</span>
                          </span>
                        )}

                        {doc.status === 'failed' && (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-rose-50 text-rose-800 border border-rose-200"
                            title={doc.errorMessage || 'Processing failed'}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action CTAs for indexed documents */}
                    {doc.status === 'indexed' && (
                      <div className="flex items-center gap-2">
                        {/* Secondary Action: Ask this PDF */}
                        <button
                          type="button"
                          id={`ask-pdf-btn-${doc.id}`}
                          onClick={() => setActiveChatDocument(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-stone-700 hover:text-stone-900 text-xs font-medium border border-stone-200 transition cursor-pointer group"
                          title={`Chat with ${doc.fileName}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-800 transition-colors" />
                          <span>Ask this PDF</span>
                        </button>

                        {/* Primary Action: Use in Voice Conversation */}
                        <button
                          type="button"
                          id={`use-in-voice-btn-${doc.id}`}
                          onClick={() => onNavigate?.(`/live?docId=${doc.id}`)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 text-xs font-semibold transition cursor-pointer shadow-xs group"
                          title={`Start live voice conversation grounded in ${doc.fileName}`}
                        >
                          <Mic className="w-3.5 h-3.5 text-stone-950 group-hover:scale-110 transition-transform" />
                          <span>Use in Voice Conversation</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Delete Confirmation Modal (Iframe-Safe & Accessible) */}
      {documentPendingDelete && (
        <div 
          id="delete-document-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !deletingDocId && setDocumentPendingDelete(null)}
        >
          <div 
            id="delete-document-modal"
            className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-serif font-bold text-lg text-stone-900 leading-snug">
                  Delete Document?
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed break-words">
                  Are you sure you want to delete <span className="font-semibold text-stone-800">"{documentPendingDelete.fileName}"</span>? This will permanently remove this PDF and all associated indexed vector chunks.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="cancel-delete-doc-btn"
                disabled={Boolean(deletingDocId)}
                onClick={() => setDocumentPendingDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-doc-btn"
                disabled={Boolean(deletingDocId)}
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deletingDocId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
