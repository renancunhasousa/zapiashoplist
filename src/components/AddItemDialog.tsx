
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
  onAdd: (name: string) => void;
}

const AddItemDialog = ({ open, onOpenChange, onAdd }: AddItemDialogProps) => {
  const [itemName, setItemName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemName.trim()) {
      onAdd(itemName.trim());
      setItemName("");
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
            <Input
              placeholder="Nome do item"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
            />
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
