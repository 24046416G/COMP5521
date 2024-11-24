const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const R = require('ramda');
const path = require('path');
const swaggerDocument = require('./swagger.json');
const Block = require('../blockchain/block');
const Transaction = require('../blockchain/transaction');
const TransactionAssertionError = require('../blockchain/transactionAssertionError');
const BlockAssertionError = require('../blockchain/blockAssertionError');
const HTTPError = require('./httpError');
const ArgumentError = require('../util/argumentError');
const CryptoUtil = require('../util/cryptoUtil');
const timeago = require('timeago.js');

class HttpServer {
    constructor(node, blockchain, operator, miner) {
        this.app = express();
        this.node = node;
        this.blockchain = blockchain;
        this.operator = operator;
        this.miner = miner;

        this.app.use(cors({
            // origin: 'http://127.0.0.1:5173',
            credentials: false,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'password']
        }));

        this.app.options('*', cors());

        const projectWallet = (wallet) => {
            return {
                id: wallet.id,
                addresses: R.map((keyPair) => {
                    return keyPair.publicKey;
                }, wallet.keyPairs),
                balance: wallet.balance,
                studentId: wallet.studentId,
                classId: wallet.classId
            };
        };

        this.app.use(bodyParser.json());

        this.app.set('view engine', 'pug');
        this.app.set('views', path.join(__dirname, 'views'));
        this.app.locals.formatters = {
            time: (rawTime) => {
                const timeInMS = new Date(rawTime * 1000);
                return `${timeInMS.toLocaleString()} - ${timeago().format(timeInMS)}`;
            },
            hash: (hashString) => {
                return hashString != '0' ? `${hashString.substr(0, 5)}...${hashString.substr(hashString.length - 5, 5)}` : '<empty>';
            },
            amount: (amount) => amount.toLocaleString()
        };
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        this.app.get('/blockchain', (req, res) => {
            if (req.headers['accept'] && req.headers['accept'].includes('text/html'))
                res.render('blockchain/index.pug', {
                    pageTitle: 'Blockchain',
                    blocks: blockchain.getAllBlocks()
                });
            else
                throw new HTTPError(400, 'Accept content not supported');
        });

        this.app.get('/blockchain/blocks', (req, res) => {
            res.status(200).send(blockchain.getAllBlocks());
        });

        this.app.get('/blockchain/blocks/latest', (req, res) => {
            let lastBlock = blockchain.getLastBlock();
            if (lastBlock == null) throw new HTTPError(404, 'Last block not found');

            res.status(200).send(lastBlock);
        });

        this.app.put('/blockchain/blocks/latest', (req, res) => {
            let requestBlock = Block.fromJson(req.body);
            let result = node.checkReceivedBlock(requestBlock);

            if (result == null) res.status(200).send('Requesting the blockchain to check.');
            else if (result) res.status(200).send(requestBlock);
            else throw new HTTPError(409, 'Blockchain is update.');
        });

        this.app.get('/blockchain/blocks/:hash([a-zA-Z0-9]{64})', (req, res) => {
            let blockFound = blockchain.getBlockByHash(req.params.hash);
            if (blockFound == null) throw new HTTPError(404, `Block not found with hash '${req.params.hash}'`);

            res.status(200).send(blockFound);
        });

        this.app.get('/blockchain/blocks/:index', (req, res) => {
            let blockFound = blockchain.getBlockByIndex(parseInt(req.params.index));
            if (blockFound == null) throw new HTTPError(404, `Block not found with index '${req.params.index}'`);

            res.status(200).send(blockFound);
        });

        this.app.get('/blockchain/blocks/transactions/:transactionId([a-zA-Z0-9]{64})', (req, res) => {
            let transactionFromBlock = blockchain.getTransactionFromBlocks(req.params.transactionId);
            if (transactionFromBlock == null) throw new HTTPError(404, `Transaction '${req.params.transactionId}' not found in any block`);

            res.status(200).send(transactionFromBlock);
        });

