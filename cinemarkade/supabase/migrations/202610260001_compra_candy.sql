-- Compra independiente de candy. Ejecutar manualmente en Supabase.
-- Ejecutar en el SQL Editor. Requiere compra.codigo_manual ya creada.
-- Si estado es un enum, habilita el estado consumido antes de la transacción
-- que instala las funciones. Los valores enum nuevos requieren un COMMIT.
BEGIN;

DO $$
DECLARE
    v_tipo record;
BEGIN
    SELECT n.nspname AS esquema, t.typname AS nombre, t.oid AS id
    INTO v_tipo
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE a.attrelid = 'public.compra'::regclass
        AND a.attname = 'estado'
        AND t.typtype = 'e';

    IF FOUND AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_enum
        WHERE enumtypid = v_tipo.id AND enumlabel = 'utilizada'
    ) THEN
        EXECUTE format('ALTER TYPE %I.%I ADD VALUE %L', v_tipo.esquema, v_tipo.nombre, 'utilizada');
    END IF;
END;
$$;

COMMIT;

BEGIN;

-- Serializa la asignación y reintenta antes de insertar un código repetido.
CREATE OR REPLACE FUNCTION public.asignar_codigo_manual_compra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM pg_catalog.pg_advisory_xact_lock(20261025, 1);

    LOOP
        NEW.codigo_manual := upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 10));

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM public.compra WHERE codigo_manual = NEW.codigo_manual
        );
    END LOOP;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.asignar_codigo_manual_compra() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS compra_asignar_codigo_manual ON public.compra;
CREATE TRIGGER compra_asignar_codigo_manual
BEFORE INSERT ON public.compra
FOR EACH ROW EXECUTE FUNCTION public.asignar_codigo_manual_compra();


-- El esquema esperado por las funciones de compra existentes debe estar presente.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'compra' AND column_name = 'proyeccion_id'
    ) THEN
        RAISE EXCEPTION 'Falta compra.proyeccion_id. Revisar el esquema real antes de instalar este script';
    END IF;
END;
$$;

