-- Ejecutar en el SQL Editor de Supabase para habilitar el historial de compras.
-- No modifica compras ni reemplaza las políticas de escritura existentes.
BEGIN;

ALTER TABLE public.compra ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS compra_usuario_fecha_historial
    ON public.compra(usuario_id, fecha_compra DESC NULLS LAST, id DESC);

DROP POLICY IF EXISTS compra_lectura_historial ON public.compra;
DROP POLICY IF EXISTS compra_limite_lectura_historial ON public.compra;
DROP POLICY IF EXISTS compra_sin_lectura_anonima ON public.compra;

-- El cliente consulta sus compras. El administrador conserva acceso para reportes.
CREATE POLICY compra_lectura_historial
ON public.compra FOR SELECT TO authenticated
USING (
    usuario_id = (SELECT auth.uid())
    OR (SELECT EXISTS (
        SELECT 1 FROM public.usuario
        WHERE id = auth.uid() AND rol::text = 'admin'
    ))
);

-- Impide que otra política permisiva permita leer compras de otros clientes.
-- Los empleados conservan su alcance de lectura previo para el escaneo:
-- esta política restrictiva no les concede acceso por sí sola.
CREATE POLICY compra_limite_lectura_historial
ON public.compra AS RESTRICTIVE FOR SELECT TO authenticated
USING (
    usuario_id = (SELECT auth.uid())
    OR (SELECT EXISTS (
        SELECT 1 FROM public.usuario
        WHERE id = auth.uid() AND rol::text IN ('admin', 'empleado')
    ))
);

-- Los visitantes no pueden consultar compras por la API de tablas.
-- La confirmación anónima y el escaneo mantienen sus RPC existentes.
CREATE POLICY compra_sin_lectura_anonima
ON public.compra AS RESTRICTIVE FOR SELECT TO anon
USING (false);

REVOKE SELECT ON public.compra FROM anon;
GRANT SELECT ON public.compra TO authenticated;

COMMIT;

-- Verificación de las políticas de lectura instaladas.
SELECT policyname, roles, cmd, permissive, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'compra' AND cmd IN ('SELECT', 'ALL')
ORDER BY policyname;