        this.app.get('/blockchain/transactions', (req, res) => {
            if (req.headers['accept'] && req.headers['accept'].includes('text/html'))
                res.render('blockchain/transactions/index.pug', {
                    pageTitle: 'Unconfirmed Transactions',
                    transactions: blockchain.getAllTransactions()
                });
            else
                res.status(200).send(blockchain.getAllTransactions());
        });

        this.app.post('/blockchain/transactions', (req, res) => {
            let requestTransaction = Transaction.fromJson(req.body);
            let transactionFound = blockchain.getTransactionById(requestTransaction.id);

            if (transactionFound != null) throw new HTTPError(409, `Transaction '${requestTransaction.id}' already exists`);

            try {
                let newTransaction = blockchain.addTransaction(requestTransaction);
                res.status(201).send(newTransaction);
            } catch (ex) {
                if (ex instanceof TransactionAssertionError) throw new HTTPError(400, ex.message, requestTransaction, ex);
                else throw ex;
            }
        });

        //http://localhost:3001/blockchain/transactions/unspent?address=your_address
        this.app.get('/blockchain/transactions/unspent', (req, res) => {
            try {
                const address = req.query.address;
                if (!address) {
                    res.status(400).send('Address parameter is required');
                    return;
                }

                const unspentTxs = blockchain.getUnspentTransactionsForAddress(address);
                
                // 格式化返回结果，添加更多有用的信息
                const formattedUnspentTxs = unspentTxs.map(utxo => ({
                    transaction: utxo.transaction,  // 交易ID
                    index: utxo.index,             // 输出索引
                    amount: utxo.amount,           // 金额
                    address: utxo.address,         // 地址
                    blockIndex: utxo.blockIndex,   // 所在区块索引
                    timestamp: utxo.timestamp,     // 交易时间戳
                    type: utxo.type,              // 交易类型
                    metadata: utxo.metadata        // 交易元数据（如果有）
                }));

                res.status(200).send({
                    address: address,
                    unspentTransactions: formattedUnspentTxs,
                    totalAmount: formattedUnspentTxs.reduce((sum, tx) => sum + tx.amount, 0)
                });
            } catch (err) {
                console.error('Error getting unspent transactions:', err);
                res.status(500).send(err.message);
            }
        });

        this.app.get('/operator/wallets', (req, res) => {
            let wallets = operator.getWallets();

            let projectedWallets = R.map(projectWallet, wallets);

            res.status(200).send(projectedWallets);
        });

        this.app.post('/operator/wallets', (req, res) => {
            let password = req.body.password;
            if (R.match(/\w+/g, password).length <= 4) throw new HTTPError(400, 'Password must contain more than 4 words');

            let newWallet = operator.createWalletFromPassword(password);

            let projectedWallet = projectWallet(newWallet);

            res.status(201).send(projectedWallet);
        });

        this.app.get('/operator/wallets/:walletId', (req, res) => {
            try {
                // 直接读取 wallets.json 文件
                const path = require('path');
                const fs = require('fs');
                const walletsPath = path.join(__dirname, '../../data/1/wallets.json');
                
                // 读取并解析 wallets.json
                const walletsData = fs.readFileSync(walletsPath, 'utf8');
                const wallets = JSON.parse(walletsData);
                
                // 查找指定的钱包
                const wallet = wallets.find(w => w.id === req.params.walletId);
                if (!wallet) throw new Error(`Wallet not found with id '${req.params.walletId}'`);
                
                // 返回钱信息
                res.status(200).send({
                    id: wallet.id,
                    addresses: wallet.keyPairs,
                    balance: wallet.balance,
                    studentId: wallet.studentId,
                    classId: wallet.classId
                });
            } catch (err) {
                res.status(404).send(err.message);
            }
        });