-- Las entradas conservan su función; candy se registra sin una función ficticia.
ALTER TABLE public.compra ALTER COLUMN proyeccion_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.confirmar_compra_con_recompensas(p_datos jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_candy boolean := coalesce(p_datos->>'tipo_compra', 'entradas') = 'candy';
  v_solicitud uuid := (p_datos->>'solicitud_id')::uuid;
  v_id uuid;
  v_existente public.compra%ROWTYPE;
  v_proyeccion bigint := (p_datos->>'proyeccion_id')::bigint;
  v_formato text;
  v_fecha date;
  v_horario time;
  v_edad text;
  v_nacimiento date;
  v_tarifa numeric;
  v_saldo bigint;
  v_puntos bigint := 0;
  v_generados bigint := 0;
  v_subtotal numeric := 0;
  v_vip numeric := 0;
  v_total numeric;
  v_descuento numeric := 0;
  v_cupon public.cupon%ROWTYPE;
  v_r public.recompensa%ROWTYPE;
  v_item jsonb;
  v_asiento record;
  v_cantidad integer;
  v_precio numeric;
  v_nombre text;
  v_butacas jsonb := '[]';
  v_detalles jsonb := '[]';
  v_canjes jsonb := coalesce(p_datos->'recompensas', '[]');
  v_entradas jsonb := coalesce(p_datos->'butacas', '[]');
  v_productos jsonb := coalesce(p_datos->'detalles', '[]');
  v_medio text;
  v_recompensa bigint;
  v_parte bigint;
  v_indice integer;
  v_cantidad_entradas integer;
BEGIN
  IF coalesce(p_datos->>'tipo_compra', 'entradas') NOT IN ('entradas', 'candy') OR
     v_solicitud IS NULL OR (NOT v_candy AND v_proyeccion IS NULL) OR (v_candy AND v_proyeccion IS NOT NULL) OR
     jsonb_typeof(v_canjes) <> 'array' OR jsonb_typeof(v_entradas) <> 'array' OR jsonb_typeof(v_productos) <> 'array' THEN
    RAISE EXCEPTION 'La solicitud no es válida';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_solicitud::text, 0));
  SELECT * INTO v_existente FROM public.compra WHERE solicitud_id = v_solicitud;
  IF FOUND THEN
    IF v_existente.usuario_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'La solicitud pertenece a otro usuario'; END IF;
    RETURN v_existente.id;
  END IF;
  v_cantidad_entradas := jsonb_array_length(v_entradas);
  IF (NOT v_candy AND v_cantidad_entradas NOT BETWEEN 1 AND 8) OR
     (v_candy AND (v_cantidad_entradas <> 0 OR jsonb_array_length(v_productos) + jsonb_array_length(v_canjes) = 0)) OR
     jsonb_array_length(v_canjes) > 30 OR jsonb_array_length(v_productos) > 100 THEN
    RAISE EXCEPTION 'La cantidad de artículos no es válida';
  END IF;
  IF (SELECT count(DISTINCT x->>'butaca_proyeccion_id') FROM jsonb_array_elements(v_entradas) x) <> v_cantidad_entradas OR
     (SELECT count(DISTINCT x->>'recompensa_id') FROM jsonb_array_elements(v_canjes) x) <> jsonb_array_length(v_canjes) THEN
    RAISE EXCEPTION 'Hay butacas o recompensas duplicadas';
  END IF;
  IF NOT v_candy THEN
    SELECT f.formato, f.fecha, p.horario::time, pe.restriccion_edad
      INTO v_formato, v_fecha, v_horario, v_edad
      FROM public.proyeccion p JOIN public.funcion f ON f.id = p.funcion_id
      JOIN public.pelicula pe ON pe.id = f.pelicula_id JOIN public.sala s ON s.id = f.sala_id
      WHERE p.id = v_proyeccion AND p.activa AND f.activa AND pe.activa AND s.activa
      FOR SHARE OF p, f, pe, s;
    IF NOT FOUND OR v_fecha + v_horario <= timezone('America/Argentina/Buenos_Aires', now()) THEN
      RAISE EXCEPTION 'La proyección ya no está disponible';
    END IF;
    SELECT precio_base INTO v_tarifa FROM public.tarifa_formato WHERE formato::text = v_formato FOR SHARE;
    IF v_tarifa IS NULL OR v_tarifa < 0 THEN RAISE EXCEPTION 'No hay tarifa válida para el formato'; END IF;
    IF extract(isodow FROM v_fecha) BETWEEN 1 AND 3 THEN v_tarifa := v_tarifa * 0.5; END IF;
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT coalesce(puntos, 0), fecha_nacimiento INTO v_saldo, v_nacimiento FROM public.usuario WHERE id = v_uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el perfil'; END IF;
    IF v_edad IN ('+13', '+16', '+18') AND (v_nacimiento IS NULL OR extract(year FROM age(v_fecha, v_nacimiento)) < substring(v_edad FROM 2)::integer) THEN
      RAISE EXCEPTION 'No cumplís la edad mínima para esta película';
    END IF;
  ELSIF jsonb_array_length(v_canjes) > 0 OR nullif(p_datos->>'cupon_codigo', '') IS NOT NULL THEN
    RAISE EXCEPTION 'Iniciá sesión para usar puntos o cupones';
  END IF;

  -- Bloqueo en orden fijo para impedir que dos compras ocupen una misma butaca.
  PERFORM bp.id FROM public.butaca_proyeccion bp
    WHERE bp.id IN (SELECT (x->>'butaca_proyeccion_id')::bigint FROM jsonb_array_elements(v_entradas) x)
    ORDER BY bp.id FOR UPDATE;
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_entradas) LOOP
    SELECT bp.id, bp.estado, b.tipo INTO v_asiento FROM public.butaca_proyeccion bp JOIN public.butaca b ON b.id = bp.butaca_id
      WHERE bp.id = (v_item->>'butaca_proyeccion_id')::bigint AND bp.proyeccion_id = v_proyeccion;
    IF NOT FOUND OR v_asiento.estado::text <> 'libre' THEN RAISE EXCEPTION 'Una butaca ya no está disponible'; END IF;
    v_recompensa := (v_item->>'recompensa_id')::bigint;
    v_medio := v_item->>'medio_pago';
    IF v_medio IS NULL OR v_medio NOT IN ('dinero', 'puntos') OR (v_medio = 'puntos') <> (v_recompensa IS NOT NULL) THEN
      RAISE EXCEPTION 'El medio de pago de una entrada no es válido';
    END IF;
    IF v_medio = 'dinero' THEN v_subtotal := v_subtotal + v_tarifa; END IF;
    IF v_asiento.tipo::text = 'vip' THEN v_vip := v_vip + 5000; END IF;
    v_butacas := v_butacas || jsonb_build_array(jsonb_build_object(
      'butaca_proyeccion_id', v_asiento.id, 'medio_pago', v_medio, 'recompensa_id', v_recompensa,
      'precio_unitario', CASE WHEN v_medio = 'dinero' THEN v_tarifa ELSE 0 END + CASE WHEN v_asiento.tipo::text = 'vip' THEN 5000 ELSE 0 END,
      'puntos_usados', 0));
  END LOOP;

  IF v_candy AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_productos) x
    GROUP BY x->>'tipo_item', coalesce(x->>'producto_id', x->>'combo_id')
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay artículos duplicados en el pedido de candy';
  END IF;

  -- Los artículos en dinero se reconstruyen con precios actuales.
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_productos) LOOP
    v_cantidad := (v_item->>'cantidad')::integer;
    IF v_cantidad IS NULL OR v_cantidad NOT BETWEEN 1 AND (CASE WHEN v_candy THEN 99 ELSE 10 END) OR v_item->>'medio_pago' IS DISTINCT FROM 'dinero' THEN
      RAISE EXCEPTION 'El detalle de compra no es válido';
    END IF;
    IF v_item->>'tipo_item' = 'producto' THEN
      SELECT nombre, precio INTO v_nombre, v_precio FROM public.producto WHERE id = (v_item->>'producto_id')::bigint AND activa FOR SHARE;
    ELSIF v_item->>'tipo_item' = 'combo' THEN
      SELECT nombre, precio INTO v_nombre, v_precio FROM public.combo WHERE id = (v_item->>'combo_id')::bigint AND activo
        AND (fecha_inicio IS NULL OR fecha_inicio::date <= timezone('America/Argentina/Buenos_Aires', now())::date)
        AND (fecha_fin IS NULL OR fecha_fin::date >= timezone('America/Argentina/Buenos_Aires', now())::date) FOR SHARE;
    ELSE RAISE EXCEPTION 'Tipo de artículo inválido'; END IF;
    IF NOT FOUND OR v_precio IS NULL OR v_precio < 0 THEN RAISE EXCEPTION 'Un artículo ya no está disponible'; END IF;
    v_subtotal := v_subtotal + v_precio * v_cantidad;
    v_detalles := v_detalles || jsonb_build_array(jsonb_build_object(
      'producto_id', CASE WHEN v_item->>'tipo_item' = 'producto' THEN (v_item->>'producto_id')::bigint END,
      'combo_id', CASE WHEN v_item->>'tipo_item' = 'combo' THEN (v_item->>'combo_id')::bigint END,
      'tipo_item', v_item->>'tipo_item', 'nombre_item', v_nombre, 'cantidad', v_cantidad,
      'precio_unitario', v_precio, 'medio_pago', 'dinero', 'puntos_usados', 0, 'puntos_generados', 0));
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_canjes) ORDER BY (value->>'recompensa_id')::bigint LOOP
    SELECT * INTO v_r FROM public.recompensa WHERE id = (v_item->>'recompensa_id')::bigint AND activa FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Una recompensa ya no está disponible'; END IF;
    v_cantidad := (v_item->>'cantidad')::integer;
    IF v_cantidad IS NULL OR v_cantidad NOT BETWEEN 1 AND (CASE WHEN v_candy THEN 99 ELSE 10 END) OR (v_item->>'costo_puntos')::bigint IS DISTINCT FROM v_r.costo_puntos OR (v_item->>'version')::integer IS DISTINCT FROM v_r.version THEN
      RAISE EXCEPTION 'La recompensa cambió. Volvé a seleccionarla';
    END IF;
    v_puntos := v_puntos + v_r.costo_puntos * v_cantidad;
    IF v_candy AND (v_r.tipo = 'entrada' OR v_r.cantidad * v_cantidad > 99) THEN
      RAISE EXCEPTION 'El canje no corresponde a candy o supera las 99 unidades';
    END IF;
    IF v_r.tipo = 'entrada' THEN
      IF v_r.formato <> v_formato OR (SELECT count(*) FROM jsonb_array_elements(v_butacas) x WHERE (x->>'recompensa_id')::bigint = v_r.id) <> v_r.cantidad * v_cantidad THEN
        RAISE EXCEPTION 'Las entradas del canje no coinciden con el formato o cantidad';
      END IF;
      -- Distribuir puntos enteros entre butacas sin perder restos.
      v_indice := 0;
      FOR v_recompensa IN SELECT ordinality::integer - 1 FROM jsonb_array_elements(v_butacas) WITH ORDINALITY x(value, ordinality)
        WHERE (value->>'recompensa_id')::bigint = v_r.id LOOP
        v_parte := (v_r.costo_puntos * v_cantidad) / (v_r.cantidad * v_cantidad) + CASE WHEN v_indice < (v_r.costo_puntos * v_cantidad) % (v_r.cantidad * v_cantidad) THEN 1 ELSE 0 END;
        v_butacas := jsonb_set(v_butacas, ARRAY[v_recompensa::text, 'puntos_usados'], to_jsonb(v_parte));
        v_indice := v_indice + 1;
      END LOOP;
    ELSE
      IF v_r.tipo = 'producto' THEN
        SELECT nombre INTO v_nombre FROM public.producto WHERE id = v_r.producto_id AND activa FOR SHARE;
      ELSE
        SELECT nombre INTO v_nombre FROM public.combo WHERE id = v_r.combo_id AND activo
          AND (fecha_inicio IS NULL OR fecha_inicio::date <= timezone('America/Argentina/Buenos_Aires', now())::date)
          AND (fecha_fin IS NULL OR fecha_fin::date >= timezone('America/Argentina/Buenos_Aires', now())::date) FOR SHARE;
      END IF;
      IF NOT FOUND THEN RAISE EXCEPTION 'El contenido de una recompensa ya no está disponible'; END IF;
      v_detalles := v_detalles || jsonb_build_array(jsonb_build_object('producto_id', v_r.producto_id,
        'combo_id', v_r.combo_id, 'tipo_item', v_r.tipo, 'nombre_item', v_nombre,
        'cantidad', v_r.cantidad * v_cantidad, 'precio_unitario', 0, 'medio_pago', 'puntos',
        'puntos_usados', v_r.costo_puntos * v_cantidad, 'puntos_generados', 0));
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_butacas) b WHERE b->>'medio_pago' = 'puntos' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_canjes) c WHERE c->>'recompensa_id' = b->>'recompensa_id')) THEN
    RAISE EXCEPTION 'Falta la recompensa de una entrada';
  END IF;
  IF v_puntos > 0 AND (v_saldo IS NULL OR v_saldo < v_puntos) THEN RAISE EXCEPTION 'No tenés puntos suficientes'; END IF;

  IF nullif(p_datos->>'cupon_codigo', '') IS NOT NULL THEN
    SELECT * INTO v_cupon FROM public.cupon WHERE upper(codigo) = upper(p_datos->>'cupon_codigo') AND activa
      AND fecha_inicio::date <= timezone('America/Argentina/Buenos_Aires', now())::date
      AND fecha_fin::date >= timezone('America/Argentina/Buenos_Aires', now())::date FOR SHARE;
    IF NOT FOUND OR v_cupon.porcentaje_descuento NOT BETWEEN 0 AND 100 OR
      (coalesce(v_cupon.edad_minima, 0) > 0 AND (v_nacimiento IS NULL OR extract(year FROM age(timezone('America/Argentina/Buenos_Aires', now())::date, v_nacimiento)) < v_cupon.edad_minima)) THEN
      RAISE EXCEPTION 'El cupón no está vigente o no cumplís sus requisitos';
    END IF;
    v_descuento := v_cupon.porcentaje_descuento;
  END IF;
  v_total := greatest(0, v_subtotal * (1 - v_descuento / 100)) + v_vip;
  IF (p_datos->>'total')::numeric IS NULL OR abs(v_total - (p_datos->>'total')::numeric) > 0.01 THEN
    RAISE EXCEPTION 'Los precios cambiaron. Volvé a preparar la compra';
  END IF;
  v_generados := CASE WHEN v_uid IS NULL THEN 0 ELSE floor(v_total)::bigint END;
  v_id := gen_random_uuid();
  INSERT INTO public.compra(id, usuario_id, proyeccion_id, estado, total, creditos_usados, puntos_generados, codigo_qr, solicitud_id, fecha_compra)
    VALUES (v_id, v_uid, v_proyeccion, 'confirmada', v_total, 0, v_generados, v_id::text, v_solicitud, now());
  INSERT INTO public.compra_butaca(compra_id, butaca_proyeccion_id, medio_pago, precio_unitario, puntos_usados)
    SELECT v_id, r.butaca_proyeccion_id, r.medio_pago, r.precio_unitario, r.puntos_usados
    FROM jsonb_populate_recordset(NULL::public.compra_butaca, v_butacas) r;
  INSERT INTO public.detalle_compra(compra_id, producto_id, combo_id, tipo_item, nombre_item, cantidad, precio_unitario, medio_pago, puntos_usados, puntos_generados)
    SELECT v_id, r.producto_id, r.combo_id, r.tipo_item, r.nombre_item, r.cantidad, r.precio_unitario, r.medio_pago, r.puntos_usados, r.puntos_generados
    FROM jsonb_populate_recordset(NULL::public.detalle_compra, v_detalles) r;
  UPDATE public.butaca_proyeccion SET estado = 'ocupada' WHERE id IN
    (SELECT (x->>'butaca_proyeccion_id')::bigint FROM jsonb_array_elements(v_butacas) x);
  INSERT INTO public.canje_recompensa(usuario_id, compra_id, recompensa_id, nombre, tipo, formato, producto_id, combo_id, cantidad, unidades, costo_unitario_puntos, puntos_utilizados)
    SELECT v_uid, v_id, r.id, r.nombre, r.tipo, r.formato, r.producto_id, r.combo_id, (x->>'cantidad')::integer,
      r.cantidad * (x->>'cantidad')::integer, r.costo_puntos, r.costo_puntos * (x->>'cantidad')::integer
    FROM jsonb_array_elements(v_canjes) x JOIN public.recompensa r ON r.id = (x->>'recompensa_id')::bigint;
  IF v_uid IS NOT NULL THEN
    UPDATE public.usuario SET puntos = v_saldo - v_puntos + v_generados WHERE id = v_uid;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.confirmar_compra_con_recompensas(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_compra_con_recompensas(jsonb) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.datos_ticket_compra(p_compra_id uuid)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'compra', to_jsonb(c),
        'pelicula', coalesce(pe.nombre, 'Pedido de candy'),
        'fecha', coalesce(f.fecha::text, (timezone('America/Argentina/Buenos_Aires', coalesce(c.fecha_compra, now()))::date)::text),
        'horario', coalesce(p.horario::text, ''),
        'sala_id', coalesce(f.sala_id, 0),
        'formato', coalesce(f.formato::text, ''),
        'idioma', coalesce(f.idioma::text, ''),
        'butacas', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'fila', b.fila,
                'columna', b.columna,
                'tipo', b.tipo,
                'precio_unitario', cb.precio_unitario,
                'puntos_usados', cb.puntos_usados
            ) ORDER BY cb.id)
            FROM public.compra_butaca cb
            JOIN public.butaca_proyeccion bp ON bp.id = cb.butaca_proyeccion_id
            JOIN public.butaca b ON b.id = bp.butaca_id
            WHERE cb.compra_id = c.id
        ), '[]'::jsonb),
        'detalles', coalesce((
            SELECT jsonb_agg(to_jsonb(dc) ORDER BY dc.id)
            FROM public.detalle_compra dc
            WHERE dc.compra_id = c.id
        ), '[]'::jsonb)
    )
    FROM public.compra c
    LEFT JOIN public.proyeccion p ON p.id = c.proyeccion_id
    LEFT JOIN public.funcion f ON f.id = p.funcion_id
    LEFT JOIN public.pelicula pe ON pe.id = f.pelicula_id
    WHERE c.id = p_compra_id;
