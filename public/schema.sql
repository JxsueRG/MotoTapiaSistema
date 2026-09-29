-- La API crea esta tabla sola la primera vez. Este archivo es solo de referencia.
create table if not exists recepciones (
  id serial primary key,
  creado timestamptz not null default now(),
  nombre text, marca text, modelo text, placas text,
  data jsonb not null  -- cliente, moto, inventario, fotos, firma, presupuesto...
);
