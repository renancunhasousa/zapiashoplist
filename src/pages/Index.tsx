
import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import ShoppingListHeader from "@/components/ShoppingListHeader";
import ShoppingListItem, { ShoppingItem } from "@/components/ShoppingListItem";
import AddItemDialog from "@/components/AddItemDialog";

const Index = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const addItem = (name: string) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name,
      checked: false,
    };
    setItems((prev) => [...prev, newItem]);
    toast({
      description: "Item adicionado com sucesso!",
    });
  };

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <ShoppingListHeader onAddItem={() => setDialogOpen(true)} onReset={resetList} />
        
        <div className="space-y-3 mt-8">
          {items.length === 0 ? (
            <p className="text-center text-gray-500">
              Sua lista está vazia. Adicione alguns itens!
            </p>
          ) : (
            items.map((item) => (
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
          onAdd={addItem}
        />
      </div>
    </div>
  );
};

export default Index;
