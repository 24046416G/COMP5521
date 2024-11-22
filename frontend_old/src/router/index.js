import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../views/LoginPage.vue'
import SignupPage from '../views/SignupPage.vue'
import StudentDashboard from '../views/student/DashboardPage.vue'
import TeacherDashboard from '../views/teacher/DashboardPage.vue'
import TeacherDashboardOverview from '../views/teacher/components/Dashboard.vue'
import TeacherBlockchain from '../views/teacher/components/Blockchain.vue'
import CheckIn from '../views/student/components/CheckIn.vue'
import AttendanceRecords from '../views/student/components/AttendanceRecords.vue'
import BlockMining from '../views/student/components/BlockMining.vue'
import Account from '../views/student/components/Account.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupPage
    },
    {
      path: '/student/:studentId/dashboard',
      component: StudentDashboard,
      meta: { requiresAuth: true, role: 'student' },
      children: [
        {
          path: '',
          redirect: to => {
            console.log('Redirecting to check-in with params:', to.params)
            return { 
              name: 'studentCheckIn', 
              params: { studentId: to.params.studentId } 
            }
          }
        },
        {
          path: 'check-in',
          name: 'studentCheckIn',
          component: CheckIn
        },
        {
          path: 'attendance-records',
          name: 'studentAttendanceRecords',
          component: AttendanceRecords
        },
        {
          path: 'block-mining',
          name: 'studentBlockMining',
          component: BlockMining
        },
        {
          path: 'account',
          name: 'studentAccount',
          component: Account
        }
      ]
    },
    {
      path: '/teacher/dashboard',
      component: TeacherDashboard,
      meta: { requiresAuth: true, role: 'teacher' },
      children: [
        {
          path: '', // 默认子路由
          redirect: to => {
            return { name: 'teacherDashboard' }
          }
        },
        {
          path: 'overview',
          name: 'teacherDashboard',
          component: TeacherDashboardOverview
        },
        {
          path: 'blockchain',
          name: 'teacherBlockchain',
          component: TeacherBlockchain
        }
      ]
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  console.log('Route navigation:', { to, from })  // 添加日志
  
  const isAuthenticated = localStorage.getItem('walletId')
  const studentId = localStorage.getItem('studentId')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('Authentication required, redirecting to login')
    next('/login')
  } else if (to.path === '/') {
    console.log('Root path, redirecting to login')
    next('/login')
  } else if (to.matched.some(record => record.meta.role === 'student') && !studentId) {
    console.log('Student role required but no studentId found')
    next('/login')
  } else {
    console.log('Navigation allowed')
    next()
  }
})

export default router
