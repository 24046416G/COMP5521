import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false
});

// Auth services
export const authService = {
  studentLogin(data) {
    // 先获取钱包信息验证是否已注册
    return api.get(`/operator/wallets/${data.walletId}`).then(response => {
      // 验证密码和学生ID是否匹配
      if (response.data.studentId === data.studentId) {
        return response;
      } else {
        throw new Error('Invalid credentials');
      }
    });
  },
  teacherLogin(data) {
    return api.post('/teacher/login', data);
  }
};

// Blockchain services
export const blockchainService = {
  // 创建钱包
  createWallet(data) {
    return api.post('/student/register', {
      password: data.password,
      studentId: data.studentId,
      classId: data.classId
    });
  },
  
  // 完成学生注册
  completeRegistration(data) {
    return api.post(`/student/registration/${data.walletId}`, {
      password: data.password,
      classId: data.classId,
      studentId: data.studentId
    });
  },
  
  // 获取钱包信息
  getWallet(walletId) {
    return api.get(`/operator/wallets/${walletId}`);
  },
  
  register(data) {
    return api.post('/student/register', data);
  }
};

// 学生服务
export const studentService = {
  // 创建wallet
  register(data) {
    return api.post('/student/register', data);
  },

  // 注册
  checkIn(walletId, data) {
    return api.post(`/student/registration/${walletId}`, {
      password: data.password,
      classId: data.classId,
      studentId: data.studentId
    });
  },

  // 获取钱包余额
  getBalance(walletId) {
    return api.get(`/operator/wallets/${walletId}/balance`);
  },

  // 获取所有区块
  getBlocks() {
    return api.get('/blockchain/blocks');
  },

  // 获取待处理的交易
  getPendingTransactions() {
    return api.get('/blockchain/transactions');
  },

  // 获取学生考勤记录
  async getAttendanceRecords(walletId) {
    try {
      // 获取所有区块
      const blocksResponse = await this.getBlocks();
      const blocks = blocksResponse.data;
      
      // 获取待处理交易
      const pendingResponse = await this.getPendingTransactions();
      const pendingTransactions = pendingResponse.data;
      
      // 从区块中获取已确认的交易
      const confirmedRecords = blocks.flatMap(block => 
        block.transactions.filter(tx => 
          tx.type === 'studentRegistration' &&
          tx.data?.outputs?.[0]?.metadata?.studentId
        ).map(tx => ({
          ...tx,
          status: 'complete'
        }))
      );
      
      // 获取待处理的交易
      const pendingRecords = pendingTransactions
        .filter(tx => 
          tx.type === 'studentRegistration' &&
          tx.data?.outputs?.[0]?.metadata?.studentId
        )
        .map(tx => ({
          ...tx,
          status: 'pending'
        }));
      
      // 合并并按时间戳排序
      const allRecords = [...confirmedRecords, ...pendingRecords]
        .sort((a, b) => 
          b.data.outputs[0].metadata.registrationTime - 
          a.data.outputs[0].metadata.registrationTime
        );
      
      return allRecords;
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      throw error;
    }
  },

  // 添加考勤记录
  submitAttendance(walletId, data) {
    return api.post(`/student/attendance/${walletId}`, data);
  }
};

export default api; 