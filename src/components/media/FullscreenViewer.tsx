import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
}

interface FullscreenViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: MediaFile[];
  initialIndex: number;
  onNavigate?: (index: number) => void;
}

export function FullscreenViewer({
  open,
  onOpenChange,
  files,
  initialIndex,
  onNavigate,
}: FullscreenViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, open]);

  const currentFile = files[currentIndex];
  const isImage = currentFile?.file_type?.startsWith('image/');
  const isVideo = currentFile?.file_type?.startsWith('video/');

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setIsLoading(true);
      setZoom(1);
      onNavigate?.(newIndex);
    }
  }, [currentIndex, onNavigate]);

  const goToNext = useCallback(() => {
    if (currentIndex < files.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setIsLoading(true);
      setZoom(1);
      onNavigate?.(newIndex);
    }
  }, [currentIndex, files.length, onNavigate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onOpenChange(false);
    },
    [goToNext, goToPrevious, onOpenChange]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 0.5));

  if (!currentFile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/95 border-none [&>button]:hidden sm:max-w-[100vw]">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white">
            <p className="font-medium truncate max-w-[50vw]">{currentFile.file_name}</p>
            <p className="text-sm text-white/60">
              {currentIndex + 1} of {files.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="text-white hover:bg-white/20"
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <span className="text-white text-sm min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="text-white hover:bg-white/20"
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {currentIndex < files.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Content - Large Image */}
        <div className="flex items-center justify-center w-full h-full overflow-auto p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {isImage && (
            <img
              src={currentFile.file_url}
              alt={currentFile.file_name}
              className={cn(
                'max-w-[90vw] max-h-[85vh] object-contain transition-all duration-200',
                isLoading && 'opacity-0'
              )}
              style={{
                transform: `scale(${zoom})`,
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              draggable={false}
            />
          )}

          {isVideo && (
            <video
              src={currentFile.file_url}
              controls
              autoPlay
              className="max-w-[95vw] max-h-[90vh]"
              onLoadedData={() => setIsLoading(false)}
            />
          )}

          {!isImage && !isVideo && (
            <div className="text-center text-white">
              <p className="text-lg font-medium">{currentFile.file_name}</p>
              <p className="text-white/60 mt-2">Preview not available</p>
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {files.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent py-4 px-4">
            <div className="flex justify-center gap-2 overflow-x-auto max-w-full pb-2">
              {files.slice(Math.max(0, currentIndex - 5), Math.min(files.length, currentIndex + 6)).map((file, idx) => {
                const actualIndex = Math.max(0, currentIndex - 5) + idx;
                const isActive = actualIndex === currentIndex;
                const isFileImage = file.file_type?.startsWith('image/');

                return (
                  <button
                    key={file.id}
                    onClick={() => {
                      setCurrentIndex(actualIndex);
                      setIsLoading(true);
                      setZoom(1);
                    }}
                    className={cn(
                      'w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all',
                      isActive ? 'border-primary ring-2 ring-primary/50' : 'border-white/20 hover:border-white/50'
                    )}
                  >
                    {isFileImage ? (
                      <img
                        src={file.file_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/60 text-xs">
                        {file.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
