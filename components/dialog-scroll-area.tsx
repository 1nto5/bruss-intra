import { ScrollArea } from "@/components/ui/scroll-area";
import * as React from "react";

interface DialogScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

const DialogScrollArea = ({ children, className }: DialogScrollAreaProps) => {
  return (
    <ScrollArea className={`h-[60vh] sm:h-[70vh] ${className || ""}`}>
      {children}
    </ScrollArea>
  );
};

export default DialogScrollArea;
