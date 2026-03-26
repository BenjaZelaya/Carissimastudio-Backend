// helpers/regex.js

/**
 * Escapa los caracteres especiales de una cadena para usarla de forma segura
 * dentro de una expresion regular.
 *
 * @param {string} str - Cadena de texto a escapar.
 * @returns {string} Cadena con caracteres especiales escapados.
 */
export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Construye un objeto de query Mongoose para busqueda exacta
 * e insensible a mayusculas/minusculas sobre un campo de texto.
 *
 * Uso:
 *   Model.findOne({ nombreCampo: busquedaExacta(valor) })
 *
 * @param {string} valor - Valor a buscar.
 * @returns {{ $regex: RegExp }} Objeto de query compatible con Mongoose.
 */
export const busquedaExacta = (valor) => ({
  $regex: new RegExp(`^${escapeRegex(valor)}$`, "i"),
});
