import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UGCBrandStats, BrandReview, BrandQuestion, BrandAnswer, BrandScamReport, ContentType } from '@/types/ugcBrand';
import { toast } from '@/hooks/use-toast';

// Fetch all brands with stats
export const useUGCBrands = (filters?: {
  category?: string;
  search?: string;
  verified?: boolean;
}) => {
  return useQuery({
    queryKey: ['ugc-brands', filters],
    queryFn: async () => {
      let query = supabase
        .from('ugc_brand_stats')
        .select('*')
        .order('reviews_count', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters?.verified !== undefined) {
        query = query.eq('is_verified', filters.verified);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UGCBrandStats[];
    },
  });
};

// Fetch single brand
export const useUGCBrand = (brandId?: string) => {
  return useQuery({
    queryKey: ['ugc-brand', brandId],
    queryFn: async () => {
      if (!brandId) return null;
      const { data, error } = await supabase
        .from('ugc_brands')
        .select('*')
        .eq('id', brandId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
  });
};

// Create brand
export const useCreateBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brand: { name: string; logo_url?: string; website_url?: string; instagram_handle?: string; category?: string; country?: string }) => {
      const { data, error } = await supabase
        .from('ugc_brands')
        .insert([brand])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ugc-brands'] });
      toast({ title: 'Brand added successfully' });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ title: 'Brand already exists', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to add brand', variant: 'destructive' });
      }
    },
  });
};

// Fetch reviews for a brand
export const useBrandReviews = (brandId?: string) => {
  return useQuery({
    queryKey: ['brand-reviews', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      const { data, error } = await supabase
        .from('brand_reviews')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch user data separately
      const reviews = data || [];
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', userIds);
        
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        return reviews.map(review => ({
          ...review,
          like_count: (review as any).like_count ?? 0,
          dislike_count: (review as any).dislike_count ?? 0,
          comment_count: (review as any).comment_count ?? 0,
          payment_rating: (review as any).payment_rating ?? null,
          vibe_rating: (review as any).vibe_rating ?? null,
          users: usersMap.get(review.user_id) || undefined
        })) as BrandReview[];
      }
      
      return reviews.map(review => ({
        ...review,
        like_count: (review as any).like_count ?? 0,
        dislike_count: (review as any).dislike_count ?? 0,
        comment_count: (review as any).comment_count ?? 0,
        payment_rating: (review as any).payment_rating ?? null,
        vibe_rating: (review as any).vibe_rating ?? null,
      })) as BrandReview[];
    },
    enabled: !!brandId,
  });
};

