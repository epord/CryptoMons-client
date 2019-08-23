export const zip = (arr1, arr2) => arr1.map((e, i) => [e, arr2[i]])

export const unique = (arr) => {
  const onlyUnique = (value, index, self) => {
    return self.indexOf(value) === index;
  }

  return arr.filter( onlyUnique );
}