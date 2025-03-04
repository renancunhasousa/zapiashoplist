
import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";

interface GroupManagementProps {
  groups: string[];
  setGroups: React.Dispatch<React.SetStateAction<string[]>>;
}

const GroupManagement = ({ groups, setGroups }: GroupManagementProps) => {
  const { toast } = useToast();
  const [newGroup, setNewGroup] = useState("");
  const { user } = useAuth();

  const addGroup = async () => {
    if (!user) return;
    
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
    if (!user) return;
    
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
        <input
          type="text"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="Nome do novo grupo"
          className="flex-1 px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          onClick={addGroup}
          variant="outline"
          size="icon"
          className="rounded-full shadow-md"
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
              disabled={groups.length <= 1}
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
