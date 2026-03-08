import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Shield, 
  Fingerprint, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle,
  Smartphone,
  Bell,
  BellOff
} from "lucide-react";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface Passkey {
  id: string;
  deviceName: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SecuritySettings() {
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [editingPasskey, setEditingPasskey] = useState<Passkey | null>(null);
  const [editDeviceName, setEditDeviceName] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading: isPushLoading,
    isIOSNonPWA,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  // Fetch user's passkeys
  const { data: passkeys = [], isLoading, refetch } = useQuery<Passkey[]>({
    queryKey: ['/api/user/passkeys'],
  });

  // Register new passkey mutation
  const registerPasskeyMutation = useMutation({
    mutationFn: async () => {
      if (!deviceName.trim()) {
        throw new Error("Device name is required");
      }

      try {
        // Start registration
        const startResponse = await apiRequest('POST', '/api/passkeys/register/start', {
          deviceName: deviceName.trim()
        });
        
        if (!startResponse.ok) {
          const errorData = await startResponse.json();
          throw new Error(errorData.message || "Failed to start passkey registration");
        }
        
        const registrationOptions = await startResponse.json();

        // Check if we're in a secure context for WebAuthn
        if (!window.isSecureContext) {
          throw new Error("Passkeys require a secure connection (HTTPS). Please access the application through HTTPS.");
        }

        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
          throw new Error("Your browser doesn't support passkeys. Please use a modern browser with WebAuthn support.");
        }

        // Browser WebAuthn registration with better error handling
        let registrationResult;
        try {
          registrationResult = await startRegistration(registrationOptions);
        } catch (webauthnError: any) {
          if (import.meta.env.DEV) console.error('WebAuthn registration error:', webauthnError);
          
          if (webauthnError.name === 'NotSupportedError') {
            throw new Error("Your device or browser doesn't support passkeys. Please use a compatible device with biometric authentication.");
          } else if (webauthnError.name === 'NotAllowedError') {
            throw new Error("Passkey registration was cancelled or denied. Please try again and allow the biometric authentication.");
          } else if (webauthnError.name === 'SecurityError') {
            throw new Error("Security error: Please ensure you're on a secure connection (HTTPS).");
          } else if (webauthnError.name === 'InvalidStateError') {
            throw new Error("This authenticator is already registered. Try with a different device.");
          } else {
            throw new Error(`Passkey registration failed: ${webauthnError.message || 'Unknown error'}`);
          }
        }

        // Finish registration
        const finishResponse = await apiRequest('POST', '/api/passkeys/register/finish', registrationResult);
        if (!finishResponse.ok) {
          const errorData = await finishResponse.json();
          throw new Error(errorData.message || "Failed to complete passkey registration");
        }
        
        return await finishResponse.json();
      } catch (error: any) {
        if (import.meta.env.DEV) console.error('Passkey registration error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Passkey registered successfully",
        description: "Your new passkey has been added to your account",
      });
      setDeviceName("");
      setIsRegistering(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register passkey",
        variant: "destructive",
      });
      setIsRegistering(false);
    }
  });

  // Update passkey mutation
  const updatePasskeyMutation = useMutation({
    mutationFn: async (data: { passkeyId: string; deviceName?: string; isActive?: boolean }) => {
      const response = await apiRequest('PUT', '/api/passkeys/update', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Passkey updated",
        description: "Changes saved successfully",
      });
      setShowEditDialog(false);
      setEditingPasskey(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update passkey",
        variant: "destructive",
      });
    }
  });

  // Delete passkey mutation
  const deletePasskeyMutation = useMutation({
    mutationFn: async (passkeyId: string) => {
      await apiRequest('DELETE', `/api/passkeys/${passkeyId}`);
    },
    onSuccess: () => {
      toast({
        title: "Passkey deleted",
        description: "The passkey has been removed from your account",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete passkey",
        variant: "destructive",
      });
    }
  });

  const handleRegisterPasskey = () => {
    setIsRegistering(true);
    registerPasskeyMutation.mutate();
  };

  const handleEditPasskey = (passkey: Passkey) => {
    setEditingPasskey(passkey);
    setEditDeviceName(passkey.deviceName);
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingPasskey) return;
    
    updatePasskeyMutation.mutate({
      passkeyId: editingPasskey.id,
      deviceName: editDeviceName.trim() || editingPasskey.deviceName
    });
  };

  const handleToggleActive = (passkey: Passkey) => {
    updatePasskeyMutation.mutate({
      passkeyId: passkey.id,
      isActive: !passkey.isActive
    });
  };

  const handleDeletePasskey = (passkeyId: string) => {
    deletePasskeyMutation.mutate(passkeyId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="container mx-auto max-w-4xl pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Security Settings</h1>
          </div>
          <p className="text-blue-200 text-lg">
            Manage your account security and passkeys
          </p>
        </div>

        {/* Passkeys Section */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-blue-400" />
              Passkeys (Biometric Authentication)
            </CardTitle>
            <CardDescription className="text-blue-200">
              Use fingerprint, face ID, or other biometric authentication for secure withdrawals and account access.
              Passkeys provide passwordless authentication that's more secure than traditional passwords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Passkey */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Register New Passkey</h3>
                <Smartphone className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="device-name" className="text-white/90">Device Name</Label>
                  <Input
                    id="device-name"
                    type="text"
                    placeholder="e.g., iPhone, MacBook Touch ID, Android Phone"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    data-testid="input-device-name"
                  />
                </div>
                <Button
                  onClick={handleRegisterPasskey}
                  disabled={!deviceName.trim() || isRegistering || registerPasskeyMutation.isPending}
                  className="self-end bg-blue-600 hover:bg-blue-700"
                  data-testid="button-register-passkey"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isRegistering || registerPasskeyMutation.isPending ? "Registering..." : "Add Passkey"}
                </Button>
              </div>
            </div>

            {/* Existing Passkeys */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3">Your Passkeys</h3>
              {isLoading ? (
                <div className="text-center py-8 text-white/60">Loading passkeys...</div>
              ) : passkeys.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                  <Fingerprint className="h-12 w-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/60 mb-2">No passkeys registered yet</p>
                  <p className="text-white/40 text-sm">Add your first passkey above to enable biometric authentication</p>
                </div>
              ) : (
                passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between"
                    data-testid={`passkey-item-${passkey.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" data-testid={`text-device-name-${passkey.id}`}>
                            {passkey.deviceName}
                          </span>
                          <Badge
                            variant={passkey.isActive ? "default" : "destructive"}
                            className="text-xs"
                            data-testid={`badge-status-${passkey.id}`}
                          >
                            {passkey.isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Disabled
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-white/60">
                          Added: {new Date(passkey.createdAt).toLocaleDateString()}
                          {passkey.lastUsedAt && (
                            <span className="ml-2">
                              • Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(passkey)}
                        disabled={updatePasskeyMutation.isPending}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        data-testid={`button-toggle-${passkey.id}`}
                      >
                        {passkey.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPasskey(passkey)}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        data-testid={`button-edit-${passkey.id}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-600/20 border-red-500/20 text-red-300 hover:bg-red-600/30"
                            data-testid={`button-delete-${passkey.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Delete Passkey</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-300">
                              Are you sure you want to delete the passkey "{passkey.deviceName}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-700 text-white border-gray-600">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePasskey(passkey.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`confirm-delete-${passkey.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Passkey Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Passkey</DialogTitle>
              <DialogDescription className="text-gray-300">
                Update the name for this passkey device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-device-name" className="text-white">
                  Device Name
                </Label>
                <Input
                  id="edit-device-name"
                  value={editDeviceName}
                  onChange={(e) => setEditDeviceName(e.target.value)}
                  placeholder="Enter device name"
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-edit-device-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="bg-gray-700 text-white border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editDeviceName.trim() || updatePasskeyMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-save-edit"
              >
                {updatePasskeyMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Push Notifications Section */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-400" />
              Push Notifications
            </CardTitle>
            <CardDescription className="text-blue-200">
              Receive instant notifications about your account activity, promotions, and important updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BellOff className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-300 font-medium mb-1">Push Notifications Not Supported</p>
                    {isIOSNonPWA ? (
                      <>
                        <p className="text-red-200/80 text-sm mb-3">
                          On iOS/iPadOS, push notifications only work when the app is installed to your home screen.
                        </p>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <p className="text-white/90 text-sm font-medium mb-2">How to install:</p>
                          <ol className="text-white/80 text-sm space-y-1.5 list-decimal list-inside">
                            <li>Tap the Share button <span className="inline-block">📤</span> at the bottom of Safari</li>
                            <li>Scroll down and tap "Add to Home Screen"</li>
                            <li>Tap "Add" in the top right corner</li>
                            <li>Open the app from your home screen</li>
                            <li>Come back to this page and enable notifications</li>
                          </ol>
                        </div>
                      </>
                    ) : (
                      <p className="text-red-200/80 text-sm">
                        Your browser or device does not support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Notification Status</h3>
                      <div className="flex items-center gap-2">
                        {isSubscribed ? (
                          <>
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Subscribed
                            </Badge>
                            <span className="text-sm text-white/60">
                              You'll receive push notifications from the admin
                            </span>
                          </>
                        ) : permission === 'denied' ? (
                          <>
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                              <XCircle className="h-3 w-3 mr-1" />
                              Permission Denied
                            </Badge>
                            <span className="text-sm text-white/60">
                              Please enable notifications in your browser settings
                            </span>
                          </>
                        ) : (
                          <>
                            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                              <BellOff className="h-3 w-3 mr-1" />
                              Not Subscribed
                            </Badge>
                            <span className="text-sm text-white/60">
                              Subscribe to receive notifications
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {!isSubscribed ? (
                      <Button
                        onClick={subscribe}
                        disabled={isPushLoading || permission === 'denied'}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-subscribe-notifications"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        {isPushLoading ? "Subscribing..." : "Enable Notifications"}
                      </Button>
                    ) : (
                      <Button
                        onClick={unsubscribe}
                        disabled={isPushLoading}
                        variant="outline"
                        className="bg-red-600/20 border-red-500/20 text-red-300 hover:bg-red-600/30"
                        data-testid="button-unsubscribe-notifications"
                      >
                        <BellOff className="h-4 w-4 mr-2" />
                        {isPushLoading ? "Unsubscribing..." : "Disable Notifications"}
                      </Button>
                    )}
                  </div>
                </div>

                {permission === 'denied' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-200 text-sm mb-2 font-medium">
                      How to enable notifications:
                    </p>
                    <ul className="text-yellow-100/80 text-sm space-y-1 list-disc list-inside">
                      <li>Click the lock icon in your browser's address bar</li>
                      <li>Find "Notifications" in the permissions list</li>
                      <li>Change the setting from "Block" to "Allow"</li>
                      <li>Refresh this page and try again</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" />
              Security Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-blue-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Passkeys use your device's built-in biometric authentication (fingerprint, face ID, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>They provide stronger security than passwords and are resistant to phishing attacks</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>You can register multiple passkeys for different devices (phone, laptop, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Passkeys are required for secure withdrawals from your account</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}