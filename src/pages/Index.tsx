
import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, ShoppingCart } from "lucide-react";
import ShoppingListHeader from "@/components/ShoppingListHeader";
import ShoppingListItem, { ShoppingItem, ItemCategory } from "@/components/ShoppingListItem";
import AddItemDialog from "@/components/AddItemDialog";
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import GroupManagement from "@/components/GroupManagement";

const Index = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("groceries");
  const [groups, setGroups] = useState<string[]>(["Mercado", "Presentes", "Outros"]);
  const { toast } = useToast();

  const addItem = (name: string) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name,
      checked: false,
      category: selectedCategory,
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

  const filteredItems = items.filter(item => 
    selectedCategory === "other" ? true : item.category === selectedCategory
  );

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
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SidebarTrigger>
              </div>

              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="h-8 w-8 text-purple-600" />
                </div>
                
                <div className="flex gap-2 mb-4">
                  {groups.map((group) => (
                    <Button
                      key={group}
                      variant={selectedCategory === (group === "Mercado" ? "groceries" : group === "Presentes" ? "presents" : "other") ? "default" : "outline"}
                      onClick={() => setSelectedCategory(group === "Mercado" ? "groceries" : group === "Presentes" ? "presents" : "other")}
                      className={`rounded-full shadow-sm ${
                        group === "Mercado" ? "bg-purple-600 hover:bg-purple-700" :
                        group === "Presentes" ? "bg-pink-500 hover:bg-pink-600" :
                        "bg-blue-500 hover:bg-blue-600"
                      } text-white`}
                    >
                      {group}
                    </Button>
                  ))}
                </div>
              </div>

              <ShoppingListHeader 
                onAddItem={() => setDialogOpen(true)} 
                onReset={resetList} 
              />
              
              <div className="space-y-2 mt-8">
                {items.length === 0 ? (
                  <p className="text-center text-gray-500">
                    Sua lista está vazia. Adicione alguns itens!
                  </p>
                ) : (
                  items
                    .filter(item => selectedCategory === "other" ? true : item.category === selectedCategory)
                    .map((item) => (
                      <ShoppingListItem
                        key={item.id}
                        item={item}
                        onToggle={toggleItem}
                        onDelete={deleteItem}
                      />
                    ))
                )}
              </div>

              <AddItemDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onAdd={(name) => {
                  addItem(name);
                  setDialogOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
