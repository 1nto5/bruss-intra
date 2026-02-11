import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function NoAccess({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Alert variant='destructive' className='mx-auto max-w-md'>
      <ShieldAlert className='h-4 w-4' />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
