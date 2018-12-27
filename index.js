var Argument = require('./argument')
var Command = require('./command')
var Dict = require('./dict')
var Either = require('./either')
var Exit = require('./exit')
var LanguageError = require('./language-error')
var OneOrMore = require('./one-or-more')
var Option = require('./option')
var Optional = require('./optional')
var OptionsShortcut = require('./options-shortcut')
var Required = require('./required')
var Tokens = require('./tokens')

var partition = require('./partition')
var split = require('./split')
var transform = require('./transform')

function print () {
  return console.log([].join.call(arguments, ' '))
}

function zip () {
  var args = arguments.length > 0 ? Array.prototype.slice.call(arguments, 0) : []
  var lengthArray = args.map(function (array) {
    return array.length
  })
  var length = Math.min.apply(Math, lengthArray)
  var returned = []
  for (var index = 0; index < length; index++) {
    returned.push(args.map(function (array) {
      return array[index]
    }))
  }
  return returned
}

function isUpper (string) {
  return /^[A-Z]+$/g.exec(string)
}

function parseSection (name, source) {
  var matches = source.match(new RegExp('^([^\n]*' + name + '[^\n]*\n?(?:[ \t].*?(?:\n|$))*)', 'igm'))
  if (matches) {
    return matches.map(function (s) {
      return s.trim()
    })
  }
  return []
}

function parseShorts (tokens, options) {
  // shorts ::= '-' ( chars )* [ [ ' ' ] chars ] ;
  var token = tokens.move()
  console.assert(token.startsWith('-') && !token.startsWith('--'))
  var left = token.replace(/^-+/g, '')
  var parsed = []
  while (left !== '') {
    var combined = ['-' + left[0], left.slice(1)]
    var short = combined[0]
    left = combined[1]
    var similar = options.filter(function (o) {
      return o.short === short
    })
    var o, value
    if (similar.length > 1) {
      throw new tokens.error(short + " is specified ambiguously " + similar.length + " times")
    } else if (similar.length < 1) {
      o = new Option(short, null, 0)
      options.push(o)
      if (tokens.error === Exit) {
        o = new Option(short, null, 0, true)
      }
    } else {
      o = new Option(short, similar[0].long, similar[0].argcount, similar[0].value)
      value = null
      if (o.argcount !== 0) {
        if (left === '') {
          var current = tokens.current()
          if (current === null || current === '--') {
            throw new tokens.error(short + ' requires argument')
          }
          value = tokens.move()
        } else {
          value = left
          left = ''
        }
      }
      if (tokens.error === Exit) {
        o.value = value !== null ? value : true
      }
    }
    parsed.push(o)
  }
  return parsed
}

function parseLong (tokens, options) {
  // long ::= '--' chars [ ( ' ' | '=' ) chars ] ;
  var partitioned = partition(tokens.move(), '=')
  var long = partitioned[0]
  var eq = partitioned[1]
  var value = partitioned[2]
  console.assert(long.startsWith('--'))
  if (eq === value && value === '') value = null
  var similar = options.filter(function (o) {
    return o.long === long
  })
  if (tokens.error === Exit && similar.length === 0) {
    similar = options.filter(function (o) {
      return o.long && o.long.startsWith(long)
    })
  }
  var longs
  if (similar.length > 1) {
    longs = similar
      .map(function (o) {
        return o.long
      })
      .join(', ')
    throw new tokens.error(long + " is not a unique prefix: " + longs + "?")
  } else if (similar.length < 1) {
    var argcount = eq === '=' ? 1 : 0
    var o = new Option(null, long, argcount)
    options.push(o)
    if (tokens.error === Exit) {
      o = new Option(null, long, argcount, argcount > 0 ? value : true)
    }
  } else {
    o = new Option(similar[0].short, similar[0].long, similar[0].argcount, similar[0].value)
    if (o.argcount === 0) {
      if (value !== null) {
        throw new tokens.error(o.long + " must not have an argument")
      }
    } else {
      if (value === null) {
        var current = tokens.current()
        if (current === null || current === '--') {
          throw new tokens.error(o.long + " requires argument")
        }
        value = tokens.move()
      }
    }
    if (tokens.error === Exit) {
      o.value = value !== null ? value : true
    }
  }
  return [o]
}

