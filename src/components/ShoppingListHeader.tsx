
import React from "react";
import { Button } from "./ui/button";
import { Plus, Trash2 } from "lucide-react";

interface ShoppingListHeaderProps {
  onAddItem: () => void;
  onReset: () => void;
}

const ShoppingListHeader = ({ onAddItem, onReset }: ShoppingListHeaderProps) => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto mb-8">
      <div className="space-y-2">
        <div className="flex justify-center mb-4">
          <img 
            src="/lovable-uploads/06e35536-32d9-436b-86e7-743b0a39980e.png" 
            alt="ZADA Logo" 
            className="h-16"
          />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-center">Lista de Compras</h1>
        <p className="text-muted-foreground text-center text-sm">Adicione itens à sua lista e compartilhe com outros</p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button 
          onClick={onAddItem} 
          variant="default" 
          className="gap-2 px-4 py-2 rounded-full shadow-md bg-purple-600 hover:bg-purple-700 w-28"
        >
          <Plus className="h-4 w-4" />
          Novo
        </Button>
        <Button 
          onClick={onReset} 
          variant="outline" 
          className="gap-2 px-4 py-2 rounded-full shadow-md w-28"
        >
          <Trash2 className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListHeader;
