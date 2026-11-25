import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

type RecordatorioPendiente = {
    id: string;
    usuario_id: string;
    funcion_id: number;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const clavesSecretas = (() => {
    try {
        return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    } catch {
        return {};
    }
})();
const supabaseKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    clavesSecretas.default;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:soporte@cinemarkade.com';
const cronSecret = Deno.env.get('CRON_SECRET');

Deno.serve(async (request) => {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseKey || !vapidPublicKey || !vapidPrivateKey) {
        return Response.json({ error: 'Missing push configuration' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const hoy = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date());

    const { data: recordatorios, error } = await supabase
        .from('recordatorio_estreno')
        .select('id, usuario_id, funcion_id')
        .is('enviado_en', null)
        .lte('notificar_en', hoy)
        .limit(500);

    if (error) {
        console.error('Could not list pending premiere reminders:', error);
        return Response.json({ error: 'Could not list reminders' }, { status: 500 });
    }

    let procesados = 0;

    for (const recordatorio of (recordatorios ?? []) as RecordatorioPendiente[]) {
        const { data: funcion } = await supabase
            .from('funcion')
            .select('pelicula_id')
            .eq('id', recordatorio.funcion_id)
            .maybeSingle();

        const { data: pelicula } = funcion
            ? await supabase
                .from('pelicula')
                .select('nombre')
                .eq('id', funcion.pelicula_id)
                .maybeSingle()
            : { data: null };

        const nombrePelicula = pelicula?.nombre ?? 'Tu próximo estreno';
        const { data: suscripciones } = await supabase
            .from('suscripcion_push')
            .select('endpoint, suscripcion')
            .eq('usuario_id', recordatorio.usuario_id);

        const aviso = {
            notification: {
                title: '¡Ya está en Cinemarkade!',
                body: `${nombrePelicula} ya está disponible en el cine. ¡Elegí tu función!`,
                icon: '/favicon.ico',
                tag: `estreno-${recordatorio.funcion_id}`,
                data: {
                    onActionClick: {
                        default: {
                            operation: 'openWindow',
                            url: `/funciones/${funcion?.pelicula_id ?? ''}`,
                        },
                    },
                },
            },
        };

        for (const suscripcion of suscripciones ?? []) {
            try {
                await webpush.sendNotification(suscripcion.suscripcion, JSON.stringify(aviso));
            } catch (pushError) {
                const statusCode = (pushError as { statusCode?: number }).statusCode;

                if (statusCode === 404 || statusCode === 410) {
                    await supabase
                        .from('suscripcion_push')
                        .delete()
                        .eq('endpoint', suscripcion.endpoint);
                } else {
                    console.error('Could not deliver push notification:', pushError);
                }
            }
        }

        const { error: historialError } = await supabase
            .from('notificacion_usuario')
            .upsert(
                {
                    usuario_id: recordatorio.usuario_id,
                    funcion_id: recordatorio.funcion_id,
                    tipo: 'estreno',
                    titulo: '¡Ya está en Cinemarkade!',
                    mensaje: `${nombrePelicula} ya está disponible en el cine. ¡Elegí tu función!`,
                },
                { onConflict: 'usuario_id,funcion_id,tipo' },
            );

        if (historialError) {
            console.error('Could not save notification history:', historialError);
            continue;
        }

        const { error: updateError } = await supabase
            .from('recordatorio_estreno')
            .update({ enviado_en: new Date().toISOString() })
            .eq('id', recordatorio.id)
            .is('enviado_en', null);

        if (!updateError) {
            procesados++;
        }
    }

    return Response.json({ procesados });
});
