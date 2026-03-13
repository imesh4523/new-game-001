import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefundedBet {
  id: string;
  userId: string;
  gameId: string;
  amount: string;
  createdAt: string;
  username: string;
  email: string;
}

export function CrashRefundsTracker() {
  const { data: refundedBets, isLoading, refetch } = useQuery<RefundedBet[]>({
    queryKey: ["/api/admin/crash/refunded-bets"],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Crash Bet Auto-Refunds
          </CardTitle>
          <CardDescription>
            Logs of stuck crash bets that were automatically cancelled and refunded to users by the background validation service.
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : refundedBets?.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <ShieldCheck className="mb-2 h-8 w-8 text-muted-foreground opacity-20" />
            <p className="text-sm text-muted-foreground">No refunded crash bets found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Game ID</TableHead>
                  <TableHead>Bet Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundedBets?.map((bet) => (
                  <TableRow key={bet.id}>
                    <TableCell className="font-medium">
                      {format(new Date(bet.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{bet.username}</span>
                        <span className="text-xs text-muted-foreground">{bet.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{bet.gameId}</TableCell>
                    <TableCell>${parseFloat(bet.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">
                        Refunded
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
