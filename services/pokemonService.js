import { getCryptomon, getPokemonData, getPlasmaCoinId } from './ethService';
import { getTypeData } from '../utils/pokeUtils';

export const getCryptoMonFromId = (id, cryptoMonsContract) => {
  console.log('fetching id', id)
  return new Promise((resolve, reject) => {
  getCryptomon(id, cryptoMonsContract).then(ans => {
      getPokemonData(ans.id, cryptoMonsContract).then(data => {
        const cryptoMonInstance = ans;
        const cryptoMonData = data

        cryptoMonData.imageUrl = getCryptoMonImageUrl(data.id);
        cryptoMonData.type1 = getTypeData(data.type1);
        cryptoMonData.type2 = getTypeData(data.type2);

        resolve({ cryptoMonData, cryptoMonInstance });
      });
    });
  });
}

export const getCryptoMonFromPlasmaId = (id, cryptoMonsContract, rootChainContract) => {
  return new Promise((resolve, reject) => {
  getPlasmaCoinId(id, rootChainContract).then(token => {
    getCryptoMonFromId(token, cryptoMonsContract).then(resolve)
    });
  });
}

export const getCryptoMonImageUrl = id => {
  var id = `${id}`.padStart(3, '0');
  return `https://raw.githubusercontent.com/fanzeyi/pokemon.json/master/images/${id}.png`;
}