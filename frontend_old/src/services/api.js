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
  // 修改学生登录方法
  studentLogin(data) {
    return api.post('/student/login', {
      password: data.password,
      studentId: data.studentId
    });
  },

  // 教师登录方法保持不变
  teacherLogin(data) {
    return new Promise((resolve, reject) => {
      // 调用后端教师登录接口
      api.post('/teacher/login', {
        email: data.email,
        password: data.password
      })
      .then(response => {
        resolve(response);
      })
      .catch(error => {
        reject(error);
      });
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
  // 更新签到方法，只传递必要参数
  checkIn(walletId, data) {
    console.log('Sending check-in request:', { walletId, data })
    return api.post(`/student/attendance/${walletId}`, {
      studentId: data.studentId,  // 修改为只发送 studentId
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