$$;

REVOKE ALL ON FUNCTION public.datos_ticket_compra(uuid) FROM PUBLIC, anon, authenticated;

-- La solicitud UUID sirve como secreto de recuperación para compras anónimas.
-- No habilita listar compras ni buscar tickets por el código manual.
CREATE OR REPLACE FUNCTION public.obtener_ticket_compra(p_solicitud_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_compra public.compra%ROWTYPE;
BEGIN
    SELECT * INTO v_compra
    FROM public.compra
    WHERE solicitud_id = p_solicitud_id;

    IF NOT FOUND OR v_compra.usuario_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'No se encontró el ticket de la solicitud';
    END IF;

    IF v_compra.estado::text <> 'confirmada' OR v_compra.codigo_qr IS NULL THEN
        RAISE EXCEPTION 'La compra ya fue utilizada o cancelada';
    END IF;

    RETURN public.datos_ticket_compra(v_compra.id);
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_ticket_compra(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_ticket_compra(uuid) TO anon, authenticated;

-- Ambos medios consumen la misma fila. El UPDATE condicional impide
-- que dos empleados admitan la misma compra simultáneamente.
CREATE OR REPLACE FUNCTION public.validar_qr_compra(p_codigo_qr text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_codigo text := btrim(p_codigo_qr);
    v_manual text := upper(regexp_replace(v_codigo, '[[:space:]-]', '', 'g'));
    v_id uuid;
    v_qr uuid;
    v_resultado jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.usuario
        WHERE id = auth.uid() AND rol::text IN ('admin', 'empleado')
    ) THEN
        RAISE EXCEPTION 'Solo un empleado o administrador puede validar compras';
    END IF;

    IF v_manual ~ '^[0-9A-F]{10}$' THEN
        SELECT id INTO v_id FROM public.compra WHERE codigo_manual = v_manual;
    ELSIF v_codigo ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_qr := v_codigo::uuid;
        SELECT id INTO v_id FROM public.compra WHERE lower(codigo_qr::text) = v_qr::text;
    ELSE
        RETURN NULL;
    END IF;

    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.compra
    SET estado = 'utilizada', codigo_qr = NULL
    WHERE id = v_id
        AND estado::text = 'confirmada'
        AND codigo_qr IS NOT NULL
    RETURNING id INTO v_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_resultado := public.datos_ticket_compra(v_id);

    IF v_resultado IS NULL OR
        (jsonb_array_length(v_resultado->'butacas') = 0 AND jsonb_array_length(v_resultado->'detalles') = 0) THEN
        RAISE EXCEPTION 'No se pudieron recuperar los datos de la entrada';
    END IF;

    RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_qr_compra(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_qr_compra(text) TO authenticated;


COMMIT;
