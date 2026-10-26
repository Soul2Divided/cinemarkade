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

-- Solo las funciones autorizadas de abajo pueden invocar este ensamblador.
CREATE OR REPLACE FUNCTION public.datos_ticket_compra(p_compra_id uuid)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'compra', to_jsonb(c),
        'pelicula', pe.nombre,
        'fecha', f.fecha,
        'horario', p.horario,
        'sala_id', f.sala_id,
        'formato', f.formato,
        'idioma', f.idioma,
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
    JOIN public.proyeccion p ON p.id = c.proyeccion_id
    JOIN public.funcion f ON f.id = p.funcion_id
    JOIN public.pelicula pe ON pe.id = f.pelicula_id
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
        RAISE EXCEPTION 'La compra ya no tiene una entrada disponible';
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
        RAISE EXCEPTION 'Solo un empleado o administrador puede validar entradas';
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

    IF v_resultado IS NULL OR jsonb_array_length(v_resultado->'butacas') = 0 THEN
        RAISE EXCEPTION 'No se pudieron recuperar los datos de la entrada';
    END IF;

    RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_qr_compra(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_qr_compra(text) TO authenticated;

COMMIT;
