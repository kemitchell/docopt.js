var LeafPattern = require('./leaf-pattern')
var enumerate = require('./enumerate')
var extend = require('./extend')
var partition = require('./partition')
var split = require('./split')

module.exports = Option

function Option (short, long, argcount, value) {
  this.short = short != null ? short : null
  this.long = long != null ? long : null
  this.argcount = argcount != null ? argcount : 0
  if (!value) value = false
  console.assert(this.argcount === 0 || this.argcount === 1)
  this.value = value === false && this.argcount > 0 ? null : value
  this.name = this.long || this.short
}

extend(Option, LeafPattern)

Option.prototype.toString = function () {
  return 'Option(' + this.short + ', ' + this.long + ', ' + this.argcount + ', ' + this.value + ')'
}

Option.parse = function (optionDescription) {
  var short = null
  var long = null
  var argcount = 0
  var value = false
  var partitioned = partition(optionDescription.trim(), '  ')
  var options = partitioned[0]
  var description = partitioned[2]
  options = options.replace(/,|=/g, ' ')
  // Split on spaces.
  split(options).forEach(function (s) {
    if (s.startsWith('--')) {
      long = s
    } else if (s.startsWith('-')) {
      short = s
    } else {
      argcount = 1
    }
  })
  if (argcount > 0) {
    var matched = /\[default:\s+(.*)\]/ig.exec(description)
    value = matched ? matched[1] : null
  }
  return new Option(short, long, argcount, value)
}

Option.prototype.singleMatch = function (left) {
  var enumerated = enumerate(left)
  for (var index = 0; index < enumerated.length; index++) {
    var element = enumerated[index]
    var n = element[0]
    var pattern = element[1]
    if (this.name === pattern.name) {
      return [n, pattern]
    }
  }
  return [null, null]
}
