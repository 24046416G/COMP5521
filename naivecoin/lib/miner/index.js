const R = require('ramda');
const spawn = require('threads').spawn;
const Block = require('../blockchain/block');
const CryptoUtil = require('../util/cryptoUtil');
const Transaction = require('../blockchain/transaction');
const Config = require('../config');

class Miner {
    constructor(blockchain, logLevel) {
        this.blockchain = blockchain;
        this.logLevel = logLevel;
    }

    mine(rewardAddress, feeAddress) {
        let baseBlock = Miner.generateNextBlock(rewardAddress, feeAddress, this.blockchain);
        process.execArgv = R.reject((item) => item.includes('debug'), process.execArgv);

        /* istanbul ignore next */
        const thread = spawn(function (input, done) {
            /*eslint-disable */
            require(input.__dirname + '/../util/consoleWrapper.js')('mine-worker', input.logLevel);
            const Block = require(input.__dirname + '/../blockchain/block');
            const Miner = require(input.__dirname);
            /*eslint-enable */

            done(Miner.proveWorkFor(Block.fromJson(input.jsonBlock), input.difficulty));
        });

        const transactionList = R.pipe(
            R.countBy(R.prop('type')),
            R.toString,
            R.replace('{', ''),
            R.replace('}', ''),
            R.replace(/"/g, '')
        )(baseBlock.transactions);

        console.info(`Mining a new block with ${baseBlock.transactions.length} (${transactionList}) transactions`);

        // 获取当前难度值
        const difficulty = this.blockchain.getDifficulty(baseBlock.index);
        console.info(`Starting mining with difficulty: ${difficulty}`);

        const promise = thread.promise().then((result) => {
            thread.kill();
            // 确保返回的区块使用正确的难度值
            result.difficulty = difficulty;
            return result;
        });

        thread.send({
            __dirname: __dirname,
            logLevel: this.logLevel,
            jsonBlock: baseBlock,
            difficulty: difficulty
        });

        return promise;
    }

    static generateNextBlock(rewardAddress, feeAddress, blockchain) {
        const previousBlock = blockchain.getLastBlock();
        const nextIndex = previousBlock ? previousBlock.index + 1 : 0;
        const previousHash = previousBlock ? previousBlock.hash : '0';
        const timestamp = new Date().getTime() / 1000;
        
        // 计算新区块的难度值
        const difficulty = blockchain.getDifficulty(nextIndex);
        console.info(`Generating block ${nextIndex} with difficulty ${difficulty}`);

        let block = new Block();
        block.index = nextIndex;
        block.previousHash = previousHash;
        block.timestamp = timestamp;
        block.difficulty = difficulty;  // 设置初始难度值

        const blocks = blockchain.getAllBlocks();
        const candidateTransactions = blockchain.transactions;
        const transactionsInBlocks = R.flatten(R.map(R.prop('transactions'), blocks));
        const inputTransactionsInTransaction = R.compose(R.flatten, R.map(R.compose(R.prop('inputs'), R.prop('data'))));

        // Select transactions that can be mined         
        let rejectedTransactions = [];
        let selectedTransactions = [];
        
        // 处理候选交易
        if (candidateTransactions && candidateTransactions.length > 0) {
            R.forEach((transaction) => {
                try {
                    // 确保交易是 Transaction 实例
                    const tx = Transaction.fromJson(transaction);
                    
                    // 验证交易
                    if (tx.type === 'studentRegistration' || tx.type === 'attendance') {
                        selectedTransactions.push(tx);
                    } else {
                        // 其他类型交易的验证逻辑
                        let negativeOutputsFound = 0;
                        let outputsLen = tx.data.outputs.length;

                        for (let i = 0; i < outputsLen; i++) {
                            if (tx.data.outputs[i].amount < 0) {
                                negativeOutputsFound++;
                            }
                        }

                        let transactionInputFoundAnywhere = R.map((input) => {
                            let findInputTransactionInTransactionList = R.find(
                                R.whereEq({
                                    'transaction': input.transaction,
                                    'index': input.index
                                }));

                            let wasItFoundInSelectedTransactions = R.not(R.isNil(findInputTransactionInTransactionList(inputTransactionsInTransaction(selectedTransactions))));
                            let wasItFoundInBlocks = R.not(R.isNil(findInputTransactionInTransactionList(inputTransactionsInTransaction(transactionsInBlocks))));

                            return wasItFoundInSelectedTransactions || wasItFoundInBlocks;
                        }, tx.data.inputs);

                        if (R.all(R.equals(false), transactionInputFoundAnywhere)) {
                            if (tx.type === 'regular' && negativeOutputsFound === 0) {
                                selectedTransactions.push(tx);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error processing transaction:', err);
                    rejectedTransactions.push(transaction);
                }
            }, candidateTransactions);
        }

        console.info(`Selected ${selectedTransactions.length} transactions for new block`);

        // 创建区块的交易列表
        let transactions = selectedTransactions;

        // Add fee transaction if needed
        if (transactions.length > 0 && feeAddress) {
            let feeTransaction = Transaction.fromJson({
                id: CryptoUtil.randomId(64),
                hash: null,
                type: 'fee',
                data: {
                    inputs: [],
                    outputs: [
                        {
                            amount: Config.FEE_PER_TRANSACTION * transactions.length,
                            address: feeAddress
                        }
                    ]
                }
            });
            transactions.push(feeTransaction);
        }

        // Add reward transaction (always add reward transaction even if no other transactions)
        if (rewardAddress) {
            let rewardTransaction = Transaction.fromJson({
                id: CryptoUtil.randomId(64),
                hash: null,
                type: 'reward',
                data: {
                    inputs: [],
                    outputs: [
                        {
                            amount: Config.MINING_REWARD,
                            address: rewardAddress
                        }
                    ]
                }
            });
            transactions.push(rewardTransaction);
        }

        // 设置区块的交易列表
        block.transactions = transactions;

        return block;
    }

    static proveWorkFor(jsonBlock, difficulty) {
        let block = Block.fromJson(jsonBlock);
        
        // 记录挖矿开始时间
        const miningStartTime = new Date().getTime() / 1000;
        console.info(`Mining block ${block.index} with difficulty ${difficulty}`);
        
        // 设置区块难度
        block.difficulty = difficulty;
        
        // 挖矿过程
        let nonce = 0;
        const prefix = '0'.repeat(difficulty);
        
        do {
            block.nonce = nonce;
            block.hash = block.toHash();
            nonce++;
            
            if (nonce % 100000 === 0) {
                console.debug(`Mining attempt ${nonce}, current hash: ${block.hash}`);
            }
        } while (!block.hash.startsWith(prefix));

        // 计算挖矿耗时
        const miningEndTime = new Date().getTime() / 1000;
        const miningTime = miningEndTime - miningStartTime;
        
        console.info(`Block found! Nonce: ${nonce}, Hash: ${block.hash}, Mining time: ${miningTime}s`);
        
        // 将挖矿时间保存到区块中
        block.miningTime = miningTime;
        
        // 再次确认难度值设置正确
        console.info(`Final block difficulty: ${block.difficulty}`);
        
        return block;
    }
}

module.exports = Miner;
