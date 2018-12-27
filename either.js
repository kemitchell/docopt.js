var BranchPattern = require('./branch-pattern')
var extend = require('./extend')

module.exports = Either

function Either () {
  return Either.__super__.constructor.apply(this, arguments)
}

extend(Either, BranchPattern)

Either.prototype.match = function (left, collected) {
  if (!collected) collected = []
  var outcomes = []
  this.children.forEach(function (p) {
    var outcome = p.match(left, collected)
    if (outcome[0]) outcomes.push(outcome)
  })
  if (outcomes.length > 0) {
    outcomes.sort(function (a, b) {
      if (a[1].length > b[1].length) return 1
      else if (a[1].length < b[1].length) return -1
      else return 0
    })
    return outcomes[0]
  }
  return [false, left, collected]
}
