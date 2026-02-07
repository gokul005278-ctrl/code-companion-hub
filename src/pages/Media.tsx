import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ShimmerList } from '@/components/ui/ShimmerLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DetailModal } from '@/components/ui/DetailModal';
import { FullscreenViewer } from '@/components/media/FullscreenViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  FolderOpen,
  Plus,
  Search,
  ArrowLeft,
  Upload,
  Image,
  Video,
  FileType,
  Loader2,
  X,
  Trash2,
  Eye,
  Maximize2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MediaFolder {
  id: string;
  name: string;
  folder_type: string;
  parent_folder_id: string | null;
  booking_id: string | null;
  client_id: string | null;
  storage_path: string | null;
  created_at: string;
}

interface MediaFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  folder_id: string;
  is_selected: boolean | null;
  selection_comment: string | null;
  watermarked_url: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  event_type: string;
  event_date: string;
  client: { name: string } | null;
}

export default function Media() {
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentFolder, setCurrentFolder] = useState<MediaFolder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<MediaFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewerFiles, setViewerFiles] = useState<MediaFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [folderName, setFolderName] = useState('');
  const [folderType, setFolderType] = useState('general');
  const [selectedBooking, setSelectedBooking] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async (parentId: string | null = null) => {
    setLoading(true);
    try {
      // Fetch folders
      let foldersQuery = supabase
        .from('media_folders')
        .select('*')
        .order('name');

      if (parentId) {
        foldersQuery = foldersQuery.eq('parent_folder_id', parentId);
      } else {
        foldersQuery = foldersQuery.is('parent_folder_id', null);
      }

      const { data: foldersData } = await foldersQuery;
      setFolders(foldersData || []);

      // Fetch files if in a folder
      if (parentId) {
        const { data: filesData } = await supabase
          .from('media_files')
          .select('*')
          .eq('folder_id', parentId)
          .order('created_at', { ascending: false });
        setFiles(filesData || []);
      } else {
        setFiles([]);
      }

      // Fetch bookings for folder creation
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`id, event_type, event_date, client:clients(name)`)
        .order('event_date', { ascending: false })
        .limit(50);
      setBookings((bookingsData as any) || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folder: MediaFolder | null) => {
    if (folder) {
      setCurrentFolder(folder);
      setBreadcrumbs((prev) => [...prev, folder]);
      fetchData(folder.id);
    } else {
      setCurrentFolder(null);
      setBreadcrumbs([]);
      fetchData(null);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      setCurrentFolder(null);
      setBreadcrumbs([]);
      fetchData(null);
    } else {
      const folder = breadcrumbs[index];
      setCurrentFolder(folder);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      fetchData(folder.id);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const storagePath = `${user.id}/${folderName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      const { error } = await supabase.from('media_folders').insert({
        owner_id: user.id,
        name: folderName.trim(),
        folder_type: folderType,
        parent_folder_id: currentFolder?.id || null,
        booking_id: selectedBooking || null,
        storage_path: storagePath,
      });

      if (error) throw error;
      toast.success('Folder created successfully');
      setIsCreateFolderOpen(false);
      setFolderName('');
      setFolderType('general');
      setSelectedBooking('');
      fetchData(currentFolder?.id || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || !user || !currentFolder) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const totalFiles = uploadedFiles.length;
      let uploadedCount = 0;

      for (const file of Array.from(uploadedFiles)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${currentFolder.id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        // Save file record
        const { error: dbError } = await supabase.from('media_files').insert({
          owner_id: user.id,
          folder_id: currentFolder.id,
          file_name: file.name,
          file_url: filePath,
          file_type: file.type,
          file_size: file.size,
        });

        if (dbError) throw dbError;

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      toast.success(`${totalFiles} file(s) uploaded successfully`);
      setIsUploadOpen(false);
      fetchData(currentFolder.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFolder = async (folder: MediaFolder) => {
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;

    setIsDeleting(true);
    try {
      // Delete all files in folder first
      const { data: filesInFolder } = await supabase
        .from('media_files')
        .select('id, file_url')
        .eq('folder_id', folder.id);

      if (filesInFolder) {
        for (const file of filesInFolder) {
          await supabase.storage.from('media').remove([file.file_url]);
          await supabase.from('media_files').delete().eq('id', file.id);
        }
      }

      // Delete folder
      const { error } = await supabase
        .from('media_folders')
        .delete()
        .eq('id', folder.id);

      if (error) throw error;
      toast.success('Folder deleted successfully');
      fetchData(currentFolder?.id || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete folder');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    setIsDeleting(true);
    try {
      // Delete from storage
      await supabase.storage.from('media').remove([selectedFile.file_url]);

      // Delete record
      const { error } = await supabase
        .from('media_files')
        .delete()
        .eq('id', selectedFile.id);

      if (error) throw error;
      toast.success('File deleted successfully');
      setIsPreviewOpen(false);
      setSelectedFile(null);
      fetchData(currentFolder?.id || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl || '';
  };

  const openFilePreview = async (file: MediaFile, index: number) => {
    // Get signed URLs for all files
    const signedFiles = await Promise.all(
      filteredFiles.map(async (f) => {
        const signedUrl = await getSignedUrl(f.file_url);
        return { ...f, file_url: signedUrl };
      })
    );
    setViewerFiles(signedFiles);
    setSelectedFileIndex(index);
    setIsFullscreenOpen(true);
  };

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.startsWith('image/')) return Image;
    if (fileType?.startsWith('video/')) return Video;
    return FileType;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter((f) =>
    f.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folderTypes = [
    { value: 'general', label: 'General' },
    { value: 'raw', label: 'Raw Photos' },
    { value: 'edited', label: 'Edited Photos' },
    { value: 'videos', label: 'Videos' },
    { value: 'reels', label: 'Reels' },
    { value: 'album', label: 'Album Selections' },
  ];

  return (
    <MainLayout title="Media" subtitle="Manage your media files and folders">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className={cn(
            'text-muted-foreground hover:text-foreground transition-colors',
            !currentFolder && 'text-foreground font-medium'
          )}
        >
          Media
        </button>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center gap-2">
            <span className="text-muted-foreground">/</span>
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={cn(
                'text-muted-foreground hover:text-foreground transition-colors',
                index === breadcrumbs.length - 1 && 'text-foreground font-medium'
              )}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {currentFolder && (
          <Button
            onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <Button
          onClick={() => setIsCreateFolderOpen(true)}
          variant="outline"
          className="btn-fade"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          New Folder
        </Button>
        {currentFolder && (
          <Button onClick={() => setIsUploadOpen(true)} className="btn-fade">
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <ShimmerList count={6} />
      ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={currentFolder ? 'No files in this folder' : 'No folders yet'}
          description={
            currentFolder
              ? 'Upload files to get started'
              : 'Create your first folder to organize media'
          }
          action={
            currentFolder
              ? { label: 'Upload Files', onClick: () => setIsUploadOpen(true) }
              : { label: 'Create Folder', onClick: () => setIsCreateFolderOpen(true) }
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {filteredFolders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Folders ({filteredFolders.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="zoho-card p-4 cursor-pointer hover:shadow-zoho-md transition-all group relative"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FolderOpen className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-center truncate w-full">
                        {folder.name}
                      </p>
                      <span className="text-xs text-muted-foreground capitalize">
                        {folder.folder_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {filteredFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Files ({filteredFiles.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredFiles.map((file, index) => {
                  const FileIcon = getFileIcon(file.file_type);
                  const isImage = file.file_type?.startsWith('image/');
                  const isVideo = file.file_type?.startsWith('video/');

                  return (
                    <div
                      key={file.id}
                      className="zoho-card overflow-hidden cursor-pointer hover:shadow-zoho-md transition-all group"
                      onClick={() => openFilePreview(file, index)}
                    >
                      <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                        {isImage ? (
                          <ThumbnailImage filePath={file.file_url} />
                        ) : (
                          <FileIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Video className="h-8 w-8 text-white" />
                          </div>
                        )}
                        {file.is_selected && (
                          <div className="absolute top-2 right-2 bg-success text-success-foreground px-2 py-0.5 rounded text-xs font-medium">
                            Selected
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Maximize2 className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name *</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g., Wedding Photos"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Folder Type</Label>
              <Select value={folderType} onValueChange={setFolderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {folderTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to Booking (Optional)</Label>
              <Select value={selectedBooking || "none"} onValueChange={(v) => setSelectedBooking(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a booking" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.client?.name || 'Unknown'} -{' '}
                      {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="btn-fade">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Folder
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Select images or videos to upload
              </p>
              <Input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                disabled={isSubmitting}
                className="max-w-xs mx-auto"
              />
            </div>
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Viewer */}
      <FullscreenViewer
        open={isFullscreenOpen}
        onOpenChange={setIsFullscreenOpen}
        files={viewerFiles}
        initialIndex={selectedFileIndex}
      />
    </MainLayout>
  );
}

// Thumbnail component to load images with signed URLs
function ThumbnailImage({ filePath }: { filePath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadUrl = async () => {
      const { data } = await supabase.storage
        .from('media')
        .createSignedUrl(filePath, 3600);
      setUrl(data?.signedUrl || null);
    };
    loadUrl();
  }, [filePath]);

  if (!url) {
    return <div className="shimmer h-full w-full" />;
  }

  return (
    <img
      src={url}
      alt=""
      className="w-full h-full object-cover"
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/placeholder.svg';
      }}
    />
  );
}
