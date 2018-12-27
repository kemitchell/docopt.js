function extend (child, parent) {
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

function print () {
  return console.log([].join.call(arguments, ' '))
}

function enumerate (array) {
  var i, item, j, len, results
  i = 0
  results = []
  for (j = 0, len = array.length; j < len; j++) {
    item = array[j]
    results.push([i++, item])
  }
  return results
}

function any (array) {
  return array.indexOf(true) >= 0
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

function partition (string, separator) {
  var parts
  if (string.indexOf(separator) >= 0) {
    parts = string.split(separator)
    return [parts[0], separator, parts.slice(1).join(separator)]
  } else {
    return [String(string), '', '']
  }
}

function split (string) {
  return string
    .trim()
    .split(/\s+/)
    .filter(function (i) { return i })
}

function isUpper (string) {
  return /^[A-Z]+$/g.exec(string)
}

function DocoptLanguageError (message) {
  this.message = message
  DocoptLanguageError.__super__.constructor.call(this, this.message)
}

extend(DocoptLanguageError, Error)

function DocoptExit (message) {
  this.message = message
  DocoptExit.__super__.constructor.call(this, this.message)
}

extend(DocoptExit, Error)

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
    flat.forEach(function (k) {
      uniq[k] = k
    })
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

function transform (pattern) {
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

function LeafPattern (name1, value1) {
  this.name = name1
  this.value = value1 != null ? value1 : null
}

extend(LeafPattern, Pattern)

LeafPattern.prototype.toString = function () {
  return this.constructor.name + '(' + this.name + ', ' + this.value + ')'
}

LeafPattern.prototype.flat = function (types) {
  if (!types) types = []
  types = types instanceof Array ? types : [types]
  if (!types.length || types.includes(this.constructor)) {
    return [this]
  } else {
    return []
  }
}

LeafPattern.prototype.match = function (left, collected) {
  if (!collected) collected = []
  var singleMatch = this.singleMatch(left)
  var pos = singleMatch[0]
  var match = singleMatch[1]
  if (match === null) {
    return [false, left, collected]
  }
  var left_ = left.slice(0, pos).concat(left.slice(pos + 1))
  var self = this
  var sameName = collected.filter(function (a) {
    return a.name === self.name
  })
  var increment
  if (Number.isInteger(this.value) || this.value instanceof Array) {
    if (Number.isInteger(this.value)) {
      increment = 1
    } else {
      increment = typeof match.value === 'string' ? [match.value] : match.value
    }
    if (!sameName.length) {
      match.value = increment
      return [true, left_, collected.concat(match)]
    }
    if (Number.isInteger(this.value)) {
      sameName[0].value += increment
    } else {
      sameName[0].value = [].concat(sameName[0].value, increment)
    }
    return [true, left_, collected]
  }
  return [true, left_, collected.concat(match)]
}

function BranchPattern (children) {
  this.children = children instanceof Array ? children : [children]
}

extend(BranchPattern, Pattern)

BranchPattern.prototype.toString = function () {
  var representation = this.children.join(', ')
  return this.constructor.name + '(' + representation + ')'
}

BranchPattern.prototype.flat = function (types) {
  if (!types) types = []
  types = types instanceof Array ? types : [types]
  if (types.includes(this.constructor)) {
    return [this]
  }
  return this.children
    .filter(function (child) { return child instanceof Pattern })
    .map(function (child) { return child.flat(types) })
    .reduce(function (pv, cv) {
      return pv.concat(cv)
    }, [])
}

function Argument () {
  return Argument.__super__.constructor.apply(this, arguments)
}

extend(Argument, LeafPattern)

Argument.prototype.singleMatch = function (left) {
  var enumerated = enumerate(left)
  for (var index = 0; index < enumerated.length; index++) {
    var element = enumerated[index]
    var n = element[0]
    var pattern = element[1]
    if (pattern.value === '--') {
      return [null, null]
    }
    if (pattern.constructor === Argument) {
      return [n, new Argument(this.name, pattern.value)]
    }
  }
  return [null, null]
}

Argument.parse = function (source) {
  var name, value
  name = /(<\S*?>)/ig.exec(source)[1]
  value = /\[default:\s+(.*)\]/ig.exec(source)
  return new Argument(name, value ? value[1] : null)
}

function Command (name1, value1) {
  this.name = name1
  this.value = value1 != null ? value1 : false
}

extend(Command, Argument)

Command.prototype.singleMatch = function (left) {
  var enumerated = enumerate(left)
  for (var index = 0; index < enumerated.length; index++) {
    var element = enumerated[index]
    var n = element[0]
    var pattern = element[1]
    if (pattern.constructor === Argument) {
      if (pattern.value === this.name) {
        return [n, new Command(this.name, true)]
      }
      break
    }
  }
  return [null, null]
}

function Option (short, long, argcount, value) {
  this.short = short != null ? short : null
  this.long = long != null ? long : null
  this.argcount = argcount != null ? argcount : 0
  if (value == null) {
    value = false
  }
  console.assert(this.argcount === 0 || this.argcount === 1)
  this.value = value === false && this.argcount > 0 ? null : value
  this.name = this.long || this.short
}

extend(Option, LeafPattern)

Option.prototype.toString = function () {
  return 'Option(' + this.short + ', ' + this.long + ', ' + this.argcount + ', ' + this.value + ')'
}

Option.parse = function (optionDescription) {
  var short = null
  var long = null
  var argcount = 0
  var value = false
  var partitioned = partition(optionDescription.trim(), '  ')
  var options = partitioned[0]
  var description = partitioned[2]
  options = options.replace(/,|=/g, ' ')
  // Split on spaces.
  split(options).forEach(function (s) {
    if (s.startsWith('--')) {
      long = s
    } else if (s.startsWith('-')) {
      short = s
    } else {
      argcount = 1
    }
  })
  if (argcount > 0) {
    var matched = /\[default:\s+(.*)\]/ig.exec(description)
    value = matched ? matched[1] : null
  }
  return new Option(short, long, argcount, value)
}

Option.prototype.singleMatch = function (left) {
  var enumerated = enumerate(left)
  for (var index = 0; index < enumerated.length; index++) {
    var element = enumerated[index]
    var n = element[0]
    var pattern = element[1]
    if (this.name === pattern.name) {
      return [n, pattern]
    }
  }
  return [null, null]
}

function Required () {
  return Required.__super__.constructor.apply(this, arguments)
}

extend(Required, BranchPattern)

Required.prototype.match = function (left, collected) {
  if (!collected) collected = []
  var l = left
  var c = collected
  for (var index = 0; index < this.children.length; index++) {
    var p = this.children[index]
    var match = p.match(l, c)
    var matched = match[0]
    l = match[1]
    c = match[2]
    if (!matched) return [false, left, collected]
  }
  return [true, l, c]
}

function Optional () {
  return Optional.__super__.constructor.apply(this, arguments)
}

extend(Optional, BranchPattern)

Optional.prototype.match = function (left, collected) {
  if (!collected) collected = []
  this.children.forEach(function (p) {
    var match = p.match(left, collected)
    left = match[1]
    collected = match[2]
  })
  return [true, left, collected]
}

function OptionsShortcut () {
  return OptionsShortcut.__super__.constructor.apply(this, arguments)
}

extend(OptionsShortcut, Optional)

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

function Either () {
  return Either.__super__.constructor.apply(this, arguments)
}

extend(Either, BranchPattern)

Either.prototype.match = function (left, collected) {
  if (!collected) collected = []
  var outcomes = []
  this.children.forEach(function (p) {
    var outcome = p.match(left, collected)
    if (outcome[0]) {
      outcomes.push(outcome)
    }
  })
  if (outcomes.length > 0) {
    outcomes.sort(function (a, b) {
      if (a[1].length > b[1].length) {
        return 1
      } else if (a[1].length < b[1].length) {
        return -1
      } else {
        return 0
      }
    })
    return outcomes[0]
  }
  return [false, left, collected]
}

function Tokens (source, error) {
  var stream
  this.error = error != null ? error : DocoptExit
  stream = source.constructor === String ? split(source) : source
  this.push.apply(this, stream)
}

extend(Tokens, Array)

Tokens.prototype.move = function () {
  if (this.length) {
    return [].shift.apply(this)
  } else {
    return null
  }
}

Tokens.prototype.current = function () {
  if (this.length) {
    return this[0]
  } else {
    return null
  }
}

Tokens.from_pattern = function (source) {
  var s
  source = source.replace(/([[\]()|]|\.\.\.)/g, ' $1 ')
  source = (function () {
    var j, len, ref, results
    ref = source.split(/\s+|(\S*<.*?>)/)
    results = []
    for (j = 0, len = ref.length; j < len; j++) {
      s = ref[j]
      if (s) {
        results.push(s)
      }
    }
    return results
  })()
  return new Tokens(source, DocoptLanguageError)
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
      if (tokens.error === DocoptExit) {
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
      if (tokens.error === DocoptExit) {
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
  if (tokens.error === DocoptExit && similar.length === 0) {
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
    if (tokens.error === DocoptExit) {
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
    if (tokens.error === DocoptExit) {
      o.value = value !== null ? value : true
    }
  }
  return [o]
}

function parsePattern (source, options) {
  var result, tokens
  tokens = Tokens.from_pattern(source)
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
  if (result.length > 1) {
    return [new Either(result)]
  } else {
    return result
  }
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
  return '( ' + ((function () {
    var j, len, ref1, results
    ref1 = pu.slice(1)
    results = []
    for (j = 0, len = ref1.length; j < len; j++) {
      var s = ref1[j]
      results.push(s === pu[0] ? ') | (' : s)
    }
    return results
  })()).join(' ') + ' )'
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
      throw new DocoptLanguageError('"usage:" (case-insensitive) not found.')
    }
    if (usageSections.length > 1) {
      throw new DocoptLanguageError('More than one "usage:" (case-insensitive).')
    }
    DocoptExit.usage = usageSections[0]
    var options = parseDefaults(doc)
    var pattern = parsePattern(formalUsage(DocoptExit.usage), options)
    var argv = parseARGV(new Tokens(argv), options, optionsFirst)
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
    var output = extras(help, version, argv, doc)
    if (output) {
      if (exit) {
        print(output)
        process.exit()
      } else {
        throw new Error(output)
      }
    }
    var match = pattern.fix().match(argv)
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
    throw new DocoptExit(DocoptExit.usage)
  } catch (error) {
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
  DocoptLanguageError: DocoptLanguageError,
  DocoptExit: DocoptExit,
  Option: Option,
  Argument: Argument,
  Command: Command,
  Required: Required,
  OptionsShortcut: OptionsShortcut,
  Either: Either,
  Optional: Optional,
  Pattern: Pattern,
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
