import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, Share2 } from "lucide-react";
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

const LOCAL_STORAGE_KEY = "shoppingListData";

const Index = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("groceries");
  const [groups, setGroups] = useState<string[]>(["Mercado", "Presentes", "Outros"]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const { toast } = useToast();

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const { savedItems, savedGroups } = JSON.parse(savedData);
        if (savedItems) setItems(savedItems);
        if (savedGroups) setGroups(savedGroups);
      } catch (error) {
        console.error("Error parsing saved data:", error);
      }
    }
  }, []);

  // Save data to localStorage whenever items or groups change
  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY, 
      JSON.stringify({ 
        savedItems: items, 
        savedGroups: groups 
      })
    );
  }, [items, groups]);

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

  const addItem = (name: string, value?: string, link?: string) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name,
      checked: false,
      category: selectedCategory,
      value,
      link,
    };
    setItems((prev) => [...prev, newItem]);
    toast({
      description: "Item adicionado com sucesso!",
    });
  };

  const toggleItem = (id: string) => {
    setItems((prev) => {
      const updatedItems = prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      
      return updatedItems.sort((a, b) => {
        if (a.checked === b.checked) return 0;
        return a.checked ? 1 : -1;
      });
    });
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast({
      description: "Item removido com sucesso!",
    });
  };

  const resetList = () => {
    if (items.length > 0) {
      setItems([]);
      toast({
        description: "Lista limpa com sucesso!",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
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
    
    if (sharedListParam) {
      try {
        const sharedData = JSON.parse(decodeURIComponent(sharedListParam));
        
        // Ask user if they want to import the shared list
        if (window.confirm("Deseja importar esta lista compartilhada?")) {
          if (sharedData.items) setItems(sharedData.items);
          if (sharedData.groups) setGroups(sharedData.groups);
          if (sharedData.category) setSelectedCategory(sharedData.category);
          
          // Clean up the URL after importing
          window.history.replaceState({}, document.title, window.location.pathname);
          
          toast({
            description: "Lista compartilhada importada com sucesso!",
          });
        } else {
          // User declined, clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
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
  }, [toast]);

  const filteredItems = items.filter(item => 
    item.category === selectedCategory
  );

  // Determine colors for group buttons with new specified colors
  const getGroupButtonColor = (index: number, isSelected: boolean) => {
    if (isSelected) {
      return "bg-[#f85afa] bg-opacity-90 ring-2 ring-white border-2 border-black";
    }
    return "bg-[#87d3e3] hover:bg-[#87d3e3]/90";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 to-purple-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <GroupManagement groups={groups} setGroups={setGroups} />
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
                  <Button 
                    variant="outline" 
                    className="rounded-full shadow-md"
                    onClick={generateShareableLink}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                  <p className="text-xs text-gray-500 max-w-[150px]">
                    Compartilhe sua lista com amigos e família
                  </p>
                </div>
              </div>

              <div className="mb-4 text-center">
                <img 
                  src="/lovable-uploads/3d145300-d394-4144-bbe2-aee6cffc191e.png" 
                  alt="ZADA" 
                  className="h-20 mx-auto"
                />
              </div>

              <ShoppingListHeader 
                onAddItem={() => setDialogOpen(true)} 
                onReset={resetList} 
              />
              
              <div className="flex gap-2 mb-8 justify-center">
                {groups.map((group, index) => {
                  const categoryName = group === "Mercado" ? "groceries" : group === "Presentes" ? "presents" : "other";
                  const isSelected = selectedCategory === categoryName;
                  
                  return (
                    <Button
                      key={group}
                      variant="outline"
                      onClick={() => setSelectedCategory(categoryName)}
                      className={`rounded-full shadow-lg text-black ${getGroupButtonColor(index, isSelected)}`}
                    >
                      {group}
                    </Button>
                  );
                })}
              </div>
              
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