        this.app.post('/operator/wallets/:walletId/transactions', (req, res) => {
            let walletId = req.params.walletId;
            let password = req.headers.password;

            if (password == null) throw new HTTPError(401, 'Wallet\'s password is missing.');
            let passwordHash = CryptoUtil.hash(password);

            try {
                if (!operator.checkWalletPassword(walletId, passwordHash)) throw new HTTPError(403, `Invalid password for wallet '${walletId}'`);

                let newTransaction = operator.createTransaction(walletId, req.body.fromAddress, req.body.toAddress, req.body.amount, req.body['changeAddress'] || req.body.fromAddress);

                newTransaction.check();

                let transactionCreated = blockchain.addTransaction(Transaction.fromJson(newTransaction));
                res.status(201).send(transactionCreated);
            } catch (ex) {
                if (ex instanceof ArgumentError || ex instanceof TransactionAssertionError) throw new HTTPError(400, ex.message, walletId, ex);
                else throw ex;
            }
        });

        // this.app.get('/operator/wallets/:walletId/addresses', (req, res) => {
        //     let walletId = req.params.walletId;
        //     try {
        //         let addresses = operator.getAddressesForWallet(walletId);
        //         res.status(200).send(addresses);
        //     } catch (ex) {
        //         if (ex instanceof ArgumentError) throw new HTTPError(400, ex.message, walletId, ex);
        //         else throw ex;
        //     }
        // });

        // this.app.post('/operator/wallets/:walletId/addresses', (req, res) => {
        //     let walletId = req.params.walletId;
        //     let password = req.headers.password;

        //     if (password == null) throw new HTTPError(401, 'Wallet\'s password is missing.');
        //     let passwordHash = CryptoUtil.hash(password);

        //     try {
        //         if (!operator.checkWalletPassword(walletId, passwordHash)) throw new HTTPError(403, `Invalid password for wallet '${walletId}'`);

        //         let newAddress = operator.generateAddressForWallet(walletId);
        //         res.status(201).send({ address: newAddress });
        //     } catch (ex) {
        //         if (ex instanceof ArgumentError) throw new HTTPError(400, ex.message, walletId, ex);
        //         else throw ex;
        //     }
        // });

        this.app.get('/node/peers', (req, res) => {
            res.status(200).send(node.peers);
        });

        this.app.post('/node/peers', (req, res) => {
            let newPeer = node.connectToPeer(req.body);
            res.status(201).send(newPeer);
        });

        this.app.get('/node/transactions/:transactionId([a-zA-Z0-9]{64})/confirmations', (req, res) => {
            node.getConfirmations(req.params.transactionId)
                .then((confirmations) => {
                    res.status(200).send({ confirmations: confirmations });
                });
        });

        this.app.post('/miner/mine', (req, res, next) => {
            console.info('Starting mining process...');
            let teacherAddress = "1057a9604e04b274da5a4de0c8f4b4868d9b230989f8c8c6a28221143cc5a755";
            miner.mine(req.body.rewardAddress, teacherAddress)
                .then((newBlock) => {
                    try {
                        // 确保使用正确的难度值
                        const expectedDifficulty = blockchain.getDifficulty(newBlock.index);
                        newBlock = Block.fromJson(newBlock);
                        newBlock.difficulty = expectedDifficulty;
                        
                        console.info(`Block mined successfully. Index: ${newBlock.index}, Difficulty: ${newBlock.difficulty}, Hash: ${newBlock.hash}`);
                        
                        // 添加区块到区块链
                        blockchain.addBlock(newBlock);
                        
                        // 更新挖矿奖励和手续费
                        blockchain.updateMiningReward(newBlock);
                        
                        res.status(201).send(newBlock);
                    } catch (err) {
                        console.error('Error adding block:', err);
                        next(err);
                    }
                })
                .catch((ex) => {
                    console.error('Mining failed:', ex);
                    if (ex instanceof BlockAssertionError && ex.message.includes('Invalid index')) 
                        next(new HTTPError(409, 'A new block were added before we were able to mine one'), null, ex);
                    else 
                        next(ex);
                });
        });

