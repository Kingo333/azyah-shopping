import React, { useState } from 'react';
import { X, FileText, Download, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SafetyDocumentViewerProps {
  files: Array<{ url: string; name: string; type: string }>;
  onRemoveFile: (index: number) => void;
}

export function SafetyDocumentViewer({ files, onRemoveFile }: SafetyDocumentViewerProps) {
  const [selectedFile, setSelectedFile] = useState<number | null>(null);

  if (files.length === 0) {
    return null;
  }

  const currentFile = selectedFile !== null ? files[selectedFile] : null;

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const getFileType = (type: string) => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOC';
    return 'Document';
  };

  return (
    <div className="space-y-4">
      {/* File List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            Safety Documents ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {files.map((file, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedFile === index
                  ? 'border-red-300 bg-red-50/50'
                  : 'border-border hover:border-red-200/60 hover:bg-red-50/20'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getFileType(file.type)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(selectedFile === index ? null : index)}
                  className="hover:bg-red-100/50"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                  className="hover:bg-blue-100/50"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = file.url;
                    a.download = file.name;
                    a.click();
                  }}
                  className="hover:bg-green-100/50"
                >
                  <Download className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(index)}
                  className="hover:bg-red-100/50 text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* PDF Viewer */}
      {currentFile && currentFile.type.includes('pdf') && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Viewing: {currentFile.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                src={`${currentFile.url}#view=FitH`}
                className="w-full h-[600px]"
                title={currentFile.name}
                frameBorder="0"
              />
            </div>
            
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => window.open(currentFile.url, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = currentFile.url;
                  a.download = currentFile.name;
                  a.click();
                }}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-PDF File Viewer */}
      {currentFile && !currentFile.type.includes('pdf') && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Document: {currentFile.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 space-y-4">
              <FileText className="w-16 h-16 text-blue-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Document Preview</h3>
                <p className="text-muted-foreground">
                  This document type cannot be previewed inline. Use the buttons below to view or download.
                </p>
              </div>
              
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => window.open(currentFile.url, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = currentFile.url;
                    a.download = currentFile.name;
                    a.click();
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}