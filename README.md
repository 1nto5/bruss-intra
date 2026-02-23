# Bruss-Intra

Industrial manufacturing management web application built with Next.js 16.

> **Note:** Shop floor applications (DMCheck-2, EOL136153-2, INW-2, Oven) have been moved to the **bruss-floor** project for dedicated production floor operations.

## 📱 Applications

### Management & Analytics

- **Codes Generator** (`/codes-generator`) - Production code and label generation
- **Deviations** (`/deviations`) - Quality deviation tracking and management
- **DMCheck Configs** (`/dmcheck-configs`) - Quality control configuration management per workplace
- **DMCheck Data** (`/dmcheck-data`) - Analytics and reporting for DMCheck operations
- **Employee Management** (`/employee-management`) - Employee record management (Brieselang plant)
- **Failures** (`/failures`) - Failure analysis and tracking
- **Individual Overtime Orders** (`/individual-overtime-orders`) - Individual overtime order management with role-based access
- **Inventory** (`/inventory`) - Inventory operation approvals and management
- **Invoices** (`/invoices`) - Invoice management
- **IT Inventory** (`/it-inventory`) - IT equipment and asset tracking
- **Oven Data** (`/oven-data`) - Oven process data visualization and analysis
- **Overtime Orders** (`/overtime-orders`) - Overtime order management
- **Overtime Submissions** (`/overtime-submissions`) - Employee overtime request submissions
- **Projects** (`/projects`) - Project management and tracking

## 🔗 Related Projects

- **bruss-floor** - Dedicated shop floor applications (DMCheck-2, EOL136153-2, INW-2, Oven)
- **bruss-cron** - Scheduled tasks, monitoring, and automation services

## 🛠️ Tech Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS v4
- MongoDB (primary), PostgreSQL (legacy)
- NextAuth.js with LDAP authentication
- shadcn/ui components
- TanStack Query (caching), React Hook Form + Zod validation
- date-fns for date handling
- Vitest + Testing Library
- Internationalization (Polish, German, English, Tagalog, Ukrainian, Belarusian)

## 🚀 Getting Started

```bash
bun install
bun dev
bun test       # run tests
```

Requires MongoDB, PostgreSQL, and LDAP server configured via environment variables.
