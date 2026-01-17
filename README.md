# Exodis 🏷️

**FDA-compliant Nutrition Facts Label Management System**

Exodis is a comprehensive web application for food manufacturers to create, manage, and validate FDA-compliant Nutrition Facts labels. Built with Next.js 19, Supabase, and modern React practices.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

---

## ✨ Features

### 🧪 Ingredient Management
- **Full CRUD Operations** - Create, read, update, and delete ingredients with complete nutrition data
- **USDA FoodData Central Integration** - Search and import nutrition data from USDA database
- **Automatic Allergen Detection** - FDA Big 9 allergen detection from USDA data
- **Ingredient Declaration** - Custom label-ready names for ingredients (e.g., "ENRICHED WHEAT FLOUR")
- **User Codes** - Custom internal codes for ingredient organization
- **TraceGains Integration** - Link ingredients to TraceGains items for specification management

### 📋 Recipe & Formula Management
- **Recipe Builder** - Combine ingredients with precise amounts
- **AI Recipe Suggester** - Get ingredient suggestions with USDA nutrition matches
- **Automatic Nutrition Calculation** - Per-serving and per-recipe calculations
- **RACC Category Support** - FDA Reference Amounts Customarily Consumed
- **Formula Percentages** - Calculate and display formula percentages
- **Allergen Aggregation** - Automatic allergen summary from all recipe ingredients

### 🏷️ Nutrition Facts Labels
- **FDA 2020 Format Compliance** - Standard vertical, tabular, and linear formats
- **Simplified Format Support** - Automatic "Not a significant source of..." statements
- **Multiple Size Options** - Large, medium, and small label sizes
- **Dual Column Display** - "As Packaged" and "As Prepared" columns
- **Real-time Compliance Validation** - 31+ FDA compliance rules checked
- **PDF Export** - Download production-ready label PDFs
- **Interactive Editor** - Resize labels with FDA font size warnings

### 📊 Compliance & Validation
- **FDA 21 CFR 101.9 Rules** - Complete regulatory compliance checking
- **Serving Size Validation** - RACC-based serving size recommendations
- **Font Size Enforcement** - Minimum readable font size warnings
- **Package Surface Area Checks** - Format recommendations by package size
- **Real-time Validation Reports** - Pass/fail status with detailed messages

### 🏢 Supplier Management
- **Supplier Directory** - Manage supplier contacts and information
- **Document Tracking** - COAs, specifications, certifications with expiration alerts
- **Document OCR** - Extract data from uploaded PDFs and images
- **Version History** - Track document updates over time

### 🔗 Integrations
- **TraceGains** - Connect to TraceGains for ingredient and specification sync
- **USDA FoodData Central** - Nutrition data lookup and import
- **Plex ERP** (Webhook support) - Item and recipe synchronization
- **PDF Generation** - Export labels for printing

### 👥 Organization & Team
- **Multi-user Support** - Admin, member, and viewer roles
- **Permission Controls** - Granular access to features
- **Audit Logging** - Track all changes with timestamps
- **Branding** - Custom logo and colors
- **Notification Preferences** - Email alerts for compliance issues

### 🎨 Modern UI/UX
- **Dark/Light Mode** - System-aware theme switching
- **Responsive Design** - Works on desktop and mobile
- **Glassmorphism Effects** - Modern visual design
- **Real-time Updates** - Instant feedback on changes

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** or **pnpm**
- **Supabase** account (free tier works)
- **Google AI API Key** (for AI features, optional)
- **USDA API Key** (for USDA integration)

### 1. Clone the Repository

```bash
git clone https://github.com/bslate90/Exodis.git
cd Exodis
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# USDA FoodData Central API (Required for USDA features)
USDA_API_KEY=your_usda_api_key

# Google AI / Gemini (Optional - for AI features)
GOOGLE_AI_API_KEY=your_google_ai_key

# TraceGains Encryption (Optional - for TraceGains integration)
TRACEGAINS_ENCRYPTION_KEY=your_random_32_char_string
```

#### Getting API Keys:

