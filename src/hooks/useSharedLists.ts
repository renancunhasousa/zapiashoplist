
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthProvider';

export const useSharedLists = () => {
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [isLoadingSharedUsers, setIsLoadingSharedUsers] = useState(true);
  const [activeSharedUser, setActiveSharedUser] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load shared users when component mounts
  useEffect(() => {
    const fetchSharedUsers = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.rpc('get_shared_users');
        
        if (error) throw error;
        
        setSharedUsers(data.map((item: { shared_user_id: string }) => item.shared_user_id) || []);
      } catch (error) {
        console.error('Error fetching shared users:', error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar usuários compartilhados.",
        });
      } finally {
        setIsLoadingSharedUsers(false);
      }
    };

    fetchSharedUsers();
  }, [user, toast]);

  const handleToggleSharedView = (userId: string | null) => {
    setActiveSharedUser(userId);
  };

  return {
    sharedUsers,
    setSharedUsers,
    isLoadingSharedUsers,
    activeSharedUser,
    handleToggleSharedView
  };
};
