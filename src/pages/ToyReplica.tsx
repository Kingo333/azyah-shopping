
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, Copy, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/back-button';

const ToyReplica = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [toyReplicaId, setToyReplicaId] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .jpg, .jpeg, .png, or .webp file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setResultUrl(null);
    setToyReplicaId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAndGenerate = async () => {
    if (!selectedFile || !user) return;

    try {
      setIsUploading(true);

      // Create toy replica record
      const { data: toyReplica, error: createError } = await supabase
        .from('toy_replicas')
        .insert({
          user_id: user.id,
          status: 'queued'
        })
        .select()
        .single();

      if (createError) throw createError;
      setToyReplicaId(toyReplica.id);

      // Upload file to private bucket
      const fileName = `${toyReplica.id}-${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('toy-replica-source')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Update record with source URL
      const sourceUrl = `toy-replica-source/${fileName}`;
      await supabase
        .from('toy_replicas')
        .update({ source_url: sourceUrl, status: 'processing' })
        .eq('id', toyReplica.id);

      setIsUploading(false);
      setIsGenerating(true);

      // Call edge function to generate
      const { data, error: functionError } = await supabase.functions.invoke('generate-toy-replica', {
        body: {
          toyReplicaId: toyReplica.id,
          sourceUrl: sourceUrl
        }
      });

      if (functionError) throw functionError;

      setResultUrl(data.resultUrl);
      toast({
        title: "Success!",
        description: "Your LEGO mini-figure has been generated!"
      });

    } catch (error: any) {
      console.error('Error generating toy replica:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });

      // Update status to failed if we have a record
      if (toyReplicaId) {
        await supabase
          .from('toy_replicas')
          .update({ status: 'failed', error: error.message })
          .eq('id', toyReplicaId);
      }
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  const downloadResult = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = 'lego-mini-figure.png';
      link.click();
    }
  };

  const copyLink = () => {
    if (resultUrl) {
      navigator.clipboard.writeText(resultUrl);
      toast({
        title: "Link copied",
        description: "Result URL copied to clipboard"
      });
    }
  };

  const regenerate = () => {
    setResultUrl(null);
    setToyReplicaId(null);
    uploadAndGenerate();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Toy Replica</CardTitle>
          <p className="text-muted-foreground">
            Upload one photo. We'll generate a LEGO-style mini-figure with a transparent background.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedFile ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Upload your photo</p>
              <p className="text-muted-foreground mb-4">
                Accepts .jpg, .jpeg, .png, .webp up to 10MB
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {preview && (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Upload preview"
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={uploadAndGenerate}
                  disabled={isUploading || isGenerating || !!resultUrl}
                  className="flex-1 max-w-xs"
                >
                  {isUploading && "Uploading photo..."}
                  {isGenerating && "Building your mini-figure..."}
                  {!isUploading && !isGenerating && !resultUrl && "Generate"}
                  {resultUrl && "Generated!"}
                </Button>
                <Button variant="outline" onClick={clearFile}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {resultUrl && (
            <div className="space-y-4">
              <div className="relative">
                <div
                  className="mx-auto max-w-md bg-checkerboard rounded-lg p-4"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='checkerboard' width='20' height='20' patternUnits='userSpaceOnUse'%3e%3crect width='10' height='10' fill='%23f0f0f0'/%3e%3crect x='10' y='10' width='10' height='10' fill='%23f0f0f0'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23checkerboard)'/%3e%3c/svg%3e")`
                  }}
                >
                  <img
                    src={resultUrl}
                    alt="LEGO mini-figure result"
                    className="w-full rounded"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={downloadResult} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PNG
                </Button>
                <Button onClick={copyLink} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button onClick={regenerate} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Keep it family-friendly and your own photo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ToyReplica;
