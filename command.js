var Argument = require('./argument')
var enumerate = require('./enumerate')
var extend = require('./extend')

module.exports = Command

function Command (name1, value1) {
  this.name = name1
  this.value = value1 != null ? value1 : false
}

extend(Command, Argument)

Command.prototype.singleMatch = function (left) {
  var enumerated = enumerate(left)
  for (var index = 0; index < enumerated.length; index++) {
    var element = enumerated[index]
    var n = element[0]
    var pattern = element[1]
    if (pattern.constructor === Argument) {
      if (pattern.value === this.name) {
        return [n, new Command(this.name, true)]
      }
      break
    }
  }
  return [null, null]
}
