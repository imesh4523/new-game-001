import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User, Clock, X, Image as ImageIcon, Copy, Check, Zap, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SiTelegram } from 'react-icons/si';
import type { SupportChatSession, SupportChatMessage, QuickReply } from '@shared/schema';
import QuickReplyManager from './quick-reply-manager';

interface SessionWithMessages extends SupportChatSession {
  messageCount?: number;
}

interface SessionUser {
  id: string;
  publicId: string | null;
  email: string;
  profilePhoto: string | null;
  vipLevel: string;
  createdAt: Date;
}

export default function AdminChatInterface() {
  const [selectedSession, setSelectedSession] = useState<SessionWithMessages | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [quickReplyPopoverOpen, setQuickReplyPopoverOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for admin chat interface');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Listen for new sessions
        if (data.type === 'support-chat:new-session') {
          // Refresh sessions list to show new chat
          queryClient.invalidateQueries({ queryKey: ['/api/admin/support/chat/sessions'] });
        }
        
        // Listen for new messages
        if (data.type === 'support-chat:new-message') {
          // Refresh sessions list to update message counts
          queryClient.invalidateQueries({ queryKey: ['/api/admin/support/chat/sessions'] });
          
          // If viewing this session, refresh messages
          if (selectedSession && data.sessionId === selectedSession.id) {
            queryClient.invalidateQueries({ 
              queryKey: ['/api/support/chat/sessions', selectedSession.id, 'messages'] 
            });
          }
        }
        
        // Listen for session closures
        if (data.type === 'support-chat:session-closed') {
          // Refresh sessions list to remove closed session
          queryClient.invalidateQueries({ queryKey: ['/api/admin/support/chat/sessions'] });
          
          // If viewing the closed session, clear selection
          if (selectedSession && data.sessionId === selectedSession.id) {
            setSelectedSession(null);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [selectedSession]);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<SessionWithMessages[]>({
    queryKey: ['/api/admin/support/chat/sessions'],
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<SupportChatMessage[]>({
    queryKey: ['/api/support/chat/sessions', selectedSession?.id, 'messages'],
    enabled: !!selectedSession,
    refetchInterval: 3000,
  });

  const { data: quickReplies = [] } = useQuery<QuickReply[]>({
    queryKey: ['/api/admin/quick-replies'],
    enabled: quickReplyPopoverOpen,
  });

  const { data: sessionUser } = useQuery<SessionUser>({
    queryKey: ['/api/admin/support/chat/sessions', selectedSession?.id, 'user'],
    enabled: !!selectedSession?.id && !!selectedSession?.userId,
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ body, metadata }: { body: string; metadata?: any }) => {
      if (!selectedSession) throw new Error('No session selected');
      
      const response = await fetch(`/api/support/chat/sessions/${selectedSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'support',
          body,
          metadata
        })
      });
      
      if (!response.ok) throw new Error('Failed to send reply');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/chat/sessions', selectedSession?.id, 'messages'] });
      setReplyText('');
      setSelectedImage(null);
      toast({
        title: "Reply sent",
        description: "Your message has been sent to the user",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive"
      });
    }
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/support/chat/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' })
      });
      
      if (!response.ok) throw new Error('Failed to close session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/chat/sessions'] });
      setSelectedSession(null);
      toast({
        title: "Session closed",
        description: "Chat session has been closed",
      });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be under 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        try {
          const response = await apiRequest('POST', '/api/support/chat/upload-image', {
            image: base64
          });
          const data = await response.json();
          
          if (data.success && data.url) {
            setSelectedImage(data.url);
            setIsUploadingImage(false);
          } else {
            throw new Error('Upload failed');
          }
        } catch (uploadError) {
          console.error('Image validation error:', uploadError);
          toast({
            title: "Error",
            description: "Failed to validate image",
            variant: "destructive"
          });
          setIsUploadingImage(false);
        }
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive"
        });
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      setIsUploadingImage(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendReply = () => {
    if ((!replyText.trim() && !selectedImage) || !selectedSession) return;
    
    const metadata = selectedImage ? { image: selectedImage } : undefined;
    const body = replyText.trim() || (selectedImage ? 'Image' : '');
    
    sendReplyMutation.mutate({ body, metadata });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleQuickReplySelect = (message: string) => {
    setReplyText(replyText ? `${replyText} ${message}` : message);
    setQuickReplyPopoverOpen(false);
  };

  const handleDownloadProfilePhoto = () => {
    if (!sessionUser?.profilePhoto) {
      toast({
        title: "No photo",
        description: "This user doesn't have a profile photo",
        variant: "destructive"
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = sessionUser.profilePhoto;
      link.download = `user_${sessionUser.publicId || sessionUser.id}_profile.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Downloaded!",
        description: "Profile photo has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download profile photo",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Live Chat Support</h2>
        <QuickReplyManager />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <Card className="lg:col-span-1 bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <SiTelegram className="w-5 h-5" />
              Active Chats
            </CardTitle>
            <CardDescription>Support chat sessions</CardDescription>
          </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px] pr-4">
            {loadingSessions ? (
              <div className="text-center py-8 text-slate-400">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <SiTelegram className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active chats</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session: SessionWithMessages) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedSession?.id === session.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-200'
                    }`}
                    data-testid={`session-${session.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{session.userDisplayName}</span>
                      </div>
                      <Badge variant={session.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(session.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 bg-slate-900/50 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          {selectedSession ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-slate-600">
                  <AvatarImage src={sessionUser?.profilePhoto || undefined} alt={selectedSession.userDisplayName} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800">
                    <User className="w-6 h-6 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {selectedSession.userDisplayName}
                    {sessionUser?.publicId && (
                      <span className="text-sm font-normal text-slate-400">#{sessionUser.publicId}</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <CardDescription>Session: {selectedSession.sessionToken.slice(0, 8)}...</CardDescription>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(selectedSession.sessionToken, 'Session ID')}
                      className="h-6 px-2 text-slate-400 hover:text-white"
                      data-testid="button-copy-session"
                    >
                      {copiedText === selectedSession.sessionToken ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                    {sessionUser?.profilePhoto && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadProfilePhoto}
                        className="h-6 px-2 text-slate-400 hover:text-white"
                        data-testid="button-download-photo"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeSessionMutation.mutate(selectedSession.id)}
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                data-testid="button-close-session"
              >
                <X className="w-4 h-4 mr-1" />
                Close Chat
              </Button>
            </div>
          ) : (
            <CardTitle className="text-slate-400">Select a chat session</CardTitle>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {selectedSession ? (
            <div className="flex flex-col h-[450px]">
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="text-center py-8 text-slate-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No messages yet</div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg: SupportChatMessage) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.author === 'support' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="flex items-start gap-2 max-w-[80%]">
                          {msg.author !== 'support' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 mt-1 border border-slate-500/30">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start gap-2 group">
                              <div
                                className={`flex-1 px-4 py-2 rounded-2xl ${
                                  msg.author === 'support'
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                                    : msg.author === 'system'
                                    ? 'bg-slate-700 text-slate-200 rounded-bl-sm'
                                    : 'bg-slate-800 text-white rounded-bl-sm'
                                }`}
                              >
                                {(msg.metadata as { image?: string })?.image && (
                                  <img 
                                    src={(msg.metadata as { image?: string }).image} 
                                    alt="Chat image" 
                                    className="max-w-full rounded-lg mb-2 max-h-64 object-contain"
                                    data-testid={`image-message-${msg.id}`}
                                  />
                                )}
                                {msg.body && msg.body !== 'Image' && (
                                  <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                                )}
                              </div>
                              {msg.author === 'user' && msg.body && msg.body !== 'Image' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyToClipboard(msg.body, 'Message')}
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-slate-700"
                                  data-testid={`button-copy-message-${msg.id}`}
                                >
                                  {copiedText === msg.body ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-slate-400" />
                                  )}
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 px-1">
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                          {msg.author === 'support' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                              <SiTelegram className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-slate-700 bg-slate-900/70">
                {selectedImage && (
                  <div className="mb-3 relative inline-block">
                    <img 
                      src={selectedImage} 
                      alt="Preview" 
                      className="max-h-32 rounded-lg border border-slate-600"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={() => setSelectedImage(null)}
                      data-testid="button-remove-image"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage || sendReplyMutation.isPending}
                    className="bg-slate-800/60 border-slate-600 text-white hover:bg-slate-700"
                    data-testid="button-upload-image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Popover open={quickReplyPopoverOpen} onOpenChange={setQuickReplyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="bg-slate-800/60 border-slate-600 text-purple-400 hover:bg-slate-700 hover:text-purple-300"
                        data-testid="button-quick-reply-selector"
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-slate-900 border-slate-700 p-2">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400 px-2 py-1">Quick Replies</p>
                        {quickReplies.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-sm">
                            No quick replies yet
                          </div>
                        ) : (
                          <ScrollArea className="h-64 pr-2">
                            <div className="space-y-1">
                              {quickReplies.map((reply) => (
                                <button
                                  key={reply.id}
                                  onClick={() => handleQuickReplySelect(reply.message)}
                                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors"
                                  data-testid={`quick-reply-option-${reply.id}`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                      {reply.shortcut}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-300 line-clamp-2">
                                    {reply.message}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your reply..."
                    className="flex-1 bg-slate-800/60 border-slate-600 text-white placeholder:text-slate-400"
                    disabled={sendReplyMutation.isPending}
                    data-testid="input-admin-reply"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={(!replyText.trim() && !selectedImage) || sendReplyMutation.isPending}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    data-testid="button-send-reply"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[450px] flex items-center justify-center text-slate-400">
              <div className="text-center">
                <SiTelegram className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a chat session to view messages</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
