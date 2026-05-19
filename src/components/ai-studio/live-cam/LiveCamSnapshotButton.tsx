import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  sessionId: string | null;
  remoteCanvasRef: React.RefObject<HTMLCanvasElement>;
  disabled?: boolean;
}

export const LiveCamSnapshotButton: React.FC<Props> = ({ sessionId, remoteCanvasRef, disabled }) => {
  const [saving, setSaving] = useState(false);

  const handleCapture = async () => {
    if (!sessionId || !remoteCanvasRef.current) return;
    const canvas = remoteCanvasRef.current;
    if (canvas.width === 0 || canvas.height === 0) {
      toast.error('No try-on frame yet');
      return;
    }
    setSaving(true);
    try {
      // Brief freeze visual feedback handled by parent if desired; here we just save.
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
      if (!blob) throw new Error('Failed to encode snapshot');

      const form = new FormData();
      form.append('session_id', sessionId);
      form.append('image', new File([blob], 'snapshot.jpg', { type: 'image/jpeg' }));

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-cam-snapshot-save`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
        },
        body: form,
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      toast.success('Snapshot saved');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Snapshot failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCapture}
      disabled={disabled || saving || !sessionId}
      className="h-10 px-4 rounded-lg bg-white border border-gray-200 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      Capture
    </button>
  );
};
