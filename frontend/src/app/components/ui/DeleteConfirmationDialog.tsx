import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from './utils';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title = 'Konfirmasi Hapus',
  description = 'Data yang dihapus tidak bisa dikembalikan. Yakin ingin melanjutkan?',
  confirmLabel = 'Hapus Permanen',
  cancelLabel = 'Batal',
  onConfirm,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden max-w-[420px] bg-white">
        {/* Header visual area */}
        <div className="flex flex-col items-center pt-10 pb-6 px-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-100 rounded-full scale-150 animate-ping opacity-20" />
            <div className="relative size-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-200">
              <AlertTriangle className="size-9 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <AlertDialogHeader className="text-center space-y-3">
            <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-gray-800">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500 font-medium leading-relaxed max-w-[320px] mx-auto">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Footer buttons */}
        <AlertDialogFooter className="flex flex-row gap-3 p-6 pt-0 border-t-0 sm:flex-row sm:justify-center">
          <AlertDialogCancel
            disabled={isLoading}
            className={cn(
              "flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest",
              "bg-gray-100 text-gray-500 border-none hover:bg-gray-200 transition-all",
              "disabled:opacity-50"
            )}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest",
              "bg-red-600 text-white border-none hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95",
              "disabled:opacity-50"
            )}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
