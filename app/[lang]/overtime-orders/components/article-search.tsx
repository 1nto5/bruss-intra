'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';
import { Check, ChevronsUpDown } from 'lucide-react';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Dictionary } from '../lib/dict';
import type { Article } from '@/lib/data/get-all-articles';

interface ArticleSearchProps {
  value?: string;
  onSelect: (articleNumber: string) => void;
  dict: Dictionary;
  placeholder?: string;
  articles: Article[];
}

export interface ArticleSearchRef {
  focus: () => void;
}

export const ArticleSearch = forwardRef<ArticleSearchRef, ArticleSearchProps>(
  function ArticleSearch({ value, onSelect, dict, placeholder, articles }, ref) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useImperativeHandle(ref, () => ({
      focus: () => {
        setOpen(true);
      },
    }));

    // Filter articles locally based on search query
    const filteredArticles = useMemo(() => {
      if (searchQuery.length < 2) {
        return [];
      }
      const query = searchQuery.toLowerCase();
      return articles
        .filter(
          (article) =>
            article.number.toLowerCase().includes(query) ||
            article.name.toLowerCase().includes(query),
        )
        .slice(0, 20); // Limit to 20 results
    }, [articles, searchQuery]);

    const selectedArticle = articles.find(
      (article) => article.number === value,
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            className='w-full justify-between'
          >
            {selectedArticle
              ? `${selectedArticle.number} - ${selectedArticle.name}`
              : placeholder || dict.articleSearch.placeholder}
            <ChevronsUpDown className='shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[300px] p-0' side='bottom' align='start'>
          <Command>
            <CommandInput
              placeholder={dict.articleSearch.searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery.length < 2
                  ? dict.articleSearch.minCharsRequired
                  : dict.articleSearch.notFound}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  key='reset'
                  onSelect={() => {
                    onSelect('');
                    setOpen(false);
                  }}
                >
                  <Check className='opacity-0' />
                  {dict.articleSearch.notSelected}
                </CommandItem>
                {filteredArticles.map((article) => (
                  <CommandItem
                    key={article._id}
                    value={article.number}
                    onSelect={(currentValue) => {
                      onSelect(currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === article.number ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className='flex flex-col'>
                      <span className='font-medium'>{article.number}</span>
                      <span className='text-muted-foreground text-sm'>
                        {article.name} ({article.unit})
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
