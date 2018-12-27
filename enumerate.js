module.exports = function enumerate (array) {
  return array.map(function (element, index) {
    return [index, element]
  })
}
