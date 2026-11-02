-- =====================================================================
-- HomeAssist · Esquema PostgreSQL para Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Refleja los tipos de `types/index.ts`.
--   · Contraseñas: las gestiona Supabase Auth con hash (RNF-05).
--   · Autorización por fila con RLS (RNF-06 / RNF-14).
-- =====================================================================

create type user_role       as enum ('principal', 'contact', 'admin');
create type device_status   as enum ('connected', 'disconnected');
create type sensor_type     as enum ('temperature', 'motion', 'door', 'gas', 'sos');
create type event_kind      as enum ('reading','motion_detected','door_opened','door_closed','gas_threshold',
                                     'temperature_threshold','sos_pressed','device_connected','device_disconnected');
create type severity        as enum ('info', 'warning', 'emergency');
create type alert_status    as enum ('pending', 'attended');
create type contact_status  as enum ('active', 'invited', 'suspended');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null,
  email       text not null unique,
  phone       text,
  role        user_role not null default 'principal',
  owner_id    uuid references profiles(id) on delete set null,  -- contacto: quién lo autorizó
  created_at  timestamptz not null default now()
);

create table rooms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (owner_id, name)
);

create table devices (
  id             uuid primary key default gen_random_uuid(),
  device_uid     text not null unique,                 -- HA-ESP32-XXXX (HU-04)
  owner_id       uuid not null unique references profiles(id) on delete cascade,  -- un dispositivo por hogar
  name           text not null,
  model          text not null default 'ESP32',
  status         device_status not null default 'disconnected',
  wifi_ssid      text,
  wifi_rssi      int,
  firmware       text,
  ip_address     text,
  last_sync_at   timestamptz,
  registered_at  timestamptz not null default now()
);

create table sensors (
  id               uuid primary key default gen_random_uuid(),
  device_id        uuid not null references devices(id) on delete cascade,
  room_id          uuid references rooms(id) on delete set null,
  type             sensor_type not null,
  hardware_id      text not null,
  name             text not null,
  enabled          boolean not null default true,
  threshold        numeric,
  last_value       numeric,                            -- última lectura (dashboard en tiempo real)
  last_reading_at  timestamptz,
  last_event_at    timestamptz,
  created_at       timestamptz not null default now(),
  unique (device_id, hardware_id)
);

create table sensor_readings (
  id           bigint generated always as identity primary key,
  sensor_id    uuid not null references sensors(id) on delete cascade,
  value        numeric not null,
  recorded_at  timestamptz not null default now()      -- RF-15
);
create index sensor_readings_sensor_time on sensor_readings (sensor_id, recorded_at desc);

create table events (
  id           uuid primary key default gen_random_uuid(),
  device_id    uuid not null references devices(id) on delete cascade,
  sensor_id    uuid references sensors(id) on delete set null,
  room_id      uuid references rooms(id) on delete set null,
  kind         event_kind not null,
  severity     severity not null default 'info',
  description  text not null,
  value        numeric,
  occurred_at  timestamptz not null default now()
);
create index events_device_time on events (device_id, occurred_at desc);

create table alerts (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references events(id) on delete cascade,
  device_id         uuid not null references devices(id) on delete cascade,
  sensor_id         uuid references sensors(id) on delete set null,
  room_id           uuid references rooms(id) on delete set null,
  severity          severity not null,
  title             text not null,
  message           text not null,
  status            alert_status not null default 'pending',
  created_at        timestamptz not null default now(),
  attended_at       timestamptz,
  attended_by       uuid references profiles(id) on delete set null,
  attended_by_name  text
);
create index alerts_device_status_time on alerts (device_id, status, created_at desc);

create table authorized_contacts (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references profiles(id) on delete cascade,
  user_id            uuid references profiles(id) on delete set null,
  name               text not null,
  email              text not null,
  phone              text,
  relationship       text not null,
  status             contact_status not null default 'invited',
  can_view_alerts    boolean not null default true,
  can_view_history   boolean not null default false,
  can_attend_alerts  boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (owner_id, email)
);

create table system_settings (
  owner_id                 uuid primary key references profiles(id) on delete cascade,
  temperature_max          numeric not null default 32,
  temperature_min          numeric not null default 12,
  gas_threshold_ppm        int     not null default 400,
  offline_after_seconds    int     not null default 60,
  buzzer_enabled           boolean not null default true,
  motion_alerts_when_away  boolean not null default false
);

-- ---------------------------------------------------------------------
-- Alta automática al registrarse (HU-01)
--   · Si el correo fue invitado como contacto autorizado → rol "contact" y se vincula (HU-17/18).
--   · Si no → usuario principal con habitaciones y parámetros por defecto.
-- ---------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invite authorized_contacts%rowtype;
  display_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