// Create review
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      brand_id?: string;
      brand_name?: string;
      brand_name_normalized?: string;
      rating: number;
      payment_rating?: number;
      vibe_rating?: number;
      title: string;
      body?: string;
      work_type: string;
      deliverables?: string;
      payout?: number;
      currency?: string;
      time_to_pay_days?: number;
      would_work_again?: boolean;
      evidence_urls?: string[];
    }) => {
      const { data, error } = await supabase
        .from('brand_reviews')
        .insert([{
          ...review,
          brand_id: review.brand_id || null,
          brand_name: review.brand_name || null,
          brand_name_normalized: review.brand_name_normalized || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['brand-reviews', variables.brand_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['all-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['ugc-brands'] });
      toast({ title: 'Review posted successfully' });
    },
    onError: (error: any) => {
      if (error.message?.includes('instagram')) {
        toast({ 
          title: 'Instagram handle required', 
          description: 'You must add your Instagram handle in profile settings to post reviews',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Failed to post review', variant: 'destructive' });
      }
    },
  });
};

// Fetch questions for a brand
export const useBrandQuestions = (brandId?: string) => {
  return useQuery({
    queryKey: ['brand-questions', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      const { data, error } = await supabase
        .from('brand_questions')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const questions = data || [];
      const userIds = [...new Set(questions.map(q => q.user_id))];
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', userIds);
        
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        return questions.map(question => ({
          ...question,
          like_count: (question as any).like_count ?? 0,
          dislike_count: (question as any).dislike_count ?? 0,
          comment_count: (question as any).comment_count ?? 0,
          users: usersMap.get(question.user_id) || undefined
        })) as (BrandQuestion & { brand_answers?: any[] })[];
      }
      
      return questions.map(question => ({
        ...question,
        like_count: (question as any).like_count ?? 0,
        dislike_count: (question as any).dislike_count ?? 0,
        comment_count: (question as any).comment_count ?? 0,
      })) as (BrandQuestion & { brand_answers?: any[] })[];
    },
    enabled: !!brandId,
  });
};

// Create question
export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (question: {
      brand_id: string;
      title: string;
      body?: string;
    }) => {
      const { data, error } = await supabase
        .from('brand_questions')
        .insert([question])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-questions', variables.brand_id] });
      queryClient.invalidateQueries({ queryKey: ['all-questions'] });
      queryClient.invalidateQueries({ queryKey: ['ugc-brands'] });
      toast({ title: 'Question posted successfully' });
    },
    onError: (error: any) => {
      if (error.message?.includes('instagram')) {
        toast({ 
          title: 'Instagram handle required', 
          description: 'You must add your Instagram handle in profile settings to post questions',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Failed to post question', variant: 'destructive' });
      }
    },
  });
};

// Fetch answers for a question
export const useQuestionAnswers = (questionId?: string) => {
  return useQuery({
    queryKey: ['question-answers', questionId],
    queryFn: async () => {
      if (!questionId) return [];
      const { data, error } = await supabase
        .from('brand_answers')
        .select('*')
        .eq('question_id', questionId)
        .eq('status', 'published')
        .order('is_accepted', { ascending: false })
        .order('helpful_count', { ascending: false });
      if (error) throw error;
      
      const answers = data || [];
      const userIds = [...new Set(answers.map(a => a.user_id))];
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', userIds);
        
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        return answers.map(answer => ({
          ...answer,
          users: usersMap.get(answer.user_id) || undefined
        })) as BrandAnswer[];
      }
      
      return answers as BrandAnswer[];
    },
    enabled: !!questionId,
  });
};

// Create answer
export const useCreateAnswer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (answer: {
      question_id: string;
      body: string;
    }) => {
      const { data, error } = await supabase
        .from('brand_answers')
        .insert([answer])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['question-answers', variables.question_id] });
      toast({ title: 'Answer posted successfully' });
    },
    onError: (error: any) => {
      if (error.message?.includes('instagram')) {
        toast({ 
          title: 'Instagram handle required', 
          description: 'You must add your Instagram handle in profile settings to post answers',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Failed to post answer', variant: 'destructive' });
      }
    },
  });
};

// Fetch scam reports for a brand
export const useBrandScamReports = (brandId?: string) => {
  return useQuery({
    queryKey: ['brand-scams', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      const { data, error } = await supabase
        .from('brand_scam_reports')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const scams = data || [];
      const userIds = [...new Set(scams.map(s => s.user_id))];
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', userIds);
        
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        return scams.map(scam => ({
          ...scam,
          title: (scam as any).title ?? '',
          like_count: (scam as any).like_count ?? 0,
          dislike_count: (scam as any).dislike_count ?? 0,
          comment_count: (scam as any).comment_count ?? 0,
          users: usersMap.get(scam.user_id) || undefined
        })) as BrandScamReport[];
      }
      
      return scams.map(scam => ({
        ...scam,
        title: (scam as any).title ?? '',
        like_count: (scam as any).like_count ?? 0,
        dislike_count: (scam as any).dislike_count ?? 0,
        comment_count: (scam as any).comment_count ?? 0,
      })) as BrandScamReport[];
    },
    enabled: !!brandId,
  });
};

// Create scam report
export const useCreateScamReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (report: {
      brand_id: string;
      title: string;
      scam_type: string;
      description: string;
      evidence_urls?: string[];
    }) => {
      const { data, error } = await supabase
        .from('brand_scam_reports')
        .insert([report])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-scams', variables.brand_id] });
      queryClient.invalidateQueries({ queryKey: ['all-scams'] });
      queryClient.invalidateQueries({ queryKey: ['ugc-brands'] });
      toast({ title: 'Scam report submitted successfully' });
    },
    onError: (error: any) => {
      if (error.message?.includes('instagram')) {
        toast({ 
          title: 'Instagram handle required', 
          description: 'You must add your Instagram handle in profile settings to report scams',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Failed to submit scam report', variant: 'destructive' });
      }
    },
  });
};

// Vote (like/dislike)
export const useVoteContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentType, contentId, value }: { contentType: ContentType | 'comment'; contentId: string; value: 1 | -1 }) => {
      const { data, error } = await supabase
        .from('ugc_brand_votes' as any)
        .upsert([{ content_type: contentType, content_id: contentId, value }], {
          onConflict: 'content_type,content_id,user_id',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['brand-questions'] });
      queryClient.invalidateQueries({ queryKey: ['all-questions'] });
      queryClient.invalidateQueries({ queryKey: ['brand-scams'] });
      queryClient.invalidateQueries({ queryKey: ['all-scams'] });
      queryClient.invalidateQueries({ queryKey: ['question-answers'] });
      queryClient.invalidateQueries({ queryKey: ['content-comments'] });
    },
    onError: () => {
      toast({ title: 'Failed to submit vote', variant: 'destructive' });
    },
  });
};