function parsePattern (source, options) {
  var result, tokens
  tokens = Tokens.fromPattern(source)
  result = parseExpr(tokens, options)
  if (tokens.current() !== null) {
    throw new tokens.error('unexpected ending: ' + (tokens.join(' ')))
  }
  return new Required(result)
}

function parseExpr (tokens, options) {
  // expr ::= seq ( '|' seq )* ;
  var seq = parseSeq(tokens, options)
  if (tokens.current() !== '|') return seq
  var result = seq.length > 1 ? [new Required(seq)] : seq
  while (tokens.current() === '|') {
    tokens.move()
    seq = parseSeq(tokens, options)
    result = result.concat(seq.length > 1 ? [new Required(seq)] : seq)
  }
  if (result.length > 1) return [new Either(result)]
  else return result
}

function parseSeq (tokens, options) {
  // seq ::= ( atom [ '...' ] )* ;
  var result = []
  var matches = [null, ']', ')', '|']
  while (!matches.includes(tokens.current())) {
    var atom = parseAtom(tokens, options)
    if (tokens.current() === '...') {
      atom = [new OneOrMore(atom)]
      tokens.move()
    }
    result = result.concat(atom)
  }
  return result
}

function parseAtom (tokens, options) {
  // atom ::= '(' expr ')' | '[' expr ']' | 'options'\n| long | shorts | argument | command ;
  var token = tokens.current()
  var result = []
  if (Array.prototype.indexOf.call('([', token) >= 0) {
    tokens.move()
    var ref = {
      '(': [')', Required],
      '[': [']', Optional]
    }[token]
    var matching = ref[0]
    var PatternType = ref[1]
    result = new PatternType(parseExpr(tokens, options))
    if (tokens.move() !== matching) {
      throw new tokens.error("Unmatched '" + token + "'")
    }
    return [result]
  } else if (token === 'options') {
    tokens.move()
    return [new OptionsShortcut()]
  } else if (token.startsWith('--') && token !== '--') {
    return parseLong(tokens, options)
  } else if (token.startsWith('-') && (token !== '-' && token !== '--')) {
    return parseShorts(tokens, options)
  } else if ((token.startsWith('<') && token.endsWith('>')) || isUpper(token)) {
    return [new Argument(tokens.move())]
  } else {
    return [new Command(tokens.move())]
  }
}

function parseARGV (tokens, options, optionsFirst) {
  if (!optionsFirst == null) optionsFirst = false
  // Parse command-line argument vector.\nIf optionsFirst:\n    argv ::= [ long | shorts ]* [ argument ]* [ '--' [ argument ]* ] ;\nelse:\n    argv ::= [ long | shorts | argument ]* [ '--' [ argument ]* ] ;
  var parsed = []
  while (tokens.current() !== null) {
    if (tokens.current() === '--') {
      return parsed.concat(
        tokens.map(function (v) {
          return new Argument(null, v)
        })
      )
    } else if (tokens.current().startsWith('--')) {
      parsed = parsed.concat(parseLong(tokens, options))
    } else if (tokens.current().startsWith('-') && tokens.current() !== '-') {
      parsed = parsed.concat(parseShorts(tokens, options))
    } else if (optionsFirst) {
      return parsed.concat(
        tokens.map(function (v) {
          return new Argument(null, v)
        })
      )
    } else {
      parsed.push(new Argument(null, tokens.move()))
    }
  }
  return parsed
}

function parseDefaults (doc) {
  var defaults = []
  parseSection('options:', doc).forEach(function (s) {
    s = partition(s, ':')[2]
    var split = ('\n' + s).split(new RegExp('\\n[ \\t]*(-\\S+?)')).slice(1)
    var odd = []
    var even = []
    split.forEach(function (v, index) {
      if (index % 2 === 1) even.push(v)
      else odd.push(v)
    })
    split = zip(odd, even).map(function (pair) {
      var s1 = pair[0]
      var s2 = pair[1]
      return s1 + s2
    })
    var options = split
      .filter(function (s) {
        return s.startsWith('-')
      })
      .map(function (s) {
        return Option.parse(s)
      })
    defaults.push.apply(defaults, options)
  })
  return defaults
}

