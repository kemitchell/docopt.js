var Pattern = require('./pattern')
var extend = require('./extend')

module.exports = BranchPattern

console.log(typeof Pattern)

function BranchPattern (children) {
  this.children = children instanceof Array ? children : [children]
}

extend(BranchPattern, Pattern)

BranchPattern.prototype.toString = function () {
  var representation = this.children.join(', ')
  return this.constructor.name + '(' + representation + ')'
}

BranchPattern.prototype.flat = function (types) {
  if (!types) types = []
  types = types instanceof Array ? types : [types]
  if (types.includes(this.constructor)) {
    return [this]
  }
  return this.children
    .filter(function (child) {
      console.log(Pattern)
      return child instanceof Pattern
    })
    .map(function (child) { return child.flat(types) })
    .reduce(function (pv, cv) {
      return pv.concat(cv)
    }, [])
}
