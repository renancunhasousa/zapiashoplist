
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, Share2, LogOut, Users } from "lucide-react";
import ShoppingListHeader from "@/components/ShoppingListHeader";
import ShoppingListItem, { ShoppingItem, ItemCategory } from "@/components/ShoppingListItem";
import AddItemDialog from "@/components/AddItemDialog";
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import GroupManagement from "@/components/GroupManagement";
import SharedListsManager from "@/components/SharedListsManager";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  TouchSensor
} from "@dnd-kit/core";
import { 
  arrayMove,
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { RealtimeChannel } from "@supabase/supabase-js";

const Index = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("groceries");
  const [groups, setGroups] = useState<string[]>([]);
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [activeSharedUser, setActiveSharedUser] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'groups' | 'shared'>('groups');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // DnD sensors setup with improved mobile support
  const isMobile = useIsMobile();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Lower distance for mobile
        distance: isMobile ? 5 : 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Carregar dados iniciais do usuário autenticado
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      setIsLoading(true);
      
      try {
        // Carregar grupos do usuário
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
          
        if (groupsError) throw groupsError;
        
        if (groupsData && groupsData.length > 0) {
          setGroups(groupsData.map(group => group.name));
        } else {
          // Criar grupos padrão se o usuário não tiver nenhum
          const defaultGroups = ["Mercado", "Presentes", "Outros"];
          for (const groupName of defaultGroups) {
            await supabase.from('groups').insert({
              user_id: user.id,
              name: groupName
            });
          }
          setGroups(defaultGroups);
        }
        
        // Carregar usuários compartilhados
        const { data: sharedData, error: sharedError } = await supabase
          .from('shared_access')
          .select('shared_user_id')
          .eq('user_id', user.id);
          
        if (sharedError) throw sharedError;
        
        if (sharedData && sharedData.length > 0) {
          setSharedUsers(sharedData.map(access => access.shared_user_id));
        }
        
        // Carregar itens para a categoria selecionada
        await fetchItems(user.id, selectedCategory);
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          description: "Erro ao carregar seus dados.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [user]);
  
  // Atualizar itens quando a categoria ou o usuário ativo muda
  useEffect(() => {
    if (!user) return;
    
    const userIdToFetch = activeSharedUser || user.id;
    fetchItems(userIdToFetch, selectedCategory);
    
  }, [selectedCategory, activeSharedUser, user]);

  // Configurar canal de tempo real
  useEffect(() => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    
    if (!user) return;
    
    const userIdToListen = activeSharedUser || user.id;
    
    const channel = supabase.channel('public:items:changes')
      .on('postgres_changes', {
        event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'items',
        filter: `user_id=eq.${userIdToListen}`,
      }, (payload) => {
        console.log('Evento de tempo real recebido:', payload);
        handleRealtimeUpdate(payload);
      })
      .subscribe((status) => {
        console.log('Status da inscrição em tempo real:', status);
      });
    
    setRealtimeChannel(channel);
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, activeSharedUser]);

  // Manipular atualizações em tempo real
  const handleRealtimeUpdate = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newItem = payload.new as any;
      
      // Verificar se o item é da categoria atual
      if (newItem.category !== selectedCategory) return;
      
      // Converter para formato ShoppingItem
      const shoppingItem: ShoppingItem = {
        id: newItem.id,
        name: newItem.name,
        checked: newItem.checked,
        category: newItem.category as ItemCategory,
        value: newItem.value || undefined,
        link: newItem.link || undefined,
      };
      
      // Verificar se o item já existe para evitar duplicações
      setItems(current => {
        if (current.some(item => item.id === shoppingItem.id)) {
          return current;
        }
        return [...current, shoppingItem];
      });
    } 
    else if (payload.eventType === 'UPDATE') {
      const updatedItem = payload.new as any;
      
      // Verificar se o item é da categoria atual
      if (updatedItem.category !== selectedCategory) return;
      
      setItems(current => 
        current.map(item => 
          item.id === updatedItem.id 
            ? {
                ...item,
                name: updatedItem.name,
                checked: updatedItem.checked,
                value: updatedItem.value || undefined,
                link: updatedItem.link || undefined,
              } 
            : item
        )
      );
    } 
    else if (payload.eventType === 'DELETE') {
      const deletedItemId = payload.old.id;
      setItems(current => current.filter(item => item.id !== deletedItemId));
    }
  };

  const fetchItems = async (userId: string, category: string) => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('position', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        const formattedItems: ShoppingItem[] = data.map(item => ({
          id: item.id,
          name: item.name,
          checked: item.checked,
          category: item.category as ItemCategory,
          value: item.value || undefined,
          link: item.link || undefined,
        }));
        
        setItems(formattedItems);
      }
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
      toast({
        variant: "destructive",
        description: "Erro ao carregar itens.",
      });
    }
  };

  const toggleSharedView = (userId: string | null) => {
    setActiveSharedUser(userId);
    
    if (userId) {
      // Buscar grupos do usuário compartilhado
      const loadSharedGroups = async () => {
        try {
          const { data: groupsData, error: groupsError } = await supabase
            .from('groups')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
            
          if (groupsError) throw groupsError;
          
          if (groupsData && groupsData.length > 0) {
            setGroups(groupsData.map(group => group.name));
            
            // Definir categoria baseada no primeiro grupo
            const firstGroupCategory = groupsData[0].name === "Mercado" 
              ? "groceries" 
              : groupsData[0].name === "Presentes" 
                ? "presents" 
                : "other";
                
            setSelectedCategory(firstGroupCategory as ItemCategory);
          }
        } catch (error) {
          console.error("Erro ao carregar grupos compartilhados:", error);
        }
      };
      
      loadSharedGroups();
    } else {
      // Voltar para os próprios grupos do usuário
      if (user) {
        const loadUserGroups = async () => {
          try {
            const { data: groupsData, error: groupsError } = await supabase
              .from('groups')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: true });
              
            if (groupsError) throw groupsError;
            
            if (groupsData && groupsData.length > 0) {
              setGroups(groupsData.map(group => group.name));
              setSelectedCategory("groceries");
            }
          } catch (error) {
            console.error("Erro ao carregar grupos do usuário:", error);
          }
        };
        
        loadUserGroups();
      }
    }
  };

  const addItem = async (name: string, value?: string, link?: string) => {
    if (!user) return;
    
    // Não permitir adicionar itens em listas compartilhadas
    if (activeSharedUser) {
      toast({
        variant: "destructive",
        description: "Você não pode adicionar itens em listas compartilhadas.",
      });
      return;
    }
    
    try {
      // Obter maior número de posição para colocar o novo item no final
      const highestPosition = items.length > 0 
        ? Math.max(...items.map(item => typeof item.id === 'string' ? parseInt(item.id) : 0)) + 1 
        : 0;
      
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name,
        checked: false,
        category: selectedCategory,
        value,
        link,
      };
      
      // Adicionar item ao Supabase
      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          name: newItem.name,
          checked: newItem.checked,
          category: newItem.category,
          value: newItem.value,
          link: newItem.link,
          position: highestPosition
        })
        .select();
        
      if (error) throw error;
      
      toast({
        description: "Item adicionado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao adicionar item.",
      });
    }
  };

  const toggleItem = async (id: string) => {
    if (!user) return;
    
    // Não permitir alterar itens em listas compartilhadas
    if (activeSharedUser) {
      toast({
        variant: "destructive",
        description: "Você não pode modificar itens em listas compartilhadas.",
      });
      return;
    }
    
    try {
      // Encontrar o item a ser alternado
      const itemToToggle = items.find(item => item.id === id);
      if (!itemToToggle) return;
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('items')
        .update({ checked: !itemToToggle.checked })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error("Erro ao alternar item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao atualizar item.",
      });
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return;
    
    // Não permitir excluir itens em listas compartilhadas
    if (activeSharedUser) {
      toast({
        variant: "destructive",
        description: "Você não pode remover itens em listas compartilhadas.",
      });
      return;
    }
    
    try {
      // Excluir do Supabase
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        description: "Item removido com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast({
        variant: "destructive",
        description: "Erro ao remover item.",
      });
    }
  };

  const resetList = async () => {
    if (!user || items.length === 0) return;
    
    // Não permitir limpar listas compartilhadas
    if (activeSharedUser) {
      toast({
        variant: "destructive",
        description: "Você não pode limpar listas compartilhadas.",
      });
      return;
    }
    
    try {
      // Excluir todos os itens na categoria selecionada
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('user_id', user.id)
        .eq('category', selectedCategory);
        
      if (error) throw error;
      
      toast({
        description: "Lista limpa com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao limpar lista:", error);
      toast({
        variant: "destructive",
        description: "Erro ao limpar lista.",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!user) return;
    
    // Não permitir reordenar itens em listas compartilhadas
    if (activeSharedUser) {
      toast({
        variant: "destructive",
        description: "Você não pode reordenar itens em listas compartilhadas.",
      });
      return;
    }
    
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Atualizar posições no Supabase (em segundo plano)
        const updatePositions = async () => {
          try {
            // Atualizar a posição de cada item
            for (let i = 0; i < reorderedItems.length; i++) {
              await supabase
                .from('items')
                .update({ position: i })
                .eq('id', reorderedItems[i].id);
            }
          } catch (error) {
            console.error("Erro ao atualizar posições:", error);
          }
        };
        
        updatePositions();
        
        return reorderedItems;
      });
    }
  };

  const copyUserIdToClipboard = () => {
    if (!user) return;
    
    navigator.clipboard.writeText(user.id);
    toast({
      description: "ID copiado para a área de transferência!",
    });
  };

  // Determinar cores para os botões de grupo
  const getGroupButtonColor = (index: number, isSelected: boolean) => {
    if (isSelected) {
      return "bg-[#f85afa] bg-opacity-90 ring-2 ring-white text-white";
    }
    return "bg-[#87d3e3] hover:bg-[#87d3e3]/90 text-white";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f85afa]"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 to-purple-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="p-4 flex flex-col h-full">
                  <div className="flex gap-2 mb-6">
                    <Button
                      variant={activeView === 'groups' ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setActiveView('groups')}
                    >
                      Grupos
                    </Button>
                    <Button
                      variant={activeView === 'shared' ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setActiveView('shared')}
                    >
                      Compartilhados
                    </Button>
                  </div>
                  
                  {activeView === 'groups' ? (
                    <GroupManagement 
                      groups={groups} 
                      setGroups={setGroups}
                    />
                  ) : (
                    <SharedListsManager 
                      sharedUsers={sharedUsers}
                      setSharedUsers={setSharedUsers}
                      onToggleView={toggleSharedView}
                      activeSharedUser={activeSharedUser}
                    />
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    {user && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-gray-700"
                        onClick={signOut}
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </Button>
                    )}
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1">
          <div className="py-8 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <SidebarTrigger>
                  <Button variant="ghost" size="icon" className="rounded-full shadow-md">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SidebarTrigger>
                
                {activeSharedUser ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      Visualizando lista compartilhada
                    </p>
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-full shadow-md"
                      onClick={copyUserIdToClipboard}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Copiar meu ID
                    </Button>
                  </div>
                )}
              </div>

              <div className="mb-4 text-center">
                <img 
                  src="/lovable-uploads/3d145300-d394-4144-bbe2-aee6cffc191e.png" 
                  alt="ZADA" 
                  className="h-20 mx-auto"
                />
              </div>
              
              <div className="flex gap-2 mb-6 justify-center">
                {groups.map((group, index) => {
                  const categoryName = group === "Mercado" ? "groceries" : group === "Presentes" ? "presents" : "other";
                  const isSelected = selectedCategory === categoryName;
                  
                  return (
                    <Button
                      key={group}
                      variant="outline"
                      onClick={() => setSelectedCategory(categoryName)}
                      className={`rounded-full shadow-lg ${getGroupButtonColor(index, isSelected)}`}
                    >
                      {group}
                    </Button>
                  );
                })}
              </div>

              {activeSharedUser && (
                <div className="mb-4 p-3 bg-purple-100 rounded-md text-center text-sm">
                  <p className="font-medium text-purple-800">
                    Você está visualizando uma lista compartilhada (somente leitura)
                  </p>
                </div>
              )}

              <ShoppingListHeader 
                onAddItem={() => !activeSharedUser && setDialogOpen(true)} 
                onReset={resetList}
                disabled={Boolean(activeSharedUser)}
              />
              
              <div className="space-y-2 mt-8">
                {items.length === 0 ? (
                  <p className="text-center text-gray-500">
                    Esta lista está vazia.
                  </p>
                ) : (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={items}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((item) => (
                        <ShoppingListItem
                          key={item.id}
                          item={item}
                          onToggle={toggleItem}
                          onDelete={deleteItem}
                          disabled={Boolean(activeSharedUser)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <AddItemDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onAdd={(name, value, link) => {
                  addItem(name, value, link);
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
