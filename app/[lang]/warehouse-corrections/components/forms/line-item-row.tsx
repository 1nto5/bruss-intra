"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClearableCombobox } from "@/components/clearable-combobox";
import { FreeTextCombobox } from "@/components/free-text-combobox";
import { ServerSearchCombobox } from "@/components/server-search-combobox";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CorrectionFormValues } from "../../lib/zod";
import type {
  ArticleType,
  QuarryType,
} from "../../lib/types";
import type { Dictionary } from "../../lib/dict";

interface LineItemRowProps {
  index: number;
  form: UseFormReturn<CorrectionFormValues>;
  quarries: QuarryType[];
  reasonOptions: string[];
  dict: Dictionary;
  isFirst: boolean;
  onRemove: () => void;
}

export default function LineItemRow({
  index,
  form,
  quarries,
  reasonOptions,
  dict,
  isFirst,
  onRemove,
}: LineItemRowProps) {

  const quantity = form.watch(`items.${index}.quantity`);
  const unitPrice = form.watch(`items.${index}.unitPrice`);
  const calculatedValue =
    Math.round((quantity || 0) * (unitPrice || 0) * 100) / 100;

  const articleNumber = form.watch(`items.${index}.articleNumber`);
  const articleName = form.watch(`items.${index}.articleName`);
  const displayValue = articleNumber
    ? `${articleNumber} - ${articleName}`
    : "";

  const fetchArticles = useCallback(async (query: string) => {
    const res = await fetch(
      `/api/warehouse-corrections/articles?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    return res.json() as Promise<ArticleType[]>;
  }, []);

  const handleArticleSelect = useCallback(
    (article: ArticleType | null) => {
      if (article) {
        form.setValue(`items.${index}.articleNumber`, article.articleNumber);
        form.setValue(`items.${index}.articleName`, article.articleName);
        form.setValue(`items.${index}.unitPrice`, article.unitPrice);
        form.setValue(
          `items.${index}.value`,
          Math.round((quantity || 0) * article.unitPrice * 100) / 100,
        );
      } else {
        form.setValue(`items.${index}.articleNumber`, "");
        form.setValue(`items.${index}.articleName`, "");
        form.setValue(`items.${index}.unitPrice`, 0);
        form.setValue(`items.${index}.value`, 0);
      }
    },
    [form, index, quantity],
  );

  return (
    <div className="relative rounded-md border p-4 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          #{index + 1}
        </span>
        {!isFirst && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-6 w-6 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Article */}
        <FormField
          control={form.control}
          name={`items.${index}.articleNumber`}
          render={() => (
            <FormItem>
              <FormLabel>{dict.form.article}</FormLabel>
              <FormControl>
                <ServerSearchCombobox<ArticleType>
                  className="w-full"
                  displayValue={displayValue}
                  onSelect={handleArticleSelect}
                  fetchResults={fetchArticles}
                  renderItem={(a) => (
                    <span>
                      <span className="font-medium">{a.articleNumber}</span>
                      {" - "}
                      {a.articleName}
                    </span>
                  )}
                  getKey={(a) => a.articleNumber}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quarry */}
        <FormField
          control={form.control}
          name={`items.${index}.quarry`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.quarry}</FormLabel>
              <FormControl>
                <ClearableCombobox
                  className="w-full"
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  options={quarries}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Batch */}
        <FormField
          control={form.control}
          name={`items.${index}.batch`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.batch}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity */}
        <FormField
          control={form.control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.quantity}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    field.onChange(val);
                    form.setValue(
                      `items.${index}.value`,
                      Math.round(val * (unitPrice || 0) * 100) / 100,
                    );
                  }}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit Price (display) */}
        <FormField
          control={form.control}
          name={`items.${index}.unitPrice`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.unitPrice}</FormLabel>
              <p className="text-sm pt-2">
                {field.value ? `${field.value} EUR` : (
                  <span className="text-muted-foreground">-</span>
                )}
              </p>
            </FormItem>
          )}
        />

        {/* Value (calculated, display) */}
        <FormItem>
          <FormLabel>{dict.form.value}</FormLabel>
          <p className="text-sm font-medium pt-2">
            {calculatedValue ? `${calculatedValue.toFixed(2)} EUR` : (
              <span className="text-muted-foreground font-normal">-</span>
            )}
          </p>
        </FormItem>

        {/* Reason */}
        <FormField
          control={form.control}
          name={`items.${index}.reason`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.reason}</FormLabel>
              <FormControl>
                <FreeTextCombobox
                  value={field.value}
                  onValueChange={field.onChange}
                  options={reasonOptions}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Comment */}
        <FormField
          control={form.control}
          name={`items.${index}.comment`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.comment}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={2}
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
