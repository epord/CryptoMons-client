#WIP
This is a WIP project on a Token-based Plasma Cash Implementations. 
This repo corresponds to Client to interact with the main contracts and 
the Side-Chain, in the 3-repo project.

API Side Chain     - https://github.com/epord/Plasma-Cash-SideChain

Front End Client   - https://github.com/epord/CryptoMons-client

Ethereum Contracts - https://github.com/epord/Plasma-Cash-RootChain

# How to run

## Requirements
1. Make sure to check [How to run the blockchain](https://github.com/epord/Plasma-Cash-RootChain) and follow the readme
2. Follow the `Using the client` section in [Blockchain](https://github.com/epord/Plasma-Cash-RootChain) readme
3. Make sure to check [How to run the API](https://github.com/epord/Plasma-Cash-SideChain) and follow the readme
4. Have the Blockchain and API Running
5. Create the file `.env` in the root directory and add the following lines:  
    ```
    API_URL=http://localhost:8082  //URL of the SideChain API
    ```

## Installation
1. `npm install`
2. `npm start`. Default port is 8080, to change port run `npm start -- --port [port]`
3. Open up the browser in `localhost:8080`. If Metamask is setup correctly you should see your address.