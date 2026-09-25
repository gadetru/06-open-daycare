---
description: Auditoría de seguridad de la DB (baseline completo)
agent: db-security-auditor
subtask: false
---

Ejecuta la auditoría completa (baseline) de la base de datos Supabase de este proyecto.

Contexto de esta ejecución: es una ejecución automática programada, no hay nadie para
responder preguntas. NO apliques migraciones, NO edites archivos, NO pidas confirmaciones.
Todo lo que requiera remediación va al reporte como hallazgo con el SQL propuesto, sin
aplicarlo.

Entrega el reporte completo en markdown: los 7 bloques (A–G) con su veredicto
PASS/FAIL/PARTIAL/SKIP, una tabla de hallazgos (id, severidad, bloque, objeto,
archivo:línea) y el resumen final. Sin PII de menores, UUIDs completos ni secretos.
