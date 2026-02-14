import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Heart, Video } from 'lucide-react';

interface MediaFile {
  signedUrl: string;
  file_name: string;
  file_type?: string | null;
}

interface FullscreenImageViewerProps {
  files: MediaFile[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export function FullscreenImageViewer({
  files,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onToggleFavorite,
  isFavorite,
}: FullscreenImageViewerProps) {
  const [zoom, setZoom] = useState(3);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentFile = files[currentIndex];
  const isVideo = currentFile?.file_type?.startsWith('video/') || 
    /\.(mp4|mov|avi|webm|mkv)$/i.test(currentFile?.file_name || '');
  const isImage = !isVideo;

  useEffect(() => {
    setZoom(isVideo ? 1 : 3);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex, isVideo]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 5));
  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.5, 1));
    if (zoom <= 1.5) setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1 && isImage) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <p className="text-white text-sm">{currentIndex + 1} of {files.length}</p>
        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-white hover:bg-white/20">
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-white hover:bg-white/20">
                <ZoomIn className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 ml-4">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content Container */}
      <div 
        className={cn(
          "flex-1 flex items-center justify-center relative overflow-hidden",
          isImage && "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {currentIndex > 0 && (
          <Button 
            variant="ghost" size="icon" 
            onClick={(e) => { e.stopPropagation(); onPrev(); }} 
            className="absolute left-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}
        
        {isVideo && currentFile?.signedUrl ? (
          <video
            src={currentFile.signedUrl}
            controls
            autoPlay
            className="max-w-[95vw] max-h-[85vh] rounded-lg"
          />
        ) : currentFile?.signedUrl ? (
          <img
            src={currentFile.signedUrl}
            alt={currentFile.file_name}
            className="max-w-none select-none transition-transform duration-200"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              maxHeight: zoom === 1 ? '90vh' : 'none',
              maxWidth: zoom === 1 ? '95vw' : 'none',
            }}
            draggable={false}
          />
        ) : null}
        
        {currentIndex < files.length - 1 && (
          <Button 
            variant="ghost" size="icon" 
            onClick={(e) => { e.stopPropagation(); onNext(); }} 
            className="absolute right-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={cn(
              'absolute top-4 right-4 p-3 rounded-full transition-all z-20',
              isFavorite ? 'bg-primary text-primary-foreground' : 'bg-white/20 text-white hover:bg-white/30'
            )}
          >
            <Heart className={cn('h-6 w-6', isFavorite && 'fill-current')} />
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 bg-black/80 text-center">
        <p className="text-white/60 text-xs">
          {isVideo ? 'Use arrow keys to navigate • Click ❤️ to select' : 'Use arrow keys to navigate • Drag to pan when zoomed • Click ❤️ to select'}
        </p>
      </div>
    </div>
  );
}
