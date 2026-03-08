import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, RotateCcw, Image as ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProcessedImageResponse {
  processedImage: string;
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
}

export default function ImageEditor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [borderSize, setBorderSize] = useState([10]);
  const [originalImageName, setOriginalImageName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processMutation = useMutation({
    mutationFn: async (data: { imageData: string; borderSize: number }) => {
      const response = await apiRequest('POST', '/api/image/remove-border', data);
      return await response.json() as ProcessedImageResponse;
    },
    onSuccess: (data) => {
      setProcessedImage(data.processedImage);
      toast({
        title: "Border removed successfully!",
        description: `Original: ${data.originalSize.width}x${data.originalSize.height} → Processed: ${data.processedSize.width}x${data.processedSize.height}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPEG, WebP, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setOriginalImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setOriginalImage(result);
      setProcessedImage(null); // Reset processed image
    };
    reader.readAsDataURL(file);
  };

  const handleProcessImage = () => {
    if (!originalImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    processMutation.mutate({
      imageData: originalImage,
      borderSize: borderSize[0],
    });
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `processed_${originalImageName || 'image.png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setOriginalImageName("");
    setBorderSize([10]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Image Border Remover</h1>
          <p className="text-purple-200">Upload an image and remove unwanted borders automatically</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Upload and Controls */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload & Settings
              </CardTitle>
              <CardDescription className="text-purple-200">
                Select an image and adjust border removal settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image-upload" className="text-white">Select Image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="bg-white/10 border-white/20 text-white file:bg-purple-600 file:text-white file:border-0 file:rounded-md file:px-4 file:py-2"
                  data-testid="input-image-upload"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">Border Size (pixels): {borderSize[0]}</Label>
                <Slider
                  value={borderSize}
                  onValueChange={setBorderSize}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                  data-testid="slider-border-size"
                />
                <p className="text-xs text-purple-200">
                  This will remove {borderSize[0]} pixels from each edge of the image
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleProcessImage}
                  disabled={!originalImage || processMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  data-testid="button-process-image"
                >
                  {processMutation.isPending ? "Processing..." : "Remove Border"}
                </Button>
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  data-testid="button-reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Download */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download Result
              </CardTitle>
              <CardDescription className="text-purple-200">
                Download your processed image
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDownload}
                disabled={!processedImage}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Processed Image
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Image Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Original Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-white/5 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                {originalImage ? (
                  <img 
                    src={originalImage} 
                    alt="Original" 
                    className="max-w-full max-h-full object-contain"
                    data-testid="img-original"
                  />
                ) : (
                  <div className="text-center text-purple-200">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                    <p>No image uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Processed Image */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Processed Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-white/5 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                {processedImage ? (
                  <img 
                    src={processedImage} 
                    alt="Processed" 
                    className="max-w-full max-h-full object-contain"
                    data-testid="img-processed"
                  />
                ) : (
                  <div className="text-center text-purple-200">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                    {processMutation.isPending ? (
                      <p>Processing...</p>
                    ) : (
                      <p>Border removed image will appear here</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}