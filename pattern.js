var Argument = require('./argument')
var Command = require('./command')
var Option = require('./option')
var enumerate = require('./enumerate')
var extend = require('./extend')
var split = require('./split')
var transform = require('./transform')

module.exports = Pattern

function Pattern () {
  return Pattern.__super__.constructor.apply(this, arguments)
}

extend(Pattern, Object)

Pattern.prototype.fix = function () {
  this.fixIdentities()
  this.fixRepeatingArguments()
  return this
}

Pattern.prototype.fixIdentities = function (uniq) {
  // Make pattern-tree tips point to same object if they are equal.
  if (!uniq) uniq = null
  if (!this.hasOwnProperty('children')) return this
  if (uniq === null) {
    uniq = {}
    var flat = this.flat()
    flat.forEach(function (k) { uniq[k] = k })
  }
  var self = this
  enumerate(this.children).forEach(function (pair) {
    var i = pair[0]
    var c = pair[1]
    if (!c.hasOwnProperty('children')) {
      console.assert(uniq.hasOwnProperty(c))
      self.children[i] = uniq[c]
    } else {
      c.fixIdentities(uniq)
    }
  })
  return this
}

Pattern.prototype.fixRepeatingArguments = function () {
  // Fix elements that should accumulate/increment values.
  var either = transform(this).children.map(function (child) {
    return child.children
  })
  either.forEach(function (mycase) {
    var counts = {}
    mycase.forEach(function (c) {
      counts[c] = (counts[c] ? counts[c] : 0) + 1
    })
    var countAtLeastOne = mycase.filter(function (child) {
      return counts[child] > 1
    })
    countAtLeastOne.forEach(function (e) {
      if (
        e.constructor === Argument ||
        (e.constructor === Option && e.argcount)
      ) {
        if (e.value === null) {
          e.value = []
        } else if (e.value.constructor !== Array) {
          e.value = split(e.value)
        }
      }
      if (
        e.constructor === Command ||
        (e.constructor === Option && e.argcount === 0)
      ) {
        e.value = 0
      }
    })
  })
  return this
}
