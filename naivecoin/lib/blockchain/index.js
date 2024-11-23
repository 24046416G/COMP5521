const EventEmitter = require('events');
const R = require('ramda');
const Db = require('../util/db');
const Blocks = require('./blocks');
const Block = require('./block');
const Transactions = require('./transactions');
const TransactionAssertionError = require('./transactionAssertionError');
const BlockAssertionError = require('./blockAssertionError');
const BlockchainAssertionError = require('./blockchainAssertionError');
const Config = require('../config');
const Transaction = require('../blockchain/transaction');

// Database settings
const BLOCKCHAIN_FILE = 'blocks.json';
const TRANSACTIONS_FILE = 'transactions.json';

class Blockchain {
    constructor(dbName) {
        this.blocksDb = new Db('data/' + dbName + '/' + BLOCKCHAIN_FILE, new Blocks());
        this.transactionsDb = new Db('data/' + dbName + '/' + TRANSACTIONS_FILE, new Transactions());

        // INFO: In this implementation the database is a file and every time data is saved it rewrites the file, probably it should be a more robust database for performance reasons
        this.blocks = this.blocksDb.read(Blocks);
        this.transactions = this.transactionsDb.read(Transactions);

        // Some places uses the emitter to act after some data is changed
        this.emitter = new EventEmitter();
        this.init();
    }

    init() {
        // Create the genesis block if the blockchain is empty
        if (this.blocks.length == 0) {
            console.info('Blockchain empty, adding genesis block');
            this.blocks.push(Block.genesis);
            this.blocksDb.write(this.blocks);
        }

        // Remove transactions that are in the blockchain
        console.info('Removing transactions that are in the blockchain');
        R.forEach(this.removeBlockTransactionsFromTransactions.bind(this), this.blocks);
    }

    getAllBlocks() {
        return this.blocks;
    }

    getBlockByIndex(index) {
        return R.find(R.propEq('index', index), this.blocks);
    }

    getBlockByHash(hash) {
        return R.find(R.propEq('hash', hash), this.blocks);
    }

    getLastBlock() {
        return R.last(this.blocks);
    }

    getDifficulty(index) {        
        // Calculates the difficulty based on the index since the difficulty value increases every X blocks.
        return Config.pow.getDifficulty(this.blocks, index);        
    }

    getAllTransactions() {
        return this.transactions;
    }

    getTransactionById(id) {
        return R.find(R.propEq('id', id), this.transactions);
    }

    getTransactionFromBlocks(transactionId) {
        return R.find(R.compose(R.find(R.propEq('id', transactionId)), R.prop('transactions')), this.blocks);
    }

    //Fork 处理
    replaceChain(newBlockchain) {
        // 如果新链比当前链短，直接拒绝
        if (newBlockchain.length <= this.blocks.length) {
            console.error('Received chain is not longer than current chain');
            throw new BlockchainAssertionError('Received chain is not longer than current chain');
        }

        // 验证新链的正确性
        this.checkChain(newBlockchain);

        // 计算两条链的总难度
        const currentDifficulty = this.calculateChainDifficulty(this.blocks);
        const newDifficulty = this.calculateChainDifficulty(newBlockchain);

        // 只有新链更长且难度更大时才替换
        if (newBlockchain.length > this.blocks.length && newDifficulty > currentDifficulty) {
            console.info('Received blockchain is valid. Replacing current blockchain with received blockchain');
            
            // 获取分叉后的新区块
            let newBlocks = R.takeLast(newBlockchain.length - this.blocks.length, newBlockchain);

            // 回滚交易池中的交易
            R.forEach((block) => {
                R.forEach((tx) => {
                    this.transactions.push(tx);
                }, block.transactions);
            }, newBlocks);

            // 更新区块链
            this.blocks = newBlockchain;
            this.blocksDb.write(this.blocks);

            // 清理交易池中已经包含在新链中的交易
            R.forEach((block) => {
                this.removeBlockTransactionsFromTransactions(block);
            }, newBlocks);

            this.emitter.emit('blockchainReplaced', newBlocks);
        } else {
            console.error('Received blockchain is invalid');
            throw new BlockchainAssertionError('Received blockchain is invalid');
        }
    }

    checkChain(blockchainToValidate) {
        // Check if the genesis block is the same
        if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(Block.genesis)) {
            console.error('Genesis blocks aren\'t the same');
            throw new BlockchainAssertionError('Genesis blocks aren\'t the same');
        }

