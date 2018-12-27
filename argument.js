var LeafPattern = require('./leaf-pattern')
var enumerate = require('./enumerate')
var extend = require('./extend')

module.exports = Argument

function Argument () {
  return Argument.__super__.constructor.apply(this, arguments)
}

extend(Argument, LeafPattern)

Argument.prototype.singleMatch = function (left) {
  var enumerated = enumerate(left)
  for (var index = 0; index < enumerated.length; index++) {
    var element = enumerated[index]
    var n = element[0]
    var pattern = element[1]
    if (pattern.value === '--') {
      return [null, null]
    }
    if (pattern.constructor === Argument) {
      return [n, new Argument(this.name, pattern.value)]
    }
  }
  return [null, null]
}

Argument.parse = function (source) {
  var name, value
  name = /(<\S*?>)/ig.exec(source)[1]
  value = /\[default:\s+(.*)\]/ig.exec(source)
  return new Argument(name, value ? value[1] : null)
}
