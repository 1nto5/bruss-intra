'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Paperclip, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  revalidateProductionOvertime,
  revalidateProductionOvertimeRequest,
} from '../actions';
import { Dictionary } from '../lib/dict';
import { OvertimeStatus } from '../lib/types';
import { createMultipleAttachmentFormSchema } from '../lib/zod';

// Update the attachment roles to match the specified requirements
const ATTACHMENT_ROLES = [
  'admin',
  'group-leader',
  'production-manager',
  'plant-manager',
  'hr',
] as const;

interface AddAttachmentDialogProps {
  id: string;
  status: OvertimeStatus;
  owner: string | undefined | null;
  responsibleEmployee: string | undefined | null;
  session: Session | null;
  dict: Dictionary;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddAttachmentDialog({
  id,
  owner,
  responsibleEmployee,
  session,
  dict,
  isOpen,
  onOpenChange,
}: AddAttachmentDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const multipleAttachmentFormSchema = createMultipleAttachmentFormSchema(
    dict.validation,
  );
  type MultipleAttachmentFormType = z.infer<
    typeof multipleAttachmentFormSchema
  >;

  const form = useForm<MultipleAttachmentFormType>({
    resolver: zodResolver(multipleAttachmentFormSchema) as any,
    defaultValues: {
      files: [],
      mergeFiles: true,
    },
  });

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);

