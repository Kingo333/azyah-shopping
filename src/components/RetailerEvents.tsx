import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Plus, Edit, Trash2, Upload, Image } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EventCatalogManager } from './EventCatalogManager';

interface RetailEvent {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  status: string;
  retailer_id: string;
  banner_image_url?: string;
  created_at: string;
}

interface RetailerEventsProps {
  retailerId: string;
}

export const RetailerEvents: React.FC<RetailerEventsProps> = ({ retailerId }) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<RetailEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RetailEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RetailEvent | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    end_date: '',
    location: '',
    status: 'draft' as 'draft' | 'active' | 'ended',
    banner_image_url: ''
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [retailerId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('retail_events')
        .select('*')
        .eq('retailer_id', retailerId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      event_date: '',
      end_date: '',
      location: '',
      status: 'draft',
      banner_image_url: ''
    });
    setBannerFile(null);
  };

  const uploadBannerImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingBanner(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `event-banners/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Banner upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload banner image",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleCreate = async () => {
    try {
      let bannerUrl = formData.banner_image_url;
      
      if (bannerFile) {
        bannerUrl = await uploadBannerImage(bannerFile);
        if (!bannerUrl) return; // Upload failed
      }

      const { error } = await supabase
        .from('retail_events')
        .insert({
          ...formData,
          banner_image_url: bannerUrl,
          retailer_id: retailerId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully"
      });

      setIsCreateModalOpen(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive"
      });
    }
  };

  const handleEdit = async () => {
    if (!editingEvent) return;

    try {
      let bannerUrl = formData.banner_image_url;
      
      if (bannerFile) {
        bannerUrl = await uploadBannerImage(bannerFile);
        if (!bannerUrl) return; // Upload failed
      }

      const { error } = await supabase
        .from('retail_events')
        .update({
          ...formData,
          banner_image_url: bannerUrl
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully"
      });

      setIsEditModalOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('retail_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully"
      });

      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (event: RetailEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || '',
      event_date: event.event_date,
      end_date: event.end_date || '',
      location: event.location || '',
      status: event.status as 'draft' | 'active' | 'ended',
      banner_image_url: event.banner_image_url || ''
    });
    setIsEditModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  if (selectedEvent) {
    return (
      <div>
        <Button 
          variant="outline" 
          onClick={() => setSelectedEvent(null)}
          className="mb-6"
        >
          ← Back to Events
        </Button>
        <EventCatalogManager 
          eventId={selectedEvent.id} 
          eventName={selectedEvent.name} 
          onBack={() => setSelectedEvent(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Events</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No events created yet. Create your first event to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {event.name}
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </CardTitle>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                       <div className="flex items-center gap-1">
                         <Calendar className="w-4 h-4" />
                         {format(new Date(event.event_date), 'MMMM d, yyyy')}
                         {event.end_date && event.end_date !== event.event_date && (
                           <span> - {format(new Date(event.end_date), 'MMMM d, yyyy')}</span>
                         )}
                       </div>
                       {event.location && (
                         <div className="flex items-center gap-1">
                           <MapPin className="w-4 h-4" />
                           {event.location}
                         </div>
                       )}
                     </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditModal(event)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
               <CardContent>
                 {event.banner_image_url && (
                   <div className="mb-4">
                     <img
                       src={event.banner_image_url}
                       alt={event.name}
                       className="w-full h-32 object-cover rounded-lg"
                     />
                   </div>
                 )}
                 {event.description && (
                   <p className="text-muted-foreground mb-4">{event.description}</p>
                 )}
                 <Button onClick={() => setSelectedEvent(event)}>
                   Manage Brands
                 </Button>
               </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Event Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Fashion Week Dubai"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Banner Image</label>
              <div className="space-y-2">
                {(bannerFile || formData.banner_image_url) && (
                  <div className="w-full h-24 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={bannerFile ? URL.createObjectURL(bannerFile) : formData.banner_image_url}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setBannerFile(file);
                    }}
                    className="flex-1"
                  />
                  {(bannerFile || formData.banner_image_url) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBannerFile(null);
                        setFormData(prev => ({ ...prev, banner_image_url: '' }));
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Dubai, UAE"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={uploadingBanner} className="flex-1">
                {uploadingBanner ? 'Uploading...' : 'Create Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Event Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Fashion Week Dubai"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Banner Image</label>
              <div className="space-y-2">
                {(bannerFile || formData.banner_image_url) && (
                  <div className="w-full h-24 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={bannerFile ? URL.createObjectURL(bannerFile) : formData.banner_image_url}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setBannerFile(file);
                    }}
                    className="flex-1"
                  />
                  {(bannerFile || formData.banner_image_url) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBannerFile(null);
                        setFormData(prev => ({ ...prev, banner_image_url: '' }));
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Dubai, UAE"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEvent(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={uploadingBanner} className="flex-1">
                {uploadingBanner ? 'Uploading...' : 'Update Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};