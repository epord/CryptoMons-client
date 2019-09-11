export const zip = (arr1, arr2) => arr1.map((e, i) => [e, arr2[i]])

export const unique = (arr, comparator) => {
  const onlyUnique = (value, index, self) => {
    let found = comparator ? self.findIndex(comparator(value)) : self.indexOf(value)
    return found === index;
  }

  return arr.filter( onlyUnique );
}

export const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}
