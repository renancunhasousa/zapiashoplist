
import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import ShoppingListHeader from "./ShoppingListHeader";
import ShoppingListItem from "./ShoppingListItem";

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  user_id: string;
  category: string;
  value?: string;
  link?: string;
  position: number;
}

interface SharedListsViewProps {
  userId: string;
  onBack: () => void;
}

const SharedListsView = ({ userId, onBack }: SharedListsViewProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<string[]>([]);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);

  // Fetch shared user's groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('name')
          .eq('user_id', userId)
          .order('name');
        
        if (error) throw error;
        
        const groupNames = data.map(group => group.name);
        setGroups(groupNames);
        
        if (groupNames.length > 0) {
          setCurrentGroup(groupNames[0]);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar grupos.",
        });
      }
    };

    fetchGroups();
  }, [userId, toast]);

  // Fetch shared user's items for current group
  useEffect(() => {
    const fetchItems = async () => {
      if (!currentGroup) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', userId)
          .eq('category', currentGroup)
          .order('position');
        
        if (error) throw error;
        
        setItems(data || []);
      } catch (error) {
        console.error('Error fetching items:', error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar itens.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('items_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}` + (currentGroup ? `&category=eq.${currentGroup}` : '')
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentGroup, toast]);

  const handleToggle = async () => {
    // No-op since this is a read-only view
    return;
  };

  const handleDelete = async () => {
    // No-op since this is a read-only view
    return;
  };

  const handleAddItem = () => {
    // No-op since this is a read-only view
    return;
  };

  const handleReset = async () => {
    // No-op since this is a read-only view
    return;
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2 p-0 h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold truncate">
          Lista compartilhada
        </h2>
      </div>

      {/* Group tabs */}
      <div className="flex overflow-x-auto pb-2 mb-4 gap-2">
        {groups.map((group) => (
          <Button
            key={group}
            variant={currentGroup === group ? "default" : "outline"}
            className="whitespace-nowrap"
            onClick={() => setCurrentGroup(group)}
          >
            {group}
          </Button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-4 mb-24">
        <ShoppingListHeader
          onAddItem={handleAddItem}
          onReset={handleReset}
          disabled={true}
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Carregando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum item na lista</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                disabled={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedListsView;
