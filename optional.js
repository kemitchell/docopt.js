var BranchPattern = require('./branch-pattern')
var extend = require('./extend')

module.exports = Optional

function Optional () {
  return Optional.__super__.constructor.apply(this, arguments)
}

extend(Optional, BranchPattern)

Optional.prototype.match = function (left, collected) {
  if (!collected) collected = []
  this.children.forEach(function (p) {
    var match = p.match(left, collected)
    left = match[1]
    collected = match[2]
  })
  return [true, left, collected]
}
