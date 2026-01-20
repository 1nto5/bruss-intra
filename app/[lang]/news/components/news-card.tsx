'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pin, PinOff, Edit, Trash, MoreVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import LocalizedLink from '@/components/localized-link';
import { deleteNews, togglePin } from '../actions';
import { toast } from 'sonner';
import { NewsType } from '../lib/types';
import { useState } from 'react';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDate } from '@/lib/utils/date-format';

interface NewsCardProps {
  news: NewsType;
  isAdmin: boolean;
  lang: string;
  dict: any;
}

export function NewsCard({ news, isAdmin, lang, dict }: NewsCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteNews(news._id);
      if (result.success) {
        toast.success(dict.messages[result.success] || result.success);
      } else if (result.error) {
        toast.error(result.error === 'unauthorized' ? dict.messages.unauthorized : dict.messages[result.error] || result.error);
      }
    } catch (error) {
      console.error('handleDelete error:', error);
      toast.error(dict.messages.deleteErrorGeneric);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };
  
  const handleTogglePin = async () => {
    setIsToggling(true);
    try {
      const result = await togglePin(news._id, !news.isPinned);
      if (result.success) {
        toast.success(dict.messages[result.success] || result.success);
      } else if (result.error) {
        toast.error(result.error === 'unauthorized' ? dict.messages.unauthorized : dict.messages[result.error] || result.error);
      }
    } catch (error) {
      console.error('handleTogglePin error:', error);
      toast.error(dict.messages.pinErrorGeneric);
    } finally {
      setIsToggling(false);
    }
  };
  
  return (
    <Card className='mb-4'>
      <CardHeader>
        <div className='flex justify-between items-start'>
          <div className='flex-1'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              {news.isPinned && <Pin className='h-4 w-4 text-primary' />}
              {news.title}
            </CardTitle>
            <CardDescription className='text-sm'>
              {formatDate(news.createdAt)} • {extractNameFromEmail(news.author)}
            </CardDescription>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <MoreVertical className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem asChild>
                  <LocalizedLink href={`/news/${news._id}/edit`}>
                    <Edit /> {dict.actions.edit}
                  </LocalizedLink>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleTogglePin}
                  disabled={isToggling}
                >
                  {news.isPinned ? (
                    <>
                      <PinOff /> {dict.actions.unpin}
                    </>
                  ) : (
                    <>
                      <Pin /> {dict.actions.pin}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)} 
                  className='text-destructive'
                  disabled={isDeleting}
                >
                  <Trash /> {dict.actions.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='prose prose-sm dark:prose-invert max-w-none'>
          <ReactMarkdown>{news.content}</ReactMarkdown>
        </div>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.actions.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.actions.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? dict.actions.deleting : dict.actions.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}