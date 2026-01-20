'use client';

import { PositionType } from '@/app/[lang]/inventory/lib/types';
import { UpdatePositionSchema } from '@/app/[lang]/inventory/lib/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DialogFormActions,
  DialogFormContent,
} from '@/components/ui/dialog-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { updatePosition as update } from '../actions';
import { Dictionary } from '../lib/dict';

export default function EditPositionDialog({
  position,
  dict,
}: {
  position: PositionType;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [isPendingUpdate, setIsPendingUpdate] = useState(false);
  const form = useForm<z.infer<typeof UpdatePositionSchema>>({
    resolver: zodResolver(UpdatePositionSchema) as any,
    defaultValues: {
      articleNumber: position.articleNumber,
      quantity: position.quantity,
      wip: position.wip,
      unit: position.unit,
      comment: position.comment || '',
      approved: position.approver ? true : false,
    },
  });

  const onSubmit = async (data: z.infer<typeof UpdatePositionSchema>) => {
    setIsPendingUpdate(true);
    try {
      console.log('onSubmit', data);
      const res = await update(position.identifier, data);
      if (res.success) {
        toast.success('Pozycja zapisana!');
        setOpen(false);
      } else if (res.error === 'article not found') {
        form.setError('articleNumber', { message: 'Artykuł nie istnieje' });
      } else if (res.error === 'wip not allowed') {
        form.setError('wip', { message: 'Niedozwolony dla S900' });
      } else if (res.error === 'unauthorized') {
        toast.error('Brak uprawnień!');
      } else if (res.error) {
        console.error(res.error);
        toast.error('Skontaktuj się z IT!');
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error('Skontaktuj się z IT!');
    } finally {
      setIsPendingUpdate(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
          <Button size={'sm'} variant={'outline'}>
            <Pencil />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Edycja pozycji {position.identifier}</DialogTitle>
          {/* <DialogDescription>
          </DialogDescription> */}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className='h-[300px] sm:h-[500px]'>
              <DialogFormContent>
                <FormField
                  control={form.control}
                  name='articleNumber'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artykuł</FormLabel>
                      <FormControl>
                        <Input className='w-[80px]' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='quantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ilość {`[${position.unit}]`}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          className='w-[120px]'
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='wip'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-2'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>WIP</FormLabel>
                      </div>
                      <FormMessage />
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='comment'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Komentarz</FormLabel>
                      <FormControl>
                        <Textarea className='' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className='mb-2' />
                <FormField
                  control={form.control}
                  name='approved'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>
                          Zatwierdź pozycję
                        </FormLabel>
                        {position.approver && (
                          <FormDescription>
                            Pozycja została juz zatwierdzona przez{' '}
                            {position.approver}
                          </FormDescription>
                        )}
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </DialogFormContent>
            </ScrollArea>
            <DialogFormActions
              onCancel={() => setOpen(false)}
              isPending={isPendingUpdate}
              cancelLabel='Anuluj'
              submitLabel={dict.editDialog.save}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
