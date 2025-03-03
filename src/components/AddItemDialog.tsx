
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Nome do item"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Input
                placeholder="Valor (opcional)"
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Link (opcional)"
                value={itemLink}
                onChange={(e) => setItemLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={!itemName.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
