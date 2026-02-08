import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Camera,
  Lock,
  Clock,
  Image,
  Video,
  FileType,
  Loader2,
  X,
  Heart,
  HeartOff,
  Send,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { FullscreenImageViewer } from '@/components/media/FullscreenImageViewer';

interface TemporaryAccess {
  id: string;
  access_token: string;
  access_password: string | null;
  expires_at: string;
  is_active: boolean | null;
  max_selections: number | null;
  watermark_enabled: boolean | null;
  download_disabled: boolean | null;
  client_name: string | null;
  folder_id: string;
}

interface MediaFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  is_selected: boolean | null;
  selection_comment: string | null;
}

export default function ClientSelect() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<TemporaryAccess | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [selectedComment, setSelectedComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [signedFiles, setSignedFiles] = useState<(MediaFile & { signedUrl: string })[]>([]);

  useEffect(() => {
    if (token) {
      verifyAccess();
    }
  }, [token]);

  const verifyAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('temporary_access')
        .select('*')
        .eq('access_token', token)
        .single();

      if (error || !data) {
        setError('Invalid or expired access link');
        setLoading(false);
        return;
      }

      if (!data.is_active) {
        setError('This access link has been deactivated');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This access link has expired');
        setLoading(false);
        return;
      }

      setAccess(data);

      // Check if password is required
      if (!data.access_password) {
        setIsAuthenticated(true);
        await fetchFiles(data.folder_id);
        await updateLastAccessed(data.id);
      }
    } catch (err) {
      setError('Failed to verify access');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access) return;

    if (passwordInput === access.access_password) {
      setIsAuthenticated(true);
      await fetchFiles(access.folder_id);
      await updateLastAccessed(access.id);
    } else {
      toast.error('Incorrect password');
    }
  };

  const fetchFiles = async (folderId: string) => {
    const { data } = await supabase
      .from('media_files')
      .select('id, file_name, file_url, file_type, is_selected, selection_comment')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: true });

    const filesList = data || [];
    setFiles(filesList);

    // Pre-fetch signed URLs for all files
    const signed = await Promise.all(
      filesList.map(async (f) => {
        const { data: urlData } = await supabase.storage.from('media').createSignedUrl(f.file_url, 3600);
        return { ...f, signedUrl: urlData?.signedUrl || '' };
      })
    );
    setSignedFiles(signed);
  };

  const updateLastAccessed = async (accessId: string) => {
    await supabase
      .from('temporary_access')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', accessId);
  };

  const toggleSelection = async (file: MediaFile) => {
    if (!access) return;

    const newSelected = !file.is_selected;

    // Check max selections
    if (newSelected && access.max_selections) {
      const selectedCount = files.filter((f) => f.is_selected).length;
      if (selectedCount >= access.max_selections) {
        toast.error(`Maximum ${access.max_selections} selections allowed`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('media_files')
        .update({ is_selected: newSelected })
        .eq('id', file.id);

      if (error) throw error;

      // Log selection
      await supabase.from('selection_log').insert({
        temporary_access_id: access.id,
        media_file_id: file.id,
        selected: newSelected,
      });

      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, is_selected: newSelected } : f))
      );

      toast.success(newSelected ? 'Added to selection' : 'Removed from selection');
    } catch (error: any) {
      toast.error('Failed to update selection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!selectedFile || !selectedComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('media_files')
        .update({ selection_comment: selectedComment.trim() })
        .eq('id', selectedFile.id);

      if (error) throw error;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === selectedFile.id ? { ...f, selection_comment: selectedComment.trim() } : f
        )
      );

      toast.success('Comment added');
      setSelectedFile(null);
      setSelectedComment('');
    } catch (error: any) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl || '';
  };

  const selectedCount = files.filter((f) => f.is_selected).length;
  const totalFiles = files.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (access && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome{access.client_name ? `, ${access.client_name}` : ''}
            </h1>
            <p className="text-muted-foreground">Enter the password to access your gallery</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="text-center"
            />
            <Button type="submit" className="w-full btn-fade">
              <Lock className="h-4 w-4 mr-2" />
              Access Gallery
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">
                  {access?.client_name || 'Photo Selection'}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Expires {access && formatDistanceToNow(new Date(access.expires_at), { addSuffix: true })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {selectedCount} / {totalFiles}
                </p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
              {access?.max_selections && (
                <div className="text-right">
                  <p className="text-sm font-medium text-warning">
                    {access.max_selections - selectedCount} left
                  </p>
                  <p className="text-xs text-muted-foreground">Max: {access.max_selections}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file, index) => (
            <GalleryItem
              key={file.id}
              file={file}
              signedUrl={signedFiles.find(sf => sf.id === file.id)?.signedUrl || null}
              onToggleSelect={() => toggleSelection(file)}
              onOpenComment={() => {
                setSelectedFile(file);
                setSelectedComment(file.selection_comment || '');
              }}
              onOpenViewer={() => {
                setViewerIndex(index);
                setViewerOpen(true);
              }}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center py-12">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No files available for selection</p>
          </div>
        )}
      </main>

      {/* Comment Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Comment</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedComment('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{selectedFile.file_name}</p>
            <Textarea
              value={selectedComment}
              onChange={(e) => setSelectedComment(e.target.value)}
              placeholder="Add a comment about this photo..."
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedComment('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={submitComment} disabled={isSubmitting} className="btn-fade">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Save Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Viewer with Zoom */}
      {viewerOpen && signedFiles.length > 0 && (
        <FullscreenImageViewer
          files={signedFiles}
          currentIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onPrev={() => setViewerIndex(i => Math.max(0, i - 1))}
          onNext={() => setViewerIndex(i => Math.min(signedFiles.length - 1, i + 1))}
          onToggleFavorite={() => {
            const file = files[viewerIndex];
            if (file) toggleSelection(file);
          }}
          isFavorite={files[viewerIndex]?.is_selected || false}
        />
      )}
    </div>
  );
}

