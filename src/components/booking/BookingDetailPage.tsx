import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Calendar,
  Camera,
  Video,
  Edit3,
  BookOpen,
  Plus,
  Loader2,
  Check,
  Clock,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

interface BookingTask {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  progress: number | null;
  scheduled_date: string | null;
  notes: string | null;
  assigned_to: string | null;
}

interface BookingDetailPageProps {
  bookingId: string;
  clientName: string;
  eventDate: string;
  eventType: string;
  onClose: () => void;
}

const taskTypes = [
  { value: 'pre_shoot', label: 'Pre-Shoot', icon: Camera },
  { value: 'main_shoot', label: 'Main Shoot', icon: Video },
  { value: 'editing', label: 'Editing', icon: Edit3 },
  { value: 'album_processing', label: 'Album Processing', icon: BookOpen },
  { value: 'delivery', label: 'Delivery', icon: Check },
];

const taskStatuses = [
  { value: 'pending', label: 'Pending', color: 'bg-muted' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-warning' },
  { value: 'completed', label: 'Completed', color: 'bg-success' },
];

export function BookingDetailPage({
  bookingId,
  clientName,
  eventDate,
  eventType,
  onClose,
}: BookingDetailPageProps) {
  const [tasks, setTasks] = useState<BookingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BookingTask | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'pre_shoot',
    scheduled_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchTasks();
  }, [bookingId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_tasks')
        .select('*')
        .eq('booking_id', bookingId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'pre_shoot',
      scheduled_date: '',
      notes: '',
    });
    setSelectedTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const taskData = {
        owner_id: user.id,
        booking_id: bookingId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        task_type: formData.task_type,
        scheduled_date: formData.scheduled_date || null,
        notes: formData.notes.trim() || null,
        status: 'pending',
        progress: 0,
      };

      if (selectedTask) {
        const { error } = await supabase
          .from('booking_tasks')
          .update(taskData)
          .eq('id', selectedTask.id);
        if (error) throw error;
        toast.success('Task updated');
      } else {
        const { error } = await supabase.from('booking_tasks').insert(taskData);
        if (error) throw error;
        toast.success('Task created');
      }

      setIsFormOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTaskProgress = async (taskId: string, progress: number) => {
    try {
      const status = progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'pending';
      
      const { error } = await supabase
        .from('booking_tasks')
        .update({ progress, status })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const progress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0;
      
      const { error } = await supabase
        .from('booking_tasks')
        .update({ status, progress })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from('booking_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task deleted');
      fetchTasks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task');
    }
  };

  const overallProgress = tasks.length > 0
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length)
    : 0;

  const getTaskIcon = (type: string) => {
    const taskType = taskTypes.find((t) => t.value === type);
    return taskType?.icon || Calendar;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{clientName}</h2>
          <p className="text-muted-foreground">
            {eventType} • {format(new Date(eventDate), 'MMMM dd, yyyy')}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Overall Progress */}
      <div className="zoho-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Overall Progress</h3>
          <span className="text-sm text-muted-foreground">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-3" />
      </div>

      {/* Task Sections */}
      <div className="grid gap-4">
        {taskTypes.map((type) => {
          const typeTasks = tasks.filter((t) => t.task_type === type.value);
          const Icon = type.icon;

          return (
            <div key={type.value} className="zoho-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-medium">{type.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({typeTasks.length} tasks)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    resetForm();
                    setFormData((prev) => ({ ...prev, task_type: type.value }));
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {typeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No tasks yet</p>
              ) : (
                <div className="space-y-3">
                  {typeTasks.map((task) => {
                    const statusInfo = taskStatuses.find((s) => s.value === task.status);
                    
                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-secondary/50 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.scheduled_date && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(task.scheduled_date), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Select
                              value={task.status}
                              onValueChange={(v) => updateTaskStatus(task.id, v)}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {taskStatuses.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{task.progress || 0}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={task.progress || 0}
                            onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value))}
                            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                          />
                        </div>

                        {task.notes && (
                          <p className="text-xs text-muted-foreground">{task.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle>
              {selectedTask ? 'Edit Task' : 'Add Task'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Pre-wedding shoot at beach"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.task_type}
                onValueChange={(v) => setFormData({ ...formData, task_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedTask ? 'Update' : 'Add'} Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
