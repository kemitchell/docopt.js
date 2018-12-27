var extend = require('./extend')

module.exports = LanguageError

function LanguageError (message) {
  this.message = message
  LanguageError.__super__.constructor.call(this, this.message)
}

extend(LanguageError, Error)
