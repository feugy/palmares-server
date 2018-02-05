/**
 * Lowerize and replace accentuated letters by their equivalent
 *
 * @param {String} value - the replaced string
 * @param {Boolean} [removeDots = false] - also remove dots
 * @return {String} its lowercase accent-free version
 */
exports.removeAccents = (value, removeDots = false) => {
  const str = value.toLowerCase().trim()
  return Array.from(str).map((char, i) => {
    const code = str.charCodeAt(i)
    // 224~230: àáâãäåæ, 257: ā, 259: ă, 261: ą
    return (code >= 224 && code <= 230) || [257, 259, 261].includes(code)
      ? 'a'
      // 231: ç, 263: ć, 265: ĉ, 267: ċ, 269: č,
      : [231, 263, 265, 267, 269].includes(code)
        ? 'c'
        // 240: ð, 271: ď, 273: đ
        : [240, 271, 273].includes(code)
          ? 'd'
          // 232~235: èéêë, 275: ē, 277: ĕ, 279: ė, 281: ę, 283: ě
          : (code >= 232 && code <= 235) || [275, 277, 279, 281, 283].includes(code)
            ? 'e'
            // 285: ĝ, 287: ğ, 289: ġ, 291: ģ
            : [285, 287, 289, 291].includes(code)
              ? 'g'
              // 293: ĥ, 295: ħ
              : [293, 295].includes(code)
                ? 'h'
                // 236~239: ìíîï, 297: ĩ, 299: ī, 301: ĭ, 303: į, 305: ı
                : (code >= 236 && code <= 239) || [297, 299, 301, 303, 305].includes(code)
                  ? 'i'
                  // 307: ĳ, 309: ĵ
                  : [307, 309].includes(code)
                    ? 'j'
                    // 311: ķ, 312: ĸ
                    : [311, 312].includes(code)
                      ? 'k'
                      // 314: ĺ, 316: ļ, 318: ľ, 320: ŀ, 322: ł
                      : [314, 316, 318, 320, 322].includes(code)
                        ? 'l'
                        // 241: ñ, 324: ń, 326: ņ, 328: ň, 329: ŉ, 331: ŋ
                        : [241, 324, 326, 328, 329, 331].includes(code)
                          ? 'n'
                          // 242~246: òóôõö, 333: ō, 335: ŏ, 337: ő, 339: œ
                          : (code >= 242 && code <= 246) || [333, 335, 337, 339].includes(code)
                            ? 'o'
                            // 341: ŕ, 343: ŗ, 345: ř
                            : [341, 343, 345].includes(code)
                              ? 'r'
                              // 347: ś, 349: ŝ, 351: ş, 353: š
                              : [347, 349, 351, 353].includes(code)
                                ? 's'
                                // 355: ţ, 357: ť, 359: ŧ
                                : [355, 357, 359].includes(code)
                                  ? 't'
                                  // 249~252: ùúûü, 361: ũ, 363: ū, 365: ŭ, 367: ů, 369: ű, 371: ų
                                  : (code >= 249 && code <= 252) || [361, 363, 365, 367, 369, 371].includes(code)
                                    ? 'u'
                                    // 253: ý, 375: ŷ
                                    : [253, 375].includes(code)
                                      ? 'y'
                                      // 378: ź, 380: ż, 382: ž
                                      : [378, 380, 382].includes(code)
                                        ? 'z'
                                        // 46: .
                                        : removeDots && code === 46
                                          ? ' '
                                          : char
  }).join('')
}

/**
 * Replace unallowed character from incoming http response, to avoid breaking the further storage.
 * The replacement character is a space.
 *
 * @param {String} body - analyzed body
 * @returns {String} the modified body without unallowed characters
 */
exports.replaceUnallowed = body =>
  Array.from(body).map((char, i) => {
    const code = body.charCodeAt(i)
    return (code >= 127 && code <= 191) ? ' ' : char
  }).join('')