        // Compare every block to the previous one (it skips the first one, because it was verified before)
        try {
            for (let i = 1; i < blockchainToValidate.length; i++) {
                this.checkBlock(blockchainToValidate[i], blockchainToValidate[i - 1], blockchainToValidate);
            }
        } catch (ex) {
            console.error('Invalid block sequence');
            throw new BlockchainAssertionError('Invalid block sequence', null, ex);
        }
        return true;
    }

    addBlock(newBlock, emit = true) {
        // 验证难度值是否正确设置
        const expectedDifficulty = this.getDifficulty(newBlock.index);
        if (newBlock.difficulty !== expectedDifficulty) {
            console.error(`Block ${newBlock.index} has incorrect difficulty: ${newBlock.difficulty}, expected: ${expectedDifficulty}`);
        }
        
        // It only adds the block if it's valid (we need to compare to the previous one)
        if (this.checkBlock(newBlock, this.getLastBlock())) {
            this.blocks.push(newBlock);
            this.blocksDb.write(this.blocks);

            // After adding the block it removes the transactions of this block from the list of pending transactions
            this.removeBlockTransactionsFromTransactions(newBlock);

            console.info(`Block added: ${newBlock.hash}`);
            console.debug(`Block added: ${JSON.stringify(newBlock)}`);
            if (emit) this.emitter.emit('blockAdded', newBlock);

            return newBlock;
        }
    }

    addTransaction(newTransaction, emit = true) {
        // 确保交易是 Transaction 类的实例
        if (!(newTransaction instanceof Transaction)) {
            newTransaction = Transaction.fromJson(newTransaction);
        }

        // 验证并添加交易
        if (this.checkTransaction(newTransaction, this.blocks)) {
            this.transactions.push(newTransaction);
            this.transactionsDb.write(this.transactions);

            console.info(`Transaction added: ${newTransaction.id}`);
            console.debug(`Transaction added: ${JSON.stringify(newTransaction)}`);
            if (emit) this.emitter.emit('transactionAdded', newTransaction);

            return newTransaction;
        }
    }

    removeBlockTransactionsFromTransactions(newBlock) {
        this.transactions = R.reject((transaction) => { return R.find(R.propEq('id', transaction.id), newBlock.transactions); }, this.transactions);
        this.transactionsDb.write(this.transactions);
    }

    checkBlock(newBlock, previousBlock, referenceBlockchain = this.blocks) {
        const blockHash = newBlock.toHash();

        // 基本验证
        if (previousBlock.index + 1 !== newBlock.index) {
            console.error(`Invalid index: expected '${previousBlock.index + 1}' got '${newBlock.index}'`);
            throw new BlockAssertionError(`Invalid index: expected '${previousBlock.index + 1}' got '${newBlock.index}'`);
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.error(`Invalid previoushash: expected '${previousBlock.hash}' got '${newBlock.previousHash}'`);
            throw new BlockAssertionError(`Invalid previoushash: expected '${previousBlock.hash}' got '${newBlock.previousHash}'`);
        } else if (blockHash !== newBlock.hash) {
            console.error(`Invalid hash: expected '${blockHash}' got '${newBlock.hash}'`);
            throw new BlockAssertionError(`Invalid hash: expected '${blockHash}' got '${newBlock.hash}'`);
        }

        // 验证难度
        const expectedDifficulty = this.getDifficulty(newBlock.index);
        console.info(`Validating block ${newBlock.index}:`);
        console.info(`- Current chain length: ${this.blocks.length}`);
        console.info(`- Previous block difficulty: ${previousBlock.difficulty}`);
        console.info(`- Expected difficulty: ${expectedDifficulty}`);
        console.info(`- Block difficulty: ${newBlock.difficulty}`);

        if (newBlock.difficulty !== expectedDifficulty) {
            console.error(`Block ${newBlock.index}: Invalid difficulty:`);
            console.error(`- Expected: ${expectedDifficulty}`);
            console.error(`- Got: ${newBlock.difficulty}`);
            throw new BlockAssertionError(`Invalid difficulty: expected '${expectedDifficulty}' got '${newBlock.difficulty}'`);
        }

        // 验证工作量证明
        const prefix = '0'.repeat(expectedDifficulty);
        if (!newBlock.hash.startsWith(prefix)) {
            console.error(`Block ${newBlock.index}: Hash ${newBlock.hash} does not meet difficulty requirement of ${expectedDifficulty} leading zeros`);
            throw new BlockAssertionError('Block hash does not meet difficulty requirements');
        }

        // 验证交易
        R.forEach(this.checkTransaction.bind(this), newBlock.transactions, referenceBlockchain);

        // 计算区块中所有交易的输入和输出总和
        let inputSum = 0;
        let outputSum = 0;

        // 遍历区块中的所有交易
        for (let transaction of newBlock.transactions) {
            // 对于挖矿奖励交易，只计算输出
            if (transaction.type === 'reward') {
                outputSum += R.sum(R.map(R.prop('amount'), transaction.data.outputs));
                continue;
            }

            // 对于手续费交易，只计算输出
            if (transaction.type === 'fee') {
                outputSum += R.sum(R.map(R.prop('amount'), transaction.data.outputs));
                continue;
            }

            // 对于学生注册和考勤交易，不计入总和
            if (transaction.type === 'studentRegistration' || transaction.type === 'attendance') {
                continue;
            }

            // 计算常规交易的输入总和
            if (transaction.data.inputs.length > 0) {
                inputSum += R.sum(R.map(R.prop('amount'), transaction.data.inputs));
            }

            // 计算常规交易的输出总和
            if (transaction.data.outputs.length > 0) {
                outputSum += R.sum(R.map(R.prop('amount'), transaction.data.outputs));
            }
        }

        // 获取挖矿奖励金额
        const rewardTransaction = newBlock.transactions.find(tx => tx.type === 'reward');
        const miningReward = rewardTransaction ? R.sum(R.map(R.prop('amount'), rewardTransaction.data.outputs)) : 0;

        // 获取手续费金额
        const feeTransaction = newBlock.transactions.find(tx => tx.type === 'fee');
        const fees = feeTransaction ? R.sum(R.map(R.prop('amount'), feeTransaction.data.outputs)) : 0;

        // 验证输入和输出总和
        // 输出总和应该等于：输入总和 + 挖矿奖励 + 手续费
        const expectedOutputSum = inputSum + miningReward + fees;

        if (outputSum !== expectedOutputSum) {
            console.error(`Invalid block balance: inputs sum '${inputSum}', outputs sum '${outputSum}'`);
            console.error(`Mining reward: ${miningReward}, Fees: ${fees}`);
            console.error(`Expected output sum: ${expectedOutputSum}`);
            throw new BlockAssertionError(`Invalid block balance: inputs sum '${inputSum}', outputs sum '${outputSum}'`);
        }

        return true;
    }

    checkTransaction(transaction, referenceBlockchain = this.blocks) {

        // Check the transaction
        transaction.check(transaction);

        // Verify if the transaction isn't already in the blockchain
        let isNotInBlockchain = R.all((block) => {
            return R.none(R.propEq('id', transaction.id), block.transactions);
        }, referenceBlockchain);

        if (!isNotInBlockchain) {
            console.error(`Transaction '${transaction.id}' is already in the blockchain`);
            throw new TransactionAssertionError(`Transaction '${transaction.id}' is already in the blockchain`, transaction);
        }

        // Verify if all input transactions are unspent in the blockchain
        let isInputTransactionsUnspent = R.all(R.equals(false), R.flatten(R.map((txInput) => {
            return R.map(
                R.pipe(
                    R.prop('transactions'),
                    R.map(R.pipe(
                        R.path(['data', 'inputs']),
                        R.contains({ transaction: txInput.transaction, index: txInput.index })
                    ))
                ), referenceBlockchain);
        }, transaction.data.inputs)));

        if (!isInputTransactionsUnspent) {
            console.error(`Not all inputs are unspent for transaction '${transaction.id}'`);
            throw new TransactionAssertionError(`Not all inputs are unspent for transaction '${transaction.id}'`, transaction.data.inputs);
        }

        return true;
    }

    getUnspentTransactionsForAddress(address) {
        const selectTxs = (transaction) => {
            let index = 0;
            // Create a list of all transactions outputs found for an address (or all).
            R.forEach((txOutput) => {
                if (address && txOutput.address == address) {
                    txOutputs.push({
                        transaction: transaction.id,
                        index: index,
                        amount: txOutput.amount,
                        address: txOutput.address
                    });
                }
                index++;
            }, transaction.data.outputs);

            // Create a list of all transactions inputs found for an address (or all).            
            R.forEach((txInput) => {
                if (address && txInput.address != address) return;

                txInputs.push({
                    transaction: txInput.transaction,
                    index: txInput.index,
                    amount: txInput.amount,
                    address: txInput.address
                });
            }, transaction.data.inputs);
        };

        // Considers both transactions in block and unconfirmed transactions (enabling transaction chain)
        let txOutputs = [];
        let txInputs = [];
        R.forEach(R.pipe(R.prop('transactions'), R.forEach(selectTxs)), this.blocks);
        R.forEach(selectTxs, this.transactions);

        // Cross both lists and find transactions outputs without a corresponding transaction input
        let unspentTransactionOutput = [];
        R.forEach((txOutput) => {
            if (!R.any((txInput) => txInput.transaction == txOutput.transaction && txInput.index == txOutput.index, txInputs)) {
                unspentTransactionOutput.push(txOutput);
            }
        }, txOutputs);

        return unspentTransactionOutput;
    }

    // 添加计算链难度的方法
    calculateChainDifficulty(chain) {
        return chain.reduce((sum, block) => {
            return sum + Math.pow(2, block.difficulty);
        }, 0);
    }

    // 获取学生注册信息
    getStudentRegistration(studentAddress) {
        return this.blocks
            .flatMap(block => block.transactions)
            .find(tx => 
                tx.type === Config.TRANSACTION_TYPE.STUDENT_REGISTRATION &&
                tx.data.outputs[0].metadata.studentAddress === studentAddress
            );
    }

    // 获取学生的所有考勤记录
    getStudentAttendanceRecords(studentAddress) {
        return this.blocks
            .flatMap(block => block.transactions)
            .filter(tx => 
                tx.type === Config.TRANSACTION_TYPE.ATTENDANCE &&
                tx.data.outputs[0].metadata.studentAddress === studentAddress
            );
    }

    // 获取课程的有考勤记录
    getCourseAttendanceRecords(courseId) {
        return this.blocks
            .flatMap(block => block.transactions)
            .filter(tx => 
                tx.type === Config.TRANSACTION_TYPE.ATTENDANCE &&
                tx.data.outputs[0].metadata.courseId === courseId
            );
    }

    // 获取教师收到的所有记录
    getTeacherRecords(teacherAddress) {
        return this.blocks
            .flatMap(block => block.transactions)
            .filter(tx => 
                (tx.type === Config.TRANSACTION_TYPE.STUDENT_REGISTRATION ||
                 tx.type === Config.TRANSACTION_TYPE.ATTENDANCE) &&
                tx.data.outputs[0].address === teacherAddress
            );
    }

    updateMiningReward(block) {
        try {
            // 找到奖励交易和手续费交易
            const rewardTransaction = block.transactions.find(tx => tx.type === 'reward');
            const feeTransaction = block.transactions.find(tx => tx.type === 'fee');

            // 1. 更新学生钱包余额（挖矿奖励）
            if (rewardTransaction) {
                const minerAddress = rewardTransaction.data.outputs[0].address;
                const rewardAmount = rewardTransaction.data.outputs[0].amount;

                // 读取学生钱包文件
                const path = require('path');
                const fs = require('fs');
                const walletsPath = path.join(__dirname, '../../data/1/wallets.json');
                
                let wallets = [];
                try {
                    const walletsData = fs.readFileSync(walletsPath, 'utf8');
                    wallets = JSON.parse(walletsData);

                    // 找到学生钱包并更新余额
                    const minerWallet = wallets.find(w => 
                        w.keyPairs.some(kp => kp.publicKey === minerAddress)
                    );

                    if (minerWallet) {
                        minerWallet.balance = parseInt(minerWallet.balance || 0) + rewardAmount;
                        fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 4));
                        console.info(`Updated student wallet balance: +${rewardAmount}`);
                    }
                } catch (err) {
                    console.error('Error updating student wallet:', err);
                }
            }

            // 2. 更新教师钱包余额（手续费）
            if (feeTransaction) {
                const teacherAddress = feeTransaction.data.outputs[0].address;
                const feeAmount = feeTransaction.data.outputs[0].amount;

                // 读取教师钱包文件
                const path = require('path');
                const fs = require('fs');
                const teacherJsonPath = path.join(__dirname, '../../data/teacher.json');
                
                try {
                    let teacherConfig = JSON.parse(fs.readFileSync(teacherJsonPath, 'utf8'));
                    if (teacherConfig.address === teacherAddress) {
                        teacherConfig.balance = parseInt(teacherConfig.balance || 0) + feeAmount;
                        fs.writeFileSync(teacherJsonPath, JSON.stringify(teacherConfig, null, 4));
                        console.info(`Updated teacher wallet balance: +${feeAmount}`);
                    }
                } catch (err) {
                    console.error('Error updating teacher wallet:', err);
                }
            }
        } catch (err) {
            console.error('Error in updateMiningReward:', err);
        }
    }
}

module.exports = Blockchain;
