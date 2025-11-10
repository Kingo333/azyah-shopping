import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UGCBrandStats, BrandReview, BrandQuestion, BrandAnswer, BrandScamReport, ContentType } from '@/types/ugcBrand';
import { toast } from 'sonner';

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
      toast.success('Brand added successfully');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Brand already exists');
      } else {
        toast.error('Failed to add brand');
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
          users: usersMap.get(review.user_id) || undefined
        })) as BrandReview[];
      }
      
      return reviews as BrandReview[];
    },
    enabled: !!brandId,
  });
};

// Create review
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      brand_id: string;
      rating: number;
      title: string;
      body?: string;
      work_type: string;
      deliverables?: string;
      payout?: number;
      currency?: string;
      time_to_pay_days?: number;
      communication_rating?: number;
      fairness_rating?: number;
      would_work_again?: boolean;
      evidence_urls?: string[];
      is_anonymous?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('brand_reviews')
        .insert([review])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-reviews', variables.brand_id] });
      queryClient.invalidateQueries({ queryKey: ['ugc-brands'] });
      toast.success('Review posted successfully');
    },
    onError: () => {
      toast.error('Failed to post review');
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
          users: usersMap.get(question.user_id) || undefined
        })) as (BrandQuestion & { brand_answers?: any[] })[];
      }
      
      return questions as (BrandQuestion & { brand_answers?: any[] })[];
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
      queryClient.invalidateQueries({ queryKey: ['ugc-brands'] });
      toast.success('Question posted successfully');
    },
    onError: () => {
      toast.error('Failed to post question');
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
      toast.success('Answer posted successfully');
    },
    onError: () => {
      toast.error('Failed to post answer');
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
          users: usersMap.get(scam.user_id) || undefined
        })) as BrandScamReport[];
      }
      
      return scams as BrandScamReport[];
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
      queryClient.invalidateQueries({ queryKey: ['ugc-brands'] });
      toast.success('Scam report submitted successfully');
    },
    onError: () => {
      toast.error('Failed to submit scam report');
    },
  });
};

// Vote (helpful/not helpful)
export const useVoteContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentType, contentId, value }: { contentType: ContentType; contentId: string; value: 1 | -1 }) => {
      const { data, error } = await supabase
        .from('ugc_brand_votes')
        .upsert([{ content_type: contentType, content_id: contentId, value }], {
          onConflict: 'content_type,content_id,user_id',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.contentType === 'review') {
        queryClient.invalidateQueries({ queryKey: ['brand-reviews'] });
      } else if (variables.contentType === 'answer') {
        queryClient.invalidateQueries({ queryKey: ['question-answers'] });
      }
      toast.success(variables.value === 1 ? 'Marked as helpful' : 'Marked as not helpful');
    },
    onError: () => {
      toast.error('Failed to submit vote');
    },
  });
};

// Report content
export const useReportContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentType, contentId, reason }: { contentType: ContentType; contentId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('ugc_brand_reports')
        .insert([{ content_type: contentType, content_id: contentId, reason }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['brand-questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-answers'] });
      queryClient.invalidateQueries({ queryKey: ['brand-scams'] });
      toast.success('Content reported. Thank you for keeping our community safe.');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('You have already reported this content');
      } else {
        toast.error('Failed to report content');
      }
    },
  });
};
