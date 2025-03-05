
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, Share2, LogOut } from "lucide-react";
import ShoppingListHeader from "@/components/ShoppingListHeader";
import ShoppingListItem, { ShoppingItem, ItemCategory } from "@/components/ShoppingListItem";
import AddItemDialog from "@/components/AddItemDialog";
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import GroupManagement from "@/components/GroupManagement";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  TouchSensor
} from "@dnd-kit/core";
import { 
  arrayMove,
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { RealtimeChannel } from "@supabase/supabase-js";

const Index = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("groceries");
  const [groups, setGroups] = useState<string[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const [isSharedList, setIsSharedList] = useState(false);
  const [sharedListData, setSharedListData] = useState<any>(null);

  // Check for shared list on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedListParam = urlParams.get('sharedList');
    
    if (sharedListParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(sharedListParam));
        setIsSharedList(true);
        setSharedListData(parsedData);
        
        // Set initial data from shared list
        if (parsedData.items) {
          setItems(parsedData.items);
        }
        if (parsedData.groups) {
          setGroups(parsedData.groups);
        }
        if (parsedData.category) {
          setSelectedCategory(parsedData.category);
        }
        
        // Show toast to indicate we're in shared list mode
        toast({
          description: "Você está visualizando uma lista compartilhada.",
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing shared list data:", error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar lista compartilhada.",
        });
      }
    }
  }, []);

  // Load data from Supabase on initial render for authenticated users
  useEffect(() => {
    // Skip if viewing a shared list
    if (isSharedList) return;
    
    const fetchUserData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch user's groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (groupsError) throw groupsError;
        
        if (groupsData && groupsData.length > 0) {
          setGroups(groupsData.map(group => group.name));
        } else {
          // Create default groups if user has none
          const defaultGroups = ["Mercado", "Presentes", "Outros"];
          for (const groupName of defaultGroups) {
            await supabase.from('groups').insert({
              user_id: user.id,
              name: groupName
            });
          }
          setGroups(defaultGroups);
        }
        
        // Fetch user's items for the selected category
        await fetchItems(selectedCategory);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar seus dados.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, isSharedList]);
  
  // Fetch items when category changes for authenticated users
  useEffect(() => {
    // Skip if viewing a shared list
    if (isSharedList) return;
    
    if (user) {
      fetchItems(selectedCategory);
    }
  }, [selectedCategory, user, isSharedList]);

  // Set up realtime subscription
  useEffect(() => {
    // Unsubscribe from previous channel if exists
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    
    // Determine what to listen for based on whether this is a shared list or not
    let channel;
    
    if (isSharedList && sharedListData) {
      // For shared lists, listen for changes to all items in the selected category
      // without user_id filter
      channel = supabase.channel('public:items:shared')
        .on('postgres_changes', {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'items',
          filter: `category=eq.${sharedListData.category}`,
        }, (payload) => {
          console.log('Shared list realtime event received:', payload);
          handleRealtimeUpdate(payload);
        })
        .subscribe((status) => {
          console.log('Shared realtime subscription status:', status);
        });
    } else if (user) {
      // For authenticated users, listen for changes to their own items
      channel = supabase.channel('public:items:auth')
        .on('postgres_changes', {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'items',
          filter: `category=eq.${selectedCategory}`,
        }, (payload) => {
          console.log('Auth user realtime event received:', payload);
          handleRealtimeUpdate(payload);
        })
        .subscribe((status) => {
          console.log('Auth realtime subscription status:', status);
        });
    }
    
    if (channel) {
      setRealtimeChannel(channel);
    }
    
    // Cleanup function to remove the channel subscription
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, selectedCategory, isSharedList, sharedListData]);

  // Handle realtime updates
  const handleRealtimeUpdate = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newItem = payload.new as any;
      
      // Convert to ShoppingItem format
      const shoppingItem: ShoppingItem = {
        id: newItem.id,
        name: newItem.name,
        checked: newItem.checked,
        category: newItem.category as ItemCategory,
        value: newItem.value || undefined,
        link: newItem.link || undefined,
      };
      
      // Check if item already exists to avoid duplicates
      setItems(current => {
        if (current.some(item => item.id === shoppingItem.id)) {
          return current;
        }
        return [...current, shoppingItem];
      });
    } 
    else if (payload.eventType === 'UPDATE') {
      const updatedItem = payload.new as any;
      
      setItems(current => 
        current.map(item => 
          item.id === updatedItem.id 
            ? {
                ...item,
                name: updatedItem.name,
                checked: updatedItem.checked,
                value: updatedItem.value || undefined,
                link: updatedItem.link || undefined,
              } 
            : item
        )
      );
    } 
    else if (payload.eventType === 'DELETE') {
      const deletedItemId = payload.old.id;
      setItems(current => current.filter(item => item.id !== deletedItemId));
    }
  };

  const fetchItems = async (category: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category', category)
        .order('position', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        const formattedItems: ShoppingItem[] = data.map(item => ({
          id: item.id,
          name: item.name,
          checked: item.checked,
          category: item.category as ItemCategory,
          value: item.value || undefined,
          link: item.link || undefined,
        }));
        
        setItems(formattedItems);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  // DnD sensors setup with improved mobile support
  const isMobile = useIsMobile();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Lower distance for mobile
        distance: isMobile ? 5 : 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addItem = async (name: string, value?: string, link?: string) => {
    if (!user && !isSharedList) return;
    
    try {
      // Get highest position number to place new item at the end
      const highestPosition = items.length > 0 
        ? Math.max(...items.map(item => typeof item.id === 'string' ? parseInt(item.id) : 0)) + 1 
        : 0;
      
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name,
        checked: false,
        category: isSharedList ? sharedListData.category : selectedCategory,
        value,
        link,
      };
      
      // Add item to Supabase
      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: user ? user.id : '00000000-0000-0000-0000-000000000000', // Use a default ID for shared lists
          name: newItem.name,
          checked: newItem.checked,
          category: newItem.category,
          value: newItem.value,
          link: newItem.link,
          position: highestPosition
        })
        .select();
        
      if (error) throw error;
      
      toast({
        description: "Item adicionado com sucesso!",
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao adicionar item.",
      });
    }
  };

  const toggleItem = async (id: string) => {
    if (!user && !isSharedList) return;
    
    try {
      // Find the item to toggle
      const itemToToggle = items.find(item => item.id === id);
      if (!itemToToggle) return;
      
      // Update in Supabase
      const { error } = await supabase
        .from('items')
        .update({ checked: !itemToToggle.checked })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error("Error toggling item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao atualizar item.",
      });
    }
  };

  const deleteItem = async (id: string) => {
    if (!user && !isSharedList) return;
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        description: "Item removido com sucesso!",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao remover item.",
      });
    }
  };

  const resetList = async () => {
    if ((!user && !isSharedList) || items.length === 0) return;
    
    try {
      // Delete all items in the selected category
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('category', isSharedList ? sharedListData.category : selectedCategory);
        
      if (error) throw error;
      
      toast({
        description: "Lista limpa com sucesso!",
      });
    } catch (error) {
      console.error("Error resetting list:", error);
      toast({
        variant: "destructive",
        description: "Erro ao limpar lista.",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!user && !isSharedList) return;
    
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Update positions in Supabase (in background)
        const updatePositions = async () => {
          try {
            // Update each item's position
            for (let i = 0; i < reorderedItems.length; i++) {
              await supabase
                .from('items')
                .update({ position: i })
                .eq('id', reorderedItems[i].id);
            }
          } catch (error) {
            console.error("Error updating positions:", error);
          }
        };
        
        updatePositions();
        
        return reorderedItems;
      });
    }
  };

  const generateShareableLink = () => {
    // Create a JSON object with the current list data
    const dataToShare = {
      items: filteredItems,
      groups: groups,
      category: selectedCategory
    };
    
    // Encode the data as a URL-safe string
    const encodedData = encodeURIComponent(JSON.stringify(dataToShare));
    
    // Create a shareable link with the data as a parameter
    const baseUrl = window.location.origin;
    const shareableLink = `${baseUrl}?sharedList=${encodedData}`;
    
    setShareableLink(shareableLink);
    setShareDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({
      description: "Link copiado para a área de transferência!",
    });
    setShareDialogOpen(false);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: "destructive",
        description: "Erro ao sair.",
      });
    }
  };

  const filteredItems = items.filter(item => 
    isSharedList 
      ? item.category === sharedListData?.category 
      : item.category === selectedCategory
  );

  // Determine colors for group buttons with new specified colors
  const getGroupButtonColor = (index: number, isSelected: boolean) => {
    if (isSelected) {
      return "bg-[#f85afa] bg-opacity-90 ring-2 ring-white text-white";
    }
    return "bg-[#87d3e3] hover:bg-[#87d3e3]/90 text-white";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f85afa]"></div>
      </div>
    );
  }

  // The rest of the component remains mostly the same
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 to-purple-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="p-4 flex flex-col h-full">
                  {!isSharedList && (
                    <GroupManagement groups={groups} setGroups={setGroups} />
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    {!isSharedList && user && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-gray-700"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </Button>
                    )}
                    
                    {isSharedList && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-gray-700"
                        onClick={() => {
                          // Clear URL parameters and reload the page
                          window.history.replaceState({}, document.title, window.location.pathname);
                          window.location.reload();
                        }}
                      >
                        Voltar
                      </Button>
                    )}
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1">
          <div className="py-8 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <SidebarTrigger>
                  <Button variant="ghost" size="icon" className="rounded-full shadow-md">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SidebarTrigger>
                
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 max-w-[150px] text-right">
                    Compartilhe sua lista com amigos e família
                  </p>
                  <Button 
                    variant="outline" 
                    className="rounded-full shadow-md"
                    onClick={generateShareableLink}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>
              </div>

              <div className="mb-4 text-center">
                <img 
                  src="/lovable-uploads/3d145300-d394-4144-bbe2-aee6cffc191e.png" 
                  alt="ZADA" 
                  className="h-20 mx-auto"
                />
              </div>
              
              <div className="flex gap-2 mb-6 justify-center">
                {groups.map((group, index) => {
                  const categoryName = group === "Mercado" ? "groceries" : group === "Presentes" ? "presents" : "other";
                  const isSelected = isSharedList 
                    ? sharedListData?.category === categoryName
                    : selectedCategory === categoryName;
                  
                  return (
                    <Button
                      key={group}
                      variant="outline"
                      onClick={() => !isSharedList && setSelectedCategory(categoryName)}
                      disabled={isSharedList}
                      className={`rounded-full shadow-lg ${getGroupButtonColor(index, isSelected)}`}
                    >
                      {group}
                    </Button>
                  );
                })}
              </div>

              {isSharedList && (
                <div className="mb-4 p-3 bg-purple-100 rounded-md text-center text-sm">
                  <p className="font-medium text-purple-800">
                    Você está visualizando uma lista compartilhada
                  </p>
                </div>
              )}

              <ShoppingListHeader 
                onAddItem={() => setDialogOpen(true)} 
                onReset={resetList} 
              />
              
              <div className="space-y-2 mt-8">
                {filteredItems.length === 0 ? (
                  <p className="text-center text-gray-500">
                    Sua lista está vazia. Adicione alguns itens!
                  </p>
                ) : (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={filteredItems}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredItems.map((item) => (
                        <ShoppingListItem
                          key={item.id}
                          item={item}
                          onToggle={toggleItem}
                          onDelete={deleteItem}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <AddItemDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onAdd={(name, value, link) => {
                  addItem(name, value, link);
                  setDialogOpen(false);
                }}
              />
              
              {/* Share Dialog */}
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Compartilhar lista</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center space-x-2 py-4">
                    <Input
                      value={shareableLink}
                      readOnly
                      className="flex-1"
                    />
                    <Button type="submit" onClick={copyToClipboard}>
                      Copiar
                    </Button>
                  </div>
                  <DialogFooter className="sm:justify-start">
                    <p className="text-sm text-gray-500">
                      Compartilhe este link para que outras pessoas possam acessar sua lista.
                    </p>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
