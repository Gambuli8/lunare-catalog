-- ── Límite de intentos del panel ──────────────────────────────
-- El panel tiene una sola clave compartida. Hasta ahora la única defensa
-- contra probar claves era que fuera larguísima (16 caracteres). Con un
-- límite de intentos alcanza con una de 10:
--
--   - 5 claves mal en 15 minutos desde la misma conexión la bloquean
--     hasta que pasen los 15 minutos.
--   - 30 claves mal en 15 minutos sumando todas las conexiones cierran el
--     login para todos, por si alguien prueba desde muchas a la vez. Quien
--     ya tiene la sesión abierta sigue adentro.
--
-- La IP no se guarda: se guarda un HMAC de la IP con la clave del panel,
-- que arma el servidor. Las filas viejas se borran solas.

create table panel_intentos (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  creado_en  timestamptz not null default now()
);

create index panel_intentos_ip_idx on panel_intentos (ip_hash, creado_en desc);
create index panel_intentos_creado_idx on panel_intentos (creado_en desc);

alter table panel_intentos enable row level security;
revoke all on panel_intentos from anon, authenticated;

-- ¿Se puede probar una clave ahora? Si no, cuántos segundos faltan.
create or replace function panel_puede_intentar(p_ip_hash text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ventana    constant interval := interval '15 minutes';
  v_max_ip     constant integer := 5;
  v_max_total  constant integer := 30;
  v_n          integer;
  v_desde      timestamptz;
  v_espera     integer := 0;
begin
  -- Por conexión: los últimos 5 fallos dentro de la ventana. Se libera
  -- cuando el más viejo de esos 5 sale de la ventana.
  select count(*), min(creado_en) into v_n, v_desde
    from (
      select creado_en from panel_intentos
       where ip_hash = p_ip_hash and creado_en > now() - v_ventana
       order by creado_en desc
       limit v_max_ip
    ) t;
  if v_n >= v_max_ip then
    v_espera := greatest(v_espera, ceil(extract(epoch from (v_desde + v_ventana - now())))::integer);
  end if;

  -- Entre todas las conexiones.
  select count(*), min(creado_en) into v_n, v_desde
    from (
      select creado_en from panel_intentos
       where creado_en > now() - v_ventana
       order by creado_en desc
       limit v_max_total
    ) t;
  if v_n >= v_max_total then
    v_espera := greatest(v_espera, ceil(extract(epoch from (v_desde + v_ventana - now())))::integer);
  end if;

  return jsonb_build_object('ok', v_espera <= 0, 'espera_seg', greatest(v_espera, 0));
end $$;

-- Un fallo suma; un acierto borra los fallos de esa conexión.
create or replace function panel_registrar_intento(p_ip_hash text, p_ok boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_ok then
    delete from panel_intentos where ip_hash = p_ip_hash;
  else
    insert into panel_intentos (ip_hash) values (p_ip_hash);
  end if;

  -- No hace falta guardar nada de más de un día.
  delete from panel_intentos where creado_en < now() - interval '1 day';
end $$;

revoke all on function panel_puede_intentar(text) from public, anon, authenticated;
revoke all on function panel_registrar_intento(text, boolean) from public, anon, authenticated;
grant execute on function panel_puede_intentar(text) to service_role;
grant execute on function panel_registrar_intento(text, boolean) to service_role;
