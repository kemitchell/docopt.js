var BranchPattern = require('./branch-pattern')
var extend = require('./extend')

module.exports = Required

function Required () {
  return Required.__super__.constructor.apply(this, arguments)
}

extend(Required, BranchPattern)

Required.prototype.match = function (left, collected) {
  if (!collected) collected = []
  var l = left
  var c = collected
  for (var index = 0; index < this.children.length; index++) {
    var p = this.children[index]
    var match = p.match(l, c)
    var matched = match[0]
    l = match[1]
    c = match[2]
    if (!matched) return [false, left, collected]
  }
  return [true, l, c]
}
