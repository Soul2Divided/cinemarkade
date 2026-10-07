# CINEMARKADE — Documento de Decisiones Técnicas

## 1. Concepto y Estética
El nombre y la propuesta de **Cinemarkade** nacen de recrear la experiencia de interactuar con una máquina de arcade retro para la compra de entradas y productos de cine. 
A lo largo de toda la aplicación se mantiene una estética fiel a los 8 bits y neón retro, garantizando la calidad visual requerida para una plataforma de cine actual.

---

## 2. Arquitectura General
* **Frontend:** Angular 21 (desplegado como **PWA** para permitir instalabilidad ligera y experiencia tipo App).
* **Backend & Persistencia:** **Supabase** sobre una base de datos **PostgreSQL**.
* **Hosting / Despliegue:** Firebase Hosting.

### Organización de Responsabilidades (Estructura de Carpetas)
| Capa | Propósito | Ejemplo de Ubicación |
| :--- | :--- | :--- |
| **Components** | Almacena los componentes visuales de la interfaz. | `components/home-page` |
| **Core** | Define el dominio del sistema y las entidades principales. | `core/pelicula` |
| **Guards** | Protege y restringe el acceso a rutas según permisos. | `guards/auth-guard` |
| **Styles** | Centraliza hojas de estilo y temas globales reutilizables. | `styles/themes/arcade-theme` |

---

## 3. Patrón de Acceso a Datos
Se diseñó un desacoplamiento en 4 capas para cada entidad del sistema:

| Capa | Contenido / Rol | Justificación Técnica |
| :--- | :--- | :--- |
| **Model** | Interfaz de TypeScript con la estructura de datos. | Centraliza y estandariza el tipo de dato en toda la app. |
| **Repository** | Clase abstracta que define el contrato de operaciones. | Desacopla la app del proveedor (Supabase); facilita la migración a otro servicio sin reescribir la lógica. |
| **Service** | Capa de validación previa y reglas de negocio. | Evita mezclar la validación de dominio con la persistencia directa. |
| **Adapter** | Implementación concreta del repositorio para Supabase. | Aísla la sintaxis y cliente de base de datos del resto del código. |

* **Trade-off:** Aunque incrementa la cantidad de archivos iniciales (*boilerplate*), otorga alta mantenibilidad y capacidad de prueba (*testability*).

---

## 4. Lógica de Negocio y Flujos Críticos

### A. Manejo de Funciones y Horarios
Una **Función** representa la combinación de película, sala, fecha, formato e idioma. 
* Se incorporó una tabla relacional de **Proyecciones** para asociar múltiples horarios a una misma función.
* La distribución de horarios calcula automáticamente la duración de la película sumada a un margen fijo de **30 minutos** destinado a la limpieza del personal.

### B. Compra Anónima: Generación de QR y PDF
Para dar soporte a compras sin registro previo de usuario:
* Al finalizar la transacción de un usuario anónimo, la app genera y descarga automáticamente un comprobante **PDF con QR**.
* **Seguridad de uso:** Al ser escaneado por el personal del cine, el QR cambia su estado en la base de datos a *Validado/Consumido*, impidiendo su reutilización.

### C. Atomicidad mediante RPC (Remote Procedure Call)
Para la creación de funciones y confirmación de compras, se optó por implementar funciones **RPC en Supabase (PL/pgSQL)** en lugar de múltiples peticiones HTTP individuales desde Angular.
* **Motivo:** Garantiza que la operación sea **atómica (Transacción ACID)**: se persisten todos los registros relacionados o se realiza un *rollback* completo, evitando datos huérfanos o inconsistentes.
