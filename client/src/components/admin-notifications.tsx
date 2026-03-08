import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Send, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { sendNotificationSchema } from "@shared/schema";
import { z } from "zod";

type NotificationFormData = z.infer<typeof sendNotificationSchema>;

export default function AdminNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingTo, setSendingTo] = useState<"all" | "specific">("all");

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "info",
      imageUrl: "",
      userId: ""
    }
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const payload = sendingTo === "all" ? { ...data, userId: undefined } : data;
      const response = await apiRequest("POST", "/api/notifications/send", payload);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notification Sent",
        description: sendingTo === "all" 
          ? `Sent to ${data.count} users successfully` 
          : "Notification sent successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: NotificationFormData) => {
    sendNotificationMutation.mutate(data);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-500/20 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-400" />
            <CardTitle>Send Notification</CardTitle>
          </div>
          <CardDescription>Send notifications to users or all users at once</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="send-to">Send To</Label>
              <Select
                value={sendingTo}
                onValueChange={(value: "all" | "specific") => setSendingTo(value)}
              >
                <SelectTrigger data-testid="select-send-to">
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="specific">Specific User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sendingTo === "specific" && (
              <div className="space-y-2">
                <Label htmlFor="userId">User ID or Email</Label>
                <Input
                  id="userId"
                  {...form.register("userId")}
                  placeholder="Enter user ID or email"
                  data-testid="input-userId"
                  className="bg-slate-800 border-slate-700"
                />
                {form.formState.errors.userId && (
                  <p className="text-sm text-red-500">{form.formState.errors.userId.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Notification Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as any)}
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      {getTypeIcon("info")}
                      Info
                    </div>
                  </SelectItem>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      {getTypeIcon("success")}
                      Success
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      {getTypeIcon("warning")}
                      Warning
                    </div>
                  </SelectItem>
                  <SelectItem value="error">
                    <div className="flex items-center gap-2">
                      {getTypeIcon("error")}
                      Error
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Enter notification title"
                data-testid="input-title"
                className="bg-slate-800 border-slate-700"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                {...form.register("message")}
                placeholder="Enter notification message"
                data-testid="textarea-message"
                rows={4}
                className="bg-slate-800 border-slate-700"
              />
              {form.formState.errors.message && (
                <p className="text-sm text-red-500">{form.formState.errors.message.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <Input
                id="imageUrl"
                {...form.register("imageUrl")}
                placeholder="https://example.com/image.jpg"
                data-testid="input-imageUrl"
                className="bg-slate-800 border-slate-700"
              />
              {form.formState.errors.imageUrl && (
                <p className="text-sm text-red-500">{form.formState.errors.imageUrl.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={sendNotificationMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="button-send-notification"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendNotificationMutation.isPending ? "Sending..." : "Send Notification"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
