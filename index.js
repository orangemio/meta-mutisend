const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const Web3 = require("web3")
const Tx = require('ethereumjs-tx');
const abi = require('./abi.json')
const { ethers } = require("ethers");
const filePath = `./20210830110928_addresses_with_keys.txt`
const defaultGasPrice = 1500000000 //WEI 1.5 Gwei
const defaultGasLimit = 2000000;
// https://api2.metaswap.codefi.network/networks/137/trades?destinationToken=0x0000000000000000000000000000000000000000&sourceToken=0x2791bca1f2de4661ed88a30c99a7a9449aa84174&sourceAmount=3786230&slippage=3&timeout=10000&walletAddress=0x060bbae03ef52f1b47db247215da0fb87ff4b2eb
const baseUrl = 'https://api2.metaswap.codefi.network/networks/137/trades'
const sourceAmount = 30000000000000000000 // 50 Maitic


const ETHAddress = '0x0000000000000000000000000000000000000000';
const USDTAddress = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';

const slipPage = 5;

const infura = `https://rpc-mainnet.matic.network`
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

async function getData(senderAddress, senderToken = ETHAddress, recieveToken = USDTAddress, Amount = sourceAmount){
    
    // https://api.metaswap.codefi.network/trades?sourceToken=0x0000000000000000000000000000000000000000&destinationToken=0x6b175474e89094c44da98b954eedeac495271d0f&sourceAmount=20000000000000000&walletAddress=0x060bbae03EF52F1B47db247215Da0FB87FF4B2EB&slippage=2

    const url = `${baseUrl}?sourceToken=${senderToken}&destinationToken=${recieveToken}&walletAddress=${senderAddress}&sourceAmount=${Amount}&slippage=${slipPage}`

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
       const _tx_matic_usdt = await sendTranscation(result[0].trade,address,privateKey);
        //等待20S 区块确认
        await sleep(20000);
        let usdt = new web3.eth.Contract(abi,USDTAddress);
        let amount = await usdt.methods.balanceOf(address).call();
        const result2  = await getData(address,USDTAddress,ETHAddress,amount);
        if(result2[0].approvalNeeded){
            const _tx_approve = await sendTranscation(result2[0].approvalNeeded,address,privateKey);
            //等待20S 区块确认
            await sleep(20000);
        }
        const _tx_usdt_matic = await sendTranscation(result2[0].trade, address,privateKey);
        // 等待20S 区块确认
        await sleep(20000);
        const balance_need_to_send = await web3.eth.getBalance(address);
        const _tx_send_next_account = await sendTranscation(
            {
                to: accountsWithKey[i+1].address,
                value: balance_need_to_send - 22000 * defaultGasPrice,
                data:'0x'
        },
        address,
        privateKey,
        21000
        )
        await sleep(20000);
        }
    )
}

async function sendTranscation(data,address,privateKey,gasLimit = defaultGasLimit){
    const tx = data;
    tx.nonce = await web3.eth.getTransactionCount(address)
    tx.gasPrice = web3.utils.toHex(defaultGasPrice)
    tx.gasLimit = web3.utils.toHex(gasLimit)
    tx.value = web3.utils.toHex(tx.value)
    tx.chainId = 137
    const _tx = new Tx(tx);
    _tx.sign(Buffer.from(privateKey,'hex'))
    const serializedTx = _tx.serialize()

    try{
        const hash = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        console.log(`交易完成：${address}, Hash: ${hash.transactionHash}`)
    }catch(e){
        console.log(`Error: ${address}, ${e}`)
    }

}

main()

  

