import express from 'express'
import { connectToDb, getTodayTime } from '../lib/utils'
import { HeartRate } from '../lib/models'

const heartRateRouter = express.Router()

heartRateRouter.post('/', async (req, res) => {
  try {
    await connectToDb()
    const { heartRate, time, index } = req.body
    console.log(heartRate, 'in', time, '/ Present time:', getTodayTime())
    const newHeartRate = new HeartRate({ heartRate, time, index })
    await newHeartRate.save()
    res.json(newHeartRate._id)
  } catch (error) {
    console.error('Error sending heartRate:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default heartRateRouter
