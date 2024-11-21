const R = require('ramda');
const Wallets = require('./wallets');
const Wallet = require('./wallet');
const Transaction = require('../blockchain/transaction');
const TransactionBuilder = require('./transactionBuilder');
const Db = require('../util/db');
const ArgumentError = require('../util/argumentError');
const Config = require('../config');
const CryptoUtil = require('../util/cryptoUtil');

const OPERATOR_FILE = 'wallets.json';

class Operator {
    constructor(dbName, blockchain) {
        this.db = new Db('data/' + dbName + '/' + OPERATOR_FILE, new Wallets());

        // INFO: In this implementation the database is a file and every time data is saved it rewrites the file, probably it should be a more robust database for performance reasons
        this.wallets = this.db.read(Wallets);
        this.blockchain = blockchain;
    }

    addWallet(wallet) {
        this.wallets.push(wallet);
        this.db.write(this.wallets);
        return wallet;
    }

    createWalletFromPassword(password) {
        let newWallet = Wallet.fromPassword(password);
        return this.addWallet(newWallet);
    }    

    checkWalletPassword(walletId, passwordHash) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        return wallet.passwordHash == passwordHash;
    }

    getWallets() {
        return this.wallets;
    }

    getWalletById(walletId) {
        return R.find((wallet) => { return wallet.id == walletId; }, this.wallets);
    }

    generateAddressForWallet(walletId) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        let address = wallet.generateAddress();
        this.db.write(this.wallets);
        return address;
    }

    getAddressesForWallet(walletId) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        let addresses = wallet.getAddresses();
        return addresses;
    }    

    getBalanceForAddress(addressId) {        
        let utxo = this.blockchain.getUnspentTransactionsForAddress(addressId);
        
        // 找到对应的钱包
        const wallet = this.wallets.find(w => 
            w.keyPairs.some(kp => kp.publicKey === addressId)
        );

        // 如果是新钱包且没有交易，返回初始余额
        if ((!utxo || utxo.length === 0) && wallet) {
            return wallet.balance;
        }
        
        // 计算UTXO总额
        const utxoBalance = utxo ? R.sum(R.map(R.prop('amount'), utxo)) : 0;
        
        // 如果有钱包，更新余额（但保留初始余额）
        if (wallet) {
            // 如果UTXO余额为0且有初始余额，保持初始余额
            if (utxoBalance === 0 && wallet.balance === 100) {
                return wallet.balance;
            }
            wallet.updateBalance(utxoBalance);
            this.db.write(this.wallets);
        }
        
        return utxoBalance || 0;
    }

    createTransaction(walletId, fromAddressId, toAddressId, amount, changeAddressId) {
        let utxo = this.blockchain.getUnspentTransactionsForAddress(fromAddressId);
        let wallet = this.getWalletById(walletId);

        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        let secretKey = wallet.getSecretKeyByAddress(fromAddressId);

        if (secretKey == null) throw new ArgumentError(`Secret key not found with Wallet id '${walletId}' and address '${fromAddressId}'`);

        let tx = new TransactionBuilder();
        tx.from(utxo);
        tx.to(toAddressId, amount);
        tx.change(changeAddressId || fromAddressId);
        tx.fee(Config.FEE_PER_TRANSACTION);
        tx.sign(secretKey);        

        return Transaction.fromJson(tx.build());
    }

    createStudentWallet(password, studentId) {
        let wallet = Wallet.createStudentWallet(password, studentId);
        this.wallets.push(wallet);
        this.db.write(this.wallets);
        return wallet;
    }

    createStudentRegistration(walletId, password, classId, studentId) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new Error(`Wallet not found with id '${walletId}'`);

        // 验证密码
        let passwordHash = CryptoUtil.hash(password);
        if (!this.checkWalletPassword(walletId, passwordHash)) {
            throw new Error('Invalid password');
        }

        // 验证studentId匹配
        if (studentId && wallet.studentId !== studentId) {
            throw new Error('Student ID does not match wallet');
        }

        // 检查余额是否足够
        if (wallet.balance < Config.ATTENDANCE_CONFIG.REGISTRATION_AMOUNT) {
            throw new Error(`Insufficient balance: required ${Config.ATTENDANCE_CONFIG.REGISTRATION_AMOUNT}, but got ${wallet.balance}`);
        }

        // 获取学生的公钥
        let studentPublicKey = wallet.getPublicKey();
        if (!studentPublicKey) {
            throw new Error('No public key found for wallet');
        }
        
        // 创建交易对象
        let transactionData = {
            id: CryptoUtil.randomId(),
            hash: null,
            type: Config.TRANSACTION_TYPE.STUDENT_REGISTRATION,
            data: {
                inputs: [],
                outputs: [
                    {
                        amount: Config.ATTENDANCE_CONFIG.REGISTRATION_AMOUNT,
                        address: Config.ATTENDANCE_CONFIG.DEFAULT_TEACHER_ADDRESS,
                        metadata: {
                            studentId: wallet.studentId,
                            classId: classId,
                            registrationTime: new Date().getTime(),
                            studentAddress: studentPublicKey
                        }
                    }
                ]
            }
        };

        // 更新学生钱包余额
        wallet.updateBalance(wallet.balance - Config.ATTENDANCE_CONFIG.REGISTRATION_AMOUNT);
        this.db.write(this.wallets);

        // 更新教师余额
        const path = require('path');
        const fs = require('fs');
        const teacherJsonPath = path.join(__dirname, '../../data/teacher.json');
        
        let teacherConfig;
        try {
            teacherConfig = JSON.parse(fs.readFileSync(teacherJsonPath, 'utf8'));
            teacherConfig.balance = (teacherConfig.balance || 0) + Config.ATTENDANCE_CONFIG.REGISTRATION_AMOUNT;
            fs.writeFileSync(teacherJsonPath, JSON.stringify(teacherConfig, null, 4));
        } catch (err) {
            console.error('Error updating teacher balance:', err);
        }

        return Transaction.fromJson(transactionData);
    }

    getWalletBalance(walletId) {
        const wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);
        
        // 获取钱包的所有地址
        const addresses = wallet.getAddresses();
        
        // 检查是否有任何交易
        const hasTransactions = addresses.some(address => {
            const utxo = this.blockchain.getUnspentTransactionsForAddress(address);
            return utxo && utxo.length > 0;
        });

        // 如果是新钱包且没有交易，返回初始余额
        if (!hasTransactions && wallet.balance === 100) {
            return wallet.balance;
        }
        
        // 计算所有地址的UTXO总额
        const totalBalance = R.sum(
            R.map(
                address => this.getBalanceForAddress(address),
                addresses
            )
        );
        
        // 如果计算出的余额为0但有初始余额，保持初始余额
        if (totalBalance === 0 && wallet.balance === 100) {
            return wallet.balance;
        }
        
        wallet.updateBalance(totalBalance);
        this.db.write(this.wallets);
        
        return totalBalance;
    }
}

module.exports = Operator;