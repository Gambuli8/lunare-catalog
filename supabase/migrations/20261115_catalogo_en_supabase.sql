-- ── Catálogo en Supabase ──────────────────────────────────────
-- El catálogo deja la planilla y pasa a esta tabla. La dueña lo maneja
-- desde el panel (/panel → Productos); la tienda lo lee con
-- catalogo_publico().
--
-- El stock cambia de significado: antes la planilla decía cuántas había
-- y la base le restaba lo comprometido por pedidos vivos. Ahora "stock"
-- es lo que queda para vender: un pedido lo descuenta al crearse, y
-- cancelarlo lo devuelve. Así el panel muestra lo que de verdad se puede
-- vender, y no hace falta descontar nada a mano.
--
-- Mismo criterio que el resto de la base: RLS prendido sin políticas,
-- permisos revocados de anon y authenticated, funciones SECURITY DEFINER
-- con search_path fijo. Solo entra el servidor con la service role key.

-- Quedó de una exportación de migraciones que no se terminó.
drop function if exists public.tmp_exportar_migraciones();

create table productos (
  id              text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]{0,29}$'),
  nombre          text not null check (length(trim(nombre)) > 1),
  categoria       text not null,
  subcategoria    text not null default '',
  material        text not null check (material in ('Plata', 'Plata Dorada', 'Acero Blanco', 'Bijou')),

  -- Para aritos, el precio del par: se venden de a pares.
  precio          integer not null check (precio > 0),
  precio_promo    integer check (precio_promo is null or (precio_promo > 0 and precio_promo < precio)),
  -- Cargado = es una cadena que se ofrece en conjunto con los dijes.
  precio_conjunto integer check (precio_conjunto is null or precio_conjunto > 0),
  -- Solo para el panel. catalogo_publico() no lo devuelve nunca.
  precio_costo    integer check (precio_costo is null or precio_costo >= 0),

  stock           integer not null default 0 check (stock >= 0),

  fotos           text[] not null default '{}',
  foto_conjunto   text not null default '',
  descripcion     text not null default '',
  destacado       boolean not null default false,
  publicado       boolean not null default true,

  -- La dirección pública de la pieza. No cambia aunque cambie el nombre:
  -- si cambiara, se perderían los links y el posicionamiento.
  slug            text not null unique,
  orden           integer not null default 0,

  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index productos_publicos_idx on productos (orden, creado_en) where publicado and stock > 0;

create trigger productos_actualizado_en
  before update on productos
  for each row execute function tocar_actualizado_en();

alter table productos enable row level security;
revoke all on productos from anon, authenticated;

-- ── Lo que lee la tienda ──────────────────────────────────────
-- "total" cuenta todas las filas: con la tabla vacía (antes de importar)
-- la tienda sigue leyendo la planilla.
create or replace function catalogo_publico()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'total', (select count(*) from productos),
    'productos', coalesce((
      select jsonb_agg(
        to_jsonb(p) - 'precio_costo' - 'creado_en' - 'actualizado_en'
        order by p.orden, p.creado_en
      )
      from productos p
      where p.publicado and p.stock > 0
    ), '[]'::jsonb)
  );
$$;

-- ── Lo que lee el panel ───────────────────────────────────────
create or replace function productos_panel()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.orden, p.creado_en), '[]'::jsonb)
  from productos p;
$$;

