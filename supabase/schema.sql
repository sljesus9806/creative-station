-- =========================================================
--  Creative Station · base de datos (Supabase, plan gratis)
--
--  Cómo usarlo: Supabase → SQL Editor → New query →
--  pega TODO este archivo → Run.
--  Se puede volver a correr sin romper nada.
-- =========================================================


-- ---------- Administradoras ----------
-- Solo los correos de esta tabla pueden entrar al panel.
-- Agrega el correo de la dueña así (cámbialo por el real):
--   insert into public.admins (email) values ('correo-de-ella@gmail.com');
create table if not exists public.admins (
  email text primary key
);

-- Sin políticas: nadie puede leer ni cambiar esta tabla desde la página.
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;


-- ---------- Ajustes del sitio (textos, WhatsApp, promo…) ----------
create table if not exists public.settings (
  key text primary key check (char_length(key) between 1 and 60),
  value text not null default '' check (char_length(value) <= 8000)
);


-- ---------- Categorías ----------
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique,
  description text not null default '',
  image text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);


-- ---------- Productos ----------
-- price vacío = "Precio según diseño". mode: 'pedido' (se agrega al pedido) o 'cotizacion' (solo se cotiza).
-- custom_fields: datos que se piden para personalizar (Nombre, Edad, Temática…).
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique,
  category_id bigint references public.categories (id) on delete set null,
  short_desc text not null default '',
  description text not null default '',
  price numeric(10, 2) check (price is null or price >= 0),
  price_from boolean not null default true,
  unit text not null default 'pieza',
  min_qty int not null default 1 check (min_qty >= 1),
  mode text not null default 'pedido' check (mode in ('pedido', 'cotizacion')),
  custom_fields text[] not null default '{}',
  occasions text[] not null default '{}',
  images text[] not null default '{}',
  badge text not null default '',
  featured boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);


-- ---------- Pedidos (desde "Mi pedido") ----------
-- items: copia de lo pedido → [{ slug, name, price, unit, qty, image, custom: {Nombre: "…"} }]
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  city text not null default '',
  event_date date,
  delivery text not null default '',
  notes text not null default '',
  items jsonb not null,
  total numeric(10, 2),
  has_unpriced boolean not null default false,
  status text not null default 'nuevo'
    check (status in ('nuevo', 'confirmado', 'en_produccion', 'listo', 'entregado', 'cancelado')),
  admin_notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status, created_at desc);