        // 学生登录
        this.app.post('/student/login', (req, res) => {
            try {
                const { password, studentId } = req.body;
                
                if (!password || !studentId) {
                    return res.status(400).send({
                        success: false,
                        message: 'Password and studentId are required'
                    });
                }

                // 读取钱包文件
                const path = require('path');
                const fs = require('fs');
                const walletsPath = path.join(__dirname, '../../data/1/wallets.json');
                
                // 读取并解析 wallets.json
                const walletsData = fs.readFileSync(walletsPath, 'utf8');
                const wallets = JSON.parse(walletsData);
                
                // 计算密码的哈希值
                const passwordHash = CryptoUtil.hash(password);
                
                // 查找匹配的钱包
                const wallet = wallets.find(w => 
                    w.studentId === studentId && 
                    w.passwordHash === passwordHash
                );

                if (wallet) {
                    // 登录成功，返回钱包信息（排除敏感信息）
                    const safeWallet = {
                        id: wallet.id,
                        studentId: wallet.studentId,
                        classId: wallet.classId,
                        balance: wallet.balance,
                        publicKey: wallet.keyPairs[0].publicKey  // 只返回公钥
                    };
                    
                    res.status(200).send({
                        success: true,
                        message: 'Login successful',
                        wallet: safeWallet
                    });
                } else {
                    // 登录失败
                    res.status(401).send({
                        success: false,
                        message: 'Invalid studentId or password'
                    });
                }
            } catch (err) {
                console.error('Login error:', err);
                res.status(500).send({
                    success: false,
                    message: 'Internal server error during login'
                });
            }
        });

        this.app.post('/student/register', (req, res) => {
            let { password, studentId, classId } = req.body;
            
            try {
                // 验证必要字段
                if (!password || !studentId || !classId) {
                    return res.status(400).send({
                        success: false,
                        message: 'Password, studentId and classId are required'
                    });
                }

                // 读取钱包文件检查是否存在重复学号
                const path = require('path');
                const fs = require('fs');
                const walletsPath = path.join(__dirname, '../../data/1/wallets.json');
                
                let wallets = [];
                try {
                    const walletsData = fs.readFileSync(walletsPath, 'utf8');
                    wallets = JSON.parse(walletsData);
                } catch (err) {
                    // 如果文件不存在或为空，初始化为空数组
                    wallets = [];
                }

                // 检查是否存在相同学号
                const existingWallet = wallets.find(w => w.studentId === studentId);
                if (existingWallet) {
                    return res.status(409).send({
                        success: false,
                        message: `Student ID ${studentId} is already registered`
                    });
                }

                // 创建新钱包
                let wallet = this.operator.createStudentWallet(password, studentId, classId);
                
                res.status(201).send({ 
                    success: true,
                    message: "Student wallet created successfully",
                    wallet: {
                        walletId: wallet.id,
                        studentId: wallet.studentId,
                        classId: wallet.classId,
                        publicKey: wallet.getPublicKey()
                    }
                });
            } catch (err) {
                console.error('Registration error:', err);
                res.status(400).send({
                    success: false,
                    message: err.message
                });
            }
        });

        this.app.post('/student/registration/:walletId', (req, res) => {
            let { password, classId, studentId } = req.body;
            let walletId = req.params.walletId;
            
            try {
                let transaction = this.operator.createStudentRegistration(
                    walletId, 
                    password, 
                    classId,
                    studentId
                );
                
                this.blockchain.addTransaction(transaction);
                
                res.status(201).send(transaction);
            } catch (err) {
                res.status(400).send(err.message);
            }
        });