-- ── Guardar una pieza ─────────────────────────────────────────
-- El stock no se pisa: se aplica la diferencia entre lo que la dueña vio
-- al abrir la ficha y lo que guardó. Si mientras tanto entró un pedido,
-- ese pedido no se "des-vende".
create or replace function guardar_producto(p_producto jsonb, p_nuevo boolean, p_stock_anterior integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id     text := trim(p_producto->>'id');
  v_slug   text;
  v_actual integer;
  v_stock  integer;
  v_row    productos;
begin
  if p_nuevo then
    if exists (select 1 from productos where id = v_id) then
      return jsonb_build_object('ok', false, 'error', 'CODIGO_REPETIDO');
    end if;

    v_slug := nullif(trim(p_producto->>'slug'), '');
    if v_slug is null then
      v_slug := lower(regexp_replace(v_id, '[^A-Za-z0-9]+', '-', 'g'));
    end if;
    if exists (select 1 from productos where slug = v_slug) then
      v_slug := v_slug || '-' || lower(regexp_replace(v_id, '[^A-Za-z0-9]+', '-', 'g'));
    end if;

    insert into productos (
      id, nombre, categoria, subcategoria, material,
      precio, precio_promo, precio_conjunto, precio_costo, stock,
      fotos, foto_conjunto, descripcion, destacado, publicado, slug, orden
    ) values (
      v_id,
      trim(p_producto->>'nombre'),
      p_producto->>'categoria',
      coalesce(trim(p_producto->>'subcategoria'), ''),
      p_producto->>'material',
      (p_producto->>'precio')::integer,
      (p_producto->>'precio_promo')::integer,
      (p_producto->>'precio_conjunto')::integer,
      (p_producto->>'precio_costo')::integer,
      (p_producto->>'stock')::integer,
      array(select jsonb_array_elements_text(coalesce(p_producto->'fotos', '[]'::jsonb))),
      coalesce(p_producto->>'foto_conjunto', ''),
      coalesce(p_producto->>'descripcion', ''),
      coalesce((p_producto->>'destacado')::boolean, false),
      coalesce((p_producto->>'publicado')::boolean, true),
      v_slug,
      (select coalesce(max(orden), 0) + 1 from productos)
    )
    returning * into v_row;
  else
    select stock into v_actual from productos where id = v_id for update;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'NO_EXISTE');
    end if;

    v_stock := v_actual + ((p_producto->>'stock')::integer - p_stock_anterior);
    if v_stock < 0 then
      return jsonb_build_object('ok', false, 'error', 'STOCK_NEGATIVO', 'stock', v_actual);
    end if;

    update productos set
      nombre          = trim(p_producto->>'nombre'),
      categoria       = p_producto->>'categoria',
      subcategoria    = coalesce(trim(p_producto->>'subcategoria'), ''),
      material        = p_producto->>'material',
      precio          = (p_producto->>'precio')::integer,
      precio_promo    = (p_producto->>'precio_promo')::integer,
      precio_conjunto = (p_producto->>'precio_conjunto')::integer,
      precio_costo    = (p_producto->>'precio_costo')::integer,
      stock           = v_stock,
      fotos           = array(select jsonb_array_elements_text(coalesce(p_producto->'fotos', '[]'::jsonb))),
      foto_conjunto   = coalesce(p_producto->>'foto_conjunto', ''),
      descripcion     = coalesce(p_producto->>'descripcion', ''),
      destacado       = coalesce((p_producto->>'destacado')::boolean, false),
      publicado       = coalesce((p_producto->>'publicado')::boolean, true)
    where id = v_id
    returning * into v_row;
  end if;

  return jsonb_build_object('ok', true, 'producto', to_jsonb(v_row));
end $$;

