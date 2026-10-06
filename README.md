# Compliance Violation & Ticket Tracker

A complete, deployable compliance management system built with React, Tailwind CSS, and Supabase.

---

## 📋 COMPLETE SETUP GUIDE

---

### STEP 1: Supabase Online Cloud Setup

#### 1A. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** → Sign in with GitHub
3. Click **"New Project"**
4. Fill in:
   - **Name**: `compliance-tracker`
   - **Database Password**: (save this somewhere safe!)
   - **Region**: Choose closest to you
5. Click **"Create new project"** (takes ~2 minutes)

#### 1B. Run the SQL Script

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. **Copy and paste the ENTIRE SQL script below** into the editor
4. Click **"Run"** (or press Ctrl+Enter)

```sql
-- ============================================================
-- COMPLIANCE TRACKER - COMPLETE DATABASE SETUP
-- ============================================================

-- 1. PROFILES TABLE (extends Supabase auth)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role text not null default 'standard' check (role in ('admin', 'standard')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Users can view all profiles (needed for assignment dropdowns)
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Policy: Service role can insert (for admin user creation)
create policy "Service role can insert profiles"
  on public.profiles for insert
  to service_role
  with check (true);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'standard');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TICKETS TABLE
-- ============================================================
create table public.tickets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  status text not null default 'open' check (status in ('open', 'in_progress', 'overdue', 'closed')),
  due_date date not null,
  assigned_to text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tickets enable row level security;

-- All authenticated users can view tickets
create policy "Tickets viewable by authenticated users"
  on public.tickets for select
  to authenticated
  using (true);

-- Only admins can insert tickets (via service role or direct)
create policy "Tickets insertable by authenticated users"
  on public.tickets for insert
  to authenticated
  with check (true);

-- All authenticated users can update tickets
create policy "Tickets updatable by authenticated users"
  on public.tickets for update
  to authenticated
  using (true);

-- All authenticated users can delete tickets
create policy "Tickets deletable by authenticated users"
  on public.tickets for delete
  to authenticated
  using (true);


-- 3. TICKET NOTES TABLE
-- ============================================================
create table public.ticket_notes (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets on delete cascade not null,
  user_email text not null,
  note_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ticket_notes enable row level security;

create policy "Notes viewable by authenticated users"
  on public.ticket_notes for select
  to authenticated
  using (true);

create policy "Notes insertable by authenticated users"
  on public.ticket_notes for insert
  to authenticated
  with check (true);

create policy "Notes deletable by authenticated users"
  on public.ticket_notes for delete
  to authenticated
  using (true);
```

#### 1C. Create Storage Bucket

1. In Supabase dashboard, click **"Storage"** in the left sidebar
2. Click **"New bucket"**
3. Name it: `attachments`
4. Toggle **"Public bucket"** to **ON**
5. Click **"Create bucket"**
6. Then go to **"Policies"** for the `attachments` bucket
7. Click **"New policy"** → **"For full customization"**
8. Create this policy:

**Policy Name**: `Allow authenticated uploads`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **USING expression**: `true`
- **WITH CHECK expression**: `true`

Also create a SELECT policy:
- **Policy Name**: `Allow public reads`
- **Allowed operation**: `SELECT`
- **Target roles**: `anon`, `authenticated`
- **USING expression**: `true`

#### 1D. Get Your API Keys

1. Click **"Settings"** (gear icon) → **"API"** in the left sidebar
2. Copy these two values:
   - **Project URL** (e.g., `https://abcdefghijk.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

---

### STEP 2: Code Architecture

```
compliance-tracker/
├── index.html              # HTML entry point
├── .env                    # Your Supabase credentials (create this!)
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Main app with routing
│   ├── index.css           # Tailwind CSS imports
│   ├── vite-env.d.ts       # TypeScript declarations
│   ├── lib/
│   │   └── supabase.ts     # Supabase client configuration
│   ├── context/
│   │   └── AuthContext.tsx  # Authentication state management
│   └── components/
│       ├── Login.tsx        # Login screen
│       ├── Layout.tsx       # Sidebar navigation layout
│       ├── Dashboard.tsx    # Main dashboard with metrics & tickets
│       ├── TicketDetails.tsx # Ticket view with notes & uploads
│       └── AdminPanel.tsx   # Admin user management
```

---

### STEP 3: Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key-here
```

---

### STEP 4: Make Yourself Admin

After deploying and logging in for the first time, you need to make your account an admin:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query (replace with your email):

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@company.com';
```

---

### STEP 5: 1-Click Deployment (Vercel)

#### Option A: Deploy on Vercel (Recommended - 3 minutes)

1. Push your code to a **GitHub repository**
2. Go to [https://vercel.com](https://vercel.com) → Sign in with GitHub
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Framework: **Vite** (auto-detected)
6. Under **"Environment Variables"**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
7. Click **"Deploy"**
8. Done! Your app is live at `https://your-project.vercel.app`

#### Option B: Deploy on Netlify (3 minutes)

1. Go to [https://app.netlify.com](https://app.netlify.com) → Sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Under **"Environment variables"**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Click **"Deploy site"**

---

### 🎯 How the App Works

| Feature | Admin | Standard User |
|---------|-------|---------------|
| View all tickets | ✅ | ✅ (only assigned) |
| Create tickets | ✅ | ❌ |
| Edit tickets | ✅ | ❌ |
| Delete tickets | ✅ | ❌ |
| Add notes | ✅ | ✅ |
| Upload files | ✅ | ✅ |
| User Management | ✅ | ❌ |
| Change roles | ✅ | ❌ |

---

### 🔒 Security Notes

- The `anon` key is safe to expose in frontend code (it's designed for this)
- Row Level Security (RLS) policies protect your data
- The `service_role` key should NEVER be exposed in frontend code
- For production, tighten RLS policies to restrict ticket creation to admins only

---

### 💡 Quick Start Checklist

- [ ] Create Supabase project
- [ ] Run the SQL script in SQL Editor
- [ ] Create `attachments` storage bucket (public)
- [ ] Add storage policies for upload & read
- [ ] Copy Project URL and anon key
- [ ] Create `.env` file with your credentials
- [ ] Run `npm install` and `npm run dev` locally to test
- [ ] Make yourself admin via SQL
- [ ] Deploy to Vercel/Netlify with environment variables
