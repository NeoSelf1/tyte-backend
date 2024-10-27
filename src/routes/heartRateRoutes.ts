import express from 'express'
import { connectToDb, getTodayTime } from '../lib/utils'
import { HeartRate } from '../lib/models'

const heartRateRouter = express.Router()

heartRateRouter.post('/', async (req, res) => {
  try {
    await connectToDb()
    const { heartRate } = req.body
    const [heartRateData, time] = heartRate.split(' ')
    console.log(heartRateData, 'in', time, '/ Present time:', getTodayTime())
    const newHeartRate = new HeartRate({ heartRate: heartRateData, time })
    await newHeartRate.save()
    res.json(newHeartRate._id)
  } catch (error) {
    console.error('Error sending heartRate:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default heartRateRouter
