# IT Inventory Component Formatting Standards

This document defines the standard formatting patterns for components in the IT Inventory application, aligned with the Overtime Orders application for consistency.

## Table of Contents

1. [Main Page Structure](#main-page-structure)
2. [Form Components](#form-components)
3. [Page Components](#page-components)
4. [Layout Components](#layout-components)
5. [Table Columns](#table-columns)
6. [MultiSelect Components](#multiselect-components)
7. [Loading States](#loading-states)

---

## Main Page Structure

Main pages (index pages) should use a **Card wrapper** with everything inside CardHeader for minimal spacing.

### Pattern

```tsx
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{dict.page.title}</CardTitle>
          {canManage && (
            <LocalizedLink href="/path/to/action">
              <Button variant="outline">
                <Icon /> <span>{dict.page.actionLabel}</span>
              </Button>
            </LocalizedLink>
          )}
        </div>

        {/* Summary cards (if applicable) */}
        <SummaryCards items={items} dict={dict} />

        {/* Filters */}
        <Suspense
          fallback={
            <div className="h-48 bg-muted animate-pulse rounded-lg mb-6" />
          }
        >
          <TableFiltering dict={dict} lang={lang} fetchTime={fetchTime} />
        </Suspense>
      </CardHeader>

      {/* Data table - outside CardHeader */}
      <Suspense
        fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}
      >
        <DataTableWrapper
          items={items}
          session={session}
          dict={dict}
          lang={lang}
        />
      </Suspense>
    </Card>
  );
}
```

### Key Points

- **NO outer container div** - start directly with `<Card>`
- **NO CardContent wrapper** - everything in CardHeader or directly in Card
- CardHeader gets `className='pb-2'` to reduce bottom padding
- Title and button div gets `className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'`
- Summary cards and filters INSIDE CardHeader
- Data table OUTSIDE CardHeader but inside Card
- Button uses `variant='outline'` style
- Wrap async content in `<Suspense>` with skeleton fallbacks

---

## Data Table Components

Data tables should use **CardContent** and **CardFooter** wrappers with minimal pagination UI.

### Pattern

```tsx
import { CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export function DataTable({ columns, data, session, dict }) {
  // ... table setup ...

  return (
    <>
      <CardContent className="space-y-4">
        {/* Bulk Actions (if applicable) */}
        <BulkActions selectedItems={selectedItems} dict={dict} />

        <div className="rounded-md border">
          <Table>
            <TableHeader>{/* Table header rows */}</TableHeader>
            <TableBody>{/* Table body rows */}</TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ArrowRight className="rotate-180 transform" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ArrowRight />
        </Button>
      </CardFooter>
    </>
  );
}
```

### Key Points

- Return fragment `<>...</>` with CardContent and CardFooter
- CardContent has `className='space-y-4'`
- Bulk actions INSIDE CardContent before table
- Table wrapped in `<div className='rounded-md border'>`
- CardFooter has `className='flex justify-between'`
- Pagination uses ArrowRight icons only (no text)
- Previous button rotates arrow 180 degrees
- NO "Page X of Y" text
- NO "X rows selected" text

---

## Form Components

Form components should have **back buttons INSIDE CardHeader**, not as external elements.

### Pattern

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import LocalizedLink from "@/components/localized-link";
import { Table } from "lucide-react";

export default function FormComponent({ dict }) {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2 sm:flex sm:justify-between sm:gap-4">
          <CardTitle>{dict.form.title}</CardTitle>
          <LocalizedLink href="/it-inventory">
            <Button variant="outline">
              <Table /> <span>{dict.form.inventoryTable}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">{/* Form fields */}</CardContent>
          <CardFooter>
            <Button type="submit">{dict.common.save}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
```

### With Metadata (Edit Forms)

```tsx
<CardHeader>
  <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
    <div>
      <CardTitle>{dict.form.editItem.title}</CardTitle>
      <div className="text-sm text-muted-foreground">
        {dict.table.columns.assetId}: <strong>{item.assetId}</strong> |
        {dict.table.columns.category}: <strong>{dict.categories[item.category]}</strong>
      </div>
    </div>
    <LocalizedLink href='/it-inventory'>
      <Button variant='outline'>
        <Table /> <span>{dict.form.editItem.inventoryTable}</span>
      </Button>
    </LocalizedLink>
  </div>
</CardHeader>
<Separator className='mb-4' />
```

### Required Imports

```tsx
import { Separator } from "@/components/ui/separator";
import LocalizedLink from "@/components/localized-link";
import { Table } from "lucide-react"; // or other appropriate icon
```

### Key Points

- Back button INSIDE CardHeader, not as external element
- Use `LocalizedLink` for navigation
- Use responsive flex layout
- Add `Separator` after CardHeader
- Wrap title and metadata in nested `<div>` for proper layout

---

## Page Components

Page components should be **simplified** - they just return the form component.

### ❌ WRONG (Old Pattern)

```tsx
export default async function Page() {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-4">
        <Link href={`/${lang}/path`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {dict.common.back}
          </Button>
        </Link>
      </div>
      <FormComponent dict={dict} lang={lang} />
    </div>
  );
}
```

### ✅ CORRECT (New Pattern)

```tsx
export default async function Page() {
  const dict = await getDictionary(lang);
  const item = await getItem(id);

  return <FormComponent item={item} dict={dict} lang={lang} />;
}
```

### Key Points

- Remove external container divs
- Remove external back buttons
- Just return the form component directly
- Back button is now inside the form component

---

## Layout Components

Layout components should provide **centered wrappers** for form pages.

### Pattern

```tsx
import { getDictionary } from "../lib/dict";
import { Locale } from "@/lib/config/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; id?: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.form.sectionTitle} | ${dict.title}`,
  };
}

export default function LayoutName({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex justify-center">{children}</div>;
}
```

### Key Points

- Use named function components (e.g., `EditItemLayout`, not `Layout`)
- Include `generateMetadata` for dynamic page titles
- Params must include all route segments (e.g., `{ lang: Locale; id: string }` for `[id]` routes)
- Use centered wrapper: `<div className='flex justify-center'>{children}</div>`
- **NEVER** use `<>{children}</>` for form layouts

---

## Table Columns

Table columns should follow consistent patterns for sorting, formatting, and accessibility.

### Sortable Column Pattern

```tsx
{
  accessorKey: 'fieldName',
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {dict.table.columns.fieldName}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => {
    const value = row.getValue('fieldName') as Type;
    return <div className="text-sm">{formatValue(value)}</div>;
  },
  enableSorting: true,
}
```

### Optional Field Handling

```tsx
{
  accessorKey: 'optionalField',
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {dict.table.columns.optionalField}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => {
    const value = row.getValue('optionalField') as Type | undefined;
    if (!value) return <div className="text-sm text-muted-foreground">—</div>;
    return <div className="text-sm">{formatValue(value)}</div>;
  },
  enableSorting: true,
}
```

### Date Column Pattern

```tsx
import { formatDate } from '@/lib/utils/date-format';

{
  accessorKey: 'dateField',
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {dict.table.columns.dateField}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => {
    const date = row.getValue('dateField') as Date | undefined;
    if (!date) return <div className="text-sm text-muted-foreground">—</div>;
    return <div className="text-sm">{formatDate(date)}</div>;
  },
  enableSorting: true,
}
```

### Key Points

- Use `ArrowUpDown` icon for sortable columns
- Handle optional fields gracefully with "—" placeholder
- Use `formatDate()` utility for date formatting
- Add appropriate TypeScript types
- Set `enableSorting: true` for sortable columns

---

## MultiSelect Components

MultiSelect components **MUST** include translation props.

### Pattern

```tsx
<MultiSelect
  options={options}
  value={selectedValue}
  onValueChange={setSelectedValue}
  placeholder={dict.common.select}
  emptyText={dict.table.noResults}
  clearLabel={dict.common.clear} // REQUIRED
  selectedLabel={dict.bulk.selected} // REQUIRED
  className="w-full"
/>
```

### Required Dictionary Keys

```json
{
  "common": {
    "select": "select",
    "clear": "Clear"
  },
  "bulk": {
    "selected": "selected"
  },
  "table": {
    "noResults": "No results."
  }
}
```

### Key Points

- ALWAYS include `clearLabel` and `selectedLabel` props
- Use existing dictionary translations
- Never leave these as hardcoded English text

---

## Loading States

Loading components should use a centered spinner.

### Pattern

```tsx
import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex justify-center">
      <LoaderCircle className="mt-12 h-6 w-6 animate-spin" />
    </div>
  );
}
```

### Suspense Fallbacks

```tsx
<Suspense
  fallback={<div className="h-48 bg-muted animate-pulse rounded-lg mb-6" />}
>
  <ComponentName />
</Suspense>
```

### Key Points

- Use `LoaderCircle` from lucide-react
- Center with `flex justify-center`
- Add top margin: `mt-12`
- Animate with `animate-spin`
- Use skeleton loaders for inline suspense fallbacks

---

## Complete Example

### Form Component (`new-item-form.tsx`)

```tsx
"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import LocalizedLink from "@/components/localized-link";
import { Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

export default function NewItemForm({ dict, lang }) {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2 sm:flex sm:justify-between sm:gap-4">
          <CardTitle>{dict.form.newItem.title}</CardTitle>
          <LocalizedLink href="/it-inventory">
            <Button variant="outline">
              <Table /> <span>{dict.form.newItem.inventoryTable}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">{/* Form fields */}</CardContent>
          <CardFooter>
            <Button type="submit">{dict.common.save}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
```

### Page Component (`page.tsx`)

```tsx
import { getDictionary } from "../lib/dict";
import NewItemForm from "../components/forms/new-item-form";

export default async function NewItemPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <NewItemForm dict={dict} lang={lang} />;
}
```

### Layout Component (`layout.tsx`)

```tsx
import { getDictionary } from "../lib/dict";
import { Locale } from "@/lib/config/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.form.newItem.title} | ${dict.title}`,
  };
}

export default function NewItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex justify-center">{children}</div>;
}
```

---

## Migration Checklist

When updating existing components to match these standards:

**Main Page:**

- [ ] ✅ NO outer container div, start with `<Card>`
- [ ] ✅ CardHeader has `className='pb-2'`
- [ ] ✅ NO CardContent - everything in CardHeader or directly in Card
- [ ] ✅ Title/button div uses proper flex classes
- [ ] ✅ Summary cards and filters INSIDE CardHeader
- [ ] ✅ Data table OUTSIDE CardHeader

**Data Table:**

- [ ] ✅ Returns fragment `<>...</>` with CardContent and CardFooter
- [ ] ✅ CardContent has `className='space-y-4'`
- [ ] ✅ Bulk actions INSIDE CardContent
- [ ] ✅ Table wrapped in `<div className='rounded-md border'>`
- [ ] ✅ CardFooter has `className='flex justify-between'`
- [ ] ✅ Pagination uses ArrowRight icons only (no text labels)
- [ ] ✅ Previous button rotates arrow: `className='rotate-180 transform'`
- [ ] ✅ NO "Page X of Y" text display
- [ ] ✅ NO "X rows selected" text display

**Forms:**

- [ ] ✅ Back buttons moved INSIDE form CardHeader
- [ ] ✅ `Separator` added after CardHeader in forms
- [ ] ✅ External containers and back buttons removed from page components
- [ ] ✅ Centered wrappers added to layout components

**Other:**

- [ ] ✅ MultiSelect components include `clearLabel` and `selectedLabel`
- [ ] ✅ Table columns handle optional fields gracefully
- [ ] ✅ Loading.tsx created with spinner
- [ ] ✅ generateMetadata functions include all route params
- [ ] ✅ Named layout components (not generic "Layout")

---

## References

This formatting standard is based on the Overtime Orders application structure and ensures visual and functional consistency across all IT Inventory components.

For questions or clarifications, refer to:

- `/app/[lang]/overtime-orders/` for reference implementations
- This document for standard patterns
- Component examples in `/app/[lang]/it-inventory/components/`
