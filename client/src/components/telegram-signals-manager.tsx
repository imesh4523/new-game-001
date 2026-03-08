import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Send, RefreshCw, Trash, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TelegramSignal {
  id: string;
  gameId: string;
  duration: number;
  colour: string;
  messageId: number | null;
  chatId: string;
  status: string;
  result: string | null;
  sentAt: string | null;
  createdAt: string;
}

export function TelegramSignalsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [gameId, setGameId] = useState('');
  const [duration, setDuration] = useState('3');
  const [colour, setColour] = useState('green');

  // Fetch signals
  const { data: signals = [], isLoading, refetch } = useQuery<TelegramSignal[]>({
    queryKey: ['/api/admin/telegram-signals'],
  });

  // Send signal mutation
  const sendSignalMutation = useMutation({
    mutationFn: async (data: { gameId: string; duration: number; colour: string }) => {
      return await apiRequest('POST', '/api/admin/telegram-signals/send', data);
    },
    onSuccess: () => {
      toast({
        title: '✅ Signal Sent',
        description: 'Telegram signal has been sent successfully',
      });
      setGameId('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram-signals'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error',
        description: error.message || 'Failed to send telegram signal',
        variant: 'destructive',
      });
    },
  });

  // Delete signal mutation
  const deleteSignalMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/telegram-signals/${id}`);
    },
    onSuccess: () => {
      toast({
        title: '✅ Deleted',
        description: 'Signal has been deleted',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram-signals'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error',
        description: error.message || 'Failed to delete signal',
        variant: 'destructive',
      });
    },
  });

  const handleSendSignal = () => {
    if (!gameId.trim()) {
      toast({
        title: '❌ Error',
        description: 'Please enter a game/period ID',
        variant: 'destructive',
      });
      return;
    }

    sendSignalMutation.mutate({
      gameId: gameId.trim(),
      duration: parseInt(duration),
      colour,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/20">Sent</Badge>;
      case 'updated':
        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/20">Updated</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/20">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/20">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/20">Pending</Badge>;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return <span className="text-gray-400">-</span>;
    
    if (result === 'WIN') {
      return <Badge className="bg-green-500/20 text-green-300 border-green-500/20 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" /> WIN
      </Badge>;
    }
    
    return <Badge className="bg-red-500/20 text-red-300 border-red-500/20 flex items-center gap-1">
      <XCircle className="h-3 w-3" /> LOSS
    </Badge>;
  };

  const getColourBadge = (colour: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-500/20 text-green-300 border-green-500/20',
      red: 'bg-red-500/20 text-red-300 border-red-500/20',
      violet: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
    };
    
    return <Badge className={colors[colour] || 'bg-gray-500/20 text-gray-300 border-gray-500/20'}>
      {colour.toUpperCase()}
    </Badge>;
  };

  return (
    <Card className="bg-slate-900/50 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-400" />
          Telegram Signals Manager
        </CardTitle>
        <CardDescription className="text-purple-300">
          Send and track live-updating betting signals to your Telegram channel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Send Signal Form */}
        <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Send New Signal</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gameId" className="text-purple-200">Period/Game ID</Label>
              <Input
                id="gameId"
                placeholder="e.g., 20251125030205"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="bg-slate-900/50 border-purple-500/20 text-white"
                data-testid="input-signal-game-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-purple-200">Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white" data-testid="select-signal-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Min</SelectItem>
                  <SelectItem value="3">3 Min</SelectItem>
                  <SelectItem value="5">5 Min</SelectItem>
                  <SelectItem value="10">10 Min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colour" className="text-purple-200">Colour Prediction</Label>
              <Select value={colour} onValueChange={setColour}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white" data-testid="select-signal-colour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">🟢 Green</SelectItem>
                  <SelectItem value="red">🔴 Red</SelectItem>
                  <SelectItem value="violet">🟣 Violet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleSendSignal}
            disabled={sendSignalMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
            data-testid="button-send-signal"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendSignalMutation.isPending ? 'Sending...' : 'Send Signal'}
          </Button>
        </div>

        {/* Signals History */}
        <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Signals</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-purple-500/30"
              data-testid="button-refresh-signals"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/20">
                  <TableHead className="text-purple-200">Game ID</TableHead>
                  <TableHead className="text-purple-200">Duration</TableHead>
                  <TableHead className="text-purple-200">Colour</TableHead>
                  <TableHead className="text-purple-200">Status</TableHead>
                  <TableHead className="text-purple-200">Result</TableHead>
                  <TableHead className="text-purple-200">Sent At</TableHead>
                  <TableHead className="text-purple-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      No signals sent yet
                    </TableCell>
                  </TableRow>
                ) : (
                  signals.map((signal) => (
                    <TableRow key={signal.id} className="border-purple-500/20">
                      <TableCell className="text-white font-mono text-sm">{signal.gameId}</TableCell>
                      <TableCell className="text-white">{signal.duration} min</TableCell>
                      <TableCell>{getColourBadge(signal.colour)}</TableCell>
                      <TableCell>{getStatusBadge(signal.status)}</TableCell>
                      <TableCell>{getResultBadge(signal.result)}</TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {signal.sentAt ? new Date(signal.sentAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSignalMutation.mutate(signal.id)}
                          disabled={deleteSignalMutation.isPending}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          data-testid={`button-delete-signal-${signal.id}`}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
