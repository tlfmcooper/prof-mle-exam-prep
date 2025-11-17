import { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useKeyboardShortcutsHelp, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const formattedShortcuts = useKeyboardShortcutsHelp(shortcuts);

  useEffect(() => {
    // Detect if device has touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const handleShortcutClick = (shortcut: KeyboardShortcut) => {
    shortcut.action();
    setOpen(false); // Close dialog after action
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Keyboard Shortcuts">
          <Keyboard className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Show keyboard shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isTouchDevice ? 'Quick Actions' : 'Keyboard Shortcuts'}
          </DialogTitle>
          <DialogDescription>
            {isTouchDevice
              ? 'Tap an action to navigate quickly'
              : 'Use these keyboard shortcuts to navigate quickly'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {formattedShortcuts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No shortcuts available for this page
            </p>
          ) : (
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => {
                const formatted = formattedShortcuts[index];
                return isTouchDevice ? (
                  // Mobile: Show as clickable button
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleShortcutClick(shortcut)}
                  >
                    <span className="text-sm">{formatted.description}</span>
                  </Button>
                ) : (
                  // Desktop: Show keyboard shortcut
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent"
                  >
                    <span className="text-sm">{formatted.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                      {formatted.keys}
                    </kbd>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