function GalleryItem({
  file,
  signedUrl,
  onToggleSelect,
  onOpenComment,
  onOpenViewer,
  isSubmitting,
}: {
  file: MediaFile;
  signedUrl: string | null;
  onToggleSelect: () => void;
  onOpenComment: () => void;
  onOpenViewer: () => void;
  isSubmitting: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(signedUrl);
  const [isLoading, setIsLoading] = useState(!signedUrl);
  const isImage = file.file_type?.startsWith('image/');
  const isVideo = file.file_type?.startsWith('video/');

  useEffect(() => {
    if (signedUrl) {
      setImageUrl(signedUrl);
      setIsLoading(false);
    } else {
      const loadImage = async () => {
        const { data } = await supabase.storage
          .from('media')
          .createSignedUrl(file.file_url, 3600);
        setImageUrl(data?.signedUrl || null);
        setIsLoading(false);
      };
      loadImage();
    }
  }, [file.file_url, signedUrl]);

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden group transition-all cursor-pointer',
        file.is_selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <div className="aspect-[4/3] bg-muted">
        {isLoading ? (
          <div className="shimmer h-full w-full" />
        ) : isImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={file.file_name}
            className="w-full h-full object-cover"
            onClick={onOpenViewer}
          />
        ) : isVideo ? (
          <div
            className="w-full h-full flex items-center justify-center bg-muted"
            onClick={onOpenViewer}
          >
            <Video className="h-12 w-12 text-muted-foreground" />
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            onClick={onOpenViewer}
          >
            <FileType className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Selection overlay */}
      <div
        className={cn(
          'absolute inset-0 transition-all',
          file.is_selected ? 'bg-primary/20' : 'bg-black/0 group-hover:bg-black/20'
        )}
        onClick={onToggleSelect}
      />

      {/* Selection indicator */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        disabled={isSubmitting}
        className={cn(
          'absolute top-2 right-2 p-2 rounded-full transition-all',
          file.is_selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-white/80 text-muted-foreground opacity-0 group-hover:opacity-100'
        )}
      >
        {file.is_selected ? (
          <Heart className="h-4 w-4 fill-current" />
        ) : (
          <HeartOff className="h-4 w-4" />
        )}
      </button>

      {/* Comment button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenComment();
        }}
        className={cn(
          'absolute bottom-2 right-2 p-1.5 rounded-full bg-white/80 text-muted-foreground transition-all opacity-0 group-hover:opacity-100',
          file.selection_comment && 'opacity-100 bg-info/20 text-info'
        )}
      >
        <Send className="h-3 w-3" />
      </button>

      {/* Comment indicator */}
      {file.selection_comment && (
        <div className="absolute bottom-2 left-2 right-10 bg-black/60 rounded px-2 py-1">
          <p className="text-xs text-white truncate">{file.selection_comment}</p>
        </div>
      )}
    </div>
  );
}