        this.app.get('/teacher/balance', (req, res) => {
            try {
                const path = require('path');
                const fs = require('fs');
                const teacherJsonPath = path.join(__dirname, '../../data/teacher.json');
                
                let teacherConfig = JSON.parse(fs.readFileSync(teacherJsonPath, 'utf8'));
                res.status(200).send({ 
                    balance: teacherConfig.balance,
                    address: teacherConfig.address,
                    email: teacherConfig.teacherEmail
                });
            } catch (err) {
                console.error('Error reading teacher balance:', err);
                res.status(500).send('Error reading teacher balance');
            }
        });

        this.app.post('/student/attendance/:walletId', (req, res) => {
            let { password, courseId, classId } = req.body;
            let walletId = req.params.walletId;
            
            try {
                // 创建考勤交易
                let transaction = this.operator.createAttendanceTransaction(
                    walletId, 
                    password, 
                    courseId,
                    classId
                );
                
                // 添加交易到区块链
                this.blockchain.addTransaction(transaction);
                
                res.status(201).send(transaction);
            } catch (err) {
                res.status(400).send(err.message);
            }
        });

        // 添加辅助函数来处理日期
        const getDateRange = (startDate, endDate) => {
            // 开始日期：如果提供了日期，使用当天开始时间；否则使用最早时间
            const start = startDate 
                ? new Date(startDate).setHours(0, 0, 0, 0) 
                : new Date(0);

            // 结束日期：如果提供了日期，使用当天结束时间；则使用当前时间
            const end = endDate 
                ? new Date(endDate).setHours(23, 59, 59, 999)
                : new Date().getTime();

            return { start: new Date(start), end: new Date(end) };
        };