      // Validate individual file sizes
      const oversizedFile = filesArray.find(file => file.size > MAX_FILE_SIZE);
      if (oversizedFile) {
        toast.error(`Plik "${oversizedFile.name}" przekracza dozwolony rozmiar (10MB)`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate total size
      const totalSize = filesArray.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        toast.error('Łączny rozmiar plików przekracza dozwolony limit (50MB)');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setSelectedFiles(filesArray);
      form.setValue('files', filesArray, { shouldValidate: true });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    form.setValue('files', newFiles, { shouldValidate: true });

    // Reset the input if no files remain
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onSubmit = async (data: MultipleAttachmentFormType) => {
    const userRoles = session?.user?.roles || [];
    const userEmail = session?.user?.email;

    // Check if user is the request owner, responsible employee, or has one of the allowed roles
    const canAddAttachment =
      userRoles.some((role: string) =>
        ATTACHMENT_ROLES.includes(role as (typeof ATTACHMENT_ROLES)[number]),
      ) ||
      userEmail === owner ||
      userEmail === responsibleEmployee;

    if (!canAddAttachment) {
      toast.error('Nie masz uprawnień do dodania listy obecności.');
      return;
    }

    if (!id) {
      toast.error('Skontaktuj się z IT!');
      console.error('no overTimeRequestId');
      return;
    }

    onOpenChange(false);
    setIsUploading(true);

    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          const formData = new FormData();

          // Add all files to FormData
          data.files.forEach((file: File) => {
            formData.append('files', file);
          });

          formData.append('overTimeRequestId', id);
          formData.append('mergeFiles', data.mergeFiles.toString());

          const response = await fetch('/api/production-overtime/upload', {
            method: 'POST',
            body: formData,
          });

          // For debugging, log the full response
          const responseText = await response.text();

          // Parse the response text as JSON
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            reject(new Error('Nieprawidłowa odpowiedź z serwera'));
            return;
          }

          if (response.ok && result.success) {
            form.reset();
            setSelectedFiles([]);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }

            // Call server actions to revalidate both list and detail views
            await revalidateProductionOvertime();
            await revalidateProductionOvertimeRequest();

            resolve();
          } else {
            const errorMap: { [key: string]: string } = {
              'Unauthorized': 'Brak autoryzacji',
              'Insufficient permissions to add attachment':
                'Brak uprawnień do dodania załącznika',
              'No files': 'Nie wybrano plików',
              'No overTimeRequest ID': 'Brak ID zlecenia',
              'File size exceeds the limit (10MB)':
                'Jeden z plików przekracza dozwolony rozmiar (10MB)',
              'Total file size exceeds the limit (50MB)':
                'Łączny rozmiar plików przekracza dozwolony limit (50MB)',
              'Unsupported file type': 'Nieobsługiwany format pliku',
              'File already exists': 'Plik o tej nazwie już istnieje',
              'Failed to update overTimeRequest with attachments':
                'Nie udało się zaktualizować bazy danych',
              'Database update failed': 'Błąd aktualizacji bazy danych',
              'File upload failed': 'Błąd podczas przesyłania plików',
            };

            if (response.status === 409) {
              reject(new Error('Jeden z plików już istnieje'));
            } else if (response.status === 403) {
              reject(new Error('Brak uprawnień do dodania załączników'));
            } else if (result.error && errorMap[result.error]) {
              reject(new Error(errorMap[result.error]));
            } else if (result.error) {
              console.warn('Nieprzetłumaczony błąd:', result.error);
              reject(new Error('Wystąpił błąd podczas dodawania załączników'));
            } else {
              reject(new Error('Wystąpił nieznany błąd'));
            }
          }
        } catch (error) {
          console.error('Upload error:', error);
          reject(new Error('Wystąpił błąd podczas wysyłania plików'));
        } finally {
          setIsUploading(false);
        }
      }),
      {
        loading: 'Przesyłanie plików...',
        success: (data) => {
          const count = selectedFiles.length;
          const hasImages = selectedFiles.some(file => file.type.startsWith('image/'));
          const hasPdfs = selectedFiles.some(file => file.type === 'application/pdf');

          if (count === 1) {
            if (hasImages) {
              return 'Plik przesłany oraz przekonwertowany do PDF pomyślnie! Status zlecenia zmieniony na ukończony.';
            } else {
              return 'Plik PDF przesłany pomyślnie! Status zlecenia zmieniony na ukończony.';
            }
          } else {
            if (hasImages && hasPdfs) {
              return `${count} plików przesłanych oraz scalonych do PDF pomyślnie! Status zlecenia zmieniony na ukończony.`;
            } else if (hasImages) {
              return `${count} plików przesłanych oraz przekonwertowanych do PDF pomyślnie! Status zlecenia zmieniony na ukończony.`;
            } else {
              return `${count} plików PDF scalonych pomyślnie! Status zlecenia zmieniony na ukończony.`;
            }
          }
        },
        error: (err) => err.message,
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Dodaj listę obecności</DialogTitle>
          <DialogDescription>
            Dodanie listy obecności jest równoznaczne z potwierdzeniem wykonania
            zlecenia oraz zmieni jego status na ukończony. Możesz przesłać wiele
            plików jednocześnie.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogFormContent>
              <FormField
                control={form.control}
                name='files'
                render={({ field: { onChange, value, ref, ...rest } }) => (
                  <FormItem>
                    <FormLabel htmlFor='files'>Lista obecności</FormLabel>
                    <FormControl>
                      <Input
                        id='files'
                        type='file'
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept='image/*,image/heic,image/heif,application/pdf'
                        {...rest}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display selected files */}
              {selectedFiles.length > 0 && (
                <div className='space-y-2'>
                  <Label>Wybrane pliki ({selectedFiles.length}):</Label>
                  <div className='max-h-40 space-y-2 overflow-y-auto'>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className='bg-muted flex items-center justify-between rounded-md p-2'
                      >
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-medium'>
                            {file.name}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => removeFile(index)}
                          className='h-6 w-6 p-0'
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogFormContent>

            <DialogFormActions
              onCancel={() => onOpenChange(false)}
              isPending={isUploading || selectedFiles.length === 0}
              cancelLabel='Anuluj'
              submitLabel={`Dodaj ${selectedFiles.length === 1 ? 'plik' : 'pliki'}`}
              submitIcon={<Paperclip />}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
