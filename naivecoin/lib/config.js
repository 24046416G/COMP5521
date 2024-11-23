// Do not change these configurations after the blockchain is initialized
const teacherConfig = require('../data/teacher.json');

module.exports = {
    // INFO: The mining reward could decreases over time like bitcoin. See https://en.bitcoin.it/wiki/Mining#Reward.
    MINING_REWARD: 5000000000,
    // INFO: Usually it's a fee over transaction size (not quantity)
    FEE_PER_TRANSACTION: 1,
    // INFO: Usually the limit is determined by block size (not quantity)
    TRANSACTIONS_PER_BLOCK: 2,
    genesisBlock: {
        index: 0,
        previousHash: '0',
        timestamp: 1465154705,
        nonce: 0,
        transactions: [
            {
                id: '63ec3ac02f822450039df13ddf7c3c0f19bab4acd4dc928c62fcd78d5ebc6dba',
                hash: null,
                type: 'regular',
                data: {
                    inputs: [],
                    outputs: []
                }
            }
        ]
    },
    pow: {
        getDifficulty: (blocks, index) => {
            // 基础难度值
            const INITIAL_DIFFICULTY = 2;
            const ADJUSTMENT_INTERVAL = 5;  // 每5个区块调整一次难度
            
            // 如果是创世区块或第一个区块
            if (!blocks || blocks.length <= 1) {
                console.info(`Block ${index}: Using initial difficulty:`, INITIAL_DIFFICULTY);
                return INITIAL_DIFFICULTY;
            }

            // 获取前一个区块的难度
            const previousDifficulty = blocks[blocks.length - 1].difficulty || INITIAL_DIFFICULTY;

            // 每5个区块调整一次难度
            if (index % ADJUSTMENT_INTERVAL !== 0) {
                console.info(`Block ${index}: Not adjustment interval (next adjustment at block ${Math.ceil(index/ADJUSTMENT_INTERVAL) * ADJUSTMENT_INTERVAL})`);
                console.info(`Block ${index}: Using previous difficulty: ${previousDifficulty}`);
                return previousDifficulty;
            }

            // 到这里说明是需要调整难度的区块
            console.info(`Block ${index}: Difficulty adjustment needed`);

            // 获取最新区块
            const latestBlock = blocks[blocks.length - 1];
            
            // 使用实际挖矿时间
            const timeExpected = 1; // 期望每个区块1秒
            const timeTaken = latestBlock.miningTime || 1; // 如果没有记录挖矿时间，使用默认值1
            
            console.info(`Block ${index}: Mining time taken: ${timeTaken}s, Expected: ${timeExpected}s`);
            console.info(`Block ${index}: Previous difficulty: ${previousDifficulty}`);

            // 调整难度
            let newDifficulty = previousDifficulty;

            if (timeTaken > timeExpected) {
            // 如果挖矿太慢，降低难度
                newDifficulty = Math.max(2, previousDifficulty - 1);
                console.info(`Block ${index}: Mining too slow (${timeTaken}s vs ${timeExpected}s), decreasing difficulty to ${newDifficulty}`);
            } else {
                // 如果挖矿太快，增加难度
                newDifficulty = previousDifficulty + 1;
                console.info(`Block ${index}: Mining too fast (${timeTaken}s vs ${timeExpected}s), increasing difficulty to ${newDifficulty}`);
            }

            // 添加最终难度值日志
            console.info(`Block ${index}: Final difficulty value: ${newDifficulty}`);
            return newDifficulty;
        }
    },
    // 交易类型定义
    TRANSACTION_TYPE: {
        REGULAR: 'regular',
        FEE: 'fee',
        REWARD: 'reward',
        STUDENT_REGISTRATION: 'studentRegistration',
        ATTENDANCE: 'attendance'
    },
    // 考勤系统相关配置
    ATTENDANCE_CONFIG: {
        REGISTRATION_AMOUNT: 1,    // 注册交易金额
        ATTENDANCE_AMOUNT: 1,      // 考勤交易金额
        DEFAULT_TEACHER_ADDRESS: teacherConfig.address // 使用teacher.json中的地址
    }
};