        // 1. 通过学生ID搜索考勤记录
        this.app.get('/attendance/student/:studentId', (req, res) => {
            try {
                const { startDate, endDate, courseId, classId } = req.query;
                const studentId = req.params.studentId;
                const { start, end } = getDateRange(startDate, endDate);

                const blocks = this.blockchain.getAllBlocks();
                let attendanceRecords = blocks
                    .reduce((records, block) => {
                        const blockAttendances = block.transactions
                            .filter(tx => tx.type === 'attendance')
                            .filter(tx => {
                                const metadata = tx.data.outputs[0].metadata;
                                const recordDate = new Date(metadata.timestamp);

                                return metadata.studentId.includes(studentId) &&
                                    (!courseId || metadata.courseId === courseId) &&
                                    (!classId || metadata.classId === classId) &&
                                    recordDate >= start &&
                                    recordDate <= end;
                            })
                            .map(tx => ({
                                blockIndex: block.index,
                                timestamp: new Date(tx.data.outputs[0].metadata.timestamp).toISOString(),
                                studentId: tx.data.outputs[0].metadata.studentId,
                                courseId: tx.data.outputs[0].metadata.courseId,
                                classId: tx.data.outputs[0].metadata.classId,
                                attendanceType: tx.data.outputs[0].metadata.attendanceType
                            }));

                        return [...records, ...blockAttendances];
                    }, []);

                res.status(200).send(attendanceRecords);
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // 2. 通过课程ID搜索考勤记录
        this.app.get('/attendance/course/:courseId', (req, res) => {
            try {
                const { startDate, endDate, classId, studentId } = req.query;
                const courseId = req.params.courseId;
                const { start, end } = getDateRange(startDate, endDate);

                const blocks = this.blockchain.getAllBlocks();
                let attendanceRecords = blocks
                    .reduce((records, block) => {
                        const blockAttendances = block.transactions
                            .filter(tx => tx.type === 'attendance')
                            .filter(tx => {
                                const metadata = tx.data.outputs[0].metadata;
                                const recordDate = new Date(metadata.timestamp);

                                return metadata.courseId === courseId &&
                                    (!studentId || metadata.studentId === studentId) &&
                                    (!classId || metadata.classId === classId) &&
                                    recordDate >= start &&
                                    recordDate <= end;
                            })
                            .map(tx => ({
                                blockIndex: block.index,
                                timestamp: new Date(tx.data.outputs[0].metadata.timestamp).toISOString(),
                                studentId: tx.data.outputs[0].metadata.studentId,
                                courseId: tx.data.outputs[0].metadata.courseId,
                                classId: tx.data.outputs[0].metadata.classId,
                                attendanceType: tx.data.outputs[0].metadata.attendanceType
                            }));

                        return [...records, ...blockAttendances];
                    }, []);

                res.status(200).send(attendanceRecords);
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // 3. 通过班级ID搜索考勤记录
        this.app.get('/attendance/class/:classId', (req, res) => {
            try {
                const { startDate, endDate, courseId, studentId } = req.query;
                const classId = req.params.classId;
                const { start, end } = getDateRange(startDate, endDate);

                const blocks = this.blockchain.getAllBlocks();
                let attendanceRecords = blocks
                    .reduce((records, block) => {
                        const blockAttendances = block.transactions
                            .filter(tx => tx.type === 'attendance')
                            .filter(tx => {
                                const metadata = tx.data.outputs[0].metadata;
                                const recordDate = new Date(metadata.timestamp);

                                return metadata.classId === classId &&
                                    (!studentId || metadata.studentId === studentId) &&
                                    (!courseId || metadata.courseId === courseId) &&
                                    recordDate >= start &&
                                    recordDate <= end;
                            })
                            .map(tx => ({
                                blockIndex: block.index,
                                timestamp: new Date(tx.data.outputs[0].metadata.timestamp).toISOString(),
                                studentId: tx.data.outputs[0].metadata.studentId,
                                courseId: tx.data.outputs[0].metadata.courseId,
                                classId: tx.data.outputs[0].metadata.classId,
                                attendanceType: tx.data.outputs[0].metadata.attendanceType
                            }));

                        return [...records, ...blockAttendances];
                    }, []);

                res.status(200).send(attendanceRecords);
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // 教师登录
        this.app.post('/teacher/login', (req, res) => {
            try {
                const { password, email } = req.body;
                
                if (!password || !email) {
                    return res.status(400).send({
                        success: false,
                        message: 'Password and email are required'
                    });
                }

                // 读取教师配置文件
                const path = require('path');
                const fs = require('fs');
                const teacherJsonPath = path.join(__dirname, '../../data/teacher.json');
                
                try {
                    const teacherData = fs.readFileSync(teacherJsonPath, 'utf8');
                    const teacher = JSON.parse(teacherData);

                    // 验证邮箱和密码
                    if (teacher.teacherEmail === email && teacher.password === password) {
                        // 登录成功，返回教师信息（排除敏感信息）
                        const safeTeacherInfo = {
                            email: teacher.teacherEmail,
                            address: teacher.address,
                            balance: teacher.balance
                        };
                        
                        res.status(200).send({
                            success: true,
                            message: 'Login successful',
                            teacher: safeTeacherInfo
                        });
                    } else {
                        // 登录失败
                        res.status(401).send({
                            success: false,
                            message: 'Invalid email or password'
                        });
                    }
                } catch (err) {
                    console.error('Error reading teacher data:', err);
                    res.status(500).send({
                        success: false,
                        message: 'Error reading teacher data'
                    });
                }
            } catch (err) {
                console.error('Teacher login error:', err);
                res.status(500).send({
                    success: false,
                    message: 'Internal server error during login'
                });
            }
        });

        this.app.use(function (err, req, res, next) {  // eslint-disable-line no-unused-vars
            if (err instanceof HTTPError) res.status(err.status);
            else res.status(500);
            res.send(err.message + (err.cause ? ' - ' + err.cause.message : ''));
        });
    }

    listen(host, port) {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, host, (err) => {
                if (err) reject(err);
                console.info(`Listening http on port: ${this.server.address().port}, to access the API documentation go to http://${host}:${this.server.address().port}/api-docs/`);
                resolve(this);
            });
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            this.server.close((err) => {
                if (err) reject(err);
                console.info('Closing http');
                resolve(this);
            });
        });
    }
}

module.exports = HttpServer;