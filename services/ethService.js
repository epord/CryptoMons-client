import web3Utils from 'web3-utils';

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

export const getCryptoMonsFrom = (address, cryptoMons) => {
	const cryptoMonsAddress = cryptoMons.address;

	return new Promise((resolve, reject) => {
		web3.eth.contract(cryptoMons.abi).at(cryptoMonsAddress).Transfer({ to: address }, { fromBlock: 0, toBlock: 'latest' })
		.get((err, res) => {
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