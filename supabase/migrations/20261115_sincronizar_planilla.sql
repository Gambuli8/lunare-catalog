-- ── Actualizar el catálogo desde la planilla ──────────────────
-- La dueña sigue teniendo la planilla a mano y quiere poder traerla al
-- panel de un toque: las piezas nuevas entran y las que ya están se
-- actualizan con lo que diga la planilla.
--
-- Qué trae: nombre, categoría, medida, material, precios, promo,
-- conjunto, fotos, foto del conjunto, destacada y stock. El costo solo
-- si la planilla publicada tiene esa columna (hoy no: se sacó para que no
-- se filtre), así no se borra el que se cargó en el panel.
--
-- Qué no toca: la descripción, si la pieza está visible y su dirección.
-- Eso se maneja solo desde el panel. Tampoco toca las piezas que están
-- en el panel y no en la planilla.
--
-- El stock: la planilla dice cuántas hay en la mano; en la base "stock"
-- es lo que queda para vender. Se guarda lo de la planilla menos lo
-- reservado en pedidos sin despachar (pendientes y pagados).

create table sincronizaciones (
  id           bigint generated always as identity primary key,
  creado_en    timestamptz not null default now(),
  nuevas       integer not null default 0,
  actualizadas integer not null default 0,
  sin_cambios  integer not null default 0
);

alter table sincronizaciones enable row level security;
revoke all on sincronizaciones from anon, authenticated;

-- Lo reservado por pieza, para que el panel muestre el stock que va a
-- quedar antes de aplicar.
create or replace function stock_reservado()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(producto_id, unidades), '{}'::jsonb) from stock_comprometido;
$$;

create or replace function ultima_sincronizacion()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select to_jsonb(s) from sincronizaciones s order by creado_en desc limit 1;
$$;

create or replace function sincronizar_productos(p_productos jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_p            jsonb;
  v_id           text;
  v_slug         text;
  v_stock        integer;
  v_filas        integer;
  v_nuevas       integer := 0;
  v_actualizadas integer := 0;
  v_iguales      integer := 0;
  v_errores      jsonb := '[]'::jsonb;
  v_fotos        text[];
begin
  -- Que dos sincronizaciones a la vez no se pisen, ni con un pedido.
  perform pg_advisory_xact_lock(hashtext('crear_pedido'));

  for v_p in select * from jsonb_array_elements(p_productos) loop
    v_id := trim(v_p->>'id');
    v_fotos := array(select jsonb_array_elements_text(coalesce(v_p->'fotos', '[]'::jsonb)));
    v_stock := greatest(
      round((v_p->>'stock')::numeric)::integer
        - coalesce((select unidades from stock_comprometido where producto_id = v_id), 0),
      0
    );

    begin
      if exists (select 1 from productos where id = v_id) then
        update productos set
          nombre          = trim(v_p->>'nombre'),
          categoria       = v_p->>'categoria',
          subcategoria    = coalesce(v_p->>'subcategoria', ''),
          material        = v_p->>'material',
          precio          = round((v_p->>'precio')::numeric)::integer,
          precio_promo    = round((v_p->>'precio_promo')::numeric)::integer,
          precio_conjunto = round((v_p->>'precio_conjunto')::numeric)::integer,
          precio_costo    = case when v_p ? 'precio_costo'
                              then round((v_p->>'precio_costo')::numeric)::integer
                              else precio_costo end,
          stock           = v_stock,
          fotos           = v_fotos,
          foto_conjunto   = coalesce(v_p->>'foto_conjunto', ''),
          destacado       = coalesce((v_p->>'destacado')::boolean, false)
        where id = v_id
          and (nombre, categoria, subcategoria, material, precio, precio_promo,
               precio_conjunto, stock, fotos, foto_conjunto, destacado,
               precio_costo)
              is distinct from
              (trim(v_p->>'nombre'), v_p->>'categoria', coalesce(v_p->>'subcategoria', ''),
               v_p->>'material', round((v_p->>'precio')::numeric)::integer,
               round((v_p->>'precio_promo')::numeric)::integer,
               round((v_p->>'precio_conjunto')::numeric)::integer, v_stock, v_fotos,
               coalesce(v_p->>'foto_conjunto', ''), coalesce((v_p->>'destacado')::boolean, false),
               case when v_p ? 'precio_costo'
                 then round((v_p->>'precio_costo')::numeric)::integer
                 else precio_costo end);
        get diagnostics v_filas = row_count;
        if v_filas > 0 then v_actualizadas := v_actualizadas + 1; else v_iguales := v_iguales + 1; end if;
      else
        v_slug := v_p->>'slug';
        if v_slug is null or exists (select 1 from productos where slug = v_slug) then
          v_slug := coalesce(v_slug || '-', '') || lower(regexp_replace(v_id, '[^A-Za-z0-9]+', '-', 'g'));
        end if;

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
          v_stock,
          v_fotos,
          coalesce(v_p->>'foto_conjunto', ''),
          '',
          coalesce((v_p->>'destacado')::boolean, false),
          true,
          v_slug,
          coalesce((v_p->>'orden')::integer, (select coalesce(max(orden), 0) + 1 from productos))
        );
        v_nuevas := v_nuevas + 1;
      end if;
    exception when others then
      v_errores := v_errores || jsonb_build_object('id', v_id, 'error', sqlerrm);
    end;
  end loop;

  insert into sincronizaciones (nuevas, actualizadas, sin_cambios)
  values (v_nuevas, v_actualizadas, v_iguales);

  return jsonb_build_object(
    'ok', true,
    'nuevas', v_nuevas,
    'actualizadas', v_actualizadas,
    'sin_cambios', v_iguales,
    'errores', v_errores
  );
end $$;

revoke all on function stock_reservado() from public, anon, authenticated;
revoke all on function ultima_sincronizacion() from public, anon, authenticated;
revoke all on function sincronizar_productos(jsonb) from public, anon, authenticated;
grant execute on function stock_reservado() to service_role;
grant execute on function ultima_sincronizacion() to service_role;
grant execute on function sincronizar_productos(jsonb) to service_role;
