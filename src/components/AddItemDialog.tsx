
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ItemCategory } from "./ShoppingListItem";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, value?: string, link?: string) => void;
}

const AddItemDialog = ({ open, onOpenChange, onAdd }: AddItemDialogProps) => {
  const [itemName, setItemName] = useState("");
  const [itemValue, setItemValue] = useState("");
  const [itemLink, setItemLink] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemName.trim()) {
      onAdd(itemName.trim(), itemValue.trim(), itemLink.trim());
      setItemName("");
      setItemValue("");
      setItemLink("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Item</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para adicionar um novo item à sua lista.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="itemName" className="text-sm font-medium mb-1 block">
                Nome do Item *
              </label>
              <Input
                id="itemName"
                placeholder="Ex: Arroz, Presente para João"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <label htmlFor="itemValue" className="text-sm font-medium mb-1 block">
                Valor (opcional)
              </label>
              <Input
                id="itemValue"
                placeholder="Ex: R$ 10,99"
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="itemLink" className="text-sm font-medium mb-1 block">
                Link (opcional)
              </label>
              <Input
                id="itemLink"
                placeholder="Ex: www.site.com.br/produto"
                value={itemLink}
                onChange={(e) => setItemLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={!itemName.trim()} className="shadow-md">
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
