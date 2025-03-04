
import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "./ui/use-toast";

interface GroupManagementProps {
  groups: string[];
  setGroups: React.Dispatch<React.SetStateAction<string[]>>;
}

const GroupManagement = ({ groups, setGroups }: GroupManagementProps) => {
  const { toast } = useToast();
  const [newGroup, setNewGroup] = useState("");

  const addGroup = () => {
    if (newGroup && !groups.includes(newGroup)) {
      setGroups([...groups, newGroup]);
      setNewGroup("");
      toast({
        description: "Grupo adicionado com sucesso!",
      });
    }
  };

  const deleteGroup = (group: string) => {
    setGroups(groups.filter(g => g !== group));
    toast({
      description: "Grupo removido com sucesso!",
    });
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-4">Gerenciar Grupos</h2>
      
      <div className="mb-2">
        <p className="text-sm text-gray-500 mb-2">
          Crie grupos para organizar diferentes tipos de listas de compras (ex: mercado, farmácia, etc)
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
