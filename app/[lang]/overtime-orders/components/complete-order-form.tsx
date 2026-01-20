'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Table, X } from 'lucide-react';
import { Session } from 'next-auth';
import LocalizedLink from '@/components/localized-link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { revalidateOvertimeOrders as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { OvertimeType } from '../lib/types';
import {
  MultipleAttachmentFormSchema,
  MultipleAttachmentFormType,
} from '../lib/zod';
import { MultiArticleManager } from './multi-article-manager';
import type { Article } from '@/lib/data/get-all-articles';

// Update the attachment roles to match the specified requirements
const ATTACHMENT_ROLES = [
  'admin',
  'group-leader',
  'production-manager',
  'plant-manager',
  'hr',
] as const;

interface CompleteOrderFormProps {
  id: string;
  lang: string;
  session: Session | null;
  overtimeRequest: OvertimeType;
  dict: Dictionary;
  articles: Article[];
}

export default function CompleteOrderForm({
  id,
  lang,
  session,
  overtimeRequest,
  dict,
  articles,
}: CompleteOrderFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const form = useForm<MultipleAttachmentFormType>({
    resolver: zodResolver(MultipleAttachmentFormSchema) as any,
    defaultValues: {
      files: [],
      mergeFiles: true,
      actualArticles: overtimeRequest.plannedArticles || [],
      actualEmployeesWorked: undefined,
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
        toast.error(dict.completeOrderForm.toast.fileTooLargeNamed.replace('{name}', oversizedFile.name));
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate total size
      const totalSize = filesArray.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        toast.error(dict.completeOrderForm.toast.totalSizeExceeds);
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
      userEmail === overtimeRequest.requestedBy ||
      userEmail === overtimeRequest.responsibleEmployee;

    if (!canAddAttachment) {
      toast.error(dict.completeOrderForm.toast.unauthorized);
      return;
    }

    if (!id) {
      toast.error(dict.completeOrderForm.toast.contactIT);
      console.error('no overTimeRequestId');
      return;
    }

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

          // Add the actual articles data
          if (data.actualArticles && data.actualArticles.length > 0) {
            formData.append(
              'actualArticles',
              JSON.stringify(data.actualArticles),
            );
          }
          if (data.actualEmployeesWorked !== undefined) {
            formData.append(
              'actualEmployeesWorked',
              data.actualEmployeesWorked.toString(),
            );
          }

          const response = await fetch('/api/overtime-orders/upload', {
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
            reject(new Error(dict.completeOrderForm.toast.invalidResponse));
            return;
          }

          if (response.ok && result.success) {
            form.reset();
            setSelectedFiles([]);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }

            // Ensure we revalidate the data
            await revalidate();

            // Navigate back to the production overtime list
            router.push(`/${lang}/overtime-orders`);
            resolve(result.message);
          } else {
            const errorMap: { [key: string]: string } = {
              'Unauthorized': dict.completeOrderForm.errors.unauthorized,
              'Insufficient permissions to add attachment':
                dict.completeOrderForm.errors.insufficientPermissions,
              'No files': dict.completeOrderForm.errors.noFiles,
              'No overTimeRequest ID': dict.completeOrderForm.errors.noRequestId,
              'File size exceeds the limit (10MB)':
                dict.completeOrderForm.errors.fileTooLarge,
              'Total file size exceeds the limit (50MB)':
                dict.completeOrderForm.errors.totalSizeExceeds,
              'Unsupported file type': dict.completeOrderForm.errors.unsupportedFileType,
              'File already exists': dict.completeOrderForm.errors.fileExists,
              'Failed to update overTimeRequest with attachments':
                dict.completeOrderForm.errors.updateFailed,
              'Database update failed': dict.completeOrderForm.errors.databaseUpdateFailed,
              'File upload failed': dict.completeOrderForm.errors.uploadFailed,
            };

            if (response.status === 409) {
              reject(new Error(dict.completeOrderForm.toast.fileAlreadyExists));
            } else if (response.status === 403) {
              reject(new Error(dict.completeOrderForm.toast.noPermission));
            } else if (result.error && errorMap[result.error]) {
              reject(new Error(errorMap[result.error]));
            } else if (result.error) {
              console.warn('Nieprzetłumaczony błąd:', result.error);
              reject(new Error(dict.completeOrderForm.toast.untranslatedError));
            } else {
              reject(new Error(dict.completeOrderForm.toast.unknownError));
            }
          }
        } catch (error) {
          console.error('Upload error:', error);
          reject(new Error(dict.completeOrderForm.toast.uploadError));
        } finally {
          setIsUploading(false);
        }
      }),
      {
        loading: dict.completeOrderForm.toast.uploading,
        success: () => {
          const count = selectedFiles.length;
          const hasImages = selectedFiles.some(file => file.type.startsWith('image/'));
          const hasPdfs = selectedFiles.some(file => file.type === 'application/pdf');

          if (count === 1) {
            if (hasImages) {
              return dict.completeOrderForm.toast.successSingleImageConverted;
            } else {
              return dict.completeOrderForm.toast.successSinglePdf;
            }
          } else {
            if (hasImages && hasPdfs) {
              return dict.completeOrderForm.toast.successMultipleMixed.replace('{count}', String(count));
            } else if (hasImages) {
              return dict.completeOrderForm.toast.successMultipleImagesConverted.replace('{count}', String(count));
            } else {
              return dict.completeOrderForm.toast.successMultiplePdfsMerged.replace('{count}', String(count));
            }
          }
        },
        error: (err) => err.message,
      },
    );
  };

  return (
    <Card className='sm:w-[896px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{dict.completeOrderForm.title}</CardTitle>
          <LocalizedLink href={`/overtime-orders`}>
            <Button variant='outline'>
              <Table /> <span>{dict.completeOrderForm.backToOrders}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className='space-y-6'>
            <p className='text-muted-foreground text-sm'>
              {dict.completeOrderForm.description}
            </p>

            <FormField
              control={form.control}
              name='files'
              render={({ field: { onChange, value, ref, ...rest } }) => (
                <FormItem>
                  <FormLabel htmlFor='files'>{dict.completeOrderForm.attendanceList}</FormLabel>
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
                <Label>{dict.completeOrderForm.selectedFiles.replace('{count}', selectedFiles.length.toString())}</Label>
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

            {/* Actual results fields */}
            <FormField
              control={form.control}
              name='actualArticles'
              render={({ field }) => (
                <>
                  <MultiArticleManager
                    value={field.value || []}
                    onChange={field.onChange}
                    dict={dict}
                    label={dict.completeOrderForm.actualProduction}
                    initialValues={overtimeRequest.plannedArticles || []}
                    articles={articles}
                  />
                  <FormMessage />
                </>
              )}
            />

            <FormField
              control={form.control}
              name='actualEmployeesWorked'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {dict.completeOrderForm.actualEmployees.replace('{planned}', overtimeRequest.numberOfEmployees.toString())}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      step={1}
                      {...field}
                      onChange={(e) => {
                        const value =
                          e.target.value === ''
                            ? undefined
                            : parseInt(e.target.value);
                        field.onChange(value);
                      }}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <Separator className='mb-4' />

          <CardFooter className='flex justify-end'>
            <Button
              type='submit'
              disabled={isUploading || selectedFiles.length === 0}
              className='w-full sm:w-auto'
            >
              <CheckCircle className={isUploading ? 'animate-spin' : ''} />
              {dict.completeOrderForm.submitButton}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
