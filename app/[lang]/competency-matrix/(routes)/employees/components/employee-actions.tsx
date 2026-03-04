'use client';

import Link from 'next/link';
import { MoreHorizontal, User, ClipboardCheck, Award } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmployeeActionsProps {
  identifier: string;
  lang: string;
  dict: {
    employees: {
      viewEmployee: string;
      evaluate: string;
      addCertificate: string;
    };
  };
  hasFullAccess: boolean;
  canAssess: boolean;
  viewMode: 'admin' | 'manager' | 'employee';
}

export function EmployeeActions({
  identifier,
  lang,
  dict,
  hasFullAccess,
  canAssess,
  viewMode,
}: EmployeeActionsProps) {
  const base = `/${lang}/competency-matrix`;
  const profileHref = `${base}/employees/${identifier}`;

  if (viewMode === 'employee') {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href={profileHref}>
          <User className="mr-2 h-4 w-4" />
          {dict.employees.viewEmployee}
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <User className="mr-2 h-4 w-4" />
            {dict.employees.viewEmployee}
          </Link>
        </DropdownMenuItem>
        {canAssess && (
          <DropdownMenuItem asChild>
            <Link
              href={`${base}/evaluations/create?employee=${identifier}`}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {dict.employees.evaluate}
            </Link>
          </DropdownMenuItem>
        )}
        {hasFullAccess && (
          <DropdownMenuItem asChild>
            <Link
              href={`${base}/certifications/add?employee=${identifier}`}
            >
              <Award className="mr-2 h-4 w-4" />
              {dict.employees.addCertificate}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
