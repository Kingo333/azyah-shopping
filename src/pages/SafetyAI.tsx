import React, { useState, useRef } from 'react';
import { ArrowLeft, Shield, AlertTriangle, Download, Settings, Info, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAzyahSafetyVoice } from '@/hooks/useAzyahSafetyVoice';
import { useOrbRenderer } from '@/components/voice/useOrbRenderer';
import { SEOHead } from '@/components/SEOHead';
import { SafetyDocumentUploader } from '@/components/SafetyDocumentUploader';
import { SafetyDocumentViewer } from '@/components/SafetyDocumentViewer';

export default function SafetyAI() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInteracting = useRef(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; name: string; type: string }>>([]);

  const {
    state,
    isConnected,
    isConnecting,
    error,
    showCaptions,
    currentCaption,
    progressStep,
    totalSteps,
    reportData,
    reportUrl,
    checklistData,
    checklistUrl,
    currentChecklistItem,
    connectOnce,
    disconnect,
    toggleCaptions,
    pttDown,
    pttUp,
    interrupt,
    markChecklistItemComplete,
    resetChecklist,
  } = useAzyahSafetyVoice();

  // Initialize orb renderer for visual feedback
  useOrbRenderer(canvasRef, 0.5); // Basic orb with moderate intensity

  const handleCanvasInteraction = (isActive: boolean) => {
    isInteracting.current = isActive;
    if (isActive) {
      pttDown();
    } else {
      pttUp();
    }
  };

  const getStateHint = () => {
    switch (state) {
      case 'disconnected':
        return 'Touch and hold the orb to start safety consultation';
      case 'connecting':
        return 'Connecting to Safety AI...';
      case 'introduction':
        return 'Listening for your safety needs...';
      case 'decision':
        return 'Choose: Safety checklist or incident report?';
      case 'checklist_mode':
        return 'Describing your situation for safety checklist...';
      case 'checklist_interaction':
        return 'Interacting with safety checklist - say "complete", "next", or "reset"';
      case 'reporting':
        return `Incident reporting: Question ${progressStep} of ${totalSteps}`;
      case 'complete':
        return 'Safety report completed - download ready';
      default:
        return 'Touch and hold the orb to speak with Safety AI';
    }
  };

  const getProgressPercentage = () => {
    if (state === 'reporting' && totalSteps > 0) {
      return (progressStep / totalSteps) * 100;
    }
    return state === 'complete' ? 100 : 0;
  };

  const handleFileUploaded = (file: { url: string; name: string; type: string }) => {
    setUploadedFiles(prev => [...prev, file]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-50/20">
      <SEOHead 
        title="Safety AI - HSE Reporting Assistant | Azyah"
        description="AI-powered Health, Safety & Environment assistant for incident reporting and safety checklists"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-accent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-600/10 border border-red-600/20">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Safety AI</h1>
                  <p className="text-sm text-muted-foreground">HSE Assistant</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-red-600/30 text-red-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="voice" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Voice Assistant
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Voice Assistant Tab */}
          <TabsContent value="voice" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Info & Progress */}
              <div className="space-y-6">
                
                {/* Status Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Connection</span>
                        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                          {isConnected ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Mode</span>
                        <span className="capitalize">{state.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Progress for incident reporting */}
                    {state === 'reporting' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Report Progress</span>
                          <span>{progressStep}/{totalSteps}</span>
                        </div>
                        <Progress value={getProgressPercentage()} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={toggleCaptions}
                    >
                      {showCaptions ? 'Hide' : 'Show'} Captions
                    </Button>
                    
                    {isConnected && state !== 'disconnected' && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={interrupt}
                      >
                        Interrupt AI
                      </Button>
                    )}
                    
                    {state === 'complete' && reportUrl && (
                      <div className="space-y-2">
                        <Button
                          className="w-full justify-start bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = reportUrl;
                            link.download = `safety-report-${new Date().toISOString().split('T')[0]}.txt`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Report
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => window.open(reportUrl, '_blank')}
                        >
                          View Report
                        </Button>
                      </div>
                    )}
                    
                    {checklistData && checklistUrl && (
                      <div className="space-y-2">
                        <Button
                          className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = checklistUrl;
                            link.download = `safety-checklist-${new Date().toISOString().split('T')[0]}.txt`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Checklist
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => window.open(checklistUrl, '_blank')}
                        >
                          View Checklist
                        </Button>
                      </div>
                    )}
                    
                    {isConnected && (
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={disconnect}
                      >
                        Disconnect
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Safety Guidelines */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Speak clearly and provide accurate information</li>
                      <li>• For incidents, have details like time, location, and people involved ready</li>
                      <li>• Safety checklists will be generated based on your situation</li>
                      <li>• All reports are confidential and secure</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Center Column - Voice Interface */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Voice Interaction Area */}
                <Card className="bg-gradient-to-br from-red-50/30 to-orange-50/20 border-red-200/30">
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      
                      {/* Interactive Orb */}
                      <div className="flex justify-center">
                        <div className="relative">
                          <canvas
                            ref={canvasRef}
                            width={300}
                            height={300}
                            className="touch-none select-none cursor-pointer rounded-full"
                            onMouseDown={() => handleCanvasInteraction(true)}
                            onMouseUp={() => handleCanvasInteraction(false)}
                            onMouseLeave={() => handleCanvasInteraction(false)}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              handleCanvasInteraction(true);
                            }}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              handleCanvasInteraction(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.code === 'Space') {
                                e.preventDefault();
                                handleCanvasInteraction(true);
                              }
                            }}
                            onKeyUp={(e) => {
                              if (e.code === 'Space') {
                                e.preventDefault();
                                handleCanvasInteraction(false);
                              }
                            }}
                            tabIndex={0}
                          />
                          
                          {/* Safety icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Shield className="w-16 h-16 text-red-600/40" />
                          </div>
                        </div>
                      </div>

                      {/* State Hint */}
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-foreground">
                          {getStateHint()}
                        </h2>
                        
                        {!isConnected && !isConnecting && (
                          <p className="text-muted-foreground">
                            Press and hold the orb to begin your safety consultation
                          </p>
                        )}
                      </div>

                      {/* Error Display */}
                      {error && (
                        <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                          <p className="text-red-700 text-sm">{error}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Captions */}
                {showCaptions && currentCaption && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded bg-red-600/10">
                          <Shield className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Azyah Safety AI</p>
                          <p className="text-foreground">{currentCaption}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Safety Checklist Interaction */}
                {(state === 'checklist_mode' || state === 'checklist_interaction') && checklistData && (
                  <Card className="bg-blue-50/30 border-blue-200/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                        <Shield className="w-5 h-5" />
                        Safety Checklist - {checklistData.situation}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {checklistData.checklist.map((item, index) => (
                          <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            checklistData.completedItems?.[index] 
                              ? 'bg-green-50 border-green-200 text-green-800' 
                              : index === currentChecklistItem 
                                ? 'bg-blue-50 border-blue-200 text-blue-800 ring-2 ring-blue-200' 
                                : 'bg-background border-border'
                          }`}>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                              checklistData.completedItems?.[index] 
                                ? 'bg-green-600 border-green-600 text-white' 
                                : index === currentChecklistItem 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'border-muted-foreground text-muted-foreground'
                            }`}>
                              {checklistData.completedItems?.[index] ? '✓' : index + 1}
                            </div>
                            <span className="flex-1">{item}</span>
                            {!checklistData.completedItems?.[index] && index === currentChecklistItem && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markChecklistItemComplete(index)}
                                className="text-xs"
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetChecklist}
                          className="text-xs"
                        >
                          Reset Checklist
                        </Button>
                        <Badge variant={checklistData.priority === 'high' ? 'destructive' : 'default'}>
                          {checklistData.priority} priority
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        <p className="font-medium mb-1">Voice Commands:</p>
                        <p>Say "complete" to mark current item done, "next" to skip, "reset" to restart checklist</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Completed Report Preview */}
                {state === 'complete' && reportData && Object.keys(reportData).length > 0 && (
                  <Card className="bg-green-50/30 border-green-200/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                        <Shield className="w-5 h-5" />
                        Safety Report Completed
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2 text-sm">
                        {reportData.dateTime && (
                          <div><span className="font-medium">Date/Time:</span> {reportData.dateTime}</div>
                        )}
                        {reportData.location && (
                          <div><span className="font-medium">Location:</span> {reportData.location}</div>
                        )}
                        {reportData.injuryDetails && (
                          <div><span className="font-medium">Incident:</span> {reportData.injuryDetails}</div>
                        )}
                        {reportData.reporter && (
                          <div><span className="font-medium">Reported by:</span> {reportData.reporter}</div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Your complete safety report is ready for download.
                      </p>
                    </CardContent>
                  </Card>
                )}

              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Upload */}
              <div className="space-y-6">
                <SafetyDocumentUploader onFileUploaded={handleFileUploaded} />
                
                {/* Upload Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Document Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Upload safety procedures, forms, or reference documents</li>
                      <li>• PDF files can be viewed inline for easy reference</li>
                      <li>• Documents are stored securely and privately</li>
                      <li>• Use during voice consultations for better context</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Document Viewer */}
              <div className="space-y-6">
                <SafetyDocumentViewer 
                  files={uploadedFiles} 
                  onRemoveFile={handleRemoveFile}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Audio element for playback */}
      <audio autoPlay className="hidden" />
    </div>
  );
}