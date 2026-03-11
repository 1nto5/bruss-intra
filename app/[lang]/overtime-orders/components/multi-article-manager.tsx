"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, X, CircleX } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { ArticleSearch, ArticleSearchRef } from "./article-search";
import { Dictionary } from "../lib/dict";
import type { Article } from "@/lib/data/get-all-articles";

type ArticleQuantity = {
  articleNumber: string;
  quantity: number;
};

type ArticleWithDetails = ArticleQuantity & {
  name?: string;
  unit?: string;
};

interface MultiArticleManagerProps {
  value: ArticleQuantity[];
  onChange: (articles: ArticleQuantity[]) => void;
  dict: Dictionary;
  label?: string;
  placeholder?: string;
  initialValues?: ArticleQuantity[];
  onPendingChange?: (pending: {
    articleNumber: string;
    quantity: string;
  }) => void;
  onClearError?: () => void;
  articles: Article[];
}

export function MultiArticleManager({
  value,
  onChange,
  dict,
  label,
  placeholder,
  initialValues = [],
  onPendingChange,
  onClearError,
  articles,
}: MultiArticleManagerProps) {
  const [newArticle, setNewArticle] = useState<{
    articleNumber: string;
    quantity: string;
  }>({
    articleNumber: "",
    quantity: "",
  });

  // Notify parent component about pending article changes
  useEffect(() => {
    if (onPendingChange) {
      onPendingChange(newArticle);
    }
  }, [newArticle, onPendingChange]);

  const [initialized, setInitialized] = useState(false);
  const articleSearchRef = useRef<ArticleSearchRef>(null);

  // Initialize with initialValues only once
  useEffect(() => {
    if (!initialized && value.length === 0 && initialValues.length > 0) {
      onChange([...initialValues]);
      setInitialized(true);
    }
  }, [initialized, value.length, initialValues, onChange]);

  // Get article details from provided articles array
  const articlesWithDetails = useMemo(() => {
    return value.map((article) => {
      const foundArticle = articles.find(
        (a) => a.number === article.articleNumber,
      );
      return {
        ...article,
        name: foundArticle?.name || dict.multiArticleManager.unknownArticle,
        unit: foundArticle?.unit || "",
      };
    });
  }, [value, articles, dict.multiArticleManager.unknownArticle]);

  const addArticle = () => {
    if (newArticle.articleNumber && newArticle.quantity) {
      const quantity = parseInt(newArticle.quantity);
      if (quantity > 0) {
        // Check if article already exists
        const existingIndex = value.findIndex(
          (item) => item.articleNumber === newArticle.articleNumber,
        );

        if (existingIndex >= 0) {
          // Update existing article quantity
          const updatedArticles = [...value];
          updatedArticles[existingIndex].quantity = quantity;
          onChange(updatedArticles);
        } else {
          // Add new article
          onChange([
            ...value,
            { articleNumber: newArticle.articleNumber, quantity },
          ]);
        }

        // Reset form and focus on article search
        setNewArticle({ articleNumber: "", quantity: "" });
        setTimeout(() => {
          articleSearchRef.current?.focus();
        }, 100);
      }
    }
  };

  const removeArticle = (index: number) => {
    const updatedArticles = value.filter((_, i) => i !== index);
    onChange(updatedArticles);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updatedArticles = [...value];
    updatedArticles[index].quantity = quantity;
    onChange(updatedArticles);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addArticle();
    }
  };

  const clearFields = () => {
    setNewArticle({ articleNumber: "", quantity: "" });
    if (onClearError) {
      onClearError();
    }
    setTimeout(() => {
      articleSearchRef.current?.focus();
    }, 100);
  };

  return (
    <div className="space-y-4">
      {(label || dict.multiArticleManager.label) && (
        <h3 className="text-base font-semibold">
          {label || dict.multiArticleManager.label}
        </h3>
      )}

      {/* Existing articles table */}
      {value.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.multiArticleManager.articleNumber}</TableHead>
                <TableHead>{dict.multiArticleManager.articleName}</TableHead>
                <TableHead className="w-32 text-center">
                  {dict.multiArticleManager.quantity}
                </TableHead>
                <TableHead className="w-16 text-center">
                  {dict.multiArticleManager.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articlesWithDetails.map((article, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {article.articleNumber}
                  </TableCell>
                  <TableCell>
                    <span>
                      {article.name || dict.multiArticleManager.loading}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={article.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        updateQuantity(index, value);
                      }}
                      className="text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArticle(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add new article form */}
      <div className="flex w-full gap-2">
        <div className="min-w-0 flex-[4]">
          <ArticleSearch
            ref={articleSearchRef}
            value={newArticle.articleNumber}
            onSelect={(articleNumber) => {
              setNewArticle((prev) => ({ ...prev, articleNumber }));
            }}
            dict={dict}
            placeholder={placeholder}
            articles={articles}
          />
        </div>
        <div className="flex min-w-[180px] flex-[1] gap-2">
          <Input
            type="number"
            min={1}
            step={1}
            value={newArticle.quantity}
            onChange={(e) =>
              setNewArticle((prev) => ({ ...prev, quantity: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            placeholder={dict.multiArticleManager.quantityPlaceholder}
            className="min-w-[80px] flex-1"
          />
          <Button
            type="button"
            onClick={clearFields}
            disabled={!newArticle.articleNumber && !newArticle.quantity}
            variant="destructive"
            className="h-10 shrink-0 px-3"
            title={dict.multiArticleManager.clearFields}
          >
            <CircleX />
          </Button>
          <Button
            type="button"
            onClick={addArticle}
            disabled={!newArticle.articleNumber || !newArticle.quantity}
            className="h-10 shrink-0 px-3"
            title={dict.multiArticleManager.addArticle}
          >
            <Plus />
          </Button>
        </div>
      </div>
    </div>
  );
}
