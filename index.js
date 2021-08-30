const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const Web3 = require("web3")
const Tx = require('ethereumjs-tx');

const filePath = `./20210830110928_addresses_with_keys.txt`
const defaultGasPrice = 1500000000 //WEI 1.5 Gwei
const defaultGasLimit = 200000;
// https://api2.metaswap.codefi.network/networks/137/trades?destinationToken=0x0000000000000000000000000000000000000000&sourceToken=0x2791bca1f2de4661ed88a30c99a7a9449aa84174&sourceAmount=3786230&slippage=3&timeout=10000&walletAddress=0x060bbae03ef52f1b47db247215da0fb87ff4b2eb
const baseUrl = 'https://api2.metaswap.codefi.network/networks/137/trades'
const sourceAmount = 50000000000000000000 // 50 Maitic


const ETHAddress = '0x0000000000000000000000000000000000000000';
const WETHAddress = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';

const slipPage = 5;

const infura = `https://rpc-mainnet.matic.quiknode.pro`
const web3 = new Web3(new Web3.providers.HttpProvider(infura))


const accounts = [];
const accountsWithKey = [];

async function processLineByLine() {
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const arr = line.split( ',' );
        accounts.push(arr[0]);
        accountsWithKey.push({
        address:arr[0],
        privateKey:arr[1]
        })
    }
}

async function getData(senderAddress){
    
    // https://api.metaswap.codefi.network/trades?sourceToken=0x0000000000000000000000000000000000000000&destinationToken=0x6b175474e89094c44da98b954eedeac495271d0f&sourceAmount=20000000000000000&walletAddress=0x060bbae03EF52F1B47db247215Da0FB87FF4B2EB&slippage=2

    const url = `${baseUrl}?sourceToken=${ETHAddress}&destinationToken=${WETHAddress}&walletAddress=${senderAddress}&sourceAmount=${sourceAmount}&slippage=${slipPage}`

    const result = await axios.get(url)
    
    //指定1Inch的交易
    return result.data.filter(v=>{return v.aggregator === 'oneInch'})

}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function  main(){

    await processLineByLine();

    asyncForEach(accountsWithKey, async ({address, privateKey}, i) => {
        await sleep(1000)
        const result  = await getData(address)
        const _tx = result[0].trade
        _tx.nonce = await web3.eth.getTransactionCount(address)
        _tx.gasPrice = web3.utils.toHex(defaultGasPrice)
        _tx.gasLimit = web3.utils.toHex(defaultGasLimit)
        _tx.value = web3.utils.toHex(_tx.value)
        _tx.chainId = 137
        delete _tx['gas']
        const tx = new Tx(_tx)
        tx.sign(Buffer.from(privateKey,'hex'))
        const serializedTx = tx.serialize()
        try{
            const hash = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
            console.log(`购买 USDT 完成：${address}，序号${i}, Hash: ${hash.transactionHash}`)
        }catch(e){
            console.log(`Error: ${address}，序号${i}, ${e}`)
        }
        }
    )
}

main()

  

