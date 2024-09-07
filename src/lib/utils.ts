import mongoose from 'mongoose'
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

export const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()]
  console.log(`gettingTodayDateForGPT: ${year}-${month}-${day}-${dayOfWeek}`)
  return `${year}-${month}-${day}-${dayOfWeek}`
}
