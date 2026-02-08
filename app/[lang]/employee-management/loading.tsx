import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <div className='flex justify-center'>
      <LoaderCircle className='mt-12 h-6 w-6 animate-spin' />
    </div>
  );
}
