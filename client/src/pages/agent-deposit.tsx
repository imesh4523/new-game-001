import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, User, CreditCard, CheckCircle, XCircle, Clock, BadgeCheck, Copy, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SiBinance } from "react-icons/si";

interface Agent {
  id: string;
  publicId: string;
  email: string;
  displayName: string | null;
  binanceId: string | null;
  commissionRate: string;
}

interface DepositRequest {
  id: string;
  userId: string;
  agentId: string;
  amount: string;
  currency: string;
  status: "pending" | "approved" | "rejected" | "completed";
  paymentProof: string | null;
  userNote: string | null;
  agentNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AgentDepositPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [userNote, setUserNote] = useState("");

  // Fetch agents filtered by the amount entered by user
  const { data: agents, isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ['/api/agents', amount],
    queryFn: async () => {
      const amountParam = amount && parseFloat(amount) > 0 ? `?amount=${amount}` : '';
      const response = await fetch(`/api/agents${amountParam}`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    enabled: amount !== "" && parseFloat(amount) > 0,
  });

  const { data: myRequests } = useQuery<DepositRequest[]>({
    queryKey: ['/api/deposit-requests/my-requests'],
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: { agentId: string; amount: number; userNote: string }) => {
      const response = await apiRequest("POST", "/api/deposit-requests", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit Request Submitted",
        description: "Your deposit request has been sent to the agent for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deposit-requests/my-requests'] });
      setSelectedAgent("");
      setAmount("");
      setUserNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create deposit request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAgent || !amount) {
      toast({
        title: "Error",
        description: "Please select an agent and enter an amount",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseFloat(amount);
    if (amountValue < 11) {
      toast({
        title: "Error",
        description: "Minimum deposit amount is $11",
        variant: "destructive",
      });
      return;
    }

    createRequestMutation.mutate({
      agentId: selectedAgent,
      amount: amountValue,
      userNote
    });
  };

  const selectedAgentData = agents?.find(a => a.id === selectedAgent);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" data-testid={`badge-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400" data-testid={`badge-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400" data-testid={`badge-${status}`}><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-${status}`}>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 text-white">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation('/account')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Account
        </Button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Agent Deposit
          </h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                data-testid="button-help"
              >
                <HelpCircle className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-purple-500/30 text-white max-w-2xl max-h-[85vh] overflow-y-auto sm:max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl text-purple-400">Deposit Instructions</DialogTitle>
                <DialogDescription className="text-white/70">
                  Follow these steps to deposit successfully
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4 pb-4">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 text-purple-300">How to Deposit:</h3>
                  <ol className="space-y-3 text-white/80">
                    <li className="flex gap-3">
                      <span className="font-bold text-purple-400 min-w-[24px]">1.</span>
                      <span>Enter the amount you want to deposit</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-purple-400 min-w-[24px]">2.</span>
                      <span>Select an agent from the list</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-purple-400 min-w-[24px]">3.</span>
                      <span>Copy the agent's Binance ID</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-purple-400 min-w-[24px]">4.</span>
                      <span>Go to your Binance app and send the payment to that Binance ID</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-purple-400 min-w-[24px]">5.</span>
                      <div>
                        <p className="font-semibold text-yellow-400">⚠️ IMPORTANT:</p>
                        <p className="mt-1">When making the Binance payment, you <span className="font-bold text-yellow-400">MUST</span> add your 3xbet ID in the Binance remark/note field.</p>
                        <div className="mt-2 bg-black/40 p-3 rounded border border-yellow-500/20">
                          <p className="text-sm text-white/60">Example:</p>
                          <p className="font-mono text-yellow-300">Remark: 123456789</p>
                          <p className="text-xs text-white/50 mt-1">(Use your actual 3xbet ID)</p>
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-purple-400 min-w-[24px]">6.</span>
                      <span>Submit the deposit request on this page</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-purple-400 min-w-[24px]">7.</span>
                      <span>Wait for agent approval</span>
                    </li>
                  </ol>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-sm text-red-300">
                    <span className="font-bold">Warning:</span> Deposits without your 3xbet ID in the Binance remark may be delayed or rejected!
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          <Card className="bg-black/40 border-purple-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                New Deposit Request
              </CardTitle>
              <CardDescription className="text-white/60">
                Submit a deposit request to an agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="amount" className="text-white/90">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="11"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Enter amount to see available agents"
                    data-testid="input-amount"
                  />
                  <p className="text-xs text-white/50 mt-1">
                    Minimum deposit: $11. Enter amount first to see agents who accept this deposit range
                  </p>
                </div>

                <div>
                  <Label htmlFor="agent" className="text-white/90">Select Agent (Sorted by Price)</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-agent">
                      <SelectValue placeholder="Choose an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingAgents && <SelectItem value="loading" disabled>Loading agents...</SelectItem>}
                      {!loadingAgents && agents && agents.length === 0 && (
                        <SelectItem value="no-agents" disabled>
                          {amount && parseFloat(amount) > 0 
                            ? "No agents available for this amount" 
                            : "Enter amount to see available agents"}
                        </SelectItem>
                      )}
                      {agents?.map(agent => (
                        <SelectItem key={agent.id} value={agent.id} data-testid={`option-agent-${agent.id}`}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <div className="flex items-center gap-1">
                              <span>{agent.displayName || agent.email}</span>
                              <BadgeCheck className="w-4 h-4 text-blue-500" data-testid={`icon-verified-${agent.id}`} />
                            </div>
                            {agent.publicId && <span className="text-xs text-gray-400">#{agent.publicId}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {agents && agents.length > 0 && (
                    <p className="text-xs text-white/50 mt-1">
                      Showing {agents.length} agent{agents.length > 1 ? 's' : ''} sorted by lowest commission rate
                    </p>
                  )}
                </div>

                {selectedAgentData?.binanceId && (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <SiBinance className="w-4 h-4 text-yellow-400" />
                      <p className="text-sm text-white/70">Agent's Binance ID:</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-lg flex-1" data-testid="text-binance-id">{selectedAgentData.binanceId}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-purple-600/20 border-purple-500/40 text-white hover:bg-purple-600/40"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedAgentData.binanceId!);
                          toast({
                            title: "Copied!",
                            description: "Binance ID copied to clipboard",
                          });
                        }}
                        data-testid="button-copy-binance"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-white/50 mt-2">
                      Send payment to this Binance ID
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="note" className="text-white/90">Note (Optional)</Label>
                  <Textarea
                    id="note"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Any additional information"
                    data-testid="input-note"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={createRequestMutation.isPending}
                  data-testid="button-submit"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">My Deposit Requests</CardTitle>
              <CardDescription className="text-white/60">
                View your deposit request history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!myRequests || myRequests.length === 0 ? (
                  <p className="text-white/50 text-center py-8" data-testid="text-no-requests">No deposit requests yet</p>
                ) : (
                  myRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg"
                      data-testid={`card-request-${request.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium" data-testid={`text-amount-${request.id}`}>
                            ${parseFloat(request.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-white/50">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      {request.userNote && (
                        <p className="text-sm text-white/70 mt-2">
                          Note: {request.userNote}
                        </p>
                      )}
                      {request.agentNote && (
                        <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                          <p className="text-xs text-white/70">Agent's response:</p>
                          <p className="text-sm text-white">{request.agentNote}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
