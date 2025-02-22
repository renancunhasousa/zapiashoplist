
import React from "react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { X } from "lucide-react";

export type ItemCategory = "groceries" | "presents" | "other";

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  category: ItemCategory;
}

interface ShoppingListItemProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const ShoppingListItem = ({ item, onToggle, onDelete }: ShoppingListItemProps) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={item.checked}
          onCheckedChange={() => onToggle(item.id)}
          className="h-4 w-4 rounded-full"
        />
        <div className="flex flex-col gap-0.5">
          <span className={`text-base ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
            {item.name}
          </span>
          <span className="text-[10px] text-gray-500 capitalize">{item.category}</span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onDelete(item.id)}
        className="rounded-full hover:bg-gray-100 h-8 w-8"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default ShoppingListItem;
