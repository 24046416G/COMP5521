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
        BLOCK_GENERATION_INTERVAL: 1, // 期望的出块时间(秒)
        DIFFICULTY_ADJUSTMENT_INTERVAL: 10,  // 每10个区块调整一次难度
        
        getDifficulty: (blocks, index) => {
            // 如果区块数小于调整间隔，使用初始难度
            if (blocks.length < 2) return Number.MAX_SAFE_INTEGER;
            
            // 每DIFFICULTY_ADJUSTMENT_INTERVAL个区块调整一次
            if (blocks.length % module.exports.pow.DIFFICULTY_ADJUSTMENT_INTERVAL !== 0) {
                return blocks[blocks.length - 1].difficulty;
            }
            
            // 计算前一组区块的实际出块时间
            const prevAdjustmentBlock = blocks[blocks.length - module.exports.pow.DIFFICULTY_ADJUSTMENT_INTERVAL];
            const latestBlock = blocks[blocks.length - 1];
            const timeExpected = module.exports.pow.BLOCK_GENERATION_INTERVAL * module.exports.pow.DIFFICULTY_ADJUSTMENT_INTERVAL;
            const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
            
            // 根据时间差调整难度
            let difficulty = prevAdjustmentBlock.difficulty;
            
            if (timeTaken < timeExpected / 2) {
                difficulty *= 2; // 如果出块太快，增加难度
            } else if (timeTaken > timeExpected * 2) {
                difficulty /= 2; // 如果出块太慢，降低难度
            }
            
            return Math.max(Math.floor(difficulty), 1);
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