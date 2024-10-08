import mongoose from 'mongoose'
import { BalanceIndexRange, balanceNumMessages } from './data'
import { isDBDevelopment } from './authMiddleware'
require('dotenv').config()

interface Connection {
  isConnected?: any
}

const connection: Connection = {}

export const PORT = process.env.PORT || 3000

export const connectToDb = async (): Promise<void> => {
  try {
    if (connection.isConnected) {
      return
    }
    console.log('connecting To Database')

    const db = await mongoose.connect(
      isDBDevelopment ? (process.env.MONGO_DEV as unknown as string) : (process.env.MONGO_PROD as unknown as string),
    )
    connection.isConnected = db.connections[0].readyState
  } catch (error: any) {
    console.log(error)
    throw new Error(error)
  }
}

export const getBalanceMessage = (balanceNum: number) => {
  // 균형 지수 범위 결정
  let range: BalanceIndexRange
  if (balanceNum <= 20) range = '0-20'
  else if (balanceNum <= 40) range = '21-40'
  else if (balanceNum <= 60) range = '41-60'
  else if (balanceNum <= 80) range = '61-80'
  else range = '81-100'

  // 해당 범위의 메시지 배열 가져오기
  const messages = balanceNumMessages[range]

  // 랜덤하게 메시지 선택
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

export const getTodayDate = () => {
  const options = { timeZone: 'Asia/Seoul', hour12: false }
  const today = new Date()
  const koreaTime = today.toLocaleString('en-US', options)
  const koreaDate = new Date(koreaTime)

  const year = koreaDate.getFullYear()
  const month = String(koreaDate.getMonth() + 1).padStart(2, '0')
  const day = String(koreaDate.getDate()).padStart(2, '0')
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][koreaDate.getDay()]

  console.log(`Getting today's date for GPT (Korea Time): ${year}-${month}-${day}-${dayOfWeek}`)
  return `${year}-${month}-${day}-${dayOfWeek}`
}

// 이메일 유효성 검사 함수
export const isValidEmail = (email: string) => {
  // 간단한 이메일 정규식
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 사용자 이름 유효성 검사 함수
export const isValidUsername = (username: string) => {
  // 예: 3-20자, 영문, 숫자, 언더스코어만 허용
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  return usernameRegex.test(username)
}

// 비밀번호 강도 검사 함수
export const isValidPassword = (password: string) => {
  // 예: 최소 8자, 대문자, 소문자, 숫자, 특수문자 포함
  const passwordRegex = /^.{8,}$/
  return passwordRegex.test(password)
}

export const convertKoreanDateToYYYYMMDD = (koreanDate: string) => {
  const options = { timeZone: 'Asia/Seoul', hour12: false }
  const today = new Date()
  const koreaTime = today.toLocaleString('en-US', options)
  const targetDate = new Date(koreaTime)
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekdayRegex = new RegExp(`(${weekdays.join('|')})요일`)

  const weekMatch = koreanDate.match(/(다다음주|다음주|(\d+)주)/)
  const weekdayMatch = koreanDate.match(weekdayRegex)
  const daysLaterMatch = koreanDate.match(/(\d+)일\s*(뒤|후)/)

  if (daysLaterMatch) {
    console.log('daysLaterMatch')
    const daysToAdd = parseInt(daysLaterMatch[1])
    targetDate.setDate(targetDate.getDate() + daysToAdd)
  } else if (weekMatch) {
    console.log('weekMatch')
    let weeks = 1
    if (weekMatch[1] === '다다음주') {
      weeks = 2
    } else if (weekMatch[1] === '다음주') {
      weeks = 1
    } else if (weekMatch[2]) {
      weeks = parseInt(weekMatch[2])
    }
    // 현재 요일부터 다음 주 시작까지의 날짜 계산
    if (weekdayMatch) {
      console.log('weekdayMatch')
      // 요일이 존재할 경우
      const daysUntilNextWeek = 7 - targetDate.getDay() + 1
      // 가장 가까운 미래의 월요일로 이동.
      targetDate.setDate(targetDate.getDate() + daysUntilNextWeek + (weeks - 1) * 7)

      const targetDay = weekdays.indexOf(weekdayMatch[1])
      // 요일에 맞춰 날짜 추가
      targetDate.setDate(targetDate.getDate() + ((targetDay + 7 - targetDate.getDay()) % 7))
    } else {
      // 요일 없이 다음주만 있을 경우, 단순히 7의 배수만큼 더하기
      targetDate.setDate(targetDate.getDate() + weeks * 7)
    }
  } else if (koreanDate.includes('다음달')) {
    console.log('다음달')
    targetDate.setMonth(targetDate.getMonth() + 1)
    const dayMatch = koreanDate.match(/(\d+)일/)
    if (dayMatch) {
      targetDate.setDate(parseInt(dayMatch[1]))
    } else {
      targetDate.setDate(1)
    }
  } else if (koreanDate === '내일') {
    console.log('내일')
    targetDate.setDate(targetDate.getDate() + 1)
  } else if (koreanDate === '모레' || koreanDate === '내일모레') {
    console.log('내일모레')
    targetDate.setDate(targetDate.getDate() + 2)
  } else if (weekdayMatch) {
    const targetDay = weekdays.indexOf(weekdayMatch[1])
    targetDate.setDate(targetDate.getDate() + ((targetDay + 7 - targetDate.getDay()) % 7))
  } else {
    console.log('예외 케이스', koreanDate)
  }

  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

async function updateDataScript() {
  try {
    connectToDb()

    // User 모델 가져오기
    const User = mongoose.model('User')

    // username_1 인덱스 제거
    await User.collection.dropIndex('username_1')

    console.log('Username index removed successfully for all users')
  } catch (error: any) {
    if (error.code === 27) {
      console.log('Index does not exist, no action needed')
    } else {
      console.error('Error removing username index:', error)
    }
  }
}

// updateDataScript()
