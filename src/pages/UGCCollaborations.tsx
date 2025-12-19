import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollabList } from '@/components/ugc/CollabList';
import { ReviewsList } from '@/components/ugc/brand/ReviewsList';
import { QuestionsList } from '@/components/ugc/brand/QuestionsList';
import { ScamsList } from '@/components/ugc/brand/ScamsList';

export default function UGCCollaborations() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header 
        className="sticky top-0 z-10 bg-card border-b border-border h-[60px] flex items-center px-4"
        style={{ paddingTop: 'var(--safe-top, 0px)', height: 'calc(60px + var(--safe-top, 0px))' }}
      >
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-serif font-medium text-foreground pr-9">
          UGC Brand
        </h1>
      </header>

      {/* Main Content */}
      <main className="pt-4 px-4 pb-20">
        <div className="max-w-[1200px] mx-auto">
          <Tabs defaultValue="collabs" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="collabs">collabs</TabsTrigger>
              <TabsTrigger value="reviews">reviews</TabsTrigger>
              <TabsTrigger value="questions">questions</TabsTrigger>
              <TabsTrigger value="scams">scams</TabsTrigger>
            </TabsList>

            <TabsContent value="collabs">
              <CollabList />
            </TabsContent>

            <TabsContent value="reviews">
              <ReviewsList />
            </TabsContent>

            <TabsContent value="questions">
              <QuestionsList />
            </TabsContent>

            <TabsContent value="scams">
              <ScamsList />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
