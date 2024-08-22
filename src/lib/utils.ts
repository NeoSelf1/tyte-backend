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
