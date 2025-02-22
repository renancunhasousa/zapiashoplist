
import React from "react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { X } from "lucide-react";

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

interface ShoppingListItemProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const ShoppingListItem = ({ item, onToggle, onDelete }: ShoppingListItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={item.checked}
          onCheckedChange={() => onToggle(item.id)}
          className="h-5 w-5"
        />
        <span className={`text-lg ${item.checked ? "line-through text-gray-400" : ""}`}>
          {item.name}
        </span>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ShoppingListItem;
