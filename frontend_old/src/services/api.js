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
    return api.post('/student/register', data);
  },
  teacherLogin(data) {
    return api.post('/teacher/login', data);
  }
};

// Blockchain services
export const blockchainService = {
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
  completeRegistration(data) {
    return api.post(`/student/registration/${data.walletId}`, {
      password: data.password,
      classId: data.classId,
      studentId: data.studentId
    });
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