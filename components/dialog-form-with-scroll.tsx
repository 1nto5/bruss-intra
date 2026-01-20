import * as React from 'react';

interface DialogFormWithScrollProps {
  children: React.ReactNode;
  className?: string;
}

const DialogFormWithScroll = ({
  children,
  className,
}: DialogFormWithScrollProps) => {
  return (
    <div
      className={`space-y-4 px-6 py-4 ${className || ''}`}
    >
      {children}
    </div>
  );
};

export default DialogFormWithScroll;
