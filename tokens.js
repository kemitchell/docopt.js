var Exit = require('./exit')
var LanguageError = require('./language-error')
var extend = require('./extend')
var split = require('./split')

module.exports = Tokens

function Tokens (source, error) {
  var stream
  this.error = error != null ? error : Exit
  stream = source.constructor === String ? split(source) : source
  this.push.apply(this, stream)
}

extend(Tokens, Array)

Tokens.prototype.move = function () {
  if (this.length) return [].shift.apply(this)
  else return null
}

Tokens.prototype.current = function () {
  if (this.length) return this[0]
  else return null
}

Tokens.fromPattern = function (source) {
  var s
  source = source.replace(/([[\]()|]|\.\.\.)/g, ' $1 ')
  source = (function () {
    var j, len, ref, results
    ref = source.split(/\s+|(\S*<.*?>)/)
    results = []
    for (j = 0, len = ref.length; j < len; j++) {
      s = ref[j]
      if (s) results.push(s)
    }
    return results
  })()
  return new Tokens(source, LanguageError)
}
