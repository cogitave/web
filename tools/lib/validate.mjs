/**
 * JSON Schema validator - the subset our schemas actually use.
 *
 * Supports: type, required, properties, additionalProperties, enum, const,
 * pattern, minLength, maxLength, minimum, maximum, minItems, maxItems, items,
 * allOf, anyOf, not, and if/then/else. Anything else in a schema is a silent
 * no-op, which is why `assertSupported` exists: it walks a schema before use and
 * refuses keywords this validator would ignore. A validator that quietly skips a
 * constraint is worse than no validator, because the gate reports green.
 *
 * Errors accumulate with JSON-Pointer-ish paths so a content author sees
 * `blocks/2/data/products/0/stat: missing required property "label"` rather than
 * "invalid document".
 *
 * Written rather than depended on: ADR-0003 in standards (build from scratch -
 * reference, not dependency).
 */

const SUPPORTED = new Set([
  '$schema', '$id', '$ref', 'title', 'description', 'examples', 'default', 'deprecated',
  'type', 'required', 'properties', 'additionalProperties', 'propertyNames',
  'enum', 'const', 'pattern', 'minLength', 'maxLength', 'format',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'items', 'minItems', 'maxItems', 'uniqueItems',
  'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else',
]);

export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}

/** Refuse a schema that uses a keyword this validator does not implement. */
export function assertSupported(schema, where = '<schema>', path = '') {
  if (schema === null || typeof schema !== 'object') return;
  if (Array.isArray(schema)) {
    schema.forEach((s, i) => assertSupported(s, where, `${path}/${i}`));
    return;
  }
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) {
      throw new SchemaError(
        `${where}${path}: unsupported schema keyword "${key}". ` +
          'tools/lib/validate.mjs would ignore it, so the gate would pass without checking it. ' +
          'Implement the keyword or rewrite the constraint.',
      );
    }
  }
  for (const key of ['properties', 'propertyNames']) {
    if (schema[key] && typeof schema[key] === 'object') {
      for (const [name, sub] of Object.entries(schema[key])) {
        assertSupported(sub, where, `${path}/${key}/${name}`);
      }
    }
  }
  for (const key of ['items', 'additionalProperties', 'not', 'if', 'then', 'else']) {
    if (typeof schema[key] === 'object') assertSupported(schema[key], where, `${path}/${key}`);
  }
  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(schema[key])) assertSupported(schema[key], where, `${path}/${key}`);
  }
}

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
};

const typeMatches = (value, expected) => {
  const actual = typeOf(value);
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((t) => (t === 'number' ? actual === 'number' || actual === 'integer' : t === actual));
};

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Validate `value` against `schema`. Returns an array of error strings. */
export function validate(value, schema, path = '') {
  const errors = [];
  const at = path || '<root>';

  if (schema.type !== undefined && !typeMatches(value, schema.type)) {
    errors.push(`${at}: expected ${[].concat(schema.type).join(' or ')}, got ${typeOf(value)}`);
    return errors;   // every other keyword assumes the type held
  }

  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    errors.push(`${at}: expected the constant ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((option) => deepEqual(value, option))) {
    errors.push(`${at}: ${JSON.stringify(value)} is not one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  }

  if (typeof value === 'string') {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) {
      errors.push(`${at}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${at}: shorter than ${schema.minLength} characters (is ${value.length})`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${at}: longer than ${schema.maxLength} characters (is ${value.length})`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: above maximum ${schema.maximum}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${at}: needs at least ${schema.minItems} items (has ${value.length})`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${at}: allows at most ${schema.maxItems} items (has ${value.length})`);
    }
    if (schema.items) {
      value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}/${i}`)));
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${at}: missing required property "${key}"`);
    }
    for (const [key, sub] of Object.entries(value)) {
      const propSchema = schema.properties?.[key];
      if (propSchema) {
        errors.push(...validate(sub, propSchema, `${path}/${key}`));
        continue;
      }
      if (schema.additionalProperties === false && key !== '$schema') {
        errors.push(`${at}: unexpected property "${key}"`);
      } else if (typeof schema.additionalProperties === 'object') {
        errors.push(...validate(sub, schema.additionalProperties, `${path}/${key}`));
      }
    }
  }

  for (const sub of schema.allOf ?? []) errors.push(...validate(value, sub, path));

  if (schema.anyOf && !schema.anyOf.some((sub) => validate(value, sub, path).length === 0)) {
    errors.push(`${at}: matches none of the allowed shapes`);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((sub) => validate(value, sub, path).length === 0).length;
    if (matches !== 1) errors.push(`${at}: must match exactly one allowed shape (matched ${matches})`);
  }
  if (schema.not && validate(value, schema.not, path).length === 0) {
    errors.push(`${at}: matches a forbidden shape`);
  }

  if (schema.if) {
    const branch = validate(value, schema.if, path).length === 0 ? schema.then : schema.else;
    if (branch) errors.push(...validate(value, branch, path));
  }

  return errors;
}

/** Validate or throw, with every error listed. */
export function assertValid(value, schema, label) {
  const errors = validate(value, schema);
  if (errors.length) {
    throw new SchemaError(`${label} failed validation:\n  - ${errors.join('\n  - ')}`);
  }
}
