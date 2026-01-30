## Database

- Dev DB: `next_bruss_dev`

## Server Actions Validation Pattern

All server actions that accept user input MUST validate data server-side using Zod schemas:

1. **Accept `unknown` type** for input data (not the typed interface)
2. **Accept `lang: Locale` parameter** to load localized validation messages
3. **Validate with Zod** before any database operations:

```typescript
import { getDictionary } from '../lib/dict';
import { createSomethingSchema } from '../lib/zod';
import { Locale } from '@/lib/config/i18n';
import * as z from 'zod';

export async function insertSomething(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await auth();
  // ... auth checks ...

  // Server-side validation
  const dict = await getDictionary(lang);
  const schema = createSomethingSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: 'validation', issues: result.error.issues };
  }

  const validatedData = result.data;
  // ... proceed with validatedData ...
}
```

4. **Return structured errors** with `{ error: 'validation', issues: [...] }` for validation failures
5. **Handle in client** by checking for validation errors and displaying appropriate messages:

```typescript
if ('error' in res) {
  if (res.error === 'validation' && res.issues) {
    toast.error(res.issues[0]?.message || dict.errors.contactIT);
  }
  // ... other error handling
}
```