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
        if (utxo == null || utxo.length == 0) return 0;
        
        const balance = R.sum(R.map(R.prop('amount'), utxo));
        
        const wallet = R.find(
            R.compose(R.contains(addressId), R.map(R.prop('publicKey')), R.prop('keyPairs')),
            this.wallets
        );
        if (wallet) {
            wallet.updateBalance(balance);
            this.db.write(this.wallets);
        }
        
        return balance;
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

        return Transaction.fromJson(transactionData);
    }

    getWalletBalance(walletId) {
        const wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);
        
        const balance = R.sum(
            R.map(
                address => this.getBalanceForAddress(address),
                wallet.getAddresses()
            )
        );
        
        wallet.updateBalance(balance);
        this.db.write(this.wallets);
        
        return balance;
    }
}

module.exports = Operator;