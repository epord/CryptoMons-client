const EthUtils	= require('ethereumjs-util');

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

export const randomHex256 = () => {
  const dict = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f'];
  let hex = '0x';
  for (let i = 0; i < 64; i++) {
    const i = Math.floor(Math.random() * dict.length);
    hex += dict[i];
  }
  return hex;
}

export const keccak256 = value => {
  return EthUtils.bufferToHex(EthUtils.keccak256(value));
}

export const toReadableAddress = (str) => {
  return str.slice(0,5) + "..." + str.slice(str.length - 3)
};

export const toAddressColor = (str) => {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = '#';
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    colour += ('00' + value.toString(16)).substr(-2);
  }
  return colour;
};