import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Zap } from 'lucide-react';
import type { QuickReply } from '@shared/schema';

export default function QuickReplyManager() {
  const [open, setOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [shortcut, setShortcut] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const { data: quickReplies = [], isLoading } = useQuery<QuickReply[]>({
    queryKey: ['/api/admin/quick-replies'],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { shortcut: string; message: string }) => {
      return await apiRequest('POST', '/api/admin/quick-replies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quick-replies'] });
      resetForm();
      toast({
        title: 'Success',
        description: 'Quick reply created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quick reply',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { shortcut: string; message: string } }) => {
      return await apiRequest('PATCH', `/api/admin/quick-replies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quick-replies'] });
      resetForm();
      toast({
        title: 'Success',
        description: 'Quick reply updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update quick reply',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/quick-replies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quick-replies'] });
      toast({
        title: 'Success',
        description: 'Quick reply deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quick reply',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setShortcut('');
    setMessage('');
    setEditingReply(null);
  };

  const handleEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setShortcut(reply.shortcut);
    setMessage(reply.message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shortcut.trim() || !message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Shortcut and message are required',
        variant: 'destructive',
      });
      return;
    }

    if (editingReply) {
      updateMutation.mutate({ id: editingReply.id, data: { shortcut, message } });
    } else {
      createMutation.mutate({ shortcut, message });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this quick reply?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/30 hover:bg-purple-500/30"
          data-testid="button-manage-quick-replies"
        >
          <Zap className="w-4 h-4 mr-2" />
          Manage Quick Replies
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Quick Reply Manager
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300">
              {editingReply ? 'Edit Quick Reply' : 'Add New Quick Reply'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Shortcut</label>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="e.g., hello, thanks, info"
                  className="bg-slate-800 border-slate-600 text-white"
                  maxLength={50}
                  data-testid="input-shortcut"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter the full reply message..."
                  className="bg-slate-800 border-slate-600 text-white h-32"
                  maxLength={1000}
                  data-testid="textarea-message"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                  data-testid="button-save-quick-reply"
                >
                  {editingReply ? 'Update' : 'Add'} Quick Reply
                </Button>
                {editingReply && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-slate-600 text-slate-300"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Saved Quick Replies</h3>
            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : quickReplies.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No quick replies yet</p>
                  <p className="text-xs mt-1">Add your first quick reply to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quickReplies.map((reply) => (
                    <Card
                      key={reply.id}
                      className="bg-slate-800 border-slate-700"
                      data-testid={`quick-reply-${reply.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                {reply.shortcut}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 line-clamp-2">
                              {reply.message}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reply)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              data-testid={`button-edit-${reply.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reply.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                              data-testid={`button-delete-${reply.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