-- ── Borrar una pieza ──────────────────────────────────────────
-- Solo si nunca estuvo en un pedido. Si estuvo, se oculta: los pedidos
-- viejos tienen que seguir diciendo qué se vendió.
create or replace function borrar_producto(p_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (select 1 from pedido_items where producto_id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'EN_PEDIDOS');
  end if;

  delete from productos where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_EXISTE');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ── Importar la planilla ──────────────────────────────────────
-- Agrega las piezas que no están; nunca pisa una que ya exista. Una fila
-- que no entra (un código raro, por ejemplo) no frena a las demás: se
-- devuelve en "errores".
create or replace function importar_productos(p_productos jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_p          jsonb;
  v_id         text;
  v_slug       text;
  v_insertados integer := 0;
  v_existentes integer := 0;
  v_errores    jsonb := '[]'::jsonb;
begin
  for v_p in select * from jsonb_array_elements(p_productos) loop
    v_id := trim(v_p->>'id');

    if exists (select 1 from productos where id = v_id) then
      v_existentes := v_existentes + 1;
      continue;
    end if;

    v_slug := v_p->>'slug';
    if exists (select 1 from productos where slug = v_slug) then
      v_slug := v_slug || '-' || lower(regexp_replace(v_id, '[^A-Za-z0-9]+', '-', 'g'));
    end if;

    begin
      insert into productos (
        id, nombre, categoria, subcategoria, material,
        precio, precio_promo, precio_conjunto, precio_costo, stock,
        fotos, foto_conjunto, descripcion, destacado, publicado, slug, orden
      ) values (
        v_id,
        trim(v_p->>'nombre'),
        v_p->>'categoria',
        coalesce(v_p->>'subcategoria', ''),
        v_p->>'material',
        round((v_p->>'precio')::numeric)::integer,
        round((v_p->>'precio_promo')::numeric)::integer,
        round((v_p->>'precio_conjunto')::numeric)::integer,
        round((v_p->>'precio_costo')::numeric)::integer,
        greatest(round((v_p->>'stock')::numeric)::integer, 0),
        array(select jsonb_array_elements_text(coalesce(v_p->'fotos', '[]'::jsonb))),
        coalesce(v_p->>'foto_conjunto', ''),
        coalesce(v_p->>'descripcion', ''),
        coalesce((v_p->>'destacado')::boolean, false),
        coalesce((v_p->>'publicado')::boolean, true),
        v_slug,
        coalesce((v_p->>'orden')::integer, 0)
      );
      v_insertados := v_insertados + 1;
    exception when others then
      v_errores := v_errores || jsonb_build_object('id', v_id, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'insertados', v_insertados,
    'existentes', v_existentes,
    'errores', v_errores
  );
end $$;

-- ── Crear el pedido descontando el stock ──────────────────────
-- Con la tabla cargada, el stock se descuenta acá mismo, dentro de la
-- transacción y con la fila bloqueada: dos personas no pueden llevarse
-- la última pieza.
--
-- Las líneas se suman por pieza antes de comparar: mandar la misma pieza
-- dos veces no puede saltear el control.
--
-- Con la tabla vacía (antes de importar) sigue funcionando como antes:
-- el stock de la planilla menos lo comprometido.
create or replace function crear_pedido(p_pedido jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_item jsonb;
  v_linea record;
  v_comprometido integer;
  v_disponible integer;
  v_usa_tabla boolean;
  v_subtotal numeric(12,2) := 0;
  v_envio numeric(12,2) := coalesce((p_pedido->>'costo_envio')::numeric, 0);
  v_faltantes jsonb := '[]'::jsonb;
  v_row pedidos;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'PEDIDO_VACIO';
  end if;

  perform pg_advisory_xact_lock(hashtext('crear_pedido'));

  v_usa_tabla := exists (select 1 from productos);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal
      + (v_item->>'precio_unitario')::numeric * (v_item->>'cantidad')::integer;
  end loop;

  -- Primero revisamos todo y juntamos lo que falte, para poder decirle a
  -- la clienta qué pieza se quedó sin stock y no solo que "falló".
  if v_usa_tabla then
    for v_linea in
      select it->>'producto_id' as producto_id,
             min(it->>'nombre') as nombre,
             sum((it->>'cantidad')::integer)::integer as cantidad
        from jsonb_array_elements(p_items) as it
       group by 1
    loop
      select stock into v_disponible from productos where id = v_linea.producto_id for update;
      v_disponible := coalesce(v_disponible, 0);

      if v_disponible < v_linea.cantidad then
        v_faltantes := v_faltantes || jsonb_build_object(
          'producto_id', v_linea.producto_id,
          'nombre', v_linea.nombre,
          'pedido', v_linea.cantidad,
          'disponible', greatest(v_disponible, 0)
        );
      end if;
    end loop;
  else
    for v_item in select * from jsonb_array_elements(p_items) loop
      select coalesce(unidades, 0) into v_comprometido
        from stock_comprometido where producto_id = v_item->>'producto_id';
      v_comprometido := coalesce(v_comprometido, 0);
      v_disponible := (v_item->>'stock_actual')::integer - v_comprometido;

      if v_disponible < (v_item->>'cantidad')::integer then
        v_faltantes := v_faltantes || jsonb_build_object(
          'producto_id', v_item->>'producto_id',
          'nombre', v_item->>'nombre',
          'pedido', (v_item->>'cantidad')::integer,
          'disponible', greatest(v_disponible, 0)
        );
      end if;
    end loop;
  end if;

  if jsonb_array_length(v_faltantes) > 0 then
    return jsonb_build_object('ok', false, 'error', 'SIN_STOCK', 'faltantes', v_faltantes);
  end if;

  if v_usa_tabla then
    update productos pr
       set stock = pr.stock - l.cantidad
      from (
        select it->>'producto_id' as producto_id, sum((it->>'cantidad')::integer)::integer as cantidad
          from jsonb_array_elements(p_items) as it
         group by 1
      ) l
     where pr.id = l.producto_id;
  end if;

  insert into pedidos (
    estado, nombre, telefono, email, entrega, transporte, cp, direccion,
    costo_envio, pago, subtotal, total, notas
  ) values (
    'pendiente',
    p_pedido->>'nombre',
    p_pedido->>'telefono',
    nullif(p_pedido->>'email', ''),
    (p_pedido->>'entrega')::forma_entrega,
    nullif(p_pedido->>'transporte', ''),
    nullif(p_pedido->>'cp', ''),
    nullif(p_pedido->>'direccion', ''),
    v_envio,
    (p_pedido->>'pago')::forma_pago,
    v_subtotal,
    v_subtotal + v_envio,
    nullif(p_pedido->>'notas', '')
  ) returning id into v_id;

  insert into pedido_items (
    pedido_id, producto_id, slug, nombre, subcategoria, material, imagen,
    precio_unitario, cantidad
  )
  select
    v_id,
    it->>'producto_id',
    nullif(it->>'slug', ''),
    it->>'nombre',
    nullif(it->>'subcategoria', ''),
    nullif(it->>'material', ''),
    nullif(it->>'imagen', ''),
    (it->>'precio_unitario')::numeric,
    (it->>'cantidad')::integer
  from jsonb_array_elements(p_items) as it;

  select * into v_row from pedidos where id = v_id;

  return jsonb_build_object(
    'ok', true,
    'pedido', jsonb_build_object(
      'id', v_row.id,
      'numero', v_row.numero,
      'estado', v_row.estado,
      'subtotal', v_row.subtotal,
      'costo_envio', v_row.costo_envio,
      'total', v_row.total,
      'creado_en', v_row.creado_en
    )
  );
end $function$;

-- ── Cancelar devuelve el stock ────────────────────────────────
-- Entrar a "cancelado" devuelve las piezas; salir de "cancelado" las
-- vuelve a reservar. Vale para todos los caminos que mueven el estado:
-- el panel, el cron de pedidos vencidos y lo que venga.
create or replace function stock_segun_estado()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if old.estado <> 'cancelado' and new.estado = 'cancelado' then
    update productos pr
       set stock = pr.stock + i.cantidad
      from pedido_items i
     where i.pedido_id = new.id and pr.id = i.producto_id;
  elsif old.estado = 'cancelado' and new.estado <> 'cancelado' then
    -- Si ya no alcanza, el check de stock >= 0 corta el update.
    -- cambiar_estado_pedido() lo revisa antes para contestar bien.
    update productos pr
       set stock = pr.stock - i.cantidad
      from pedido_items i
     where i.pedido_id = new.id and pr.id = i.producto_id;
  end if;
  return new;
end $$;

create trigger pedidos_stock_segun_estado
  after update of estado on pedidos
  for each row
  when (old.estado is distinct from new.estado)
  execute function stock_segun_estado();

-- Igual que antes, más un control: reactivar un pedido cancelado necesita
-- que las piezas sigan estando.
create or replace function cambiar_estado_pedido(p_id uuid, p_estado text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_antes estado_pedido;
  v_row pedidos;
begin
  select estado into v_antes from pedidos where id = p_id for update;
  if v_antes is null then
    return jsonb_build_object('ok', false, 'error', 'PEDIDO_NO_ENCONTRADO');
  end if;

  if v_antes = 'cancelado' and p_estado <> 'cancelado' and exists (
    select 1
      from pedido_items i
      join productos pr on pr.id = i.producto_id
     where i.pedido_id = p_id and pr.stock < i.cantidad
  ) then
    return jsonb_build_object('ok', false, 'error', 'SIN_STOCK');
  end if;

  update pedidos
     set estado = p_estado::estado_pedido,
         actualizado_en = now()
   where id = p_id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'pedido', jsonb_build_object(
      'id', v_row.id, 'numero', v_row.numero, 'estado', v_row.estado,
      'actualizado_en', v_row.actualizado_en
    )
  );
end $$;

-- ── Permisos ──────────────────────────────────────────────────
revoke all on function catalogo_publico() from public, anon, authenticated;
revoke all on function productos_panel() from public, anon, authenticated;
revoke all on function guardar_producto(jsonb, boolean, integer) from public, anon, authenticated;
revoke all on function borrar_producto(text) from public, anon, authenticated;
revoke all on function importar_productos(jsonb) from public, anon, authenticated;
revoke all on function crear_pedido(jsonb, jsonb) from public, anon, authenticated;
revoke all on function cambiar_estado_pedido(uuid, text) from public, anon, authenticated;
revoke all on function stock_segun_estado() from public, anon, authenticated;

grant execute on function catalogo_publico() to service_role;
grant execute on function productos_panel() to service_role;
grant execute on function guardar_producto(jsonb, boolean, integer) to service_role;
grant execute on function borrar_producto(text) to service_role;
grant execute on function importar_productos(jsonb) to service_role;
grant execute on function crear_pedido(jsonb, jsonb) to service_role;
grant execute on function cambiar_estado_pedido(uuid, text) to service_role;

-- avisos_stock había quedado con los permisos por defecto. RLS ya lo
-- cerraba, pero así queda igual que el resto.
revoke all on avisos_stock from anon, authenticated;
