const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const Web3 = require("web3")
const Tx = require('ethereumjs-tx');

const filePath = `./resend.txt`
const defaultGasPrice = 65000000000 //WEI 50Gwei
// 1Inch 手续费281649Gas, * 50Gwei = 0.014ETH
const baseUrl = 'https://api.metaswap.codefi.network/trades'
const sourceAmount = 25000000000000000 // 0.025eth


const ETHAddress = '0x0000000000000000000000000000000000000000';
const DaiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';

const slipPage = 5;

const infura = `https://mainnet.infura.io/v3/b6f0f1c1788e452d83b17d1d2d3cf4e3`
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

    const url = `${baseUrl}?sourceToken=${ETHAddress}&destinationToken=${DaiAddress}&walletAddress=${senderAddress}&sourceAmount=${sourceAmount}&slippage=${slipPage}`

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
        // const balance = await web3.eth.getBalance(address)
        // console.log(`${address}的余额为：${balance}`)
        // } 
        await sleep(1000)
        const result  = await getData(address)
        const _tx = result[0].trade
        _tx.nonce = await web3.eth.getTransactionCount(address)
        _tx.gasPrice = web3.utils.toHex(defaultGasPrice)
        _tx.gasLimit = web3.utils.toHex(_tx.gas)
        _tx.value = web3.utils.toHex(_tx.value)
        delete _tx['gas']
        const tx = new Tx(_tx)
        tx.sign(Buffer.from(privateKey,'hex'))
        const serializedTx = tx.serialize()
        const hash = web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        console.log(`购买 Dai 完成：${address}，序号${i}`)
        }
    )
}

main()

  

