'use client';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, Upload } from 'lucide-react';
import { Session } from 'next-auth';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { revalidateDeviation } from '../actions';
import { Dictionary } from '../lib/dict';
import { DeviationStatus } from '../lib/types';
import { createAttachmentFormSchema } from '../lib/zod';
import * as z from 'zod';

// Define attachment roles (can be imported from view.tsx or defined here)
const ATTACHMENT_ROLES = [
  'quality',
  'team-leader',
  'group-leader',
  'quality-manager',
  'production-manager',
  'plant-manager',
] as const;

interface AddAttachmentDialogProps {
  deviationId: string;
  deviationStatus: DeviationStatus | undefined;
  deviationOwner: string | undefined | null;
  session: Session | null;
  dict: Dictionary;
}

export default function AddAttachmentDialog({
  deviationId,
  deviationStatus,
  deviationOwner,
  session,
  dict,
}: AddAttachmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachmentFormSchema = createAttachmentFormSchema(dict.form.validation);

  const form = useForm<z.infer<typeof attachmentFormSchema>>({
    resolver: zodResolver(attachmentFormSchema),
    defaultValues: {
      name: '',
      note: '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      form.setValue('file', event.target.files[0], { shouldValidate: true });

      const filename = event.target.files[0].name;
      const nameWithoutExtension = filename.split('.').slice(0, -1).join('.');
      form.setValue('name', nameWithoutExtension || filename);
    }
  };

  const onSubmit = async (data: z.infer<typeof attachmentFormSchema>) => {
    const userRoles = session?.user?.roles || [];
    const userEmail = session?.user?.email;

    const canAddAttachment =
      deviationStatus !== 'closed' &&
      (userRoles.some((role: string) =>
        ATTACHMENT_ROLES.includes(role as (typeof ATTACHMENT_ROLES)[number]),
      ) ||
        userEmail === deviationOwner);

    if (!canAddAttachment) {
      toast.error(dict.dialogs.addAttachment.errors.noPermission);
      return;
    }

    if (!deviationId) {
      toast.error(dict.dialogs.addAttachment.errors.contactIT);
      console.error('no deviationId');
      return;
    }

    setOpen(false);

    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          const formData = new FormData();
          formData.append('file', data.file);
          formData.append('deviationId', deviationId);
          if (data.name) formData.append('name', data.name);
          if (data.note) formData.append('note', data.note);

          const response = await fetch('/api/deviations/upload', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (response.ok && result.success) {
            form.reset();
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }

            revalidateDeviation();
            resolve();
          } else {
            const errorMap: { [key: string]: string } = {
              'Unauthorized': dict.dialogs.addAttachment.errors.unauthorized,
              'No file': dict.dialogs.addAttachment.errors.noFile,
              'No deviation ID': dict.dialogs.addAttachment.errors.noDeviationId,
              'File size exceeds the limit (10MB)': dict.dialogs.addAttachment.errors.fileSizeExceeded,
              'Unsupported file type': dict.dialogs.addAttachment.errors.unsupportedFileType,
              'File already exists': dict.dialogs.addAttachment.errors.fileAlreadyExists,
              'Failed to update deviation with attachment': dict.dialogs.addAttachment.errors.databaseUpdateFailed,
              'Database update failed': dict.dialogs.addAttachment.errors.databaseUpdateFailed,
              'File upload failed': dict.dialogs.addAttachment.errors.uploadFailed,
            };

            if (response.status === 409) {
              reject(new Error(dict.dialogs.addAttachment.errors.fileAlreadyExists));
            } else if (result.error && errorMap[result.error]) {
              reject(new Error(errorMap[result.error]));
            } else if (result.error) {
              console.warn('Nieprzetłumaczony błąd:', result.error);
              reject(new Error(dict.dialogs.addAttachment.errors.generalUploadError));
            } else {
              reject(new Error(dict.dialogs.addAttachment.errors.unknownError));
            }
          }
        } catch (error) {
          console.error('Upload error:', error);
          reject(new Error(dict.dialogs.addAttachment.errors.uploadFailed));
        }
      }),
      {
        loading: dict.dialogs.addAttachment.toasts.loading,
        success: dict.dialogs.addAttachment.toasts.success,
        error: (err) => err.message,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>
          <Upload className='' />
          {dict.dialogs.addAttachment.triggerButton}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{dict.dialogs.addAttachment.title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogFormContent>
              <FormField
                control={form.control}
                name='file'
                render={({ field: { onChange, value, ref, ...rest } }) => (
                  <FormItem>
                    <FormLabel htmlFor='file'>
                      {dict.dialogs.addAttachment.fileLabel}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id='file'
                        type='file'
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        {...rest}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor='name'>
                      {dict.dialogs.addAttachment.nameLabel}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id='name'
                        placeholder={dict.dialogs.addAttachment.namePlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='note'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor='note'>
                      {dict.dialogs.addAttachment.noteLabel}
                    </FormLabel>
                    <FormControl>
                      <Textarea id='note' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogFormContent>
            <DialogFormActions
              onCancel={() => setOpen(false)}
              isPending={isUploading}
              cancelLabel='Anuluj'
              submitLabel={dict.dialogs.addAttachment.submitButton}
              submitIcon={<Paperclip />}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
