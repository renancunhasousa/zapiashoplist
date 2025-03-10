
import React from "react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { X, GripVertical, ExternalLink, DollarSign } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";

export type ItemCategory = string;

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  category: ItemCategory;
  value?: string;
  link?: string;
}

interface ShoppingListItemProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

const ShoppingListItem = ({ item, onToggle, onDelete, disabled = false }: ShoppingListItemProps) => {
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
      className="flex items-center justify-between p-1.5 bg-white rounded-2xl shadow-md border border-gray-100 hover:border-gray-200 transition-colors"
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
          onCheckedChange={() => !disabled && onToggle(item.id)}
          className="h-4 w-4 rounded-full"
          disabled={disabled}
        />
        <div className="flex flex-col gap-0.5">
          <span className={`text-sm ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
            {item.name}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            {item.value && (
              <div className="flex items-center gap-0.5">
                <DollarSign className="h-3 w-3" />
                <span>{item.value}</span>
              </div>
            )}
            {item.link && (
              <a 
                href={item.link.startsWith('http') ? item.link : `https://${item.link}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-blue-500 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Link</span>
              </a>
            )}
          </div>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => !disabled && onDelete(item.id)}
        className="rounded-full hover:bg-gray-100 h-7 w-7 shadow-sm"
        disabled={disabled}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default ShoppingListItem;
