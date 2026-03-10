"use client";

import { ColumnDef } from "@tanstack/react-table";

import { ProjectsLocaleStringType } from "../../lib/types";

export const columns: ColumnDef<ProjectsLocaleStringType>[] = [
  // {
  //   id: 'actions',
  //   header: 'Akcje',
  //   cell: ({ row }) => {
  //     const request = row.original;
  //     return (
  //       <>
  //         <DropdownMenu>
  //           <DropdownMenuTrigger asChild>
  //             <Button variant='ghost' className='h-8 w-8 p-0'>
  //               <MoreHorizontal className='h-4 w-4' />
  //             </Button>
  //           </DropdownMenuTrigger>
  //           <DropdownMenuContent align='end'>
  //             {request.status === 'draft' && (
  //               <Link href={`/production-overtime/edit/${request._id}`}>
  //                 <DropdownMenuItem>
  //                   <Pencil className='mr-2 h-4 w-4' />
  //                   <span>Edytuj</span>
  //                 </DropdownMenuItem>
  //               </Link>
  //             )}
  //             {request.status !== 'draft' && (
  //               <>
  //                 <Link href={`/production-overtime/${request._id}`}>
  //                   <DropdownMenuItem>
  //                     <Users className='mr-2 h-4 w-4' />
  //                     <span>Pracownicy</span>
  //                   </DropdownMenuItem>
  //                 </Link>
  //                 {request.status !== 'approved' && (
  //                   <DropdownMenuItem
  //                     onClick={() => request._id && handleApprove(request._id)}
  //                   >
  //                     <Check className='mr-2 h-4 w-4' />
  //                     <span>Zatwierdź</span>
  //                   </DropdownMenuItem>
  //                 )}
  //               </>
  //             )}
  //             {request.status === 'draft' && (
  //               <DropdownMenuItem
  //                 onClick={() => request._id && deleteDraft(request._id)}
  //                 className='focus:bg-red-400 dark:focus:bg-red-700'
  //               >
  //                 <Trash2 className='mr-2 h-4 w-4' />
  //                 <span>Usuń</span>
  //               </DropdownMenuItem>
  //             )}
  //           </DropdownMenuContent>
  //         </DropdownMenu>
  //       </>
  //     );
  //   },
  // },
  {
    accessorKey: "dateLocaleString",
    header: "Date",
  },
  {
    accessorKey: "time",
    header: "Time [h]",
  },
  {
    accessorKey: "scope",
    header: "Work Scope",
    cell: ({ row }) => {
      const reason = row.getValue("scope");
      return <div className="w-[400px] text-justify">{reason as string}</div>;
    },
  },
  {
    accessorKey: "note",
    header: "Note",
    cell: ({ row }) => {
      const note = row.getValue("note");
      return <div className="w-[250px] text-justify">{note as string}</div>;
    },
  },
];
