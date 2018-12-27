var BranchPattern = require('./branch-pattern')
var extend = require('./extend')

module.exports = OneOrMore

function OneOrMore () {
  return OneOrMore.__super__.constructor.apply(this, arguments)
}

extend(OneOrMore, BranchPattern)

OneOrMore.prototype.match = function (left, collected) {
  console.assert(this.children.length === 1)
  if (!collected) collected = []
  var l = left
  var c = collected
  var l_ = []
  var matched = true
  var times = 0
  while (matched) {
    // Could it be that something didn't match but changed l or c?
    var current = this.children[0].match(l, c)
    matched = current[0]
    l = current[1]
    c = current[2]
    times += matched ? 1 : 0
    if (l_.join(', ') === l.join(', ')) break
    l_ = l // copy?
  }
  if (times >= 1) {
    return [true, l, c]
  }
  return [false, left, collected]
}
