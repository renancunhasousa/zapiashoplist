
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import AddItemDialog from "@/components/AddItemDialog";
import ShoppingListHeader from "@/components/ShoppingListHeader";
import ShoppingListItem from "@/components/ShoppingListItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, User, List, Share2 } from "lucide-react";
import GroupManagement from "@/components/GroupManagement";
import SharedListsManager from "@/components/SharedListsManager";
import SharedListsView from "@/components/SharedListsView";
import { useSharedLists } from "@/hooks/useSharedLists";
import { useMobile } from "@/hooks/use-mobile";

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  user_id: string;
  category: string;
  value?: string;
  link?: string;
  position: number;
}

const Index = () => {
  // App State
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("list");
  
  // Shared lists functionality
  const { 
    sharedUsers, 
    setSharedUsers, 
    activeSharedUser, 
    handleToggleSharedView 
  } = useSharedLists();

  // Fetch user's groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('name')
          .eq('user_id', user.id)
          .order('name');
        
        if (error) throw error;
        
        const groupNames = data.map(group => group.name);
        
        if (groupNames.length === 0) {
          // Create default group if none exists
          const { error: insertError } = await supabase
            .from('groups')
            .insert({
              user_id: user.id,
              name: 'Lista Principal'
            });
          
          if (insertError) throw insertError;
          
          setGroups(['Lista Principal']);
          setCurrentGroup('Lista Principal');
        } else {
          setGroups(groupNames);
          setCurrentGroup(groupNames[0]);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar grupos.",
        });
      }
    };

    fetchGroups();
  }, [user, toast]);

  // Fetch user's items for current group
  useEffect(() => {
    const fetchItems = async () => {
      if (!user || !currentGroup || activeSharedUser) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', user.id)
          .eq('category', currentGroup)
          .order('position');
        
        if (error) throw error;
        
        setItems(data || []);
      } catch (error) {
        console.error('Error fetching items:', error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar itens.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();

    // Subscribe to realtime updates
    if (user && currentGroup && !activeSharedUser) {
      const channel = supabase
        .channel('items_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'items',
            filter: `user_id=eq.${user.id}` + (currentGroup ? `&category=eq.${currentGroup}` : '')
          },
          () => {
            fetchItems();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, currentGroup, activeSharedUser, toast]);

  const handleToggle = async (id: string) => {
    if (!user || activeSharedUser) return;
    
    try {
      const itemToUpdate = items.find(item => item.id === id);
      if (!itemToUpdate) return;

      const { error } = await supabase
        .from('items')
        .update({ checked: !itemToUpdate.checked })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setItems(items.map(item => 
        item.id === id 
          ? { ...item, checked: !item.checked } 
          : item
      ));
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        variant: "destructive",
        description: "Erro ao atualizar item.",
      });
    }
  };

  const handleAddItem = () => {
    if (!activeSharedUser) {
      setIsDialogOpen(true);
    }
  };

  const handleDialogClose = (newItem?: Omit<ShoppingItem, 'id' | 'user_id' | 'position'>) => {
    setIsDialogOpen(false);
    
    if (newItem && currentGroup && user) {
      const addItem = async () => {
        try {
          // Find max position
          const maxPosition = items.reduce(
            (max, item) => (item.position > max ? item.position : max),
            0
          );

          const { data, error } = await supabase
            .from('items')
            .insert({
              name: newItem.name,
              checked: newItem.checked,
              category: currentGroup,
              user_id: user.id,
              position: maxPosition + 1,
              value: newItem.value,
              link: newItem.link
            })
            .select();

          if (error) throw error;
          
          if (data && data[0]) {
            setItems([...items, data[0]]);
            toast({
              description: "Item adicionado com sucesso!",
            });
          }
        } catch (error) {
          console.error('Error adding item:', error);
          toast({
            variant: "destructive",
            description: "Erro ao adicionar item.",
          });
        }
      };
      
      addItem();
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || activeSharedUser) return;
    
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setItems(items.filter(item => item.id !== id));
      
      toast({
        description: "Item removido com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        variant: "destructive",
        description: "Erro ao remover item.",
      });
    }
  };

  const handleReset = async () => {
    if (!user || !currentGroup || activeSharedUser) return;
    
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('user_id', user.id)
        .eq('category', currentGroup);

      if (error) throw error;
      
      // Update local state
      setItems([]);
      
      toast({
        description: "Lista limpa com sucesso!",
      });
    } catch (error) {
      console.error('Error resetting list:', error);
      toast({
        variant: "destructive",
        description: "Erro ao limpar lista.",
      });
    }
  };

  // If the current group is deleted, select the first group
  useEffect(() => {
    if (groups.length > 0 && currentGroup && !groups.includes(currentGroup)) {
      setCurrentGroup(groups[0]);
    }
  }, [groups, currentGroup]);

  // Show shared view if there's an active shared user
  if (activeSharedUser) {
    return (
      <SharedListsView 
        userId={activeSharedUser}
        onBack={() => handleToggleSharedView(null)}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Lista de Compras</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentTab('profile')}>
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Tabs 
        defaultValue="list" 
        value={currentTab} 
        onValueChange={setCurrentTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className={isMobile ? "hidden" : ""}>Lista</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className={isMobile ? "hidden" : ""}>Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="shared" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className={isMobile ? "hidden" : ""}>Compartilhar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Group tabs */}
          <div className="flex overflow-x-auto pb-2 gap-2">
            {groups.map((group) => (
              <Button
                key={group}
                variant={currentGroup === group ? "default" : "outline"}
                className="whitespace-nowrap"
                onClick={() => setCurrentGroup(group)}
              >
                {group}
              </Button>
            ))}
          </div>

          {/* Items list */}
          <div className="space-y-4 mb-24">
            <ShoppingListHeader
              onAddItem={handleAddItem}
              onReset={handleReset}
              disabled={false}
            />

            {isLoading ? (
              <div className="flex justify-center py-8">
                <p>Carregando...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum item na lista</p>
                <p className="text-sm mt-2">Clique em + para adicionar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    disabled={false}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="groups">
          <GroupManagement 
            groups={groups} 
            setGroups={setGroups} 
          />
        </TabsContent>
        
        <TabsContent value="shared">
          <SharedListsManager 
            sharedUsers={sharedUsers}
            setSharedUsers={setSharedUsers}
            onToggleView={handleToggleSharedView}
            activeSharedUser={activeSharedUser}
          />
        </TabsContent>

        <TabsContent value="profile">
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Perfil</h2>
            {user && (
              <div className="space-y-4">
                <p>Email: {user.email}</p>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  Sair
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AddItemDialog 
        open={isDialogOpen} 
        onClose={handleDialogClose} 
      />
    </div>
  );
};

export default Index;
