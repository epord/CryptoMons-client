import web3Utils from 'web3-utils';
import async from 'async'
import { zip, unique } from '../utils/utils'
import { sign } from '../utils/cryptoUtils'


	/// TODO: it does takes into account (and shouldn't) tokens that have emmited events in the following order: StartedExit(), CoinReset()
	const getExitingTokens = (filter, rootChain) => {
		const rootChainAddress = rootChain.address;
		const rcContract = web3.eth.contract(rootChain.abi).at(rootChainAddress)
		const blockFilter = { fromBlock: 0, toBlock: 'latest' };

		const slotsToDic = (arr) => {
			return arr.reduce((o, e) => {
				o[e.args.slot] = true;
				return o;
			}, {})
		};

		return new Promise((resolve, reject) => {
			async.parallel({
				startedExits: cb => rcContract.StartedExit(filter, blockFilter).get(cb),
				coinResets: cb => rcContract.CoinReset(filter, blockFilter).get(cb),
				finalizedExits: cb => rcContract.FinalizedExit(filter, blockFilter).get(cb)
			}, (err, result) => {
				if(err) return reject(err);
				const coinResetsObject = slotsToDic(result.coinResets);
				const finalizedExitsObject = slotsToDic(result.finalizedExits);
				const filteredExits = result.startedExits.filter(e => !coinResetsObject[e.args.slot] && !finalizedExitsObject[e.args.slot]);
				resolve(filteredExits)
			});
		});
	}

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

const subscribeToEvent = (event, filter, rootChain, cb) => {
	const rcContract = web3.eth.contract(rootChain.abi).at(rootChain.address)
	rcContract[event](filter).watch((err, res) => {
		if(err) return console.error(err)
		cb(res)
	})
}

export const subscribeToDeposits = (rootChain, address, cb) => {
	subscribeToEvent("Deposit", {from: address}, rootChain, cb)
}

export const subscribeToSubmittedBlocks = (rootChain, cb) => {
	subscribeToEvent("SubmittedBlock", {}, rootChain, cb)
}

export const subscribeToStartedExit = (rootChain, address, cb) => {
	subscribeToEvent("StartedExit", {owner: address}, rootChain, cb)
}

export const subscribeToCoinReset = (rootChain, address, cb) => {
	subscribeToEvent("CoinReset", {owner: address}, rootChain, cb)
}

export const subscribeToFinalizedExit = (rootChain, address, cb) => {
	subscribeToEvent("FinalizedExit", {owner: address}, rootChain, cb)
}

export const subscribeToWithdrew = (rootChain, address, cb) => {
	subscribeToEvent("Withdrew", {owner: address}, rootChain, cb)
}

export const getChallengeable = (address, rootChain) => {
  return new Promise((resolve, reject) => {
		fetch(`${process.env.API_URL}/api/tokens/owned-by/${address}?exiting=true`).then(response => {
			response.json().then(res => {
				const slotFilter = { slot: res };
				getExitingTokens(slotFilter, rootChain).then(filteredExits => {
					resolve(filteredExits.filter(e => e.args.owner.toLowerCase() !== address.toLowerCase()).map(e=> e.args.slot.toFixed()));
				});
			});
		}).catch(reject);
	});
}

export const getExitingFrom = (address, rootChain)  => {
	const ownerFilter = { owner: address }
	return getExitingTokens(ownerFilter, rootChain).then(filteredExits => filteredExits.map(e=> e.args.slot.toFixed()));
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
      if(err) return reject(err);
      const withdrewExitsObject = slotsToDic(result.withdrewExits);
      const filteredExits = result.finalizedExits.filter(e => !withdrewExitsObject[e.slot]);
      resolve(filteredExits.map(e=> e.args.slot.toFixed()))
    });
  });
};

export const challengeAfter = (slot, rootChain) => {
  const rootChainAddress = rootChain.address;
	const rcContract = web3.eth.contract(rootChain.abi).at(rootChainAddress)

  return new Promise((resolve, reject) => {
		rcContract.getExit(slot, async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const exitBlock = res[2];
			const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${exitBlock}`);
			const exitData = await response.json();

			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const slotBN = web3.toBigNumber(slot);
			const challengingBlockNumberBN = web3.toBigNumber(challengingBlockNumber);

			web3.eth.contract(rootChain.abi).at(rootChainAddress)
				.challengeAfter(slotBN, challengingBlockNumberBN, challengingTransaction, proof, signature, {
					from: web3.eth.accounts[0]
				}, (err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
}

export const challengeBetween = (slot, rootChain) => {
  const rootChainAddress = rootChain.address;
	const rcContract = web3.eth.contract(rootChain.abi).at(rootChainAddress)

  return new Promise((resolve, reject) => {
		rcContract.getExit(slot, async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const parentBlock = res[1];
			const response = await fetch(`${process.env.API_URL}/api/challenges/after?slot=${slot}&exitBlock=${parentBlock}`);
			const exitData = await response.json();

			const { challengingBlockNumber, challengingTransaction, proof, signature} = exitData;
			const slotBN = web3.toBigNumber(slot);
			const challengingBlockNumberBN = web3.toBigNumber(challengingBlockNumber);

			web3.eth.contract(rootChain.abi).at(rootChainAddress)
				.challengeAfter(slotBN, challengingBlockNumberBN, challengingTransaction, proof, signature, {
					from: web3.eth.accounts[0]
				}, (err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
}

export const challengeBefore = (slot, rootChain) => {
  const rootChainAddress = rootChain.address;
	const rcContract = web3.eth.contract(rootChain.abi).at(rootChainAddress)

  return new Promise((resolve, reject) => {
		rcContract.getExit(slot, async (err, res) => {
			//TODO this fetch should not be done here
			if (err) return reject(err);
			const parentBlock = res[1];
			const response = await fetch(`${process.env.API_URL}/api/challenges/before?slot=${slot}&parentBlock=${parentBlock}`);
			const exitData = await response.json();

			const { challengingBlockNumber, challengingTransaction, proof} = exitData;
			const slotBN = web3.toBigNumber(slot);
			const challengingBlockNumberBN = web3.toBigNumber(challengingBlockNumber);

			if (!exitData.signature) {
				//TODO popup explicando que se esta firmando
				exitData.signature = await sign(exitData.hash)
			}

			web3.eth.contract(rootChain.abi).at(rootChainAddress)
				.challengeBefore(slotBN, challengingTransaction, proof, exitData.signature, challengingBlockNumberBN, {
					from: web3.eth.accounts[0],
					value: web3Utils.toWei('0.1', 'ether')
				}, (err, res) => {
					if (err) return reject(err)
					resolve(res);
				})
		})
	})
}

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