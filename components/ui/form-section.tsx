export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-4'>
      <div className='border-b pb-2'>
        <h3 className='text-sm font-medium'>{title}</h3>
        {description && (
          <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
