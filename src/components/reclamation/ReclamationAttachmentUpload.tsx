'use client';

import { useRef, useState } from 'react';
import { reclamationApi } from '@/lib/api/reclamation';
import { ReclamationAttachment } from '@/lib/api/types';

export function ReclamationAttachmentUpload({ reclamationId, onUploaded }: { reclamationId: number; onUploaded?: (attachment: ReclamationAttachment) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      // Sequential, not parallel: keeps upload order predictable and avoids
      // hammering the backend with N simultaneous multipart requests.
      for (const file of Array.from(files)) {
        const attachment = await reclamationApi.addAttachment(reclamationId, file);
        onUploaded?.(attachment);
      }
    } catch (e) {
      console.error('Upload failed', e);
      setError("Échec de l'envoi d'un ou plusieurs fichiers.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
        className="text-sm text-text-dim file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:text-sm hover:file:bg-cyan-500 file:cursor-pointer disabled:opacity-50"
      />
      {uploading && <span className="text-xs text-text-dim">Envoi en cours...</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
