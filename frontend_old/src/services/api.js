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
  },
  getBlocks() {
    return api.get('/blockchain/blocks');
  },
  submitAttendance(data) {
    return api.post('/blockchain/attendance', data);
  },
  getStudentAttendance(studentId) {
    return api.get(`/blockchain/attendance/student/${studentId}`);
  },
  getPendingTransactions() {
    return api.get('/blockchain/transactions');
  },
  mineBlock(data) {
    return api.post('/miner/mine', data);
  }
};

// 学生服务
export const studentService = {
  // 注册
  register(data) {
    return api.post('/student/register', data);
  },

  // 签到
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
  getAttendanceRecords(studentId) {
    return this.getBlocks().then(response => {
      const blocks = response.data;
      const records = [];
      
      blocks.forEach(block => {
        block.transactions?.forEach(tx => {
          if (tx.data?.studentId === studentId && tx.data.classId) {
            records.push({
              eventId: tx.data.classId,
              timestamp: block.timestamp,
              confirmed: true,
              hash: block.hash
            });
          }
        });
      });
      
      return { data: { records } };
    });
  }
};

export default api; 