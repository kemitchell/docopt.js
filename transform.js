var Either = require('./either')
var OneOrMore = require('./one-or-more')
var Optional = require('./optional')
var OptionsShortcut = require('./options-shortcut')
var Required = require('./required')
var any = require('./any')

module.exports = function transform (pattern) {
  // Expand pattern into an (almost) equivalent one, but with single Either.
  // Example: ((-a | -b) (-c | -d)) => (-a -c | -a -d | -b -c | -b -d)
  // Quirks: [-a] => (-a), (-a...) => (-a -a)
  var result = []
  var parents = [Required, Optional, OptionsShortcut, Either, OneOrMore]
  var groups = [[pattern]]
  while (groups.length) {
    var children = groups.shift()
    if (
      any(
        parents.map(function (t) {
          return children.some(function (c) {
            return c.constructor === t
          })
        })
      )
    ) {
      var child = children.filter(function (c) {
        return parents.includes(c.constructor)
      })[0]
      var index = children.indexOf(child)
      if (index >= 0) {
        children.splice(index, 1)
      }
      if (child.constructor === Either) {
        child.children.forEach(function (c) {
          groups.push([c].concat(children))
        })
      } else if (child.constructor === OneOrMore) {
        groups.push((child.children.concat(child.children)).concat(children))
      } else {
        groups.push(child.children.concat(children))
      }
    } else {
      result.push(children)
    }
  }
  return new Either(result.map(function (e) {
    return new Required(e)
  }))
}
