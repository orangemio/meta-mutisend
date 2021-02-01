const fs = require('fs');
const readline = require('readline');
const Web3 = require("web3")
const Tx = require('ethereumjs-tx');
const contractAbi = require('./abi.json')


const filePath = `./resend.txt`
const defaultGasPrice = 165000000000 //WEI 165Gwei
const defaultGasLimit = 6 * 10000 // 60000
//代币地址 默认为Dai
const tokenAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'
//接受者地址
const toAddress = '0x060bbae03EF52F1B47db247215Da0FB87FF4B2EB'




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
    const contract = new web3.eth.Contract(contractAbi,tokenAddress,{
        gasPrice:defaultGasPrice
    });
    asyncForEach(accountsWithKey, async ({address, privateKey}, i) => {
        await sleep(1000)
        const balance = await contract.methods.balanceOf(address).call();
        if(balance==0){
            console.log(`${address}检查到无Token余额,跳过`)
            return
        }   
        console.log(`${address}检查到有Token余额: ${balance}`)
        const data = contract.methods.transfer(toAddress, balance).encodeABI()

        const  _tx = {
            nonce: await web3.eth.getTransactionCount(address),
            gasPrice: defaultGasPrice,
            gasLimit: defaultGasLimit,
            to: tokenAddress,
            data: data,
        }
        const tx = new Tx(_tx)
        tx.sign(Buffer.from(privateKey,'hex'))
        const serializedTx = tx.serialize()
        const hash = web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        console.log(`发送 Token 完成: ${address}`)
    }
    )
}


main()

