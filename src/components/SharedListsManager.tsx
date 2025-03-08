
import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";

interface SharedListsManagerProps {
  sharedUsers: string[];
  setSharedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  onToggleView: (userId: string | null) => void;
  activeSharedUser: string | null;
}

const SharedListsManager = ({ 
  sharedUsers, 
  setSharedUsers, 
  onToggleView,
  activeSharedUser
}: SharedListsManagerProps) => {
  const { toast } = useToast();
  const [newSharedUserId, setNewSharedUserId] = useState("");
  const { user } = useAuth();

  const addSharedUser = async () => {
    if (!user) return;
    
    if (newSharedUserId && !sharedUsers.includes(newSharedUserId)) {
      if (newSharedUserId === user.id) {
        toast({
          variant: "destructive",
          description: "Você não pode adicionar seu próprio ID.",
        });
        return;
      }

      try {
        // Adicionar à lista de compartilhamentos do usuário diretamente
        // Não verificamos mais se o usuário existe na tabela de profiles
        // já que isso pode causar problemas se o usuário existe mas não tem perfil
        const { error } = await supabase.rpc('add_shared_user', {
          shared_user_id_param: newSharedUserId
        });
          
        if (error) {
          console.error("Erro ao adicionar acesso compartilhado:", error);
          throw error;
        }
        
        // Atualizar estado local
        setSharedUsers([...sharedUsers, newSharedUserId]);
        setNewSharedUserId("");
        
        toast({
          description: "Acesso compartilhado adicionado com sucesso!",
        });
      } catch (error) {
        console.error("Erro ao adicionar acesso compartilhado:", error);
        toast({
          variant: "destructive",
          description: "Erro ao adicionar acesso compartilhado. Verifique se o ID é válido.",
        });
      }
    }
  };

  const removeSharedUser = async (sharedUserId: string) => {
    if (!user) return;
    
    try {
      // Remover do Supabase
      const { error } = await supabase.rpc('remove_shared_user', {
        shared_user_id_param: sharedUserId
      });
        
      if (error) throw error;
      
      // Atualizar estado local
      setSharedUsers(sharedUsers.filter(id => id !== sharedUserId));
      
      // Se o usuário removido era o ativo, voltar para as próprias listas
      if (activeSharedUser === sharedUserId) {
        onToggleView(null);
      }
      
      toast({
        description: "Acesso compartilhado removido com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao remover acesso compartilhado:", error);
      toast({
        variant: "destructive",
        description: "Erro ao remover acesso compartilhado.",
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-4">Gerenciar Listas Compartilhadas</h2>
      
      <div className="mb-2">
        <p className="text-xs text-gray-500 mb-2">
          Adicione IDs de outros usuários para acessar suas listas compartilhadas
        </p>
      </div>
      
      <div className="flex gap-2 mb-4">
        <Input
          value={newSharedUserId}
          onChange={(e) => setNewSharedUserId(e.target.value)}
          placeholder="ID do usuário"
          className="flex-1"
        />
        <Button
          onClick={addSharedUser}
          variant="outline"
          size="icon"
          className="rounded-full shadow-md"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {user && (
        <div className="p-3 bg-purple-100 rounded-md text-sm mb-4">
          <p className="font-medium text-purple-800 mb-1">Seu ID de compartilhamento:</p>
          <div className="flex items-center gap-2">
            <Input 
              value={user.id} 
              readOnly 
              className="text-xs font-mono bg-white"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(user.id);
                toast({
                  description: "ID copiado para a área de transferência!",
                });
              }}
            >
              Copiar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Acessos compartilhados:</h3>
        
        {sharedUsers.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhum acesso compartilhado adicionado</p>
        ) : (
          sharedUsers.map((sharedId) => (
            <div key={sharedId} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100">
              <Button
                variant={activeSharedUser === sharedId ? "default" : "ghost"}
                className="text-left justify-start w-full truncate mr-2"
                onClick={() => onToggleView(activeSharedUser === sharedId ? null : sharedId)}
              >
                <span className="truncate text-xs font-mono">
                  {sharedId.substring(0, 6)}...{sharedId.substring(sharedId.length - 4)}
                </span>
              </Button>
              <Button
                onClick={() => removeSharedUser(sharedId)}
                variant="ghost"
                size="icon"
                className="rounded-full opacity-50 hover:opacity-100 shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SharedListsManager;
