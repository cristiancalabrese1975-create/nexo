CREATE TYPE "public"."rol_usuario" AS ENUM('vendedor', 'gerente', 'admin_empresa');--> statement-breakpoint
CREATE TYPE "public"."ambito_objetivo" AS ENUM('empresa', 'linea', 'vendedor', 'cliente');--> statement-breakpoint
CREATE TYPE "public"."origen_venta" AS ENUM('import', 'api', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tipo_comprobante" AS ENUM('factura', 'nota_debito', 'nota_credito', 'recibo');--> statement-breakpoint
CREATE TYPE "public"."estado_gestion" AS ENUM('pendiente', 'realizada', 'reprogramada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."tipo_etapa" AS ENUM('abierta', 'ganada', 'perdida');--> statement-breakpoint
CREATE TYPE "public"."tipo_gestion" AS ENUM('visita', 'llamada', 'videollamada', 'email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."accion_auditoria" AS ENUM('crear', 'actualizar', 'eliminar');--> statement-breakpoint
CREATE TYPE "public"."estado_importacion" AS ENUM('pendiente', 'procesando', 'completada', 'completada_con_errores', 'fallida');--> statement-breakpoint
CREATE TYPE "public"."tipo_importacion" AS ENUM('ventas', 'vendedores', 'clientes', 'cuenta_corriente', 'objetivos');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "empresa" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"cuit" text,
	"timezone" text DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
	"moneda" text DEFAULT 'ARS' NOT NULL,
	"plan" text DEFAULT 'trial' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"fecha_referencia" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresa_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sesion_refresh" (
	"id" uuid PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	"user_agent" text,
	"ip" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuario" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"dni" text NOT NULL,
	"password_hash" text NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"email" text,
	"whatsapp" text,
	"link_reunion" text,
	"rol" "rol_usuario" DEFAULT 'vendedor' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_login" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categoria_cliente" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cliente" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"razon_social" text NOT NULL,
	"cuit" text,
	"categoria_id" uuid,
	"vendedor_id" uuid,
	"email" text,
	"telefono" text,
	"direccion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "direccion_comercial" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "linea_producto" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"direccion_id" uuid,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "producto" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"linea_id" uuid NOT NULL,
	"precio_lista" numeric(14, 2),
	"unidad_medida" text DEFAULT 'unidad' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comprobante_cc" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"tipo" "tipo_comprobante" NOT NULL,
	"fecha_emision" date NOT NULL,
	"fecha_vencimiento" date,
	"importe" numeric(16, 2) NOT NULL,
	"saldo" numeric(16, 2) NOT NULL,
	"moneda" text DEFAULT 'ARS' NOT NULL,
	"importacion_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indice_inflacion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid,
	"periodo" date NOT NULL,
	"valor_pct" numeric(6, 3) NOT NULL,
	"fuente" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "objetivo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"ambito" "ambito_objetivo" NOT NULL,
	"linea_id" uuid,
	"vendedor_id" uuid,
	"cliente_id" uuid,
	"monto" numeric(16, 2) NOT NULL,
	"unidades" numeric(14, 3),
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venta_item" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"cliente_id" uuid NOT NULL,
	"vendedor_id" uuid,
	"linea_id" uuid NOT NULL,
	"producto_id" uuid,
	"cantidad" numeric(14, 3) NOT NULL,
	"monto" numeric(16, 2) NOT NULL,
	"comprobante_numero" text,
	"importacion_id" uuid,
	"origen" "origen_venta" DEFAULT 'manual' NOT NULL,
	"hash_fila" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "condicion_comercial" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"linea_id" uuid,
	"producto_id" uuid,
	"descuento_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "etapa_pipeline" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"color" text,
	"tipo" "tipo_etapa" DEFAULT 'abierta' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gestion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"oportunidad_id" uuid,
	"tipo" "tipo_gestion" NOT NULL,
	"estado" "estado_gestion" DEFAULT 'pendiente' NOT NULL,
	"fecha" date NOT NULL,
	"hora" text,
	"notas" text,
	"proxima_gestion" date,
	"plataforma" text,
	"enlace_reunion" text,
	"creada_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oportunidad" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"cliente_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"etapa_id" uuid NOT NULL,
	"valor" numeric(16, 2) NOT NULL,
	"fecha_estimada_cierre" date,
	"fecha_cierre" date,
	"motivo_perdida" text,
	"creada_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oportunidad_movimiento" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"oportunidad_id" uuid NOT NULL,
	"etapa_desde" uuid,
	"etapa_hasta" uuid NOT NULL,
	"usuario_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditoria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"usuario_id" uuid,
	"entidad" text NOT NULL,
	"entidad_id" text NOT NULL,
	"accion" "accion_auditoria" NOT NULL,
	"cambios" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "importacion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" "tipo_importacion" NOT NULL,
	"archivo_nombre" text NOT NULL,
	"archivo_hash" text NOT NULL,
	"estado" "estado_importacion" DEFAULT 'pendiente' NOT NULL,
	"filas_total" integer DEFAULT 0 NOT NULL,
	"filas_ok" integer DEFAULT 0 NOT NULL,
	"filas_error" integer DEFAULT 0 NOT NULL,
	"usuario_id" uuid,
	"iniciada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizada_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "importacion_error" (
	"id" uuid PRIMARY KEY NOT NULL,
	"importacion_id" uuid NOT NULL,
	"fila" integer NOT NULL,
	"columna" text,
	"valor" text,
	"mensaje" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sesion_refresh" ADD CONSTRAINT "sesion_refresh_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categoria_cliente" ADD CONSTRAINT "categoria_cliente_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente" ADD CONSTRAINT "cliente_categoria_id_categoria_cliente_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria_cliente"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente" ADD CONSTRAINT "cliente_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direccion_comercial" ADD CONSTRAINT "direccion_comercial_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linea_producto" ADD CONSTRAINT "linea_producto_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "linea_producto" ADD CONSTRAINT "linea_producto_direccion_id_direccion_comercial_id_fk" FOREIGN KEY ("direccion_id") REFERENCES "public"."direccion_comercial"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "producto" ADD CONSTRAINT "producto_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "producto" ADD CONSTRAINT "producto_linea_id_linea_producto_id_fk" FOREIGN KEY ("linea_id") REFERENCES "public"."linea_producto"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comprobante_cc" ADD CONSTRAINT "comprobante_cc_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comprobante_cc" ADD CONSTRAINT "comprobante_cc_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comprobante_cc" ADD CONSTRAINT "comprobante_cc_importacion_id_importacion_id_fk" FOREIGN KEY ("importacion_id") REFERENCES "public"."importacion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "indice_inflacion" ADD CONSTRAINT "indice_inflacion_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objetivo" ADD CONSTRAINT "objetivo_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objetivo" ADD CONSTRAINT "objetivo_linea_id_linea_producto_id_fk" FOREIGN KEY ("linea_id") REFERENCES "public"."linea_producto"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objetivo" ADD CONSTRAINT "objetivo_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objetivo" ADD CONSTRAINT "objetivo_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venta_item" ADD CONSTRAINT "venta_item_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venta_item" ADD CONSTRAINT "venta_item_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venta_item" ADD CONSTRAINT "venta_item_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venta_item" ADD CONSTRAINT "venta_item_linea_id_linea_producto_id_fk" FOREIGN KEY ("linea_id") REFERENCES "public"."linea_producto"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venta_item" ADD CONSTRAINT "venta_item_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venta_item" ADD CONSTRAINT "venta_item_importacion_id_importacion_id_fk" FOREIGN KEY ("importacion_id") REFERENCES "public"."importacion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "condicion_comercial" ADD CONSTRAINT "condicion_comercial_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "condicion_comercial" ADD CONSTRAINT "condicion_comercial_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "condicion_comercial" ADD CONSTRAINT "condicion_comercial_linea_id_linea_producto_id_fk" FOREIGN KEY ("linea_id") REFERENCES "public"."linea_producto"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "condicion_comercial" ADD CONSTRAINT "condicion_comercial_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "etapa_pipeline" ADD CONSTRAINT "etapa_pipeline_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gestion" ADD CONSTRAINT "gestion_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gestion" ADD CONSTRAINT "gestion_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gestion" ADD CONSTRAINT "gestion_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gestion" ADD CONSTRAINT "gestion_oportunidad_id_oportunidad_id_fk" FOREIGN KEY ("oportunidad_id") REFERENCES "public"."oportunidad"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gestion" ADD CONSTRAINT "gestion_creada_por_usuario_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad" ADD CONSTRAINT "oportunidad_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad" ADD CONSTRAINT "oportunidad_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad" ADD CONSTRAINT "oportunidad_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad" ADD CONSTRAINT "oportunidad_etapa_id_etapa_pipeline_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapa_pipeline"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad" ADD CONSTRAINT "oportunidad_creada_por_usuario_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad_movimiento" ADD CONSTRAINT "oportunidad_movimiento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad_movimiento" ADD CONSTRAINT "oportunidad_movimiento_oportunidad_id_oportunidad_id_fk" FOREIGN KEY ("oportunidad_id") REFERENCES "public"."oportunidad"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad_movimiento" ADD CONSTRAINT "oportunidad_movimiento_etapa_desde_etapa_pipeline_id_fk" FOREIGN KEY ("etapa_desde") REFERENCES "public"."etapa_pipeline"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad_movimiento" ADD CONSTRAINT "oportunidad_movimiento_etapa_hasta_etapa_pipeline_id_fk" FOREIGN KEY ("etapa_hasta") REFERENCES "public"."etapa_pipeline"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidad_movimiento" ADD CONSTRAINT "oportunidad_movimiento_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "importacion" ADD CONSTRAINT "importacion_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "importacion" ADD CONSTRAINT "importacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "importacion_error" ADD CONSTRAINT "importacion_error_importacion_id_importacion_id_fk" FOREIGN KEY ("importacion_id") REFERENCES "public"."importacion"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_empresa_dni_unq" ON "usuario" USING btree ("empresa_id","dni");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_dni_activo_unq" ON "usuario" USING btree ("dni") WHERE "usuario"."activo" = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categoria_cliente_empresa_nombre_unq" ON "categoria_cliente" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cliente_empresa_codigo_unq" ON "cliente" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "direccion_comercial_empresa_nombre_unq" ON "direccion_comercial" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "linea_producto_empresa_codigo_unq" ON "linea_producto" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "producto_empresa_codigo_unq" ON "producto" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comprobante_cc_empresa_numero_unq" ON "comprobante_cc" USING btree ("empresa_id","numero");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comprobante_cc_empresa_cliente_idx" ON "comprobante_cc" USING btree ("empresa_id","cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "indice_inflacion_empresa_periodo_idx" ON "indice_inflacion" USING btree ("empresa_id","periodo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "objetivo_empresa_periodo_ambito_unq" ON "objetivo" USING btree ("empresa_id","periodo","ambito","linea_id","vendedor_id","cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "objetivo_empresa_periodo_idx" ON "objetivo" USING btree ("empresa_id","periodo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "venta_item_empresa_hash_unq" ON "venta_item" USING btree ("empresa_id","hash_fila");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venta_item_empresa_fecha_idx" ON "venta_item" USING btree ("empresa_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venta_item_empresa_cliente_fecha_idx" ON "venta_item" USING btree ("empresa_id","cliente_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venta_item_empresa_linea_fecha_idx" ON "venta_item" USING btree ("empresa_id","linea_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venta_item_empresa_producto_fecha_idx" ON "venta_item" USING btree ("empresa_id","producto_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venta_item_empresa_vendedor_fecha_idx" ON "venta_item" USING btree ("empresa_id","vendedor_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "condicion_comercial_empresa_cliente_idx" ON "condicion_comercial" USING btree ("empresa_id","cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "etapa_pipeline_empresa_codigo_unq" ON "etapa_pipeline" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gestion_empresa_cliente_fecha_idx" ON "gestion" USING btree ("empresa_id","cliente_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gestion_empresa_vendedor_fecha_idx" ON "gestion" USING btree ("empresa_id","vendedor_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oportunidad_empresa_etapa_idx" ON "oportunidad" USING btree ("empresa_id","etapa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oportunidad_empresa_vendedor_idx" ON "oportunidad" USING btree ("empresa_id","vendedor_id");