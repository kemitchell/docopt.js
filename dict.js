var extend = require('./extend')

module.exports = Dict

function Dict (pairs) {
  var self = this
  pairs.forEach(function (pair) {
    var key = pair[0]
    var value = pair[1]
    self[key] = value
  })
}

extend(Dict, Object)

Dict.prototype.toObject = function () {
  var self = this
  var dict = {}
  Object.keys(this)
    .sort()
    .forEach(function (name) {
      dict[name] = self[name]
    })
  return dict
}