| Service | How to Get |
|---------|-----------|
| **Supabase** | Create project at [supabase.com](https://supabase.com) → Settings → API |
| **USDA API** | Register at [fdc.nal.usda.gov](https://fdc.nal.usda.gov/api-key-signup.html) |
| **Google AI** | Get key from [Google AI Studio](https://aistudio.google.com/app/apikey) |

### 4. Set Up Database

Apply all migrations to your Supabase database:

```bash
# Using Supabase CLI
npx supabase db push

# Or apply manually in Supabase SQL Editor (in order):
# 001_initial_schema.sql
# 002_supplier_documents.sql
# ...through...
# 013_tracegains_integration.sql
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) to view the application.

---

## 📁 Project Structure

```
Exodis/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Authentication pages (login, register)
│   │   ├── (dashboard)/        # Protected app pages
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── ingredients/    # Ingredient management
│   │   │   ├── recipes/        # Recipe management
│   │   │   ├── labels/         # Label generation
│   │   │   ├── suppliers/      # Supplier management
│   │   │   ├── organization/   # Organization settings
│   │   │   └── compliance/     # Compliance dashboard
│   │   ├── api/                # API routes
│   │   │   ├── ingredients/    # Ingredient CRUD
│   │   │   ├── recipes/        # Recipe CRUD
│   │   │   ├── labels/         # Label generation & export
│   │   │   ├── usda/           # USDA API proxy
│   │   │   ├── ai/             # AI features
│   │   │   ├── integrations/   # TraceGains, Plex integrations
│   │   │   └── organization/   # Org settings, members, audit
│   │   └── globals.css         # Global styles & theme variables
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── ingredients/        # Ingredient-specific components
│   │   ├── recipes/            # Recipe components
│   │   ├── labels/             # Label preview & editor
│   │   ├── integrations/       # TraceGains settings
│   │   └── ...                 # Other feature components
│   └── lib/                    # Utilities & services
│       ├── supabase/           # Supabase client setup
│       ├── nutrition/          # Nutrition calculations & rounding
│       ├── compliance/         # FDA validation rules
│       ├── usda/               # USDA API & allergen detection
│       ├── integrations/       # TraceGains client
│       ├── racc/               # RACC data & validation
│       └── constants/          # Static data (allergens, etc.)
├── supabase/
│   └── migrations/             # Database migrations (001-013)
├── public/                     # Static assets
└── .env.local                  # Environment variables (create this)
```

---

## 🗄️ Database Schema

Key tables in the database:

| Table | Description |
|-------|-------------|
| `organizations` | Company/org accounts |
| `profiles` | User profiles with roles |
| `ingredients` | Ingredient master data with nutrition |
| `recipes` | Recipe/formula definitions |
| `recipe_ingredients` | Junction table for recipe composition |
| `labels` | Generated nutrition labels |
| `suppliers` | Supplier directory |
| `supplier_documents` | Document tracking (COAs, specs) |
| `compliance_rules` | FDA validation rules |
| `organization_settings` | Org-level preferences |
| `audit_log` | Change tracking |
| `tracegains_credentials` | TraceGains connection settings |
| `tracegains_items` | Cached TraceGains items |

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start dev server on port 3002

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type checking
```

---

## 🤝 Contributing

### Setting Up for Development

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Make your changes
5. Run linting: `npm run lint`
6. Run type check: `npx tsc --noEmit`
7. Commit with clear messages: `git commit -m "feat: add new feature"`
8. Push to your fork: `git push origin feature/my-feature`
9. Open a Pull Request

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use theme-aware CSS variables (`text-foreground`, `bg-card`, etc.)
- Add proper types - avoid `any`

---

## 📋 FDA Compliance Rules Implemented

The system validates against 31+ FDA 21 CFR 101.9 rules including:

- ✅ Required nutrients must be present
- ✅ Correct rounding rules for each nutrient
- ✅ Proper serving size declarations
- ✅ Format requirements by package size
- ✅ Minimum font size requirements
- ✅ Dual column requirements
- ✅ Daily value percentage calculations
- ✅ "Less than" declarations for low values
- ✅ Allergen statement requirements

---

## 🔐 Security

- Row Level Security (RLS) on all tables
- Server-side API route authentication
- Encrypted TraceGains credentials
- Role-based access control
- Audit logging for all changes

---

## 📄 License

This is a private repository owned by Brett Slater. All rights reserved.

---

## 🙏 Acknowledgments

- [USDA FoodData Central](https://fdc.nal.usda.gov/) - Nutrition data
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Supabase](https://supabase.com/) - Backend as a Service
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Contact the development team

---

*Built with ❤️ for food manufacturers who take compliance seriously.*
