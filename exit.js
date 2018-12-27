var extend = require('./extend')

module.exports = Exit

function Exit (message) {
  this.message = message
  Exit.__super__.constructor.call(this, this.message)
}

extend(Exit, Error)