-- ---------- Cotizaciones (desde "Cotizar") ----------
create table if not exists public.quotes (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  email text not null default '',
  city text not null default '',
  event_type text not null default '',
  event_date date,
  quantity text not null default '',
  interests text[] not null default '{}',
  product_slug text not null default '',
  theme text not null default '',
  budget text not null default '',
  delivery text not null default '',
  details text not null default '',
  images text[] not null default '{}',
  status text not null default 'nueva'
    check (status in ('nueva', 'en_proceso', 'cotizada', 'aceptada', 'cerrada')),
  admin_notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists quotes_status_idx on public.quotes (status, created_at desc);


-- ---------- Permisos (Row Level Security) ----------
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "ajustes visibles" on public.settings;
create policy "ajustes visibles" on public.settings for select using (true);
drop policy if exists "admin edita ajustes" on public.settings;
create policy "admin edita ajustes" on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categorias visibles" on public.categories;
create policy "categorias visibles" on public.categories for select using (active or public.is_admin());
drop policy if exists "admin edita categorias" on public.categories;
create policy "admin edita categorias" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "productos visibles" on public.products;
create policy "productos visibles" on public.products for select using (active or public.is_admin());
drop policy if exists "admin edita productos" on public.products;
create policy "admin edita productos" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Pedidos y cotizaciones: solo admin los ve y cambia.
-- Las clientas los crean con las funciones create_order y create_quote (abajo).
drop policy if exists "admin maneja pedidos" on public.orders;
create policy "admin maneja pedidos" on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin maneja cotizaciones" on public.quotes;
create policy "admin maneja cotizaciones" on public.quotes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ---------- Crear pedido (lo llama "Mi pedido") ----------
-- Los precios se toman de la base de datos, así nadie puede mandar precios inventados.
create or replace function public.create_order(p_customer jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products;
  v_qty int;
  v_custom jsonb;
  v_kv record;
  v_n int;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric(10, 2) := 0;
  v_priced int := 0;
  v_unpriced boolean := false;
  v_photo boolean := false;
  v_id bigint;
  v_name text := left(btrim(coalesce(p_customer ->> 'name', '')), 80);
  v_phone text := left(btrim(coalesce(p_customer ->> 'phone', '')), 20);
  v_city text := left(btrim(coalesce(p_customer ->> 'city', '')), 80);
  v_date date;
begin
  if v_name = '' or char_length(regexp_replace(v_phone, '\D', '', 'g')) < 10 or v_city = '' then
    raise exception 'Faltan tu nombre, tu WhatsApp (10 dígitos) o tu ciudad';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 40 then
    raise exception 'Tu pedido está vacío';
  end if;
  begin
    v_date := nullif(p_customer ->> 'event_date', '')::date;
  exception when others then
    v_date := null;
  end;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products
    where slug = (v_item ->> 'slug') and active and mode = 'pedido';
    if not found then
      raise exception 'Uno de los productos ya no está disponible';
    end if;

    v_qty := least(9999, greatest(v_product.min_qty, coalesce((v_item ->> 'qty')::int, 1)));
    v_custom := '{}'::jsonb;
    v_n := 0;
    if jsonb_typeof(v_item -> 'custom') = 'object' then
      for v_kv in select key, value from jsonb_each_text(v_item -> 'custom') loop
        exit when v_n >= 15;
        if btrim(coalesce(v_kv.value, '')) <> '' then
          v_custom := v_custom || jsonb_build_object(left(v_kv.key, 60), left(btrim(v_kv.value), 600));
          v_n := v_n + 1;
        end if;
      end loop;
    end if;

    if exists (select 1 from unnest(v_product.custom_fields) f where f ilike '%foto%') then
      v_photo := true;
    end if;
    if v_product.price is null then
      v_unpriced := true;
    else
      v_total := v_total + v_product.price * v_qty;
      v_priced := v_priced + 1;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'slug', v_product.slug, 'name', v_product.name, 'price', v_product.price, 'unit', v_product.unit,
      'qty', v_qty, 'image', coalesce(v_product.images[1], ''), 'custom', v_custom
    );
  end loop;

  insert into public.orders (name, phone, city, event_date, delivery, notes, items, total, has_unpriced)
  values (
    v_name, v_phone, v_city, v_date,
    left(btrim(coalesce(p_customer ->> 'delivery', '')), 80),
    left(btrim(coalesce(p_customer ->> 'notes', '')), 600),
    v_lines,
    case when v_priced > 0 then v_total else null end,
    v_unpriced
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id, 'folio', 'CS-P-' || lpad(v_id::text, 4, '0'),
    'items', v_lines, 'total', case when v_priced > 0 then v_total else null end,
    'has_unpriced', v_unpriced, 'needs_photo', v_photo
  );
end;
$$;

grant execute on function public.create_order(jsonb, jsonb) to anon, authenticated;


-- ---------- Crear cotización (lo llama "Cotizar") ----------
create or replace function public.create_quote(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_date date;
  v_images text[];
  v_interests text[];
  v_name text := left(btrim(coalesce(p ->> 'name', '')), 80);
  v_phone text := left(btrim(coalesce(p ->> 'phone', '')), 20);
  v_city text := left(btrim(coalesce(p ->> 'city', '')), 80);
  v_event text := left(btrim(coalesce(p ->> 'event_type', '')), 60);
  v_details text := left(btrim(coalesce(p ->> 'details', '')), 2000);
begin
  if v_name = '' or char_length(regexp_replace(v_phone, '\D', '', 'g')) < 10 or v_city = '' or v_event = '' or v_details = '' then
    raise exception 'Faltan datos: nombre, WhatsApp (10 dígitos), ciudad, tipo de evento e idea';
  end if;
  begin
    v_date := nullif(p ->> 'event_date', '')::date;
  exception when others then
    v_date := null;
  end;
  -- Solo fotos subidas a la carpeta "referencias" de este proyecto (máximo 3)
  select coalesce(array_agg(u), '{}') into v_images from (
    select left(value, 500) as u from jsonb_array_elements_text(coalesce(p -> 'images', '[]'::jsonb))
    where value like '%/storage/v1/object/public/referencias/%' limit 3
  ) t;
  select coalesce(array_agg(left(value, 60)), '{}') into v_interests from (
    select value from jsonb_array_elements_text(coalesce(p -> 'interests', '[]'::jsonb)) limit 20
  ) t;

  insert into public.quotes (name, phone, email, city, event_type, event_date, quantity, interests,
                             product_slug, theme, budget, delivery, details, images)
  values (
    v_name, v_phone, left(btrim(coalesce(p ->> 'email', '')), 120), v_city, v_event, v_date,
    left(btrim(coalesce(p ->> 'quantity', '')), 60), v_interests,
    left(btrim(coalesce(p ->> 'product_slug', '')), 100), left(btrim(coalesce(p ->> 'theme', '')), 160),
    left(btrim(coalesce(p ->> 'budget', '')), 40), left(btrim(coalesce(p ->> 'delivery', '')), 80),
    v_details, v_images
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'folio', 'CS-C-' || lpad(v_id::text, 4, '0'));
end;
$$;

grant execute on function public.create_quote(jsonb) to anon, authenticated;


-- ---------- Fotos (Storage) ----------
-- "catalogo": fotos de productos y categorías. Cualquiera las ve, solo admin sube/borra.
-- "referencias": fotos de inspiración que mandan las clientas al cotizar (solo pueden subir, máx. 5 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalogo', 'catalogo', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('referencias', 'referencias', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "admin ve fotos" on storage.objects;
create policy "admin ve fotos" on storage.objects for select to authenticated
  using (bucket_id in ('catalogo', 'referencias') and public.is_admin());

drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and public.is_admin());

drop policy if exists "admin cambia fotos" on storage.objects;
create policy "admin cambia fotos" on storage.objects for update to authenticated
  using (bucket_id = 'catalogo' and public.is_admin());

drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id in ('catalogo', 'referencias') and public.is_admin());

drop policy if exists "clientas suben referencias" on storage.objects;
create policy "clientas suben referencias" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'referencias' and (storage.foldername(name))[1] = 'cotizaciones');
