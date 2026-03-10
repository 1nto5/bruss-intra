"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import {
  ColumnDef,
  SortingState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { CompetencyType } from "../../lib/types";
import { localize } from "../../lib/types";
import type { Dictionary } from "../../lib/dict";
import type { Locale } from "@/lib/config/i18n";
import { deleteCompetency } from "../../actions/competencies";
import { cn } from "@/lib/utils/cn";

interface CompetencyTableProps {
  data: CompetencyType[];
  dict: Dictionary;
  lang: Locale;
  canEdit: boolean;
  canDelete: boolean;
  expandAll?: boolean;
}

export function CompetencyTable({
  data,
  dict,
  lang,
  canEdit,
  canDelete,
  expandAll,
}: CompetencyTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>(
    expandAll ? true : {},
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const l = lang as "pl" | "de" | "en";

  const columns: ColumnDef<CompetencyType>[] = [
    {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              row.getIsExpanded() && "rotate-90",
            )}
          />
        </Button>
      ),
    },
    {
      accessorKey: "name",
      header: dict.competencies.name,
      cell: ({ row }) => localize(row.original.name, l),
    },
    ...(canEdit
      ? [
          {
            id: "actions",
            header: dict.actions,
            cell: ({ row }: { row: { original: CompetencyType } }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${lang}/competency-matrix/competencies/${row.original._id}/edit`}
                    >
                      {dict.edit}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setSelectedId(row.original._id!);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      {dict.delete}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColumnDef<CompetencyType>,
        ]
      : []),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    state: { sorting, expanded },
  });

  async function handleDelete() {
    if (!selectedId) return;
    const res = await deleteCompetency(selectedId);
    if ("error" in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.competencies.deleted);
      router.refresh();
    }
    setDeleteDialogOpen(false);
    setSelectedId(null);
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow key={`${row.id}-expanded`}>
                      <TableCell colSpan={columns.length} className="p-0">
                        <div className="grid grid-cols-3 gap-px bg-muted/50">
                          {([1, 2, 3] as const).map((level) => (
                            <div key={level} className="bg-background p-4">
                              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                                {String(
                                  dict.competencies[
                                    `level${level}` as keyof typeof dict.competencies
                                  ],
                                )}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">
                                {localize(row.original.levels[level], l) || "-"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  {dict.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dict.competencies.deleteConfirm}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dict.competencies.deleteWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {dict.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
