var Optional = require('./optional')
var extend = require('./extend')

module.exports = OptionsShortcut

function OptionsShortcut () {
  return OptionsShortcut.__super__.constructor.apply(this, arguments)
}

extend(OptionsShortcut, Optional)