begin
  select * into invite from authorized_contacts
   where lower(email) = lower(new.email) and user_id is null
   order by created_at limit 1;

  if found then
    insert into profiles (id, name, email, role, owner_id)
    values (new.id, display_name, new.email, 'contact', invite.owner_id);
    update authorized_contacts
       set user_id = new.id, status = case when status = 'invited' then 'active'::contact_status else status end
     where id = invite.id;
  else
    insert into profiles (id, name, email, role) values (new.id, display_name, new.email, 'principal');
    insert into system_settings (owner_id) values (new.id);
    insert into rooms (owner_id, name)
    values (new.id, 'Sala'), (new.id, 'Cocina'), (new.id, 'Entrada'), (new.id, 'Habitación principal');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table profiles            enable row level security;
alter table rooms               enable row level security;
alter table devices             enable row level security;
alter table sensors             enable row level security;
alter table sensor_readings     enable row level security;
alter table events              enable row level security;
alter table alerts              enable row level security;
alter table authorized_contacts enable row level security;
alter table system_settings     enable row level security;

-- ¿El usuario actual es dueño del hogar o un contacto activo con cierto permiso?
create or replace function can_access_owner(owner uuid, need text default 'status')
returns boolean language sql stable security definer set search_path = public as $$
  select owner = auth.uid() or exists (
    select 1 from authorized_contacts c
    where c.owner_id = owner and c.user_id = auth.uid() and c.status = 'active'
      and case need
            when 'alerts'  then c.can_view_alerts
            when 'history' then c.can_view_history
            when 'attend'  then c.can_view_alerts and c.can_attend_alerts
            else true
          end
  );
$$;

create or replace function owns_device(dev uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from devices d where d.id = dev and d.owner_id = auth.uid());
$$;

create or replace function device_owner(dev uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select owner_id from devices where id = dev;
$$;

create policy "ver perfil propio o del hogar autorizado" on profiles for select
  using (id = auth.uid() or can_access_owner(id));
create policy "editar perfil propio" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "ver habitaciones" on rooms for select using (can_access_owner(owner_id));
create policy "gestionar habitaciones" on rooms for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "ver dispositivo" on devices for select using (can_access_owner(owner_id));
create policy "gestionar dispositivo" on devices for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "ver sensores" on sensors for select using (can_access_owner(device_owner(device_id)));
create policy "gestionar sensores" on sensors for all
  using (owns_device(device_id)) with check (owns_device(device_id));

create policy "ver lecturas" on sensor_readings for select
  using (exists (select 1 from sensors s where s.id = sensor_id and can_access_owner(device_owner(s.device_id))));

create policy "ver eventos" on events for select
  using (owns_device(device_id) or can_access_owner(device_owner(device_id), 'history'));
create policy "registrar eventos propios" on events for insert with check (owns_device(device_id));

create policy "ver alertas" on alerts for select
  using (owns_device(device_id) or can_access_owner(device_owner(device_id), 'alerts'));
create policy "atender alertas" on alerts for update
  using (owns_device(device_id) or can_access_owner(device_owner(device_id), 'attend'))
  with check (owns_device(device_id) or can_access_owner(device_owner(device_id), 'attend'));

create policy "gestionar contactos" on authorized_contacts for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "contacto ve su autorización" on authorized_contacts for select using (user_id = auth.uid());

create policy "ver parámetros" on system_settings for select using (can_access_owner(owner_id));
create policy "editar parámetros" on system_settings for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Las escrituras del ESP32 (lecturas, eventos, alertas) entran por
-- app/api/device/readings con la service role key, que omite RLS.

-- ---------------------------------------------------------------------
-- Tiempo real para el dashboard
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table devices, sensors, events, alerts;

-- ---------------------------------------------------------------------
-- Permisos de ejecución: las funciones auxiliares no deben poder llamarse
-- sin sesión; el trigger de alta no se expone por la API.
-- ---------------------------------------------------------------------
revoke execute on function handle_new_user() from public, anon, authenticated;

revoke execute on function can_access_owner(uuid, text) from public, anon;
revoke execute on function owns_device(uuid) from public, anon;
revoke execute on function device_owner(uuid) from public, anon;

grant execute on function can_access_owner(uuid, text) to authenticated;
grant execute on function owns_device(uuid) to authenticated;
grant execute on function device_owner(uuid) to authenticated;

-- =====================================================================
-- Migraciones posteriores (ya aplicadas en el proyecto; se ejecutan en orden)
-- =====================================================================

-- 1) Muestreo del historial de lecturas y detección de desconexión en el servidor (RNF-11)
alter table sensors add column if not exists last_stored_at timestamptz;
alter table sensors add column if not exists last_stored_value numeric;

create or replace function mark_offline_devices()
returns void language plpgsql security definer set search_path = public as $$
declare
  d record;
  ev uuid;