function formalUsage (section) {
  section = partition(section, ':')[2] // Drop "usage:"
  var pu = split(section)
  var middle = pu.slice(1)
    .map(function (s) {
      return (s === pu[0] ? ') | (' : s)
    })
    .join(' ')
  return '( ' + middle + ' )'
}

function extras (help, version, options, doc) {
  var helpFlags = ['--help', '-h']
  var helpFlag = options.some(function (o) {
    return helpFlags.includes(o.name) && o.value
  })
  if (help && helpFlag) return doc.replace(/^\s*|\s*$/, '')
  var versionFlag = options.some(function (o) {
    return o.name === '--version' && o.value
  })
  if (version && versionFlag) return version
  return ''
}

function docopt (doc, kwargs) {
  if (!kwargs) kwargs = {}
  var allowedargs = ['argv', 'name', 'help', 'version', 'optionsFirst', 'exit']
  for (var arg in kwargs) {
    if (Array.prototype.indexOf.call(allowedargs, arg) < 0) {
      throw new Error('unrecognized argument to docopt: ')
    }
  }
  var argv = kwargs.argv === void 0 ? process.argv.slice(2) : kwargs.argv
  var help = kwargs.help === void 0 ? true : kwargs.help
  var version = kwargs.version === void 0 ? null : kwargs.version
  var optionsFirst = kwargs.optionsFirst === void 0 ? false : kwargs.optionsFirst
  var exit = kwargs.exit === void 0 ? true : kwargs.exit
  try {
    var usageSections = parseSection('usage:', doc)
    if (usageSections.length === 0) {
      throw new LanguageError('"usage:" (case-insensitive) not found.')
    }
    if (usageSections.length > 1) {
      throw new LanguageError('More than one "usage:" (case-insensitive).')
    }
    Exit.usage = usageSections[0]
    var options = parseDefaults(doc)
    var pattern = parsePattern(formalUsage(Exit.usage), options)
    var parsedARGV = parseARGV(new Tokens(argv), options, optionsFirst)
    var patternOptions = pattern.flat(Option)
    pattern.flat(OptionsShortcut).forEach(function (optionsShortcut) {
      var docOptions = parseDefaults(doc)
      var patternOptionsStrings = patternOptions.map(function (i) {
        return i.toString()
      })
      optionsShortcut.children = docOptions.filter(function (item) {
        return patternOptionsStrings.indexOf(item.toString()) < 0
      })
    })
    var output = extras(help, version, parsedARGV, doc)
    if (output) {
      if (exit) {
        print(output)
        process.exit()
      } else {
        throw new Error(output)
      }
    }
    var match = pattern.fix().match(parsedARGV)
    var matched = match[0]
    var left = match[1]
    var collected = match[2]
    if (matched && left.length === 0) {
      var pairs = pattern.flat()
        .concat(collected)
        .map(function (element) {
          return [element.name, element.value]
        })
      return new Dict(pairs).toObject()
    }
    throw new Exit(Exit.usage)
  } catch (error) {
    console.error(error)
    if (!exit) {
      throw error
    } else {
      if (error.message) {
        print(error.message)
      }
      return process.exit(1)
    }
  }
}

module.exports = {
  docopt: docopt,
  LanguageError: LanguageError,
  Exit: Exit,
  Option: Option,
  Argument: Argument,
  Command: Command,
  Required: Required,
  OptionsShortcut: OptionsShortcut,
  Either: Either,
  Optional: Optional,
  OneOrMore: OneOrMore,
  Tokens: Tokens,
  Dict: Dict,
  transform: transform,
  formalUsage: formalUsage,
  parseSection: parseSection,
  parseDefaults: parseDefaults,
  parsePattern: parsePattern,
  parseLong: parseLong,
  parseShorts: parseShorts,
  parseARGV: parseARGV
}
