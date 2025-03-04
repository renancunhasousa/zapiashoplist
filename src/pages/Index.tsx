
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

  // Load data from Supabase on initial render
  useEffect(() => {
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
  }, [user]);
  
  // Fetch items when category changes
  useEffect(() => {
    if (user) {
      fetchItems(selectedCategory);
    }
  }, [selectedCategory, user]);

  const fetchItems = async (category: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
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
    if (!user) return;
    
    try {
      // Get highest position number to place new item at the end
      const highestPosition = items.length > 0 
        ? Math.max(...items.map(item => parseInt(item.id))) + 1 
        : 0;
      
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name,
        checked: false,
        category: selectedCategory,
        value,
        link,
      };
      
      // Add item to Supabase
      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          name: newItem.name,
          checked: newItem.checked,
          category: newItem.category,
          value: newItem.value,
          link: newItem.link,
          position: highestPosition
        })
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        // Update local state with the item returned from Supabase (with proper ID)
        const dbItem: ShoppingItem = {
          id: data[0].id,
          name: data[0].name,
          checked: data[0].checked,
          category: data[0].category as ItemCategory,
          value: data[0].value || undefined,
          link: data[0].link || undefined,
        };
        
        setItems((prev) => [...prev, dbItem]);
        
        toast({
          description: "Item adicionado com sucesso!",
        });
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao adicionar item.",
      });
    }
  };

  const toggleItem = async (id: string) => {
    if (!user) return;
    
    try {
      // Find the item to toggle
      const itemToToggle = items.find(item => item.id === id);
      if (!itemToToggle) return;
      
      // Update in Supabase
      const { error } = await supabase
        .from('items')
        .update({ checked: !itemToToggle.checked })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setItems((prev) => {
        const updatedItems = prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        );
        
        return updatedItems.sort((a, b) => {
          if (a.checked === b.checked) return 0;
          return a.checked ? 1 : -1;
        });
      });
    } catch (error) {
      console.error("Error toggling item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao atualizar item.",
      });
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return;
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setItems((prev) => prev.filter((item) => item.id !== id));
      
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
    if (!user || items.length === 0) return;
    
    try {
      // Delete all items in the selected category
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('user_id', user.id)
        .eq('category', selectedCategory);
        
      if (error) throw error;
      
      // Update local state
      setItems([]);
      
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
    if (!user) return;
    
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
                .eq('id', reorderedItems[i].id)
                .eq('user_id', user.id);
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

  // Check for shared list data in URL when component mounts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedListParam = urlParams.get('sharedList');
    
    if (sharedListParam && user) {
      try {
        const sharedData = JSON.parse(decodeURIComponent(sharedListParam));
        
        // Ask user if they want to import the shared list
        if (window.confirm("Deseja importar esta lista compartilhada?")) {
          // Import the shared items to user's account
          const importSharedItems = async () => {
            if (!sharedData.items || !user) return;
            
            try {
              // First, clear existing items in the category
              await supabase
                .from('items')
                .delete()
                .eq('user_id', user.id)
                .eq('category', sharedData.category);
              
              // Add the shared items under the user's account
              const itemsToAdd = sharedData.items.map((item: ShoppingItem, index: number) => ({
                user_id: user.id,
                name: item.name,
                checked: item.checked,
                category: item.category,
                value: item.value || null,
                link: item.link || null,
                position: index
              }));
              
              if (itemsToAdd.length > 0) {
                await supabase.from('items').insert(itemsToAdd);
              }
              
              // Update local state
              if (sharedData.category) setSelectedCategory(sharedData.category);
              
              // Fetch the newly imported items
              fetchItems(sharedData.category);
              
              toast({
                description: "Lista compartilhada importada com sucesso!",
              });
            } catch (error) {
              console.error("Error importing shared items:", error);
              toast({
                variant: "destructive",
                description: "Erro ao importar lista compartilhada.",
              });
            }
          };
          
          importSharedItems();
        }
        
        // Clean up the URL after importing
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error("Error parsing shared list data:", error);
        toast({
          variant: "destructive",
          description: "Erro ao importar lista compartilhada.",
        });
        // Clean up the URL even on error
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user, toast]);

  const filteredItems = items.filter(item => 
    item.category === selectedCategory
  );

  // Determine colors for group buttons with new specified colors
  const getGroupButtonColor = (index: number, isSelected: boolean) => {
    if (isSelected) {
      return "bg-[#f85afa] bg-opacity-90 ring-2 ring-white text-white";
    }
    return "bg-[#87d3e3] hover:bg-[#87d3e3]/90 text-white";
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f85afa]"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 to-purple-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="p-4 flex flex-col h-full">
                  <GroupManagement groups={groups} setGroups={setGroups} />
                  
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-gray-700"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
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
                  const isSelected = selectedCategory === categoryName;
                  
                  return (
                    <Button
                      key={group}
                      variant="outline"
                      onClick={() => setSelectedCategory(categoryName)}
                      className={`rounded-full shadow-lg ${getGroupButtonColor(index, isSelected)}`}
                    >
                      {group}
                    </Button>
                  );
                })}
              </div>

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
