
import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { Input } from "./ui/input";

interface GroupManagementProps {
  groups: string[];
  setGroups: React.Dispatch<React.SetStateAction<string[]>>;
  disabled?: boolean;
}

const GroupManagement = ({ groups, setGroups, disabled = false }: GroupManagementProps) => {
  const { toast } = useToast();
  const [newGroup, setNewGroup] = useState("");
  const { user } = useAuth();

  const addGroup = async () => {
    if (!user || disabled) return;
    
    if (newGroup && !groups.includes(newGroup)) {
      try {
        // Add to Supabase
        const { data, error } = await supabase
          .from('groups')
          .insert({
            user_id: user.id,
            name: newGroup
          })
          .select();
          
        if (error) throw error;
        
        // Update local state
        setGroups([...groups, newGroup]);
        setNewGroup("");
        
        toast({
          description: "Grupo adicionado com sucesso!",
        });
      } catch (error) {
        console.error("Error adding group:", error);
        toast({
          variant: "destructive",
          description: "Erro ao adicionar grupo.",
        });
      }
    }
  };

  const deleteGroup = async (group: string) => {
    if (!user || disabled) return;
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('user_id', user.id)
        .eq('name', group);
        
      if (error) throw error;
      
      // Update local state
      setGroups(groups.filter(g => g !== group));
      
      toast({
        description: "Grupo removido com sucesso!",
      });
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        variant: "destructive",
        description: "Erro ao remover grupo.",
        });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-4">Gerenciar Grupos</h2>
      
      <div className="mb-2">
        <p className="text-xs text-gray-500 mb-2">
          Crie grupos para organizar diferentes tipos de listas de compras (ex: lista de presentes, mercado, etc)
        </p>
      </div>
      
      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="Nome do novo grupo"
          className="flex-1"
          disabled={disabled}
        />
        <Button
          onClick={addGroup}
          variant="outline"
          size="icon"
          className="rounded-full shadow-md"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100">
            <span>{group}</span>
            <Button
              onClick={() => deleteGroup(group)}
              variant="ghost"
              size="icon"
              className="rounded-full opacity-50 hover:opacity-100 shadow-sm"
              disabled={disabled || groups.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupManagement;
