-- =====================================================================
--  SCS Management — Supabase database schema
--  Swarup Construction Solution
-- ---------------------------------------------------------------------
--  Supabase Dashboard > SQL Editor > New query > এই পুরো ফাইল পেস্ট > Run
--  ফাইলটি একাধিকবার Run করলেও সমস্যা নেই (idempotent)।
--
--  কাঠামো:
--   * profiles / app_access / apps  -> অ্যাকাউন্ট, অনুমোদন, কোন অ্যাপে কী রোল
--   * audit_log                      -> সব অ্যাপের লাইফটাইম অ্যাক্টিভিটি লগ
--                                       (ডাটাবেস ট্রিগার লেখে; এডিট কেউ পারে না, ডিলিট শুধু Super Admin)
--   * v2: profile = employee, profile_documents, sys_settings, app_pins,
--         notifications / push_subscriptions, password_reset_codes
--   * chem_*   -> SCS Chemical Order
--   * att_*    -> SCS Employee Attendance
--   * mr_*     -> SCS Monthly Report
--   * শেয়ার্ড ডাটা:
--       chem_orders          -> Chemical Order লেখে, Monthly Report শুধু পড়ে
--       att_monthly_summary  -> Attendance লেখে,     Monthly Report শুধু পড়ে
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
--  1. CORE: apps, profiles, app_access
-- =====================================================================
create table if not exists public.apps (
  key         text primary key,
  name        text not null,
  name_bn     text,
  description text,
  path        text not null,
  icon        text default '📦',
  color       text default '#e91e63',
  sort_order  int  default 0,
  active      boolean not null default true
);

insert into public.apps (key, name, name_bn, description, path, icon, color, sort_order) values
  ('monthly-report', 'SCS Monthly Report',      'এসসিএস মান্থলি রিপোর্ট',   'Monthly sales, store, transport, salary & loan reports', '/apps/monthly-report/', '📊', '#7c3aed', 1),
  ('attendance',     'SCS Employee Attendance', 'এসসিএস এমপ্লয়ি অ্যাটেন্ডেন্স', 'GPS clock-in, leave record & monthly attendance',     '/apps/attendance/',     '🕘', '#e91e63', 2),
  ('chemical-order', 'SCS Chemical Order',      'এসসিএস কেমিক্যাল অর্ডার',  'Orders, bill & challan, SMS, products & sellers',      '/apps/chemical-order/', '🧪', '#db2777', 3)
on conflict (key) do update set
  name = excluded.name, name_bn = excluded.name_bn, description = excluded.description,
  path = excluded.path, icon = excluded.icon, color = excluded.color, sort_order = excluded.sort_order;

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  full_name      text default '',
  phone          text default '',
  status         text not null default 'pending' check (status in ('pending','active','disabled')),
  is_super_admin boolean not null default false,
  approved_by    uuid,
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);

create table if not exists public.app_access (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  app_key    text not null references public.apps(key) on delete cascade on update cascade,
  role       text not null default 'user' check (role in ('user','admin')),
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key (user_id, app_key)
);

-- নতুন সাইন-আপ -> profiles এ 'pending' রো
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- permission helpers ----------
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and is_super_admin and status = 'active');
$$;

-- p_role = 'user' -> user বা admin হলেই চলবে; 'admin' -> শুধু admin
create or replace function public.has_app(p_app text, p_role text default 'user') returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from public.app_access a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid() and p.status = 'active' and a.app_key = p_app
      and (p_role = 'user' or a.role = 'admin'));
$$;

-- সাধারণ ইউজার নিজের status / super-admin ফ্ল্যাগ বদলাতে পারবে না
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then            -- SQL Editor / service role
    new.updated_at := now(); return new;
  end if;
  if not public.is_super_admin() then
    new.status := old.status;
    new.is_super_admin := old.is_super_admin;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.email := old.email;
  elsif new.status = 'active' and old.status <> 'active' then
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.app_access_stamp() returns trigger
language plpgsql as $$
begin
  new.granted_by := coalesce(auth.uid(), new.granted_by);
  new.granted_at := now();
  return new;
end $$;

drop trigger if exists app_access_stamp on public.app_access;
create trigger app_access_stamp before insert or update on public.app_access
  for each row execute function public.app_access_stamp();

-- =====================================================================
--  2. AUDIT LOG (lifetime activity history, ডাটাবেস নিজেই লেখে)
-- =====================================================================
create table if not exists public.audit_log (
  id             bigint generated always as identity primary key,
  at             timestamptz not null default now(),
  app_key        text not null,
  table_name     text not null,
  entity         text,
  record_ref     text,
  action         text not null,           -- Add / Edit / Delete
  old_data       jsonb,
  new_data       jsonb,
  changed_fields text[],
  actor_id       uuid,
  actor_email    text,
  actor_name     text
);
create index if not exists audit_log_app_at on public.audit_log (app_key, at desc);
create index if not exists audit_log_ref    on public.audit_log (app_key, record_ref);
create index if not exists audit_log_actor  on public.audit_log (actor_id, at desc);

-- TG_ARGV[0] = app_key, TG_ARGV[1] = entity label, TG_ARGV[2] = ref column
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_changed text[]; v_ref text;
  v_uid uuid := auth.uid(); v_email text; v_name text;
begin
  -- ব্যাকআপ রিস্টোরের সময় লগ লেখা হয় না (পুরনো লগ ব্যাকআপ থেকেই আসে)
  if current_setting('scs.restoring', true) = '1' then return coalesce(new, old); end if;
  if tg_op in ('UPDATE','DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_new := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_changed from (
      select n.key as k from jsonb_each(v_new) n
       where n.key not in ('updated_at','updated_by') and (v_old -> n.key) is distinct from n.value
      union
      select o.key from jsonb_each(v_old) o where not (v_new ? o.key)
    ) s;
    if v_changed is null then return new; end if;   -- কিছুই বদলায়নি -> লগ নয়
  end if;

  v_ref := coalesce(v_new ->> tg_argv[2], v_old ->> tg_argv[2]);

  if v_uid is not null then
    select email, coalesce(nullif(full_name, ''), email) into v_email, v_name
      from public.profiles where id = v_uid;
  else
    v_name := 'System';
  end if;

  insert into public.audit_log (app_key, table_name, entity, record_ref, action,
                                old_data, new_data, changed_fields, actor_id, actor_email, actor_name)
  values (tg_argv[0], tg_table_name, tg_argv[1], v_ref,
          case tg_op when 'INSERT' then 'Add' when 'UPDATE' then 'Edit' else 'Delete' end,
          v_old, v_new, v_changed, v_uid, v_email, v_name);
  return coalesce(new, old);
end $$;

