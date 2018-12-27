var Pattern = require('./pattern')
var extend = require('./extend')

module.exports = LeafPattern

function LeafPattern (name1, value1) {
  this.name = name1
  this.value = value1 != null ? value1 : null
}

extend(LeafPattern, Pattern)

LeafPattern.prototype.toString = function () {
  return this.constructor.name + '(' + this.name + ', ' + this.value + ')'
}

LeafPattern.prototype.flat = function (types) {
  if (!types) types = []
  types = types instanceof Array ? types : [types]
  if (!types.length || types.includes(this.constructor)) {
    return [this]
  } else {
    return []
  }
}

LeafPattern.prototype.match = function (left, collected) {
  if (!collected) collected = []
  var singleMatch = this.singleMatch(left)
  var pos = singleMatch[0]
  var match = singleMatch[1]
  if (match === null) {
    return [false, left, collected]
  }
  var left_ = left.slice(0, pos).concat(left.slice(pos + 1))
  var self = this
  var sameName = collected.filter(function (a) {
    return a.name === self.name
  })
  var increment
  if (Number.isInteger(this.value) || this.value instanceof Array) {
    if (Number.isInteger(this.value)) {
      increment = 1
    } else {
      increment = typeof match.value === 'string' ? [match.value] : match.value
    }
    if (!sameName.length) {
      match.value = increment
      return [true, left_, collected.concat(match)]
    }
    if (Number.isInteger(this.value)) {
      sameName[0].value += increment
    } else {
      sameName[0].value = [].concat(sameName[0].value, increment)
    }
    return [true, left_, collected]
  }
  return [true, left_, collected.concat(match)]
}
