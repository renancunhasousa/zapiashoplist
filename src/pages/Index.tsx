
import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import ShoppingListHeader from "@/components/ShoppingListHeader";
import ShoppingListItem, { ShoppingItem, ItemCategory } from "@/components/ShoppingListItem";
import AddItemDialog from "@/components/AddItemDialog";
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import GroupManagement from "@/components/GroupManagement";

// Imagem atualizada de um casal com Spitz Alemão
const familyLogoUrl = "https://img.freepik.com/free-vector/happy-young-couple-walking-with-dog_74855-5233.jpg";

const Index = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("groceries");
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
      
      // Sort items: unchecked first, then checked
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
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <GroupManagement />
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
                <img 
                  src={familyLogoUrl} 
                  alt="Family Logo" 
                  className="w-32 h-32 object-cover rounded-2xl shadow-sm mb-4"
                />
                <h1 className="text-2xl font-semibold mb-6 text-gray-800">Lista de Compras da Família</h1>
                
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={selectedCategory === "groceries" ? "default" : "outline"}
                    onClick={() => setSelectedCategory("groceries")}
                    className="rounded-full shadow-sm"
                  >
                    Mercado
                  </Button>
                  <Button
                    variant={selectedCategory === "presents" ? "default" : "outline"}
                    onClick={() => setSelectedCategory("presents")}
                    className="rounded-full shadow-sm"
                  >
                    Presentes
                  </Button>
                  <Button
                    variant={selectedCategory === "other" ? "default" : "outline"}
                    onClick={() => setSelectedCategory("other")}
                    className="rounded-full shadow-sm"
                  >
                    Outros
                  </Button>
                </div>
              </div>

              <ShoppingListHeader 
                onAddItem={() => setDialogOpen(true)} 
                onReset={resetList} 
              />
              
              <div className="space-y-3 mt-8">
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
