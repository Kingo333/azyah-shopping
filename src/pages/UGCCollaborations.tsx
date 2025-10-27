import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CollabList } from '@/components/ugc/CollabList';

export default function UGCCollaborations() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E3DF] h-[60px] flex items-center px-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-sans font-semibold text-gray-900 pr-9">
          UGC Collaborations
        </h1>
      </header>

      {/* Main Content */}
      <main className="pt-4 px-4 pb-20">
        <div className="max-w-[1200px] mx-auto">
          <CollabList />
        </div>
      </main>
    </div>
  );
}
