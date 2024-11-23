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
        difficulty: 0,
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
            const BLOCK_GENERATION_INTERVAL = 1; // 期望的出块时间1秒
            const DIFFICULTY_ADJUSTMENT_INTERVAL = 5; // 每5个块调整一次难度
            
            console.log(`Getting difficulty for block ${index}, chain length: ${blocks.length}`);
            
            // 安全检查：确保 blocks 存在且不为空
            if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
                console.log('No blocks, returning difficulty 0');
                return 0;
            }
            
            // 如果只有创世区块或是第一个区块，返回最低难度0
            if (blocks.length <= 1 || index <= 1) {
                console.log('Genesis or first block, returning difficulty 0');
                return 0;
            }

            // 如果不是难度调整区间，使用前一个区块的难度
            if (index % DIFFICULTY_ADJUSTMENT_INTERVAL !== 0) {
                const prevDifficulty = blocks[index - 1].difficulty;
                console.log(`Not adjustment interval, using previous difficulty: ${prevDifficulty}`);
                return prevDifficulty;
            }

            // 获取上一个调整区间的第一个块和最后一个块
            const prevAdjustmentBlock = blocks[index - DIFFICULTY_ADJUSTMENT_INTERVAL];
            const latestBlock = blocks[index - 1];
            
            // 计算预期时间和实际时间
            const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL; // 单位：秒
            // 将毫秒转换为秒
            const timeTaken = Math.abs(latestBlock.timestamp - prevAdjustmentBlock.timestamp) / 1000;
            
            console.log(`Time taken: ${timeTaken}s, Expected: ${timeExpected}s`);

            // 获取当前难度
            let newDifficulty = prevAdjustmentBlock.difficulty;

            // 检查是否包含学生交易
            const hasStudentTx = latestBlock.transactions.some(tx => 
                tx.type === 'studentRegistration' || tx.type === 'attendance'
            );

            // 如果包含学生交易，保持较低难度
            if (hasStudentTx) {
                return Math.min(newDifficulty, 1);
            }

            // 根据时间差调整难度
            if (timeTaken < timeExpected / 2) {
                // 如果区块生成太快（小于2.5秒），增加难度
                newDifficulty = newDifficulty + 1;
                console.info(`Blocks generated too fast (${timeTaken}s < ${timeExpected/2}s), increasing difficulty to ${newDifficulty}`);
            } else if (timeTaken > timeExpected * 2) {
                // 如果区块生成太慢（大于10秒），降低难度
                newDifficulty = Math.max(0, newDifficulty - 1);
                console.info(`Blocks generated too slow (${timeTaken}s > ${timeExpected*2}s), decreasing difficulty to ${newDifficulty}`);
            } else {
                console.info(`Block time is good (${timeTaken}s), keeping difficulty at ${newDifficulty}`);
            }

            console.info(`Difficulty adjusted: ${prevAdjustmentBlock.difficulty} -> ${newDifficulty}`);
            console.info(`Has student transactions: ${hasStudentTx}`);

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