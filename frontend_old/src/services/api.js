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

  // 添加教师登录验证
  teacherLogin(data) {
    // 硬编码的教师凭据
    const TEACHER_CREDENTIALS = {
      email: 'teacher@gmail.com',
      password: 'teacher'
    };

    return new Promise((resolve, reject) => {
      if (data.email === TEACHER_CREDENTIALS.email && 
          data.password === TEACHER_CREDENTIALS.password) {
        // 模拟成功的登录响应
        resolve({
          data: {
            id: 'teacher-001',
            email: data.email,
            name: 'Teacher',
            role: 'teacher'
          }
        });
      } else {
        reject(new Error('Invalid email or password'));
      }
    });
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
  // 签到
  checkIn(walletId, data) {
    return api.post(`/student/attendance/${walletId}`, {
      password: data.password,
      courseId: data.courseId,
      classId: data.classId
    });
  },

  // 获取钱包信息
  getWallet(walletId) {
    return api.get(`/operator/wallets/${walletId}`);
  },

  // 获取所有区块
  getBlocks() {
    return api.get('/blockchain/blocks');
  },

  // 获取待处理的交易
  getPendingTransactions() {
    return api.get('/blockchain/transactions');
  }
};

// 在 blockchainService 中添加新的方法
export const attendanceService = {
  // 按班级查询考勤记录
  getAttendanceByClass(classId, params) {
    return api.get(`/attendance/class/${classId}`, { params });
  },

  // 按课程查询考勤记录
  getAttendanceByCourse(courseId, params) {
    return api.get(`/attendance/course/${courseId}`, { params });
  },

  // 按学生查询考勤记录
  getAttendanceByStudent(studentId, params) {
    return api.get(`/attendance/student/${studentId}`, { params });
  }
};

export default api; 