
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
  const [error, setError] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(true);

  // Verificar se o usuário existe
  useEffect(() => {
    const checkUserExists = async () => {
      try {
        // Tentamos buscar qualquer grupo do usuário, se não existir nenhum grupo,
        // provavelmente o ID não é válido ou o usuário não tem dados ainda
        const { data, error } = await supabase
          .from('groups')
          .select('name')
          .eq('user_id', userId)
          .limit(1);
        
        if (error) {
          console.error('Erro ao verificar usuário:', error);
          setError('Não foi possível verificar o usuário compartilhado.');
          setIsLoading(false);
          return;
        }
        
        if (!data || data.length === 0) {
          setUserExists(false);
          setError('Este usuário não possui listas ou o ID não é válido.');
          setIsLoading(false);
          return;
        }
        
        setUserExists(true);
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        setError('Ocorreu um erro ao verificar o usuário compartilhado.');
        setIsLoading(false);
      }
    };

    checkUserExists();
  }, [userId]);

  // Fetch shared user's groups
  useEffect(() => {
    if (!userExists) return;
    
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('name')
          .eq('user_id', userId)
          .order('name');
        
        if (error) {
          console.error('Error fetching groups:', error);
          setError('Erro ao carregar grupos.');
          setIsLoading(false);
          return;
        }
        
        if (!data || data.length === 0) {
          setError('Este usuário não possui grupos.');
          setIsLoading(false);
          return;
        }
        
        const groupNames = data.map(group => group.name);
        setGroups(groupNames);
        
        if (groupNames.length > 0) {
          setCurrentGroup(groupNames[0]);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setError('Erro ao carregar grupos.');
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [userId, userExists]);

  // Fetch shared user's items for current group
  useEffect(() => {
    if (!currentGroup || !userExists) return;
    
    setIsLoading(true);
    setError(null);
    
    const fetchItems = async () => {
      try {
        console.log('Buscando itens para:', userId, currentGroup);
        
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', userId)
          .eq('category', currentGroup)
          .order('position');
        
        if (error) {
          console.error('Error fetching items:', error);
          setError('Erro ao carregar itens.');
          setIsLoading(false);
          return;
        }
        
        console.log('Itens encontrados:', data ? data.length : 0);
        setItems(data || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching items:', error);
        setError('Erro ao carregar itens.');
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
        (payload) => {
          console.log('Alteração em tempo real:', payload);
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentGroup, userExists]);

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

  if (!userExists || error) {
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
        
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-red-50 text-red-700 rounded-lg p-4 max-w-md w-full text-center">
            <p className="font-medium">{error || 'ID não encontrado'}</p>
            <p className="text-sm mt-2">
              {!userExists ? 'Verifique se o ID compartilhado está correto.' : 'Tente novamente mais tarde.'}
            </p>
          </div>
          <Button 
            variant="outline"
            className="mt-4"
            onClick={onBack}
          >
            Voltar para minhas listas
          </Button>
        </div>
      </div>
    );
  }

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
