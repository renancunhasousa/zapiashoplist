
import React from "react";
import { Button } from "./ui/button";
import { Plus, Trash2 } from "lucide-react";

interface ShoppingListHeaderProps {
  onAddItem: () => void;
  onReset: () => void;
  disabled?: boolean;
}

const ShoppingListHeader = ({ onAddItem, onReset, disabled = false }: ShoppingListHeaderProps) => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto mb-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-center">Lista de Compras</h1>
        <p className="text-muted-foreground text-center text-sm">Adicione itens à sua lista e compartilhe com outros</p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button 
          onClick={onAddItem} 
          variant="outline" 
          className="gap-2 rounded-full shadow-lg text-black bg-white hover:bg-gray-100"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Novo
        </Button>
        <Button 
          onClick={onReset} 
          variant="outline" 
          className="gap-2 rounded-full shadow-lg text-black bg-white hover:bg-gray-100"
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListHeader;