begin
  for d in
    select dv.id, dv.last_sync_at
      from devices dv
      left join system_settings s on s.owner_id = dv.owner_id
     where dv.status = 'connected'
       and dv.last_sync_at is not null
       and dv.last_sync_at < now() - make_interval(secs => coalesce(s.offline_after_seconds, 60))
  loop
    update devices set status = 'disconnected' where id = d.id;
    insert into events (device_id, kind, severity, description, occurred_at)
    values (d.id, 'device_disconnected', 'warning', 'Se perdió la comunicación con el ESP32', d.last_sync_at)
    returning id into ev;
    if not exists (select 1 from alerts where device_id = d.id and status = 'pending' and title = 'Dispositivo desconectado') then
      insert into alerts (event_id, device_id, severity, title, message)
      values (ev, d.id, 'warning', 'Dispositivo desconectado', 'El ESP32 dejó de enviar datos. Revisa su alimentación y la red Wi-Fi.');
    end if;
  end loop;
end;
$$;
revoke execute on function mark_offline_devices() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('homeassist-offline-check', '* * * * *', 'select public.mark_offline_devices()');
select cron.schedule('homeassist-readings-retention', '15 3 * * *',
  $$delete from public.sensor_readings where recorded_at < now() - interval '30 days'$$);

-- 2) Funciones de permisos fuera de la API pública
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.can_access_owner(uuid, text) set schema private;
alter function public.owns_device(uuid) set schema private;
alter function public.device_owner(uuid) set schema private;
grant execute on function private.can_access_owner(uuid, text) to authenticated;
grant execute on function private.owns_device(uuid) to authenticated;
grant execute on function private.device_owner(uuid) to authenticated;

-- 3) Rendimiento de RLS: auth.uid() una vez por consulta y sin políticas duplicadas en lectura
drop policy "ver perfil propio o del hogar autorizado" on profiles;
drop policy "editar perfil propio" on profiles;
create policy "ver perfil propio o del hogar autorizado" on profiles for select
  using (id = (select auth.uid()) or private.can_access_owner(id));
create policy "editar perfil propio" on profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy "gestionar habitaciones" on rooms;
create policy "crear habitaciones" on rooms for insert with check (owner_id = (select auth.uid()));
create policy "editar habitaciones" on rooms for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "eliminar habitaciones" on rooms for delete using (owner_id = (select auth.uid()));

drop policy "gestionar dispositivo" on devices;
create policy "crear dispositivo" on devices for insert with check (owner_id = (select auth.uid()));
create policy "editar dispositivo" on devices for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "eliminar dispositivo" on devices for delete using (owner_id = (select auth.uid()));

drop policy "gestionar sensores" on sensors;
create policy "crear sensores" on sensors for insert with check (private.owns_device(device_id));
create policy "editar sensores" on sensors for update using (private.owns_device(device_id)) with check (private.owns_device(device_id));
create policy "eliminar sensores" on sensors for delete using (private.owns_device(device_id));

drop policy "gestionar contactos" on authorized_contacts;
drop policy "contacto ve su autorización" on authorized_contacts;
create policy "ver contactos" on authorized_contacts for select
  using (owner_id = (select auth.uid()) or user_id = (select auth.uid()));
create policy "crear contactos" on authorized_contacts for insert with check (owner_id = (select auth.uid()));
create policy "editar contactos" on authorized_contacts for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "eliminar contactos" on authorized_contacts for delete using (owner_id = (select auth.uid()));

drop policy "editar parámetros" on system_settings;
create policy "crear parámetros" on system_settings for insert with check (owner_id = (select auth.uid()));
create policy "editar parámetros" on system_settings for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create index if not exists alerts_attended_by_idx on alerts (attended_by);
create index if not exists alerts_event_id_idx on alerts (event_id);
create index if not exists alerts_room_id_idx on alerts (room_id);
create index if not exists alerts_sensor_id_idx on alerts (sensor_id);
create index if not exists authorized_contacts_user_id_idx on authorized_contacts (user_id);
create index if not exists events_room_id_idx on events (room_id);
create index if not exists events_sensor_id_idx on events (sensor_id);
create index if not exists profiles_owner_id_idx on profiles (owner_id);
create index if not exists sensors_room_id_idx on sensors (room_id);

-- 4) Ingesta del ESP32 dentro de la base de datos (sin service_role key en el servidor).
--    Definición completa en la migración "ingest_device_report_rpc" del proyecto:
--    private.ingest_keys (hash SHA-256 de DEVICE_API_KEY), private.add_event(...) y
--    public.ingest_device_report(p_key text, p_report jsonb) returns jsonb, ejecutable por anon.
--    Registrar la clave:  insert into private.ingest_keys (key_hash) values ('<sha256 hex>');
