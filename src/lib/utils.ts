import mongoose from 'mongoose'
import { BalanceIndexRange, balanceNumMessages } from './data'
require('dotenv').config()

interface Connection {
  isConnected?: any
}

const connection: Connection = {}

export const PORT = process.env.PORT || 3000

export const connectToDb = async (): Promise<void> => {
  try {
    if (connection.isConnected) {
      console.log('Using existing connection')
      return
    }
    const db = await mongoose.connect(process.env.MONGO as unknown as string)
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
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()]
  console.log(`gettingTodayDateForGPT: ${year}-${month}-${day}-${dayOfWeek}`)
  return `${year}-${month}-${day}-${dayOfWeek}`
}
