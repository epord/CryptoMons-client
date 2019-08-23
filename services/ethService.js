import web3Utils from 'web3-utils';
import async from 'async'
import { zip, unique } from '../utils/utils'
import { BN } from 'ethereumjs-util';

export const depositToPlasma = (token, cryptoMons, rootChain) => {
	const cryptoMonsAddress = cryptoMons.address;
	const rootChainAddress = rootChain.address;
	const cryptoMonsAbi = cryptoMons.abi;
	const sender = web3.eth.accounts[0];

	return new Promise((resolve, reject) => {
		web3.eth.contract(cryptoMonsAbi).at(cryptoMonsAddress).safeTransferFrom(sender, rootChainAddress, token, (err, res) => {
			if (err) return reject(err)
			resolve(res)
		})
	})
}

export const getDepositsFrom = (address, rootChain)  => {
	const rootChainAddress = rootChain.address;

	return new Promise((resolve, reject) => {
		web3.eth.contract(rootChain.abi).at(rootChainAddress).Deposit({ from: address }, { fromBlock: 0, toBlock: 'latest' })
			.get((err, res) => {
				if (err) return reject(err)
				resolve(res);
			})
	})
}

export const getExitingFrom = (address, rootChain)  => {
	const rootChainAddress = rootChain.address;
	const rcContract = web3.eth.contract(rootChain.abi).at(rootChainAddress)
	const ownerFilter = { owner: address }
	const blockFilter = { fromBlock: 0, toBlock: 'latest' };

	const slotsToDic = (arr) => {
		return arr.reduce((o, e) => {
			o[e.slot] = true;
			return o;
		}, {})
	};

	return new Promise((resolve, reject) => {
		async.parallel({
			startedExits: cb => rcContract.StartedExit(ownerFilter, blockFilter).get(cb),
			coinResets: cb => rcContract.CoinReset(ownerFilter, blockFilter).get(cb),
			finalizedExits: cb => rcContract.FinalizedExit(ownerFilter, blockFilter).get(cb)
			}, (err, result) => {

		  console.log(result)
			if(err) return reject(err);
			const coinResetsObject = slotsToDic(result.coinResets);
			const finalizedExitsObject = slotsToDic(result.finalizedExits);
			const filteredExits = result.startedExits.filter(e => !coinResetsObject[e.slot] && !finalizedExitsObject[e.slot]);
			resolve(filteredExits.map(e=> e.args.slot.toFixed()))
		});
	});
};

export const getExitedFrom = (address, rootChain)  => {
  const rootChainAddress = rootChain.address;
  const rcContract = web3.eth.contract(rootChain.abi).at(rootChainAddress)
  const ownerFilter = { owner: address }
  const blockFilter = { fromBlock: 0, toBlock: 'latest' };

  const slotsToDic = (arr) => {
    return arr.reduce((o, e) => {
      o[e.slot] = true;
      return o;
    }, {})
  };

  return new Promise((resolve, reject) => {
    async.parallel({
      finalizedExits: cb => rcContract.FinalizedExit(ownerFilter, blockFilter).get(cb),
      withdrewExits: cb => rcContract.Withdrew(ownerFilter, blockFilter).get(cb)
    }, (err, result) => {

      console.log(result)
      if(err) return reject(err);
      const withdrewExitsObject = slotsToDic(result.withdrewExits);
      const filteredExits = result.finalizedExits.filter(e => !withdrewExitsObject[e.slot]);
      resolve(filteredExits.map(e=> e.args.slot.toFixed()))
    });
  });
};


export const getCryptoMonsFrom = (address, cryptoMons) => {
  const cryptoMonsAddress = cryptoMons.address;

  return new Promise((resolve, reject) => {
    web3.eth.contract(cryptoMons.abi).at(cryptoMonsAddress).Transfer({ to: address }, { fromBlock: 0, toBlock: 'latest' })
      .get((err, res) => {
        if(err) return reject(err)

        const tokens = unique(res.map(transfer => transfer.args.tokenId.toFixed()))
        async.parallel(
          tokens.map(tokenId => cb => web3.eth.contract(cryptoMons.abi).at(cryptoMonsAddress).ownerOf(tokenId, cb)),
          (err, res) => {
            if (err) return reject(err);
            resolve(zip(tokens, res).filter((e) => e[1] == address).map(e => e[0]))
          });
      });
  });
}

export const finalizeExit = (rootChain, slot) => {
	const rootChainAddress = rootChain.address;
	const slotBN = web3.toBigNumber(slot);

	return new Promise((resolve, reject) => {
		web3.eth.contract(rootChain.abi).at(rootChainAddress).finalizeExit(slotBN, (err, res) => {
			if (err) return reject(err);
			resolve(res);
		})
	});
}

export const withdraw = (rootChain, slot) => {
	const rootChainAddress = rootChain.address;
	const slotBN = web3.toBigNumber(slot);

	return new Promise((resolve, reject) => {
		web3.eth.contract(rootChain.abi).at(rootChainAddress).withdraw(slotBN, (err, res) => {
			if (err) return reject(err);
			resolve(res);
		})
	});
}

export const approveCryptoMons = (cryptoMons, vmc) => {

	const cryptoMonsAddress = cryptoMons.address;
	const vmcAddress = vmc.address;
	const vmcAbi = vmc.abi;

	return new Promise((resolve, reject) => {
		web3.eth.contract(vmcAbi).at(vmcAddress).toggleToken(cryptoMonsAddress, (err, res) => {
			 if (err) return reject(err)
			 resolve(res)
	 })
	})
}

export const buyCryptoMon = cryptoMons => {
	const cryptoMonsAddress = cryptoMons.address;
	const cryptoMonsAbi = cryptoMons.abi;
	return new Promise((resolve, reject) => {
		web3.eth.contract(cryptoMonsAbi).at(cryptoMonsAddress).buyCryptoMon({
			from: web3.eth.accounts[0],
			value: web3Utils.toWei('0.01', 'ether')
		}, (err, res) => {
			if (err) return reject(err)
			resolve(res);
		})
	})
}

export const exitToken = (rootChain, {slot, prevTxBytes, exitingTxBytes, prevTxInclusionProof, exitingTxInclusionProof, signature, blocks}) => {
	const rootChainAddress = rootChain.address;
	const slotBN = web3.toBigNumber(slot);
	const _blocks = [
			web3.toBigNumber(blocks[0]),
			blocks[1] ? web3.toBigNumber(blocks[1]) : web3.toBigNumber(0)
		]

		console.log({slotBN, prevTxBytes, exitingTxBytes, prevTxInclusionProof, exitingTxInclusionProof, signature, _blocks})

	return new Promise((resolve, reject) => {
		web3.eth.contract(rootChain.abi).at(rootChainAddress)
		.startExit(slotBN, prevTxBytes, exitingTxBytes, prevTxInclusionProof, exitingTxInclusionProof, signature, _blocks, {
			from: web3.eth.accounts[0],
			value: web3Utils.toWei('0.1', 'ether')
		}, (err, res) => {
			if (err) return reject(err)
			resolve(res);
		})
	})
}