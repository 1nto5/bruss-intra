import { ScrollArea } from "@/components/ui/scroll-area";
import * as React from "react";

interface DialogScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

const DialogScrollArea = ({ children, className }: DialogScrollAreaProps) => {
  const ref = React.useRef<HTMLDivElement>(null);

  // Remove Radix ScrollArea viewport from tab order so Tab flows
  // naturally through form fields inside the dialog.
  React.useEffect(() => {
    const viewport = ref.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (viewport instanceof HTMLElement) {
      viewport.tabIndex = -1;
    }
  }, []);

  return (
    <ScrollArea ref={ref} className={`h-[60vh] sm:h-[70vh] ${className || ""}`}>
      {children}
    </ScrollArea>
  );
};

export default DialogScrollArea;
