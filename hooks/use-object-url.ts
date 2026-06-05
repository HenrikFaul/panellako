'use client';

import { useEffect, useState } from 'react';

/**
 * Memory-leak-safe preview URL for a File/Blob.
 * Revokes the object URL on cleanup (file change or unmount).
 *
 * Usage:
 *   const previewUrl = useObjectUrl(file);
 *   return previewUrl ? <img src={previewUrl} /> : null;
 */
export function useObjectUrl(file: File | Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
}
