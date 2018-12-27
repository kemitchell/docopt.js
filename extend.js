module.exports = function extend (child, parent) {
  for (var key in parent) {
    if (parent.hasOwnProperty(key)) child[key] = parent[key]
  }
  function CTOR () {
    this.constructor = child
  }
  CTOR.prototype = parent.prototype
  child.prototype = new CTOR()
  child.__super__ = parent.prototype
  return child
}
