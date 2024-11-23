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
        let difficulty = this.blockchain.getDifficulty(baseBlock.index);
        
        return new Promise((resolve, reject) => {
            try {
                // 设置区块难度
                baseBlock.difficulty = difficulty;
                console.log(`Mining block ${baseBlock.index} with difficulty ${difficulty}`);
                
                // 简化的挖矿过程
                let nonce = 0;
                const prefix = '0'.repeat(difficulty);
                
                while (true) {
                    baseBlock.nonce = nonce;
                    baseBlock.hash = baseBlock.toHash();
                    
                    if (baseBlock.hash.startsWith(prefix)) {
                        console.info(`Block found: difficulty '${difficulty}' hash '${baseBlock.hash}' nonce '${nonce}'`);
                        resolve(baseBlock);
                        break;
                    }
                    nonce++;
                }
            } catch (ex) {
                reject(ex);
            }
        });
    }

    static generateNextBlock(rewardAddress, feeAddress, blockchain) {
        const previousBlock = blockchain.getLastBlock();
        const nextIndex = previousBlock ? previousBlock.index + 1 : 0;
        const previousHash = previousBlock ? previousBlock.hash : '0';
        const timestamp = new Date().getTime() / 1000;
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

        // Add reward transaction
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

        return Block.fromJson({
            index: nextIndex,
            previousHash: previousHash,
            timestamp: timestamp,
            transactions: transactions,
            nonce: 0
        });
    }

    /* istanbul ignore next */
    static proveWorkFor(jsonBlock, difficulty) {
        let blockDifficulty = null;
        let start = process.hrtime();
        let block = Block.fromJson(jsonBlock);

        // INFO: Every cryptocurrency has a different way to prove work, this is a simple hash sequence

        // Loop incrementing the nonce to find the hash at desired difficulty
        do {
            block.timestamp = new Date().getTime() / 1000;
            block.nonce++;
            block.hash = block.toHash();
            blockDifficulty = block.getDifficulty();
        } while (blockDifficulty >= difficulty);
        console.info(`Block found: time '${process.hrtime(start)[0]} sec' dif '${difficulty}' hash '${block.hash}' nonce '${block.nonce}'`);
        return block;
    }
}

module.exports = Miner;
