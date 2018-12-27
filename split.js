module.exports = function split (string) {
  return string
    .trim()
    .split(/\s+/)
    .filter(function (i) { return i })
}

