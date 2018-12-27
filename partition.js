module.exports = function partition (string, separator) {
  var parts
  if (string.indexOf(separator) >= 0) {
    parts = string.split(separator)
    return [parts[0], separator, parts.slice(1).join(separator)]
  } else {
    return [String(string), '', '']
  }
}