// Report content
export const useReportContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentType, contentId, reason }: { contentType: ContentType; contentId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('ugc_brand_reports' as any)
        .insert([{ content_type: contentType, content_id: contentId, reason }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['brand-questions'] });
      queryClient.invalidateQueries({ queryKey: ['all-questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-answers'] });
      queryClient.invalidateQueries({ queryKey: ['brand-scams'] });
      queryClient.invalidateQueries({ queryKey: ['all-scams'] });
      toast({ title: 'Content reported. Thank you for keeping our community safe.' });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ title: 'You have already reported this content', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to report content', variant: 'destructive' });
      }
    },
  });
};

// Fetch ALL reviews across brands
export const useAllReviews = () => {
  return useQuery({
    queryKey: ['all-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_reviews')
        .select('*, ugc_brands(name, logo_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map(review => ({
        ...review,
        like_count: (review as any).like_count ?? 0,
        dislike_count: (review as any).dislike_count ?? 0,
        comment_count: (review as any).comment_count ?? 0,
        payment_rating: (review as any).payment_rating ?? null,
        vibe_rating: (review as any).vibe_rating ?? null,
        brand_name: (review as any).brand_name ?? null,
        brand_name_normalized: (review as any).brand_name_normalized ?? null,
      })) as (BrandReview & { ugc_brands?: { name: string; logo_url?: string }; brand_name?: string; brand_name_normalized?: string })[];
    },
  });
};

// Fetch ALL questions across brands
export const useAllQuestions = () => {
  return useQuery({
    queryKey: ['all-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_questions')
        .select('*, ugc_brands(name, logo_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map(question => ({
        ...question,
        like_count: (question as any).like_count ?? 0,
        dislike_count: (question as any).dislike_count ?? 0,
        comment_count: (question as any).comment_count ?? 0,
      })) as (BrandQuestion & { ugc_brands?: { name: string; logo_url?: string } })[];
    },
  });
};

// Fetch ALL scams across brands
export const useAllScams = () => {
  return useQuery({
    queryKey: ['all-scams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_scam_reports')
        .select('*, ugc_brands(name, logo_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map(scam => ({
        ...scam,
        title: (scam as any).title ?? '',
        like_count: (scam as any).like_count ?? 0,
        dislike_count: (scam as any).dislike_count ?? 0,
        comment_count: (scam as any).comment_count ?? 0,
      })) as (BrandScamReport & { ugc_brands?: { name: string; logo_url?: string } })[];
    },
  });
};

// Fetch content detail (review, question, or scam)
export const useContentDetail = (contentType: ContentType, contentId: string | null) => {
  return useQuery({
    queryKey: ['content-detail', contentType, contentId],
    queryFn: async () => {
      if (!contentId) return null;
      let tableName = '';
      if (contentType === 'review') tableName = 'brand_reviews';
      else if (contentType === 'question') tableName = 'brand_questions';
      else if (contentType === 'scam') tableName = 'brand_scam_reports';
      
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*, ugc_brands(name, logo_url)')
        .eq('id', contentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contentId,
  });
};

// Fetch comments for content
export const useContentComments = (contentType: ContentType, contentId: string | null) => {
  return useQuery({
    queryKey: ['content-comments', contentType, contentId],
    queryFn: async () => {
      if (!contentId) return [];
      const { data, error } = await supabase
        .from('ugc_brand_comments' as any)
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('status', 'published')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!contentId,
  });
};

// Create comment
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (comment: {
      content_type: ContentType;
      content_id: string;
      body: string;
    }) => {
      const { data, error } = await supabase
        .from('ugc_brand_comments' as any)
        .insert([comment])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-comments', variables.content_type, variables.content_id] });
      queryClient.invalidateQueries({ queryKey: ['brand-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['brand-questions'] });
      queryClient.invalidateQueries({ queryKey: ['all-questions'] });
      queryClient.invalidateQueries({ queryKey: ['brand-scams'] });
      queryClient.invalidateQueries({ queryKey: ['all-scams'] });
      toast({ title: 'Comment posted successfully' });
    },
    onError: (error: any) => {
      if (error.message?.includes('instagram')) {
        toast({ 
          title: 'Instagram handle required', 
          description: 'You must add your Instagram handle in profile settings to post comments',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Failed to post comment', variant: 'destructive' });
      }
    },
  });
};
