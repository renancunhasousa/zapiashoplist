
import React from "react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { X, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: item.id,
    // Reduce activation constraint for mobile
    animateLayoutChanges: () => false
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div 
          {...attributes} 
          {...listeners} 
          className={`${isMobile ? 'touch-manipulation p-2' : 'cursor-grab touch-manipulation active:cursor-grabbing p-1'}`}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <Checkbox
          checked={item.checked}
          onCheckedChange={() => onToggle(item.id)}
          className="h-4 w-4 rounded-full"
        />
        <div className="flex flex-col gap-0.5">
          <span className={`text-sm ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
            {item.name}
          </span>
          <span className="text-[10px] text-gray-500 capitalize">{item.category}</span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onDelete(item.id)}
        className="rounded-full hover:bg-gray-100 h-7 w-7"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default ShoppingListItem;