-- created_by / updated_by / updated_at স্বয়ংক্রিয়
create or replace function public.stamp_row() returns trigger
language plpgsql as $$
begin
  if current_setting('scs.restoring', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

-- helper to attach both triggers
create or replace function public.scs_attach_triggers(p_table text, p_app text, p_entity text, p_ref text, p_stamp boolean default true)
returns void language plpgsql as $$
begin
  execute format('drop trigger if exists zz_audit on public.%I', p_table);
  execute format('create trigger zz_audit after insert or update or delete on public.%I for each row execute function public.audit_trigger(%L, %L, %L)', p_table, p_app, p_entity, p_ref);
  if p_stamp then
    execute format('drop trigger if exists aa_stamp on public.%I', p_table);
    execute format('create trigger aa_stamp before insert or update on public.%I for each row execute function public.stamp_row()', p_table);
  end if;
end $$;

-- কে কাকে কোন অ্যাপের অ্যাক্সেস দিল / অনুমোদন দিল — সেটাও লগে থাকবে
select public.scs_attach_triggers('profiles',   'core', 'User',       'email',   false);
select public.scs_attach_triggers('app_access', 'core', 'App Access', 'user_id', false);

-- =====================================================================
--  3. SCS CHEMICAL ORDER
-- =====================================================================
create table if not exists public.chem_products (
  id           text primary key default substr(md5(gen_random_uuid()::text), 1, 8),
  product_name text not null,
  unit         text not null default '',
  pack_sizes   text[] not null default '{}',
  sort_order   int not null default 0,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
create unique index if not exists chem_products_name_unit on public.chem_products (lower(product_name), lower(unit));

create table if not exists public.chem_sellers (
  id         text primary key default substr(md5(gen_random_uuid()::text), 1, 8),
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
create unique index if not exists chem_sellers_name on public.chem_sellers (lower(name));

-- একটি অর্ডার = একটি রো; প্রোডাক্টগুলো items (jsonb) এ
create table if not exists public.chem_orders (
  order_no               text primary key,
  delivery_at            text not null default '',
  client_name            text not null default '',
  mobile                 text not null default '',
  address                text not null default '',
  transport_fee          numeric not null default 0,
  scs_transport_cost     numeric not null default 0,
  order_by               text not null default '',
  commission_holder_name text not null default '',
  items                  jsonb not null default '[]'::jsonb,
  sms_status             text not null default 'Pending',
  pdf_status             text not null default 'Not Uploaded',
  pdf_path               text,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
create index if not exists chem_orders_created on public.chem_orders (created_at desc);
create index if not exists chem_orders_mobile  on public.chem_orders (mobile);

create table if not exists public.chem_settings (
  key   text primary key,
  value jsonb,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);

-- গোপন তথ্য (SMS API key) — কেউ পড়তে পারে না, শুধু Netlify function (service role)
create table if not exists public.chem_secrets (
  key        text primary key,
  value      text,
  updated_at timestamptz default now(),
  updated_by uuid
);

select public.scs_attach_triggers('chem_products', 'chemical-order', 'Product',  'product_name');
select public.scs_attach_triggers('chem_sellers',  'chemical-order', 'Seller',   'name');
select public.scs_attach_triggers('chem_orders',   'chemical-order', 'Order',    'order_no');
select public.scs_attach_triggers('chem_settings', 'chemical-order', 'Settings', 'key');

create or replace function public.chem_set_secret(p_key text, p_value text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_app('chemical-order', 'admin') then raise exception 'Admin access required'; end if;
  insert into public.chem_secrets (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  insert into public.audit_log (app_key, table_name, entity, record_ref, action, old_data, new_data, changed_fields, actor_id, actor_email, actor_name)
  select 'chemical-order', 'chem_secrets', 'Settings', p_key, 'Edit', null, jsonb_build_object('value','•••• (changed)'), array['value'],
         auth.uid(), p.email, coalesce(nullif(p.full_name,''), p.email) from public.profiles p where p.id = auth.uid();
end $$;

create or replace function public.chem_next_order_no() returns text
language sql stable set search_path = public as $$
  select to_char(now() at time zone 'Asia/Dhaka', 'YYYYMM') || '-' ||
         lpad((coalesce(max(split_part(order_no, '-', 2)::int), 0) + 1)::text, 2, '0')
  from public.chem_orders
  where order_no like to_char(now() at time zone 'Asia/Dhaka', 'YYYYMM') || '-%'
    and split_part(order_no, '-', 2) ~ '^[0-9]+$';
$$;

-- নতুন অর্ডার: অর্ডার নম্বর এখানেই (লক করে) তৈরি হয় — দুজন একসাথে সাবমিট করলেও নম্বর ডুপ্লিকেট হবে না
create or replace function public.chem_create_order(p jsonb) returns text
language plpgsql security invoker set search_path = public as $$
declare v_no text;
begin
  if not public.has_app('chemical-order') then raise exception 'Chemical Order access required'; end if;
  perform pg_advisory_xact_lock(hashtext('scs_chem_order_no'));
  v_no := public.chem_next_order_no();
  insert into public.chem_orders (order_no, delivery_at, client_name, mobile, address, transport_fee,
                                  scs_transport_cost, order_by, commission_holder_name, items, sms_status, pdf_status)
  values (v_no, coalesce(p->>'delivery_at',''), coalesce(p->>'client_name',''), coalesce(p->>'mobile',''),
          coalesce(p->>'address',''), coalesce((p->>'transport_fee')::numeric, 0),
          coalesce((p->>'scs_transport_cost')::numeric, 0), coalesce(p->>'order_by',''),
          coalesce(p->>'commission_holder_name',''), coalesce(p->'items','[]'::jsonb), 'Pending', 'Not Uploaded');
  return v_no;
end $$;

-- লাইভ রিফ্রেশের জন্য হালকা "ভার্সন"
create or replace function public.chem_data_version() returns text
language sql stable set search_path = public as $$
  select coalesce((select max(id) from public.audit_log where app_key = 'chemical-order'), 0)::text || '-' ||
         (select count(*) from public.chem_orders)::text;
$$;

-- =====================================================================
--  4. SCS EMPLOYEE ATTENDANCE
-- =====================================================================
create table if not exists public.att_employees (
  id          text primary key,
  emp_id      text not null,
  name        text not null default '',
  designation text not null default '',
  department  text not null default '',
  mobile      text not null default '',
  photo_url   text not null default '',
  sort_order  int not null default 0,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);

create table if not exists public.att_records (
  id               text primary key,
  emp_id           text not null,
  date             text not null,          -- yyyy-MM-dd
  type             text not null,          -- Clock IN / Clock Out
  time             text not null default '',
  lat              double precision default 0,
  lng              double precision default 0,
  location_text    text default '',
  note             text default '',
  created_by_label text default 'user',
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
create index if not exists att_records_date on public.att_records (date);
create index if not exists att_records_emp  on public.att_records (emp_id, date);

create table if not exists public.att_settings (
  key   text primary key,
  value jsonb,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);

-- শেয়ার্ড টেবিল: Attendance লেখে, Monthly Report পড়ে
create table if not exists public.att_monthly_summary (
  month_key       text not null,           -- yyyy-MM
  emp_id          text not null,
  sl_no           int  not null default 0,
  name            text not null default '',
  designation     text not null default '',
  department      text not null default '',
  photo_url       text not null default '',
  present         int  not null default 0,
  absent          int  not null default 0,
  late_days       int  not null default 0,
  attendance_rate text not null default '0%',
  updated_at      timestamptz default now(),
  updated_by      uuid,
  primary key (month_key, emp_id)
);

select public.scs_attach_triggers('att_employees', 'attendance', 'Employee',   'emp_id');
select public.scs_attach_triggers('att_records',   'attendance', 'Attendance', 'emp_id');
select public.scs_attach_triggers('att_settings',  'attendance', 'Settings',   'key');

-- =====================================================================
--  5. SCS MONTHLY REPORT
-- =====================================================================
create table if not exists public.mr_month_data (
  month_key text primary key check (month_key ~ '^\d{4}-\d{2}$'),
  data      jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);

create table if not exists public.mr_settings (
  key   text primary key,
  value text,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);

select public.scs_attach_triggers('mr_month_data', 'monthly-report', 'Monthly Report', 'month_key');
select public.scs_attach_triggers('mr_settings',   'monthly-report', 'Settings',       'key');

-- =====================================================================
--  6. ROW LEVEL SECURITY
-- =====================================================================
alter table public.apps                enable row level security;
alter table public.profiles            enable row level security;
alter table public.app_access          enable row level security;
alter table public.audit_log           enable row level security;
alter table public.chem_products       enable row level security;
alter table public.chem_sellers        enable row level security;
alter table public.chem_orders         enable row level security;
alter table public.chem_settings       enable row level security;
alter table public.chem_secrets        enable row level security;
alter table public.att_employees       enable row level security;
alter table public.att_records         enable row level security;
alter table public.att_settings        enable row level security;
alter table public.att_monthly_summary enable row level security;
alter table public.mr_month_data       enable row level security;
alter table public.mr_settings         enable row level security;

do $$
declare r record;
begin
  -- পুরনো পলিসি মুছে নতুন করে বানানো (বারবার Run করা যায়)
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and policyname like 'scs_%' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- core
create policy scs_apps_read   on public.apps for select to authenticated using (true);
create policy scs_apps_write  on public.apps for all    to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy scs_prof_read   on public.profiles for select to authenticated using (id = auth.uid() or public.is_super_admin());
create policy scs_prof_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_super_admin()) with check (id = auth.uid() or public.is_super_admin());
create policy scs_prof_delete on public.profiles for delete to authenticated using (public.is_super_admin() and id <> auth.uid());

create policy scs_acc_read    on public.app_access for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy scs_acc_write   on public.app_access for all    to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- audit log: শুধু পড়া যায় (যে অ্যাপে অ্যাক্সেস আছে); 'core' লগ শুধু সুপার অ্যাডমিন
create policy scs_audit_read  on public.audit_log for select to authenticated
  using (case when app_key = 'core' then public.is_super_admin() else public.has_app(app_key) end);

-- chemical order
create policy scs_cp_read   on public.chem_products for select to authenticated using (public.has_app('chemical-order'));
create policy scs_cp_write  on public.chem_products for all    to authenticated using (public.has_app('chemical-order','admin')) with check (public.has_app('chemical-order','admin'));
create policy scs_cs_read   on public.chem_sellers  for select to authenticated using (public.has_app('chemical-order'));
create policy scs_cs_write  on public.chem_sellers  for all    to authenticated using (public.has_app('chemical-order','admin')) with check (public.has_app('chemical-order','admin'));

create policy scs_co_read   on public.chem_orders for select to authenticated using (public.has_app('chemical-order') or public.has_app('monthly-report'));
create policy scs_co_insert on public.chem_orders for insert to authenticated with check (public.has_app('chemical-order'));
create policy scs_co_update on public.chem_orders for update to authenticated using (public.has_app('chemical-order')) with check (public.has_app('chemical-order'));
create policy scs_co_delete on public.chem_orders for delete to authenticated using (public.has_app('chemical-order','admin'));

create policy scs_cset_read  on public.chem_settings for select to authenticated using (public.has_app('chemical-order'));
create policy scs_cset_write on public.chem_settings for all    to authenticated using (public.has_app('chemical-order','admin')) with check (public.has_app('chemical-order','admin'));
-- chem_secrets: কোনো পলিসি নেই = কেউ পড়তে/লিখতে পারে না (শুধু chem_set_secret ফাংশন ও service role)

-- attendance
create policy scs_ae_read   on public.att_employees for select to authenticated using (public.has_app('attendance') or public.has_app('monthly-report'));
create policy scs_ae_write  on public.att_employees for all    to authenticated using (public.has_app('attendance','admin')) with check (public.has_app('attendance','admin'));

create policy scs_ar_read   on public.att_records for select to authenticated using (public.has_app('attendance'));
create policy scs_ar_insert on public.att_records for insert to authenticated with check (public.has_app('attendance'));
create policy scs_ar_update on public.att_records for update to authenticated using (public.has_app('attendance','admin')) with check (public.has_app('attendance','admin'));
create policy scs_ar_delete on public.att_records for delete to authenticated using (public.has_app('attendance','admin'));

create policy scs_aset_read  on public.att_settings for select to authenticated using (public.has_app('attendance'));
create policy scs_aset_write on public.att_settings for all    to authenticated using (public.has_app('attendance','admin')) with check (public.has_app('attendance','admin'));

create policy scs_asum_read  on public.att_monthly_summary for select to authenticated using (public.has_app('attendance') or public.has_app('monthly-report'));
create policy scs_asum_write on public.att_monthly_summary for all    to authenticated using (public.has_app('attendance')) with check (public.has_app('attendance'));

-- monthly report
create policy scs_mm_read   on public.mr_month_data for select to authenticated using (public.has_app('monthly-report'));
create policy scs_mm_insert on public.mr_month_data for insert to authenticated with check (public.has_app('monthly-report'));
create policy scs_mm_update on public.mr_month_data for update to authenticated using (public.has_app('monthly-report')) with check (public.has_app('monthly-report'));
create policy scs_mm_delete on public.mr_month_data for delete to authenticated using (public.has_app('monthly-report','admin'));

create policy scs_ms_read   on public.mr_settings for select to authenticated using (public.has_app('monthly-report'));
create policy scs_ms_write  on public.mr_settings for all    to authenticated using (public.has_app('monthly-report')) with check (public.has_app('monthly-report'));

-- =====================================================================
--  7. STORAGE (লোগো, লেটারহেড, গান, PDF) — bucket: scs-files (private)
--     পাথের প্রথম ফোল্ডার = app key, যেমন chemical-order/letterhead.png
-- =====================================================================
insert into storage.buckets (id, name, public) values ('scs-files', 'scs-files', false)
on conflict (id) do nothing;

drop policy if exists scs_files_read   on storage.objects;
drop policy if exists scs_files_insert on storage.objects;
drop policy if exists scs_files_update on storage.objects;
drop policy if exists scs_files_delete on storage.objects;
create policy scs_files_read   on storage.objects for select to authenticated
  using (bucket_id = 'scs-files' and public.has_app((storage.foldername(name))[1]));
create policy scs_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'scs-files' and public.has_app((storage.foldername(name))[1]));
create policy scs_files_update on storage.objects for update to authenticated
  using (bucket_id = 'scs-files' and public.has_app((storage.foldername(name))[1]));
create policy scs_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'scs-files' and public.has_app((storage.foldername(name))[1]));

-- =====================================================================
--  8. v2: প্রোফাইল = এমপ্লয়ি, ডকুমেন্ট, সিস্টেম সেটিংস, অ্যাডমিন পিন,
--     নোটিফিকেশন / পুশ, পাসওয়ার্ড রিসেট কোড
-- =====================================================================

-- ---------- profiles: এমপ্লয়ি তথ্য ----------
alter table public.profiles add column if not exists employee_id text;
alter table public.profiles add column if not exists photo_url   text not null default '';
alter table public.profiles add column if not exists designation text not null default '';
alter table public.profiles add column if not exists department  text not null default '';
alter table public.profiles add column if not exists is_employee boolean not null default true;
create unique index if not exists profiles_employee_id on public.profiles (employee_id) where employee_id is not null;

alter table public.att_employees add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.att_employees add column if not exists active  boolean not null default true;
create unique index if not exists att_employees_user on public.att_employees (user_id) where user_id is not null;

-- পরের Employee ID (SCS-101, SCS-102 ...)
create or replace function public.scs_next_emp_id() returns text
language sql stable security definer set search_path = public as $$
  select 'SCS-' || (greatest(
    100,
    coalesce((select max(substring(emp_id from '^SCS-(\d+)$')::int) from public.att_employees where emp_id ~ '^SCS-\d+$'), 100),
    coalesce((select max(substring(employee_id from '^SCS-(\d+)$')::int) from public.profiles where employee_id ~ '^SCS-\d+$'), 100)
  ) + 1)::text;
$$;

-- সাধারণ ইউজার নিজের status / super-admin / Employee ID / পদবি বদলাতে পারবে না
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not public.is_super_admin() then
      new.status := old.status;
      new.is_super_admin := old.is_super_admin;
      new.approved_by := old.approved_by;
      new.approved_at := old.approved_at;
      new.email := old.email;
      -- Employee ID নিজে বদলাতে পারে (ইউনিক হতে হবে); অ্যাডমিনও যে কারোটা বদলাতে পারেন
      new.designation := old.designation;
      new.department := old.department;
      new.is_employee := old.is_employee;
    elsif new.status = 'active' and old.status <> 'active' then
      new.approved_by := auth.uid(); new.approved_at := now();
    end if;
    new.updated_by := auth.uid();
  end if;
  new.employee_id := nullif(trim(coalesce(new.employee_id, '')), '');
  if new.status = 'active' and new.is_employee and new.employee_id is null then
    new.employee_id := public.scs_next_emp_id();
  end if;
  new.updated_at := now();
  return new;
end $$;

-- অনুমোদিত অ্যাকাউন্ট -> Attendance-এর এমপ্লয়ি (নাম, মোবাইল, ছবি, ID সবসময় প্রোফাইল থেকে)
create or replace function public.sync_employee_from_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; v_name text;
begin
  if current_setting('scs.restoring', true) = '1' then return null; end if;
  v_name := coalesce(nullif(trim(new.full_name), ''), new.email);
  select * into e from public.att_employees where user_id = new.id;
  if not (new.status = 'active' and new.is_employee) then
    if found and e.active then update public.att_employees set active = false where id = e.id; end if;
    return null;
  end if;
  if not found then
    -- পুরনো শিট থেকে আনা একই Employee ID থাকলে সেটার সাথেই জুড়ে দেওয়া (হাজিরার ইতিহাস ঠিক থাকে)
    select * into e from public.att_employees where emp_id = new.employee_id and user_id is null limit 1;
    if found then
      update public.att_employees set user_id = new.id where id = e.id;
    else
      insert into public.att_employees (id, emp_id, name, designation, department, mobile, photo_url, sort_order, user_id, active)
      values ('u-' || replace(new.id::text, '-', ''), new.employee_id, v_name, new.designation, new.department,
              new.phone, new.photo_url, coalesce((select max(sort_order) from public.att_employees), 0) + 1, new.id, true);
      return null;
    end if;
  end if;
  if e.emp_id is distinct from new.employee_id then
    update public.att_records set emp_id = new.employee_id where emp_id = e.emp_id;
    delete from public.att_monthly_summary where emp_id = new.employee_id;
    update public.att_monthly_summary set emp_id = new.employee_id where emp_id = e.emp_id;
  end if;
  update public.att_employees set
    emp_id = new.employee_id, name = v_name, mobile = new.phone,
    photo_url   = case when new.photo_url   <> '' then new.photo_url   else photo_url   end,
    designation = case when new.designation <> '' then new.designation else designation end,
    department  = case when new.department  <> '' then new.department  else department  end,
    active = true, user_id = new.id
  where id = e.id;
  return null;
exception when others then
  -- এমপ্লয়ি সিঙ্কে সমস্যা হলেও অ্যাকাউন্ট অনুমোদন/সেভ আটকাবে না
  raise warning 'SCS employee sync skipped for %: %', new.email, sqlerrm;
  return null;
end $$;

drop trigger if exists zz_sync_employee on public.profiles;
create trigger zz_sync_employee after insert or update on public.profiles
  for each row execute function public.sync_employee_from_profile();

-- ---------- প্রোফাইল ডকুমেন্ট (NID, সার্টিফিকেট) ----------
create table if not exists public.profile_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('nid_front','nid_back','certificate','other')),
  title      text not null default '',
  path       text not null,
  mime       text not null default '',
  size       int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists profile_documents_user on public.profile_documents (user_id);
select public.scs_attach_triggers('profile_documents', 'core', 'Document', 'title', false);

-- ---------- সিস্টেম সেটিংস (লোগো, SMS গেটওয়ে) ও গোপন তথ্য ----------
create table if not exists public.sys_settings (
  key   text primary key,
  value jsonb,
  updated_at timestamptz default now(),
  updated_by uuid
);
create table if not exists public.sys_secrets (      -- কোনো পলিসি নেই: শুধু Netlify function (service role)
  key        text primary key,
  value      text,
  updated_at timestamptz default now(),
  updated_by uuid
);
select public.scs_attach_triggers('sys_settings', 'core', 'System Settings', 'key', false);

create or replace function public.sys_set_secret(p_key text, p_value text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  insert into public.sys_secrets (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  insert into public.audit_log (app_key, table_name, entity, record_ref, action, new_data, changed_fields, actor_id, actor_email, actor_name)
  select 'core', 'sys_secrets', 'System Settings', p_key, 'Edit', jsonb_build_object('value', '•••• (changed)'), array['value'],
         auth.uid(), p.email, coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = auth.uid();
end $$;

-- কোন গোপন তথ্য সেট করা আছে (মান নয়, শুধু হ্যাঁ/না)
create or replace function public.sys_secret_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_super_admin()
    then coalesce((select jsonb_object_agg(key, (coalesce(value, '') <> '')) from public.sys_secrets where key not like 'vapid%'), '{}'::jsonb)
    else '{}'::jsonb end;
$$;

-- ---------- প্রতিটি অ্যাপের অ্যাডমিন পিন ----------
create table if not exists public.app_pins (
  app_key    text primary key references public.apps(key) on delete cascade on update cascade,
  pin        text not null default '2026' check (pin ~ '^\d{4}$'),
  updated_at timestamptz default now(),
  updated_by uuid
);
insert into public.app_pins (app_key) select key from public.apps on conflict (app_key) do nothing;

create or replace function public.app_pins_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now(); new.updated_by := auth.uid();
  if tg_op = 'UPDATE' and new.pin is distinct from old.pin then
    insert into public.audit_log (app_key, table_name, entity, record_ref, action, new_data, changed_fields, actor_id, actor_email, actor_name)
    select 'core', 'app_pins', 'Admin PIN', new.app_key, 'Edit', jsonb_build_object('pin', '•••• (changed)'), array['pin'],
           auth.uid(), p.email, coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists app_pins_log on public.app_pins;
create trigger app_pins_log before insert or update on public.app_pins
  for each row execute function public.app_pins_log();

-- নতুন অ্যাপ যোগ হলে তার পিনও তৈরি
create or replace function public.apps_add_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_pins (app_key) values (new.key) on conflict (app_key) do nothing;
  return null;
end $$;
drop trigger if exists apps_add_pin on public.apps;
create trigger apps_add_pin after insert on public.apps
  for each row execute function public.apps_add_pin();
select public.scs_attach_triggers('apps', 'core', 'App', 'key', false);

-- ---------- নোটিফিকেশন ও পুশ ----------
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  app_key    text not null default 'core',
  title      text not null,
  body       text not null default '',
  url        text not null default '/',
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  pushed_at  timestamptz
);
create index if not exists notifications_user on public.notifications (user_id, id desc);
create index if not exists notifications_push on public.notifications (pushed_at) where pushed_at is null;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

-- একটি অ্যাপের সব ইউজার (+ Super Admin) কে নোটিফিকেশন; p_app = 'core' হলে শুধু Super Admin
create or replace function public.scs_notify(p_app text, p_title text, p_body text, p_url text, p_exclude uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.notifications (user_id, app_key, title, body, url)
  select p.id, p_app, p_title, coalesce(p_body, ''), coalesce(p_url, '/')
  from public.profiles p
  where p.status = 'active' and p.id is distinct from p_exclude
    and (p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = p_app));
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.scs_notify(text, text, text, text, uuid) from public, anon, authenticated;

-- নতুন অ্যাকাউন্ট -> Super Admin দের নোটিফিকেশন
create or replace function public.notify_new_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('scs.restoring', true) = '1' then return null; end if;
  perform public.scs_notify('core', 'New account waiting for approval',
    coalesce(nullif(new.full_name, ''), new.email) || ' · ' || coalesce(nullif(new.phone, ''), new.email), '/admin.html', new.id);
  return null;
exception when others then
  return null;
end $$;
drop trigger if exists zz_notify_new_account on public.profiles;
create trigger zz_notify_new_account after insert on public.profiles
  for each row execute function public.notify_new_account();

-- নতুন অর্ডার: নম্বর তৈরি + সবাইকে নোটিফিকেশন (রিস্টোর করা পুরনো অর্ডারে নোটিফিকেশন যায় না)
drop function if exists public.chem_notify_order(text, text, numeric, text);
create or replace function public.chem_create_order(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_no text; v_total numeric; v_by text;
begin
  if not public.has_app('chemical-order') then raise exception 'Chemical Order access required'; end if;
  perform pg_advisory_xact_lock(hashtext('scs_chem_order_no'));
  v_no := public.chem_next_order_no();
  insert into public.chem_orders (order_no, delivery_at, client_name, mobile, address, transport_fee,
                                  scs_transport_cost, order_by, commission_holder_name, items, sms_status, pdf_status)
  values (v_no, coalesce(p->>'delivery_at',''), coalesce(p->>'client_name',''), coalesce(p->>'mobile',''),
          coalesce(p->>'address',''), coalesce((p->>'transport_fee')::numeric, 0),
          coalesce((p->>'scs_transport_cost')::numeric, 0), coalesce(p->>'order_by',''),
          coalesce(p->>'commission_holder_name',''), coalesce(p->'items','[]'::jsonb), 'Pending', 'Not Uploaded');
  select coalesce(sum(coalesce(nullif(i->>'quantity','')::numeric, 0) * coalesce(nullif(i->>'discountUnitPrice','')::numeric, 0)), 0)
    into v_total from jsonb_array_elements(coalesce(p->'items','[]'::jsonb)) i;
  v_total := v_total + coalesce((p->>'transport_fee')::numeric, 0);
  v_by := coalesce(p->>'order_by', '');
  perform public.scs_notify('chemical-order', 'New order ' || v_no,
    coalesce(nullif(p->>'client_name', ''), 'Customer') || ' · Tk ' || to_char(v_total, 'FM999,999,999,990') ||
    case when v_by <> '' then ' · by ' || v_by else '' end,
    '/apps/chemical-order/', auth.uid());
  return v_no;
end $$;

-- নোটিফিকেশন লাইভ (Realtime)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------- মোবাইলে পাসওয়ার্ড রিসেট কোড (শুধু Netlify function ব্যবহার করে) ----------
create table if not exists public.password_reset_codes (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   int not null default 0,
  sent_count int not null default 1,
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- v2 RLS ----------
alter table public.profile_documents    enable row level security;
alter table public.sys_settings         enable row level security;
alter table public.sys_secrets          enable row level security;
alter table public.app_pins             enable row level security;
alter table public.notifications        enable row level security;
alter table public.push_subscriptions   enable row level security;
alter table public.password_reset_codes enable row level security;

-- Activity Log শুধু Super Admin মুছতে পারেন
create policy scs_audit_delete on public.audit_log for delete to authenticated using (public.is_super_admin());

create policy scs_doc_read   on public.profile_documents for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy scs_doc_insert on public.profile_documents for insert to authenticated with check (user_id = auth.uid() or public.is_super_admin());
create policy scs_doc_delete on public.profile_documents for delete to authenticated using (user_id = auth.uid() or public.is_super_admin());

-- লোগো (branding) লগইনের আগেও দেখা যায়; SMS সেটিং শুধু Super Admin
create policy scs_sys_read  on public.sys_settings for select to anon, authenticated using (key = 'branding' or public.is_super_admin());
create policy scs_sys_write on public.sys_settings for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- অ্যাডমিন পিন: শুধু সেই অ্যাপের Admin পড়তে পারে, শুধু Super Admin বদলাতে পারে
create policy scs_pin_read  on public.app_pins for select to authenticated using (public.has_app(app_key, 'admin'));
create policy scs_pin_write on public.app_pins for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy scs_ntf_read   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy scs_ntf_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy scs_ntf_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy scs_push_all on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- v2 Storage ----------
-- scs-public (পাবলিক): avatars/<user id>/..., branding/...
insert into storage.buckets (id, name, public) values ('scs-public', 'scs-public', true)
on conflict (id) do update set public = true;

drop policy if exists scs_pub_read   on storage.objects;
drop policy if exists scs_pub_insert on storage.objects;
drop policy if exists scs_pub_update on storage.objects;
drop policy if exists scs_pub_delete on storage.objects;
create policy scs_pub_read on storage.objects for select to authenticated using (bucket_id = 'scs-public');
create policy scs_pub_insert on storage.objects for insert to authenticated with check (bucket_id = 'scs-public' and (
  ((storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text) or public.is_super_admin()));
create policy scs_pub_update on storage.objects for update to authenticated using (bucket_id = 'scs-public' and (
  ((storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text) or public.is_super_admin()));
create policy scs_pub_delete on storage.objects for delete to authenticated using (bucket_id = 'scs-public' and (
  ((storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text) or public.is_super_admin()));

-- scs-files/profiles/<user id>/... : NID ও সার্টিফিকেট (নিজে ও Super Admin)
drop policy if exists scs_prof_files_read   on storage.objects;
drop policy if exists scs_prof_files_insert on storage.objects;
drop policy if exists scs_prof_files_delete on storage.objects;
drop policy if exists scs_prof_files_update on storage.objects;
create policy scs_prof_files_update on storage.objects for update to authenticated using (bucket_id = 'scs-files' and
  (storage.foldername(name))[1] = 'profiles' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_super_admin()));
create policy scs_prof_files_read on storage.objects for select to authenticated using (bucket_id = 'scs-files' and
  (storage.foldername(name))[1] = 'profiles' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_super_admin()));
create policy scs_prof_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'scs-files' and
  (storage.foldername(name))[1] = 'profiles' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_super_admin()));
create policy scs_prof_files_delete on storage.objects for delete to authenticated using (bucket_id = 'scs-files' and
  (storage.foldername(name))[1] = 'profiles' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_super_admin()));

-- আগে থেকে অনুমোদিত অ্যাকাউন্টগুলোকে এমপ্লয়ি তালিকায় আনা (বারবার Run করলেও ক্ষতি নেই)
update public.profiles set is_employee = is_employee where status = 'active';

-- =====================================================================
--  9. v3: SMS কোড টেবিল, Google Drive ব্যাকআপ (pg_cron + pg_net), রিস্টোর, স্কিমা ভার্সন
-- =====================================================================

-- ---------- মোবাইল SMS কোড (অ্যাকাউন্ট খোলা / লগইন / রিসেট) — শুধু Netlify function পড়ে ----------
create table if not exists public.sms_codes (
  phone        text not null,
  purpose      text not null check (purpose in ('signup','login','reset')),
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     int not null default 0,
  sent_count   int not null default 1,
  window_start timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  primary key (phone, purpose)
);
alter table public.sms_codes enable row level security;   -- কোনো পলিসি নেই = ব্রাউজার থেকে কেউ পড়তে পারে না

-- ---------- ব্যাকআপের জন্য extension (Supabase ফ্রি প্ল্যানেও আছে) ----------
do $$
begin
  begin create extension if not exists pg_cron with schema pg_catalog; exception when others then raise notice 'pg_cron: %', sqlerrm; end;
  begin create extension if not exists pg_net with schema extensions; exception when others then raise notice 'pg_net: %', sqlerrm; end;
end $$;

create table if not exists public.sys_backup_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  request_id bigint,
  filename   text,
  manual     boolean not null default false,
  error      text
);
alter table public.sys_backup_log enable row level security;
create policy scs_bkl_read on public.sys_backup_log for select to authenticated using (public.is_super_admin());

-- ব্যাকআপে যেসব টেবিল যায় না (গোপন বা অস্থায়ী)
create or replace function public.scs_backup_excluded() returns text[]
language sql immutable as $$
  select array['sys_secrets','chem_secrets','password_reset_codes','sms_codes','push_subscriptions','notifications','sys_backup_log'];
$$;

-- পুরো ডাটাবেসের লাইফটাইম ব্যাকআপ (JSON) — ভবিষ্যতের নতুন অ্যাপের টেবিলও নিজে থেকে আসে
create or replace function public.scs_backup_snapshot() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v jsonb; tbls jsonb := '{}'::jsonb; cnt jsonb := '{}'::jsonb;
begin
  if auth.uid() is not null and not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  for r in select tablename from pg_tables where schemaname = 'public' and tablename <> all (public.scs_backup_excluded()) order by tablename loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t', r.tablename) into v;
    tbls := tbls || jsonb_build_object(r.tablename, v);
    cnt := cnt || jsonb_build_object(r.tablename, jsonb_array_length(v));
  end loop;
  return jsonb_build_object('format', 'scs-management-backup', 'version', 1, 'created_at', now(),
    'note', 'Restore: SCS Management > Admin Console > Backup > Restore from file. Storage files (photos, PDFs) are not inside this file.',
    'counts', cnt, 'tables', tbls);
end $$;
revoke execute on function public.scs_backup_snapshot() from public, anon;

-- Google Drive (Apps Script Web App) এ ব্যাকআপ পাঠানো
create or replace function public.scs_backup_run(p_manual boolean default false) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare cfg jsonb; url text; fname text; rid bigint;
begin
  if auth.uid() is not null and not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  select value into cfg from public.sys_settings where key = 'backup';
  url := coalesce(cfg ->> 'scriptUrl', '');
  if url = '' then raise exception 'Google Drive backup is not set up (Admin Console > Backup)'; end if;
  fname := 'SCS-backup-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY-MM-DD_HH24-MI-SS') || '.json';
  begin
    select net.http_post(
      url := url,
      body := jsonb_build_object('token', coalesce(cfg ->> 'token', ''), 'folderId', coalesce(cfg ->> 'folderId', ''),
                                 'filename', fname, 'keep', coalesce(nullif(cfg ->> 'keep', '')::int, 0),
                                 'data', public.scs_backup_snapshot()),
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 120000) into rid;
  exception when others then
    insert into public.sys_backup_log (filename, manual, error) values (fname, p_manual, sqlerrm);
    raise exception 'Backup could not be sent: % (is the pg_net extension enabled? Supabase > Database > Extensions)', sqlerrm;
  end;
  insert into public.sys_backup_log (request_id, filename, manual) values (rid, fname, p_manual);
  delete from public.sys_backup_log where id < (select max(id) - 300 from public.sys_backup_log);
  return jsonb_build_object('request_id', rid, 'filename', fname);
end $$;
revoke execute on function public.scs_backup_run(boolean) from public, anon;

-- কতক্ষণ পরপর অটো ব্যাকআপ: off | 1m | 5m | 15m | 30m | 1h | 6h | 12h | 1d | 1w
create or replace function public.scs_backup_schedule(p_interval text) returns text
language plpgsql security definer set search_path = public as $$
declare expr text;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  expr := case p_interval
    when '1m' then '* * * * *'      when '5m' then '*/5 * * * *'   when '15m' then '*/15 * * * *'
    when '30m' then '*/30 * * * *'  when '1h' then '0 * * * *'     when '6h' then '0 */6 * * *'
    when '12h' then '0 */12 * * *'  when '1d' then '0 21 * * *'    -- প্রতিদিন রাত ৩টা (ঢাকা)
    when '1w' then '0 21 * * 4'     -- প্রতি শুক্রবার রাত ৩টা (ঢাকা)
    else null end;
  begin perform cron.unschedule('scs-backup'); exception when others then null; end;
  if expr is not null then
    begin
      perform cron.schedule('scs-backup', expr, 'select public.scs_backup_run(false)');
    exception when others then
      raise exception 'Auto backup could not be scheduled: % (enable pg_cron: Supabase > Database > Extensions)', sqlerrm;
    end;
  end if;
  return coalesce(expr, 'off');
end $$;

-- শেষ কয়েকটা ব্যাকআপের অবস্থা (Google Drive কী উত্তর দিল)
create or replace function public.scs_backup_status() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare res jsonb; job jsonb := null;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  begin
    select jsonb_build_object('schedule', schedule, 'active', active) into job from cron.job where jobname = 'scs-backup';
  exception when others then job := jsonb_build_object('error', sqlerrm); end;
  begin
    select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into res from (
      select l.id, l.at, l.filename, l.manual, l.error, r.status_code, left(r.content, 300) as response, r.error_msg, r.timed_out
      from public.sys_backup_log l left join net._http_response r on r.id = l.request_id
      order by l.id desc limit 15) x;
  exception when others then
    select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into res from (
      select id, at, filename, manual, error from public.sys_backup_log order by id desc limit 15) x;
  end;
  return jsonb_build_object('job', job, 'runs', res);
end $$;

-- ব্যাকআপ ফাইল থেকে রিস্টোর: যা নেই শুধু সেগুলো যোগ হয় (আগের ডাটা মুছে না)
create or replace function public.scs_backup_restore(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t text; rws jsonb; n int; res jsonb := '{}'::jsonb;
  first_tables text[] := array['audit_log','apps','profiles','app_access','app_pins'];
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if coalesce(p ->> 'format', '') <> 'scs-management-backup' then raise exception 'This is not an SCS Management backup file'; end if;
  perform set_config('scs.restoring', '1', true);
  for t in
    select x from (
      select u.x, u.o from unnest(first_tables) with ordinality as u(x, o)
      union all
      select k, 100 from jsonb_object_keys(p -> 'tables') k where k <> all (first_tables)
    ) s order by s.o, s.x
  loop
    rws := p -> 'tables' -> t;
    continue when rws is null or jsonb_typeof(rws) <> 'array' or jsonb_array_length(rws) = 0;
    if t = any (public.scs_backup_excluded()) then continue; end if;
    if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      res := res || jsonb_build_object(t, 'skipped: table not in this database'); continue;
    end if;
    begin
      if t = 'profiles' then   -- লগইন অ্যাকাউন্ট (auth.users) না থাকলে প্রোফাইল আনা যায় না
        select coalesce(jsonb_agg(r), '[]'::jsonb) into rws from jsonb_array_elements(rws) r
         where exists (select 1 from auth.users u where u.id = (r ->> 'id')::uuid);
      elsif t in ('app_access', 'profile_documents') then
        select coalesce(jsonb_agg(r), '[]'::jsonb) into rws from jsonb_array_elements(rws) r
         where exists (select 1 from public.profiles pr where pr.id = (r ->> 'user_id')::uuid);
      end if;
      execute format('insert into public.%I overriding system value select * from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing', t, t) using rws;
      get diagnostics n = row_count;
      res := res || jsonb_build_object(t, n);
      if t = 'audit_log' then
        perform setval(pg_get_serial_sequence('public.audit_log', 'id'), greatest((select max(id) from public.audit_log), 1));
      end if;
    exception when others then
      res := res || jsonb_build_object(t, 'error: ' || sqlerrm);
    end;
  end loop;
  perform set_config('scs.restoring', '0', true);
  return res;
end $$;

-- ডাটাবেস কোন ভার্সনে আছে (Admin Console মিলিয়ে দেখে)
create or replace function public.scs_schema_version() returns int
language sql immutable as $$ select 14; $$;

-- =====================================================================
--  11. v4: SCS Leave Application, নোটিফিকেশন নিয়ম (কাস্টমাইজ করা যায়),
--      হাজিরার রিমাইন্ডার, Activity Log-এ পিন/পাসওয়ার্ড লুকানো ও কে কী দেখবে
-- =====================================================================

-- ---------- অ্যাপ তালিকায় Leave Application ----------
insert into public.apps (key, name, name_bn, description, path, icon, color, sort_order) values
  ('leave', 'SCS Leave Application', 'এসসিএস লিভ অ্যাপ্লিকেশন', 'Leave applications, approvals, leave record & balance', '/apps/leave/', '🌴', '#0891b2', 4)
on conflict (key) do nothing;
insert into public.app_pins (app_key) select key from public.apps on conflict (app_key) do nothing;

-- ---------- Activity Log: গোপন তথ্য (পিন, পাসওয়ার্ড, টোকেন, API key) কখনো লগে দেখাবে না ----------
create or replace function public.scs_secret_key(k text) returns boolean
language sql immutable as $$
  select k ~ '(^|_)(pin|pins|password|passwd|secret|token|api_?key|apikey|pin_hash|pin_len)(_|$)'
      or k ~ '[a-z](Pin|PIN|Password|Secret|Token|ApiKey|Apikey|PinHash|PinLen)([A-Z_]|$)'
      or k ~ '^(pin|password|secret|token|apiKey|adminPin|editPin|loginPin)$';
$$;

create or replace function public.scs_mask_secrets(j jsonb) returns jsonb
language plpgsql immutable as $$
declare k text; v jsonb; o jsonb;
begin
  if j is null then return null; end if;
  if jsonb_typeof(j) = 'object' then
    o := '{}'::jsonb;
    for k, v in select * from jsonb_each(j) loop
      if public.scs_secret_key(k) and v is not null and v <> 'null'::jsonb and v <> '""'::jsonb then
        o := o || jsonb_build_object(k, '•••• (hidden)');
      else
        o := o || jsonb_build_object(k, public.scs_mask_secrets(v));
      end if;
    end loop;
    return o;
  elsif jsonb_typeof(j) = 'array' then
    return coalesce((select jsonb_agg(public.scs_mask_secrets(x)) from jsonb_array_elements(j) x), '[]'::jsonb);
  elsif jsonb_typeof(j) = 'string' and left(j #>> '{}', 5) = 'data:' then
    return to_jsonb('[image]'::text);          -- ছবি/সিগনেচারের বড় ডাটা লগে রাখা হয় না
  end if;
  return j;
end $$;

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_changed text[]; v_ref text;
  v_uid uuid := auth.uid(); v_email text; v_name text;
begin
  if current_setting('scs.restoring', true) = '1' then return coalesce(new, old); end if;
  if tg_op in ('UPDATE','DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_new := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_changed from (
      select n.key as k from jsonb_each(v_new) n
       where n.key not in ('updated_at','updated_by') and (v_old -> n.key) is distinct from n.value
      union
      select o.key from jsonb_each(v_old) o where not (v_new ? o.key)
    ) s;
    if v_changed is null then return new; end if;
  end if;
  v_ref := coalesce(v_new ->> tg_argv[2], v_old ->> tg_argv[2]);
  -- আগে-পরে দুই জায়গাতেই পিন/পাসওয়ার্ড/টোকেন লুকানো (কী বদলেছে সেটা শুধু নামে দেখাবে)
  v_old := public.scs_mask_secrets(v_old);
  v_new := public.scs_mask_secrets(v_new);
  if v_uid is not null then
    select email, coalesce(nullif(full_name, ''), email) into v_email, v_name from public.profiles where id = v_uid;
  else
    v_name := 'System';
  end if;
  insert into public.audit_log (app_key, table_name, entity, record_ref, action,
                                old_data, new_data, changed_fields, actor_id, actor_email, actor_name)
  values (tg_argv[0], tg_table_name, tg_argv[1], v_ref,
          case tg_op when 'INSERT' then 'Add' when 'UPDATE' then 'Edit' else 'Delete' end,
          v_old, v_new, v_changed, v_uid, v_email, v_name);
  return coalesce(new, old);
end $$;

-- আগের লগে যদি কোনো পিন/পাসওয়ার্ড থেকে থাকে সেটাও লুকানো (একবার, বারবার Run করলেও সমস্যা নেই)
update public.audit_log set old_data = public.scs_mask_secrets(old_data), new_data = public.scs_mask_secrets(new_data)
 where coalesce(old_data::text, '') || coalesce(new_data::text, '') ~* '(pin|password|passwd|secret|token|api_?key|"data:)';

-- ---------- Activity Log কে কী দেখবে (Admin Console > Notifications & Log থেকে বদলানো যায়) ----------
-- Super Admin ও অ্যাপের Admin সব দেখে; সাধারণ ইউজার লুকানো তালিকার বাইরেরগুলো দেখে
insert into public.sys_settings (key, value) values ('activity_visibility', jsonb_build_object('hidden', jsonb_build_array(
  'chemical-order:chem_settings', 'attendance:att_settings', 'monthly-report:mr_settings', 'leave:leave_settings', 'leave:leave_signatures')))
on conflict (key) do nothing;

create or replace function public.scs_audit_visible(p_app text, p_table text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_app = 'core' then public.is_super_admin()
    when public.has_app(p_app, 'admin') then true
    when not public.has_app(p_app) then false
    else not coalesce((select (value -> 'hidden') ? (p_app || ':' || p_table) from public.sys_settings where key = 'activity_visibility'),
                      p_table ~ '_(settings|signatures)$')
  end;
$$;
drop policy if exists scs_audit_read on public.audit_log;
create policy scs_audit_read on public.audit_log for select to authenticated using (public.scs_audit_visible(app_key, table_name));
-- লগ মার্ক করে ডিলিট: Super Admin সব, অ্যাপের Admin শুধু নিজের অ্যাপের
drop policy if exists scs_audit_delete on public.audit_log;
create policy scs_audit_delete on public.audit_log for delete to authenticated
  using (public.is_super_admin() or (app_key <> 'core' and public.has_app(app_key, 'admin')));

-- ---------- SCS LEAVE APPLICATION ----------
create table if not exists public.leave_employees (
  id          text primary key,
  emp_id      text not null unique,
  user_id     uuid unique references public.profiles(id) on delete set null,
  name        text not null default '',
  designation text not null default '',
  mobile      text not null default '',
  photo_url   text not null default '',
  sl_no       int  not null default 0,
  quota       numeric not null default 12,
  leave_types text not null default '',
  approvers   text not null default '',
  active      boolean not null default true,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
create table if not exists public.leave_applications (
  id            text primary key,                 -- LA ID, যেমন SCS202611-01
  emp_id        text not null,
  user_id       uuid references public.profiles(id) on delete set null,
  employee_name text not null default '',
  designation   text not null default '',
  mobile        text not null default '',
  from_date     text not null,
  to_date       text not null,
  total_days    numeric not null default 0,
  leave_type    text not null default '',
  quota         numeric not null default 12,
  description   text not null default '',
  status        text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  approved_by   text not null default '',
  reject_reason text not null default '',
  decided_at    timestamptz,
  decided_by    uuid,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
create index if not exists leave_applications_emp  on public.leave_applications (emp_id);
create index if not exists leave_applications_date on public.leave_applications (from_date, to_date);
create table if not exists public.leave_settings (
  key text primary key, value jsonb,
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
create table if not exists public.leave_signatures (
  key text primary key,                           -- emp:<ID>, apr:<নাম>, seal:company
  s   text not null default '',
  i   text not null default '',
  created_at timestamptz default now(), created_by uuid,
  updated_at timestamptz default now(), updated_by uuid
);
insert into public.leave_settings (key, value) values ('global', jsonb_build_object(
  'leaveTypes', 'Casual Leave, Physical Leave, Family Problem Leave, Weeding Leave, Other',
  'approvers', 'Mr. Ujjal Majumder, Shamiran Halder')) on conflict (key) do nothing;

select public.scs_attach_triggers('leave_employees',    'leave', 'Employee',          'emp_id');
select public.scs_attach_triggers('leave_applications', 'leave', 'Leave Application', 'id');
select public.scs_attach_triggers('leave_settings',     'leave', 'Settings',          'key');
select public.scs_attach_triggers('leave_signatures',   'leave', 'Signature',         'key');

alter table public.leave_employees    enable row level security;
alter table public.leave_applications enable row level security;
alter table public.leave_settings     enable row level security;
alter table public.leave_signatures   enable row level security;
drop policy if exists scs_le_read on public.leave_employees;
drop policy if exists scs_le_write on public.leave_employees;
drop policy if exists scs_la_read on public.leave_applications;
drop policy if exists scs_la_write on public.leave_applications;
drop policy if exists scs_ls_read on public.leave_settings;
drop policy if exists scs_ls_write on public.leave_settings;
drop policy if exists scs_lg_read on public.leave_signatures;
drop policy if exists scs_lg_write on public.leave_signatures;
create policy scs_le_read  on public.leave_employees    for select to authenticated using (public.has_app('leave'));
create policy scs_le_write on public.leave_employees    for all    to authenticated using (public.has_app('leave','admin')) with check (public.has_app('leave','admin'));
create policy scs_la_read  on public.leave_applications for select to authenticated using (public.has_app('leave'));
-- নতুন আবেদন leave_submit() দিয়ে (নিজের জন্য); এডিট/অ্যাপ্রুভ/ডিলিট শুধু Admin
create policy scs_la_write on public.leave_applications for all    to authenticated using (public.has_app('leave','admin')) with check (public.has_app('leave','admin'));
create policy scs_ls_read  on public.leave_settings     for select to authenticated using (public.has_app('leave'));
create policy scs_ls_write on public.leave_settings     for all    to authenticated using (public.has_app('leave','admin')) with check (public.has_app('leave','admin'));
create policy scs_lg_read  on public.leave_signatures   for select to authenticated using (public.has_app('leave'));
create policy scs_lg_write on public.leave_signatures   for all    to authenticated using (public.has_app('leave','admin')) with check (public.has_app('leave','admin'));

-- নতুন আবেদন: ইউজার শুধু নিজের জন্য, Admin যে কারো জন্য। LA ID সার্ভারেই তৈরি হয় (একই নম্বর দুবার হয় না)
create or replace function public.leave_submit(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare e public.leave_employees; v_prefix text; v_n int; v_id text;
begin
  if not public.has_app('leave') then raise exception 'Leave Application access required'; end if;
  select * into e from public.leave_employees where emp_id = p ->> 'employeeId' and active;
  if not found then raise exception 'Employee not found'; end if;
  if not public.has_app('leave', 'admin') and e.user_id is distinct from auth.uid() then
    raise exception 'You can apply only for yourself / শুধু নিজের জন্য আবেদন করা যায়';
  end if;
  if coalesce(p ->> 'fromDate', '') = '' or coalesce(p ->> 'toDate', '') = '' or coalesce(nullif(p ->> 'totalDays', '')::numeric, 0) <= 0 then
    raise exception 'Fill all fields correctly';
  end if;
  perform pg_advisory_xact_lock(hashtext('scs_leave_id'));
  v_prefix := 'SCS' || to_char(now() at time zone 'Asia/Dhaka', 'YYYYMM') || '-';
  select coalesce(max(substring(id from length(v_prefix) + 1)::int), 0) + 1 into v_n
    from public.leave_applications where id like v_prefix || '%' and substring(id from length(v_prefix) + 1) ~ '^\d+$';
  v_id := v_prefix || lpad(v_n::text, 2, '0');
  insert into public.leave_applications (id, emp_id, user_id, employee_name, designation, mobile, from_date, to_date,
                                         total_days, leave_type, quota, description)
  values (v_id, e.emp_id, e.user_id, e.name, e.designation, e.mobile, p ->> 'fromDate', p ->> 'toDate',
          (p ->> 'totalDays')::numeric, coalesce(p ->> 'leaveType', ''), e.quota, coalesce(p ->> 'description', ''));
  return v_id;
end $$;

-- অ্যাপ্রুভার নাম বদলালে সব জায়গায় (গ্লোবাল তালিকা, কর্মী, আবেদন, সিগনেচার) একসাথে
create or replace function public.leave_csv_swap(v text, p_old text, p_new text) returns text
language sql immutable as $$
  select coalesce(string_agg(case when trim(x) = p_old then p_new else trim(x) end, ', ' order by o), '')
  from unnest(string_to_array(coalesce(v, ''), ',')) with ordinality as t(x, o) where trim(x) <> '';
$$;
create or replace function public.leave_rename_approver(p_old text, p_new text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_app('leave', 'admin') then raise exception 'Leave admin access required'; end if;
  p_old := trim(coalesce(p_old, '')); p_new := trim(coalesce(p_new, ''));
  if p_old = '' or p_new = '' then raise exception 'Name is required'; end if;
  update public.leave_settings set value = jsonb_set(coalesce(value, '{}'::jsonb), '{approvers}', to_jsonb(public.leave_csv_swap(value ->> 'approvers', p_old, p_new)))
   where key = 'global';
  update public.leave_employees set approvers = public.leave_csv_swap(approvers, p_old, p_new) where approvers like '%' || p_old || '%';
  update public.leave_applications set approved_by = public.leave_csv_swap(approved_by, p_old, p_new) where approved_by like '%' || p_old || '%';
  update public.leave_signatures set key = 'apr:' || p_new
   where key = 'apr:' || p_old and not exists (select 1 from public.leave_signatures where key = 'apr:' || p_new);
end $$;

-- SCS অ্যাকাউন্ট (অনুমোদিত এমপ্লয়ি) -> Leave অ্যাপের কর্মী (নাম, মোবাইল, ছবি, ID প্রোফাইল থেকে)
create or replace function public.sync_leave_employee_from_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; o record; v_name text;
begin
  if current_setting('scs.restoring', true) = '1' then return null; end if;
  v_name := coalesce(nullif(trim(new.full_name), ''), new.email);
  select * into e from public.leave_employees where user_id = new.id;
  if not (new.status = 'active' and new.is_employee and new.employee_id is not null) then
    if found and e.active then update public.leave_employees set active = false where id = e.id; end if;
    return null;
  end if;
  if not found then
    -- পুরনো শিট থেকে আনা একই Employee ID থাকলে তার সাথেই জোড়া (ছুটির ইতিহাস থাকে)
    select * into e from public.leave_employees where emp_id = new.employee_id and user_id is null limit 1;
    if found then
      update public.leave_employees set user_id = new.id where id = e.id;
    else
      insert into public.leave_employees (id, emp_id, user_id, name, designation, mobile, photo_url, sl_no, active)
      values ('u-' || replace(new.id::text, '-', ''), new.employee_id, new.id, v_name, new.designation, new.phone, new.photo_url,
              coalesce((select max(sl_no) from public.leave_employees), 0) + 1, true);
      return null;
    end if;
  end if;
  if e.emp_id is distinct from new.employee_id then
    select * into o from public.leave_employees where emp_id = new.employee_id and id <> e.id;
    if found and o.user_id is null then
      -- পুরনো শিট থেকে আনা একই ID-র কর্মী আছে: দুটো এক করা (পুরনো ছুটির ইতিহাস থাকে)
      update public.leave_applications set emp_id = new.employee_id where emp_id = e.emp_id;
      delete from public.leave_employees where id = e.id;
      update public.leave_employees set user_id = new.id where id = o.id;
      e := o;
    elsif found then
      raise warning 'Employee ID % is already linked to another account', new.employee_id;
      return null;
    else
      update public.leave_applications set emp_id = new.employee_id where emp_id = e.emp_id;
      update public.leave_signatures set key = 'emp:' || new.employee_id
       where key = 'emp:' || e.emp_id and not exists (select 1 from public.leave_signatures where key = 'emp:' || new.employee_id);
    end if;
  end if;
  update public.leave_employees set
    emp_id = new.employee_id, name = v_name, mobile = new.phone,
    photo_url   = case when new.photo_url   <> '' then new.photo_url   else photo_url   end,
    designation = case when new.designation <> '' then new.designation else designation end,
    active = true, user_id = new.id
  where id = e.id;
  return null;
exception when others then
  raise warning 'SCS leave employee sync skipped for %: %', new.email, sqlerrm;
  return null;
end $$;
drop trigger if exists zz_sync_leave_employee on public.profiles;
create trigger zz_sync_leave_employee after insert or update on public.profiles
  for each row execute function public.sync_leave_employee_from_profile();

-- ---------- নোটিফিকেশন নিয়ম: কোন ঘটনায় কে নোটিফিকেশন পাবে (Admin Console থেকে চালু/বন্ধ ও প্রাপক বদলানো যায়) ----------
--  audience: app_users = অ্যাপের সব ইউজার, app_admins = অ্যাপের Admin, super_admins = শুধু Super Admin,
--            person = শুধু সংশ্লিষ্ট ব্যক্তি, person_admins = সংশ্লিষ্ট ব্যক্তি + অ্যাপের Admin
create table if not exists public.notif_rules (
  event_key  text primary key,
  app_key    text not null,
  label      text not null,
  label_bn   text,
  enabled    boolean not null default true,
  audience   text not null default 'app_users' check (audience in ('app_users','app_admins','super_admins','person','person_admins')),
  options    jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  updated_at timestamptz default now(), updated_by uuid
);
insert into public.notif_rules (event_key, app_key, label, label_bn, audience, options, sort_order) values
  ('core.new_account',               'core',           'New account opened (waiting for approval)', 'নতুন অ্যাকাউন্ট খোলা হয়েছে (অনুমোদনের অপেক্ষায়)', 'super_admins', '{}', 1),
  ('core.account_approved',          'core',           'Your account was approved',                 'আপনার অ্যাকাউন্ট অনুমোদিত হয়েছে',               'person',       '{}', 2),
  ('chemical-order.new_order',       'chemical-order', 'New chemical order',                        'নতুন কেমিক্যাল অর্ডার',                          'app_users',    '{}', 10),
  ('leave.new_application',          'leave',          'New leave application',                     'নতুন ছুটির আবেদন',                               'app_admins',   '{}', 20),
  ('leave.decision',                 'leave',          'Leave approved / rejected (to applicant)',  'ছুটি অ্যাপ্রুভ / রিজেক্ট (আবেদনকারীকে)',           'person',       '{}', 21),
  ('attendance.clock_in_reminder',   'attendance',     'Reminder: Clock IN at office start time',   'রিমাইন্ডার: অফিস শুরুর সময় ক্লক ইন',             'person',       '{"offset": 0}', 30),
  ('attendance.clock_out_reminder',  'attendance',     'Reminder: Clock OUT at office end time',    'রিমাইন্ডার: অফিস শেষের সময় ক্লক আউট',             'person',       '{"offset": 0}', 31)
on conflict (event_key) do update set app_key = excluded.app_key, label = excluded.label, label_bn = excluded.label_bn, sort_order = excluded.sort_order;
alter table public.notif_rules enable row level security;
drop policy if exists scs_nr_read on public.notif_rules;
drop policy if exists scs_nr_write on public.notif_rules;
create policy scs_nr_read  on public.notif_rules for select to authenticated using (true);
create policy scs_nr_write on public.notif_rules for all    to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
select public.scs_attach_triggers('notif_rules', 'core', 'Notification Rule', 'event_key', false);

-- সার্ভার থেকেই পুশ পাঠানো (Netlify push function কে ডাকা) — সাইটের ঠিকানা Admin Console নিজে সেভ করে
insert into public.sys_secrets (key, value)
values ('cron_key', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create or replace function public.scs_push_kick() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u text; k text;
begin
  select value ->> 'url' into u from public.sys_settings where key = 'site';
  if coalesce(u, '') = '' then return; end if;
  select value into k from public.sys_secrets where key = 'cron_key';
  perform net.http_post(url := rtrim(u, '/') || '/.netlify/functions/push',
                        body := jsonb_build_object('dispatch', true, 'cronKey', coalesce(k, '')),
                        headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 20000);
exception when others then
  null;   -- pg_net না থাকলে বা ঠিকানা না থাকলে: অ্যাপ খুললেই পুশ যাবে
end $$;
revoke execute on function public.scs_push_kick() from public, anon, authenticated;

create or replace function public.scs_notify_event(p_event text, p_title text, p_body text, p_url text,
                                                   p_target uuid default null, p_exclude uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare r public.notif_rules; v_app text; v_aud text; n int := 0;
begin
  select * into r from public.notif_rules where event_key = p_event;
  if found and not r.enabled then return 0; end if;
  v_app := coalesce(r.app_key, split_part(p_event, '.', 1));
  v_aud := coalesce(r.audience, 'app_users');
  insert into public.notifications (user_id, app_key, title, body, url)
  select p.id, v_app, p_title, coalesce(p_body, ''), coalesce(p_url, '/')
  from public.profiles p
  where p.status = 'active' and p.id is distinct from p_exclude and (
    case v_aud
      when 'person'       then p.id = p_target
      when 'super_admins' then p.is_super_admin
      when 'app_admins'   then p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = v_app and a.role = 'admin')
      when 'person_admins' then p.id = p_target or p.is_super_admin
                               or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = v_app and a.role = 'admin')
      else p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = v_app)
    end);
  get diagnostics n = row_count;
  if n > 0 then perform public.scs_push_kick(); end if;
  return n;
end $$;
revoke execute on function public.scs_notify_event(text, text, text, text, uuid, uuid) from public, anon, authenticated;

-- পুরনো scs_notify এখনো কাজ করে (নতুন অ্যাপের জন্য)
create or replace function public.scs_notify(p_app text, p_title text, p_body text, p_url text, p_exclude uuid default null)
returns int language plpgsql security definer set search_path = public as $$
begin
  return public.scs_notify_event(p_app || '.general', p_title, p_body, p_url, null, p_exclude);
end $$;
revoke execute on function public.scs_notify(text, text, text, text, uuid) from public, anon, authenticated;

-- নতুন অ্যাকাউন্ট -> Super Admin; অনুমোদন পেলে -> সেই ব্যক্তি
create or replace function public.notify_new_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('scs.restoring', true) = '1' then return null; end if;
  perform public.scs_notify_event('core.new_account', 'New account waiting for approval',
    coalesce(nullif(new.full_name, ''), new.email) || ' · ' || coalesce(nullif(new.phone, ''), new.email), '/admin.html', null, new.id);
  return null;
exception when others then return null;
end $$;
create or replace function public.notify_account_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('scs.restoring', true) = '1' then return null; end if;
  if new.status = 'active' and old.status is distinct from 'active' then
    perform public.scs_notify_event('core.account_approved', 'Your account is approved ✅',
      'You can now open the apps you have access to. / এখন অ্যাক্সেস পাওয়া অ্যাপগুলো খুলতে পারবেন।', '/', new.id, null);
  end if;
  return null;
exception when others then return null;
end $$;
drop trigger if exists zz_notify_account_status on public.profiles;
create trigger zz_notify_account_status after update on public.profiles
  for each row execute function public.notify_account_status();

-- নতুন অর্ডার (নিয়ম: chemical-order.new_order)
create or replace function public.chem_create_order(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_no text; v_total numeric; v_by text;
begin
  if not public.has_app('chemical-order') then raise exception 'Chemical Order access required'; end if;
  perform pg_advisory_xact_lock(hashtext('scs_chem_order_no'));
  v_no := public.chem_next_order_no();
  insert into public.chem_orders (order_no, delivery_at, client_name, mobile, address, transport_fee,
                                  scs_transport_cost, order_by, commission_holder_name, items, sms_status, pdf_status)
  values (v_no, coalesce(p->>'delivery_at',''), coalesce(p->>'client_name',''), coalesce(p->>'mobile',''),
          coalesce(p->>'address',''), coalesce((p->>'transport_fee')::numeric, 0),
          coalesce((p->>'scs_transport_cost')::numeric, 0), coalesce(p->>'order_by',''),
          coalesce(p->>'commission_holder_name',''), coalesce(p->'items','[]'::jsonb), 'Pending', 'Not Uploaded');
  select coalesce(sum(coalesce(nullif(i->>'quantity','')::numeric, 0) * coalesce(nullif(i->>'discountUnitPrice','')::numeric, 0)), 0)
    into v_total from jsonb_array_elements(coalesce(p->'items','[]'::jsonb)) i;
  v_total := v_total + coalesce((p->>'transport_fee')::numeric, 0);
  v_by := coalesce(p->>'order_by', '');
  perform public.scs_notify_event('chemical-order.new_order', 'New order ' || v_no,
    coalesce(nullif(p->>'client_name', ''), 'Customer') || ' · Tk ' || to_char(v_total, 'FM999,999,999,990') ||
    case when v_by <> '' then ' · by ' || v_by else '' end,
    '/apps/chemical-order/', null, auth.uid());
  return v_no;
end $$;

-- ছুটির আবেদন -> Admin দের; অ্যাপ্রুভ/রিজেক্ট -> আবেদনকারীকে
create or replace function public.leave_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_days text;
begin
  if current_setting('scs.restoring', true) = '1' then return null; end if;
  v_target := coalesce(new.user_id, (select user_id from public.leave_employees where emp_id = new.emp_id));
  v_days := trim(to_char(new.total_days, 'FM999990.##'));
  if tg_op = 'INSERT' then
    perform public.scs_notify_event('leave.new_application', 'New leave application · ' || new.employee_name,
      v_days || ' day(s) · ' || new.leave_type || ' · ' || new.from_date || ' → ' || new.to_date || ' · ' || new.id,
      '/apps/leave/', v_target, auth.uid());
  elsif new.status is distinct from old.status and new.status in ('Approved', 'Rejected') then
    perform public.scs_notify_event('leave.decision',
      case when new.status = 'Approved' then 'Your leave is approved ✅' else 'Your leave is rejected ❌' end,
      new.id || ' · ' || new.from_date || ' → ' || new.to_date || ' · ' || v_days || ' day(s)' ||
      case when new.status = 'Approved' and new.approved_by <> '' then ' · by ' || new.approved_by
           when new.status = 'Rejected' and new.reject_reason <> '' then ' · ' || new.reject_reason else '' end,
      '/apps/leave/', v_target, null);
  end if;
  return null;
exception when others then
  raise warning 'leave notify: %', sqlerrm; return null;
end $$;
drop trigger if exists zz_leave_notify on public.leave_applications;
create trigger zz_leave_notify after insert or update on public.leave_applications
  for each row execute function public.leave_notify();

-- ---------- হাজিরার রিমাইন্ডার: অফিস শুরুর সময় Clock IN, শেষের সময় Clock OUT ----------
create table if not exists public.notif_sent (k text primary key, at timestamptz not null default now());
alter table public.notif_sent enable row level security;

create or replace function public.scs_time_min(t text) returns int
language plpgsql immutable as $$
declare m text[]; h int; mi int;
begin
  m := regexp_match(coalesce(t, ''), '(\d{1,2}):(\d{2})');
  if m is null then return null; end if;
  h := m[1]::int; mi := m[2]::int;
  if t ~* 'pm' and h < 12 then h := h + 12; end if;
  if t ~* 'am' and h = 12 then h := 0; end if;
  return h * 60 + mi;
end $$;

create or replace function public.scs_attendance_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare o jsonb; d text; now_min int; wd int; v_in text; v_out text; in_min int; out_min int;
  rin public.notif_rules; rout public.notif_rules; n int := 0; c int; hol text;
begin
  d := to_char(now() at time zone 'Asia/Dhaka', 'YYYY-MM-DD');
  now_min := extract(hour from now() at time zone 'Asia/Dhaka')::int * 60 + extract(minute from now() at time zone 'Asia/Dhaka')::int;
  wd := extract(dow from now() at time zone 'Asia/Dhaka')::int;
  if wd = 5 then return 0; end if;                                    -- শুক্রবার সাপ্তাহিক ছুটি
  select value into o from public.att_settings where key = 'office';
  hol := coalesce((o -> 'holidays')::text, coalesce(o ->> 'holidays', ''));
  if position(d in hol) > 0 then return 0; end if;                    -- সরকারি/অফিস ছুটি
  v_in := coalesce(nullif(o ->> 'officeInTime', ''), '09:00');
  v_out := coalesce(nullif(o ->> 'officeOutTime', ''), '17:00');
  in_min := public.scs_time_min(v_in); out_min := public.scs_time_min(v_out);
  select * into rin from public.notif_rules where event_key = 'attendance.clock_in_reminder';
  select * into rout from public.notif_rules where event_key = 'attendance.clock_out_reminder';

  if in_min is not null and coalesce(rin.enabled, true) then
    in_min := in_min + coalesce(nullif(rin.options ->> 'offset', '')::int, 0);
    if now_min >= in_min and now_min < in_min + 20 and not exists (select 1 from public.notif_sent where k = 'in:' || d) then
      insert into public.notif_sent (k) values ('in:' || d) on conflict do nothing;
      insert into public.notifications (user_id, app_key, title, body, url)
      select e.user_id, 'attendance', 'Time to Clock IN ⏰ / ক্লক ইন করুন',
             'Office starts at ' || v_in || '. Please give your attendance now. / অফিস শুরু ' || v_in || '। এখনই হাজিরা দিন।', '/apps/attendance/'
      from public.att_employees e join public.profiles p on p.id = e.user_id
      where e.active and p.status = 'active'
        and (p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = 'attendance'))
        and not exists (select 1 from public.att_records r where r.emp_id = e.emp_id and r.date = d and r.type = 'Clock IN')
        and not exists (select 1 from public.leave_applications l where l.emp_id = e.emp_id and l.status = 'Approved' and l.from_date <= d and l.to_date >= d);
      get diagnostics c = row_count; n := n + c;
    end if;
  end if;

  if out_min is not null and coalesce(rout.enabled, true) then
    out_min := out_min + coalesce(nullif(rout.options ->> 'offset', '')::int, 0);
    if now_min >= out_min and now_min < out_min + 20 and not exists (select 1 from public.notif_sent where k = 'out:' || d) then
      insert into public.notif_sent (k) values ('out:' || d) on conflict do nothing;
      insert into public.notifications (user_id, app_key, title, body, url)
      select e.user_id, 'attendance', 'Time to Clock OUT 🏁 / ক্লক আউট করুন',
             'Office ends at ' || v_out || '. Do not forget to Clock OUT. / অফিস শেষ ' || v_out || '। ক্লক আউট দিতে ভুলবেন না।', '/apps/attendance/'
      from public.att_employees e join public.profiles p on p.id = e.user_id
      where e.active and p.status = 'active'
        and (p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = 'attendance'))
        and exists (select 1 from public.att_records r where r.emp_id = e.emp_id and r.date = d and r.type = 'Clock IN')
        and not exists (select 1 from public.att_records r where r.emp_id = e.emp_id and r.date = d and r.type = 'Clock OUT');
      get diagnostics c = row_count; n := n + c;
    end if;
  end if;

  delete from public.notif_sent where at < now() - interval '10 days';
  if n > 0 then perform public.scs_push_kick(); end if;
  return n;
end $$;
revoke execute on function public.scs_attendance_reminders() from public, anon;

-- প্রতি মিনিটে চেক (কাজ খুব হালকা: সময় না হলে কিছুই করে না)
do $$
begin
  begin perform cron.unschedule('scs-reminders'); exception when others then null; end;
  begin
    perform cron.schedule('scs-reminders', '* * * * *', 'select public.scs_attendance_reminders()');
  exception when others then raise notice 'Reminders not scheduled (enable pg_cron): %', sqlerrm;
  end;
end $$;

-- ---------- Realtime: Leave অ্যাপ লাইভ আপডেট ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['leave_applications','leave_employees','leave_settings'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ব্যাকআপে যায় না: গোপন/অস্থায়ী টেবিল
create or replace function public.scs_backup_excluded() returns text[]
language sql immutable as $$
  select array['sys_secrets','chem_secrets','password_reset_codes','sms_codes','push_subscriptions','notifications','sys_backup_log','notif_sent'];
$$;

-- পুরনো Google Sheet (Apps Script) থেকে Leave ডাটা আনা — migrate.html ব্যবহার করে (নোটিফিকেশন যায় না)
create or replace function public.leave_import(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e jsonb; a jsonb; s jsonb; n_e int := 0; n_a int := 0; n_s int := 0;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  perform set_config('scs.restoring', '1', true);
  if jsonb_typeof(p -> 'config') = 'object' then
    insert into public.leave_settings (key, value) values ('global', p -> 'config')
    on conflict (key) do update set value = excluded.value;
  end if;
  for e in select * from jsonb_array_elements(coalesce(p -> 'employees', '[]'::jsonb)) loop
    continue when coalesce(e ->> 'emp_id', '') = '';
    update public.leave_employees set
      sl_no = coalesce(nullif(e ->> 'sl_no', '')::int, sl_no),
      quota = coalesce(nullif(e ->> 'quota', '')::numeric, quota),
      leave_types = coalesce(e ->> 'leave_types', leave_types),
      approvers = coalesce(e ->> 'approvers', approvers),
      name = case when user_id is null then coalesce(nullif(e ->> 'name', ''), name) else name end,
      designation = case when user_id is null or designation = '' then coalesce(nullif(e ->> 'designation', ''), designation) else designation end,
      mobile = case when user_id is null then coalesce(nullif(e ->> 'mobile', ''), mobile) else mobile end,
      photo_url = case when photo_url = '' then coalesce(e ->> 'photo_url', '') else photo_url end
    where emp_id = e ->> 'emp_id';
    if not found then
      insert into public.leave_employees (id, emp_id, name, designation, mobile, photo_url, sl_no, quota, leave_types, approvers, active, created_at, updated_at)
      values ('lv-' || md5(e ->> 'emp_id'), e ->> 'emp_id', coalesce(e ->> 'name', ''), coalesce(e ->> 'designation', ''), coalesce(e ->> 'mobile', ''),
              coalesce(e ->> 'photo_url', ''), coalesce(nullif(e ->> 'sl_no', '')::int, 0), coalesce(nullif(e ->> 'quota', '')::numeric, 12),
              coalesce(e ->> 'leave_types', ''), coalesce(e ->> 'approvers', ''), true, now(), now())
      on conflict (id) do nothing;
    end if;
    n_e := n_e + 1;
  end loop;
  for a in select * from jsonb_array_elements(coalesce(p -> 'applications', '[]'::jsonb)) loop
    continue when coalesce(a ->> 'id', '') = '' or coalesce(a ->> 'emp_id', '') = '';
    insert into public.leave_applications (id, emp_id, user_id, employee_name, designation, mobile, from_date, to_date, total_days,
                                           leave_type, quota, description, status, approved_by, created_at, updated_at)
    values (a ->> 'id', a ->> 'emp_id', (select user_id from public.leave_employees where emp_id = a ->> 'emp_id'),
            coalesce(a ->> 'employee_name', ''), coalesce(a ->> 'designation', ''), coalesce(a ->> 'mobile', ''),
            coalesce(a ->> 'from_date', ''), coalesce(a ->> 'to_date', ''), coalesce(nullif(a ->> 'total_days', '')::numeric, 0),
            coalesce(a ->> 'leave_type', ''), coalesce(nullif(a ->> 'quota', '')::numeric, 12), coalesce(a ->> 'description', ''),
            case when a ->> 'status' in ('Pending','Approved','Rejected') then a ->> 'status' else 'Pending' end,
            coalesce(a ->> 'approved_by', ''), coalesce(nullif(a ->> 'created_at', '')::timestamptz, now()), now())
    on conflict (id) do update set emp_id = excluded.emp_id, user_id = coalesce(excluded.user_id, public.leave_applications.user_id),
      employee_name = excluded.employee_name, designation = excluded.designation, mobile = excluded.mobile,
      from_date = excluded.from_date, to_date = excluded.to_date, total_days = excluded.total_days, leave_type = excluded.leave_type,
      quota = excluded.quota, description = excluded.description, status = excluded.status, approved_by = excluded.approved_by,
      created_at = excluded.created_at;
    n_a := n_a + 1;
  end loop;
  for s in select * from jsonb_array_elements(coalesce(p -> 'signatures', '[]'::jsonb)) loop
    continue when coalesce(s ->> 'key', '') = '';
    insert into public.leave_signatures (key, s, i, created_at, updated_at) values (s ->> 'key', coalesce(s ->> 's', ''), coalesce(s ->> 'i', ''), now(), now())
    on conflict (key) do update set s = excluded.s, i = excluded.i;
    n_s := n_s + 1;
  end loop;
  perform set_config('scs.restoring', '0', true);
  return jsonb_build_object('employees', n_e, 'applications', n_a, 'signatures', n_s);
end $$;
revoke execute on function public.leave_import(jsonb) from public, anon;

-- =====================================================================
--  12. v5: যেকোনো হোস্টে চলা (Netlify / GitHub Pages) + সব অ্যাপ রিয়েল-টাইম
-- =====================================================================

-- সব অ্যাপের টেবিল Realtime এ — কেউ কিছু বদলালে সবার স্ক্রিনে সাথে সাথে আসে
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['chem_orders','chem_products','chem_sellers','chem_settings',
                             'att_records','att_employees','att_settings','att_monthly_summary',
                             'mr_month_data','mr_settings','profiles','app_access',
                             'leave_applications','leave_employees','leave_settings'] loop
      if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t)
         and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- পুশ নোটিফিকেশন পাঠানো: Supabase Edge Function "scs-api" (না থাকলে Netlify function)
-- ঠিকানা দুটো Super Admin সাইট খুললেই নিজে থেকে সেভ হয় (sys_settings: api, site)
create or replace function public.scs_push_kick() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare api jsonb; u text; k text; h jsonb;
begin
  select value into k from public.sys_secrets where key = 'cron_key';
  select value into api from public.sys_settings where key = 'api';
  if coalesce(api ->> 'url', '') <> '' then
    h := jsonb_build_object('Content-Type', 'application/json', 'apikey', coalesce(api ->> 'anon', ''));
    if coalesce(api ->> 'anon', '') like 'eyJ%' then h := h || jsonb_build_object('Authorization', 'Bearer ' || (api ->> 'anon')); end if;
    perform net.http_post(url := (api ->> 'url') || '?fn=push', body := jsonb_build_object('dispatch', true, 'cronKey', coalesce(k, '')),
                          headers := h, timeout_milliseconds := 20000);
    return;
  end if;
  select value ->> 'url' into u from public.sys_settings where key = 'site';
  if coalesce(u, '') = '' then return; end if;
  perform net.http_post(url := rtrim(u, '/') || '/.netlify/functions/push',
                        body := jsonb_build_object('dispatch', true, 'cronKey', coalesce(k, '')),
                        headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 20000);
exception when others then
  null;
end $$;
revoke execute on function public.scs_push_kick() from public, anon, authenticated;

-- =====================================================================
--  13. v6: Apps Script কম্প্যাটিবিলিটি ইঞ্জিন
--  প্রতিটা অ্যাপের আসল Code.gs ব্রাউজারে চলে; Google Sheet / Properties / Drive এর জায়গায় এই টেবিলগুলো।
--  app_key = অ্যাপ (যেমন 'chemical-order'), প্রতিটা অ্যাপের ডাটা শুধু সেই অ্যাপের ইউজাররা দেখে।
-- =====================================================================

-- অ্যাপের "Google Sheet" এর প্রতিটা ট্যাব (data = 2D অ্যারে, তারিখ {"$d": "..."} আকারে)
create table if not exists public.gas_sheets (
  app_key    text not null,
  name       text not null,
  idx        int  not null default 0,
  data       jsonb not null default '[]'::jsonb,
  meta       jsonb not null default '{}'::jsonb,
  version    bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (app_key, name)
);
-- PropertiesService (scope: script = সবার, user:<id> = একজনের)
create table if not exists public.gas_props (
  app_key    text not null,
  scope      text not null default 'script',
  key        text not null,
  value      text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (app_key, scope, key)
);
-- DriveApp: ফাইল ও ফোল্ডার (ফাইলের আসল ডাটা Storage bucket "scs-files" এ gas/<app>/<id>)
create table if not exists public.gas_files (
  id          text primary key,
  app_key     text not null,
  name        text not null default '',
  mime        text not null default 'application/octet-stream',
  is_folder   boolean not null default false,
  parent_id   text,
  path        text,
  size        bigint not null default 0,
  description text not null default '',
  trashed     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid
);
create index if not exists gas_files_parent on public.gas_files (app_key, parent_id, name);
-- কোন অ্যাপের কোন শিট কখন বদলেছে (রিয়েল-টাইম সংকেত — ছোট, তাই দ্রুত)
create table if not exists public.gas_versions (
  app_key    text not null,
  name       text not null,
  version    bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (app_key, name)
);
-- LockService.getScriptLock() — একই অ্যাপে একসাথে দুজনের লেখা এক এক করে হয়
create table if not exists public.gas_locks (
  app_key  text primary key,
  holder   text,
  until_at timestamptz not null default now()
);
-- অন্য অ্যাপের শিট খোলা (SpreadsheetApp.openById): পুরনো Google Sheet ID -> কোন অ্যাপ
create table if not exists public.gas_aliases (
  sheet_id text primary key,
  app_key  text not null,
  note     text not null default ''
);

-- অ্যাপ-থেকে-অ্যাপ লিংক: from_app এর ইউজাররা to_app এর শিট পড়তে পারে (can_write = লিখতেও)
-- যেমন Report পড়ে Chemical Order এর অর্ডার, Attendance লেখে Report এ হাজিরার মাসিক সামারি
create table if not exists public.gas_links (
  from_app  text not null,
  to_app    text not null,
  can_write boolean not null default false,
  note      text not null default '',
  primary key (from_app, to_app)
);
insert into public.gas_links (from_app, to_app, can_write, note) values
  ('monthly-report', 'chemical-order', false, 'Report reads the SCS Order sheet'),
  ('monthly-report', 'attendance',     false, 'Report reads attendance data'),
  ('attendance',     'monthly-report', true,  'Attendance writes the monthly summary (Employee Attendance tab)')
on conflict (from_app, to_app) do nothing;
alter table public.gas_links enable row level security;
drop policy if exists scs_gl_read on public.gas_links;
drop policy if exists scs_gl_write on public.gas_links;
create policy scs_gl_read  on public.gas_links for select to authenticated using (true);
create policy scs_gl_write on public.gas_links for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

/** ইঞ্জিনের অ্যাপে অনুমতি: নিজের অ্যাপ, অথবা লিংক থাকা অ্যাপ থেকে (p_write = লেখার অনুমতি লাগবে কি না) */
create or replace function public.gas_can(p_app text, p_write boolean default false, p_via text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_app(p_app) or exists (
    select 1 from public.gas_links l
    where l.to_app = p_app and (p_via is null or l.from_app = p_via) and (not p_write or l.can_write) and public.has_app(l.from_app));
$$;

alter table public.gas_sheets   enable row level security;
alter table public.gas_props    enable row level security;
alter table public.gas_files    enable row level security;
alter table public.gas_versions enable row level security;
alter table public.gas_locks    enable row level security;
alter table public.gas_aliases  enable row level security;
drop policy if exists scs_gs_read on public.gas_sheets;
drop policy if exists scs_gp_read on public.gas_props;
drop policy if exists scs_gf_all on public.gas_files;
drop policy if exists scs_gv_read on public.gas_versions;
drop policy if exists scs_ga_read on public.gas_aliases;
drop policy if exists scs_ga_write on public.gas_aliases;
-- পড়া: অ্যাপের ইউজার। লেখা: শুধু gas_commit() দিয়ে (যাচাই + Activity Log সহ)
create policy scs_gs_read on public.gas_sheets   for select to authenticated using (public.gas_can(app_key));
create policy scs_gp_read on public.gas_props    for select to authenticated using (public.has_app(app_key) and (scope = 'script' or scope = 'user:' || auth.uid()::text));
create policy scs_gf_all  on public.gas_files    for all    to authenticated using (public.has_app(app_key)) with check (public.has_app(app_key));
create policy scs_gv_read on public.gas_versions for select to authenticated using (public.gas_can(app_key));
create policy scs_ga_read on public.gas_aliases  for select to authenticated using (true);
create policy scs_ga_write on public.gas_aliases for all    to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

/**
 * একটা কাজ শেষে সব পরিবর্তন একসাথে সেভ (হয় সব, নয় কিছুই না)
 * p_sheets: [{name, base (আগের version, নতুন শিট হলে 0), data, meta, idx, deleted}]
 * p_props:  [{scope, key, value (null = মুছে ফেলা)}]
 * p_audit:  [{entity, ref, action, before, after, fields}]  (ব্রাউজার হিসাব করে পাঠায়)
 * অন্য কেউ মাঝখানে একই শিট বদলালে 'SCS_CONFLICT' — তখন ব্রাউজার আবার নতুন ডাটা নিয়ে কাজটা চালায়
 */
drop function if exists public.gas_commit(text, jsonb, jsonb, jsonb);
create or replace function public.gas_commit(p_app text, p_sheets jsonb, p_props jsonb, p_audit jsonb, p_via text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s jsonb; p jsonb; a jsonb; cur bigint; out jsonb := '{}'::jsonb; v bigint;
  v_uid uuid := auth.uid(); v_email text; v_name text;
begin
  if not public.has_app(p_app) then
    -- অন্য অ্যাপ থেকে লেখা (লিংক): শুধু শিট, সেটিং নয়
    if p_via is null or not public.gas_can(p_app, true, p_via) then raise exception 'No access to this app'; end if;
    p_props := '[]'::jsonb;
  end if;
  for s in select * from jsonb_array_elements(coalesce(p_sheets, '[]'::jsonb)) loop
    select version into cur from public.gas_sheets where app_key = p_app and name = s ->> 'name' for update;
    if coalesce(cur, 0) <> coalesce((s ->> 'base')::bigint, 0) then
      raise exception 'SCS_CONFLICT %', s ->> 'name';
    end if;
    if coalesce((s ->> 'deleted')::boolean, false) then
      delete from public.gas_sheets where app_key = p_app and name = s ->> 'name';
      v := coalesce(cur, 0) + 1;
    elsif cur is null then
      insert into public.gas_sheets (app_key, name, idx, data, meta, version, updated_by)
      values (p_app, s ->> 'name', coalesce((s ->> 'idx')::int, 0), coalesce(s -> 'data', '[]'::jsonb), coalesce(s -> 'meta', '{}'::jsonb), 1, v_uid);
      v := 1;
    else
      update public.gas_sheets set data = coalesce(s -> 'data', data), meta = coalesce(s -> 'meta', meta),
        idx = coalesce((s ->> 'idx')::int, idx), version = version + 1, updated_at = now(), updated_by = v_uid
      where app_key = p_app and name = s ->> 'name' returning version into v;
    end if;
    insert into public.gas_versions (app_key, name, version, updated_at, updated_by) values (p_app, s ->> 'name', v, now(), v_uid)
    on conflict (app_key, name) do update set version = excluded.version, updated_at = now(), updated_by = v_uid;
    out := out || jsonb_build_object(s ->> 'name', v);
  end loop;
  for p in select * from jsonb_array_elements(coalesce(p_props, '[]'::jsonb)) loop
    if (p ->> 'scope') <> 'script' and (p ->> 'scope') <> 'user:' || v_uid::text then continue; end if;
    if p -> 'value' is null or jsonb_typeof(p -> 'value') = 'null' then
      delete from public.gas_props where app_key = p_app and scope = p ->> 'scope' and key = p ->> 'key';
    else
      insert into public.gas_props (app_key, scope, key, value, updated_at, updated_by) values (p_app, p ->> 'scope', p ->> 'key', p ->> 'value', now(), v_uid)
      on conflict (app_key, scope, key) do update set value = excluded.value, updated_at = now(), updated_by = v_uid;
    end if;
  end loop;
  if jsonb_array_length(coalesce(p_props, '[]'::jsonb)) > 0 then
    insert into public.gas_versions (app_key, name, version, updated_at, updated_by) values (p_app, '#props', 1, now(), v_uid)
    on conflict (app_key, name) do update set version = public.gas_versions.version + 1, updated_at = now(), updated_by = v_uid;
  end if;
  -- Activity Log (পিন/পাসওয়ার্ড scs_mask_secrets দিয়ে লুকানো)
  if jsonb_array_length(coalesce(p_audit, '[]'::jsonb)) > 0 then
    select email, coalesce(nullif(full_name, ''), email) into v_email, v_name from public.profiles where id = v_uid;
    for a in select * from jsonb_array_elements(p_audit) limit 200 loop
      insert into public.audit_log (app_key, table_name, entity, record_ref, action, old_data, new_data, changed_fields, actor_id, actor_email, actor_name)
      values (p_app, 'sheet:' || coalesce(a ->> 'sheet', ''), coalesce(a ->> 'entity', a ->> 'sheet'), left(coalesce(a ->> 'ref', ''), 200),
              coalesce(a ->> 'action', 'Edit'), public.scs_mask_secrets(a -> 'before'), public.scs_mask_secrets(a -> 'after'),
              case when jsonb_typeof(a -> 'fields') = 'array' then array(select jsonb_array_elements_text(a -> 'fields')) else null end,
              v_uid, v_email, coalesce(v_name, 'System'));
    end loop;
  end if;
  return out;
end $$;
revoke execute on function public.gas_commit(text, jsonb, jsonb, jsonb, text) from public, anon;

-- LockService: অপেক্ষা করে লক নেওয়া (সর্বোচ্চ p_wait_ms), লক নিজে থেকে p_ttl_ms পরে ছেড়ে যায়
create or replace function public.gas_lock(p_app text, p_holder text, p_wait_ms int default 10000, p_ttl_ms int default 30000)
returns boolean language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); ok boolean;
begin
  if not public.has_app(p_app) then raise exception 'No access to this app'; end if;
  insert into public.gas_locks (app_key, holder, until_at) values (p_app, null, now() - interval '1 second') on conflict (app_key) do nothing;
  loop
    update public.gas_locks set holder = p_holder, until_at = clock_timestamp() + make_interval(secs => least(p_ttl_ms, 120000) / 1000.0)
     where app_key = p_app and (until_at < clock_timestamp() or holder = p_holder)
    returning true into ok;
    if ok then return true; end if;
    if clock_timestamp() - t0 > make_interval(secs => least(p_wait_ms, 25000) / 1000.0) then return false; end if;
    perform pg_sleep(0.15);
  end loop;
end $$;
create or replace function public.gas_unlock(p_app text, p_holder text) returns void
language sql security definer set search_path = public as $$
  update public.gas_locks set until_at = now() - interval '1 second' where app_key = p_app and holder = p_holder;
$$;
revoke execute on function public.gas_lock(text, text, int, int) from public, anon;
revoke execute on function public.gas_unlock(text, text) from public, anon;

-- রিয়েল-টাইম: শুধু ছোট version টেবিল (বড় শিট ডাটা নয়)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gas_versions') then
    alter publication supabase_realtime add table public.gas_versions;
  end if;
end $$;

-- ইঞ্জিনের ফাইল Storage এ: scs-files/gas/<app>/<id> — অ্যাপের ইউজার পড়তে/লিখতে পারে
drop policy if exists scs_gas_files_read on storage.objects;
drop policy if exists scs_gas_files_write on storage.objects;
drop policy if exists scs_gas_files_update on storage.objects;
drop policy if exists scs_gas_files_delete on storage.objects;
create policy scs_gas_files_read on storage.objects for select to authenticated
  using (bucket_id = 'scs-files' and (storage.foldername(name))[1] = 'gas' and public.has_app((storage.foldername(name))[2]));
create policy scs_gas_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'scs-files' and (storage.foldername(name))[1] = 'gas' and public.has_app((storage.foldername(name))[2]));
create policy scs_gas_files_update on storage.objects for update to authenticated
  using (bucket_id = 'scs-files' and (storage.foldername(name))[1] = 'gas' and public.has_app((storage.foldername(name))[2]));
create policy scs_gas_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'scs-files' and (storage.foldername(name))[1] = 'gas' and public.has_app((storage.foldername(name))[2]));

-- ব্যাকআপে লক টেবিল যায় না
create or replace function public.scs_backup_excluded() returns text[]
language sql immutable as $$
  select array['sys_secrets','chem_secrets','password_reset_codes','sms_codes','push_subscriptions','notifications','sys_backup_log','notif_sent','gas_locks'];
$$;

-- ইঞ্জিনের অ্যাপ থেকে নোটিফিকেশন (নিয়ম: notif_rules, যেমন 'chemical-order.new_order')
create or replace function public.scs_app_notify(p_app text, p_event text, p_title text, p_body text, p_url text, p_target uuid default null)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.has_app(p_app) then raise exception 'No access to this app'; end if;
  if split_part(p_event, '.', 1) <> p_app then p_event := p_app || '.' || p_event; end if;
  return public.scs_notify_event(p_event, left(coalesce(p_title, ''), 200), left(coalesce(p_body, ''), 500), coalesce(nullif(p_url, ''), '/apps/' || p_app || '/'), p_target, auth.uid());
end $$;
revoke execute on function public.scs_app_notify(text, text, text, text, text, uuid) from public, anon;

-- এমপ্লয়ি অটো-সিঙ্ক: অনুমোদিত এমপ্লয়ি অ্যাকাউন্টগুলো (কোনো অ্যাপে আলাদা করে কর্মী যোগ করতে হয় না)
create or replace function public.scs_app_employees(p_app text)
returns table (user_id uuid, employee_id text, full_name text, phone text, email text, photo_url text, designation text, department text, app_role text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.employee_id, coalesce(nullif(trim(p.full_name), ''), p.email), p.phone, p.email, p.photo_url, p.designation, p.department,
         case when p.is_super_admin then 'admin' else (select a.role from public.app_access a where a.user_id = p.id and a.app_key = p_app) end,
         p.created_at
  from public.profiles p
  where public.has_app(p_app) and p.status = 'active' and p.is_employee and p.employee_id is not null
  order by p.created_at;
$$;
revoke execute on function public.scs_app_employees(text) from public, anon;

-- শিটের একটা ঘরের লেখা (তারিখ হলে ঢাকা সময়ে yyyy-MM-dd, সময়ের জন্য p_time = true দিলে HH24:MI)
create or replace function public.gas_cell_text(v jsonb, p_time boolean default false) returns text
language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then ''
    when jsonb_typeof(v) = 'object' and v ? '$d' then
      to_char(((v ->> '$d')::timestamptz) at time zone 'Asia/Dhaka', case when p_time then 'HH24:MI' else 'YYYY-MM-DD' end)
    else trim(v #>> '{}') end;
$$;

-- হাজিরার রিমাইন্ডার (v6): Attendance অ্যাপের শিট থেকে পড়ে (ইঞ্জিন)
create or replace function public.scs_attendance_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare d text; now_min int; wd int; v_in text; v_out text; in_min int; out_min int; hol text;
  rin public.notif_rules; rout public.notif_rules; n int := 0; c int; recs jsonb; settings jsonb;
begin
  d := to_char(now() at time zone 'Asia/Dhaka', 'YYYY-MM-DD');
  now_min := extract(hour from now() at time zone 'Asia/Dhaka')::int * 60 + extract(minute from now() at time zone 'Asia/Dhaka')::int;
  wd := extract(dow from now() at time zone 'Asia/Dhaka')::int;
  if wd = 5 then return 0; end if;
  select data into settings from public.gas_sheets where app_key = 'attendance' and name = 'Settings';
  select data into recs from public.gas_sheets where app_key = 'attendance' and name = 'Attendance';
  select string_agg(case when lower(public.gas_cell_text(r -> 0)) = 'holidays' then public.gas_cell_text(r -> 1) end, ',') ,
         max(case when public.gas_cell_text(r -> 0) = 'officeInTime' then public.gas_cell_text(r -> 1, true) end),
         max(case when public.gas_cell_text(r -> 0) = 'officeOutTime' then public.gas_cell_text(r -> 1, true) end)
    into hol, v_in, v_out
  from jsonb_array_elements(coalesce(settings, '[]'::jsonb)) r;
  if position(d in coalesce(hol, '')) > 0 then return 0; end if;
  v_in := coalesce(nullif(v_in, ''), '09:00'); v_out := coalesce(nullif(v_out, ''), '17:00');
  in_min := public.scs_time_min(v_in); out_min := public.scs_time_min(v_out);
  select * into rin from public.notif_rules where event_key = 'attendance.clock_in_reminder';
  select * into rout from public.notif_rules where event_key = 'attendance.clock_out_reminder';

  -- আজকের হাজিরা: EmpID (কলাম ২), Date (৩), Type (৪)
  create temp table if not exists scs_today_att (emp text, typ text) on commit drop;
  delete from scs_today_att;
  insert into scs_today_att
  select lower(public.gas_cell_text(r -> 1)), public.gas_cell_text(r -> 3)
  from jsonb_array_elements(coalesce(recs, '[]'::jsonb)) r
  where public.gas_cell_text(r -> 2) = d;

  if in_min is not null and coalesce(rin.enabled, true) then
    in_min := in_min + coalesce(nullif(rin.options ->> 'offset', '')::int, 0);
    if now_min >= in_min and now_min < in_min + 20 and not exists (select 1 from public.notif_sent where k = 'in:' || d) then
      insert into public.notif_sent (k) values ('in:' || d) on conflict do nothing;
      insert into public.notifications (user_id, app_key, title, body, url)
      select p.id, 'attendance', 'Time to Clock IN ⏰ / ক্লক ইন করুন',
             'Office starts at ' || v_in || '. Please give your attendance now. / অফিস শুরু ' || v_in || '। এখনই হাজিরা দিন।', '/apps/attendance/'
      from public.profiles p
      where p.status = 'active' and p.is_employee and p.employee_id is not null
        and (p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = 'attendance'))
        and not exists (select 1 from scs_today_att t where t.emp = lower(p.employee_id) and t.typ ilike 'clock in%')
        and not public.scs_on_leave(p.employee_id, d);
      get diagnostics c = row_count; n := n + c;
    end if;
  end if;
  if out_min is not null and coalesce(rout.enabled, true) then
    out_min := out_min + coalesce(nullif(rout.options ->> 'offset', '')::int, 0);
    if now_min >= out_min and now_min < out_min + 20 and not exists (select 1 from public.notif_sent where k = 'out:' || d) then
      insert into public.notif_sent (k) values ('out:' || d) on conflict do nothing;
      insert into public.notifications (user_id, app_key, title, body, url)
      select p.id, 'attendance', 'Time to Clock OUT 🏁 / ক্লক আউট করুন',
             'Office ends at ' || v_out || '. Do not forget to Clock OUT. / অফিস শেষ ' || v_out || '। ক্লক আউট দিতে ভুলবেন না।', '/apps/attendance/'
      from public.profiles p
      where p.status = 'active' and p.is_employee and p.employee_id is not null
        and (p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = 'attendance'))
        and exists (select 1 from scs_today_att t where t.emp = lower(p.employee_id) and t.typ ilike 'clock in%')
        and not exists (select 1 from scs_today_att t where t.emp = lower(p.employee_id) and t.typ ilike 'clock out%');
      get diagnostics c = row_count; n := n + c;
    end if;
  end if;
  delete from public.notif_sent where at < now() - interval '10 days';
  if n > 0 then perform public.scs_push_kick(); end if;
  return n;
end $$;
revoke execute on function public.scs_attendance_reminders() from public, anon;

-- নতুন নোটিফিকেশন নিয়ম (ইঞ্জিনের অ্যাপগুলোর জন্য) — Admin Console > Notifications & Log থেকে বদলানো যায়
insert into public.notif_rules (event_key, app_key, label, label_bn, enabled, audience, options, sort_order) values
  ('attendance.clock_in', 'attendance', 'Someone clocked in / out (to app admins)', 'কেউ হাজিরা দিয়েছে (অ্যাপের Admin কে)', false, 'app_admins', '{}', 32)
on conflict (event_key) do update set app_key = excluded.app_key, label = excluded.label, label_bn = excluded.label_bn, sort_order = excluded.sort_order;

-- বর্তমান অনুমোদিত এমপ্লয়িদের Leave অ্যাপে যোগ করা
update public.profiles set is_employee = is_employee where status = 'active';

-- =====================================================================
--  14. ডাটা একবারই থাকে (v8)
--  প্রতিটা অ্যাপের ডাটা gas_sheets এ একবারই থাকে; সম্পর্কিত অ্যাপ অনুমতি নিয়ে সরাসরি সেটাই পড়ে (gas_links):
--    Report      -> Chemical Order এর "SCS Order"   (শুধু পড়ে)
--    Report      -> Attendance                        (শুধু পড়ে)
--    Attendance  -> Report এর "Employee Attendance"   (মাসিক সামারি লেখে)
--  v7 এর কপি-ট্রিগার সরানো হলো (একই ডাটা দুবার রাখার দরকার নেই)। chem_orders, att_* ইত্যাদি পুরনো টেবিল আর ব্যবহার হয় না।
-- =====================================================================
drop trigger if exists scs_gas_mirror on public.gas_sheets;
drop function if exists public.scs_gas_mirror_trg();
drop function if exists public.scs_mirror_orders(jsonb);
drop function if exists public.scs_mirror_att_records(jsonb);
drop function if exists public.scs_mirror_att_employees(jsonb);
drop function if exists public.scs_mirror_att_summary(jsonb);
drop function if exists public.gas_header_map(jsonb, text);

-- Leave অ্যাপ (v8 থেকে ইঞ্জিনে): আজ কেউ অনুমোদিত ছুটিতে আছে কি না ("Leave Applications" শিট; পুরনো টেবিলও দেখে)
create or replace function public.scs_on_leave(p_emp text, p_day text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.gas_sheets s, jsonb_array_elements(s.data) r
    where s.app_key = 'leave' and s.name = 'Leave Applications' and jsonb_typeof(r) = 'array'
      and lower(public.gas_cell_text(r -> 2)) = lower(p_emp)
      and public.gas_cell_text(r -> 12) = 'Approved'
      and public.gas_cell_text(r -> 6) <= p_day and public.gas_cell_text(r -> 7) >= p_day
  ) or exists (
    select 1 from public.leave_applications l
    where l.emp_id = p_emp and l.status = 'Approved' and l.from_date <= p_day and l.to_date >= p_day
  );
$$;
revoke execute on function public.scs_on_leave(text, text) from public, anon;
-- =====================================================================
--  15. ধাপ ২ এর অ্যাপ (v9): SCS Daily Expense (ইঞ্জিনে)
-- =====================================================================
insert into public.apps (key, name, name_bn, description, path, icon, color, sort_order) values
  ('daily-expense', 'SCS Daily Expense', 'এসসিএস ডেইলি এক্সপেন্স', 'Daily expense vouchers, approval, print & backup', '/apps/daily-expense/', '💸', '#ea580c', 5)
on conflict (key) do nothing;
insert into public.app_pins (app_key) select key from public.apps on conflict (app_key) do nothing;
insert into public.notif_rules (event_key, app_key, label, label_bn, enabled, audience, options, sort_order) values
  ('daily-expense.submitted', 'daily-expense', 'Expense voucher submitted (to app admins)', 'খরচের ভাউচার সাবমিট (অ্যাপের Admin কে)', true, 'app_admins', '{}', 40),
  ('daily-expense.decision',  'daily-expense', 'Voucher approved / sent back (to employee)', 'ভাউচার অ্যাপ্রুভ / ফেরত (কর্মীকে)',       true, 'person',     '{}', 41)
on conflict (event_key) do update set app_key = excluded.app_key, label = excluded.label, label_bn = excluded.label_bn, sort_order = excluded.sort_order;

-- ধাপ ২ (v10): Requisition, Worker Attendance & Wage, Collection (ইঞ্জিনে)
insert into public.apps (key, name, name_bn, description, path, icon, color, sort_order) values
  ('requisition',       'SCS Requisition',               'এসসিএস রিকুইজিশন',            'Material requisition, challan PDF, delivery & backup', '/apps/requisition/',       '📋', '#0d9488', 6),
  ('worker-attendance', 'SCS Worker Attendance & Wage',  'এসসিএস লেবার হাজিরা ও মজুরি', 'Labour attendance, wage, payments & dues',             '/apps/worker-attendance/', '👷', '#ca8a04', 7),
  ('collection',        'SCS Collection',                'এসসিএস কালেকশন',              'Bills, collections, money movement & accounts',        '/apps/collection/',        '💰', '#16a34a', 8)
on conflict (key) do nothing;
insert into public.app_pins (app_key) select key from public.apps on conflict (app_key) do nothing;
insert into public.notif_rules (event_key, app_key, label, label_bn, enabled, audience, options, sort_order) values
  ('requisition.new_requisition', 'requisition', 'New requisition (to app admins)', 'নতুন রিকুইজিশন (অ্যাপের Admin কে)', true, 'app_admins', '{}', 45)
on conflict (event_key) do update set app_key = excluded.app_key, label = excluded.label, label_bn = excluded.label_bn, sort_order = excluded.sort_order;-- =====================================================================
--  16. ভিজিটর লিংক (v11): লগইন ছাড়া শুধু দেখা — এখন শুধু Worker Attendance & Wage
--  লিংকের টোকেন (আর পিন দেওয়া থাকলে পিন) ডাটাবেসেই যাচাই হয়; ঠিক হলে শুধু সেই অ্যাপের ডাটা দেয়।
--  ভিজিটর কিছুই লিখতে পারে না (অ্যাপ ব্রাউজারে শুধু দেখার জন্য চলে)।
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;
create or replace function public.gas_visitor_data(p_app text, p_token text, p_pin text default '')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_tok text; v_en text; v_hash text; v_sheets jsonb; v_props jsonb;
begin
  if p_app is distinct from 'worker-attendance' then return jsonb_build_object('ok', false); end if;
  select max(case when key = 'VISITOR_TOKEN' then value end), max(case when key = 'VISITOR_ENABLED' then value end),
         max(case when key = 'VISITOR_PIN_HASH' then value end)
    into v_tok, v_en, v_hash
  from public.gas_props where app_key = p_app and scope = 'script';
  if coalesce(v_en, '') <> 'true' or coalesce(v_tok, '') = '' or coalesce(p_token, '') <> v_tok then
    perform pg_sleep(0.4);
    return jsonb_build_object('ok', false);
  end if;
  if coalesce(v_hash, '') <> '' and encode(extensions.digest('scs-visitor|' || coalesce(p_pin, ''), 'sha256'), 'hex') <> v_hash then
    if coalesce(p_pin, '') <> '' then perform pg_sleep(0.8); end if;     -- ভুল পিনে দেরি (অনুমান করে পিন বের করা কঠিন)
    return jsonb_build_object('ok', false, 'pin', true, 'props', jsonb_build_array(
      jsonb_build_object('scope', 'script', 'key', 'VISITOR_TOKEN', 'value', v_tok),
      jsonb_build_object('scope', 'script', 'key', 'VISITOR_ENABLED', 'value', 'true'),
      jsonb_build_object('scope', 'script', 'key', 'VISITOR_PIN_HASH', 'value', 'required')));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'idx', idx, 'data', data)), '[]'::jsonb) into v_sheets
  from public.gas_sheets where app_key = p_app;
  select coalesce(jsonb_agg(jsonb_build_object('scope', scope, 'key', key, 'value', value)), '[]'::jsonb) into v_props
  from public.gas_props where app_key = p_app and scope = 'script'
    and key !~* '(ADMIN_PIN|USER_PIN|SECRET|PASSWORD|API_?KEY|AUTO_BACKUP)';
  return jsonb_build_object('ok', true, 'sheets', v_sheets, 'props', v_props);
end $$;
revoke execute on function public.gas_visitor_data(text, text, text) from public;
grant execute on function public.gas_visitor_data(text, text, text) to anon, authenticated;
-- =====================================================================
--  17. টোটাল ব্যাকআপ (v11): লাইফটাইম / বছর / মাস / তারিখ থেকে তারিখ + নিরাপদ রিসেট
-- =====================================================================
drop function if exists public.scs_backup_snapshot();
create or replace function public.scs_backup_snapshot(p_from date default null, p_to date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v jsonb; tbls jsonb := '{}'::jsonb; cnt jsonb := '{}'::jsonb; col text; life boolean := p_from is null and p_to is null;
begin
  if auth.uid() is not null and not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  for r in select tablename from pg_tables where schemaname = 'public' and tablename <> all (public.scs_backup_excluded()) order by tablename loop
    col := null;
    if not life then
      -- সময়ের কলাম থাকলে সেই সময়ের সারি; না থাকলে (সেটিং, অ্যাকাউন্ট, অ্যাপের শিট) পুরোটা
      select c.column_name into col from information_schema.columns c
       where c.table_schema = 'public' and c.table_name = r.tablename and c.column_name in ('created_at', 'at')
         and r.tablename not in ('profiles', 'apps', 'app_access', 'app_pins', 'sys_settings', 'notif_rules', 'gas_sheets', 'gas_props', 'gas_links', 'gas_aliases')
       order by case c.column_name when 'created_at' then 1 else 2 end limit 1;
    end if;
    if col is null then
      execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t', r.tablename) into v;
    else
      execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t where (t.%I at time zone ''Asia/Dhaka'')::date between $1 and $2',
        r.tablename, col) into v using coalesce(p_from, date '1900-01-01'), coalesce(p_to, date '2999-12-31');
    end if;
    tbls := tbls || jsonb_build_object(r.tablename, v);
    cnt := cnt || jsonb_build_object(r.tablename, jsonb_array_length(v));
  end loop;
  -- রিসেটের আগে লাইফটাইম ব্যাকআপ বাধ্যতামূলক: কখন নেওয়া হলো মনে রাখা
  if life and auth.uid() is not null then
    insert into public.sys_settings (key, value, updated_at, updated_by) values ('last_full_backup', to_jsonb(now()), now(), auth.uid())
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  end if;
  return jsonb_build_object('format', 'scs-management-backup', 'version', 2, 'created_at', now(),
    'scope', case when life then 'lifetime' else 'period' end, 'from', p_from, 'to', p_to,
    'note', 'Restore: SCS Management > Admin Console > Backup > Restore from file. Period backups contain only the rows created in that period (app sheets & settings are always complete). Storage files (photos, PDFs) are not inside this file.',
    'counts', cnt, 'tables', tbls);
end $$;
revoke execute on function public.scs_backup_snapshot(date, date) from public, anon;

-- সব অ্যাপের সব ডাটা মুছে ফেলা (অ্যাকাউন্ট, অ্যাপ, পিন, সেটিং থাকে)
-- শর্ত: Super Admin + গত ৬০ মিনিটে লাইফটাইম ব্যাকআপ + ইমেইলে পাওয়া কোড + নিশ্চিতকরণ বাক্য
create or replace function public.scs_reset_all(p_code text, p_phrase text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s text; j jsonb; last_bk timestamptz; t text; n int; res jsonb := '{}'::jsonb;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if coalesce(p_phrase, '') <> 'ERASE ALL DATA' then raise exception 'Type the confirmation text exactly: ERASE ALL DATA'; end if;
  select (value #>> '{}')::timestamptz into last_bk from public.sys_settings where key = 'last_full_backup';
  if last_bk is null or last_bk < now() - interval '60 minutes' then
    raise exception 'Take a LIFETIME backup first (within the last 60 minutes). / আগে লাইফটাইম ব্যাকআপ নিন (গত ৬০ মিনিটের মধ্যে)।';
  end if;
  select value into s from public.sys_secrets where key = 'reset_code' for update;
  if s is null then raise exception 'Request the email code first. / আগে ইমেইলে কোড নিন।'; end if;
  j := s::jsonb;
  if (j ->> 'exp')::bigint < (extract(epoch from now()) * 1000)::bigint then
    delete from public.sys_secrets where key = 'reset_code';
    raise exception 'The code has expired. Request a new one. / কোডের মেয়াদ শেষ, নতুন কোড নিন।';
  end if;
  if coalesce((j ->> 'tries')::int, 0) >= 5 then
    delete from public.sys_secrets where key = 'reset_code';
    raise exception 'Too many wrong codes. Request a new one. / অনেকবার ভুল কোড, নতুন কোড নিন।';
  end if;
  if encode(extensions.digest('scs-reset|' || coalesce(trim(p_code), ''), 'sha256'), 'hex') <> j ->> 'hash' then
    update public.sys_secrets set value = jsonb_set(j, '{tries}', to_jsonb(coalesce((j ->> 'tries')::int, 0) + 1))::text where key = 'reset_code';
    return jsonb_build_object('ok', false, 'error', 'Wrong code. / ভুল কোড।');
  end if;
  delete from public.sys_secrets where key = 'reset_code';

  perform set_config('scs.restoring', '1', true);
  foreach t in array array['gas_sheets', 'gas_props', 'gas_files', 'gas_versions', 'gas_locks',
    'chem_orders', 'chem_products', 'chem_sellers', 'chem_settings', 'att_records', 'att_employees', 'att_settings', 'att_monthly_summary',
    'mr_month_data', 'mr_settings', 'leave_applications', 'leave_employees', 'leave_settings', 'leave_signatures',
    'notifications', 'notif_sent'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where true', t);
      get diagnostics n = row_count;
      res := res || jsonb_build_object(t, n);
    end if;
  end loop;
  perform set_config('scs.restoring', '0', true);
  insert into public.audit_log (app_key, table_name, entity, record_ref, action, old_data, new_data, changed_fields, actor_id, actor_email, actor_name)
  select 'core', 'all', 'System', 'FULL RESET', 'Delete', res, null, null, auth.uid(), p.email, p.full_name from public.profiles p where p.id = auth.uid();
  delete from public.sys_settings where key = 'last_full_backup';
  return jsonb_build_object('ok', true, 'deleted', res);
end $$;
revoke execute on function public.scs_reset_all(text, text) from public, anon;
-- =====================================================================
--  18. অ্যাকাউন্টের নিরাপত্তা, নোটিফিকেশন পছন্দ, অ্যাপের ক্রম (v12)
-- =====================================================================
alter table public.profiles add column if not exists must_change_pw boolean not null default false;
alter table public.profiles add column if not exists left_at timestamptz;

-- প্রোফাইল পাহারা: ইউজার শুধু নাম, ছবি আর (প্রথমবার) মোবাইল দিতে পারে
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not public.is_super_admin() then
      new.status := old.status;
      new.is_super_admin := old.is_super_admin;
      new.approved_by := old.approved_by;
      new.approved_at := old.approved_at;
      new.email := old.email;
      new.designation := old.designation;
      new.department := old.department;
      new.is_employee := old.is_employee;
      new.employee_id := old.employee_id;                      -- Employee ID শুধু Super Admin
      new.left_at := old.left_at;
      if coalesce(current_setting('scs.sys', true), '') <> '1' then
        new.must_change_pw := old.must_change_pw;
        -- মোবাইল একবার দেওয়া হলে বদলাতে অনুরোধ লাগে (Super Admin অনুমোদন দেন)
        if coalesce(old.phone, '') <> '' and new.phone is distinct from old.phone then new.phone := old.phone; end if;
      end if;
    elsif new.status = 'active' and old.status <> 'active' then
      new.approved_by := auth.uid(); new.approved_at := now();
    end if;
    new.updated_by := auth.uid();
  end if;
  new.employee_id := nullif(trim(coalesce(new.employee_id, '')), '');
  if new.status = 'active' and new.is_employee and new.employee_id is null then
    new.employee_id := public.scs_next_emp_id();
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ডকুমেন্ট: ইউজার আপলোড ও ডাউনলোড করতে পারে, মুছতে পারেন শুধু Super Admin
drop policy if exists scs_doc_delete on public.profile_documents;
create policy scs_doc_delete on public.profile_documents for delete to authenticated using (public.is_super_admin());
drop policy if exists scs_prof_files_delete on storage.objects;
create policy scs_prof_files_delete on storage.objects for delete to authenticated using (bucket_id = 'scs-files' and
  (storage.foldername(name))[1] = 'profiles' and public.is_super_admin());

-- মোবাইল / ইমেইল বদলের অনুরোধ
create table if not exists public.profile_change_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  field       text not null check (field in ('phone', 'email')),
  old_value   text,
  new_value   text not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at  timestamptz not null default now(),
  decided_by  uuid,
  decided_at  timestamptz,
  note        text default ''
);
alter table public.profile_change_requests enable row level security;
drop policy if exists scs_pcr_read on public.profile_change_requests;
create policy scs_pcr_read on public.profile_change_requests for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

create or replace function public.scs_request_change(p_field text, p_value text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := trim(coalesce(p_value, '')); old text; me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Login required'; end if;
  if p_field = 'phone' then
    v := regexp_replace(v, '[\s-]', '', 'g');
    if v !~ '^(\+?88)?01[3-9]\d{8}$' then raise exception 'Enter a valid mobile number (01XXXXXXXXX). / সঠিক মোবাইল নম্বর দিন।'; end if;
    v := right(v, 11);
    if exists (select 1 from public.profiles where id <> me.id and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 11) = v) then
      raise exception 'This mobile number is already used by another account. / এই নম্বর অন্য অ্যাকাউন্টে আছে।';
    end if;
    old := me.phone;
  elsif p_field = 'email' then
    v := lower(v);
    if v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email. / সঠিক ইমেইল দিন।'; end if;
    if exists (select 1 from auth.users where lower(email) = v and id <> me.id) then raise exception 'This email is already used. / এই ইমেইল অন্য অ্যাকাউন্টে আছে।'; end if;
    old := me.email;
  else raise exception 'Unknown field';
  end if;
  update public.profile_change_requests set status = 'cancelled', decided_at = now() where user_id = me.id and field = p_field and status = 'pending';
  insert into public.profile_change_requests (user_id, field, old_value, new_value) values (me.id, p_field, old, v);
  perform public.scs_notify_event('core.change_request', 'Change request · ' || coalesce(nullif(me.full_name, ''), me.email),
    case p_field when 'phone' then 'Mobile: ' else 'Email: ' end || coalesce(old, '—') || ' → ' || v, '/admin.html', null, me.id);
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.scs_request_change(text, text) from public, anon;

-- Super Admin: অনুরোধ অনুমোদন / বাতিল (মোবাইল এখানেই বদলায়; ইমেইল বদলায় সার্ভার ফাংশন, তারপর এটা ডাকে)
create or replace function public.scs_decide_change(p_id bigint, p_approve boolean, p_note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.profile_change_requests;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  select * into r from public.profile_change_requests where id = p_id and status = 'pending' for update;
  if r.id is null then raise exception 'Request not found or already decided.'; end if;
  if p_approve and r.field = 'phone' then update public.profiles set phone = r.new_value where id = r.user_id; end if;
  if p_approve and r.field = 'email' then update public.profiles set email = r.new_value where id = r.user_id; end if;
  update public.profile_change_requests set status = case when p_approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now(), note = coalesce(p_note, '') where id = r.id;
  perform public.scs_notify_event('core.change_decided',
    case when p_approve then 'Your change was approved ✅' else 'Your change was not approved' end,
    case r.field when 'phone' then 'Mobile: ' else 'Email: ' end || r.new_value || case when coalesce(p_note, '') <> '' then ' · ' || p_note else '' end,
    '/profile.html', r.user_id, null);
  return jsonb_build_object('ok', true, 'field', r.field, 'user_id', r.user_id, 'value', r.new_value);
end $$;
revoke execute on function public.scs_decide_change(bigint, boolean, text) from public, anon;

-- পাসওয়ার্ড বদলানোর পর: "পাসওয়ার্ড বদলাতে হবে" চিহ্ন সরানো + নিরাপত্তা নোটিফিকেশন
create or replace function public.scs_password_changed() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('scs.sys', '1', true);
  update public.profiles set must_change_pw = false where id = auth.uid();
  perform set_config('scs.sys', '0', true);
  perform public.scs_notify_event('core.password_changed', 'Your password was changed 🔐',
    'If this was not you, contact the admin at once. / আপনি না করে থাকলে সাথে সাথে অ্যাডমিনকে জানান।', '/profile.html', auth.uid(), null);
end $$;
revoke execute on function public.scs_password_changed() from public, anon;

-- অ্যাকাউন্ট বন্ধ: "চাকরি ছেড়েছে — ইতিহাস থাকবে"
create or replace function public.scs_user_left(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_user = auth.uid() then raise exception 'You cannot do this to your own account.'; end if;
  update public.profiles set status = 'disabled', is_super_admin = false, left_at = now() where id = p_user;
  delete from public.app_access where user_id = p_user;
  delete from public.push_subscriptions where user_id = p_user;
  delete from public.notifications where user_id = p_user;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.scs_user_left(uuid) from public, anon;

-- নোটিফিকেশন পছন্দ: ইউজার নিজে চালু/বন্ধ করে; অ্যাডমিন কারও জন্য বন্ধ করে দিতে পারেন (admin_off)
create table if not exists public.notif_prefs (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  enabled   boolean not null default true,
  admin_off boolean not null default false,
  updated_at timestamptz default now(),
  primary key (user_id, event_key)
);
alter table public.notif_prefs enable row level security;
drop policy if exists scs_np_read on public.notif_prefs;
drop policy if exists scs_np_write on public.notif_prefs;
create policy scs_np_read  on public.notif_prefs for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy scs_np_write on public.notif_prefs for all to authenticated using (user_id = auth.uid() or public.is_super_admin()) with check (user_id = auth.uid() or public.is_super_admin());
create or replace function public.notif_prefs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    new.admin_off := case when tg_op = 'UPDATE' then old.admin_off else false end;   -- ইউজার অ্যাডমিনের বন্ধ খুলতে পারে না
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists notif_prefs_guard on public.notif_prefs;
create trigger notif_prefs_guard before insert or update on public.notif_prefs for each row execute function public.notif_prefs_guard();

create or replace function public.scs_notify_event(p_event text, p_title text, p_body text, p_url text,
                                                   p_target uuid default null, p_exclude uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare r public.notif_rules; v_app text; v_aud text; n int := 0;
begin
  select * into r from public.notif_rules where event_key = p_event;
  if found and not r.enabled then return 0; end if;
  v_app := coalesce(r.app_key, split_part(p_event, '.', 1));
  v_aud := coalesce(r.audience, 'app_users');
  insert into public.notifications (user_id, app_key, title, body, url)
  select p.id, v_app, p_title, coalesce(p_body, ''), coalesce(p_url, '/')
  from public.profiles p
  where p.status = 'active' and p.id is distinct from p_exclude and (
    case v_aud
      when 'person'       then p.id = p_target
      when 'super_admins' then p.is_super_admin
      when 'app_admins'   then p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = v_app and a.role = 'admin')
      when 'person_admins' then p.id = p_target or p.is_super_admin
                               or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = v_app and a.role = 'admin')
      else p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = v_app)
    end)
    -- নিজের বন্ধ করা বা অ্যাডমিনের বন্ধ করা নোটিফিকেশন যায় না (নিরাপত্তার নোটিফিকেশন সবসময় যায়)
    and (p_event in ('core.password_changed', 'core.account_approved') or not exists (
      select 1 from public.notif_prefs np where np.user_id = p.id and np.event_key = p_event and (not np.enabled or np.admin_off)));
  get diagnostics n = row_count;
  if n > 0 then perform public.scs_push_kick(); end if;
  return n;
end $$;
revoke execute on function public.scs_notify_event(text, text, text, text, uuid, uuid) from public, anon, authenticated;

insert into public.notif_rules (event_key, app_key, label, label_bn, enabled, audience, options, sort_order) values
  ('core.change_request',   'core', 'Mobile / email change request (to Super Admins)', 'মোবাইল / ইমেইল বদলের অনুরোধ (Super Admin কে)', true, 'super_admins', '{}', 3),
  ('core.change_decided',   'core', 'Change request approved / rejected (to the person)', 'বদলের অনুরোধের সিদ্ধান্ত (সংশ্লিষ্ট ব্যক্তিকে)', true, 'person', '{}', 4),
  ('core.password_changed', 'core', 'Password changed — security alert (to the person)', 'পাসওয়ার্ড বদলানো হয়েছে — নিরাপত্তা সতর্কতা (সংশ্লিষ্ট ব্যক্তিকে)', true, 'person', '{}', 5)
on conflict (event_key) do update set app_key = excluded.app_key, label = excluded.label, label_bn = excluded.label_bn, sort_order = excluded.sort_order;

-- অ্যাপের ক্রম (Super Admin)
create or replace function public.scs_apps_reorder(p_keys text[]) returns void
language plpgsql security definer set search_path = public as $$
declare i int;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    update public.apps set sort_order = i where key = p_keys[i];
  end loop;
end $$;
revoke execute on function public.scs_apps_reorder(text[]) from public, anon;
-- =====================================================================
--  19. কোম্পানির লাইব্রেরি (v13): প্যাড, সিল, সিগনেচার, লোগো — একবার আপলোড, সব অ্যাপে ব্যবহার
--  ফাইল থাকে Storage এর scs-public/brand/ এ (সরাসরি লিংক, Google Drive লাগে না)
-- =====================================================================
create table if not exists public.brand_assets (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('pad', 'seal', 'signature', 'logo', 'other')),
  title      text not null default '',
  url        text not null,
  path       text not null default '',
  mime       text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid
);
alter table public.brand_assets enable row level security;
drop policy if exists scs_ba_read on public.brand_assets;
drop policy if exists scs_ba_write on public.brand_assets;
create policy scs_ba_read  on public.brand_assets for select to authenticated using (true);
create policy scs_ba_write on public.brand_assets for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
select public.scs_attach_triggers('brand_assets', 'core', 'Company library', 'title', false);
-- =====================================================================
--  20. ধাপ ৩ এর অ্যাপ (v14): Central Store, Projects, Quotation, Workspace (ইঞ্জিনে)
-- =====================================================================
insert into public.apps (key, name, name_bn, description, path, icon, color, sort_order) values
  ('central-store', 'SCS Central Store', 'এসসিএস সেন্ট্রাল স্টোর',  'Materials & equipment stock in/out, ledger, reports', '/apps/central-store/', '🏬', '#0284c7', 9),
  ('projects',      'SCS Projects',      'এসসিএস প্রজেক্টস',       'Projects, labour, dues, bills & measurements',        '/apps/projects/',      '🏗️', '#9333ea', 10),
  ('quotation',     'SCS Quotation',     'এসসিএস কোটেশন',         'Quotations on letterhead, PDF, Word & archive',       '/apps/quotation/',     '📝', '#be185d', 11),
  ('workspace',     'SCS Workspace',     'এসসিএস ওয়ার্কস্পেস',      'Letters & documents on letterhead, folders & archive', '/apps/workspace/',     '🗂️', '#475569', 12)
on conflict (key) do nothing;
insert into public.app_pins (app_key) select key from public.apps on conflict (app_key) do nothing;
-- =====================================================================
--  21. v15: বড় ডাটা (টুকরো করে রাখা), সব অ্যাপে একই ব্যাকআপ · রিস্টোর · রিসেট,
--      কাজের নোটিফিকেশনে "পরে মনে করিয়ে দিন", হাজিরার দ্বিতীয় রিমাইন্ডার
-- =====================================================================

-- 21.1 বড় শিট: ১.৫ MB এর বেশি হলে রো গুলো কয়েক MB এর টুকরো হয়ে gas_chunks এ থাকে
--      (একটা অনুরোধে ৭৮ MB পাঠাতে হয় না; একটা জিনিস বদলালে শুধু সেই টুকরোটা যায়)
alter table public.gas_sheets add column if not exists chunks text[];
create table if not exists public.gas_chunks (
  app_key    text not null,
  name       text not null,
  h          text not null,
  data       jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (app_key, name, h)
);
alter table public.gas_chunks enable row level security;
drop policy if exists scs_gc_read on public.gas_chunks;
create policy scs_gc_read on public.gas_chunks for select to authenticated using (public.gas_can(app_key));

create or replace function public.gas_put_chunk(p_app text, p_name text, p_h text, p_data jsonb, p_via text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_app(p_app) and (p_via is null or not public.gas_can(p_app, true, p_via)) then raise exception 'No access to this app'; end if;
  if jsonb_typeof(p_data) is distinct from 'array' then raise exception 'Bad sheet part'; end if;
  insert into public.gas_chunks (app_key, name, h, data) values (p_app, p_name, p_h, p_data)
  on conflict (app_key, name, h) do update set created_at = now();
end $$;
revoke execute on function public.gas_put_chunk(text, text, text, jsonb, text) from public, anon;

-- পুরো শিট (টুকরো থাকলে জোড়া লাগিয়ে) — শুধু ডাটাবেসের ভেতরের ফাংশনগুলোর জন্য
create or replace function public.gas_sheet_data(p_app text, p_name text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when s.chunks is null or cardinality(s.chunks) = 0 then s.data
    else (select coalesce(jsonb_agg(r.v order by c.o, r.o), '[]'::jsonb)
          from unnest(s.chunks) with ordinality as c(hh, o)
          join public.gas_chunks g on g.app_key = s.app_key and g.name = s.name and g.h = c.hh
          cross join lateral jsonb_array_elements(g.data) with ordinality as r(v, o)) end
  from public.gas_sheets s where s.app_key = p_app and s.name = p_name;
$$;
revoke execute on function public.gas_sheet_data(text, text) from public, anon, authenticated;

-- আর কাজে লাগে না এমন টুকরো মোছা (১৫ মিনিটের পুরনো — চলমান সেভের টুকরো মোছে না)
create or replace function public.gas_chunks_gc(p_app text, p_name text) returns void
language sql security definer set search_path = public as $$
  delete from public.gas_chunks g where g.app_key = p_app and g.name = p_name and g.created_at < now() - interval '15 minutes'
    and not exists (select 1 from public.gas_sheets s where s.app_key = p_app and s.name = p_name and g.h = any (coalesce(s.chunks, '{}'::text[])));
$$;
revoke execute on function public.gas_chunks_gc(text, text) from public, anon, authenticated;

-- gas_commit: শিটে data না পাঠিয়ে chunks (টুকরোর তালিকা) পাঠানো যায়
create or replace function public.gas_commit(p_app text, p_sheets jsonb, p_props jsonb, p_audit jsonb, p_via text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s jsonb; p jsonb; a jsonb; cur bigint; out jsonb := '{}'::jsonb; v bigint; ch text[];
  v_uid uuid := auth.uid(); v_email text; v_name text;
begin
  if not public.has_app(p_app) then
    if p_via is null or not public.gas_can(p_app, true, p_via) then raise exception 'No access to this app'; end if;
    p_props := '[]'::jsonb;
  end if;
  for s in select * from jsonb_array_elements(coalesce(p_sheets, '[]'::jsonb)) loop
    select version into cur from public.gas_sheets where app_key = p_app and name = s ->> 'name' for update;
    if coalesce(cur, 0) <> coalesce((s ->> 'base')::bigint, 0) then
      raise exception 'SCS_CONFLICT %', s ->> 'name';
    end if;
    ch := null;
    if jsonb_typeof(s -> 'chunks') = 'array' then
      ch := array(select jsonb_array_elements_text(s -> 'chunks'));
      if exists (select 1 from unnest(ch) as x(hh) where not exists (
          select 1 from public.gas_chunks g where g.app_key = p_app and g.name = s ->> 'name' and g.h = x.hh)) then
        raise exception 'SCS_CONFLICT % (missing part)', s ->> 'name';
      end if;
    end if;
    if coalesce((s ->> 'deleted')::boolean, false) then
      delete from public.gas_sheets where app_key = p_app and name = s ->> 'name';
      delete from public.gas_chunks where app_key = p_app and name = s ->> 'name';
      v := coalesce(cur, 0) + 1;
    elsif cur is null then
      insert into public.gas_sheets (app_key, name, idx, data, meta, version, updated_by, chunks)
      values (p_app, s ->> 'name', coalesce((s ->> 'idx')::int, 0), case when ch is null then coalesce(s -> 'data', '[]'::jsonb) else '[]'::jsonb end,
              coalesce(s -> 'meta', '{}'::jsonb), 1, v_uid, ch);
      v := 1;
    else
      update public.gas_sheets set
        data = case when ch is not null then '[]'::jsonb else coalesce(s -> 'data', data) end,
        chunks = case when ch is not null then ch when s ? 'data' then null else chunks end,
        meta = coalesce(s -> 'meta', meta), idx = coalesce((s ->> 'idx')::int, idx), version = version + 1, updated_at = now(), updated_by = v_uid
      where app_key = p_app and name = s ->> 'name' returning version into v;
    end if;
    perform public.gas_chunks_gc(p_app, s ->> 'name');
    insert into public.gas_versions (app_key, name, version, updated_at, updated_by) values (p_app, s ->> 'name', v, now(), v_uid)
    on conflict (app_key, name) do update set version = excluded.version, updated_at = now(), updated_by = v_uid;
    out := out || jsonb_build_object(s ->> 'name', v);
  end loop;
  for p in select * from jsonb_array_elements(coalesce(p_props, '[]'::jsonb)) loop
    if (p ->> 'scope') <> 'script' and (p ->> 'scope') <> 'user:' || v_uid::text then continue; end if;
    if p -> 'value' is null or jsonb_typeof(p -> 'value') = 'null' then
      delete from public.gas_props where app_key = p_app and scope = p ->> 'scope' and key = p ->> 'key';
    else
      insert into public.gas_props (app_key, scope, key, value, updated_at, updated_by) values (p_app, p ->> 'scope', p ->> 'key', p ->> 'value', now(), v_uid)
      on conflict (app_key, scope, key) do update set value = excluded.value, updated_at = now(), updated_by = v_uid;
    end if;
  end loop;
  if jsonb_array_length(coalesce(p_props, '[]'::jsonb)) > 0 then
    insert into public.gas_versions (app_key, name, version, updated_at, updated_by) values (p_app, '#props', 1, now(), v_uid)
    on conflict (app_key, name) do update set version = public.gas_versions.version + 1, updated_at = now(), updated_by = v_uid;
  end if;
  if jsonb_array_length(coalesce(p_audit, '[]'::jsonb)) > 0 then
    select email, coalesce(nullif(full_name, ''), email) into v_email, v_name from public.profiles where id = v_uid;
    for a in select * from jsonb_array_elements(p_audit) limit 200 loop
      insert into public.audit_log (app_key, table_name, entity, record_ref, action, old_data, new_data, changed_fields, actor_id, actor_email, actor_name)
      values (p_app, 'sheet:' || coalesce(a ->> 'sheet', ''), coalesce(a ->> 'entity', a ->> 'sheet'), left(coalesce(a ->> 'ref', ''), 200),
              coalesce(a ->> 'action', 'Edit'), public.scs_mask_secrets(a -> 'before'), public.scs_mask_secrets(a -> 'after'),
              case when jsonb_typeof(a -> 'fields') = 'array' then array(select jsonb_array_elements_text(a -> 'fields')) else null end,
              v_uid, v_email, coalesce(v_name, 'System'));
    end loop;
  end if;
  return out;
end $$;
revoke execute on function public.gas_commit(text, jsonb, jsonb, jsonb, text) from public, anon;

-- শিট পড়ে এমন ডাটাবেস ফাংশনগুলো এখন টুকরো জোড়া লাগিয়ে পড়ে
create or replace function public.scs_on_leave(p_emp text, p_day text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(public.gas_sheet_data('leave', 'Leave Applications'), '[]'::jsonb)) r
    where jsonb_typeof(r) = 'array'
      and lower(public.gas_cell_text(r -> 2)) = lower(p_emp)
      and public.gas_cell_text(r -> 12) = 'Approved'
      and public.gas_cell_text(r -> 6) <= p_day and public.gas_cell_text(r -> 7) >= p_day
  ) or exists (
    select 1 from public.leave_applications l
    where l.emp_id = p_emp and l.status = 'Approved' and l.from_date <= p_day and l.to_date >= p_day
  );
$$;
revoke execute on function public.scs_on_leave(text, text) from public, anon;
-- সেই দিনের জন্য ছুটির আবেদন করা আছে (Approved বা অপেক্ষায়) — সেদিন হাজিরার রিমাইন্ডার যায় না
create or replace function public.scs_leave_applied(p_emp text, p_day text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(public.gas_sheet_data('leave', 'Leave Applications'), '[]'::jsonb)) r
    where jsonb_typeof(r) = 'array'
      and lower(public.gas_cell_text(r -> 2)) = lower(p_emp)
      and public.gas_cell_text(r -> 12) in ('Approved', 'Pending')
      and public.gas_cell_text(r -> 6) <= p_day and public.gas_cell_text(r -> 7) >= p_day
  ) or public.scs_on_leave(p_emp, p_day);
$$;
revoke execute on function public.scs_leave_applied(text, text) from public, anon;

create or replace function public.gas_visitor_data(p_app text, p_token text, p_pin text default '')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_tok text; v_en text; v_hash text; v_sheets jsonb; v_props jsonb;
begin
  if p_app is distinct from 'worker-attendance' then return jsonb_build_object('ok', false); end if;
  select max(case when key = 'VISITOR_TOKEN' then value end), max(case when key = 'VISITOR_ENABLED' then value end),
         max(case when key = 'VISITOR_PIN_HASH' then value end)
    into v_tok, v_en, v_hash
  from public.gas_props where app_key = p_app and scope = 'script';
  if coalesce(v_en, '') <> 'true' or coalesce(v_tok, '') = '' or coalesce(p_token, '') <> v_tok then
    perform pg_sleep(0.4);
    return jsonb_build_object('ok', false);
  end if;
  if coalesce(v_hash, '') <> '' and encode(extensions.digest('scs-visitor|' || coalesce(p_pin, ''), 'sha256'), 'hex') <> v_hash then
    if coalesce(p_pin, '') <> '' then perform pg_sleep(0.8); end if;
    return jsonb_build_object('ok', false, 'pin', true, 'props', jsonb_build_array(
      jsonb_build_object('scope', 'script', 'key', 'VISITOR_TOKEN', 'value', v_tok),
      jsonb_build_object('scope', 'script', 'key', 'VISITOR_ENABLED', 'value', 'true'),
      jsonb_build_object('scope', 'script', 'key', 'VISITOR_PIN_HASH', 'value', 'required')));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'idx', idx, 'data', public.gas_sheet_data(app_key, name))), '[]'::jsonb) into v_sheets
  from public.gas_sheets where app_key = p_app;
  select coalesce(jsonb_agg(jsonb_build_object('scope', scope, 'key', key, 'value', value)), '[]'::jsonb) into v_props
  from public.gas_props where app_key = p_app and scope = 'script'
    and key !~* '(ADMIN_PIN|USER_PIN|SECRET|PASSWORD|API_?KEY|AUTO_BACKUP)';
  return jsonb_build_object('ok', true, 'sheets', v_sheets, 'props', v_props);
end $$;
revoke execute on function public.gas_visitor_data(text, text, text) from public;
grant execute on function public.gas_visitor_data(text, text, text) to anon, authenticated;

-- 21.2 হাজিরার রিমাইন্ডার: অফিস শুরুর সময় একবার, ১০ মিনিট পরেও না দিলে আরেকবার।
--      সেদিনের জন্য ছুটির আবেদন (Approved বা অপেক্ষায়) থাকলে যায় না। শুক্রবার/ছুটির দিনে যায় না।
create or replace function public.scs_attendance_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare d text; now_min int; wd int; v_in text; v_out text; in_min int; out_min int; hol text;
  rin public.notif_rules; rout public.notif_rules; n int := 0; c int; recs jsonb; settings jsonb; v_k text; v_second boolean;
begin
  d := to_char(now() at time zone 'Asia/Dhaka', 'YYYY-MM-DD');
  now_min := extract(hour from now() at time zone 'Asia/Dhaka')::int * 60 + extract(minute from now() at time zone 'Asia/Dhaka')::int;
  wd := extract(dow from now() at time zone 'Asia/Dhaka')::int;
  if wd = 5 then return 0; end if;
  settings := public.gas_sheet_data('attendance', 'Settings');
  select string_agg(case when lower(public.gas_cell_text(r -> 0)) = 'holidays' then public.gas_cell_text(r -> 1) end, ','),
         max(case when public.gas_cell_text(r -> 0) = 'officeInTime' then public.gas_cell_text(r -> 1, true) end),
         max(case when public.gas_cell_text(r -> 0) = 'officeOutTime' then public.gas_cell_text(r -> 1, true) end)
    into hol, v_in, v_out
  from jsonb_array_elements(coalesce(settings, '[]'::jsonb)) r;
  if position(d in coalesce(hol, '')) > 0 then return 0; end if;
  v_in := coalesce(nullif(v_in, ''), '09:00'); v_out := coalesce(nullif(v_out, ''), '17:00');
  in_min := public.scs_time_min(v_in); out_min := public.scs_time_min(v_out);
  select * into rin from public.notif_rules where event_key = 'attendance.clock_in_reminder';
  select * into rout from public.notif_rules where event_key = 'attendance.clock_out_reminder';
  if in_min is not null and coalesce(rin.enabled, true) then
    in_min := in_min + coalesce(nullif(rin.options ->> 'offset', '')::int, 0);
    v_k := null;
    if now_min >= in_min and now_min < in_min + 10 and not exists (select 1 from public.notif_sent where k = 'in:' || d) then v_k := 'in:' || d; v_second := false;
    elsif now_min >= in_min + 10 and now_min < in_min + 30 and not exists (select 1 from public.notif_sent where k = 'in2:' || d) then v_k := 'in2:' || d; v_second := true;
    end if;
    if v_k is not null then
      insert into public.notif_sent (k) values (v_k) on conflict do nothing;
      recs := public.gas_sheet_data('attendance', 'Attendance');
      create temp table if not exists scs_today_att (emp text, typ text) on commit drop;
      delete from scs_today_att;
      insert into scs_today_att select lower(public.gas_cell_text(r -> 1)), public.gas_cell_text(r -> 3)
        from jsonb_array_elements(coalesce(recs, '[]'::jsonb)) r where public.gas_cell_text(r -> 2) = d;
      insert into public.notifications (user_id, app_key, title, body, url)
      select p.id, 'attendance',
             case when v_second then 'Reminder: you have not clocked in yet ⏰ / এখনো হাজিরা দেননি' else 'Time to Clock IN ⏰ / হাজিরা দিন' end,
             case when v_second then 'Office started at ' || v_in || '. Please give your attendance now. / অফিস শুরু হয়েছে ' || v_in || '-এ। এখনই হাজিরা দিন।'
                  else 'Office starts at ' || v_in || '. Please give your attendance. / অফিস শুরু ' || v_in || '। হাজিরা দিন।' end,
             '/apps/attendance/'
      from public.profiles p
      where p.status = 'active' and p.is_employee and p.employee_id is not null
        and (p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = 'attendance'))
        and not exists (select 1 from scs_today_att t where t.emp = lower(p.employee_id) and t.typ ilike 'clock in%')
        and not public.scs_leave_applied(p.employee_id, d)
        and not exists (select 1 from public.notif_prefs np where np.user_id = p.id and np.event_key = 'attendance.clock_in_reminder' and (not np.enabled or np.admin_off));
      get diagnostics c = row_count; n := n + c;
    end if;
  end if;
  if out_min is not null and coalesce(rout.enabled, true) then
    out_min := out_min + coalesce(nullif(rout.options ->> 'offset', '')::int, 0);
    if now_min >= out_min and now_min < out_min + 20 and not exists (select 1 from public.notif_sent where k = 'out:' || d) then
      insert into public.notif_sent (k) values ('out:' || d) on conflict do nothing;
      recs := public.gas_sheet_data('attendance', 'Attendance');
      create temp table if not exists scs_today_att (emp text, typ text) on commit drop;
      delete from scs_today_att;
      insert into scs_today_att select lower(public.gas_cell_text(r -> 1)), public.gas_cell_text(r -> 3)
        from jsonb_array_elements(coalesce(recs, '[]'::jsonb)) r where public.gas_cell_text(r -> 2) = d;
      insert into public.notifications (user_id, app_key, title, body, url)
      select p.id, 'attendance', 'Time to Clock OUT 🏁 / ক্লক আউট করুন',
             'Office ends at ' || v_out || '. Do not forget to Clock OUT. / অফিস শেষ ' || v_out || '। ক্লক আউট দিতে ভুলবেন না।', '/apps/attendance/'
      from public.profiles p
      where p.status = 'active' and p.is_employee and p.employee_id is not null
        and (p.is_super_admin or exists (select 1 from public.app_access a where a.user_id = p.id and a.app_key = 'attendance'))
        and exists (select 1 from scs_today_att t where t.emp = lower(p.employee_id) and t.typ ilike 'clock in%')
        and not exists (select 1 from scs_today_att t where t.emp = lower(p.employee_id) and t.typ ilike 'clock out%')
        and not exists (select 1 from public.notif_prefs np where np.user_id = p.id and np.event_key = 'attendance.clock_out_reminder' and (not np.enabled or np.admin_off));
      get diagnostics c = row_count; n := n + c;
    end if;
  end if;
  delete from public.notif_sent where at < now() - interval '10 days';
  if n > 0 then perform public.scs_push_kick(); end if;
  return n;
end $$;
revoke execute on function public.scs_attendance_reminders() from public, anon;

-- 21.3 কাজের নোটিফিকেশন (ছুটি/খরচ অনুমোদন ইত্যাদি): "এখনই খুলুন" / "পরে মনে করিয়ে দিন"
alter table public.notifications add column if not exists task jsonb;
create table if not exists public.notif_snooze (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  notif_id   bigint,
  app_key    text not null default 'core',
  title      text not null,
  url        text not null default '/',
  task       jsonb,
  due_at     timestamptz not null,
  auto       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_snooze_due on public.notif_snooze (due_at);
alter table public.notif_snooze enable row level security;
drop policy if exists scs_ns_read on public.notif_snooze;
create policy scs_ns_read on public.notif_snooze for select to authenticated using (user_id = auth.uid());

-- কাজটা এখনো বাকি কি না (শিটে খুঁজে দেখা যায় এমন হলে দেখে; না গেলে "বাকি" ধরে)
create or replace function public.scs_task_pending(p_app text, p_task jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare kc int; sc int; st text;
begin
  if p_task is null or coalesce(p_task ->> 'sheet', '') = '' or coalesce(p_task ->> 'key', '') = '' then return true; end if;
  kc := coalesce((p_task ->> 'key_col')::int, 0); sc := coalesce((p_task ->> 'status_col')::int, -1);
  select public.gas_cell_text(r -> sc) into st
  from jsonb_array_elements(coalesce(public.gas_sheet_data(p_app, p_task ->> 'sheet'), '[]'::jsonb)) r
  where jsonb_typeof(r) = 'array' and public.gas_cell_text(r -> kc) = p_task ->> 'key' limit 1;
  if not found then return false; end if;            -- মুছে ফেলা হয়েছে
  if sc < 0 then return true; end if;
  return coalesce(st, '') = coalesce(p_task ->> 'pending', 'Pending');
end $$;
revoke execute on function public.scs_task_pending(text, jsonb) from public, anon, authenticated;

drop function if exists public.scs_app_notify(text, text, text, text, text, uuid);
create or replace function public.scs_app_notify(p_app text, p_event text, p_title text, p_body text, p_url text,
                                                 p_target uuid default null, p_task jsonb default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_app(p_app) then raise exception 'No access to this app'; end if;
  if split_part(p_event, '.', 1) <> p_app then p_event := p_app || '.' || p_event; end if;
  n := public.scs_notify_event(p_event, left(coalesce(p_title, ''), 200), left(coalesce(p_body, ''), 500), coalesce(nullif(p_url, ''), '/apps/' || p_app || '/'), p_target, auth.uid());
  if n > 0 and p_task is not null then
    update public.notifications set task = p_task where created_at = now() and app_key = p_app and task is null and title = left(coalesce(p_title, ''), 200);
    -- কাজটা শিটে খুঁজে দেখা যায় এমন হলে: ৩ ঘণ্টা পরেও বাকি থাকলে নিজে থেকে একবার ভদ্র রিমাইন্ডার
    if coalesce(p_task ->> 'sheet', '') <> '' then
      insert into public.notif_snooze (user_id, notif_id, app_key, title, url, task, due_at, auto)
      select user_id, id, app_key, title, url, task, now() + interval '3 hours', true
      from public.notifications where created_at = now() and app_key = p_app and task is not null and title = left(coalesce(p_title, ''), 200);
    end if;
  end if;
  return n;
end $$;
revoke execute on function public.scs_app_notify(text, text, text, text, text, uuid, jsonb) from public, anon;

-- "পরে মনে করিয়ে দিন" (মিনিট: ১৫ / ৬০ / ১৮০ / কাল সকাল ইত্যাদি)
create or replace function public.scs_notif_snooze(p_id bigint, p_minutes int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n public.notifications; due timestamptz;
begin
  select * into n from public.notifications where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Notification not found'; end if;
  due := now() + make_interval(mins => greatest(5, least(coalesce(p_minutes, 60), 10080)));
  delete from public.notif_snooze where user_id = auth.uid() and notif_id = p_id;
  insert into public.notif_snooze (user_id, notif_id, app_key, title, url, task, due_at)
  values (auth.uid(), p_id, n.app_key, regexp_replace(n.title, '^🙏 [^·]*· ', ''), n.url, coalesce(n.task, '{}'::jsonb), due);
  update public.notifications set read_at = coalesce(read_at, now()) where id = p_id;
  return jsonb_build_object('ok', true, 'due_at', due);
end $$;
revoke execute on function public.scs_notif_snooze(bigint, int) from public, anon;

-- সময় হলে: কাজ এখনো বাকি থাকলে ভদ্র রিমাইন্ডার (শেষ হয়ে গেলে কিছু যায় না)
create or replace function public.scs_notif_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare r public.notif_snooze; n int := 0; what text;
begin
  for r in select * from public.notif_snooze where due_at <= now() order by id limit 300 loop
    if public.scs_task_pending(r.app_key, r.task) then
      what := coalesce(nullif(r.task ->> 'what', ''), r.title);
      insert into public.notifications (user_id, app_key, title, body, url, task)
      values (r.user_id, r.app_key, '🙏 Friendly reminder · ' || r.title,
        'This is still waiting for you: ' || what || '. Please open it and approve when you have a moment — thank you! / এটা এখনো আপনার অপেক্ষায় আছে। সময় পেলে একটু খুলে অনুমোদন করে দিন — ধন্যবাদ!',
        r.url, r.task);
      n := n + 1;
    end if;
    delete from public.notif_snooze where id = r.id;
  end loop;
  if n > 0 then perform public.scs_push_kick(); end if;
  return n;
end $$;
revoke execute on function public.scs_notif_reminders() from public, anon, authenticated;

insert into public.notif_rules (event_key, app_key, label, label_bn, enabled, audience, options, sort_order) values
  ('chemical-order.order_changed', 'chemical-order', 'Order edited / deleted (to app admins)', 'অর্ডার এডিট / ডিলিট (অ্যাপের Admin কে)', true, 'app_admins', '{}', 11)
on conflict (event_key) do update set app_key = excluded.app_key, label = excluded.label, label_bn = excluded.label_bn, sort_order = excluded.sort_order;

-- 21.4 ব্যাকআপ · রিস্টোর · রিসেট — সব অ্যাপে একই ব্যবস্থা (scope = অ্যাপের key, অথবা '*' = সব অ্যাপ + সিস্টেম)
--  অটো ব্যাকআপ: sys_settings 'bk:<scope>' = { on, n, unit (m/h/d), skip (পরিবর্তন না থাকলে বাদ), keep, ... }
--  প্রতি মিনিটে scs_backup_tick() দেখে কোনটার সময় হয়েছে -> Edge Function (scs-api, fn=backup_drive)
--  টুকরো টুকরো করে Google Drive এ পাঠায় (ফাইল যত বড়ই হোক)
create table if not exists public.sys_backup_runs (
  id     bigint generated always as identity primary key,
  scope  text not null,
  at     timestamptz not null default now(),
  kind   text not null default 'auto',
  ok     boolean,
  file   text,
  size   bigint,
  error  text,
  actor  uuid
);
create index if not exists sys_backup_runs_scope on public.sys_backup_runs (scope, id desc);
alter table public.sys_backup_runs enable row level security;
drop policy if exists scs_bkr_read on public.sys_backup_runs;
create policy scs_bkr_read on public.sys_backup_runs for select to authenticated
  using (public.is_super_admin() or (scope <> '*' and public.has_app(scope, 'admin')));

create or replace function public.scs_bk_can(p_scope text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is null or public.is_super_admin() or (coalesce(p_scope, '*') <> '*' and public.has_app(p_scope, 'admin'));
$$;

-- ডাটা শেষ কখন বদলেছে (এটা না বদলালে "পরিবর্তন না থাকলে ব্যাকআপ নয়")
create or replace function public.scs_backup_sig(p_scope text) returns text
language sql stable security definer set search_path = public as $$
  select case when coalesce(p_scope, '*') = '*' then
      coalesce((select max(id)::text from public.audit_log), '0') || '|' || coalesce((select max(updated_at)::text from public.gas_versions), '') || '|' ||
      coalesce((select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.gas_files), '')
    else
      coalesce((select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.gas_versions where app_key = p_scope), '') || '|' ||
      coalesce((select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.gas_files where app_key = p_scope), '') || '|' ||
      coalesce((select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.gas_props where app_key = p_scope and scope = 'script'), '')
  end;
$$;
revoke execute on function public.scs_backup_sig(text) from public, anon;

create or replace function public.scs_backup_info(p_scope text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cfg jsonb; drv jsonb; mk jsonb; runs jsonb; sheets jsonb;
begin
  if not public.scs_bk_can(p_scope) then raise exception 'Admin access required for this app'; end if;
  select value into cfg from public.sys_settings where key = 'bk:' || p_scope;
  select value into drv from public.sys_settings where key = 'backup';
  select value into mk from public.sys_settings where key = 'bkmark:' || p_scope;
  select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into runs from (
    select id, at, kind, ok, file, size, error from public.sys_backup_runs where scope = p_scope order by id desc limit 12) x;
  if p_scope <> '*' then
    select coalesce(jsonb_agg(jsonb_build_object('name', name, 'rows', case when chunks is null then jsonb_array_length(data) else -1 end) order by idx, name), '[]'::jsonb)
      into sheets from public.gas_sheets where app_key = p_scope;
  end if;
  return jsonb_build_object('cfg', coalesce(cfg, '{}'::jsonb), 'sig', public.scs_backup_sig(p_scope), 'mark', mk, 'runs', runs, 'sheets', coalesce(sheets, '[]'::jsonb),
    'drive', coalesce(drv ->> 'scriptUrl', '') <> '' and coalesce(drv ->> 'folderId', '') <> '', 'driveFolder', coalesce(drv ->> 'folderUrl', ''),
    'now', now(), 'super', public.is_super_admin());
end $$;
revoke execute on function public.scs_backup_info(text) from public, anon;

create or replace function public.scs_backup_cfg_save(p_scope text, p_cfg jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cur jsonb; n int; u text;
begin
  if not public.scs_bk_can(p_scope) or auth.uid() is null then raise exception 'Admin access required for this app'; end if;
  select value into cur from public.sys_settings where key = 'bk:' || p_scope;
  u := coalesce(p_cfg ->> 'unit', 'd'); if u not in ('m', 'h', 'd') then u := 'd'; end if;
  n := greatest(1, least(coalesce(nullif(p_cfg ->> 'n', '')::int, 1), case u when 'm' then 1440 when 'h' then 720 else 365 end));
  if u = 'm' and n < 5 then n := 5; end if;      -- সর্বনিম্ন ৫ মিনিট
  cur := coalesce(cur, '{}'::jsonb) || jsonb_build_object('on', coalesce((p_cfg ->> 'on')::boolean, false), 'n', n, 'unit', u,
    'skip', coalesce((p_cfg ->> 'skip')::boolean, true), 'keep', greatest(0, least(coalesce(nullif(p_cfg ->> 'keep', '')::int, 30), 1000)));
  insert into public.sys_settings (key, value, updated_at, updated_by) values ('bk:' || p_scope, cur, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  return cur;
end $$;
revoke execute on function public.scs_backup_cfg_save(text, jsonb) from public, anon;

-- ব্রাউজারে লাইফটাইম ব্যাকআপ পুরো ডাউনলোড হলে: রিসেটের অনুমতি ১০ মিনিট (তার মধ্যে ডাটা না বদলালে)
create or replace function public.scs_backup_mark(p_scope text, p_kind text, p_file text, p_size bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m jsonb;
begin
  if not public.scs_bk_can(p_scope) or auth.uid() is null then raise exception 'Admin access required for this app'; end if;
  insert into public.sys_backup_runs (scope, kind, ok, file, size, actor) values (p_scope, coalesce(p_kind, 'download'), true, p_file, p_size, auth.uid());
  m := jsonb_build_object('at', now(), 'sig', public.scs_backup_sig(p_scope), 'by', auth.uid(), 'file', p_file);
  insert into public.sys_settings (key, value, updated_at, updated_by) values ('bkmark:' || p_scope, m, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  if p_scope = '*' then
    insert into public.sys_settings (key, value, updated_at, updated_by) values ('last_full_backup', to_jsonb(now()), now(), auth.uid())
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  end if;
  return m;
end $$;
revoke execute on function public.scs_backup_mark(text, text, text, bigint) from public, anon;

-- সব অ্যাপের ব্যাকআপে টেবিলগুলো (অ্যাপের শিট বাদে — সেগুলো অ্যাপ ধরে আলাদা আসে)
create or replace function public.scs_backup_tables() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; out jsonb := '[]'::jsonb; c bigint;
begin
  if auth.uid() is not null and not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  for r in select tablename from pg_tables where schemaname = 'public'
      and tablename <> all (public.scs_backup_excluded() || array['gas_sheets', 'gas_chunks', 'gas_props', 'gas_files', 'gas_versions', 'gas_locks', 'notif_snooze', 'sys_backup_runs'])
      order by tablename loop
    execute format('select count(*) from public.%I', r.tablename) into c;
    out := out || jsonb_build_array(jsonb_build_object('t', r.tablename, 'n', c));
  end loop;
  return out;
end $$;
revoke execute on function public.scs_backup_tables() from public, anon;
create or replace function public.scs_backup_table_page(p_table text, p_offset int, p_limit int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is not null and not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if not exists (select 1 from jsonb_array_elements(public.scs_backup_tables()) x where x ->> 't' = p_table) then raise exception 'Not a backup table: %', p_table; end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (select * from public.%I order by 1 offset $1 limit $2) t', p_table)
    into v using greatest(0, p_offset), least(greatest(1, p_limit), 5000);
  return v;
end $$;
revoke execute on function public.scs_backup_table_page(text, int, int) from public, anon;

-- রিস্টোর: একটা শিট বসানো (টুকরো বা পুরো ডাটা) — ভার্সন বাড়ে, খোলা অ্যাপ নিজে থেকে নতুন ডাটা নেয়
create or replace function public.gas_restore_sheet(p_app text, p_sheet jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare ch text[]; v bigint; nm text := p_sheet ->> 'name';
begin
  if not public.scs_bk_can(p_app) or p_app = '*' then raise exception 'Admin access required for this app'; end if;
  if coalesce(nm, '') = '' then raise exception 'Sheet name missing'; end if;
  if jsonb_typeof(p_sheet -> 'chunks') = 'array' then
    ch := array(select jsonb_array_elements_text(p_sheet -> 'chunks'));
    if exists (select 1 from unnest(ch) as x(hh) where not exists (select 1 from public.gas_chunks g where g.app_key = p_app and g.name = nm and g.h = x.hh)) then
      raise exception 'A part of sheet % did not upload — try again', nm;
    end if;
  end if;
  insert into public.gas_sheets (app_key, name, idx, data, meta, version, updated_by, chunks)
  values (p_app, nm, coalesce((p_sheet ->> 'idx')::int, 0), case when ch is null then coalesce(p_sheet -> 'data', '[]'::jsonb) else '[]'::jsonb end,
          coalesce(p_sheet -> 'meta', '{}'::jsonb), 1, auth.uid(), ch)
  on conflict (app_key, name) do update set data = excluded.data, chunks = excluded.chunks, meta = excluded.meta, idx = excluded.idx,
    version = public.gas_sheets.version + 1, updated_at = now(), updated_by = excluded.updated_by
  returning version into v;
  perform public.gas_chunks_gc(p_app, nm);
  insert into public.gas_versions (app_key, name, version, updated_at, updated_by) values (p_app, nm, v, now(), auth.uid())
  on conflict (app_key, name) do update set version = excluded.version, updated_at = now(), updated_by = excluded.updated_by;
  return v;
end $$;
revoke execute on function public.gas_restore_sheet(text, jsonb) from public, anon;

-- রিস্টোর শেষ: (সব রিস্টোরে) ব্যাকআপে নেই এমন শিট মোছা, সেটিং বসানো (পিন/গোপন কী বদলায় না), লগ
create or replace function public.gas_restore_finish(p_app text, p_names text[], p_full boolean, p_props jsonb, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p jsonb; nd int := 0; np int := 0; sec text := '(pin|pass|secret|token|api_?key|apikey|hash|otp)';
begin
  if not public.scs_bk_can(p_app) or p_app = '*' then raise exception 'Admin access required for this app'; end if;
  if p_full then
    update public.gas_versions set version = version + 1, updated_at = now() where app_key = p_app and name <> all (coalesce(p_names, '{}'::text[])) and name <> '#props';
    delete from public.gas_chunks where app_key = p_app and name <> all (coalesce(p_names, '{}'::text[]));
    delete from public.gas_sheets where app_key = p_app and name <> all (coalesce(p_names, '{}'::text[]));
    get diagnostics nd = row_count;
  end if;
  if jsonb_typeof(p_props) = 'array' then
    if p_full then delete from public.gas_props where app_key = p_app and scope = 'script' and key !~* sec; end if;
    for p in select * from jsonb_array_elements(p_props) loop
      continue when coalesce(p ->> 'key', '') = '' or (p ->> 'key') ~* sec;
      insert into public.gas_props (app_key, scope, key, value, updated_at, updated_by) values (p_app, 'script', p ->> 'key', p ->> 'value', now(), auth.uid())
      on conflict (app_key, scope, key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
      np := np + 1;
    end loop;
    insert into public.gas_versions (app_key, name, version, updated_at, updated_by) values (p_app, '#props', 1, now(), auth.uid())
    on conflict (app_key, name) do update set version = public.gas_versions.version + 1, updated_at = now(), updated_by = auth.uid();
  end if;
  insert into public.audit_log (app_key, table_name, entity, record_ref, action, old_data, new_data, actor_id, actor_email, actor_name)
  select p_app, 'backup', 'Backup', 'RESTORE', 'Edit', null, jsonb_build_object('note', left(coalesce(p_note, ''), 300), 'sheets', coalesce(array_length(p_names, 1), 0), 'settings', np, 'full', p_full),
         auth.uid(), pr.email, pr.full_name from public.profiles pr where pr.id = auth.uid();
  insert into public.sys_backup_runs (scope, kind, ok, file, actor) values (p_app, 'restore', true, left(coalesce(p_note, ''), 200), auth.uid());
  return jsonb_build_object('ok', true, 'dropped', nd, 'settings', np);
end $$;
revoke execute on function public.gas_restore_finish(text, text[], boolean, jsonb, text) from public, anon;

-- একটা অ্যাপের রিসেট: Admin + অ্যাপের Admin পিন + "RESET" লেখা + গত ১০ মিনিটে লাইফটাইম ব্যাকআপ (তারপর ডাটা বদলায়নি)
create or replace function public.scs_app_reset(p_app text, p_pin text, p_phrase text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mk jsonb; pin text; paths jsonb; ns int; sec text := '(pin|pass|secret|token|api_?key|apikey|hash|otp)';
begin
  if p_app = '*' or not public.scs_bk_can(p_app) or auth.uid() is null then raise exception 'Admin access required for this app'; end if;
  if coalesce(p_phrase, '') <> 'RESET' then raise exception 'Type RESET to confirm. / নিশ্চিত করতে RESET লিখুন।'; end if;
  select value into mk from public.sys_settings where key = 'bkmark:' || p_app;
  if mk is null or (mk ->> 'at')::timestamptz < now() - interval '10 minutes' then
    raise exception 'Reset expired: take a LIFETIME backup again (reset is open for 10 minutes after it). / রিসেটের সময় শেষ: আবার লাইফটাইম ব্যাকআপ নিন (ব্যাকআপের পর ১০ মিনিট রিসেট করা যায়)।';
  end if;
  -- শিট আর ফাইল বদলেছে কি না (সেটিং/অনলাইন-অবস্থার ছোট লেখা ধরা হয় না)
  if split_part(coalesce(mk ->> 'sig', ''), '|', 1) || '|' || split_part(coalesce(mk ->> 'sig', ''), '|', 2)
     <> split_part(public.scs_backup_sig(p_app), '|', 1) || '|' || split_part(public.scs_backup_sig(p_app), '|', 2) then
    raise exception 'Data changed after the backup — take the backup again. / ব্যাকআপের পর ডাটা বদলেছে — আবার ব্যাকআপ নিন।';
  end if;
  select ap.pin into pin from public.app_pins ap where ap.app_key = p_app;
  if coalesce(pin, '') = '' then raise exception 'Set this app''s admin PIN first (Admin Console > Apps & admin PINs). / আগে Admin Console এ অ্যাপের অ্যাডমিন পিন দিন।'; end if;
  if coalesce(p_pin, '') <> pin then perform pg_sleep(0.8); raise exception 'Wrong PIN. / পিন ভুল।'; end if;

  select coalesce(jsonb_agg(path), '[]'::jsonb) into paths from public.gas_files where app_key = p_app and coalesce(path, '') <> '';
  update public.gas_versions set version = version + 1, updated_at = now(), updated_by = auth.uid() where app_key = p_app;
  delete from public.gas_chunks where app_key = p_app;
  delete from public.gas_sheets where app_key = p_app;
  get diagnostics ns = row_count;
  delete from public.gas_props where app_key = p_app and key !~* sec;
  delete from public.gas_files where app_key = p_app;
  delete from public.sys_settings where key = 'bkmark:' || p_app;
  insert into public.audit_log (app_key, table_name, entity, record_ref, action, old_data, new_data, actor_id, actor_email, actor_name)
  select p_app, 'backup', 'Backup', 'FULL RESET', 'Delete', jsonb_build_object('sheets', ns, 'files', jsonb_array_length(paths)), null, auth.uid(), pr.email, pr.full_name
  from public.profiles pr where pr.id = auth.uid();
  insert into public.sys_backup_runs (scope, kind, ok, file, actor) values (p_app, 'reset', true, ns || ' sheets', auth.uid());
  return jsonb_build_object('ok', true, 'sheets', ns, 'paths', paths);
end $$;
revoke execute on function public.scs_app_reset(text, text, text) from public, anon;

-- সব অ্যাপের রিসেট: আগের মতো ইমেইল কোড + লেখা, কিন্তু ব্যাকআপের পর ১০ মিনিটের মধ্যে (আর টুকরোও মোছে)
create or replace function public.scs_reset_all(p_code text, p_phrase text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s text; j jsonb; last_bk timestamptz; t text; n int; res jsonb := '{}'::jsonb;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if coalesce(p_phrase, '') <> 'ERASE ALL DATA' then raise exception 'Type the confirmation text exactly: ERASE ALL DATA'; end if;
  select (value #>> '{}')::timestamptz into last_bk from public.sys_settings where key = 'last_full_backup';
  if last_bk is null or last_bk < now() - interval '10 minutes' then
    raise exception 'Reset expired: take a LIFETIME backup again (reset is open for 10 minutes after it). / রিসেটের সময় শেষ: আবার লাইফটাইম ব্যাকআপ নিন (ব্যাকআপের পর ১০ মিনিট)।';
  end if;
  select value into s from public.sys_secrets where key = 'reset_code' for update;
  if s is null then raise exception 'Request the email code first. / আগে ইমেইলে কোড নিন।'; end if;
  j := s::jsonb;
  if (j ->> 'exp')::bigint < (extract(epoch from now()) * 1000)::bigint then
    delete from public.sys_secrets where key = 'reset_code';
    raise exception 'The code has expired. Request a new one. / কোডের মেয়াদ শেষ, নতুন কোড নিন।';
  end if;
  if coalesce((j ->> 'tries')::int, 0) >= 5 then
    delete from public.sys_secrets where key = 'reset_code';
    raise exception 'Too many wrong codes. Request a new one. / অনেকবার ভুল কোড, নতুন কোড নিন।';
  end if;
  if encode(extensions.digest('scs-reset|' || coalesce(trim(p_code), ''), 'sha256'), 'hex') <> j ->> 'hash' then
    update public.sys_secrets set value = jsonb_set(j, '{tries}', to_jsonb(coalesce((j ->> 'tries')::int, 0) + 1))::text where key = 'reset_code';
    return jsonb_build_object('ok', false, 'error', 'Wrong code. / ভুল কোড।');
  end if;
  delete from public.sys_secrets where key = 'reset_code';
  perform set_config('scs.restoring', '1', true);
  update public.gas_versions set version = version + 1, updated_at = now();
  foreach t in array array['gas_chunks', 'gas_sheets', 'gas_props', 'gas_files', 'gas_locks',
    'chem_orders', 'chem_products', 'chem_sellers', 'chem_settings', 'att_records', 'att_employees', 'att_settings', 'att_monthly_summary',
    'mr_month_data', 'mr_settings', 'leave_applications', 'leave_employees', 'leave_settings', 'leave_signatures',
    'notifications', 'notif_sent', 'notif_snooze'] loop
    if to_regclass('public.' || t) is not null then
      if t = 'gas_props' then execute 'delete from public.gas_props where key !~* ''(pin|pass|secret|token|api_?key|apikey|hash|otp)''';
      else execute format('delete from public.%I where true', t); end if;
      get diagnostics n = row_count;
      res := res || jsonb_build_object(t, n);
    end if;
  end loop;
  perform set_config('scs.restoring', '0', true);
  insert into public.audit_log (app_key, table_name, entity, record_ref, action, old_data, new_data, changed_fields, actor_id, actor_email, actor_name)
  select 'core', 'all', 'System', 'FULL RESET', 'Delete', res, null, null, auth.uid(), p.email, p.full_name from public.profiles p where p.id = auth.uid();
  delete from public.sys_settings where key in ('last_full_backup', 'bkmark:*');
  insert into public.sys_backup_runs (scope, kind, ok, file, actor) values ('*', 'reset', true, 'all apps', auth.uid());
  return jsonb_build_object('ok', true, 'deleted', res);
end $$;
revoke execute on function public.scs_reset_all(text, text) from public, anon;

-- Google Drive এ পাঠানো (Edge Function কে ডাকা) — একটা scope এর জন্য
create or replace function public.scs_backup_dispatch(p_scope text, p_kind text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare api jsonb; k text; rid bigint;
begin
  select value into api from public.sys_settings where key = 'api';
  if coalesce(api ->> 'url', '') = '' then raise exception 'Open SCS Management once as Super Admin (it saves the server address), then try again.'; end if;
  select value into k from public.sys_secrets where key = 'cron_key';
  select net.http_post(url := (api ->> 'url') || '?fn=backup_drive',
    body := jsonb_build_object('cronKey', coalesce(k, ''), 'scope', p_scope, 'kind', coalesce(p_kind, 'auto')),
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', coalesce(api ->> 'anon', ''))
               || case when coalesce(api ->> 'anon', '') like 'eyJ%' then jsonb_build_object('Authorization', 'Bearer ' || (api ->> 'anon')) else '{}'::jsonb end,
    timeout_milliseconds := 5000) into rid;
  return rid;
end $$;
revoke execute on function public.scs_backup_dispatch(text, text) from public, anon, authenticated;

create or replace function public.scs_backup_drive_now(p_scope text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare drv jsonb;
begin
  if not public.scs_bk_can(p_scope) or auth.uid() is null then raise exception 'Admin access required for this app'; end if;
  select value into drv from public.sys_settings where key = 'backup';
  if coalesce(drv ->> 'scriptUrl', '') = '' or coalesce(drv ->> 'folderId', '') = '' then
    raise exception 'Google Drive is not connected yet (Super Admin: Admin Console > Backup > Google Drive connection). / Google Drive এখনো যুক্ত হয়নি।';
  end if;
  return jsonb_build_object('request', public.scs_backup_dispatch(p_scope, 'manual'));
end $$;
revoke execute on function public.scs_backup_drive_now(text) from public, anon;

-- প্রতি মিনিটে: কোন অ্যাপের অটো ব্যাকআপের সময় হয়েছে (পরিবর্তন না থাকলে, "skip" চালু থাকলে, বাদ)
create or replace function public.scs_backup_tick() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare r record; c jsonb; every interval; sg text; n int := 0; drv jsonb;
begin
  select value into drv from public.sys_settings where key = 'backup';
  if coalesce(drv ->> 'scriptUrl', '') = '' or coalesce(drv ->> 'folderId', '') = '' then return 0; end if;
  for r in select key, value from public.sys_settings where key like 'bk:%' loop
    c := r.value;
    continue when not coalesce((c ->> 'on')::boolean, false);
    every := case c ->> 'unit' when 'm' then make_interval(mins => greatest(5, coalesce((c ->> 'n')::int, 60)))
                               when 'h' then make_interval(hours => greatest(1, coalesce((c ->> 'n')::int, 1)))
                               else make_interval(days => greatest(1, coalesce((c ->> 'n')::int, 1))) end;
    continue when (c ->> 'last_try') is not null and (c ->> 'last_try')::timestamptz + every - interval '20 seconds' > now();
    sg := public.scs_backup_sig(substr(r.key, 4));
    if coalesce((c ->> 'skip')::boolean, true) and sg = coalesce(c ->> 'last_sig', '') then
      update public.sys_settings set value = value || jsonb_build_object('last_try', now(), 'last_skip', now()) where key = r.key;
      continue;
    end if;
    begin
      perform public.scs_backup_dispatch(substr(r.key, 4), 'auto');
      update public.sys_settings set value = value || jsonb_build_object('last_try', now()) where key = r.key;
      n := n + 1;
    exception when others then
      update public.sys_settings set value = value || jsonb_build_object('last_try', now(), 'last_err', sqlerrm) where key = r.key;
    end;
  end loop;
  return n;
end $$;
revoke execute on function public.scs_backup_tick() from public, anon, authenticated;

-- পুরনো "সব অ্যাপ" অটো ব্যাকআপ (একটা বিশাল JSON) বন্ধ করে নতুন ব্যবস্থায় আনা; প্রতি মিনিটের কাজ চালু
do $$
declare c jsonb; iv text;
begin
  select value into c from public.sys_settings where key = 'backup';
  iv := coalesce(c ->> 'interval', 'off');
  if iv <> 'off' and not exists (select 1 from public.sys_settings where key = 'bk:*') then
    insert into public.sys_settings (key, value) values ('bk:*', jsonb_build_object('on', true, 'skip', true,
      'keep', coalesce(nullif(c ->> 'keep', '')::int, 30),
      'n', case iv when '1m' then 5 when '5m' then 5 when '15m' then 15 when '30m' then 30 when '6h' then 6 when '12h' then 12 when '1w' then 7 else 1 end,
      'unit', case when iv like '%m' then 'm' when iv like '%h' then 'h' else 'd' end));
  end if;
  begin perform cron.unschedule('scs-backup'); exception when others then null; end;
  begin perform cron.unschedule('scs-every-minute'); exception when others then null; end;
  begin
    perform cron.schedule('scs-every-minute', '* * * * *', 'select public.scs_backup_tick(); select public.scs_notif_reminders();');
  exception when others then raise notice 'Every-minute job not scheduled (enable pg_cron): %', sqlerrm;
  end;
end $$;

create or replace function public.scs_backup_excluded() returns text[]
language sql immutable as $$
  select array['sys_secrets','chem_secrets','password_reset_codes','sms_codes','push_subscriptions','notifications','sys_backup_log','notif_sent','gas_locks','notif_snooze','sys_backup_runs'];
$$;

create or replace function public.scs_schema_version() returns int
language sql immutable as $$ select 15; $$;
-- =====================================================================
--  10. প্রথম সুপার অ্যাডমিন বানানো (একবারই)
--  প্রথমে ওয়েবসাইটে নিজের ইমেইল দিয়ে Sign up করুন, তারপর নিচের লাইনে
--  ইমেইল বদলে শুধু এই লাইনটি Run করুন:
--
--  (লাইনের শুরুতে -- থাকলে সেটা চলে না — New query তে -- ছাড়া পেস্ট করুন)
--
--  insert into public.profiles (id, email, status, is_super_admin)
--  select id, email, 'active', true from auth.users where lower(email) = lower('your-email@example.com')
--  on conflict (id) do update set status = 'active', is_super_admin = true;
-- =====================================================================
