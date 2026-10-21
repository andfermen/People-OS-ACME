# Acme · Contexto de la empresa (ficticio)

> **Acme es una empresa inventada**, inspirada en Bit2Me (fintech cripto española, regulada). La estructura y las áreas se basan en información pública de Bit2Me; el nombre, las personas, las cifras y todos los datos son ficticios. No describen a ninguna empresa ni a ninguna persona real.

## Qué hace

Acme es una fintech cripto española con **160 personas**. Ofrece compraventa de criptoactivos (exchange), custodia de los activos de sus clientes y una app para particulares. Es una **empresa regulada**: tiene licencia de proveedor de servicios de criptoactivos según el reglamento europeo MiCA y es sujeto obligado en prevención del blanqueo de capitales.

Por qué importa para RRHH: varias funciones son **obligaciones regulatorias**. Si custodia, la prevención del blanqueo o la seguridad quedan sin cobertura, el problema no es solo operativo. Pone en riesgo la licencia.

## Momento: plan AI first

La dirección ha lanzado un plan **AI first**: objetivos de adopción de IA por área, herramientas aprobadas, formación y rediseño de equipos. People tiene que liderar la parte de personas: medir la madurez, dirigir la formación y rediseñar funciones **recualificando antes que reduciendo**. El mapa de skills es el instrumento: el mismo modelo que mide la cobertura mide la madurez IA (`reglas-semaforo.md` §7-8) y marca el `impacto_ia` de cada función (`funciones.yaml`).

## Áreas y divisiones

Las **divisiones** agrupan áreas. Sirven para agregar resultados de encuestas y de madurez IA cuando un área tiene menos de 5 personas (ver `docs/usos-mapa-cobertura.md`).

| División | Área | Personas | Qué hace |
|---|---|---|---|
| Mercados | Exchange y trading | 12 | Ejecución de órdenes, liquidez, riesgo de mercado |
| Mercados | Custodia | 8 | Claves, wallets, prueba de reservas |
| Riesgo y cumplimiento | Compliance AML/KYC | 20 | Alta de clientes, monitorización, comunicación de operaciones sospechosas |
| Riesgo y cumplimiento | Legal y regulatorio | 7 | Licencia MiCA, relación con el supervisor, contratos, protección de datos |
| Riesgo y cumplimiento | Seguridad | 8 | Detección y respuesta a incidentes, seguridad de aplicaciones |
| Tecnología y producto | Ingeniería | 42 | Plataforma, infraestructura, integración de redes blockchain |
| Tecnología y producto | Producto | 12 | Producto, UX, datos |
| Cliente y negocio | Atención al cliente (CX) | 31 | Soporte de primer y segundo nivel |
| Cliente y negocio | Marketing | 10 | Captación y comunicación comercial regulada |
| Corporativo | Finanzas | 8 | Contabilidad, tesorería, salvaguarda de fondos |
| Corporativo | People | 1 | Toda la gestión de personas |
| Corporativo | Dirección | 1 | CEO |

## De dónde salen los datos

- **46 personas hechas a mano** (E001-E046): son las que sostienen los casos de la demo (key people, backups, candidatos, retención).
- **114 personas generadas** (E047-E160) con `npm run plantilla` (`calculo/generar-plantilla.js`), con una semilla fija. Tienen topes de nivel en las skills de los casos de la demo, para que el mapa de riesgo sea el mismo que con 46 (decisión D-13).

## Rasgos que usa la demo

- **Escala real, dependencias pequeñas:** con 160 personas, varias skills críticas siguen dependiendo de 1 o 2 personas. Más plantilla no significa más cobertura. Es el problema que resuelve el mapa.
- **Una sola persona en People para 160:** es justo el reto. El sistema tiene que permitirle gestionar el 360º.
- **Sector con mucha demanda de talento:** los perfiles de custodia, blockchain y AML reciben ofertas a menudo. Por eso las señales de rotación tienen peso.
- **Madurez IA desigual:** Ingeniería y Producto van por delante; Compliance, Finanzas y CX, por detrás. Son también áreas con funciones de impacto IA alto.
