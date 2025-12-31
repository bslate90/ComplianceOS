---
description: Setup Supabase and Vercel connection
---

# Setup Supabase and Vercel

This workflow guides you through connecting your Supabase project to your Vercel project and setting up the local environment.

## 1. Get Supabase Credentials

1.  Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Select your project.
3.  Go to **Project Settings** (gear icon) -> **API**.
4.  Find the **Project URL** and **anon** (public) key.

## 2. Configure Local Environment

1.  Open `.env.local` in your project root.
2.  Add or update the following lines with your credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

3.  (Optional) If you have a USDA API key, add it as well:

```bash
USDA_API_KEY=your_usda_api_key
```

## 3. Configure Vercel Environment Variables

1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Select your project.
3.  Go to **Settings** -> **Environment Variables**.
4.  Add the following variables:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `USDA_API_KEY` (if applicable)

## 4. Run Database Migrations

You need to apply the database schema to your Supabase project.

### Option A: Using Supabase SQL Editor (Easiest)

1.  Go to the **SQL Editor** in your Supabase Dashboard.
2.  Open the `supabase/migrations` folder in your local project.
3.  Copy the content of each `.sql` file and run them in the SQL Editor in the following order:
    *   `001_initial_schema.sql`
    *   `002_supplier_documents.sql`
    *   `003_recipe_audit_log.sql`
    *   `004_compliance_rules.sql`
    *   `005_seed_fda_rules.sql`
    *   `006_add_dual_column_support.sql`
    *   `007_sync_labels_schema.sql`
    *   `008_add_ingredient_columns.sql`
    *   `009_add_racc_to_recipes.sql`

### Option B: Using Supabase CLI

If you have the Supabase CLI installed and linked:

```bash
supabase db push
```

## 5. Seed FDA Compliance Rules

After migrations are run, seed the initial data:

```bash
// turbo
curl -X POST http://localhost:3002/api/admin/seed-fda-rules \
  -H "Content-Type: application/json" \
  -d '{"clear_existing": true}'
```

## 6. Verify Connection

Run the development server and check if you can log in or access the application.

```bash
npm run dev
```
