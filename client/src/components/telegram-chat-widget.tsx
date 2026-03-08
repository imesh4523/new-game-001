import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SiTelegram } from 'react-icons/si';
import { nanoid } from 'nanoid';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface Message {
  id: string;
  author: 'user' | 'support' | 'system';
  body: string;
  createdAt: Date;
  metadata?: { image?: string };
}

interface ChatSession {
  id: string;
  sessionToken: string;
  status: 'open' | 'active' | 'closed';
}

interface Position {
  x: number;
  y: number;
}

export default function TelegramChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { data: liveChatSettings } = useQuery<{ chatIconVisible: boolean; telegramIntegrationEnabled: boolean }>({
    queryKey: ['/api/live-chat/settings'],
    refetchInterval: 30000
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('chat_icon_position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 100, y: window.innerHeight - 100 };
  });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState<Position>({ x: 0, y: 0 });
  const dragRef = useRef<HTMLButtonElement>(null);
  const hasMovedRef = useRef(false);

  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [windowPosition, setWindowPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('chat_window_position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 420, y: window.innerHeight - 640 };
  });
  const [windowDragOffset, setWindowDragOffset] = useState<Position>({ x: 0, y: 0 });
  const windowDragRef = useRef<HTMLDivElement>(null);
  const windowHasMovedRef = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for chat widget');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'support-chat:new-message' && data.message && session) {
          if (data.sessionId === session.id && data.message.author === 'support') {
            setMessages(prev => [...prev, {
              id: data.message.id,
              author: data.message.author,
              body: data.message.body,
              createdAt: new Date(data.message.createdAt),
              metadata: data.message.metadata
            }]);
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
  }, [session]);

  // Load and validate saved session from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem('support_chat_session');
    const savedName = localStorage.getItem('support_chat_name');
    
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        
        // Validate session exists and is not closed on backend before using it
        fetch(`/api/support/chat/sessions/${parsed.id}`)
          .then(async (res) => {
            if (res.ok) {
              const sessionData = await res.json();
              
              // Check if session is closed - if so, clear and start fresh
              if (sessionData.status === 'closed') {
                console.log('Session is closed, clearing localStorage and starting fresh');
                localStorage.removeItem('support_chat_session');
                localStorage.removeItem('support_chat_name');
                setSession(null);
                setIsNameSet(false);
                setMessages([]);
                return;
              }
              
              // Session is valid and open/active
              setSession(parsed);
              loadMessages(parsed.id);
              if (savedName) {
                setUserName(savedName);
                setIsNameSet(true);
              }
            } else {
              // Session invalid - clear everything and start fresh
              console.log('Cached session invalid, clearing localStorage');
              localStorage.removeItem('support_chat_session');
              localStorage.removeItem('support_chat_name');
              setSession(null);
              setIsNameSet(false);
            }
          })
          .catch((error) => {
            console.error('Failed to validate session:', error);
            // On error, clear stale data
            localStorage.removeItem('support_chat_session');
            localStorage.removeItem('support_chat_name');
            setSession(null);
            setIsNameSet(false);
          });
      } catch (e) {
        console.error('Failed to parse saved session:', e);
        localStorage.removeItem('support_chat_session');
        localStorage.removeItem('support_chat_name');
      }
    } else if (savedName) {
      setUserName(savedName);
    }
  }, []);

  // Dragging functionality with click/drag distinction (Mouse and Touch support)
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setDragStartPos({
        x: e.clientX,
        y: e.clientY
      });
      hasMovedRef.current = false;
      setIsDragging(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (dragRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = dragRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
      setDragStartPos({
        x: touch.clientX,
        y: touch.clientY
      });
      hasMovedRef.current = false;
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const DRAG_THRESHOLD = 5;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = Math.abs(e.clientX - dragStartPos.x);
        const deltaY = Math.abs(e.clientY - dragStartPos.y);
        
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          hasMovedRef.current = true;
        }
        
        if (hasMovedRef.current) {
          e.preventDefault();
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;
          
          const maxX = window.innerWidth - 80;
          const maxY = window.innerHeight - 80;
          
          const boundedX = Math.max(0, Math.min(newX, maxX));
          const boundedY = Math.max(0, Math.min(newY, maxY));
          
          setPosition({ x: boundedX, y: boundedY });
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - dragStartPos.x);
        const deltaY = Math.abs(touch.clientY - dragStartPos.y);
        
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          hasMovedRef.current = true;
        }
        
        if (hasMovedRef.current) {
          const newX = touch.clientX - dragOffset.x;
          const newY = touch.clientY - dragOffset.y;
          
          const maxX = window.innerWidth - 80;
          const maxY = window.innerHeight - 80;
          
          const boundedX = Math.max(0, Math.min(newX, maxX));
          const boundedY = Math.max(0, Math.min(newY, maxY));
          
          setPosition({ x: boundedX, y: boundedY });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        
        if (hasMovedRef.current) {
          localStorage.setItem('chat_icon_position', JSON.stringify(position));
          e.preventDefault();
          e.stopPropagation();
        } else {
          setIsOpen(true);
        }
        
        hasMovedRef.current = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDragging) {
        setIsDragging(false);
        
        if (hasMovedRef.current) {
          localStorage.setItem('chat_icon_position', JSON.stringify(position));
          e.preventDefault();
          e.stopPropagation();
        } else {
          setIsOpen(true);
        }
        
        hasMovedRef.current = false;
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, dragStartPos, position]);

  // Chat window dragging handlers
  const handleWindowMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (windowDragRef.current && e.target === windowDragRef.current) {
      e.preventDefault();
      const rect = windowDragRef.current.getBoundingClientRect();
      setWindowDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      windowHasMovedRef.current = false;
      setIsWindowDragging(true);
    }
  };

  const handleWindowTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (windowDragRef.current && e.target === windowDragRef.current && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = windowDragRef.current.getBoundingClientRect();
      setWindowDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
      windowHasMovedRef.current = false;
      setIsWindowDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isWindowDragging) {
        e.preventDefault();
        windowHasMovedRef.current = true;
        
        const newX = e.clientX - windowDragOffset.x;
        const newY = e.clientY - windowDragOffset.y;
        
        const maxX = window.innerWidth - 380;
        const maxY = window.innerHeight - 600;
        
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        
        setWindowPosition({ x: boundedX, y: boundedY });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isWindowDragging && e.touches.length === 1) {
        e.preventDefault();
        windowHasMovedRef.current = true;
        const touch = e.touches[0];
        
        const newX = touch.clientX - windowDragOffset.x;
        const newY = touch.clientY - windowDragOffset.y;
        
        const maxX = window.innerWidth - 380;
        const maxY = window.innerHeight - 600;
        
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        
        setWindowPosition({ x: boundedX, y: boundedY });
      }
    };

    const handleMouseUp = () => {
      if (isWindowDragging) {
        setIsWindowDragging(false);
        if (windowHasMovedRef.current) {
          localStorage.setItem('chat_window_position', JSON.stringify(windowPosition));
        }
        windowHasMovedRef.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (isWindowDragging) {
        setIsWindowDragging(false);
        if (windowHasMovedRef.current) {
          localStorage.setItem('chat_window_position', JSON.stringify(windowPosition));
        }
        windowHasMovedRef.current = false;
      }
    };

    if (isWindowDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isWindowDragging, windowDragOffset, windowPosition]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/support/chat/sessions/${sessionId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          author: msg.author,
          body: msg.body,
          createdAt: new Date(msg.createdAt),
          metadata: msg.metadata
        })));
      } else if (response.status === 404 || response.status === 401) {
        // Session doesn't exist - clear cached data
        console.log('Session not found, clearing localStorage');
        localStorage.removeItem('support_chat_session');
        localStorage.removeItem('support_chat_name');
        setSession(null);
        setIsNameSet(false);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSetName = async () => {
    if (!userName.trim()) return;
    
    console.log('🚀 [Chat] handleSetName called with userName:', userName);
    setIsNameSet(true);
    localStorage.setItem('support_chat_name', userName);
    
    try {
      const sessionToken = nanoid(32);
      console.log('📝 [Chat] Creating session with token:', sessionToken);
      
      const response = await apiRequest('POST', '/api/support/chat/sessions', {
        sessionToken,
        userDisplayName: userName,
        status: 'open'
      });

      console.log('✅ [Chat] Session API response received, status:', response.status);
      const newSession = await response.json();
      console.log('✅ [Chat] Session created successfully:', newSession.id);
      
      setSession(newSession);
      localStorage.setItem('support_chat_session', JSON.stringify(newSession));
      
      const welcomeMessage: Message = {
        id: nanoid(),
        author: 'system',
        body: `Hello ${userName}! How can we help you today?`,
        createdAt: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('❌ [Chat] Error creating session:', error);
      console.error('❌ [Chat] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      setIsNameSet(false);
      setSession(null);
      setMessages([]);
      localStorage.removeItem('support_chat_session');
      toast({
        title: "Error",
        description: "Failed to start chat session. Please try again.",
        variant: "destructive"
      });
    }
  };

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

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isSending) {
      console.log('Cannot send: no content or already sending');
      return;
    }

    if (!session) {
      console.error('No session available');
      toast({
        title: "Error",
        description: "Chat session not initialized. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    const messageText = inputText.trim() || (selectedImage ? 'Image' : '');
    const metadata = selectedImage ? { image: selectedImage } : undefined;
    
    const userMessage: Message = {
      id: nanoid(),
      author: 'user',
      body: messageText,
      createdAt: new Date(),
      metadata
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsSending(true);

    try {
      console.log('Sending message to session:', session.id);
      const response = await apiRequest('POST', `/api/support/chat/sessions/${session.id}/messages`, {
        author: 'user',
        body: messageText,
        metadata
      });
      const result = await response.json();
      console.log('Message sent successfully:', result);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a session error (404/401)
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Not authenticated'))) {
        // Clear invalid session and reset UI
        localStorage.removeItem('support_chat_session');
        localStorage.removeItem('support_chat_name');
        setSession(null);
        setIsNameSet(false);
        setMessages([]);
        toast({
          title: "Session Expired",
          description: "Your chat session has expired. Please start a new chat.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
      
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isNameSet) {
        handleSendMessage();
      } else {
        handleSetName();
      }
    }
  };

  if (liveChatSettings?.chatIconVisible === false) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button - Draggable */}
      {!isOpen && (
        <button
          ref={dragRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="fixed z-50 p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-2xl hover:shadow-blue-500/50 group select-none"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.3)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            willChange: isDragging ? 'transform' : 'auto'
          }}
          data-testid="button-open-chat"
        >
          <div className="relative">
            <SiTelegram className="w-7 h-7" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed z-50 w-[380px] h-[600px] rounded-2xl flex flex-col overflow-hidden border border-white/20 select-none"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${windowPosition.x}px, ${windowPosition.y}px)`,
            transition: isWindowDragging ? 'none' : 'transform 0.15s ease-out',
            willChange: isWindowDragging ? 'transform' : 'auto',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          data-testid="chat-window"
        >
          {/* Header - Draggable */}
          <div 
            ref={windowDragRef}
            onMouseDown={handleWindowMouseDown}
            onTouchStart={handleWindowTouchStart}
            className="bg-gradient-to-r from-indigo-500/80 to-purple-600/80 px-4 py-3 flex items-center justify-between text-white backdrop-blur-sm border-b border-white/10"
            style={{
              cursor: isWindowDragging ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <SiTelegram className="w-8 h-8" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h3 className="font-semibold text-base">Live Support</h3>
                <p className="text-xs text-blue-100">We typically reply instantly</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
              data-testid="button-close-chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
            {!isNameSet ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <SiTelegram className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Welcome to Support</h3>
                <p className="text-sm text-slate-300 text-center px-6">
                  Please enter your name to start chatting with our support team
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[80%]">
                      {message.author !== 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-purple-500/50">
                          <SiTelegram className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div>
                        <div
                          className={`px-4 py-2 rounded-2xl backdrop-blur-md border ${
                            message.author === 'user'
                              ? 'bg-gradient-to-br from-indigo-500/90 to-purple-600/90 text-white rounded-br-sm border-indigo-400/30 shadow-lg shadow-purple-500/30'
                              : message.author === 'system'
                              ? 'bg-slate-700/60 text-slate-200 rounded-bl-sm border-slate-600/30 shadow-md'
                              : 'bg-slate-800/70 text-white rounded-bl-sm border-slate-600/30 shadow-md'
                          }`}
                        >
                          {message.metadata?.image && (
                            <img 
                              src={message.metadata.image} 
                              alt="Chat image" 
                              className="max-w-full rounded-lg mb-2 max-h-64 object-contain"
                              data-testid={`image-message-${message.id}`}
                            />
                          )}
                          {message.body && message.body !== 'Image' && (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 px-1">
                          {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {message.author === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 mt-1 border border-slate-500/30 shadow-md">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10" style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            {!isNameSet ? (
              <div className="space-y-2">
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your name..."
                  className="w-full bg-slate-800/60 border-slate-600/40 text-white placeholder:text-slate-400 backdrop-blur-sm"
                  data-testid="input-name"
                />
                <Button
                  onClick={handleSetName}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-purple-500/40"
                  disabled={!userName.trim()}
                  data-testid="button-start-chat"
                >
                  Start Chat
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedImage && (
                  <div className="relative inline-block">
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
                    disabled={isUploadingImage || isSending}
                    className="bg-slate-800/60 border-slate-600/40 text-white hover:bg-slate-700"
                    data-testid="button-upload-image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-800/60 border-slate-600/40 text-white placeholder:text-slate-400 backdrop-blur-sm"
                    disabled={isSending}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!inputText.trim() && !selectedImage) || isSending}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-4 shadow-lg shadow-purple-500/40"
                    data-testid="button-send-message"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
