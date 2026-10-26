-- Ejecutar manualmente en Supabase después de instalar la compra de candy.
BEGIN;

ALTER TABLE public.cupon
    ADD COLUMN IF NOT EXISTS es_bienvenida boolean NOT NULL DEFAULT false;

-- Impide códigos equivalentes que pudieran aplicar reglas distintas.
-- Si existen duplicados, deben corregirse antes de instalar el beneficio.
CREATE UNIQUE INDEX IF NOT EXISTS cupon_codigo_normalizado_unico
    ON public.cupon (upper(btrim(codigo)));

CREATE UNIQUE INDEX IF NOT EXISTS cupon_bienvenida_unico
    ON public.cupon (es_bienvenida)
    WHERE es_bienvenida;

DO $$
DECLARE
    v_id public.cupon.id%TYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.cupon WHERE es_bienvenida) THEN
        SELECT id INTO v_id
        FROM public.cupon
        WHERE upper(btrim(codigo)) = 'BIENVENIDA';

        IF FOUND THEN
            UPDATE public.cupon
            SET es_bienvenida = true, edad_minima = 0
            WHERE id = v_id;
        ELSE
            INSERT INTO public.cupon (
                codigo, porcentaje_descuento, edad_minima,
                fecha_inicio, fecha_fin, activa, es_bienvenida
            ) VALUES (
                'BIENVENIDA', 20, 0,
                '2000-01-01', '2099-12-31', true, true
            );
        END IF;
    END IF;
END;
$$;

-- El beneficio se ofrece a usuarios registrados sin compras previas.
CREATE OR REPLACE FUNCTION public.cupon_bienvenida_disponible()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT to_jsonb(c)
    FROM public.cupon c
    WHERE auth.uid() IS NOT NULL
        AND c.es_bienvenida
        AND c.activa
        AND c.porcentaje_descuento BETWEEN 1 AND 100
        AND c.fecha_inicio::date <= timezone('America/Argentina/Buenos_Aires', now())::date
        AND c.fecha_fin::date >= timezone('America/Argentina/Buenos_Aires', now())::date
        AND NOT EXISTS (
            SELECT 1 FROM public.compra
            WHERE usuario_id = auth.uid()
        );
$$;

REVOKE ALL ON FUNCTION public.cupon_bienvenida_disponible() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cupon_bienvenida_disponible() TO authenticated;

-- Mantiene la función de confirmación instalada y agrega la condición
-- al cálculo del cupón, en lugar de duplicar toda la lógica de compra.
DO $$
DECLARE
    v_funcion regprocedure := to_regprocedure('public.confirmar_compra_con_recompensas(jsonb)');
    v_definicion text;
    v_marcador text := 'v_descuento := v_cupon.porcentaje_descuento;';
    v_validacion text := $validacion$
    -- cupon_bienvenida_validacion_v1
    IF v_cupon.es_bienvenida THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Iniciá sesión para usar el beneficio de bienvenida';
        END IF;

        -- Dos confirmaciones del mismo usuario no pueden usar el beneficio.
        PERFORM 1 FROM public.usuario WHERE id = auth.uid() FOR UPDATE;

        IF EXISTS (SELECT 1 FROM public.compra WHERE usuario_id = auth.uid()) THEN
            RAISE EXCEPTION 'El cupón de bienvenida solo corresponde a la primera compra';
        END IF;
    END IF;

    v_descuento := v_cupon.porcentaje_descuento;
    $validacion$;
BEGIN
    IF v_funcion IS NULL THEN
        RAISE EXCEPTION 'Instalá primero la función de confirmación de compras';
    END IF;

    SELECT pg_get_functiondef(v_funcion) INTO v_definicion;

    IF position('cupon_bienvenida_validacion_v1' IN v_definicion) = 0 THEN
        IF position(v_marcador IN v_definicion) = 0 THEN
            RAISE EXCEPTION 'La función instalada tiene otra estructura. Revisar su definición antes de incorporar bienvenida';
        END IF;

        EXECUTE replace(v_definicion, v_marcador, v_validacion);
    END IF;
END;
$$;

COMMIT;

-- El administrador modifica porcentaje y vigencia desde Gestión de cupones.
SELECT codigo, porcentaje_descuento, fecha_inicio, fecha_fin, activa
FROM public.cupon
WHERE es_bienvenida;
