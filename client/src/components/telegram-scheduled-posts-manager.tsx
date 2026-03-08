import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, RefreshCw, Trash, Clock, Image, Plus, Edit, Pause, Play, Calendar, Upload, X, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface TelegramScheduledPost {
  id: string;
  channelId: string;
  title: string;
  messageText: string;
  photoPath: string | null;
  photoUrl: string | null;
  buttons: string | null;
  scheduleTime: string | null;
  timezone: string;
  repeatDaily: boolean;
  daysOfWeek: string;
  periodId: string | null;
  status: 'active' | 'paused' | 'completed';
  lastSentAt: string | null;
  nextRunAt: string | null;
  sentCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface InlineButton {
  text: string;
  url: string;
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sun' },
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
];

const TIMEZONES = [
  'Asia/Colombo',
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Singapore',
];

export function TelegramScheduledPostsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<TelegramScheduledPost | null>(null);
  
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [timezone, setTimezone] = useState('Asia/Colombo');
  const [repeatDaily, setRepeatDaily] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>(['0', '1', '2', '3', '4', '5', '6']);
  const [inlineButtons, setInlineButtons] = useState<InlineButton[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [triggerType, setTriggerType] = useState<'time' | 'period'>('time');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addButton = () => {
    setInlineButtons([...inlineButtons, { text: '', url: '' }]);
  };

  const removeButton = (index: number) => {
    setInlineButtons(inlineButtons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: 'text' | 'url', value: string) => {
    const newButtons = [...inlineButtons];
    newButtons[index][field] = value;
    setInlineButtons(newButtons);
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (PNG, JPEG, or WebP)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        setPhotoUrl(base64);
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Upload Failed',
          description: 'Failed to read the image file',
          variant: 'destructive',
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to process the image',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const clearPhoto = () => {
    setPhotoUrl('');
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const { data: posts = [], isLoading, refetch } = useQuery<TelegramScheduledPost[]>({
    queryKey: ['/api/admin/telegram/scheduled-posts'],
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/telegram/scheduled-posts', data);
    },
    onSuccess: () => {
      toast({
        title: 'Post Created',
        description: 'Scheduled post has been created successfully',
      });
      resetForm();
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram/scheduled-posts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create scheduled post',
        variant: 'destructive',
      });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/admin/telegram/scheduled-posts/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Post Updated',
        description: 'Scheduled post has been updated successfully',
      });
      resetForm();
      setEditingPost(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram/scheduled-posts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update scheduled post',
        variant: 'destructive',
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/telegram/scheduled-posts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Post Deleted',
        description: 'Scheduled post has been deleted',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram/scheduled-posts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete scheduled post',
        variant: 'destructive',
      });
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/admin/telegram/scheduled-posts/${id}/send-now`);
    },
    onSuccess: () => {
      toast({
        title: 'Post Sent',
        description: 'Post has been sent to the Telegram channel',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram/scheduled-posts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send post',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setChannelId('');
    setTitle('');
    setMessageText('');
    setPhotoUrl('');
    setPhotoPreview(null);
    setScheduleTime('12:00');
    setTimezone('Asia/Colombo');
    setRepeatDaily(true);
    setSelectedDays(['0', '1', '2', '3', '4', '5', '6']);
    setInlineButtons([]);
    setPeriodId('');
    setTriggerType('time');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadPostForEdit = (post: TelegramScheduledPost) => {
    setEditingPost(post);
    setChannelId(post.channelId);
    setTitle(post.title);
    setMessageText(post.messageText);
    setPhotoUrl(post.photoUrl || '');
    setPhotoPreview(post.photoUrl || null);
    setScheduleTime(post.scheduleTime ? post.scheduleTime.substring(0, 5) : '12:00');
    setTimezone(post.timezone);
    setRepeatDaily(post.repeatDaily);
    setSelectedDays(post.daysOfWeek.split(',').filter(d => d));
    setPeriodId(post.periodId || '');
    setTriggerType(post.periodId ? 'period' : 'time');
    try {
      setInlineButtons(post.buttons ? JSON.parse(post.buttons) : []);
    } catch {
      setInlineButtons([]);
    }
  };

  const handleSubmit = () => {
    if (!channelId.trim() || !title.trim() || !messageText.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (triggerType === 'time' && !scheduleTime) {
      toast({
        title: 'Error',
        description: 'Please specify a schedule time',
        variant: 'destructive',
      });
      return;
    }

    const validButtons = inlineButtons.filter(btn => btn.text.trim() && btn.url.trim());
    
    // Crucial: ensure photoUrl is null if empty string
    const finalPhotoUrl = photoUrl.trim() || null;
    
    const data = {
      channelId: channelId.trim(),
      title: title.trim(),
      messageText: messageText.trim(),
      photoUrl: finalPhotoUrl,
      buttons: validButtons.length > 0 ? JSON.stringify(validButtons) : null,
      scheduleTime: triggerType === 'time' ? scheduleTime : null,
      timezone,
      repeatDaily: triggerType === 'time' ? repeatDaily : false,
      daysOfWeek: triggerType === 'time' ? selectedDays.join(',') : '0,1,2,3,4,5,6',
      periodId: triggerType === 'period' ? periodId.trim() : null,
      status: 'active' as const,
    };

    if (editingPost) {
      updatePostMutation.mutate({ id: editingPost.id, data });
    } else {
      createPostMutation.mutate(data);
    }
  };

  const togglePostStatus = (post: TelegramScheduledPost) => {
    const newStatus = post.status === 'active' ? 'paused' : 'active';
    updatePostMutation.mutate({
      id: post.id,
      data: { status: newStatus }
    });
  };

  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const formatDaysOfWeek = (daysStr: string) => {
    const days = (daysStr || '').split(',').filter(d => d);
    if (days.length === 7) return 'Every day';
    if (days.length === 0) return 'No days';
    return days.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label || d).join(', ');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/20">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/20">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/20">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/20">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card className="admin-card admin-glow border-blue-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Telegram Scheduled Posts
              </CardTitle>
              <CardDescription className="text-blue-300">
                Schedule automatic posts to your Telegram channel
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                data-testid="button-refresh-scheduled-posts"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen || !!editingPost} onOpenChange={(open) => {
                if (!open) {
                  setIsCreateDialogOpen(false);
                  setEditingPost(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-create-scheduled-post"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingPost ? 'Edit Scheduled Post' : 'Create Scheduled Post'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {editingPost ? 'Update the scheduled post settings' : 'Schedule a new post to your Telegram channel'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Channel ID *</Label>
                        <Input
                          value={channelId}
                          onChange={(e) => setChannelId(e.target.value)}
                          placeholder="@channelname or -100xxxxxxxxxx"
                          className="bg-slate-800 border-slate-600 text-white"
                          data-testid="input-channel-id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">Title (for reference) *</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Daily promo post"
                          className="bg-slate-800 border-slate-600 text-white"
                          data-testid="input-post-title"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-200">Message Text *</Label>
                      <Textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Enter the message to send (supports HTML formatting)"
                        className="bg-slate-800 border-slate-600 text-white min-h-[100px]"
                        data-testid="textarea-message-text"
                      />
                      <p className="text-xs text-slate-500">Supports HTML: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;a href="url"&gt;link&lt;/a&gt;</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-slate-200 flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Photo (optional)
                      </Label>
                      
                      {photoPreview ? (
                        <div className="relative">
                          <img 
                            src={photoPreview} 
                            alt="Preview" 
                            className="w-full max-h-48 object-contain rounded-lg border border-slate-600"
                            data-testid="img-photo-preview"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={clearPhoto}
                            className="absolute top-2 right-2"
                            data-testid="button-remove-photo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-colors"
                          data-testid="dropzone-photo"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(file);
                            }}
                            data-testid="input-file-photo"
                          />
                          {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
                              <p className="text-slate-400">Uploading...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-slate-400" />
                              <p className="text-slate-300 font-medium">Click to upload or drag & drop</p>
                              <p className="text-slate-500 text-sm">PNG, JPEG, or WebP (max 5MB)</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-center text-slate-500 text-sm">- OR -</div>
                      
                      <Input
                        value={photoPreview && photoPreview.startsWith('data:') ? '' : photoUrl}
                        onChange={(e) => {
                          setPhotoUrl(e.target.value);
                          setPhotoPreview(e.target.value || null);
                        }}
                        placeholder="Paste image URL: https://example.com/image.jpg"
                        className="bg-slate-800 border-slate-600 text-white"
                        disabled={!!photoPreview && photoPreview.startsWith('data:')}
                        data-testid="input-photo-url"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-200 flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          Inline Buttons (optional)
                        </Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={addButton}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          data-testid="button-add-inline-button"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Button
                        </Button>
                      </div>
                      {inlineButtons.length > 0 && (
                        <div className="space-y-2">
                          {inlineButtons.map((btn, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <Input
                                value={btn.text}
                                onChange={(e) => updateButton(index, 'text', e.target.value)}
                                placeholder="Button text"
                                className="bg-slate-800 border-slate-600 text-white flex-1"
                                data-testid={`input-button-text-${index}`}
                              />
                              <Input
                                value={btn.url}
                                onChange={(e) => updateButton(index, 'url', e.target.value)}
                                placeholder="https://example.com"
                                className="bg-slate-800 border-slate-600 text-white flex-1"
                                data-testid={`input-button-url-${index}`}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removeButton(index)}
                                data-testid={`button-remove-inline-button-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <p className="text-xs text-slate-500">Each button will appear as a clickable link in the Telegram message</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Trigger Type</Label>
                        <Select value={triggerType} onValueChange={(val) => setTriggerType(val as 'time' | 'period')}>
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-trigger-type">
                            <SelectValue placeholder="Select trigger type" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            <SelectItem value="time">Schedule by Time</SelectItem>
                            <SelectItem value="period">Schedule by Period ID</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-slate-200">Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-timezone">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-60">
                            {TIMEZONES.map(tz => (
                              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {triggerType === 'time' ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-slate-200">Schedule Time (HH:MM) *</Label>
                          <Input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white"
                            data-testid="input-schedule-time"
                          />
                          <p className="text-xs text-slate-500">Format: HH:MM (e.g., 12:30)</p>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                          <div className="space-y-0.5">
                            <Label className="text-slate-200 cursor-pointer">Repeat Daily</Label>
                            <p className="text-xs text-slate-500">Send this post every day at the scheduled time</p>
                          </div>
                          <Switch
                            checked={repeatDaily}
                            onCheckedChange={setRepeatDaily}
                            data-testid="switch-repeat-daily"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-slate-200 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Days of Week
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <Button
                                key={day.value}
                                type="button"
                                size="sm"
                                variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                                onClick={() => toggleDaySelection(day.value)}
                                className={selectedDays.includes(day.value) 
                                  ? 'bg-blue-600 hover:bg-blue-700' 
                                  : 'border-slate-600 text-slate-400 hover:bg-slate-800'}
                                data-testid={`button-day-${day.label}`}
                              >
                                {day.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-slate-200">Period ID *</Label>
                        <Input
                          value={periodId}
                          onChange={(e) => setPeriodId(e.target.value)}
                          placeholder="e.g. 202503200100"
                          className="bg-slate-800 border-slate-600 text-white"
                          data-testid="input-period-id"
                        />
                        <p className="text-xs text-slate-500">Post will send when this specific period starts. Leave empty to trigger on ANY period start.</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setEditingPost(null);
                          resetForm();
                        }}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        data-testid="button-cancel-post"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={createPostMutation.isPending || updatePostMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-save-post"
                      >
                        {(createPostMutation.isPending || updatePostMutation.isPending) ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        {editingPost ? 'Update Post' : 'Create Post'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No scheduled posts yet. Create one to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-300">Title</TableHead>
                    <TableHead className="text-slate-300">Channel</TableHead>
                    <TableHead className="text-slate-300">Schedule</TableHead>
                    <TableHead className="text-slate-300">Days</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Sent</TableHead>
                    <TableHead className="text-slate-300">Last Sent</TableHead>
                    <TableHead className="text-right text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} className="border-slate-700 hover:bg-slate-800/50" data-testid={`row-post-${post.id}`}>
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center gap-2">
                          {(post.photoPath || post.photoUrl) && (
                            <Image className="h-4 w-4 text-blue-400" />
                          )}
                          {post.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {post.channelId}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {post.periodId ? (
                          <div className="flex items-center gap-1 text-blue-400">
                            <Calendar className="h-3 w-3" />
                            Period: {post.periodId}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.scheduleTime}
                          </div>
                        )}
                        <div className="text-xs text-slate-500">{post.timezone}</div>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {post.periodId ? 'Any Day' : formatDaysOfWeek(post.daysOfWeek)}
                      </TableCell>
                      <TableCell>{getStatusBadge(post.status)}</TableCell>
                      <TableCell className="text-slate-300">{post.sentCount}</TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDate(post.lastSentAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePostStatus(post)}
                            className="text-slate-300 hover:text-white hover:bg-slate-700"
                            title={post.status === 'active' ? 'Pause' : 'Activate'}
                            data-testid={`button-toggle-post-${post.id}`}
                          >
                            {post.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadPostForEdit(post)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            title="Edit"
                            data-testid={`button-edit-post-${post.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendNowMutation.mutate(post.id)}
                            disabled={sendNowMutation.isPending}
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            title="Send Now"
                            data-testid={`button-send-now-${post.id}`}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this scheduled post?')) {
                                deletePostMutation.mutate(post.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete"
                            data-testid={`button-delete-post-${post.id}`}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
