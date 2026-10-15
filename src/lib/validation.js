// src/lib/validation.js
// ─────────────────────────────────────────────────────────────
//  Validación y sanitización de entradas de usuario.
//  Protege contra XSS, SQL Injection e inyección de cabeceras.
//  No depende de ninguna librería externa.
// ─────────────────────────────────────────────────────────────

// ── Constantes ───────────────────────────────────────────────

const LIMITS = {
  nombre:   { min: 2,  max: 100 },
  empresa:  { min: 2,  max: 120 },
  telefono: { min: 7,  max: 20  },
  correo:   { min: 6,  max: 254 },
  mensaje:  { min: 0,  max: 1000 },
};

// Patrones peligrosos de SQL Injection
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE)\b)/gi,
  /(--|;|\/\*|\*\/|xp_|0x[0-9a-f]+)/gi,
  /(\bOR\b\s+[\w'"]+\s*=\s*[\w'"]+)/gi,
  /(\bAND\b\s+[\w'"]+\s*=\s*[\w'"]+)/gi,
];

// Patrones peligrosos de XSS
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /<\s*iframe/gi,
  /<\s*object/gi,
  /<\s*embed/gi,
  /data\s*:\s*text\/html/gi,
];

// ── Sanitización ─────────────────────────────────────────────

/**
 * Elimina caracteres peligrosos y normaliza el string.
 * NO usa regex de reemplazo agresivo para no mutilar texto legítimo;
 * en su lugar escapa entidades HTML y elimina patrones conocidos.
 */
export function sanitize(value) {
  if (typeof value !== 'string') return '';

  let clean = value
    .trim()
    // Eliminar caracteres de control (excepto saltos de línea y tabulaciones)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escapar entidades HTML básicas
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return clean;
}

/**
 * Detecta intentos de inyección SQL o XSS en el valor original (sin sanitizar).
 * Retorna true si el valor es sospechoso.
 */
export function containsInjection(value) {
  if (typeof value !== 'string') return false;

  const raw = value.toUpperCase();

  for (const pattern of SQL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(raw)) return true;
  }
  for (const pattern of XSS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) return true;
  }
  return false;
}

// ── Validadores individuales ─────────────────────────────────

export function validateNombre(value) {
  const errors = [];
  if (!value || value.trim().length < LIMITS.nombre.min)
    errors.push(`El nombre debe tener al menos ${LIMITS.nombre.min} caracteres.`);
  if (value && value.trim().length > LIMITS.nombre.max)
    errors.push(`El nombre no puede superar ${LIMITS.nombre.max} caracteres.`);
  if (containsInjection(value))
    errors.push('El nombre contiene caracteres no permitidos.');
  return errors;
}

export function validateEmpresa(value) {
  const errors = [];
  if (!value || value.trim().length < LIMITS.empresa.min)
    errors.push(`El nombre de empresa debe tener al menos ${LIMITS.empresa.min} caracteres.`);
  if (value && value.trim().length > LIMITS.empresa.max)
    errors.push(`La empresa no puede superar ${LIMITS.empresa.max} caracteres.`);
  if (containsInjection(value))
    errors.push('El nombre de empresa contiene caracteres no permitidos.');
  return errors;
}

export function validateTelefono(value) {
  const errors = [];
  const clean = (value || '').replace(/[\s\-()]/g, '');
  if (!clean || clean.length < LIMITS.telefono.min)
    errors.push('El teléfono debe tener al menos 7 dígitos.');
  if (clean.length > LIMITS.telefono.max)
    errors.push('El teléfono no puede superar 20 caracteres.');
  if (!/^[\+]?[0-9]{7,20}$/.test(clean))
    errors.push('El teléfono solo puede contener números, espacios, guiones y paréntesis.');
  return errors;
}

export function validateCorreo(value) {
  const errors = [];
  if (!value || value.trim().length === 0)
    errors.push('El correo electrónico es requerido.');
  else if (value.trim().length > LIMITS.correo.max)
    errors.push(`El correo no puede superar ${LIMITS.correo.max} caracteres.`);
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()))
    errors.push('El correo electrónico no tiene un formato válido.');
  if (containsInjection(value))
    errors.push('El correo contiene caracteres no permitidos.');
  return errors;
}

export function validateMensaje(value) {
  const errors = [];
  if (value && value.length > LIMITS.mensaje.max)
    errors.push(`El mensaje no puede superar ${LIMITS.mensaje.max} caracteres.`);
  if (containsInjection(value))
    errors.push('El mensaje contiene caracteres no permitidos.');
  return errors;
}

// ── Validador general del formulario ─────────────────────────

/**
 * Valida y sanitiza todos los campos del formulario de contacto.
 * @param {Object} data - Datos crudos del formulario
 * @returns {{ valid: boolean, errors: Object, sanitized: Object }}
 */
export function validateLeadForm(data) {
  const errors = {};

  const nombreErrors   = validateNombre(data.nombre);
  const empresaErrors  = validateEmpresa(data.empresa);
  const telefonoErrors = validateTelefono(data.telefono);
  const correoErrors   = validateCorreo(data.correo);
  const mensajeErrors  = validateMensaje(data.mensaje);

  if (nombreErrors.length)   errors.nombre   = nombreErrors;
  if (empresaErrors.length)  errors.empresa  = empresaErrors;
  if (telefonoErrors.length) errors.telefono = telefonoErrors;
  if (correoErrors.length)   errors.correo   = correoErrors;
  if (mensajeErrors.length)  errors.mensaje  = mensajeErrors;

  const valid = Object.keys(errors).length === 0;

  // Sanitizar solo si no hay errores (para no guardar datos sucios)
  const sanitized = valid ? {
    nombre:   sanitize(data.nombre),
    empresa:  sanitize(data.empresa),
    telefono: sanitize(data.telefono),
    correo:   data.correo.trim().toLowerCase(),  // correos no necesitan escape HTML
    mensaje:  sanitize(data.mensaje || ''),
  } : {};

  return { valid, errors, sanitized };
}
